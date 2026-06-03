<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClientPlanningProfile;
use App\Models\Food;
use App\Models\FoodNutrient;
use App\Models\Nutrient;
use App\Models\PlanningClient;
use App\Models\PlanningMealFood;
use App\Models\PlanningNutrientTarget;
use App\Models\PlanningPlan;
use App\Models\PlanningPlanDay;
use App\Models\PlanningPlanMeal;
use App\Models\PlanningPlanVersion;
use App\Models\PlanningRule;
use App\Models\User;
use App\Services\Planning\ConditionParser;
use App\Services\Planning\PlanningSubstitution;
use App\Services\Planning\PlanningValidation;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Mpdf\Mpdf;

class PlanningController extends Controller
{
    private const KEY_NUTRIENTS = [
        ['code' => 'ENERGY_KC', 'label' => 'Energy', 'unit' => 'kcal'],
        ['code' => 'PROCNT', 'label' => 'Protein', 'unit' => 'g'],
        ['code' => 'FAT', 'label' => 'Fat', 'unit' => 'g'],
        ['code' => 'CHOCDF', 'label' => 'Carbohydrates', 'unit' => 'g'],
        ['code' => 'FIBTG', 'label' => 'Fiber', 'unit' => 'g'],
    ];

    private const DEFAULT_MEAL_TEMPLATES = [
        ['meal_name' => 'Breakfast', 'meal_type' => 'breakfast', 'meal_time' => '07:00'],
        ['meal_name' => 'Morning Snack', 'meal_type' => 'snack', 'meal_time' => '10:00'],
        ['meal_name' => 'Lunch', 'meal_type' => 'lunch', 'meal_time' => '13:00'],
        ['meal_name' => 'Afternoon Snack', 'meal_type' => 'snack', 'meal_time' => '16:00'],
        ['meal_name' => 'Dinner', 'meal_type' => 'dinner', 'meal_time' => '19:00'],
    ];

    private const RULE_TYPES = ['clinical', 'allergy', 'preference', 'timing', 'budget', 'texture', 'ingredient', 'hydration', 'supplement'];
    private const RULE_SEVERITIES = ['hard', 'soft', 'info'];

    public function meta(): JsonResponse
    {
        return response()->json([
            'plan_types' => [
                ['value' => 'multi_day', 'label' => 'Dated multi-day plan'],
                ['value' => 'weekly_cycle', 'label' => 'Weekly cycle plan'],
                ['value' => 'template', 'label' => 'Reusable template'],
            ],
            'plan_statuses' => [
                ['value' => 'draft', 'label' => 'Draft'],
                ['value' => 'review', 'label' => 'In review'],
                ['value' => 'finalized', 'label' => 'Finalized'],
                ['value' => 'archived', 'label' => 'Archived'],
            ],
            'privacy_principles' => [
                'Use client codes and display labels in routine planning screens',
                'Store only derived planning-safe profile details in the planner foundation',
                'Keep deep personal identity data outside the core planning workflow',
            ],
            'key_nutrients' => self::KEY_NUTRIENTS,
            'nutrient_catalog' => Nutrient::query()->orderBy('name')->get()->map(fn (Nutrient $nutrient) => [
                'code' => $nutrient->name,
                'label' => $nutrient->abbreviation ?: $nutrient->name,
                'unit' => $nutrient->unit ?: '',
            ])->values(),
            'condition_aliases' => $this->conditionParser()->aliasReference(),
            'default_meal_templates' => self::DEFAULT_MEAL_TEMPLATES,
            'rule_types' => self::RULE_TYPES,
            'rule_severities' => self::RULE_SEVERITIES,
        ]);
    }

    public function clients(Request $request): JsonResponse
    {
        $currentUser = $this->currentUser($request);
        $query = PlanningClient::query()->with(['planningProfile', 'assignedNutritionist']);
        $this->restrictClientsForUser($query, $currentUser);

        if ($search = $request->query('search')) {
            $query->where(function (Builder $query) use ($search): void {
                $query->where('client_code', 'ilike', "%{$search}%")
                    ->orWhere('display_label', 'ilike', "%{$search}%");
            });
        }

        $clients = $query->orderBy('created_at', 'desc')->get()->map(fn (PlanningClient $client) => $this->serializeClient($client));

        return response()->json(['data' => $clients, 'total' => $clients->count()]);
    }

