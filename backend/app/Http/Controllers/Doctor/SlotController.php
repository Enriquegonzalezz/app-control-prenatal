<?php

declare(strict_types=1);

namespace App\Http\Controllers\Doctor;

use App\Enums\SlotStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Doctor\UpdateSlotStatusRequest;
use App\Models\Slot;
use App\Services\ScheduleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class SlotController extends Controller
{
    public function __construct(
        private readonly ScheduleService $scheduleService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $doctor = $request->user()->doctorProfile;

        return response()->json([
            'status'  => 'success',
            'message' => 'Slots obtenidos correctamente.',
            'data'    => $this->scheduleService->listUpcomingSlots($doctor),
        ]);
    }

    public function updateStatus(UpdateSlotStatusRequest $request, Slot $slot): JsonResponse
    {
        $this->authorizeOwnership($request, $slot);

        $updated = $this->scheduleService->updateSlotStatus(
            $slot,
            SlotStatus::from($request->validated('status'))
        );

        return response()->json([
            'status'  => 'success',
            'message' => 'Estado del slot actualizado.',
            'data'    => $updated,
        ]);
    }

    public function destroy(Request $request, Slot $slot): JsonResponse
    {
        $this->authorizeOwnership($request, $slot);

        $this->scheduleService->deleteSlot($slot);

        return response()->json([
            'status'  => 'success',
            'message' => 'Slot eliminado correctamente.',
            'data'    => null,
        ]);
    }

    private function authorizeOwnership(Request $request, Slot $slot): void
    {
        if ($slot->doctor_id !== $request->user()->doctorProfile?->id) {
            abort(Response::HTTP_FORBIDDEN, 'No puedes modificar slots de otro médico.');
        }
    }
}
