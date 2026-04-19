<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // Supabase — usado para llamar a Edge Functions desde Laravel
    'supabase' => [
        'url' => env('SUPABASE_URL'),
        'key' => env('SUPABASE_SERVICE_KEY', env('SUPABASE_KEY')), // service_role key
    ],

    // Firebase / FCM v1 HTTP API
    // Las credenciales viven como Supabase Secret (FIREBASE_CREDENTIALS_JSON).
    // Laravel NO necesita esta clave; solo se configura en Supabase Dashboard:
    //   supabase secrets set FIREBASE_CREDENTIALS_JSON='{"type":"service_account",...}'
    'firebase' => [
        'credentials_json' => env('FIREBASE_CREDENTIALS_JSON'), // solo para fallback local
    ],

];
