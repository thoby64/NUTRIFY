<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlanningMealFood extends Model
{
    protected $table = 'planning_meal_foods';

    protected $fillable = [
        'meal_id',
        'food_id',
        'food_name',
        'food_code',
        'food_group_name',
        'portion_grams',
        'portion_description',
        'household_measure',
        'unit_label',
        'preparation_state',
        'notes',
        'sort_order',
        'nutrient_snapshot',
        'calculated_nutrients',
    ];

    protected function casts(): array
    {
        return [
            'portion_grams' => 'float',
            'sort_order' => 'integer',
            'nutrient_snapshot' => 'array',
            'calculated_nutrients' => 'array',
        ];
    }

    public function meal(): BelongsTo
    {
        return $this->belongsTo(PlanningPlanMeal::class, 'meal_id');
    }

    public function food(): BelongsTo
    {
        return $this->belongsTo(Food::class);
    }
}
