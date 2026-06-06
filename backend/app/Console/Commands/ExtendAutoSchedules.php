<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\ScheduleService;
use Illuminate\Console\Command;

/**
 * Extiende automáticamente la agenda de los horarios marcados como indefinidos.
 *
 * Los horarios con auto_extend = true se mantienen siempre generados hasta
 * ScheduleService::ROLLING_HORIZON_WEEKS semanas por delante. Se ejecuta a
 * diario desde el scheduler (ver routes/console.php).
 */
final class ExtendAutoSchedules extends Command
{
    protected $signature = 'slots:extend';

    protected $description = 'Genera slots a futuro para los horarios indefinidos (auto_extend).';

    public function handle(ScheduleService $scheduleService): int
    {
        $result = $scheduleService->extendAutoSchedules();

        $this->info(sprintf(
            'Auto-extensión: %d horarios procesados, %d slots asegurados.',
            $result['schedules'],
            $result['slots'],
        ));

        return self::SUCCESS;
    }
}
