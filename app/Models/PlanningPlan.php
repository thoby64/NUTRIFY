<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PlanningPlan extends Model
{
    protected $table = 'planning_plans';

    protected $fillable = [
        'client_id',
        'created_by_id',
        'assigned_nutritionist_id',
        'title',
        'plan_type',
        'start_date',
        'days_count',
        'cycle_length',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'days_count' => 'integer',
            'cycle_length' => 'integer',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(PlanningClient::class, 'client_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function assignedNutritionist(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_nutritionist_id');
    }

    public function days(): HasMany
    {
        return $this->hasMany(PlanningPlanDay::class, 'plan_id');
    }

    public function versions(): HasMany
    {
        return $this->hasMany(PlanningPlanVersion::class, 'plan_id');
    }

    public function rules(): HasMany
    {
        return $this->hasMany(PlanningRule::class, 'plan_id');
    }

    public function nutrientTargets(): HasMany
    {
        return $this->hasMany(PlanningNutrientTarget::class, 'plan_id');
    }
}
