<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Food;
use App\Models\FoodGroup;
use App\Models\FoodNutrient;
use App\Models\Nutrient;
use App\Models\NutrientType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CatalogController extends Controller
{
    public function foodGroups(Request $request): JsonResponse
    {
        $query = FoodGroup::query()->withCount('foods');
        if ($search = $request->query('search')) {
            $query->where(function ($query) use ($search): void {
                $query->where('name', 'ilike', "%{$search}%")
                    ->orWhere('description', 'ilike', "%{$search}%");
            });
        }

        $total = (clone $query)->count();
        $rows = $query->orderBy('name')
            ->offset((int) $request->query('skip', 0))
            ->limit(min((int) $request->query('limit', 50), 1000))
            ->get()
            ->map(fn (FoodGroup $group) => [
                'id' => $group->id,
                'name' => $group->name,
                'description' => $group->description,
                'foods_count' => $group->foods_count,
            ]);

        return response()->json(['total' => $total, 'total_count' => $total, 'data' => $rows, 'groups' => $rows]);
    }

    public function nutrientTypes(Request $request): JsonResponse
    {
        $query = NutrientType::query()->withCount('nutrients');
        if ($search = $request->query('search')) {
            $query->where(function ($query) use ($search): void {
                $query->where('name', 'ilike', "%{$search}%")
                    ->orWhere('category', 'ilike', "%{$search}%");
            });
        }

        $total = (clone $query)->count();
        $rows = $query->with('nutrients')
            ->orderBy('name')
            ->offset((int) $request->query('skip', 0))
            ->limit(min((int) $request->query('limit', 50), 1000))
            ->get()
            ->map(fn (NutrientType $type) => [
                'id' => $type->id,
                'name' => $type->name,
                'category' => $type->category,
                'nutrients_count' => $type->nutrients_count,
                'nutrients' => $type->nutrients->map(fn (Nutrient $nutrient) => [
                    'id' => $nutrient->id,
                    'name' => $nutrient->name,
                    'abbreviation' => $nutrient->abbreviation,
                    'unit' => $nutrient->unit,
                    'nutrient_type_id' => $nutrient->nutrient_type_id,
                ])->values(),
            ]);

        return response()->json(['total' => $total, 'total_count' => $total, 'data' => $rows, 'types' => $rows]);
    }

    public function foods(Request $request): JsonResponse
    {
        $query = Food::query()->with('foodGroup')->withCount('nutrients');
        if ($request->query('food_group_id')) {
            $query->where('food_group_id', (int) $request->query('food_group_id'));
        }
        if ($search = $request->query('search')) {
            $query->where('name', 'ilike', "%{$search}%");
        }

        $total = (clone $query)->count();
        $rows = $query->orderBy('name')
            ->offset((int) $request->query('skip', 0))
            ->limit(min((int) $request->query('limit', 50), 1000))
            ->get()
            ->map(fn (Food $food) => [
                'id' => $food->id,
                'name' => $food->name,
                'code' => $food->code,
                'description' => $food->description,
                'food_group_id' => $food->food_group_id,
                'food_group_name' => $food->foodGroup?->name,
                'nutrients_count' => $food->nutrients_count,
                'created_at' => optional($food->created_at)->toISOString(),
            ]);

        return response()->json([
            'total' => $total,
            'total_count' => $total,
            'data' => $rows,
            'foods' => $rows,
            'skip' => (int) $request->query('skip', 0),
            'limit' => min((int) $request->query('limit', 50), 1000),
        ]);
    }

    public function searchFoods(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'food_group_id' => ['nullable', 'integer'],
            'search_name' => ['nullable', 'string'],
            'nutrient_conditions' => ['nullable', 'array'],
            'nutrient_conditions.*.nutrient_id' => ['required_with:nutrient_conditions', 'integer'],
            'nutrient_conditions.*.operator' => ['nullable', 'string'],
            'nutrient_conditions.*.min_value' => ['nullable', 'numeric'],
            'nutrient_conditions.*.max_value' => ['nullable', 'numeric'],
            'sort_by_nutrient_id' => ['nullable', 'integer'],
            'sort_order' => ['nullable', 'string'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:1000'],
            'offset' => ['nullable', 'integer', 'min:0'],
        ]);

        $query = Food::query()->with('foodGroup');

        if (! empty($payload['food_group_id'])) {
            $query->where('food_group_id', (int) $payload['food_group_id']);
        }

        if (! empty($payload['search_name'])) {
            $query->where('name', 'ilike', '%'.$payload['search_name'].'%');
        }

        foreach ($payload['nutrient_conditions'] ?? [] as $condition) {
            $subquery = FoodNutrient::query()->select('food_id')
                ->where('nutrient_id', (int) $condition['nutrient_id']);

            $operator = $condition['operator'] ?? 'range';
            if ($operator === 'range') {
                if (array_key_exists('min_value', $condition) && $condition['min_value'] !== null) {
                    $subquery->where('value', '>=', (float) $condition['min_value']);
                }
                if (array_key_exists('max_value', $condition) && $condition['max_value'] !== null) {
                    $subquery->where('value', '<=', (float) $condition['max_value']);
                }
            } elseif ($operator === 'min') {
                $subquery->where('value', '>=', (float) ($condition['min_value'] ?? 0));
            } elseif ($operator === 'max') {
                $subquery->where('value', '<=', (float) ($condition['max_value'] ?? $condition['min_value'] ?? 0));
            } elseif ($operator === 'equals') {
                $subquery->where('value', '=', (float) ($condition['min_value'] ?? 0));
            }

            $query->whereIn('id', $subquery);
        }

        $total = (clone $query)->count();

        if (! empty($payload['sort_by_nutrient_id'])) {
            $sortDirection = strtolower($payload['sort_order'] ?? 'desc') === 'asc' ? 'asc' : 'desc';
            $query->leftJoin('food_nutrients as sort_values', function ($join) use ($payload): void {
                $join->on('foods.id', '=', 'sort_values.food_id')
                    ->where('sort_values.nutrient_id', '=', (int) $payload['sort_by_nutrient_id']);
            })
                ->select('foods.*')
                ->orderByRaw('sort_values.value '.$sortDirection.' NULLS LAST');
        } else {
            $query->orderBy('name');
        }

        $limit = (int) ($payload['limit'] ?? 50);
        $offset = (int) ($payload['offset'] ?? 0);
        $foods = $query->offset($offset)->limit($limit)->get()
            ->map(fn (Food $food) => $this->serializeFoodComplete($food, false));

        return response()->json([
            'total_count' => $total,
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
            'foods' => $foods,
            'data' => $foods,
        ]);
    }

    public function foodDetails(Food $food): JsonResponse
    {
        return response()->json($this->serializeFoodComplete($food, true));
    }

    public function nutrients(Request $request): JsonResponse
    {
        $query = Nutrient::query()->with('nutrientType');
        if ($search = $request->query('search')) {
            $query->where('name', 'ilike', "%{$search}%")
                ->orWhere('abbreviation', 'ilike', "%{$search}%");
        }

        $total = (clone $query)->count();
        $counts = FoodNutrient::query()
            ->selectRaw('nutrient_id, count(*) as total')
            ->groupBy('nutrient_id')
            ->pluck('total', 'nutrient_id');

        $rows = $query->orderBy('name')
            ->offset((int) $request->query('skip', 0))
            ->limit(min((int) $request->query('limit', 50), 1000))
            ->get()
            ->map(fn (Nutrient $nutrient) => [
                'id' => $nutrient->id,
                'name' => $nutrient->name,
                'abbreviation' => $nutrient->abbreviation,
                'unit' => $nutrient->unit,
                'nutrient_type_id' => $nutrient->nutrient_type_id,
                'nutrient_type_name' => $nutrient->nutrientType?->name,
                'nutrients_count' => (int) ($counts[$nutrient->id] ?? 0),
            ]);

        return response()->json([
            'total' => $total,
            'total_count' => $total,
            'skip' => (int) $request->query('skip', 0),
            'limit' => min((int) $request->query('limit', 50), 1000),
            'data' => $rows,
            'nutrients' => $rows,
        ]);
    }

    public function foodNutrients(Request $request): JsonResponse
    {
        $query = FoodNutrient::query()->with(['food', 'nutrient', 'nutrientType']);

        if ($request->query('nutrient_id')) {
            $query->where('nutrient_id', (int) $request->query('nutrient_id'));
        }

        $total = (clone $query)->count();
        $limit = min((int) $request->query('limit', 50), 1000);
        $skip = (int) $request->query('skip', 0);

        $rows = $query->orderBy('id')
            ->offset($skip)
            ->limit($limit)
            ->get()
            ->map(fn (FoodNutrient $value) => [
                'id' => $value->id,
                'food_id' => $value->food_id,
                'food_name' => $value->food?->name,
                'nutrient_id' => $value->nutrient_id,
                'nutrient_type_id' => $value->nutrient_type_id,
                'nutrient_name' => $value->nutrient?->name,
                'nutrient_unit' => $value->nutrient?->unit,
                'nutrient_type_name' => $value->nutrientType?->name,
                'value' => $value->value,
                'per_unit' => $value->per_unit,
                'data_source' => $value->data_source,
            ]);

        return response()->json([
            'total' => $total,
            'total_count' => $total,
            'skip' => $skip,
            'limit' => $limit,
            'data' => $rows,
        ]);
    }

    public function dashboardStats(): JsonResponse
    {
        return response()->json([
            'foods' => Food::query()->count(),
            'food_groups' => FoodGroup::query()->count(),
            'nutrients' => Nutrient::query()->count(),
            'nutrient_types' => NutrientType::query()->count(),
            'food_nutrients' => FoodNutrient::query()->count(),
        ]);
    }

    private function serializeFoodComplete(Food $food, bool $includeEmptyGroups): array
    {
        $food->loadMissing('foodGroup');

        $nutrientRows = FoodNutrient::query()
            ->where('food_id', $food->id)
            ->join('nutrients', 'food_nutrients.nutrient_id', '=', 'nutrients.id')
            ->join('nutrient_types', 'food_nutrients.nutrient_type_id', '=', 'nutrient_types.id')
            ->orderBy('nutrient_types.name')
            ->orderBy('nutrients.name')
            ->get([
                'food_nutrients.id',
                'food_nutrients.value',
                'food_nutrients.per_unit',
                'food_nutrients.nutrient_id',
                'food_nutrients.nutrient_type_id',
                'food_nutrients.data_source',
                'nutrients.name as nutrient_name',
                'nutrients.unit as nutrient_unit',
                'nutrient_types.name as nutrient_type_name',
            ]);

        $types = $includeEmptyGroups
            ? NutrientType::query()->orderBy('name')->get()
            : NutrientType::query()->whereIn('id', $nutrientRows->pluck('nutrient_type_id')->unique())->orderBy('name')->get();

        $groups = $types->map(function (NutrientType $type) use ($nutrientRows) {
            $rows = $nutrientRows->where('nutrient_type_id', $type->id)->values();

            return [
                'nutrient_type_id' => $type->id,
                'nutrient_type_name' => $type->name,
                'nutrients' => $rows->map(fn ($row) => [
                    'id' => $row->id,
                    'value' => $row->value,
                    'per_unit' => $row->per_unit,
                    'nutrient_id' => $row->nutrient_id,
                    'nutrient_type_id' => $row->nutrient_type_id,
                    'nutrient_name' => $row->nutrient_name,
                    'nutrient_unit' => $row->nutrient_unit,
                    'nutrient_type_name' => $row->nutrient_type_name,
                    'data_source' => $row->data_source,
                ])->all(),
            ];
        });

        return [
            'id' => $food->id,
            'name' => $food->name,
            'code' => $food->code,
            'description' => $food->description,
            'food_group_id' => $food->food_group_id,
            'food_group_name' => $food->foodGroup?->name ?? '',
            'nutrient_groups' => $groups,
            'created_at' => optional($food->created_at)->toISOString(),
        ];
    }
}
