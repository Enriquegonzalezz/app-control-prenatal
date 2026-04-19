<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\AppointmentStatus;
use App\Enums\RelationshipStatus;
use App\Enums\SlotStatus;
use App\Enums\UserRole;
use App\Models\Appointment;
use App\Models\DoctorPatientRelationship;
use App\Models\Slot;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use RuntimeException;


final class AppointmentService
{
    public function __construct(
        private readonly PushNotificationService $push,
    ) {}

    /**
     * Reserva una cita sobre un slot. Transacción atómica: valida disponibilidad
     * bajo lock, marca el slot como reservado y crea la cita en estado 'pending'.
     *
     * @param  array{slot_id: string, patient_notes?: string|null}  $data
     *
     * @throws RuntimeException Si el slot no existe, no está disponible, está en el pasado
     *                          o el paciente ya tiene una cita activa en ese slot.
     */
    public function book(User $patient, array $data): Appointment
    {
        if ($patient->role !== UserRole::PATIENT) {
            throw new RuntimeException('Solo pacientes pueden agendar citas.');
        }

        return DB::transaction(function () use ($patient, $data): Appointment {
            /** @var Slot|null $slot */
            $slot = Slot::query()
                ->whereKey($data['slot_id'])
                ->lockForUpdate()
                ->first();

            if (!$slot) {
                throw new RuntimeException('El slot solicitado no existe.');
            }

            if ($slot->status !== SlotStatus::AVAILABLE) {
                throw new RuntimeException('El slot ya no está disponible.');
            }

            if ($slot->starts_at->isPast()) {
                throw new RuntimeException('No se puede agendar un slot en el pasado.');
            }

            // clinic_id del slot deriva de su branch
            $branch = $slot->branch()->with('clinic')->first();
            if (!$branch || !$branch->clinic || !$branch->clinic->is_active) {
                throw new RuntimeException('La clínica asociada al slot no está activa.');
            }

            $doctorProfile = $slot->doctor; // DoctorProfile
            if (!$doctorProfile || !$doctorProfile->is_verified) {
                throw new RuntimeException('El médico del slot no está verificado.');
            }

            // Snapshot de honorarios al momento de reservar (el precio puede cambiar después).
            // Se crea directamente como CONFIRMED: el médico publicó el slot porque tiene
            // disponibilidad; puede cancelar/reagendar si surge un imprevisto.
            $appointment = Appointment::create([
                'patient_id'       => $patient->id,
                'doctor_id'        => $doctorProfile->user_id,
                'clinic_id'        => $branch->clinic_id,
                'branch_id'        => $branch->id,
                'slot_id'          => $slot->id,
                'status'           => AppointmentStatus::CONFIRMED,
                'confirmed_at'     => now(),
                'scheduled_at'     => $slot->starts_at,
                'duration_minutes' => $slot->starts_at->diffInMinutes($slot->ends_at),
                'consultation_fee' => $doctorProfile->consultation_fee,
                'patient_notes'    => $data['patient_notes'] ?? null,
            ]);

            $slot->status = SlotStatus::BOOKED;
            $slot->save();

            // Crear la relación médico-paciente al reservar la cita, no al confirmar.
            // Esto permite el chat desde el primer contacto (paciente puede enviar
            // notas previas, médico puede pedir información antes de la consulta).
            DoctorPatientRelationship::firstOrCreate(
                [
                    'doctor_id'  => $doctorProfile->user_id,
                    'patient_id' => $patient->id,
                ],
                [
                    'status'     => RelationshipStatus::ACTIVE,
                    'started_at' => now(),
                ]
            );

            app(ScheduleService::class)->refreshNextAvailableSlot($doctorProfile);

            $fresh = $appointment->fresh(['doctor', 'patient', 'clinic', 'branch', 'slot']);

            // Notificar al médico sobre la nueva solicitud (fuera de la tx, best-effort)
            $this->push->notifyNewBooking($fresh);

            return $fresh;
        });
    }

