<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PlanningPlanDay extends Model
{
    protected $table = 'planning_plan_days';

    protected $fillable = ['plan_id', 'day_index', 'day_name', 'actual_date', 'template_group', 'notes'];

    protected function casts(): array
    {
        return [
            'actual_date' => 'date',
            'day_index' => 'integer',
        ];
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(PlanningPlan::class, 'plan_id');
    }

    public function meals(): HasMany
    {
        return $this->hasMany(PlanningPlanMeal::class, 'day_id');
    }

    public function rules(): HasMany
    {
        return $this->hasMany(PlanningRule::class, 'day_id');
    }

    public function nutrientTargets(): HasMany
    {
        return $this->hasMany(PlanningNutrientTarget::class, 'day_id');
    }
}
