<?php

declare(strict_types=1);

namespace App\Http\Controllers\Appointment;

use App\Enums\AppointmentStatus;
use App\Enums\SlotStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Appointment\BookAppointmentRequest;
use App\Http\Requests\Appointment\CancelAppointmentRequest;
use App\Http\Requests\Appointment\CompleteAppointmentRequest;
use App\Models\Appointment;
use App\Models\DoctorProfile;
use App\Models\Slot;
use App\Services\AppointmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

final class AppointmentController extends Controller
{
    public function __construct(
        private readonly AppointmentService $appointmentService
    ) {}

    /**
     * Devuelve los slots disponibles de un médico para que el paciente pueda reservar.
     * GET /appointments/slots?doctor_profile_id=xxx&days=30
     */
    public function availableSlots(Request $request): JsonResponse
    {
        $doctorProfileId = $request->query('doctor_profile_id');

        if (! $doctorProfileId) {
            return response()->json(['status' => 'error', 'message' => 'doctor_profile_id requerido.', 'data' => null], 422);
        }

        $doctor = DoctorProfile::find($doctorProfileId);

        if (! $doctor) {
            return response()->json(['status' => 'error', 'message' => 'Médico no encontrado.', 'data' => null], 404);
        }

        $days = min((int) $request->query('days', 30), 60);

        $slots = Slot::where('doctor_id', $doctor->id)
            ->where('status', SlotStatus::AVAILABLE->value)
            ->where('starts_at', '>=', now())
            ->where('starts_at', '<=', now()->addDays($days))
            ->orderBy('starts_at')
            ->get(['id', 'starts_at', 'ends_at', 'status', 'branch_id']);

        return response()->json([
            'status'  => 'success',
            'message' => 'Slots disponibles obtenidos.',
            'data'    => $slots,
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $statusFilter = $request->query('status');
        $status = $statusFilter ? AppointmentStatus::tryFrom((string) $statusFilter) : null;

        $appointments = $this->appointmentService->listForUser(
            $request->user(),
            $status,
            (int) $request->query('limit', 50),
        );

        return response()->json([
            'status'  => 'success',
            'message' => 'Citas obtenidas correctamente.',
            'data'    => $appointments,
        ]);
    }

    public function show(Request $request, Appointment $appointment): JsonResponse
    {
        $this->authorizeParticipant($request, $appointment);

        $appointment->load(['doctor', 'patient', 'clinic', 'branch', 'slot']);

        return response()->json([
            'status'  => 'success',
            'message' => 'Cita obtenida correctamente.',
            'data'    => $appointment,
        ]);
    }

    public function book(BookAppointmentRequest $request): JsonResponse
    {
        try {
            $appointment = $this->appointmentService->book($request->user(), $request->validated());
        } catch (RuntimeException $e) {
            return $this->errorResponse($e->getMessage(), Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Cita reservada correctamente.',
            'data'    => $appointment,
        ], Response::HTTP_CREATED);
    }

    public function confirm(Request $request, Appointment $appointment): JsonResponse
    {
        try {
            $appointment = $this->appointmentService->confirm($appointment, $request->user());
        } catch (RuntimeException $e) {
            return $this->errorResponse($e->getMessage(), Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Cita confirmada.',
            'data'    => $appointment,
        ]);
    }

    public function cancel(CancelAppointmentRequest $request, Appointment $appointment): JsonResponse
    {
        try {
            $appointment = $this->appointmentService->cancel(
                $appointment,
                $request->user(),
                $request->validated('reason'),
            );
        } catch (RuntimeException $e) {
            return $this->errorResponse($e->getMessage(), Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Cita cancelada.',
            'data'    => $appointment,
        ]);
    }

    public function complete(CompleteAppointmentRequest $request, Appointment $appointment): JsonResponse
    {
        try {
            $appointment = $this->appointmentService->complete(
                $appointment,
                $request->user(),
                $request->validated('doctor_notes'),
            );
        } catch (RuntimeException $e) {
            return $this->errorResponse($e->getMessage(), Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Cita marcada como completada.',
            'data'    => $appointment,
        ]);
    }

    public function noShow(Request $request, Appointment $appointment): JsonResponse
    {
        try {
            $appointment = $this->appointmentService->markNoShow($appointment, $request->user());
        } catch (RuntimeException $e) {
            return $this->errorResponse($e->getMessage(), Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Cita marcada como no-show.',
            'data'    => $appointment,
        ]);
    }

    private function authorizeParticipant(Request $request, Appointment $appointment): void
    {
        $user = $request->user();
        $isParticipant = in_array($user->id, [$appointment->patient_id, $appointment->doctor_id], true);

        if (!$isParticipant) {
            abort(Response::HTTP_FORBIDDEN, 'No tienes permiso para ver esta cita.');
        }
    }

    private function errorResponse(string $message, int $status): JsonResponse
    {
        return response()->json([
            'status'  => 'error',
            'message' => $message,
            'data'    => null,
        ], $status);
    }
}