    /**
     * Confirma una cita pending. Solo el médico asignado puede confirmar.
     * El trigger `activate_relationship_on_confirm` activará la relación médico-paciente.
     */
    public function confirm(Appointment $appointment, User $actor): Appointment
    {
        $this->assertActorIsDoctorOfAppointment($appointment, $actor);

        if ($appointment->status !== AppointmentStatus::PENDING) {
            throw new RuntimeException('Solo se pueden confirmar citas pendientes.');
        }

        $appointment->status       = AppointmentStatus::CONFIRMED;
        $appointment->confirmed_at = now();
        $appointment->save();

        // Crear o activar la relación médico-paciente explícitamente.
        // El trigger activate_relationship_on_confirm en Supabase hace lo mismo,
        // pero lo garantizamos aquí para no depender exclusivamente del trigger.
        $rel = DoctorPatientRelationship::where('doctor_id', $appointment->doctor_id)
            ->where('patient_id', $appointment->patient_id)
            ->first();

        if ($rel) {
            if ($rel->status !== RelationshipStatus::ACTIVE) {
                $rel->status     = RelationshipStatus::ACTIVE;
                $rel->started_at = $rel->started_at ?? now();
                $rel->save();
            }
        } else {
            DoctorPatientRelationship::create([
                'doctor_id'  => $appointment->doctor_id,
                'patient_id' => $appointment->patient_id,
                'status'     => RelationshipStatus::ACTIVE,
                'started_at' => now(),
            ]);
        }

        $fresh = $appointment->fresh();
        $this->push->notifyAppointmentConfirmed($fresh);

        return $fresh;
    }

    /**
     * Reagenda una cita a un nuevo slot. Solo el médico asignado puede hacerlo.
     * Libera el slot anterior y marca el nuevo como reservado.
     *
     * @throws RuntimeException
     */
    public function reschedule(Appointment $appointment, User $actor, string $newSlotId): Appointment
    {
        $this->assertActorIsDoctorOfAppointment($appointment, $actor);

        if (!in_array($appointment->status, [AppointmentStatus::CONFIRMED, AppointmentStatus::PENDING], true)) {
            throw new RuntimeException('Solo citas confirmadas pueden reagendarse.');
        }

        return DB::transaction(function () use ($appointment, $actor, $newSlotId): Appointment {
            $newSlot = Slot::query()->whereKey($newSlotId)->lockForUpdate()->first();

            if (!$newSlot) {
                throw new RuntimeException('El nuevo slot no existe.');
            }
            if ($newSlot->status !== SlotStatus::AVAILABLE) {
                throw new RuntimeException('El nuevo slot no está disponible.');
            }
            if ($newSlot->starts_at->isPast()) {
                throw new RuntimeException('El nuevo slot está en el pasado.');
            }

            $doctorProfile = $actor->doctorProfile;
            if (!$doctorProfile || $newSlot->doctor_id !== $doctorProfile->id) {
                throw new RuntimeException('El slot debe pertenecer al mismo médico.');
            }

            // Liberar slot anterior
            $oldSlot = Slot::query()->whereKey($appointment->slot_id)->lockForUpdate()->first();
            if ($oldSlot && $oldSlot->status === SlotStatus::BOOKED) {
                $oldSlot->status = SlotStatus::AVAILABLE;
                $oldSlot->save();
            }

            // Ocupar nuevo slot
            $newSlot->status = SlotStatus::BOOKED;
            $newSlot->save();

            // Actualizar cita
            $appointment->slot_id          = $newSlot->id;
            $appointment->scheduled_at     = $newSlot->starts_at;
            $appointment->duration_minutes = $newSlot->starts_at->diffInMinutes($newSlot->ends_at);
            $appointment->branch_id        = $newSlot->branch_id;
            $appointment->save();

            if ($doctorProfile) {
                app(ScheduleService::class)->refreshNextAvailableSlot($doctorProfile);
            }

            return $appointment->fresh(['doctor', 'patient', 'clinic', 'branch', 'slot']);
        });
    }

