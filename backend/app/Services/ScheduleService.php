<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\SlotStatus;
use App\Models\DoctorProfile;
use App\Models\Schedule;
use App\Models\Slot;
use Carbon\CarbonImmutable;
use Carbon\CarbonPeriod;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

final class ScheduleService
{
    private const DAY_TO_ISO = [
        'monday'    => 1,
        'tuesday'   => 2,
        'wednesday' => 3,
        'thursday'  => 4,
        'friday'    => 5,
        'saturday'  => 6,
        'sunday'    => 7,
    ];

    /**
     * Zona horaria de las clínicas. La hora de pared elegida por el médico
     * (ej. "08:00") se interpreta en esta zona, no en UTC. Sin esto los slots
     * quedaban corridos −4h (08:00 → 04:00 Caracas) y los de "hoy" desaparecían
     * del filtro `starts_at >= now()`.
     */
    public const CLINIC_TIMEZONE = 'America/Caracas';

    /**
     * @return Collection<int, Schedule>
     */
    public function listForDoctor(DoctorProfile $doctor): Collection
    {
        return $doctor->schedules()
            ->with([
                'branch:id,name,clinic_id',
                'office:id,name,type,address,city',
            ])
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get();
    }

    /**
     * Horizonte (en semanas) hasta el que el job de auto-extensión mantiene
     * generados los slots de los horarios marcados como auto_extend.
     */
    public const ROLLING_HORIZON_WEEKS = 12;

    /**
     * Crea un horario en una sede de clínica verificada. La sede (branch_id) es
     * obligatoria: ya no se permiten consultorios propios libres. Al crear el
     * horario, el médico queda auto-vinculado a la clínica de esa sede.
     *
     * @param  array{branch_id:string, day_of_week:string, start_time:string, end_time:string, slot_duration_minutes?:int, auto_extend?:bool}  $data
     */
    public function create(DoctorProfile $doctor, array $data): Schedule
    {
        return DB::transaction(function () use ($doctor, $data): Schedule {
            $this->ensureClinicLink($doctor, $data['branch_id']);

            return Schedule::create([
                'doctor_id'             => $doctor->id,
                'branch_id'             => $data['branch_id'],
                'office_id'             => null,
                'day_of_week'           => $data['day_of_week'],
                'start_time'            => $data['start_time'],
                'end_time'              => $data['end_time'],
                'slot_duration_minutes' => $data['slot_duration_minutes'] ?? 30,
                'is_active'             => true,
                'auto_extend'           => $data['auto_extend'] ?? false,
            ]);
        });
    }

