<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    protected $table = 'users';

    protected $fillable = [
        'username',
        'email',
        'password_hash',
        'full_name',
        'role',
        'is_active',
        'created_by_id',
        'last_login',
    ];

    protected $hidden = [
        'password_hash',
    ];

    public function getAuthPassword(): string
    {
        return $this->password_hash;
    }

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'last_login' => 'datetime',
        ];
    }

    public function roleValue(): string
    {
        return strtolower((string) $this->role);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function createdUsers(): HasMany
    {
        return $this->hasMany(User::class, 'created_by_id');
    }

    public function assignedPlanningClients(): HasMany
    {
        return $this->hasMany(PlanningClient::class, 'assigned_nutritionist_id');
    }

    public function createdPlanningPlans(): HasMany
    {
        return $this->hasMany(PlanningPlan::class, 'created_by_id');
    }

    public function assignedPlanningPlans(): HasMany
    {
        return $this->hasMany(PlanningPlan::class, 'assigned_nutritionist_id');
    }
}
