<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FoodGroup extends Model
{
    const UPDATED_AT = null;

    protected $table = 'food_groups';

    protected $fillable = ['name', 'description', 'created_at'];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }

    public function foods(): HasMany
    {
        return $this->hasMany(Food::class);
    }
}