    public function createClient(Request $request): JsonResponse
    {
        $currentUser = $this->currentUser($request);
        $validator = Validator::make($request->all(), [
            'client_code' => ['required', 'string', 'min:2', 'max:100'],
            'display_label' => ['required', 'string', 'max:255'],
            'privacy_tier' => ['sometimes', 'nullable', 'string', 'max:50'],
            'assigned_nutritionist_id' => ['sometimes', 'nullable', 'integer'],
            'status' => ['sometimes', 'nullable', 'string', 'max:50'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'profile' => ['sometimes', 'array'],
        ]);

        if ($validator->fails()) {
            return response()->json(['detail' => $validator->errors()->first()], 422);
        }
        $existing = PlanningClient::query()
            ->whereRaw('lower(client_code) = lower(?)', [(string) $request->input('client_code')])
            ->first();
        if ($existing) {
            return response()->json(['detail' => 'Client code already exists'], 409);
        }

        $assignedNutritionistId = $currentUser->roleValue() === 'nutritionist'
            ? $currentUser->id
            : $request->input('assigned_nutritionist_id');

        if ($assignedNutritionistId && ! User::query()->where('role', 'NUTRITIONIST')->where('id', $assignedNutritionistId)->exists()) {
            return response()->json(['detail' => 'Assigned nutritionist not found'], 404);
        }

        $client = DB::transaction(function () use ($request, $currentUser, $assignedNutritionistId): PlanningClient {
            $client = PlanningClient::query()->create([
                'client_code' => (string) $request->input('client_code'),
                'display_label' => (string) $request->input('display_label'),
                'privacy_tier' => $request->input('privacy_tier') ?: 'standard',
                'assigned_nutritionist_id' => $assignedNutritionistId,
                'created_by_id' => $currentUser->id,
                'status' => $request->input('status') ?: 'active',
                'notes' => $request->input('notes'),
            ]);

            $profile = $request->input('profile', []);
            if (is_array($profile) && $profile) {
                ClientPlanningProfile::query()->create(array_merge(['client_id' => $client->id], $this->profilePayload($profile)));
            }

            return $client;
        });

        return response()->json($this->serializeClient($client->load(['planningProfile', 'assignedNutritionist'])), 201);
    }

    public function plans(Request $request): JsonResponse
    {
        $currentUser = $this->currentUser($request);
        $query = PlanningPlan::query()->with($this->planRelations());
        $this->restrictPlansForUser($query, $currentUser);

        // Handle role-based filters
        if ($currentUser->roleValue() !== 'nutritionist') {
            // Admin and Manager can filter by created_by_id or assigned_nutritionist_id
            if ($filterType = $request->query('filter_type')) {
                if ($filterType === 'own') {
                    $query->where('created_by_id', $currentUser->id);
                } elseif ($filterType === 'nutritionists') {
                    $query->whereNotNull('assigned_nutritionist_id');
                }
            }
            
            if ($createdById = $request->query('created_by_id')) {
                $query->where('created_by_id', (int) $createdById);
            }
            
            if ($assignedNutritionistId = $request->query('assigned_nutritionist_id')) {
                $query->where('assigned_nutritionist_id', (int) $assignedNutritionistId);
            }
            
            if ($search = $request->query('search_user')) {
                $userIds = User::query()
                    ->where('role', 'NUTRITIONIST')
                    ->where(function (Builder $q) use ($search): void {
                        $q->where('username', 'ilike', "%{$search}%")
                            ->orWhere('email', 'ilike', "%{$search}%");
                    })
                    ->pluck('id');
                
                $query->where(function (Builder $q) use ($userIds, $currentUser): void {
                    $q->whereIn('assigned_nutritionist_id', $userIds)
                        ->orWhereIn('created_by_id', $userIds);
                });
            }
        }
        
        // Date range filters for all users
        if ($dateFrom = $request->query('date_from')) {
            $query->where('start_date', '>=', (string) $dateFrom);
        }
        if ($dateTo = $request->query('date_to')) {
            $query->where('start_date', '<=', (string) $dateTo);
        }

        if ($status = $request->query('status')) {
            $query->where('status', strtoupper((string) $status));
        }
        if ($search = $request->query('search')) {
            $query->where('title', 'ilike', "%{$search}%");
        }

        $plans = $query->orderBy('created_at', 'desc')->get()->map(fn (PlanningPlan $plan) => $this->serializePlan($plan));

        return response()->json(['data' => $plans, 'total' => $plans->count()]);
    }

    public function createPlan(Request $request): JsonResponse
    {
        $currentUser = $this->currentUser($request);
        $validator = Validator::make($request->all(), [
            'title' => ['required', 'string', 'max:255'],
            'client_id' => ['sometimes', 'nullable', 'integer'],
            'plan_type' => ['sometimes', 'string', 'in:multi_day,weekly_cycle,template'],
            'start_date' => ['sometimes', 'nullable', 'date'],
            'days_count' => ['sometimes', 'integer', 'min:1', 'max:90'],
            'cycle_length' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:90'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'use_default_meal_template' => ['sometimes', 'boolean'],
            'default_meals' => ['sometimes', 'array'],
        ]);

        if ($validator->fails()) {
            return response()->json(['detail' => $validator->errors()->first()], 422);
        }

        $client = null;
        $assignedNutritionistId = $currentUser->roleValue() === 'nutritionist' ? $currentUser->id : null;
        if ($request->input('client_id')) {
            $client = $this->visibleClient((int) $request->input('client_id'), $currentUser);
            if (! $client) {
                return response()->json(['detail' => 'Planning client not found'], 404);
            }
            $assignedNutritionistId = $assignedNutritionistId ?: $client->assigned_nutritionist_id;
        }

        $defaultMeals = $request->input('default_meals');
        if (! is_array($defaultMeals) && $request->boolean('use_default_meal_template', true)) {
            $defaultMeals = self::DEFAULT_MEAL_TEMPLATES;
        }

        $plan = DB::transaction(function () use ($request, $currentUser, $assignedNutritionistId, $defaultMeals): PlanningPlan {
            $daysCount = (int) $request->input('days_count', 1);
            $startDate = $request->input('start_date') ? Carbon::parse($request->input('start_date')) : null;

            $plan = PlanningPlan::query()->create([
                'client_id' => $request->input('client_id'),
                'created_by_id' => $currentUser->id,
                'assigned_nutritionist_id' => $assignedNutritionistId,
                'title' => (string) $request->input('title'),
                'plan_type' => $this->enumValue((string) $request->input('plan_type', 'multi_day')),
                'start_date' => $startDate?->toDateString(),
                'days_count' => $daysCount,
                'cycle_length' => $request->input('cycle_length'),
                'notes' => $request->input('notes'),
                'status' => 'DRAFT',
            ]);

            for ($index = 1; $index <= $daysCount; $index++) {
                $date = $startDate ? $startDate->copy()->addDays($index - 1) : null;
                $day = PlanningPlanDay::query()->create([
                    'plan_id' => $plan->id,
                    'day_index' => $index,
                    'day_name' => $date ? $date->format('l') : "Day {$index}",
                    'actual_date' => $date?->toDateString(),
                ]);

                foreach (($defaultMeals ?: []) as $order => $meal) {
                    PlanningPlanMeal::query()->create([
                        'day_id' => $day->id,
                        'meal_name' => $meal['meal_name'] ?? 'Meal',
                        'meal_type' => $meal['meal_type'] ?? null,
                        'meal_time' => $meal['meal_time'] ?? null,
                        'meal_order' => $order + 1,
                    ]);
                }
            }

            return $plan;
        });

        return response()->json($this->serializePlan($this->loadPlan($plan->id), true, true));
    }

    public function showPlan(Request $request, int $planId): JsonResponse
    {
        $plan = $this->visiblePlan($planId, $this->currentUser($request));
        if (! $plan) {
            return response()->json(['detail' => 'Planning plan not found'], 404);
        }

        return response()->json($this->serializePlan($plan, true, true));
    }

    public function updatePlan(Request $request, int $planId): JsonResponse
    {
        $plan = $this->visiblePlan($planId, $this->currentUser($request));
        if (! $plan) {
            return response()->json(['detail' => 'Planning plan not found'], 404);
        }

        foreach (['title', 'cycle_length', 'notes'] as $field) {
            if ($request->has($field)) {
                $plan->{$field} = $request->input($field);
            }
        }
        if ($request->has('start_date')) {
            $plan->start_date = $request->input('start_date') ? Carbon::parse($request->input('start_date'))->toDateString() : null;
        }
        $plan->status = 'DRAFT';
        $plan->save();

        return response()->json($this->serializePlan($this->loadPlan($plan->id), true, true));
    }

    public function clonePlan(Request $request, int $planId): JsonResponse
    {
        $source = $this->visiblePlan($planId, $this->currentUser($request));
        if (! $source) {
            return response()->json(['detail' => 'Planning plan not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'client_id' => ['sometimes', 'nullable', 'integer'],
            'plan_type' => ['sometimes', 'string', 'in:multi_day,weekly_cycle,template'],
            'start_date' => ['sometimes', 'nullable', 'date'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'include_foods' => ['sometimes', 'boolean'],
        ]);

        if ($validator->fails()) {
            return response()->json(['detail' => $validator->errors()->first()], 422);
        }

        $currentUser = $this->currentUser($request);
        $clone = DB::transaction(function () use ($request, $source, $currentUser): PlanningPlan {
            $clientId = $request->has('client_id') ? $request->input('client_id') : $source->client_id;
            $newStartDate = $request->input('start_date') ? Carbon::parse($request->input('start_date')) : null;
            $sourceStartDate = $source->start_date ? Carbon::parse($source->start_date) : null;

            $clone = PlanningPlan::query()->create([
                'client_id' => $clientId,
                'created_by_id' => $currentUser->id,
                'assigned_nutritionist_id' => $currentUser->roleValue() === 'nutritionist' ? $currentUser->id : $source->assigned_nutritionist_id,
                'title' => $request->input('title') ?: "{$source->title} Copy",
                'plan_type' => $this->enumValue((string) $request->input('plan_type', strtolower((string) $source->plan_type))),
                'start_date' => $newStartDate?->toDateString() ?: optional($source->start_date)->toDateString(),
                'days_count' => $source->days_count,
                'cycle_length' => $source->cycle_length,
                'notes' => $request->has('notes') ? $request->input('notes') : $source->notes,
                'status' => 'DRAFT',
            ]);

            foreach ($source->rules as $rule) {
                PlanningRule::query()->create($this->cloneRulePayload($rule, ['plan_id' => $clone->id]));
            }
            foreach ($source->nutrientTargets as $target) {
                PlanningNutrientTarget::query()->create($this->cloneTargetPayload($target, ['plan_id' => $clone->id]));
            }

            foreach ($source->days->sortBy('day_index') as $day) {
                $actualDate = $day->actual_date;
                if ($newStartDate && $sourceStartDate && $day->actual_date) {
                    $actualDate = $newStartDate->copy()->addDays($sourceStartDate->diffInDays(Carbon::parse($day->actual_date)));
                }
                $clonedDay = PlanningPlanDay::query()->create([
                    'plan_id' => $clone->id,
                    'day_index' => $day->day_index,
                    'day_name' => $day->day_name,
                    'actual_date' => $actualDate ? Carbon::parse($actualDate)->toDateString() : null,
                    'template_group' => $day->template_group,
                    'notes' => $day->notes,
                ]);

                foreach ($day->rules as $rule) {
                    PlanningRule::query()->create($this->cloneRulePayload($rule, ['plan_id' => $clone->id, 'day_id' => $clonedDay->id]));
                }
                foreach ($day->nutrientTargets as $target) {
                    PlanningNutrientTarget::query()->create($this->cloneTargetPayload($target, ['plan_id' => $clone->id, 'day_id' => $clonedDay->id]));
                }

                foreach ($day->meals->sortBy('meal_order') as $meal) {
                    $clonedMeal = PlanningPlanMeal::query()->create([
                        'day_id' => $clonedDay->id,
                        'meal_name' => $meal->meal_name,
                        'meal_type' => $meal->meal_type,
                        'meal_time' => $meal->meal_time,
                        'meal_order' => $meal->meal_order,
                        'instructions' => $meal->instructions,
                        'target_notes' => $meal->target_notes,
                    ]);

                    foreach ($meal->rules as $rule) {
                        PlanningRule::query()->create($this->cloneRulePayload($rule, ['plan_id' => $clone->id, 'day_id' => $clonedDay->id, 'meal_id' => $clonedMeal->id]));
                    }
                    foreach ($meal->nutrientTargets as $target) {
                        PlanningNutrientTarget::query()->create($this->cloneTargetPayload($target, ['plan_id' => $clone->id, 'day_id' => $clonedDay->id, 'meal_id' => $clonedMeal->id]));
                    }

                    if ($request->boolean('include_foods', true)) {
                        foreach ($meal->foods->sortBy(['sort_order', 'id']) as $food) {
                            PlanningMealFood::query()->create($this->cloneMealFoodPayload($food, $clonedMeal->id));
                        }
                    }
                }
            }

            return $clone;
        });

        return response()->json($this->serializePlan($this->loadPlan($clone->id), true, true));
    }

    public function catalogFoods(Request $request): JsonResponse
    {
        $query = Food::query()->with(['foodGroup', 'nutrients.nutrient', 'nutrients.nutrientType']);
        $conditions = [];
        if ($request->query('conditions')) {
            try {
                $conditions = $this->conditionParser()->parse((string) $request->query('conditions'));
                $matchingFoodIds = $this->conditionParser()->matchingFoodIds($conditions, (string) $request->query('condition_mode', 'all'));
                $query->whereIn('id', $matchingFoodIds ?: [-1]);
            } catch (\InvalidArgumentException $error) {
                return response()->json(['detail' => $error->getMessage()], 400);
            }
        }
        if ($request->query('food_group_id')) {
            $query->where('food_group_id', (int) $request->query('food_group_id'));
        }
        if ($search = $request->query('search')) {
            $query->where('name', 'ilike', "%{$search}%");
        }

        $effectiveRules = [];
        $effectiveTargets = [];
        if ($request->query('meal_id')) {
            $meal = $this->visibleMeal((int) $request->query('meal_id'), $this->currentUser($request));
            if ($meal) {
                [$effectiveRules, $effectiveTargets] = $this->validation()->effectiveContext($this->loadPlan($meal->day->plan_id), $meal->day, $meal);
            }
        }

        $limit = min((int) $request->query('limit', 25), 100);
        $excludedCount = 0;
        $foods = $query->orderBy('name')
            ->limit(max($limit * 4, $limit))
            ->get()
            ->map(function (Food $food) use ($effectiveRules, $effectiveTargets, &$excludedCount): ?array {
                $compatibility = $this->validation()->evaluateFoodAgainstRules($food->name, $food->foodGroup?->name, $effectiveRules);
                if ($compatibility['hard_blocked']) {
                    $excludedCount++;
                    return null;
                }

                return $this->serializeCatalogFood($food, $compatibility, $effectiveTargets);
            })
            ->filter()
            ->take($limit)
            ->values();

        return response()->json([
            'data' => $foods,
            'total' => $foods->count(),
            'applied_conditions' => $this->conditionParser()->describe($conditions),
            'condition_mode' => $request->query('condition_mode', 'all'),
            'rule_context' => ['rules_count' => count($effectiveRules), 'targets_count' => count($effectiveTargets)],
            'excluded_count' => $excludedCount,
        ]);
    }

    public function addPlanRule(Request $request, int $planId): JsonResponse
    {
        $plan = $this->visiblePlan($planId, $this->currentUser($request));
        if (! $plan) {
            return response()->json(['detail' => 'Planning plan not found'], 404);
        }
        if ($error = $this->validateRulePayload($request)) {
            return $error;
        }

        PlanningRule::query()->create($this->rulePayload($request, ['client_id' => $plan->client_id, 'plan_id' => $plan->id, 'scope' => 'plan']));
        $this->markDraft($plan);

        return response()->json($this->serializePlan($this->loadPlan($plan->id), true, true));
    }

    public function addDayRule(Request $request, int $dayId): JsonResponse
    {
        $day = $this->visibleDay($dayId, $this->currentUser($request));
        if (! $day) {
            return response()->json(['detail' => 'Planning day not found'], 404);
        }
        if ($error = $this->validateRulePayload($request)) {
            return $error;
        }

        PlanningRule::query()->create($this->rulePayload($request, ['client_id' => $day->plan->client_id, 'plan_id' => $day->plan_id, 'day_id' => $day->id, 'scope' => 'day']));
        $this->markDraft($day->plan);

        return response()->json($this->serializePlan($this->loadPlan($day->plan_id), true, true));
    }

    public function addMealRule(Request $request, int $mealId): JsonResponse
    {
        $meal = $this->visibleMeal($mealId, $this->currentUser($request));
        if (! $meal) {
            return response()->json(['detail' => 'Planning meal not found'], 404);
        }
        if ($error = $this->validateRulePayload($request)) {
            return $error;
        }

        PlanningRule::query()->create($this->rulePayload($request, ['client_id' => $meal->day->plan->client_id, 'plan_id' => $meal->day->plan_id, 'day_id' => $meal->day_id, 'meal_id' => $meal->id, 'scope' => 'meal']));
        $this->markDraft($meal->day->plan);

        return response()->json($this->serializePlan($this->loadPlan($meal->day->plan_id), true, true));
    }

    public function updateRule(Request $request, int $ruleId): JsonResponse
    {
        $rule = $this->visibleRule($ruleId, $this->currentUser($request));
        if (! $rule) {
            return response()->json(['detail' => 'Planning rule not found'], 404);
        }
        if ($request->has('severity') && ! in_array(trim((string) $request->input('severity')), self::RULE_SEVERITIES, true)) {
            return response()->json(['detail' => 'Invalid rule severity. Use one of: '.implode(', ', self::RULE_SEVERITIES)], 400);
        }
        if ($request->has('rule_type') && strlen(trim((string) $request->input('rule_type'))) < 2) {
            return response()->json(['detail' => 'Rule type is required'], 400);
        }
        foreach (['rule_type', 'severity', 'title', 'details', 'is_active'] as $field) {
            if ($request->has($field)) {
                $rule->{$field} = $request->input($field);
            }
        }
        $rule->save();
        $plan = $this->loadPlan($rule->plan_id);
        $this->markDraft($plan);

        return response()->json($this->serializePlan($plan, true, true));
    }

    public function deleteRule(Request $request, int $ruleId): JsonResponse
    {
        $rule = $this->visibleRule($ruleId, $this->currentUser($request));
        if (! $rule) {
            return response()->json(['detail' => 'Planning rule not found'], 404);
        }
        $planId = $rule->plan_id;
        $rule->delete();
        if ($plan = $this->loadPlan($planId)) {
            $this->markDraft($plan);
        }

        return response()->json(['message' => 'Rule deleted', 'plan_id' => $planId]);
    }

    public function addPlanTarget(Request $request, int $planId): JsonResponse
    {
        $plan = $this->visiblePlan($planId, $this->currentUser($request));
        if (! $plan) {
            return response()->json(['detail' => 'Planning plan not found'], 404);
        }
        if ($error = $this->validateTargetPayload($request)) {
            return $error;
        }
        PlanningNutrientTarget::query()->create($this->targetPayload($request, ['plan_id' => $plan->id]));
        $this->markDraft($plan);

        return response()->json($this->serializePlan($this->loadPlan($plan->id), true, true));
    }

    public function addDayTarget(Request $request, int $dayId): JsonResponse
    {
        $day = $this->visibleDay($dayId, $this->currentUser($request));
        if (! $day) {
            return response()->json(['detail' => 'Planning day not found'], 404);
        }
        if ($error = $this->validateTargetPayload($request)) {
            return $error;
        }
        PlanningNutrientTarget::query()->create($this->targetPayload($request, ['plan_id' => $day->plan_id, 'day_id' => $day->id]));
        $this->markDraft($day->plan);

        return response()->json($this->serializePlan($this->loadPlan($day->plan_id), true, true));
    }

    public function addMealTarget(Request $request, int $mealId): JsonResponse
    {
        $meal = $this->visibleMeal($mealId, $this->currentUser($request));
        if (! $meal) {
            return response()->json(['detail' => 'Planning meal not found'], 404);
        }
        if ($error = $this->validateTargetPayload($request)) {
            return $error;
        }
        PlanningNutrientTarget::query()->create($this->targetPayload($request, ['plan_id' => $meal->day->plan_id, 'day_id' => $meal->day_id, 'meal_id' => $meal->id]));
        $this->markDraft($meal->day->plan);

        return response()->json($this->serializePlan($this->loadPlan($meal->day->plan_id), true, true));
    }

    public function updateTarget(Request $request, int $targetId): JsonResponse
    {
        $target = $this->visibleTarget($targetId, $this->currentUser($request));
        if (! $target) {
            return response()->json(['detail' => 'Planning target not found'], 404);
        }
        if ($error = $this->validateTargetPayload($request, $target)) {
            return $error;
        }
        foreach (['nutrient_code', 'unit', 'min_value', 'target_value', 'max_value'] as $field) {
            if ($request->has($field)) {
                $target->{$field} = $request->input($field);
            }
        }
        $target->save();
        $plan = $this->loadPlan($target->plan_id);
        $this->markDraft($plan);

        return response()->json($this->serializePlan($plan, true, true));
    }

    public function deleteTarget(Request $request, int $targetId): JsonResponse
    {
        $target = $this->visibleTarget($targetId, $this->currentUser($request));
        if (! $target) {
            return response()->json(['detail' => 'Planning target not found'], 404);
        }
        $planId = $target->plan_id;
        $target->delete();
        if ($plan = $this->loadPlan($planId)) {
            $this->markDraft($plan);
        }

        return response()->json(['message' => 'Target deleted', 'plan_id' => $planId]);
    }

    public function addDay(Request $request, int $planId): JsonResponse
    {
        $plan = $this->visiblePlan($planId, $this->currentUser($request));
        if (! $plan) {
            return response()->json(['detail' => 'Planning plan not found'], 404);
        }

        $nextIndex = ((int) $plan->days()->max('day_index')) + 1;
        $date = $request->input('actual_date') ?: ($plan->start_date ? Carbon::parse($plan->start_date)->addDays($nextIndex - 1)->toDateString() : null);
        PlanningPlanDay::query()->create([
            'plan_id' => $plan->id,
            'day_index' => $nextIndex,
            'day_name' => $request->input('day_name') ?: ($date ? Carbon::parse($date)->format('l') : "Day {$nextIndex}"),
            'actual_date' => $date,
            'template_group' => $request->input('template_group'),
            'notes' => $request->input('notes'),
        ]);
        $plan->forceFill(['days_count' => $nextIndex, 'status' => 'DRAFT'])->save();

        return response()->json($this->serializePlan($this->loadPlan($plan->id), true, true));
    }

    public function updateDay(Request $request, int $dayId): JsonResponse
    {
        $day = $this->visibleDay($dayId, $this->currentUser($request));
        if (! $day) {
            return response()->json(['detail' => 'Planning day not found'], 404);
        }
        foreach (['day_name', 'template_group', 'notes'] as $field) {
            if ($request->has($field)) {
                $day->{$field} = $request->input($field);
            }
        }
        if ($request->has('actual_date')) {
            $day->actual_date = $request->input('actual_date') ?: null;
        }
        $day->save();
        $this->markDraft($day->plan);

        return response()->json($this->serializePlan($this->loadPlan($day->plan_id), true, true));
    }

    public function duplicateDay(Request $request, int $dayId): JsonResponse
    {
        $day = $this->visibleDay($dayId, $this->currentUser($request));
        if (! $day) {
            return response()->json(['detail' => 'Planning day not found'], 404);
        }

        DB::transaction(function () use ($day, $request): void {
            $plan = $day->plan;
            $nextIndex = ((int) $plan->days()->max('day_index')) + 1;
            $date = $request->input('actual_date') ?: ($plan->start_date ? Carbon::parse($plan->start_date)->addDays($nextIndex - 1)->toDateString() : null);
            $clone = PlanningPlanDay::query()->create([
                'plan_id' => $plan->id,
                'day_index' => $nextIndex,
                'day_name' => $request->input('day_name') ?: "{$day->day_name} Copy",
                'actual_date' => $date,
                'template_group' => $request->has('template_group') ? $request->input('template_group') : $day->template_group,
                'notes' => $day->notes,
            ]);
            foreach ($day->rules as $rule) {
                PlanningRule::query()->create($this->cloneRulePayload($rule, ['plan_id' => $plan->id, 'day_id' => $clone->id]));
            }
            foreach ($day->nutrientTargets as $target) {
                PlanningNutrientTarget::query()->create($this->cloneTargetPayload($target, ['plan_id' => $plan->id, 'day_id' => $clone->id]));
            }
            foreach ($day->meals->sortBy('meal_order') as $meal) {
                $mealClone = PlanningPlanMeal::query()->create([
                    'day_id' => $clone->id,
                    'meal_name' => $meal->meal_name,
                    'meal_type' => $meal->meal_type,
                    'meal_time' => $meal->meal_time,
                    'meal_order' => $meal->meal_order,
                    'instructions' => $meal->instructions,
                    'target_notes' => $meal->target_notes,
                ]);
                foreach ($meal->foods as $food) {
                    PlanningMealFood::query()->create($this->cloneMealFoodPayload($food, $mealClone->id));
                }
                foreach ($meal->rules as $rule) {
                    PlanningRule::query()->create($this->cloneRulePayload($rule, ['plan_id' => $plan->id, 'day_id' => $clone->id, 'meal_id' => $mealClone->id]));
                }
                foreach ($meal->nutrientTargets as $target) {
                    PlanningNutrientTarget::query()->create($this->cloneTargetPayload($target, ['plan_id' => $plan->id, 'day_id' => $clone->id, 'meal_id' => $mealClone->id]));
                }
            }
            $plan->forceFill(['days_count' => $nextIndex, 'status' => 'DRAFT'])->save();
        });

        return response()->json($this->serializePlan($this->loadPlan($day->plan_id), true, true));
    }

    public function deleteDay(Request $request, int $dayId): JsonResponse
    {
        $day = $this->visibleDay($dayId, $this->currentUser($request));
        if (! $day) {
            return response()->json(['detail' => 'Planning day not found'], 404);
        }
        if ($day->plan->days()->count() <= 1) {
            return response()->json(['detail' => 'A plan must keep at least one day'], 400);
        }
        $planId = $day->plan_id;
        $day->delete();
        $this->renumberDays($planId);

        return response()->json(['message' => 'Day deleted', 'plan_id' => $planId]);
    }

    public function addMeal(Request $request, int $dayId): JsonResponse
    {
        $day = $this->visibleDay($dayId, $this->currentUser($request));
        if (! $day) {
            return response()->json(['detail' => 'Planning day not found'], 404);
        }
        $nextOrder = ((int) $day->meals()->max('meal_order')) + 1;
        PlanningPlanMeal::query()->create([
            'day_id' => $day->id,
            'meal_name' => $request->input('meal_name', 'Meal'),
            'meal_type' => $request->input('meal_type'),
            'meal_time' => $request->input('meal_time'),
            'meal_order' => $nextOrder,
            'instructions' => $request->input('instructions'),
            'target_notes' => $request->input('target_notes'),
        ]);
        $this->markDraft($day->plan);

        return response()->json($this->serializePlan($this->loadPlan($day->plan_id), true, true));
    }

    public function updateMeal(Request $request, int $mealId): JsonResponse
    {
        $meal = $this->visibleMeal($mealId, $this->currentUser($request));
        if (! $meal) {
            return response()->json(['detail' => 'Planning meal not found'], 404);
        }
        foreach (['meal_name', 'meal_type', 'meal_time', 'meal_order', 'instructions', 'target_notes'] as $field) {
            if ($request->has($field)) {
                $meal->{$field} = $request->input($field);
            }
        }
        $meal->save();
        $this->markDraft($meal->day->plan);

        return response()->json($this->serializePlan($this->loadPlan($meal->day->plan_id), true, true));
    }

    public function deleteMeal(Request $request, int $mealId): JsonResponse
    {
        $meal = $this->visibleMeal($mealId, $this->currentUser($request));
        if (! $meal) {
            return response()->json(['detail' => 'Planning meal not found'], 404);
        }
        $planId = $meal->day->plan_id;
        $meal->delete();
        if ($plan = $this->loadPlan($planId)) {
            $this->markDraft($plan);
        }

        return response()->json(['message' => 'Meal deleted', 'plan_id' => $planId]);
    }

    public function addFood(Request $request, int $mealId): JsonResponse
    {
        $meal = $this->visibleMeal($mealId, $this->currentUser($request));
        if (! $meal) {
            return response()->json(['detail' => 'Planning meal not found'], 404);
        }
        $food = Food::query()->with(['foodGroup', 'nutrients.nutrient', 'nutrients.nutrientType'])->find($request->input('food_id'));
        if (! $food) {
            return response()->json(['detail' => 'Food not found'], 404);
        }
        if ($food->nutrients->isEmpty()) {
            return response()->json(['detail' => 'Food has no nutrient data'], 400);
        }
        $portionGrams = $this->normalizePortion((float) $request->input('portion_grams', 100), $request->input('unit_label'));
        $snapshot = $this->buildNutrientSnapshot($food->nutrients);
        $nextOrder = ((int) $meal->foods()->max('sort_order')) + 1;

        PlanningMealFood::query()->create([
            'meal_id' => $meal->id,
            'food_id' => $food->id,
            'food_name' => $food->name,
            'food_code' => $food->code,
            'food_group_name' => $food->foodGroup?->name,
            'portion_grams' => $portionGrams,
            'portion_description' => $request->input('portion_description'),
            'household_measure' => $request->input('household_measure'),
            'unit_label' => $request->input('unit_label'),
            'preparation_state' => $request->input('preparation_state'),
            'notes' => $request->input('notes'),
            'sort_order' => $nextOrder,
            'nutrient_snapshot' => $snapshot,
            'calculated_nutrients' => $this->calculatePortionNutrients($snapshot, $portionGrams),
        ]);
        $this->markDraft($meal->day->plan);

        return response()->json($this->serializePlan($this->loadPlan($meal->day->plan_id), true, true));
    }

    public function addCustomFood(Request $request, int $mealId): JsonResponse
    {
        $meal = $this->visibleMeal($mealId, $this->currentUser($request));
        if (! $meal) {
            return response()->json(['detail' => 'Planning meal not found'], 404);
        }
        $portionGrams = $this->normalizePortion((float) $request->input('portion_grams', 100), $request->input('unit_label'));
        $snapshot = $this->buildCustomSnapshot((array) $request->input('nutrients_per_100g', []));
        $nextOrder = ((int) $meal->foods()->max('sort_order')) + 1;

        PlanningMealFood::query()->create([
            'meal_id' => $meal->id,
            'food_name' => (string) $request->input('food_name', 'Custom food'),
            'food_group_name' => $request->input('food_group_name', 'Custom recipe'),
            'portion_grams' => $portionGrams,
            'portion_description' => $request->input('portion_description'),
            'household_measure' => $request->input('household_measure'),
            'unit_label' => $request->input('unit_label'),
            'preparation_state' => $request->input('preparation_state'),
            'notes' => $request->input('notes'),
            'sort_order' => $nextOrder,
            'nutrient_snapshot' => $snapshot,
            'calculated_nutrients' => $this->calculatePortionNutrients($snapshot, $portionGrams),
        ]);
        $this->markDraft($meal->day->plan);

        return response()->json($this->serializePlan($this->loadPlan($meal->day->plan_id), true, true));
    }

    public function updateMealFood(Request $request, int $mealFoodId): JsonResponse
    {
        $mealFood = $this->visibleMealFood($mealFoodId, $this->currentUser($request));
        if (! $mealFood) {
            return response()->json(['detail' => 'Meal food not found'], 404);
        }
        foreach (['portion_description', 'household_measure', 'unit_label', 'preparation_state', 'notes', 'sort_order'] as $field) {
            if ($request->has($field)) {
                $mealFood->{$field} = $request->input($field);
            }
        }
        if ($request->has('portion_grams')) {
            $mealFood->portion_grams = $this->normalizePortion((float) $request->input('portion_grams'), $request->input('unit_label', $mealFood->unit_label));
            $mealFood->calculated_nutrients = $this->calculatePortionNutrients($mealFood->nutrient_snapshot ?: [], $mealFood->portion_grams);
        }
        $mealFood->save();
        $this->markDraft($mealFood->meal->day->plan);

        return response()->json($this->serializePlan($this->loadPlan($mealFood->meal->day->plan_id), true, true));
    }

    public function deleteMealFood(Request $request, int $mealFoodId): JsonResponse
    {
        $mealFood = $this->visibleMealFood($mealFoodId, $this->currentUser($request));
        if (! $mealFood) {
            return response()->json(['detail' => 'Meal food not found'], 404);
        }
        $planId = $mealFood->meal->day->plan_id;
        $mealFood->delete();
        if ($plan = $this->loadPlan($planId)) {
            $this->markDraft($plan);
        }

        return response()->json(['message' => 'Food removed', 'plan_id' => $planId]);
    }

    public function suggestions(Request $request, int $mealFoodId): JsonResponse
    {
        $mealFood = $this->visibleMealFood($mealFoodId, $this->currentUser($request));
        if (! $mealFood) {
            return response()->json(['detail' => 'Meal food not found'], 404);
        }

        $query = Food::query()->with(['foodGroup', 'nutrients.nutrient', 'nutrients.nutrientType']);
        if ($mealFood->food_id) {
            $query->where('id', '!=', $mealFood->food_id);
        }
        if ($request->boolean('same_group_only', true) && $mealFood->food?->food_group_id) {
            $query->where('food_group_id', $mealFood->food->food_group_id);
        }

        $meal = $mealFood->meal;
        [$effectiveRules, $effectiveTargets] = $this->validation()->effectiveContext($this->loadPlan($meal->day->plan_id), $meal->day, $meal);
        $currentExchange = $this->substitution()->exchangeCategory($mealFood->calculated_nutrients ?: [], $mealFood->food_group_name);
        $currentGroupId = $mealFood->food?->food_group_id;

        $suggestions = $query->orderBy('name')->limit(80)->get()
            ->map(function (Food $food) use ($mealFood, $effectiveRules, $effectiveTargets, $currentExchange, $currentGroupId): ?array {
                $snapshot = $this->buildNutrientSnapshot($food->nutrients);
                $candidateNutrients = $this->calculatePortionNutrients($snapshot, $mealFood->portion_grams);
                $compatibility = $this->validation()->evaluateFoodAgainstRules($food->name, $food->foodGroup?->name, $effectiveRules);
                if ($compatibility['hard_blocked']) {
                    return null;
                }

                $sameGroup = $currentGroupId && $food->food_group_id === $currentGroupId;
                $exchange = $this->substitution()->exchangeCategory($candidateNutrients, $food->foodGroup?->name);
                $sameExchange = $exchange === $currentExchange;
                $deltas = $this->substitution()->deltas($mealFood->calculated_nutrients ?: [], $candidateNutrients);

                return array_merge($this->serializeCatalogFood($food, $compatibility, $effectiveTargets), [
                    'similarity_score' => $this->substitution()->score($mealFood->calculated_nutrients ?: [], $candidateNutrients, (bool) $sameGroup, $sameExchange),
                    'same_group' => (bool) $sameGroup,
                    'same_exchange' => $sameExchange,
                    'exchange_category' => $exchange,
                    'nutrient_deltas' => $deltas,
                    'similarity_summary' => $this->substitution()->summary($deltas),
                    'replacement_reason' => 'Smart substitution suggestion',
                ]);
            })
            ->filter()
            ->sortByDesc('similarity_score')
            ->take(min((int) $request->query('limit', 6), 20))
            ->values();

        return response()->json([
            'current_food' => $this->serializeMealFood($mealFood),
            'data' => $suggestions,
            'suggestions' => $suggestions,
            'rule_context' => ['rules_count' => count($effectiveRules), 'targets_count' => count($effectiveTargets)],
        ]);
    }

    public function replaceMealFood(Request $request, int $mealFoodId): JsonResponse
    {
        $mealFood = $this->visibleMealFood($mealFoodId, $this->currentUser($request));
        if (! $mealFood) {
            return response()->json(['detail' => 'Meal food not found'], 404);
        }
        $food = Food::query()->with(['foodGroup', 'nutrients.nutrient', 'nutrients.nutrientType'])->find($request->input('food_id'));
        if (! $food) {
            return response()->json(['detail' => 'Replacement food not found'], 404);
        }
        if ($food->nutrients->isEmpty()) {
            return response()->json(['detail' => 'Replacement food has no nutrient data'], 400);
        }

        $meal = $mealFood->meal;
        [$effectiveRules] = $this->validation()->effectiveContext($this->loadPlan($meal->day->plan_id), $meal->day, $meal);
        $compatibility = $this->validation()->evaluateFoodAgainstRules($food->name, $food->foodGroup?->name, $effectiveRules);
        if ($compatibility['hard_blocked']) {
            $blockedTitles = collect($compatibility['blocked_by'])->take(4)->pluck('title')->implode(', ');
            return response()->json(['detail' => 'Replacement food violates blocking rules: '.$blockedTitles], 400);
        }

        $portionUnit = $request->has('unit_label') ? $request->input('unit_label') : $mealFood->unit_label;
        $portionGrams = $request->has('portion_grams')
            ? $this->normalizePortion((float) $request->input('portion_grams'), $portionUnit)
            : $mealFood->portion_grams;
        $snapshot = $this->buildNutrientSnapshot($food->nutrients);
        $previousFoodName = $mealFood->food_name;
        $notes = array_filter([
            $mealFood->notes ? trim($mealFood->notes) : null,
            $request->input('notes') ? trim((string) $request->input('notes')) : null,
            $this->buildReplacementNote($previousFoodName, $food->name, $request->input('replacement_reason')),
        ]);

        $mealFood->forceFill([
            'food_id' => $food->id,
            'food_name' => $food->name,
            'food_code' => $food->code,
            'food_group_name' => $food->foodGroup?->name,
            'portion_grams' => $portionGrams,
            'portion_description' => $request->has('portion_description') ? $request->input('portion_description') : $mealFood->portion_description,
            'household_measure' => $request->has('household_measure') ? $request->input('household_measure') : $mealFood->household_measure,
            'unit_label' => $request->has('unit_label') ? $request->input('unit_label') : $mealFood->unit_label,
            'preparation_state' => $request->has('preparation_state') ? $request->input('preparation_state') : $mealFood->preparation_state,
            'notes' => implode("\n", $notes),
            'nutrient_snapshot' => $snapshot,
            'calculated_nutrients' => $this->calculatePortionNutrients($snapshot, $portionGrams),
        ])->save();
        $this->markDraft($mealFood->meal->day->plan);

        return response()->json($this->serializePlan($this->loadPlan($mealFood->meal->day->plan_id), true, true));
    }

    public function report(Request $request, int $planId): JsonResponse
    {
        $plan = $this->visiblePlan($planId, $this->currentUser($request));
        if (! $plan) {
            return response()->json(['detail' => 'Planning plan not found'], 404);
        }

        $report = $this->serializePlan($plan, true, true);
        $report['report_generated_at'] = now()->toISOString();
        $report['report_title'] = $plan->title;
        $report['key_nutrient_labels'] = collect(self::KEY_NUTRIENTS)->pluck('label', 'code');

        return response()->json($report);
    }

    public function downloadPdf(Request $request, int $planId)
    {
        $plan = $this->visiblePlan($planId, $this->currentUser($request));
        if (! $plan) {
            return response()->json(['detail' => 'Planning plan not found'], 404);
        }

        $report = $this->serializePlan($plan, true, true);
        $report['report_generated_at'] = now()->toISOString();
        $report['report_title'] = $plan->title;
        $report['key_nutrient_labels'] = collect(self::KEY_NUTRIENTS)->pluck('label', 'code');

        $filename = Str::slug($plan->title ?: 'nutrition-plan', '-') . '-nutrition-plan.pdf';
        $tempDir = storage_path('app/mpdf');
        if (! is_dir($tempDir)) {
            mkdir($tempDir, 0775, true);
        }

        set_error_handler(function (int $severity, string $message, string $file): bool {
            $isMpdfWarning = str_contains($file, DIRECTORY_SEPARATOR.'vendor'.DIRECTORY_SEPARATOR.'mpdf'.DIRECTORY_SEPARATOR.'mpdf'.DIRECTORY_SEPARATOR)
                && in_array($severity, [E_WARNING, E_NOTICE, E_DEPRECATED, E_USER_WARNING, E_USER_NOTICE, E_USER_DEPRECATED], true);

            return $isMpdfWarning;
        });

        try {
            $html = $this->buildPlanReportHtml($report);
            ob_start();

            $mpdf = new Mpdf([
                'mode' => 'utf-8',
                'format' => 'A4',
                'orientation' => 'P',
                'margin_left' => 10,
                'margin_right' => 10,
                'margin_top' => 15,
                'margin_bottom' => 10,
                'margin_header' => 0,
                'margin_footer' => 0,
                'tempDir' => $tempDir,
                'autoScriptToLang' => true,
                'autoLangToFont' => true,
                'allow_output_destination' => true,
                'keep_table_proportions' => true,
                'simpleTables' => false,
            ]);

            // Configure fonts and other settings
            $mpdf->SetTitle($plan->title ?: 'Nutrition Plan');
            $mpdf->SetCompression(true);
            
            // Use stricter page break handling
            $mpdf->SetDisplayMode('fullpage');
            
            // Write the HTML to PDF
            $mpdf->WriteHTML($html);
            
            // Output as string
            $pdfOutput = $mpdf->Output('', 'S');
        } catch (\Throwable $exception) {
            if (ob_get_level() > 0) {
                ob_end_clean();
            }

            return response()->json(['detail' => 'PDF generation failed: '.$exception->getMessage()], 500);
        } finally {
            restore_error_handler();
            if (ob_get_level() > 0) {
                ob_end_clean();
            }
        }

        return response($pdfOutput, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
        ]);
    }

    /**
     * Recursively convert all Collection objects to arrays
     */
    private function collectionsToArrays($data)
    {
        if ($data instanceof \Illuminate\Support\Collection) {
            return $data->toArray();
        }
        
        if (is_array($data)) {
            return array_map(fn ($item) => $this->collectionsToArrays($item), $data);
        }
        
        return $data;
    }

    private function buildPlanReportHtml(array $report): string
    {
        // Convert all Collections in report to arrays recursively
        $report = $this->collectionsToArrays($report);
        
        $e = fn ($value): string => htmlspecialchars((string) ($value ?? ''), ENT_QUOTES, 'UTF-8');
        $formatNutrient = function ($item): string {
            $item = is_array($item) ? $item : [];
            $value = number_format((float) ($item['value'] ?? 0), 1);
            $unit = trim((string) ($item['unit'] ?? ''));
            return trim($value . ($unit !== '' ? ' ' . $unit : ''));
        };

        $days = $report['days'] ?? [];
        $title = $e($report['title'] ?? 'Nutrition Plan');
        $clientLabel = $e($report['client_display_label'] ?? 'Anonymous planning reference');
        $clientCode = $e($report['client_code'] ?? '');
        $mealCount = collect($days)->sum(fn (array $day): int => count($day['meals'] ?? []));
        $dayCount = (int) ($report['days_count'] ?? count($days));

        // Build status/plan meta info
        $metaRows = '
            <tr>
                <td class="meta-cell"><div class="meta-label">Status</div><div class="meta-value">' . $e($report['status'] ?? 'draft') . '</div></td>
                <td class="meta-cell"><div class="meta-label">Plan Type</div><div class="meta-value">' . $e($report['plan_type'] ?? '-') . '</div></td>
                <td class="meta-cell"><div class="meta-label">Start Date</div><div class="meta-value">' . $e($report['start_date'] ?? 'Not set') . '</div></td>
                <td class="meta-cell"><div class="meta-label">Days</div><div class="meta-value">' . $dayCount . '</div></td>
            </tr>
        ';

        // Build summary metrics
        $summaryHtml = '';
        $highlights = collect($report['summary']['highlights'] ?? [])->all();
        if (!empty($highlights)) {
            $summaryHtml = '<table class="summary-table" cellpadding="0" cellspacing="0"><tr>';
            foreach (array_slice($highlights, 0, 5) as $item) {
                $summaryHtml .= '
                    <td class="summary-cell">
                        <div class="summary-label">' . $e($item['label'] ?? $item['code'] ?? '') . '</div>
                        <div class="summary-value">' . $e($formatNutrient($item)) . '</div>
                    </td>
                ';
            }
            $summaryHtml .= '</tr></table>';
        } else {
            $summaryHtml = '<div class="empty-message">No nutrient totals yet.</div>';
        }

        // Build days content
        $daysHtml = '';
        foreach ($days as $dayIndex => $day) {
            $dayNumber = $day['day_index'] ?? ($dayIndex + 1);
            $dayLabel = trim('Day ' . $dayNumber . (($day['day_name'] ?? '') ? ': ' . $day['day_name'] : ''));
            $daysHtml .= '
                <div class="day-section">
                    <div class="day-header">
                        <h2>' . $e($dayLabel) . '</h2>
                        <div class="day-meta">' . $e($day['actual_date'] ?? 'No date assigned') . '</div>
                    </div>
            ';

            // Day summary nutrients
            $dayHighlights = collect($day['summary']['highlights'] ?? [])->all();
            if (!empty($dayHighlights)) {
                $daysHtml .= '<table class="summary-table" cellpadding="0" cellspacing="0"><tr>';
                foreach (array_slice($dayHighlights, 0, 5) as $item) {
                    $daysHtml .= '
                        <td class="summary-cell">
                            <div class="summary-label">' . $e($item['label'] ?? $item['code'] ?? '') . '</div>
                            <div class="summary-value">' . $e($formatNutrient($item)) . '</div>
                        </td>
                    ';
                }
                $daysHtml .= '</tr></table>';
            }

            // Meals for this day
            foreach (($day['meals'] ?? []) as $meal) {
                $mealFoods = $meal['foods'] ?? [];
                $daysHtml .= '
                    <div class="meal-section">
                        <div class="meal-header">
                            <h3>' . $e($meal['meal_name'] ?? 'Meal') . '</h3>
                            <div class="meal-time">' . $e($meal['meal_time'] ?? $meal['meal_type'] ?? 'Schedule not set') . '</div>
                        </div>
                ';

                // Meal notes
                $notes = '';
                if (!empty($meal['instructions'])) {
                    $notes .= '<div class="note-line"><strong>Instructions:</strong> ' . nl2br($e($meal['instructions'])) . '</div>';
                }
                if (!empty($meal['target_notes'])) {
                    $notes .= '<div class="note-line"><strong>Target Notes:</strong> ' . nl2br($e($meal['target_notes'])) . '</div>';
                }
                if ($notes !== '') {
                    $daysHtml .= '<div class="meal-notes">' . $notes . '</div>';
                }

                // Food table
                $daysHtml .= '
                    <table class="food-table" cellpadding="0" cellspacing="0">
                        <thead>
                            <tr>
                                <th class="col-food">Food</th>
                                <th class="col-portion">Portion</th>
                                <th class="col-nutrient">Energy</th>
                                <th class="col-nutrient">Protein</th>
                                <th class="col-nutrient">Carbs</th>
                                <th class="col-nutrient">Fat</th>
                            </tr>
                        </thead>
                        <tbody>
                ';

                if (!empty($mealFoods)) {
                    foreach ($mealFoods as $food) {
                        $nutrients = (array) ($food['calculated_nutrients'] ?? []);
                        $portionDescription = trim((string) ($food['portion_description'] ?? $food['household_measure'] ?? $food['unit_label'] ?? ''));
                        $daysHtml .= '
                            <tr>
                                <td class="col-food">
                                    <div class="food-name">' . $e($food['food_name'] ?? '') . '</div>
                                    <div class="food-group">' . $e($food['food_group_name'] ?? '') . '</div>
                                </td>
                                <td class="col-portion">
                                    <div>' . $e($food['portion_grams'] ?? 0) . ' g</div>
                                    ' . ($portionDescription !== '' ? '<div class="food-measure">' . $e($portionDescription) . '</div>' : '') . '
                                </td>
                                <td class="col-nutrient">' . number_format((float) ($nutrients['ENERGY_KC'] ?? 0), 1) . ' kcal</td>
                                <td class="col-nutrient">' . number_format((float) ($nutrients['PROCNT'] ?? 0), 1) . ' g</td>
                                <td class="col-nutrient">' . number_format((float) ($nutrients['CHOCDF'] ?? 0), 1) . ' g</td>
                                <td class="col-nutrient">' . number_format((float) ($nutrients['FAT'] ?? 0), 1) . ' g</td>
                            </tr>
                        ';
                    }
                } else {
                    $daysHtml .= '<tr><td colspan="6" class="empty-row">No foods added to this meal.</td></tr>';
                }

                $daysHtml .= '
                        </tbody>
                    </table>
                    </div>
                ';
            }

            $daysHtml .= '</div>';
        }

        // Build final HTML with MPDF-optimized CSS
        return "
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset=\"UTF-8\">
                <title>" . $title . "</title>
                <style>
                    * { margin: 0; padding: 0; }
                    html { font-size: 10pt; }
                    body { 
                        font-family: Arial, sans-serif; 
                        color: #1f2d27; 
                        line-height: 1.4;
                        background: #ffffff;
                    }
                    .container { padding: 0; }
                    .header { 
                        background: #f1faf5; 
                        border-left: 5mm solid #18a957; 
                        padding: 8mm 8mm; 
                        margin-bottom: 6mm;
                        page-break-after: avoid;
                    }
                    h1 { 
                        color: #18a957; 
                        font-size: 18pt; 
                        line-height: 1.2; 
                        font-weight: bold;
                        margin-bottom: 2mm;
                    }
                    .subtitle { 
                        color: #5b6a63; 
                        font-size: 8pt; 
                        text-transform: uppercase;
                    }
                    .meta-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 6mm;
                        page-break-inside: avoid;
                    }
                    .meta-cell {
                        border: 0.5pt solid #dfe8e3;
                        padding: 3mm;
                        width: 25%;
                        page-break-inside: avoid;
                    }
                    .meta-label {
                        font-size: 7pt;
                        text-transform: uppercase;
                        color: #65766f;
                        font-weight: bold;
                        margin-bottom: 1mm;
                    }
                    .meta-value {
                        font-size: 10pt;
                        font-weight: bold;
                        color: #1f2d27;
                    }
                    .section-title {
                        font-size: 12pt;
                        font-weight: bold;
                        color: #1f2d27;
                        margin: 5mm 0 3mm 0;
                        border-bottom: 0.5pt solid #dfe8e3;
                        padding-bottom: 2mm;
                        page-break-after: avoid;
                    }
                    .summary-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 4mm;
                        page-break-inside: avoid;
                    }
                    .summary-table tr {
                        page-break-inside: avoid;
                    }
                    .summary-cell {
                        border: 0.5pt solid #dfe8e3;
                        padding: 3mm;
                        background: #fbfcfb;
                        text-align: center;
                        page-break-inside: avoid;
                    }
                    .summary-label {
                        font-size: 7pt;
                        text-transform: uppercase;
                        color: #65766f;
                        font-weight: bold;
                        margin-bottom: 1mm;
                    }
                    .summary-value {
                        font-size: 11pt;
                        font-weight: bold;
                        color: #147d4c;
                    }
                    .day-section {
                        margin-bottom: 6mm;
                        border: 0.5pt solid #dfe8e3;
                        padding: 4mm;
                    }
                    .day-header {
                        margin-bottom: 3mm;
                        page-break-after: avoid;
                    }
                    h2 {
                        font-size: 13pt;
                        font-weight: bold;
                        color: #1f2d27;
                        margin-bottom: 1mm;
                    }
                    .day-meta {
                        font-size: 8pt;
                        color: #65766f;
                    }
                    .meal-section {
                        background: #f7fbf6;
                        border-left: 4mm solid #18a957;
                        padding: 3mm;
                        margin-bottom: 4mm;
                    }
                    .meal-header {
                        page-break-after: avoid;
                        margin-bottom: 2mm;
                    }
                    h3 {
                        font-size: 11pt;
                        font-weight: bold;
                        color: #17372a;
                        margin-bottom: 1mm;
                    }
                    .meal-time {
                        font-size: 8pt;
                        color: #65766f;
                    }
                    .meal-notes {
                        font-size: 8pt;
                        color: #4b5563;
                        margin-bottom: 2mm;
                        background: #ffffff;
                        padding: 2mm;
                        border-radius: 2px;
                    }
                    .note-line {
                        margin-bottom: 1mm;
                        line-height: 1.3;
                    }
                    .note-line strong {
                        color: #1f2d27;
                    }
                    .food-table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 8pt;
                        margin-bottom: 3mm;
                    }
                    .food-table thead {
                        display: table-header-group;
                    }
                    .food-table th {
                        background: #edf1f1;
                        color: #40524b;
                        font-size: 7pt;
                        font-weight: bold;
                        text-transform: uppercase;
                        padding: 2mm;
                        text-align: left;
                        border-bottom: 0.5pt solid #dfe8e3;
                    }
                    .food-table td {
                        border-bottom: 0.5pt solid #dfe8e3;
                        padding: 2mm;
                        vertical-align: top;
                        color: #263832;
                    }
                    .food-table tbody tr {
                        page-break-inside: avoid;
                        orphans: 1;
                        widows: 1;
                    }
                    .col-food { width: 30%; }
                    .col-portion { width: 17%; }
                    .col-nutrient { width: 12%; text-align: right; }
                    .food-name {
                        font-weight: bold;
                        color: #1f2d27;
                        margin-bottom: 1mm;
                    }
                    .food-group {
                        font-size: 7pt;
                        color: #65766f;
                    }
                    .food-measure {
                        font-size: 7pt;
                        color: #65766f;
                        margin-top: 0.5mm;
                    }
                    .empty-message {
                        text-align: center;
                        color: #65766f;
                        padding: 3mm;
                        font-size: 9pt;
                    }
                    .empty-row {
                        text-align: center;
                        color: #65766f;
                        padding: 3mm !important;
                    }
                </style>
            </head>
            <body>
                <div class=\"container\">
                    <div class=\"header\">
                        <h1>" . $title . "</h1>
                        <div class=\"subtitle\">" . $clientLabel . ($clientCode ? " (" . $clientCode . ")" : "") . "</div>
                    </div>

