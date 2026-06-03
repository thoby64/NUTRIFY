<?php

namespace App\Services\Planning;

use App\Models\Food;
use App\Models\FoodNutrient;
use App\Models\Nutrient;
use Illuminate\Database\Eloquent\Builder;

class ConditionParser
{
    private const NUTRIENT_MAPPING = [
        'calories' => 'ENERGY_KC',
        'calorie' => 'ENERGY_KC',
        'energy' => 'ENERGY_KC',
        'energies' => 'ENERGY_KC',
        'kcal' => 'ENERGY_KC',
        'kilocalorie' => 'ENERGY_KC',
        'kilocalories' => 'ENERGY_KC',
        'kj' => 'ENERGY_KC',
        'kilojoule' => 'ENERGY_KC',
        'kilojoules' => 'ENERGY_KC',
        'protein' => 'PROCNT',
        'prot' => 'PROCNT',
        'fat' => 'FAT',
        'fats' => 'FAT',
        'lipid' => 'FAT',
        'lipids' => 'FAT',
        'carbs' => 'CHOCDF',
        'carb' => 'CHOCDF',
        'carbohydrates' => 'CHOCDF',
        'carbohydrate' => 'CHOCDF',
        'fiber' => 'FIBTG',
        'fibre' => 'FIBTG',
        'sugars' => 'SUGAR',
        'water' => 'WATER',
        'iron' => 'FE',
        'fe' => 'FE',
        'calcium' => 'CA',
        'ca' => 'CA',
        'zinc' => 'ZN',
        'zn' => 'ZN',
        'magnesium' => 'MG',
        'mg' => 'MG',
        'potassium' => 'K',
        'k' => 'K',
        'phosphorus' => 'P',
        'p' => 'P',
        'copper' => 'CU',
        'cu' => 'CU',
        'manganese' => 'MN',
        'mn' => 'MN',
        'sodium' => 'NA',
        'na' => 'NA',
        'selenium' => 'SE',
        'se' => 'SE',
        'vitamin a' => 'VITA',
        'vita' => 'VITA',
        'vitamin c' => 'VITC',
        'vitc' => 'VITC',
        'vitamin d' => 'VITD',
        'vitd' => 'VITD',
        'vitamin e' => 'VITE',
        'vite' => 'VITE',
        'thiamine' => 'THIA',
        'thia' => 'THIA',
        'vitamin b1' => 'THIA',
        'riboflavin' => 'RIBF',
        'ribf' => 'RIBF',
        'vitamin b2' => 'RIBF',
        'niacin' => 'NIA',
        'nia' => 'NIA',
        'vitamin b3' => 'NIA',
        'pantothenic' => 'PANT',
        'pant' => 'PANT',
        'vitamin b5' => 'PANT',
        'pyridoxine' => 'VIT B6',
        'vitamin b6' => 'VIT B6',
        'b6' => 'VIT B6',
        'cobalamin' => 'VIT B12',
        'vitamin b12' => 'VIT B12',
        'b12' => 'VIT B12',
        'folate' => 'FOL',
        'fol' => 'FOL',
        'vitamin b9' => 'FOL',
        'biotin' => 'BIOTIN',
        'tryptophan' => 'TRP',
        'trp' => 'TRP',
        'lysine' => 'LYS',
        'lys' => 'LYS',
        'tyrosine' => 'TYR',
        'tyr' => 'TYR',
        'threonine' => 'THR',
        'thr' => 'THR',
        'isoleucine' => 'ILE',
        'ile' => 'ILE',
        'leucine' => 'LEU',
        'leu' => 'LEU',
        'methionine' => 'MET',
        'met' => 'MET',
        'cysteine' => 'CYS',
        'cys' => 'CYS',
        'phenylalanine' => 'PHE',
        'phe' => 'PHE',
        'valine' => 'VAL',
        'val' => 'VAL',
        'arginine' => 'ARG',
        'arg' => 'ARG',
        'histidine' => 'HIS',
        'his' => 'HIS',
        'alanine' => 'ALA',
        'ala' => 'ALA',
        'aspartic' => 'ASP',
        'asp' => 'ASP',
        'asparagine' => 'ASN',
        'asn' => 'ASN',
        'glutamic' => 'GLU',
        'glu' => 'GLU',
        'glutamine' => 'GLN',
        'gln' => 'GLN',
        'glycine' => 'GLY',
        'gly' => 'GLY',
        'proline' => 'PRO',
        'pro' => 'PRO',
        'serine' => 'SER',
        'ser' => 'SER',
    ];

