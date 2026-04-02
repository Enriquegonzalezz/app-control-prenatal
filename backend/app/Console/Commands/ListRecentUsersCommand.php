<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

final class ListRecentUsersCommand extends Command
{
    protected $signature = 'users:recent
                            {--limit=10 : Cantidad de usuarios a mostrar}
                            {--role= : Filtrar por rol (patient, doctor, clinic_admin)}';

    protected $description = 'Listar usuarios recientes registrados en el sistema';

    public function handle(): int
    {
        $limit = (int) $this->option('limit');
        $role = $this->option('role');

        $query = User::query()
            ->latest('created_at')
            ->limit($limit);

        if ($role) {
            $query->where('role', $role);
        }

        $users = $query->get();

        if ($users->isEmpty()) {
            $this->warn('No se encontraron usuarios');
            return self::FAILURE;
        }

        $title = $role
            ? "👥 ÚLTIMOS {$limit} USUARIOS ({$role})"
            : "👥 ÚLTIMOS {$limit} USUARIOS";

        $this->info($title);
        $this->newLine();

        $this->table(
            ['ID', 'Nombre', 'Email', 'Rol', 'Activo', 'Registrado'],
            $users->map(fn($user) => [
                $user->id,
                $user->name,
                $user->email,
                $user->role->value,
                $user->is_active ? '✓' : '✗',
                $user->created_at->diffForHumans(),
            ])
        );

        return self::SUCCESS;
    }
}