    /**
     * Cancela una cita. Paciente o médico pueden cancelar mientras esté pending/confirmed.
     * Libera el slot para que quede disponible de nuevo.
     */
    public function cancel(Appointment $appointment, User $actor, ?string $reason = null): Appointment
    {
        $isParticipant = in_array($actor->id, [$appointment->patient_id, $appointment->doctor_id], true);
        if (!$isParticipant) {
            throw new RuntimeException('No tienes permiso para cancelar esta cita.');
        }

        if (!$appointment->status->isCancellable()) {
            throw new RuntimeException('Esta cita ya no puede cancelarse en su estado actual.');
        }

        DB::transaction(function () use ($appointment, $actor, $reason): void {
            $appointment->status              = AppointmentStatus::CANCELLED;
            $appointment->cancelled_at        = now();
            $appointment->cancelled_by        = $actor->id;
            $appointment->cancellation_reason = $reason;
            $appointment->save();

            $slot = Slot::query()->whereKey($appointment->slot_id)->lockForUpdate()->first();
            if ($slot && $slot->status === SlotStatus::BOOKED && $slot->starts_at->isFuture()) {
                $slot->status = SlotStatus::AVAILABLE;
                $slot->save();

                if ($slot->doctor) {
                    app(ScheduleService::class)->refreshNextAvailableSlot($slot->doctor);
                }
            }
        });

        $fresh = $appointment->fresh();
        $this->push->notifyAppointmentCancelled($fresh, $actor);

        return $fresh;
    }

    /**
     * Marca una cita como completada. Solo el médico, y solo si estaba confirmed/in_progress.
     */
    public function complete(Appointment $appointment, User $actor, ?string $doctorNotes = null): Appointment
    {
        $this->assertActorIsDoctorOfAppointment($appointment, $actor);

        if (!in_array($appointment->status, [AppointmentStatus::CONFIRMED, AppointmentStatus::IN_PROGRESS], true)) {
            throw new RuntimeException('Solo se pueden completar citas confirmadas o en curso.');
        }

        $appointment->status       = AppointmentStatus::COMPLETED;
        $appointment->completed_at = now();
        if ($doctorNotes !== null) {
            $appointment->doctor_notes = $doctorNotes;
        }
        $appointment->save();

        $fresh = $appointment->fresh();
        $this->push->notifyAppointmentCompleted($fresh);

        return $fresh;
    }

    /**
     * Marca no-show. Solo el médico.
     */
    public function markNoShow(Appointment $appointment, User $actor): Appointment
    {
        $this->assertActorIsDoctorOfAppointment($appointment, $actor);

        if ($appointment->status !== AppointmentStatus::CONFIRMED) {
            throw new RuntimeException('Solo citas confirmadas pueden marcarse como no-show.');
        }

        $appointment->status = AppointmentStatus::NO_SHOW;
        $appointment->save();

        $fresh = $appointment->fresh();
        $this->push->notifyNoShow($fresh);

        return $fresh;
    }

    /**
     * @return Collection<int, Appointment>
     */
    public function listForUser(User $user, ?AppointmentStatus $status = null, int $limit = 50): Collection
    {
        $query = Appointment::query()
            ->with(['doctor:id,name,avatar_url', 'patient:id,name,avatar_url', 'clinic:id,name,logo_url', 'branch:id,name,address'])
            ->orderBy('scheduled_at', 'desc')
            ->limit($limit);

        match ($user->role) {
            UserRole::PATIENT       => $query->where('patient_id', $user->id),
            UserRole::DOCTOR        => $query->where('doctor_id', $user->id),
            UserRole::CLINIC_ADMIN  => $this->scopeToClinicAdmin($query, $user),
            default                 => $query->whereRaw('1 = 0'),
        };

        if ($status !== null) {
            $query->where('status', $status->value);
        }

        return $query->get();
    }

    private function scopeToClinicAdmin(Builder $query, User $admin): void
    {
        $clinicIds = DB::table('clinic_admins')
            ->where('user_id', $admin->id)
            ->where('is_active', true)
            ->pluck('clinic_id');

        $query->whereIn('clinic_id', $clinicIds);
    }

    private function assertActorIsDoctorOfAppointment(Appointment $appointment, User $actor): void
    {
        if ($actor->id !== $appointment->doctor_id || $actor->role !== UserRole::DOCTOR) {
            throw new RuntimeException('Solo el médico asignado puede realizar esta acción.');
        }
    }
}
