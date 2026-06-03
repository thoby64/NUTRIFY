<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlanningMealFood;
use App\Models\PlanningPlan;
use App\Models\PlanningPlanMeal;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class ManagerController extends Controller
{
    public function nutritionists(Request $request): JsonResponse
    {
        $query = User::query()->where('role', 'NUTRITIONIST');
        if (! filter_var($request->query('include_inactive', false), FILTER_VALIDATE_BOOLEAN)) {
            $query->where('is_active', true);
        }
        if ($search = $request->query('search')) {
            $query->where(function ($query) use ($search): void {
                $query->where('username', 'ilike', "%{$search}%")
                    ->orWhere('email', 'ilike', "%{$search}%")
                    ->orWhere('full_name', 'ilike', "%{$search}%");
            });
        }

        $total = (clone $query)->count();
        $nutritionists = $query->orderBy('created_at', 'desc')
            ->offset((int) $request->query('skip', 0))
            ->limit(min((int) $request->query('limit', 10), 100))
            ->get()
            ->map(fn (User $user) => [
                'id' => $user->id,
                'username' => $user->username,
                'email' => $user->email,
                'full_name' => $user->full_name,
                'is_active' => $user->is_active,
                'created_at' => optional($user->created_at)->toISOString(),
                'last_login' => optional($user->last_login)->toISOString(),
                'updated_at' => optional($user->updated_at)->toISOString(),
            ]);

        return response()->json([
            'total' => $total,
            'skip' => (int) $request->query('skip', 0),
            'limit' => min((int) $request->query('limit', 10), 100),
            'nutritionists' => $nutritionists,
        ]);
    }

    public function showNutritionist(int $nutritionistId): JsonResponse
    {
        $nutritionist = User::query()->where('role', 'NUTRITIONIST')->find($nutritionistId);
        if (! $nutritionist) {
            return response()->json(['detail' => 'Nutritionist not found'], 404);
        }

        return response()->json($this->serializeNutritionist($nutritionist));
    }

    public function storeNutritionist(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'username' => ['required', 'string', 'min:3', 'max:50', 'unique:users,username'],
            'email' => ['required', 'email', 'max:100', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'full_name' => ['nullable', 'string', 'max:100'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if ($validator->fails()) {
            return response()->json(['detail' => $validator->errors()->first()], $this->validationStatus($validator->errors()->first()));
        }

        $nutritionist = User::query()->create([
            'username' => (string) $request->input('username'),
            'email' => (string) $request->input('email'),
            'password_hash' => Hash::make((string) $request->input('password')),
            'full_name' => $request->input('full_name'),
            'role' => 'NUTRITIONIST',
            'is_active' => $request->boolean('is_active', true),
            'created_by_id' => Auth::id(),
        ]);

        return response()->json($this->serializeNutritionist($nutritionist), 201);
    }

    public function updateNutritionist(Request $request, int $nutritionistId): JsonResponse
    {
        $nutritionist = User::query()->where('role', 'NUTRITIONIST')->find($nutritionistId);
        if (! $nutritionist) {
            return response()->json(['detail' => 'Nutritionist not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'username' => ['sometimes', 'string', 'min:3', 'max:50', Rule::unique('users', 'username')->ignore($nutritionistId)],
            'email' => ['sometimes', 'email', 'max:100', Rule::unique('users', 'email')->ignore($nutritionistId)],
            'full_name' => ['sometimes', 'nullable', 'string', 'max:100'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if ($validator->fails()) {
            return response()->json(['detail' => $validator->errors()->first()], $this->validationStatus($validator->errors()->first()));
        }

        if ($request->has('username')) {
            $nutritionist->username = (string) $request->input('username');
        }
        if ($request->has('email')) {
            $nutritionist->email = (string) $request->input('email');
        }
        if ($request->has('full_name')) {
            $nutritionist->full_name = $request->input('full_name');
        }
        if ($request->has('is_active')) {
            $nutritionist->is_active = $request->boolean('is_active');
        }

        $nutritionist->save();

        return response()->json($this->serializeNutritionist($nutritionist->fresh()));
    }

    public function destroyNutritionist(int $nutritionistId): JsonResponse
    {
        $nutritionist = User::query()->where('role', 'NUTRITIONIST')->find($nutritionistId);
        if (! $nutritionist) {
            return response()->json(['detail' => 'Nutritionist not found'], 404);
        }

        $nutritionist->delete();

        return response()->json(null, 204);
    }

    public function deactivateNutritionist(int $nutritionistId): JsonResponse
    {
        $nutritionist = User::query()->where('role', 'NUTRITIONIST')->find($nutritionistId);
        if (!$nutritionist) {
            return response()->json(['detail' => 'Nutritionist not found'], 404);
        }
        if (Auth::id() === $nutritionist->id) {
            return response()->json(['detail' => 'Cannot deactivate yourself'], 400);
        }

        $nutritionist->is_active = false;
        $nutritionist->save();

        return response()->json(['message' => 'Nutritionist deactivated successfully', 'nutritionist' => $this->serializeNutritionist($nutritionist)]);
    }

    public function nutritionistHasData(int $nutritionistId): JsonResponse
    {
        $nutritionist = User::query()->where('role', 'NUTRITIONIST')->find($nutritionistId);
        if (! $nutritionist) {
            return response()->json(['detail' => 'Nutritionist not found'], 404);
        }

        $analytics = $this->analyticsForUser($nutritionistId);

        return response()->json([
            'user_id' => $nutritionist->id,
            'username' => $nutritionist->username,
            'has_data' => ($analytics['total_plans'] + $analytics['total_meals'] + $analytics['total_foods_used']) > 0,
            'plan_count' => $analytics['total_plans'],
            'meal_count' => $analytics['total_meals'],
            'meal_food_count' => $analytics['total_foods_used'],
        ]);
    }

    public function analytics(): JsonResponse
    {
        $analytics = $this->analyticsForUser((int) Auth::id());

        return response()->json([
            'total_plans_created' => $analytics['total_plans'],
            'total_meals_created' => $analytics['total_meals'],
            'total_foods_used' => $analytics['total_foods_used'],
        ]);
    }

    public function nutritionistAnalytics(int $nutritionistId): JsonResponse
    {
        $nutritionist = User::query()->where('role', 'NUTRITIONIST')->find($nutritionistId);
        if (! $nutritionist) {
            return response()->json(['detail' => 'Nutritionist not found'], 404);
        }

        $analytics = $this->analyticsForUser($nutritionistId);

        return response()->json([
            'nutritionist_username' => $nutritionist->username,
            'nutritionist_id' => $nutritionist->id,
            'total_plans' => $analytics['total_plans'],
            'total_meals' => $analytics['total_meals'],
            'total_foods_used' => $analytics['total_foods_used'],
            'average_foods_per_meal' => $analytics['total_meals'] > 0
                ? round($analytics['total_foods_used'] / $analytics['total_meals'], 2)
                : 0,
        ]);
    }

    private function serializeNutritionist(User $user): array
    {
        return [
            'id' => $user->id,
            'username' => $user->username,
            'email' => $user->email,
            'full_name' => $user->full_name,
            'is_active' => $user->is_active,
            'created_at' => optional($user->created_at)->toISOString(),
            'last_login' => optional($user->last_login)->toISOString(),
            'updated_at' => optional($user->updated_at)->toISOString(),
            'created_by_id' => $user->created_by_id,
        ];
    }

    private function analyticsForUser(int $userId): array
    {
        $planIds = PlanningPlan::query()
            ->where('created_by_id', $userId)
            ->orWhere('assigned_nutritionist_id', $userId)
            ->pluck('id');

        $mealIds = PlanningPlanMeal::query()
            ->whereHas('day', fn ($query) => $query->whereIn('plan_id', $planIds))
            ->pluck('id');

        return [
            'total_plans' => $planIds->count(),
            'total_meals' => $mealIds->count(),
            'total_foods_used' => PlanningMealFood::query()->whereIn('meal_id', $mealIds)->count(),
        ];
    }

    private function validationStatus(string $message): int
    {
        return str_contains(strtolower($message), 'already been taken') ? 409 : 422;
    }
}
