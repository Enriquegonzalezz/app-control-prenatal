<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

final class CleanupTokensCommand extends Command
{
    protected $signature = 'tokens:cleanup
                            {--days=30 : Eliminar tokens sin usar por X días}
                            {--force : No pedir confirmación}';

    protected $description = 'Limpiar tokens de acceso expirados o sin uso';

    public function handle(): int
    {
        $days = (int) $this->option('days');
        $cutoffDate = now()->subDays($days);

        // Contar tokens a eliminar
        $tokensToDelete = DB::table('personal_access_tokens')
            ->where(function ($query) use ($cutoffDate) {
                $query->where('last_used_at', '<', $cutoffDate)
                    ->orWhere(function ($q) use ($cutoffDate) {
                        $q->whereNull('last_used_at')
                            ->where('created_at', '<', $cutoffDate);
                    });
            })
            ->count();

        if ($tokensToDelete === 0) {
            $this->info("✅ No hay tokens para eliminar (sin uso por {$days} días)");
            return self::SUCCESS;
        }

        $this->warn("🗑️  Se encontraron {$tokensToDelete} tokens sin uso por más de {$days} días");

        // Mostrar estadísticas
        $totalTokens = DB::table('personal_access_tokens')->count();
        $this->info("Total tokens actuales: {$totalTokens}");
        $this->info("Tokens a eliminar: {$tokensToDelete}");
        $this->info("Tokens restantes: " . ($totalTokens - $tokensToDelete));
        $this->newLine();

        if (!$this->option('force')) {
            if (!$this->confirm('¿Desea continuar con la eliminación?', true)) {
                $this->warn('Operación cancelada');
                return self::FAILURE;
            }
        }

        // Eliminar tokens
        $deleted = DB::table('personal_access_tokens')
            ->where(function ($query) use ($cutoffDate) {
                $query->where('last_used_at', '<', $cutoffDate)
                    ->orWhere(function ($q) use ($cutoffDate) {
                        $q->whereNull('last_used_at')
                            ->where('created_at', '<', $cutoffDate);
                    });
            })
            ->delete();

        $this->info("✅ Se eliminaron {$deleted} tokens exitosamente");

        return self::SUCCESS;
    }
}