                    <table class=\"meta-table\" cellpadding=\"0\" cellspacing=\"0\">
                        " . $metaRows . "
                    </table>

                    <div class=\"section-title\">Plan Summary</div>
                    " . $summaryHtml . "

                    " . $daysHtml . "
                </div>
            </body>
            </html>
        ";
    }

    public function finalize(Request $request, int $planId): JsonResponse
    {
        $plan = $this->visiblePlan($planId, $this->currentUser($request));
        if (! $plan) {
            return response()->json(['detail' => 'Planning plan not found'], 404);
        }

        $snapshot = $this->serializePlan($plan, true, true);
        if (empty($snapshot['days'])) {
            return response()->json(['detail' => 'Cannot finalize a plan without any days'], 400);
        }
        if (($snapshot['summary']['foods_count'] ?? 0) === 0) {
            return response()->json(['detail' => 'Cannot finalize a plan without any selected foods'], 400);
        }
        $emptyMeals = [];
        foreach (($snapshot['days'] ?? []) as $day) {
            if (empty($day['meals'])) {
                $emptyMeals[] = "Day {$day['day_index']} has no meals";
                continue;
            }
            foreach ($day['meals'] as $meal) {
                if (($meal['summary']['foods_count'] ?? 0) === 0) {
                    $emptyMeals[] = "Day {$day['day_index']} - {$meal['meal_name']} has no foods";
                }
            }
        }
        if ($emptyMeals) {
            return response()->json(['detail' => 'Cannot finalize plan because some meals are empty: '.implode('; ', $emptyMeals)], 400);
        }
        if (($snapshot['effective_validation']['blockers_count'] ?? 0) > 0) {
            $blockerMessages = collect($snapshot['effective_validation']['checks'] ?? [])
                ->filter(fn (array $check) => ($check['severity'] ?? '') === 'blocker')
                ->pluck('message')
                ->filter()
                ->take(6)
                ->implode('; ');

            return response()->json(['detail' => 'Cannot finalize plan because blocking rule violations were detected: '.$blockerMessages], 400);
        }

        $version = DB::transaction(function () use ($plan, $snapshot): PlanningPlanVersion {
            $versionNumber = ((int) PlanningPlanVersion::query()->where('plan_id', $plan->id)->max('version_number')) + 1;
            $version = PlanningPlanVersion::query()->create([
                'plan_id' => $plan->id,
                'version_number' => $versionNumber,
                'status' => 'FINALIZED',
                'snapshot_json' => array_merge($snapshot, ['finalized_by' => Auth::user()?->full_name ?: Auth::user()?->username]),
                'finalized_at' => now(),
                'finalized_by_id' => Auth::id(),
            ]);
            $plan->forceFill(['status' => 'FINALIZED'])->save();

            return $version;
        });

        return response()->json([
            'plan_id' => $plan->id,
            'version_id' => $version->id,
            'version_number' => $version->version_number,
            'status' => strtolower((string) $version->status),
            'finalized_at' => optional($version->finalized_at)->toISOString(),
        ]);
    }

    private function currentUser(Request $request): User
    {
        return $request->attributes->get('current_user') ?: Auth::user();
    }

    private function planRelations(): array
    {
        return [
            'client.planningProfile',
            'assignedNutritionist',
            'createdBy',
            'versions',
            'rules',
            'nutrientTargets',
            'days.rules',
            'days.nutrientTargets',
            'days.meals.rules',
            'days.meals.nutrientTargets',
            'days.meals.foods.food',
        ];
    }

    private function loadPlan(int $planId): ?PlanningPlan
    {
        return PlanningPlan::query()->with($this->planRelations())->find($planId);
    }

    private function visiblePlan(int $planId, User $user): ?PlanningPlan
    {
        $plan = PlanningPlan::query()->with($this->planRelations())->find($planId);
        if (! $plan) {
            return null;
        }
        if (! $this->canAccessPlan($plan, $user)) {
            throw new HttpResponseException(response()->json(['detail' => 'You do not have access to this planning plan'], 403));
        }

        return $plan;
    }

    private function visibleClient(int $clientId, User $user): ?PlanningClient
    {
        $client = PlanningClient::query()->with(['planningProfile', 'assignedNutritionist'])->find($clientId);
        if (! $client) {
            return null;
        }
        if (! $this->canAccessClient($client, $user)) {
            throw new HttpResponseException(response()->json(['detail' => 'You do not have access to this planning client'], 403));
        }

        return $client;
    }

    private function visibleDay(int $dayId, User $user): ?PlanningPlanDay
    {
        $day = PlanningPlanDay::query()->with(['plan', 'rules', 'nutrientTargets', 'meals.foods'])->find($dayId);
        return $day && $this->visiblePlan($day->plan_id, $user) ? $day : null;
    }

    private function visibleMeal(int $mealId, User $user): ?PlanningPlanMeal
    {
        $meal = PlanningPlanMeal::query()->with(['day.plan', 'foods', 'rules', 'nutrientTargets'])->find($mealId);
        return $meal && $this->visiblePlan($meal->day->plan_id, $user) ? $meal : null;
    }

    private function visibleMealFood(int $mealFoodId, User $user): ?PlanningMealFood
    {
        $mealFood = PlanningMealFood::query()->with(['meal.day.plan', 'food'])->find($mealFoodId);
        return $mealFood && $this->visiblePlan($mealFood->meal->day->plan_id, $user) ? $mealFood : null;
    }

    private function visibleRule(int $ruleId, User $user): ?PlanningRule
    {
        $rule = PlanningRule::query()->find($ruleId);
        return $rule && $this->visiblePlan($rule->plan_id, $user) ? $rule : null;
    }

    private function visibleTarget(int $targetId, User $user): ?PlanningNutrientTarget
    {
        $target = PlanningNutrientTarget::query()->find($targetId);
        return $target && $this->visiblePlan($target->plan_id, $user) ? $target : null;
    }

    private function restrictPlansForUser(Builder $query, User $user): void
    {
        if ($user->roleValue() === 'nutritionist') {
            $query->where(function (Builder $query) use ($user): void {
                $query->where('assigned_nutritionist_id', $user->id)
                    ->orWhere('created_by_id', $user->id);
            });
        }
    }

    private function restrictClientsForUser(Builder $query, User $user): void
    {
        if ($user->roleValue() === 'nutritionist') {
            $query->where(function (Builder $query) use ($user): void {
                $query->where('assigned_nutritionist_id', $user->id)
                    ->orWhere('created_by_id', $user->id);
            });
        }
    }

    private function canAccessPlan(PlanningPlan $plan, User $user): bool
    {
        return $user->roleValue() !== 'nutritionist'
            || $plan->assigned_nutritionist_id === $user->id
            || $plan->created_by_id === $user->id;
    }

    private function canAccessClient(PlanningClient $client, User $user): bool
    {
        return $user->roleValue() !== 'nutritionist'
            || $client->assigned_nutritionist_id === $user->id
            || $client->created_by_id === $user->id;
    }

    private function serializeClient(PlanningClient $client): array
    {
        $profile = $client->planningProfile;

        return [
            'id' => $client->id,
            'client_code' => $client->client_code,
            'display_label' => $client->display_label,
            'privacy_tier' => $client->privacy_tier,
            'status' => $client->status,
            'notes' => $client->notes,
            'assigned_nutritionist_id' => $client->assigned_nutritionist_id,
            'assigned_nutritionist_name' => $client->assignedNutritionist?->full_name ?: $client->assignedNutritionist?->username,
            'created_by_id' => $client->created_by_id,
            'created_at' => optional($client->created_at)->toISOString(),
            'updated_at' => optional($client->updated_at)->toISOString(),
            'profile' => [
                'age_group' => $profile?->age_group,
                'sex' => $profile?->sex,
                'goal_summary' => $profile?->goal_summary,
                'clinical_summary' => $profile?->clinical_summary,
                'dietary_pattern' => $profile?->dietary_pattern,
                'allergies' => $profile?->allergies,
                'exclusions' => $profile?->exclusions,
                'preferences' => $profile?->preferences,
                'cultural_notes' => $profile?->cultural_notes,
                'planning_notes' => $profile?->planning_notes,
            ],
        ];
    }

    private function serializePlan(PlanningPlan $plan, bool $includeDays = false, bool $includeVersions = false): array
    {
        $days = $plan->days->sortBy('day_index')->values();
        $mealFoods = $days->flatMap(fn ($day) => $day->meals->flatMap(fn ($meal) => $meal->foods));
        $rules = collect(array_merge(
            $this->validation()->derivedProfileRules($plan->client?->planningProfile),
            $plan->rules->sortBy(['severity', 'title'])->values()->all()
        ));
        $targets = $plan->nutrientTargets->sortBy(['nutrient_code', 'id'])->values();
        $summary = $this->aggregateFoods($mealFoods);

        $data = [
            'id' => $plan->id,
            'title' => $plan->title,
            'plan_type' => strtolower((string) $plan->plan_type),
            'status' => strtolower((string) $plan->status),
            'start_date' => optional($plan->start_date)->toDateString(),
            'days_count' => $plan->days_count,
            'cycle_length' => $plan->cycle_length,
            'notes' => $plan->notes,
            'client_id' => $plan->client_id,
            'client_display_label' => $plan->client?->display_label,
            'client_code' => $plan->client?->client_code,
            'client_profile' => $plan->client ? $this->serializeClient($plan->client)['profile'] : null,
            'assigned_nutritionist_id' => $plan->assigned_nutritionist_id,
            'assigned_nutritionist_name' => $plan->assignedNutritionist?->full_name ?: $plan->assignedNutritionist?->username,
            'created_by_id' => $plan->created_by_id,
            'created_by_name' => $plan->createdBy?->full_name ?: $plan->createdBy?->username,
            'summary' => $summary,
            'validation' => $this->validation()->buildScopeValidation('plan', $rules->all(), $targets->all(), $mealFoods, $summary),
            'effective_validation' => $this->validation()->buildEffectivePlanValidation($plan, fn ($foods) => $this->aggregateFoods($foods)),
            'rules' => $rules->map(fn ($rule) => $this->serializeRule($rule))->values(),
            'nutrient_targets' => $targets->map(fn (PlanningNutrientTarget $target) => $this->serializeTarget($target))->values(),
            'created_at' => optional($plan->created_at)->toISOString(),
            'updated_at' => optional($plan->updated_at)->toISOString(),
        ];

        if ($includeDays) {
            $data['days'] = $days->map(fn (PlanningPlanDay $day) => $this->serializeDay($day))->values();
        }
        if ($includeVersions) {
            $data['versions'] = $plan->versions->sortByDesc('version_number')->map(fn (PlanningPlanVersion $version) => [
                'id' => $version->id,
                'plan_id' => $version->plan_id,
                'version_number' => $version->version_number,
                'status' => strtolower((string) $version->status),
                'finalized_at' => optional($version->finalized_at)->toISOString(),
                'finalized_by_id' => $version->finalized_by_id,
                'created_at' => optional($version->created_at)->toISOString(),
            ])->values();
        }

        return $data;
    }

    private function serializeDay(PlanningPlanDay $day): array
    {
        $meals = $day->meals->sortBy('meal_order')->values();
        
        // Ensure all foods are loaded for each meal
        $meals->each(function ($meal) {
            if (! $meal->relationLoaded('foods')) {
                $meal->load('foods.food');
            }
        });
        
        $foods = $meals->flatMap(fn ($meal) => $meal->foods);
        $summary = array_merge($this->aggregateFoods($foods), ['meal_count' => $meals->count()]);

        return [
            'id' => $day->id,
            'day_index' => $day->day_index,
            'day_name' => $day->day_name,
            'actual_date' => optional($day->actual_date)->toDateString(),
            'template_group' => $day->template_group,
            'notes' => $day->notes,
            'summary' => $summary,
            'validation' => $this->validation()->buildScopeValidation("day-{$day->day_index}", $day->rules->all(), $day->nutrientTargets->all(), $foods, $summary),
            'rules' => $day->rules->map(fn (PlanningRule $rule) => $this->serializeRule($rule))->values(),
            'nutrient_targets' => $day->nutrientTargets->map(fn (PlanningNutrientTarget $target) => $this->serializeTarget($target))->values(),
            'meals' => $meals->map(fn (PlanningPlanMeal $meal) => $this->serializeMeal($meal))->values(),
            'created_at' => optional($day->created_at)->toISOString(),
            'updated_at' => optional($day->updated_at)->toISOString(),
        ];
    }

    private function serializeMeal(PlanningPlanMeal $meal): array
    {
        $foods = $meal->foods->sortBy(['sort_order', 'id'])->values();
        $summary = $this->aggregateFoods($foods);

        return [
            'id' => $meal->id,
            'meal_name' => $meal->meal_name,
            'meal_type' => $meal->meal_type,
            'meal_time' => $meal->meal_time,
            'meal_order' => $meal->meal_order,
            'instructions' => $meal->instructions,
            'target_notes' => $meal->target_notes,
            'summary' => $summary,
            'validation' => $this->validation()->buildScopeValidation("meal-{$meal->meal_order}", $meal->rules->all(), $meal->nutrientTargets->all(), $foods, $summary),
            'rules' => $meal->rules->map(fn (PlanningRule $rule) => $this->serializeRule($rule))->values(),
            'nutrient_targets' => $meal->nutrientTargets->map(fn (PlanningNutrientTarget $target) => $this->serializeTarget($target))->values(),
            'foods' => $foods->map(fn (PlanningMealFood $food) => $this->serializeMealFood($food))->values(),
            'created_at' => optional($meal->created_at)->toISOString(),
            'updated_at' => optional($meal->updated_at)->toISOString(),
        ];
    }

    private function serializeMealFood(PlanningMealFood $food): array
    {
        return [
            'id' => $food->id,
            'meal_id' => $food->meal_id,
            'food_id' => $food->food_id,
            'food_name' => $food->food_name,
            'food_code' => $food->food_code,
            'food_group_name' => $food->food_group_name,
            'portion_grams' => $food->portion_grams,
            'portion_description' => $food->portion_description,
            'household_measure' => $food->household_measure,
            'unit_label' => $food->unit_label,
            'preparation_state' => $food->preparation_state,
            'notes' => $food->notes,
            'sort_order' => $food->sort_order,
            'nutrient_snapshot' => $food->nutrient_snapshot,
            'calculated_nutrients' => $food->calculated_nutrients,
            'created_at' => optional($food->created_at)->toISOString(),
            'updated_at' => optional($food->updated_at)->toISOString(),
        ];
    }

    private function serializeRule($rule): array
    {
        return [
            'id' => $rule->id ?? null,
            'scope' => $rule->scope ?? null,
            'rule_type' => $rule->rule_type ?? null,
            'severity' => $rule->severity ?? null,
            'title' => $rule->title ?? null,
            'details' => $rule->details ?? null,
            'is_active' => $rule->is_active ?? true,
            'client_id' => $rule->client_id ?? null,
            'plan_id' => $rule->plan_id ?? null,
            'day_id' => $rule->day_id ?? null,
            'meal_id' => $rule->meal_id ?? null,
            'created_at' => optional($rule->created_at ?? null)->toISOString(),
            'updated_at' => optional($rule->updated_at ?? null)->toISOString(),
        ];
    }

    private function serializeTarget(PlanningNutrientTarget $target): array
    {
        return [
            'id' => $target->id,
            'plan_id' => $target->plan_id,
            'day_id' => $target->day_id,
            'meal_id' => $target->meal_id,
            'nutrient_code' => $target->nutrient_code,
            'unit' => $target->unit,
            'min_value' => $target->min_value,
            'target_value' => $target->target_value,
            'max_value' => $target->max_value,
            'created_at' => optional($target->created_at)->toISOString(),
            'updated_at' => optional($target->updated_at)->toISOString(),
        ];
    }

    private function serializeCatalogFood(Food $food, ?array $compatibility = null, array $targets = []): array
    {
        $snapshot = $this->buildNutrientSnapshot($food->nutrients);
        $summary = $this->aggregateSnapshot($snapshot);

        return [
            'id' => $food->id,
            'name' => $food->name,
            'code' => $food->code,
            'food_group_id' => $food->food_group_id,
            'food_group_name' => $food->foodGroup?->name,
            'summary' => $summary,
            'nutrient_snapshot' => $snapshot,
            'compatibility' => $compatibility ?: ['warnings' => [], 'blocked_by' => [], 'info' => [], 'hard_blocked' => false],
            'target_preview' => $this->buildTargetPreview($summary, $targets),
        ];
    }

    private function aggregateFoods($foods): array
    {
        $totals = [];
        $labels = collect(self::KEY_NUTRIENTS)->pluck('label', 'code')->all();
        $units = collect(self::KEY_NUTRIENTS)->pluck('unit', 'code')->all();
        $count = 0;

        foreach ($foods as $food) {
            $count++;
            foreach (($food->calculated_nutrients ?: []) as $code => $value) {
                $totals[$code] = round(($totals[$code] ?? 0) + (float) $value, 2);
            }
            foreach (($food->nutrient_snapshot ?: []) as $category) {
                foreach ($category as $code => $item) {
                    $labels[$code] = $item['label'] ?? $labels[$code] ?? $code;
                    $units[$code] = $item['unit'] ?? $units[$code] ?? '';
                }
            }
        }

        $orderedCodes = array_unique(array_merge(array_column(self::KEY_NUTRIENTS, 'code'), array_keys($totals)));

        return [
            'foods_count' => $count,
            'totals' => collect($orderedCodes)->filter(fn ($code) => array_key_exists($code, $totals))->map(fn ($code) => [
                'code' => $code,
                'label' => $labels[$code] ?? $code,
                'unit' => $units[$code] ?? '',
                'value' => round((float) ($totals[$code] ?? 0), 2),
            ])->values(),
            'highlights' => collect(self::KEY_NUTRIENTS)->map(fn ($item) => [
                'code' => $item['code'],
                'label' => $item['label'],
                'unit' => $units[$item['code']] ?? $item['unit'],
                'value' => round((float) ($totals[$item['code']] ?? 0), 2),
            ])->values(),
        ];
    }

    private function aggregateSnapshot(array $snapshot): array
    {
        $fakeFoods = [(object) [
            'calculated_nutrients' => $this->calculatePortionNutrients($snapshot, 100),
            'nutrient_snapshot' => $snapshot,
        ]];

        return $this->aggregateFoods($fakeFoods);
    }

    private function buildTargetPreview(array $summary, array $targets): array
    {
        $totals = collect($summary['totals'] ?? [])->keyBy('code');

        return collect($targets)->map(function (PlanningNutrientTarget $target) use ($totals): array {
            $actual = $totals->get($target->nutrient_code);

            return [
                'target_id' => $target->id,
                'nutrient_code' => $target->nutrient_code,
                'unit' => $target->unit ?: ($actual['unit'] ?? ''),
                'value' => $actual['value'] ?? null,
                'min_value' => $target->min_value,
                'target_value' => $target->target_value,
                'max_value' => $target->max_value,
            ];
        })->values()->all();
    }

    private function buildNutrientSnapshot($foodNutrients): array
    {
        $snapshot = ['macronutrients' => [], 'vitamins' => [], 'minerals' => [], 'amino_acids' => []];

        foreach ($foodNutrients as $foodNutrient) {
            /** @var FoodNutrient $foodNutrient */
            $nutrient = $foodNutrient->nutrient;
            $category = $this->nutrientCategory($foodNutrient->nutrientType?->name);
            $code = $nutrient?->name ?: (string) $foodNutrient->nutrient_id;
            $snapshot[$category][$code] = [
                'value' => round((float) ($foodNutrient->value ?: 0), 4),
                'unit' => $nutrient?->unit ?: '',
                'label' => $nutrient?->abbreviation ?: $code,
            ];
        }

        return $snapshot;
    }

    private function buildCustomSnapshot(array $nutrients): array
    {
        $snapshot = ['macronutrients' => [], 'vitamins' => [], 'minerals' => [], 'amino_acids' => []];
        foreach ($nutrients as $key => $value) {
            $code = is_array($value)
                ? strtoupper(trim((string) ($value['nutrient_code'] ?? $key)))
                : strtoupper(trim((string) $key));
            if ($code === '' || is_numeric($code)) {
                continue;
            }
            $category = $this->customSnapshotCategory($code);
            $snapshot[$category][$code] = [
                'value' => (float) (is_array($value) ? ($value['value'] ?? 0) : $value),
                'unit' => is_array($value) ? ($value['unit'] ?? '') : '',
                'label' => is_array($value) ? ($value['label'] ?: $code) : $code,
            ];
        }

        return $snapshot;
    }

    private function customSnapshotCategory(string $nutrientCode): string
    {
        $code = strtoupper(trim($nutrientCode));
        if (in_array($code, ['FE', 'CA', 'ZN', 'MG', 'K', 'P', 'CU', 'MN', 'NA', 'SE'], true)) {
            return 'minerals';
        }
        if (str_starts_with($code, 'VIT') || in_array($code, ['THIA', 'RIBF', 'NIA', 'PANT', 'FOL', 'BIOTIN', 'VITA', 'VITC', 'VITE'], true)) {
            return 'vitamins';
        }
        if (in_array($code, ['TRP', 'LYS', 'TYR', 'THR', 'ILE', 'LEU', 'MET', 'CYS', 'PHE', 'VAL', 'ARG', 'HIS', 'ALA', 'ASP', 'ASN', 'GLU', 'GLN', 'GLY', 'PRO', 'SER'], true)) {
            return 'amino_acids';
        }

        return 'macronutrients';
    }

    private function calculatePortionNutrients(array $snapshot, float $portionGrams): array
    {
        $multiplier = $portionGrams / 100;
        $totals = [];
        foreach ($snapshot as $category) {
            foreach ($category as $code => $item) {
                $totals[$code] = round((float) ($item['value'] ?? 0) * $multiplier, 2);
            }
        }

        return $totals;
    }

    private function nutrientCategory(?string $name): string
    {
        $name = strtolower((string) $name);
        if (str_contains($name, 'vitamin')) {
            return 'vitamins';
        }
        if (str_contains($name, 'mineral')) {
            return 'minerals';
        }
        if (str_contains($name, 'amino')) {
            return 'amino_acids';
        }

        return 'macronutrients';
    }

    private function normalizePortion(float $amount, ?string $unit): float
    {
        $unit = strtolower(trim((string) $unit));
        return match ($unit) {
            'kg', 'kilogram', 'kilograms' => round($amount * 1000, 2),
            'oz', 'ounce', 'ounces' => round($amount * 28.3495, 2),
            'lb', 'pound', 'pounds' => round($amount * 453.592, 2),
            default => round($amount, 2),
        };
    }

    private function rulePayload(Request $request, array $scope): array
    {
        return array_merge($scope, [
            'rule_type' => $request->input('rule_type', 'clinical'),
            'severity' => $request->input('severity', 'soft'),
            'title' => $request->input('title', 'Planning rule'),
            'details' => $request->input('details'),
            'is_active' => $request->boolean('is_active', true),
        ]);
    }

    private function targetPayload(Request $request, array $scope): array
    {
        return array_merge($scope, [
            'nutrient_code' => $request->input('nutrient_code', ''),
            'unit' => $request->input('unit'),
            'min_value' => $request->input('min_value'),
            'target_value' => $request->input('target_value'),
            'max_value' => $request->input('max_value'),
        ]);
    }

    private function validateRulePayload(Request $request): ?JsonResponse
    {
        $severity = trim((string) $request->input('severity', 'soft'));
        $ruleType = trim((string) $request->input('rule_type', ''));
        if (! in_array($severity, self::RULE_SEVERITIES, true)) {
            return response()->json(['detail' => 'Invalid rule severity. Use one of: '.implode(', ', self::RULE_SEVERITIES)], 400);
        }
        if (strlen($ruleType) < 2) {
            return response()->json(['detail' => 'Rule type is required'], 400);
        }

        return null;
    }

    private function validateTargetPayload(Request $request, ?PlanningNutrientTarget $existing = null): ?JsonResponse
    {
        $min = $request->has('min_value') ? $request->input('min_value') : $existing?->min_value;
        $target = $request->has('target_value') ? $request->input('target_value') : $existing?->target_value;
        $max = $request->has('max_value') ? $request->input('max_value') : $existing?->max_value;

        if ($min === null && $target === null && $max === null) {
            return response()->json(['detail' => 'At least one nutrient target value is required'], 400);
        }
        if ($min !== null && $max !== null && (float) $min > (float) $max) {
            return response()->json(['detail' => 'Minimum target cannot be greater than maximum target'], 400);
        }

        return null;
    }

    private function buildReplacementNote(?string $previousFoodName, string $replacementFoodName, ?string $reason): string
    {
        $note = trim("Replaced {$previousFoodName} with {$replacementFoodName}.");
        $reason = trim((string) $reason);

        return $reason !== '' ? "{$note} Reason: {$reason}" : $note;
    }

    private function cloneRulePayload(PlanningRule $rule, array $scope): array
    {
        $ruleScope = 'plan';
        if (array_key_exists('meal_id', $scope)) {
            $ruleScope = 'meal';
        } elseif (array_key_exists('day_id', $scope)) {
            $ruleScope = 'day';
        }

        return array_merge([
            'client_id' => $rule->client_id,
            'scope' => $ruleScope,
            'rule_type' => $rule->rule_type,
            'severity' => $rule->severity,
            'title' => $rule->title,
            'details' => $rule->details,
            'is_active' => $rule->is_active,
        ], $scope);
    }

    private function cloneTargetPayload(PlanningNutrientTarget $target, array $scope): array
    {
        return array_merge([
            'nutrient_code' => $target->nutrient_code,
            'unit' => $target->unit,
            'min_value' => $target->min_value,
            'target_value' => $target->target_value,
            'max_value' => $target->max_value,
        ], $scope);
    }

    private function cloneMealFoodPayload(PlanningMealFood $food, int $mealId): array
    {
        return [
            'meal_id' => $mealId,
            'food_id' => $food->food_id,
            'food_name' => $food->food_name,
            'food_code' => $food->food_code,
            'food_group_name' => $food->food_group_name,
            'portion_grams' => $food->portion_grams,
            'portion_description' => $food->portion_description,
            'household_measure' => $food->household_measure,
            'unit_label' => $food->unit_label,
            'preparation_state' => $food->preparation_state,
            'notes' => $food->notes,
            'sort_order' => $food->sort_order,
            'nutrient_snapshot' => $food->nutrient_snapshot,
            'calculated_nutrients' => $food->calculated_nutrients,
        ];
    }

    private function profilePayload(array $profile): array
    {
        return collect($profile)->only([
            'age_group',
            'sex',
            'goal_summary',
            'clinical_summary',
            'dietary_pattern',
            'allergies',
            'exclusions',
            'preferences',
            'cultural_notes',
            'planning_notes',
        ])->all();
    }

    private function enumValue(string $value): string
    {
        return strtoupper($value);
    }

    private function markDraft(?PlanningPlan $plan): void
    {
        if ($plan && (string) $plan->status !== 'ARCHIVED') {
            $plan->forceFill(['status' => 'DRAFT'])->save();
        }
    }

    private function renumberDays(int $planId): void
    {
        $plan = PlanningPlan::query()->with('days')->find($planId);
        if (! $plan) {
            return;
        }
        foreach ($plan->days->sortBy('day_index')->values() as $index => $day) {
            $day->forceFill(['day_index' => $index + 1])->save();
        }
        $plan->forceFill(['days_count' => $plan->days()->count(), 'status' => 'DRAFT'])->save();
    }

    private function emptyValidation(): array
    {
        return ['checks' => [], 'blockers_count' => 0, 'warnings_count' => 0];
    }

    private function conditionParser(): ConditionParser
    {
        return app(ConditionParser::class);
    }

    private function validation(): PlanningValidation
    {
        return app(PlanningValidation::class);
    }

    private function substitution(): PlanningSubstitution
    {
        return app(PlanningSubstitution::class);
    }
}
