<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientPlanningProfile extends Model
{
    protected $table = 'client_planning_profiles';

    protected $fillable = [
        'client_id',
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
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(PlanningClient::class, 'client_id');
    }
}