    /**
     * Vincula (idempotente) al médico con la clínica dueña de la sede indicada.
     * clinic_doctors.doctor_id referencia users.id (no doctor_profiles.id).
     */
    private function ensureClinicLink(DoctorProfile $doctor, string $branchId): void
    {
        $branch = DB::table('clinic_branches')
            ->where('id', $branchId)
            ->first(['id', 'clinic_id']);

        if (! $branch) {
            return;
        }

        $userId = $doctor->user_id;
        $now    = now();

        $exists = DB::table('clinic_doctors')
            ->where('clinic_id', $branch->clinic_id)
            ->where('doctor_id', $userId)
            ->exists();

        if ($exists) {
            DB::table('clinic_doctors')
                ->where('clinic_id', $branch->clinic_id)
                ->where('doctor_id', $userId)
                ->update([
                    'branch_id'  => $branch->id,
                    'is_active'  => true,
                    'updated_at' => $now,
                ]);

            return;
        }

        DB::table('clinic_doctors')->insert([
            'clinic_id'  => $branch->clinic_id,
            'doctor_id'  => $userId,
            'branch_id'  => $branch->id,
            'is_active'  => true,
            'joined_at'  => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Schedule $schedule, array $data): Schedule
    {
        $schedule->fill($data)->save();

        return $schedule->fresh();
    }

    public function delete(Schedule $schedule): void
    {
        $schedule->delete();
    }

    /**
     * Genera slots concretos para un rango de fechas a partir de un schedule recurrente.
     * Usa upsert para evitar duplicados: si ya existe un slot en (doctor_id, starts_at), no lo crea.
     */
    public function generateSlots(
        Schedule $schedule,
        CarbonImmutable $from,
        CarbonImmutable $until,
    ): int {
        $isoDay = self::DAY_TO_ISO[$schedule->day_of_week->value];

        $period = CarbonPeriod::create($from->startOfDay(), '1 day', $until->endOfDay());
        $rows = [];
        $now = now();

        foreach ($period as $day) {
            if ((int) $day->isoWeekday() !== $isoDay) {
                continue;
            }

            [$startH, $startM] = array_map('intval', explode(':', substr((string) $schedule->start_time, 0, 5)));
            [$endH, $endM]     = array_map('intval', explode(':', substr((string) $schedule->end_time, 0, 5)));

            // La hora del médico es hora local de la clínica (Caracas), no UTC.
            // Carbon convierte el instante a UTC al persistir en la columna timestamptz.
            $cursor = CarbonImmutable::parse($day->toDateString(), self::CLINIC_TIMEZONE)
                ->setTime($startH, $startM, 0);
            $end = CarbonImmutable::parse($day->toDateString(), self::CLINIC_TIMEZONE)
                ->setTime($endH, $endM, 0);

            while ($cursor->addMinutes($schedule->slot_duration_minutes)->lte($end)) {
                $slotEnd = $cursor->addMinutes($schedule->slot_duration_minutes);

                $rows[] = [
                    'id'          => (string) \Illuminate\Support\Str::uuid(),
                    'doctor_id'   => $schedule->doctor_id,
                    'branch_id'   => $schedule->branch_id,
                    'office_id'   => $schedule->office_id,
                    'schedule_id' => $schedule->id,
                    'starts_at'   => $cursor->toIso8601String(),
                    'ends_at'     => $slotEnd->toIso8601String(),
                    'status'      => SlotStatus::AVAILABLE->value,
                    'created_at'  => $now,
                    'updated_at'  => $now,
                ];

                $cursor = $slotEnd;
            }
        }

        if ($rows === []) {
            return 0;
        }

        DB::table('slots')->upsert($rows, ['doctor_id', 'starts_at'], ['ends_at', 'status', 'schedule_id', 'updated_at']);

        $this->refreshNextAvailableSlot($schedule->doctor);

        return count($rows);
    }

    /**
     * Mantiene "rodando" la agenda de los horarios marcados como indefinidos
     * (auto_extend = true): genera slots desde hoy hasta hoy + ROLLING_HORIZON_WEEKS.
     * Pensado para ejecutarse a diario desde el scheduler. Idempotente (upsert).
     *
     * @return array{schedules: int, slots: int}
     */
    public function extendAutoSchedules(): array
    {
        $from  = CarbonImmutable::now();
        $until = $from->addWeeks(self::ROLLING_HORIZON_WEEKS);

        $schedules = Schedule::query()
            ->where('is_active', true)
            ->where('auto_extend', true)
            ->get();

        $totalSlots = 0;
        foreach ($schedules as $schedule) {
            $totalSlots += $this->generateSlots($schedule, $from, $until);
        }

        return [
            'schedules' => $schedules->count(),
            'slots'     => $totalSlots,
        ];
    }

    /**
     * @return Collection<int, Slot>
     */
    public function listUpcomingSlots(
        DoctorProfile $doctor,
        ?string $from = null,
        ?string $until = null,
        ?string $scheduleId = null,
        ?string $status = null,
        int $limit = 200,
    ): Collection {
        $query = $doctor->slots()
            ->with(['branch:id,name', 'office:id,name,type'])
            ->orderBy('starts_at');

        $query->where('starts_at', '>=', $from
            ? CarbonImmutable::parse($from)->startOfDay()
            : now()
        );

        if ($until !== null) {
            $query->where('starts_at', '<=', CarbonImmutable::parse($until)->endOfDay());
        }
        if ($scheduleId !== null) {
            $query->where('schedule_id', $scheduleId);
        }
        if ($status !== null) {
            $query->where('status', $status);
        }

        return $query->limit($limit)->get();
    }

    public function updateSlotStatus(Slot $slot, SlotStatus $status): Slot
    {
        $slot->status = $status;
        $slot->save();

        $this->refreshNextAvailableSlot($slot->doctor);

        return $slot->fresh();
    }

    public function deleteSlot(Slot $slot): void
    {
        $doctor = $slot->doctor;
        $slot->delete();
        $this->refreshNextAvailableSlot($doctor);
    }

    public function refreshNextAvailableSlot(DoctorProfile $doctor): void
    {
        $next = $doctor->slots()
            ->where('status', SlotStatus::AVAILABLE->value)
            ->where('starts_at', '>=', now())
            ->orderBy('starts_at')
            ->value('starts_at');

        $doctor->next_available_slot = $next;
        $doctor->is_available        = $next !== null;
        $doctor->save();
    }
}
