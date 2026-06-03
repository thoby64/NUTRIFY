<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlanningNutrientTarget extends Model
{
    protected $table = 'planning_nutrient_targets';

    protected $fillable = [
        'plan_id',
        'day_id',
        'meal_id',
        'nutrient_code',
        'unit',
        'min_value',
        'target_value',
        'max_value',
    ];

    protected function casts(): array
    {
        return [
            'min_value' => 'float',
            'target_value' => 'float',
            'max_value' => 'float',
        ];
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(PlanningPlan::class, 'plan_id');
    }

    public function day(): BelongsTo
    {
        return $this->belongsTo(PlanningPlanDay::class, 'day_id');
    }

    public function meal(): BelongsTo
    {
        return $this->belongsTo(PlanningPlanMeal::class, 'meal_id');
    }
}
