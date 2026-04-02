<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

final class TestSupabaseConnection extends Command
{
    protected $signature = 'supabase:test';

    protected $description = 'Test connection to Supabase database';

    public function handle(): int
    {
        try {
            $this->info('Testing Supabase connection...');
            
            DB::connection('pgsql')->getPdo();
            
            $this->info('✅ Connection successful!');
            
            $result = DB::select('SELECT 1');
            $this->info('✅ Query executed successfully!');
            
            return 0;
        } catch (\Exception $e) {
            $this->error('❌ Connection failed: ' . $e->getMessage());
            return 1;
        }
    }
}
