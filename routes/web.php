<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;

Route::get('/', function () {
    return view('landing');
});

Route::get('/login', fn () => view('auth.login'));
Route::get('/forgot-password', fn () => view('auth.forgot-password'));
Route::get('/reset-password', fn () => view('auth.reset-password'));

Route::get('/templates/{filename}', function (string $filename) {
    abort_unless(Str::endsWith(Str::lower($filename), '.csv'), 400);
    abort_if(str_contains($filename, '/') || str_contains($filename, '\\'), 403);

    $path = public_path('templates/'.$filename);
    abort_unless(is_file($path), 404);

    return response()->download($path, $filename, ['Content-Type' => 'text/csv']);
});

function renderRolePage(string $role, ?string $page = null, ?int $id = null) {
    $pagesByRole = [
        'admin' => [
            'index',
            'foods',
            'food-groups',
            'nutrients',
            'nutrient-types',
            'meal-planning',
            'meal-plans',
            'plan-workspace',
            'users',
            'users-create',
            'users-edit',
            'import',
            'profile',
        ],
        'manager' => [
            'index',
            'foods',
            'food-groups',
            'nutrients',
            'nutrient-types',
            'meal-planning',
            'meal-plans',
            'plan-workspace',
            'nutritionists',
            'nutritionists-create',
            'nutritionists-edit',
            'analytics',
            'profile',
        ],
        'nutritionist' => [
            'index',
            'foods',
            'nutrients',
            'meal-planning',
            'meal-plans',
            'plan-workspace',
            'profile',
        ],
    ];

    abort_unless(array_key_exists($role, $pagesByRole), 404);

    $page = $page ?: 'index';
    abort_unless(in_array($page, $pagesByRole[$role], true), 404);

    return view($role.'.'.$page, ['resourceId' => $id]);
}

// Admin routes
Route::get('/admin', fn () => renderRolePage('admin'));
Route::get('/admin/users/create', fn () => renderRolePage('admin', 'users-create'));
Route::get('/admin/users/{id}/edit', fn (int $id) => renderRolePage('admin', 'users-edit', $id));
Route::get('/admin/{page}', fn (string $page) => renderRolePage('admin', $page));

// Manager routes
Route::get('/manager', fn () => renderRolePage('manager'));
Route::get('/manager/nutritionists/create', fn () => renderRolePage('manager', 'nutritionists-create'));
Route::get('/manager/nutritionists/{id}/edit', fn (int $id) => renderRolePage('manager', 'nutritionists-edit', $id));
Route::get('/manager/{page}', fn (string $page) => renderRolePage('manager', $page));

// Nutritionist routes
Route::get('/nutritionist', fn () => renderRolePage('nutritionist'));
Route::get('/nutritionist/{page}', fn (string $page) => renderRolePage('nutritionist', $page));
