<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PlanningPlanMeal extends Model
{
    protected $table = 'planning_plan_meals';

    protected $fillable = [
        'day_id',
        'meal_name',
        'meal_type',
        'meal_time',
        'meal_order',
        'instructions',
        'target_notes',
    ];

    protected function casts(): array
    {
        return ['meal_order' => 'integer'];
    }

    public function day(): BelongsTo
    {
        return $this->belongsTo(PlanningPlanDay::class, 'day_id');
    }

    public function foods(): HasMany
    {
        return $this->hasMany(PlanningMealFood::class, 'meal_id');
    }

    public function rules(): HasMany
    {
        return $this->hasMany(PlanningRule::class, 'meal_id');
    }

    public function nutrientTargets(): HasMany
    {
        return $this->hasMany(PlanningNutrientTarget::class, 'meal_id');
    }
}
