<?php

declare(strict_types=1);

namespace App\Services;

use App\Jobs\SendPushNotificationJob;
use App\Models\Appointment;
use App\Models\User;
use Carbon\CarbonInterface;

/**
 * Orquesta el envío de notificaciones push para eventos del dominio.
 * Cada método carga los tokens activos del destinatario y despacha
 * el Job a la cola — nunca bloquea el request.
 */
final class PushNotificationService
{
    /**
     * Notifica al paciente que el médico confirmó su cita.
     */
    public function notifyAppointmentConfirmed(Appointment $appointment): void
    {
        $patient = $appointment->patient ?? User::find($appointment->patient_id);
        if (!$patient) {
            return;
        }

        $tokens = $this->activeTokens($patient);
        if ($tokens === []) {
            return;
        }

        $when = $this->formatDate($appointment->scheduled_at);

        SendPushNotificationJob::dispatch(
            $tokens,
            '✅ Cita confirmada',
            "Tu cita del {$when} ha sido confirmada por el médico.",
            [
                'type'           => 'appointment_confirmed',
                'appointment_id' => $appointment->id,
            ],
        );
    }

    /**
     * Notifica al médico que un paciente reservó una cita.
     */
    public function notifyNewBooking(Appointment $appointment): void
    {
        $doctor = $appointment->doctor ?? User::find($appointment->doctor_id);
        if (!$doctor) {
            return;
        }

        $tokens = $this->activeTokens($doctor);
        if ($tokens === []) {
            return;
        }

        $patientName = $appointment->patient?->name ?? 'Un paciente';
        $when        = $this->formatDate($appointment->scheduled_at);

        SendPushNotificationJob::dispatch(
            $tokens,
            '📅 Nueva solicitud de cita',
            "{$patientName} solicitó una cita para el {$when}.",
            [
                'type'           => 'appointment_booked',
                'appointment_id' => $appointment->id,
            ],
        );
    }

    /**
     * Notifica a ambos participantes sobre la cancelación.
     */
    public function notifyAppointmentCancelled(Appointment $appointment, User $cancelledBy): void
    {
        $appointment->loadMissing(['patient', 'doctor']);

        $when         = $this->formatDate($appointment->scheduled_at);
        $cancellerRole = $cancelledBy->id === $appointment->patient_id ? 'el paciente' : 'el médico';

        // Notificar al que NO canceló
        $recipient = $cancelledBy->id === $appointment->patient_id
            ? $appointment->doctor
            : $appointment->patient;

        if (!$recipient) {
            return;
        }

        $tokens = $this->activeTokens($recipient);
        if ($tokens === []) {
            return;
        }

        SendPushNotificationJob::dispatch(
            $tokens,
            '❌ Cita cancelada',
            "La cita del {$when} fue cancelada por {$cancellerRole}.",
            [
                'type'           => 'appointment_cancelled',
                'appointment_id' => $appointment->id,
                'reason'         => $appointment->cancellation_reason ?? '',
            ],
        );
    }

    /**
     * Notifica al paciente que su cita fue marcada como completada.
     */
    public function notifyAppointmentCompleted(Appointment $appointment): void
    {
        $patient = $appointment->patient ?? User::find($appointment->patient_id);
        if (!$patient) {
            return;
        }

        $tokens = $this->activeTokens($patient);
        if ($tokens === []) {
            return;
        }

        SendPushNotificationJob::dispatch(
            $tokens,
            '🏥 Consulta completada',
            'Tu consulta ha sido marcada como completada. Puedes compartir tu experiencia.',
            [
                'type'           => 'appointment_completed',
                'appointment_id' => $appointment->id,
            ],
        );
    }

    /**
     * Notifica al paciente sobre un no-show.
     */
    public function notifyNoShow(Appointment $appointment): void
    {
        $patient = $appointment->patient ?? User::find($appointment->patient_id);
        if (!$patient) {
            return;
        }

        $tokens = $this->activeTokens($patient);
        if ($tokens === []) {
            return;
        }

        $when = $this->formatDate($appointment->scheduled_at);

        SendPushNotificationJob::dispatch(
            $tokens,
            '⚠️ No se presentó a la cita',
            "Se registró ausencia en la cita del {$when}. Puedes reagendar cuando quieras.",
            [
                'type'           => 'appointment_no_show',
                'appointment_id' => $appointment->id,
            ],
        );
    }

    /**
     * @return string[]
     */
    private function activeTokens(User $user): array
    {
        return $user->fcmTokens()
            ->pluck('token')
            ->all();
    }

    private function formatDate(mixed $date): string
    {
        if ($date instanceof CarbonInterface) {
            return $date->translatedFormat('d \d\e F \a \l\a\s H:i');
        }

        return (string) $date;
    }
}
