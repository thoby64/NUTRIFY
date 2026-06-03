<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\AdminDataController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\ManagerController;
use App\Http\Controllers\Api\PlanningController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::prefix('auth')->group(function (): void {
        Route::post('/login', [AuthController::class, 'login']);
        Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
        Route::post('/check-email-exists', [AuthController::class, 'checkEmailExists']);
        Route::post('/reset-password', [AuthController::class, 'resetPassword']);
        Route::get('/verify', [AuthController::class, 'verify']);
        Route::middleware('role:admin,manager,nutritionist')->get('/me', [AuthController::class, 'me']);
        Route::middleware('role:admin,manager,nutritionist')->post('/change-password', [AuthController::class, 'changePassword']);
        Route::middleware('role:admin,manager,nutritionist')->get('/profile', [AuthController::class, 'profile']);
        Route::middleware('role:admin,manager,nutritionist')->put('/profile', [AuthController::class, 'updateProfile']);
    });

    Route::post('/api/v1/auth/reset-password', [AuthController::class, 'resetPassword']);

    Route::get('/health', fn () => ['status' => 'ok', 'message' => 'Nutrition Analytics API is running']);

    Route::middleware('role:admin,manager,nutritionist')->group(function (): void {
        Route::get('/food-groups', [CatalogController::class, 'foodGroups']);
        Route::get('/nutrient-types', [CatalogController::class, 'nutrientTypes']);
        Route::post('/foods/search', [CatalogController::class, 'searchFoods']);
        Route::get('/foods', [CatalogController::class, 'foods']);
        Route::get('/foods/{food}', [CatalogController::class, 'foodDetails']);
        Route::get('/nutrients', [CatalogController::class, 'nutrients']);
        Route::get('/food-nutrients', [CatalogController::class, 'foodNutrients']);
        Route::get('/dashboard/stats', [CatalogController::class, 'dashboardStats']);
        Route::get('/plans', [PlanningController::class, 'plans']);
    });

    Route::middleware('role:admin')->group(function (): void {
        Route::post('/import-csv', [AdminDataController::class, 'importCsv']);
        Route::post('/import-sql', [AdminDataController::class, 'importSql']);
        Route::get('/export-excel', [AdminDataController::class, 'exportExcel']);
        Route::get('/export-sql', [AdminDataController::class, 'exportSql']);
        Route::post('/reset-database', [AdminDataController::class, 'resetDatabase']);
    });

    Route::middleware('role:admin')->prefix('admin')->group(function (): void {
        Route::get('/users', [AdminUserController::class, 'index']);
        Route::post('/users', [AdminUserController::class, 'store']);
        Route::get('/users/{user}', [AdminUserController::class, 'show']);
        Route::get('/users/{user}/has-data', [AdminUserController::class, 'hasData']);
        Route::put('/users/{user}', [AdminUserController::class, 'update']);
        Route::delete('/users/{user}', [AdminUserController::class, 'destroy']);
        Route::post('/users/{user}/reset-password', [AdminUserController::class, 'resetPassword']);
        Route::patch('/users/{user}/deactivate', [AdminUserController::class, 'deactivate']);
    });

    Route::middleware('role:manager')->prefix('manager')->group(function (): void {
        Route::get('/nutritionists', [ManagerController::class, 'nutritionists']);
        Route::post('/nutritionists', [ManagerController::class, 'storeNutritionist']);
        Route::get('/nutritionists/{nutritionist}', [ManagerController::class, 'showNutritionist']);
        Route::get('/nutritionists/{nutritionist}/has-data', [ManagerController::class, 'nutritionistHasData']);
        Route::put('/nutritionists/{nutritionist}', [ManagerController::class, 'updateNutritionist']);
        Route::delete('/nutritionists/{nutritionist}', [ManagerController::class, 'destroyNutritionist']);
        Route::patch('/nutritionists/{nutritionist}/deactivate', [ManagerController::class, 'deactivateNutritionist']);
        Route::get('/analytics', [ManagerController::class, 'analytics']);
        Route::get('/analytics/nutritionist/{nutritionist}', [ManagerController::class, 'nutritionistAnalytics']);
    });
});

foreach (['plan', 'day', 'meal', 'mealFood', 'rule', 'target'] as $planningRouteParameter) {
    Route::pattern($planningRouteParameter, '[0-9]+');
}

Route::prefix('v2/planning')->middleware('role:admin,manager,nutritionist')->group(function (): void {
    Route::get('/meta', [PlanningController::class, 'meta']);
    Route::get('/clients', [PlanningController::class, 'clients']);
    Route::post('/clients', [PlanningController::class, 'createClient']);
    Route::get('/catalog/foods', [PlanningController::class, 'catalogFoods']);
    Route::get('/plans', [PlanningController::class, 'plans']);
    Route::post('/plans', [PlanningController::class, 'createPlan']);
    Route::get('/plans/{plan}', [PlanningController::class, 'showPlan']);
    Route::patch('/plans/{plan}', [PlanningController::class, 'updatePlan']);
    Route::post('/plans/{plan}/clone', [PlanningController::class, 'clonePlan']);
    Route::post('/plans/{plan}/days', [PlanningController::class, 'addDay']);
    Route::get('/plans/{plan}/report', [PlanningController::class, 'report']);
    Route::get('/plans/{plan}/report-pdf', [PlanningController::class, 'downloadPdf']);
    Route::post('/plans/{plan}/versions/finalize', [PlanningController::class, 'finalize']);
    Route::post('/plans/{plan}/rules', [PlanningController::class, 'addPlanRule']);
    Route::post('/plans/{plan}/targets', [PlanningController::class, 'addPlanTarget']);
    Route::patch('/days/{day}', [PlanningController::class, 'updateDay']);
    Route::delete('/days/{day}', [PlanningController::class, 'deleteDay']);
    Route::post('/days/{day}/duplicate', [PlanningController::class, 'duplicateDay']);
    Route::post('/days/{day}/meals', [PlanningController::class, 'addMeal']);
    Route::post('/days/{day}/rules', [PlanningController::class, 'addDayRule']);
    Route::post('/days/{day}/targets', [PlanningController::class, 'addDayTarget']);
    Route::patch('/meals/{meal}', [PlanningController::class, 'updateMeal']);
    Route::delete('/meals/{meal}', [PlanningController::class, 'deleteMeal']);
    Route::post('/meals/{meal}/foods', [PlanningController::class, 'addFood']);
    Route::post('/meals/{meal}/custom-foods', [PlanningController::class, 'addCustomFood']);
    Route::post('/meals/{meal}/rules', [PlanningController::class, 'addMealRule']);
    Route::post('/meals/{meal}/targets', [PlanningController::class, 'addMealTarget']);
    Route::patch('/meal-foods/{mealFood}', [PlanningController::class, 'updateMealFood']);
    Route::delete('/meal-foods/{mealFood}', [PlanningController::class, 'deleteMealFood']);
    Route::get('/meal-foods/{mealFood}/suggestions', [PlanningController::class, 'suggestions']);
    Route::post('/meal-foods/{mealFood}/replace', [PlanningController::class, 'replaceMealFood']);
    Route::patch('/rules/{rule}', [PlanningController::class, 'updateRule']);
    Route::delete('/rules/{rule}', [PlanningController::class, 'deleteRule']);
    Route::patch('/targets/{target}', [PlanningController::class, 'updateTarget']);
    Route::delete('/targets/{target}', [PlanningController::class, 'deleteTarget']);
});
