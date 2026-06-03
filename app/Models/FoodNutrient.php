<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FoodNutrient extends Model
{
    const UPDATED_AT = null;

    protected $table = 'food_nutrients';

    protected $fillable = [
        'food_id',
        'nutrient_id',
        'nutrient_type_id',
        'value',
        'per_unit',
        'data_source',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'float',
            'created_at' => 'datetime',
        ];
    }

    public function food(): BelongsTo
    {
        return $this->belongsTo(Food::class);
    }

    public function nutrient(): BelongsTo
    {
        return $this->belongsTo(Nutrient::class);
    }

    public function nutrientType(): BelongsTo
    {
        return $this->belongsTo(NutrientType::class);
    }
}
