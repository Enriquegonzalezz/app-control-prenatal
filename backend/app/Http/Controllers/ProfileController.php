<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->isDoctor()) {
            $user->load('doctorProfile.specialty');
        } elseif ($user->isPatient()) {
            $user->load('patientProfile');
        }

        return response()->json([
            'status' => 'success',
            'data' => UserResource::make($user),
        ]);
    }

    public function doctorProfile(Request $request): JsonResponse
    {
        $user = $request->user()->load('doctorProfile.specialty');

        return response()->json([
            'status' => 'success',
            'data' => UserResource::make($user),
        ]);
    }

    public function patientProfile(Request $request): JsonResponse
    {
        $user = $request->user()->load('patientProfile');

        return response()->json([
            'status' => 'success',
            'data' => UserResource::make($user),
        ]);
    }
}
