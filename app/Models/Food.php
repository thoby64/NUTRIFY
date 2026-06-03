<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Food extends Model
{
    const UPDATED_AT = null;

    protected $table = 'foods';

    protected $fillable = ['food_group_id', 'name', 'code', 'description', 'created_at'];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }

    public function foodGroup(): BelongsTo
    {
        return $this->belongsTo(FoodGroup::class);
    }

    public function nutrients(): HasMany
    {
        return $this->hasMany(FoodNutrient::class);
    }
}
