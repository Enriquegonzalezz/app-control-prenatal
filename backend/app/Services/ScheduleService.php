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
     * @return Collection<int, Schedule>
     */
    public function listForDoctor(DoctorProfile $doctor): Collection
    {
        return $doctor->schedules()
            ->with('branch:id,name,clinic_id')
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get();
    }

    /**
     * @param  array{branch_id:string, day_of_week:string, start_time:string, end_time:string, slot_duration_minutes?:int}  $data
     */
    public function create(DoctorProfile $doctor, array $data): Schedule
    {
        return Schedule::create([
            'doctor_id'             => $doctor->id,
            'branch_id'             => $data['branch_id'],
            'day_of_week'           => $data['day_of_week'],
            'start_time'            => $data['start_time'],
            'end_time'              => $data['end_time'],
            'slot_duration_minutes' => $data['slot_duration_minutes'] ?? 30,
            'is_active'             => true,
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

            $cursor = CarbonImmutable::parse($day->toDateString())
                ->setTime($startH, $startM, 0);
            $end = CarbonImmutable::parse($day->toDateString())
                ->setTime($endH, $endM, 0);

            while ($cursor->addMinutes($schedule->slot_duration_minutes)->lte($end)) {
                $slotEnd = $cursor->addMinutes($schedule->slot_duration_minutes);

                $rows[] = [
                    'id'          => (string) \Illuminate\Support\Str::uuid(),
                    'doctor_id'   => $schedule->doctor_id,
                    'branch_id'   => $schedule->branch_id,
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
     * @return Collection<int, Slot>
     */
    public function listUpcomingSlots(DoctorProfile $doctor, int $limit = 50): Collection
    {
        return $doctor->slots()
            ->where('starts_at', '>=', now())
            ->orderBy('starts_at')
            ->limit($limit)
            ->get();
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