    private const MASS_UNIT_FACTORS = [
        'g' => 1.0,
        'gram' => 1.0,
        'grams' => 1.0,
        'mg' => 0.001,
        'milligram' => 0.001,
        'milligrams' => 0.001,
        'mcg' => 0.000001,
        'ug' => 0.000001,
        'microgram' => 0.000001,
        'micrograms' => 0.000001,
    ];

    private const ENERGY_UNIT_FACTORS = [
        'kcal' => 1.0,
        'cal' => 1.0,
        'kj' => 0.239006,
    ];

    public function aliasReference(): array
    {
        $aliases = [];
        foreach (self::NUTRIENT_MAPPING as $alias => $code) {
            $aliases[$code][] = $alias;
        }

        return collect($aliases)->map(fn (array $items) => collect($items)->unique()->sort()->values())->all();
    }

    public function parse(?string $conditionString): array
    {
        if (! trim((string) $conditionString)) {
            return [];
        }

        $conditions = [];
        foreach (explode(',', (string) $conditionString) as $rawCondition) {
            $rawCondition = trim($rawCondition);
            if ($rawCondition === '') {
                continue;
            }
            array_push($conditions, ...$this->parseSingle($rawCondition));
        }

        return $conditions;
    }

    public function describe(array $conditions): array
    {
        return collect($conditions)->map(fn (array $condition) => [
            'nutrient_code' => $condition['nutrient_code'],
            'nutrient_name' => $condition['nutrient_code'],
            'original_input' => $condition['original_nutrient'],
            'operator' => $condition['operator'],
            'value' => rtrim(rtrim(sprintf('%.6F', $condition['value']), '0'), '.'),
            'unit' => $condition['input_unit'] ?? '',
        ])->values()->all();
    }

    public function matchingFoodIds(array $conditions, string $mode = 'all'): array
    {
        if (! $conditions) {
            return Food::query()->pluck('id')->all();
        }

        $mode = strtolower(trim($mode ?: 'all'));
        if (! in_array($mode, ['all', 'any'], true)) {
            throw new \InvalidArgumentException('Condition mode must be either all or any.');
        }

        $sets = collect($conditions)->map(function (array $condition): array {
            return FoodNutrient::query()
                ->whereHas('nutrient', function (Builder $query) use ($condition): void {
                    $query->where('name', $condition['nutrient_code'])
                        ->orWhere('abbreviation', $condition['nutrient_code']);
                })
                ->where('value', $this->sqlOperator($condition['operator']), $this->convertConditionValue($condition))
                ->pluck('food_id')
                ->all();
        })->values();

        if ($mode === 'any') {
            return $sets->flatten()->unique()->values()->all();
        }

        return $sets->reduce(function (?array $carry, array $ids): array {
            return $carry === null ? array_values(array_unique($ids)) : array_values(array_intersect($carry, $ids));
        });
    }

    private function parseSingle(string $condition): array
    {
        if (preg_match('/^([a-zA-Z0-9_\-\s]+?)\s*(<=|>=|=|<|>)\s*(-?\d+(?:\.\d+)?)\s*([a-zA-Z%]+)?$/', $condition, $match)) {
            return [[
                'nutrient_code' => $this->mapNutrientName($match[1]),
                'operator' => $match[2],
                'value' => (float) $match[3],
                'original_nutrient' => strtolower(trim($match[1])),
                'input_unit' => isset($match[4]) ? strtolower($match[4]) : null,
            ]];
        }

        if (preg_match('/^([a-zA-Z0-9_\-\s]+?)\s+(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*([a-zA-Z%]+)?$/', $condition, $match)) {
            $min = (float) $match[2];
            $max = (float) $match[3];
            if ($min > $max) {
                throw new \InvalidArgumentException("Invalid range for '{$match[1]}': {$min}-{$max} (min > max)");
            }
            $code = $this->mapNutrientName($match[1]);
            $unit = isset($match[4]) ? strtolower($match[4]) : null;

            return [
                ['nutrient_code' => $code, 'operator' => '>=', 'value' => $min, 'original_nutrient' => strtolower(trim($match[1])), 'input_unit' => $unit],
                ['nutrient_code' => $code, 'operator' => '<=', 'value' => $max, 'original_nutrient' => strtolower(trim($match[1])), 'input_unit' => $unit],
            ];
        }

        throw new \InvalidArgumentException("Invalid condition format: '{$condition}'. Use format: 'nutrient operator value' or 'nutrient min-max'");
    }

