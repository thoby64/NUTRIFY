<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@nutriqube.com'],
            [
                'username' => 'admin',
                'password_hash' => password_hash('admin123', PASSWORD_ARGON2ID),
                'full_name' => 'Nutriqube Administrator',
                'role' => 'ADMIN',
                'is_active' => true,
            ]
        );
    }
}
