<?php

declare(strict_types=1);

namespace App\Http\Controllers\Doctor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Doctor\GenerateSlotsRequest;
use App\Http\Requests\Doctor\StoreScheduleRequest;
use App\Http\Requests\Doctor\UpdateScheduleRequest;
use App\Models\Schedule;
use App\Services\ScheduleService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class ScheduleController extends Controller
{
    public function __construct(
        private readonly ScheduleService $scheduleService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $doctor = $request->user()->doctorProfile;

        return response()->json([
            'status'  => 'success',
            'message' => 'Horarios obtenidos correctamente.',
            'data'    => $this->scheduleService->listForDoctor($doctor),
        ]);
    }

    public function store(StoreScheduleRequest $request): JsonResponse
    {
        $doctor = $request->user()->doctorProfile;

        $schedule = $this->scheduleService->create($doctor, $request->validated());

        return response()->json([
            'status'  => 'success',
            'message' => 'Horario creado correctamente.',
            'data'    => $schedule,
        ], Response::HTTP_CREATED);
    }

    public function update(UpdateScheduleRequest $request, Schedule $schedule): JsonResponse
    {
        $this->authorizeOwnership($request, $schedule);

        $updated = $this->scheduleService->update($schedule, $request->validated());

        return response()->json([
            'status'  => 'success',
            'message' => 'Horario actualizado correctamente.',
            'data'    => $updated,
        ]);
    }

    public function destroy(Request $request, Schedule $schedule): JsonResponse
    {
        $this->authorizeOwnership($request, $schedule);

        $this->scheduleService->delete($schedule);

        return response()->json([
            'status'  => 'success',
            'message' => 'Horario eliminado correctamente.',
            'data'    => null,
        ]);
    }

    public function generateSlots(GenerateSlotsRequest $request, Schedule $schedule): JsonResponse
    {
        $this->authorizeOwnership($request, $schedule);

        $generated = $this->scheduleService->generateSlots(
            $schedule,
            CarbonImmutable::parse($request->validated('from')),
            CarbonImmutable::parse($request->validated('until')),
        );

        return response()->json([
            'status'  => 'success',
            'message' => "Slots generados: {$generated}.",
            'data'    => ['generated' => $generated],
        ]);
    }

    private function authorizeOwnership(Request $request, Schedule $schedule): void
    {
        if ($schedule->doctor_id !== $request->user()->doctorProfile?->id) {
            abort(Response::HTTP_FORBIDDEN, 'No puedes modificar horarios de otro médico.');
        }
    }
}
