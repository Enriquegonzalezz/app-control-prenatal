<?php

namespace App\Http\Controllers;

use App\Models\HealthTip;
use Illuminate\Http\JsonResponse;

class HealthTipController extends Controller
{
    public function index(): JsonResponse
    {
        $tips = HealthTip::active()
            ->orderBy('display_order')
            ->get();

        return response()->json(['data' => $tips]);
    }

    public function weeklyTip(): JsonResponse
    {
        $weekNumber = (int) now()->format('W');
        $totalTips  = HealthTip::active()->count();

        if ($totalTips === 0) {
            return response()->json(['data' => null], 404);
        }

        $tipIndex = ($weekNumber - 1) % $totalTips;
        $tip = HealthTip::active()
            ->orderBy('display_order')
            ->skip($tipIndex)
            ->first();

        return response()->json(['data' => $tip]);
    }
}