    private function mapNutrientName(string $nutrientName): string
    {
        [$lookup, $suggestions] = $this->buildLookup();
        $normalized = $this->normalizeLookupKey($nutrientName);
        $compact = str_replace(' ', '', $normalized);

        if (isset($lookup[$normalized])) {
            return $lookup[$normalized];
        }
        if (isset($lookup[$compact])) {
            return $lookup[$compact];
        }

        $matches = [];
        foreach ($suggestions as $key => $display) {
            if ($normalized && (str_contains($key, $normalized) || str_contains($normalized, $key) || $compact === str_replace(' ', '', $key))) {
                $matches[$display] = $display;
            }
        }

        if (count($matches) === 1) {
            return $lookup[$this->normalizeLookupKey(reset($matches))] ?? $lookup[str_replace(' ', '', $this->normalizeLookupKey(reset($matches)))] ?? throw new \InvalidArgumentException("Unknown nutrient: '{$nutrientName}'.");
        }
        if ($matches) {
            throw new \InvalidArgumentException("Unknown nutrient: '{$nutrientName}'. Did you mean one of: ".implode(', ', array_slice(array_values($matches), 0, 5)).'?');
        }

        throw new \InvalidArgumentException("Unknown nutrient: '{$nutrientName}'. Use a database nutrient code like 'ENERGY_KC' or a known alias like 'calories', 'protein', or 'sodium'.");
    }

    private function buildLookup(): array
    {
        $lookup = [];
        $suggestions = [];
        foreach (self::NUTRIENT_MAPPING as $alias => $code) {
            $this->registerAlias($lookup, $suggestions, $alias, $code, $alias);
        }

        Nutrient::query()->select(['name', 'abbreviation'])->get()->each(function (Nutrient $nutrient) use (&$lookup, &$suggestions): void {
            $code = strtoupper(trim((string) $nutrient->name));
            if ($code === '') {
                return;
            }
            $this->registerAlias($lookup, $suggestions, $code, $code, $code);
            $this->registerAlias($lookup, $suggestions, $nutrient->abbreviation, $code, $nutrient->abbreviation ?: $code);
        });

        return [$lookup, $suggestions];
    }

    private function registerAlias(array &$lookup, array &$suggestions, ?string $alias, string $code, ?string $display = null): void
    {
        if (! $alias) {
            return;
        }
        $normalized = $this->normalizeLookupKey($alias);
        $compact = str_replace(' ', '', $normalized);
        if ($normalized !== '') {
            $lookup[$normalized] ??= strtoupper($code);
            $suggestions[$normalized] ??= trim($display ?: $alias);
        }
        if ($compact !== '' && $compact !== $normalized) {
            $lookup[$compact] ??= strtoupper($code);
        }
    }

    private function normalizeLookupKey(string $value): string
    {
        $normalized = strtolower(trim(preg_replace('/[_-]+/', ' ', $value) ?: ''));
        $normalized = preg_replace('/[^a-z0-9\s]+/', ' ', $normalized) ?: '';
        return trim(preg_replace('/\s+/', ' ', $normalized) ?: '');
    }

    private function sqlOperator(string $operator): string
    {
        return $operator === '=' ? '=' : $operator;
    }

    private function convertConditionValue(array $condition): float
    {
        $unit = strtolower((string) ($condition['input_unit'] ?? ''));
        $value = (float) $condition['value'];

        if ($unit && array_key_exists($unit, self::MASS_UNIT_FACTORS)) {
            $baseGrams = $value * self::MASS_UNIT_FACTORS[$unit];
            return match ($this->expectedUnitForNutrient($condition['nutrient_code'])) {
                'g' => $baseGrams,
                'mg' => $baseGrams * 1000,
                'mcg' => $baseGrams * 1000000,
                default => $value,
            };
        }

        if ($unit && array_key_exists($unit, self::ENERGY_UNIT_FACTORS)) {
            $kcal = $value * self::ENERGY_UNIT_FACTORS[$unit];
            return $this->expectedUnitForNutrient($condition['nutrient_code']) === 'kj'
                ? $kcal / self::ENERGY_UNIT_FACTORS['kj']
                : $kcal;
        }

        return $value;
    }

    private function expectedUnitForNutrient(string $code): string
    {
        $code = strtoupper($code);
        if ($code === 'ENERGY_KC') {
            return 'kcal';
        }
        if (in_array($code, ['NA', 'K', 'CA', 'P', 'MG', 'FE', 'ZN', 'CU', 'MN'], true)) {
            return 'mg';
        }
        if (in_array($code, ['SE', 'VITA', 'FOL', 'VIT B12'], true)) {
            return 'mcg';
        }

        return 'g';
    }
}
