<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class NutrientType extends Model
{
    const UPDATED_AT = null;

    protected $table = 'nutrient_types';

    protected $fillable = ['name', 'category', 'description', 'created_at'];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }

    public function nutrients(): HasMany
    {
        return $this->hasMany(Nutrient::class);
    }
}
