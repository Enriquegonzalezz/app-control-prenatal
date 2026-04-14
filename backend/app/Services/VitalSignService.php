<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\MedicalRecord;
use App\Models\User;
use App\Models\VitalSign;
use Illuminate\Support\Collection;

final class VitalSignService
{
    /**
     * Lista los signos vitales de un registro médico.
     *
     * @return Collection<int, VitalSign>
     */
    public function listForRecord(MedicalRecord $record): Collection
    {
        return $record->vitalSigns()
            ->orderBy('recorded_at', 'desc')
            ->get();
    }

    /**
     * Registra nuevos signos vitales para un paciente.
     * Solo el médico del registro puede añadir signos vitales.
     *
     * @param array{recorded_at?:string, weight_kg?:float, height_cm?:float,
     *             blood_pressure_systolic?:int, blood_pressure_diastolic?:int,
     *             heart_rate_bpm?:int, temperature_c?:float,
     *             oxygen_saturation?:float, specialty_data?:array<string,mixed>} $data
     */
    public function create(User $doctor, MedicalRecord $record, array $data): VitalSign
    {
        if ($record->doctor_id !== $doctor->id) {
            abort(403, 'Solo el médico del registro puede añadir signos vitales.');
        }

        return VitalSign::create([
            'medical_record_id'         => $record->id,
            'patient_id'                => $record->patient_id,
            'doctor_id'                 => $doctor->id,
            'recorded_at'               => $data['recorded_at'] ?? now(),
            'weight_kg'                 => $data['weight_kg'] ?? null,
            'height_cm'                 => $data['height_cm'] ?? null,
            'blood_pressure_systolic'   => $data['blood_pressure_systolic'] ?? null,
            'blood_pressure_diastolic'  => $data['blood_pressure_diastolic'] ?? null,
            'heart_rate_bpm'            => $data['heart_rate_bpm'] ?? null,
            'temperature_c'             => $data['temperature_c'] ?? null,
            'oxygen_saturation'         => $data['oxygen_saturation'] ?? null,
            'specialty_data'            => $data['specialty_data'] ?? [],
        ]);
    }
}
