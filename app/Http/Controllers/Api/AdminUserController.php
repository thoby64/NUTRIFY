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

class AdminUserController extends Controller
{
    private const ROLES = ['admin', 'manager', 'nutritionist'];

    public function index(Request $request): JsonResponse
    {
        $query = User::query();
        if ($role = $request->query('role')) {
            $query->where('role', strtoupper((string) $role));
        }
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
        $users = $query->orderBy('created_at', 'desc')
            ->offset((int) $request->query('skip', 0))
            ->limit(min((int) $request->query('limit', 10), 100))
            ->get()
            ->map(fn (User $user) => $this->serializeUser($user));

        return response()->json([
            'total' => $total,
            'skip' => (int) $request->query('skip', 0),
            'limit' => min((int) $request->query('limit', 10), 100),
            'users' => $users,
        ]);
    }

    public function show(int $userId): JsonResponse
    {
        $user = User::query()->find($userId);
        if (! $user) {
            return response()->json(['detail' => 'User not found'], 404);
        }

        return response()->json($this->serializeUser($user));
    }

    public function hasData(int $userId): JsonResponse
    {
        $user = User::query()->find($userId);
        if (! $user) {
            return response()->json(['detail' => 'User not found'], 404);
        }

        $planIds = PlanningPlan::query()
            ->where('created_by_id', $userId)
            ->orWhere('assigned_nutritionist_id', $userId)
            ->pluck('id');

        $mealIds = PlanningPlanMeal::query()
            ->whereHas('day', fn ($query) => $query->whereIn('plan_id', $planIds))
            ->pluck('id');

        return response()->json([
            'user_id' => $user->id,
            'username' => $user->username,
            'has_data' => $planIds->isNotEmpty() || $mealIds->isNotEmpty(),
            'plan_count' => $planIds->count(),
            'meal_count' => $mealIds->count(),
            'meal_food_count' => PlanningMealFood::query()->whereIn('meal_id', $mealIds)->count(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'username' => ['required', 'string', 'min:3', 'max:50', 'unique:users,username'],
            'email' => ['required', 'email', 'max:100', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'full_name' => ['nullable', 'string', 'max:100'],
            'role' => ['required', Rule::in(self::ROLES)],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if ($validator->fails()) {
            return response()->json(['detail' => $validator->errors()->first()], $this->validationStatus($validator->errors()->first()));
        }

        $user = User::query()->create([
            'username' => $request->string('username'),
            'email' => $request->string('email'),
            'password_hash' => Hash::make((string) $request->input('password')),
            'full_name' => $request->input('full_name'),
            'role' => strtoupper((string) $request->input('role')),
            'is_active' => $request->boolean('is_active', true),
            'created_by_id' => Auth::id(),
        ]);

        return response()->json($this->serializeUser($user), 201);
    }

    public function update(Request $request, int $userId): JsonResponse
    {
        $user = User::query()->find($userId);
        if (! $user) {
            return response()->json(['detail' => 'User not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'username' => ['sometimes', 'string', 'min:3', 'max:50', Rule::unique('users', 'username')->ignore($userId)],
            'email' => ['sometimes', 'email', 'max:100', Rule::unique('users', 'email')->ignore($userId)],
            'full_name' => ['sometimes', 'nullable', 'string', 'max:100'],
            'role' => ['sometimes', Rule::in(self::ROLES)],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if ($validator->fails()) {
            return response()->json(['detail' => $validator->errors()->first()], $this->validationStatus($validator->errors()->first()));
        }

        if ($request->has('username')) {
            $user->username = (string) $request->input('username');
        }
        if ($request->has('email')) {
            $user->email = (string) $request->input('email');
        }
        if ($request->has('full_name')) {
            $user->full_name = $request->input('full_name');
        }
        if ($request->has('role')) {
            $user->role = strtoupper((string) $request->input('role'));
        }
        if ($request->has('is_active')) {
            $user->is_active = $request->boolean('is_active');
        }

        $user->save();

        return response()->json($this->serializeUser($user->fresh()));
    }

    public function destroy(int $userId): JsonResponse
    {
        $user = User::query()->find($userId);
        if (! $user) {
            return response()->json(['detail' => 'User not found'], 404);
        }
        if (Auth::id() === $user->id) {
            return response()->json(['detail' => 'Cannot delete yourself'], 400);
        }

        $user->delete();

        return response()->json(null, 204);
    }

    public function resetPassword(Request $request, int $userId): JsonResponse
    {
        $user = User::query()->find($userId);
        if (! $user) {
            return response()->json(['detail' => 'User not found'], 404);
        }
        if (Auth::id() === $user->id) {
            return response()->json(['detail' => 'Use the change password endpoint for your own password'], 400);
        }

        $validator = Validator::make($request->all(), [
            'new_password' => ['required', 'string', 'min:8'],
        ]);

        if ($validator->fails()) {
            return response()->json(['detail' => $validator->errors()->first()], 422);
        }

        $user->forceFill(['password_hash' => Hash::make((string) $request->input('new_password'))])->save();

        return response()->json(['message' => 'Password reset successfully']);
    }

    public function deactivate(int $userId): JsonResponse
    {
        $user = User::query()->find($userId);
        if (!$user) {
            return response()->json(['detail' => 'User not found'], 404);
        }
        if (Auth::id() === $user->id) {
            return response()->json(['detail' => 'Cannot deactivate yourself'], 400);
        }

        $user->is_active = false;
        $user->save();

        return response()->json(['message' => 'User deactivated successfully', 'user' => $this->serializeUser($user)]);
    }

    private function serializeUser(User $user): array
    {
        return [
            'id' => $user->id,
            'username' => $user->username,
            'email' => $user->email,
            'full_name' => $user->full_name,
            'role' => $user->roleValue(),
            'is_active' => $user->is_active,
            'created_at' => optional($user->created_at)->toISOString(),
            'last_login' => optional($user->last_login)->toISOString(),
            'updated_at' => optional($user->updated_at)->toISOString(),
            'created_by_id' => $user->created_by_id,
        ];
    }

    private function validationStatus(string $message): int
    {
        return str_contains(strtolower($message), 'already been taken') ? 409 : 422;
    }
}
