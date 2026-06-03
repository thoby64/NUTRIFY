<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Nutrient extends Model
{
    const UPDATED_AT = null;

    protected $table = 'nutrients';

    protected $fillable = ['nutrient_type_id', 'name', 'unit', 'abbreviation', 'description', 'created_at'];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }

    public function nutrientType(): BelongsTo
    {
        return $this->belongsTo(NutrientType::class);
    }

    public function foodNutrients(): HasMany
    {
        return $this->hasMany(FoodNutrient::class);
    }
}
