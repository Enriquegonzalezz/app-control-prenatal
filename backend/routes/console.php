<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Agenda indefinida: cada día extiende los slots de los horarios con auto_extend.
Schedule::command('slots:extend')
    ->dailyAt('03:00')
    ->withoutOverlapping()
    ->runInBackground();
