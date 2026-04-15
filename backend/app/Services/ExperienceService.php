<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\AppointmentStatus;
use App\Enums\ExperiencePrivacy;
use App\Enums\ExperienceStatus;
use App\Models\Appointment;
use App\Models\Experience;
use App\Models\User;
use Illuminate\Support\Collection;
use RuntimeException;

final class ExperienceService
{
    // Palabras que activan moderación básica (extensible via .env / BD)
    private const BLOCKED_PATTERNS = [
        '/\b(idiota|imbécil|maldito|maldita|estúpido|estúpida)\b/iu',
    ];

    /**
     * Lista experiencias publicadas de un médico (para su perfil público).
     *
     * @return Collection<int, Experience>
     */
    public function listForDoctor(string $doctorId, int $limit = 20): Collection
    {
        return Experience::with(['tags', 'patient:id,name'])
            ->where('doctor_id', $doctorId)
            ->where('status', ExperienceStatus::PUBLISHED->value)
            ->latest('published_at')
            ->limit($limit)
            ->get()
            ->map(fn (Experience $e) => $this->applyPrivacy($e));
    }

    /**
     * Lista las experiencias del paciente autenticado.
     *
     * @return Collection<int, Experience>
     */
    public function listForPatient(User $patient): Collection
    {
        return Experience::with(['tags', 'doctor:id,name'])
            ->where('patient_id', $patient->id)
            ->latest()
            ->get();
    }

    /**
     * Crea una nueva experiencia.
     * Validaciones: cita completada, sin experiencia previa para esa cita.
     *
     * @param array{appointment_id:string, body:string, privacy?:string, tag_ids?:string[]} $data
     */
    public function create(User $patient, array $data): Experience
    {
        $appointment = Appointment::findOrFail($data['appointment_id']);

        // Solo citas completadas
        if ($appointment->status !== AppointmentStatus::COMPLETED) {
            throw new RuntimeException(
                'Solo puedes compartir una experiencia después de una consulta completada.'
            );
        }

        // Solo el paciente de la cita
        if ($appointment->patient_id !== $patient->id) {
            throw new RuntimeException('Esta cita no te pertenece.');
        }

        // Una experiencia por cita
        if (Experience::where('appointment_id', $appointment->id)->exists()) {
            throw new RuntimeException('Ya publicaste una experiencia para esta cita.');
        }

        $this->moderateContent($data['body']);

        $experience = Experience::create([
            'appointment_id' => $appointment->id,
            'patient_id'     => $patient->id,
            'doctor_id'      => $appointment->doctor_id,
            'clinic_id'      => $appointment->clinic_id,
            'body'           => $data['body'],
            'privacy'        => $data['privacy'] ?? ExperiencePrivacy::PARTIAL->value,
            'status'         => ExperienceStatus::PUBLISHED->value,
            'published_at'   => now(),
        ]);

        if (!empty($data['tag_ids'])) {
            $experience->tags()->sync($data['tag_ids']);
        }

        return $experience->load(['tags', 'doctor:id,name']);
    }

    /**
     * Actualiza una experiencia en estado pending.
     *
     * @param array<string, mixed> $data
     */
    public function update(User $patient, Experience $experience, array $data): Experience
    {
        if ($experience->patient_id !== $patient->id) {
            throw new RuntimeException('No tienes permiso para editar esta experiencia.');
        }

        if (!$experience->status->isEditable()) {
            throw new RuntimeException('Solo se pueden editar experiencias en estado pending.');
        }

        if (isset($data['body'])) {
            $this->moderateContent($data['body']);
        }

        $experience->fill(array_intersect_key($data, array_flip(['body', 'privacy'])))->save();

        if (isset($data['tag_ids'])) {
            $experience->tags()->sync($data['tag_ids']);
        }

        return $experience->fresh(['tags']);
    }

    /**
     * Lista los tags disponibles (catálogo público).
     *
     * @return Collection<int, \App\Models\ExperienceTag>
     */
    public function listTags(): Collection
    {
        return \App\Models\ExperienceTag::where('is_active', true)->get();
    }

    /**
     * Resumen de badges para el perfil del médico:
     * "Trato humano (12)", "Puntual (8)", etc.
     *
     * @return Collection<int, array<string, mixed>>
     */
    public function doctorBadges(string $doctorId): Collection
    {
        return \App\Models\ExperienceTag::withCount([
            'experiences as count' => fn ($q) => $q
                ->where('doctor_id', $doctorId)
                ->where('status', ExperienceStatus::PUBLISHED->value),
        ])
        ->having('count', '>', 0)
        ->orderByDesc('count')
        ->get(['id', 'name', 'icon', 'count']);
    }

    // ── privados ──────────────────────────────────────────────

    private function moderateContent(string $body): void
    {
        foreach (self::BLOCKED_PATTERNS as $pattern) {
            if (preg_match($pattern, $body)) {
                throw new RuntimeException(
                    'El texto contiene lenguaje inapropiado. Por favor revísalo antes de publicar.'
                );
            }
        }
    }

    private function applyPrivacy(Experience $experience): Experience
    {
        if (!$experience->relationLoaded('patient') || !$experience->patient) {
            return $experience;
        }

        $experience->patient->name = match ($experience->privacy) {
            ExperiencePrivacy::FULL_NAME  => $experience->patient->name,
            ExperiencePrivacy::PARTIAL    => $this->partialName($experience->patient->name),
            ExperiencePrivacy::ANONYMOUS  => 'Paciente anónimo',
        };

        return $experience;
    }

    private function partialName(string $fullName): string
    {
        $parts = explode(' ', trim($fullName));
        if (count($parts) < 2) {
            return $parts[0];
        }
        return $parts[0] . ' ' . strtoupper(mb_substr($parts[1], 0, 1)) . '.';
    }
}
