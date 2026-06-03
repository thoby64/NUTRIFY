<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlanningPlanVersion extends Model
{
    const UPDATED_AT = null;

    protected $table = 'planning_plan_versions';

    protected $fillable = ['plan_id', 'version_number', 'status', 'snapshot_json', 'finalized_at', 'finalized_by_id'];

    protected function casts(): array
    {
        return [
            'version_number' => 'integer',
            'snapshot_json' => 'array',
            'finalized_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(PlanningPlan::class, 'plan_id');
    }

    public function finalizedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'finalized_by_id');
    }
}
