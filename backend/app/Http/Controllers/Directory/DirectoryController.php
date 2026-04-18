<?php

declare(strict_types=1);

namespace App\Http\Controllers\Directory;

use App\Http\Controllers\Controller;
use App\Http\Requests\Directory\NearbyDoctorsRequest;
use App\Services\DirectoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class DirectoryController extends Controller
{
    public function __construct(
        private readonly DirectoryService $directoryService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $result = $this->directoryService->listAllDoctors(
            perPage: (int) $request->input('per_page', DirectoryService::DEFAULT_LIMIT),
            search: $request->input('search'),
            specialtyId: $request->input('specialty_id'),
        );

        return response()->json([
            'status'  => 'success',
            'message' => 'Directorio obtenido correctamente.',
            'data'    => [
                'doctors'    => $result['data'],
                'pagination' => $result['pagination'],
            ],
        ], 200);
    }

    public function nearby(NearbyDoctorsRequest $request): JsonResponse
    {
        $results = $this->directoryService->findNearbyDoctors(
            lat: (float) $request->input('lat'),
            lng: (float) $request->input('lng'),
            radiusM: (int) $request->input('radius', DirectoryService::DEFAULT_RADIUS_M),
            specialtyId: $request->input('specialty_id'),
            limit: (int) $request->input('limit', DirectoryService::DEFAULT_LIMIT),
        );

        return response()->json([
            'status'  => 'success',
            'message' => 'Directorio obtenido correctamente.',
            'data'    => [
                'doctors' => $results,
                'meta'    => [
                    'count'    => $results->count(),
                    'lat'      => (float) $request->input('lat'),
                    'lng'      => (float) $request->input('lng'),
                    'radius_m' => (int) $request->input('radius', DirectoryService::DEFAULT_RADIUS_M),
                ],
            ],
        ], 200);
    }
}
