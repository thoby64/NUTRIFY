<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlanningRule extends Model
{
    protected $table = 'planning_rules';

    protected $fillable = [
        'client_id',
        'plan_id',
        'day_id',
        'meal_id',
        'scope',
        'rule_type',
        'severity',
        'title',
        'details',
        'is_active',
    ];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(PlanningClient::class, 'client_id');
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
