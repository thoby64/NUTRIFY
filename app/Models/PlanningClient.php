<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class PlanningClient extends Model
{
    protected $table = 'planning_clients';

    protected $fillable = [
        'client_code',
        'display_label',
        'privacy_tier',
        'assigned_nutritionist_id',
        'created_by_id',
        'status',
        'notes',
    ];

    public function assignedNutritionist(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_nutritionist_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function planningProfile(): HasOne
    {
        return $this->hasOne(ClientPlanningProfile::class, 'client_id');
    }

    public function plans(): HasMany
    {
        return $this->hasMany(PlanningPlan::class, 'client_id');
    }
}
