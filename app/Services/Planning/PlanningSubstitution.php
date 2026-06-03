<?php

namespace App\Services\Planning;

class PlanningSubstitution
{
    private const KEY_NUTRIENTS = [
        ['code' => 'ENERGY_KC', 'label' => 'Energy', 'unit' => 'kcal', 'weight' => 0.30],
        ['code' => 'PROCNT', 'label' => 'Protein', 'unit' => 'g', 'weight' => 0.28],
        ['code' => 'CHOCDF', 'label' => 'Carbohydrates', 'unit' => 'g', 'weight' => 0.18],
        ['code' => 'FAT', 'label' => 'Fat', 'unit' => 'g', 'weight' => 0.16],
        ['code' => 'FIBTG', 'label' => 'Fiber', 'unit' => 'g', 'weight' => 0.08],
    ];

    public function score(array $current, array $candidate, bool $sameGroup = false, bool $sameExchange = false): float
    {
        $weightedDifference = 0.0;
        foreach (self::KEY_NUTRIENTS as $nutrient) {
            $currentValue = (float) ($current[$nutrient['code']] ?? 0);
            $candidateValue = (float) ($candidate[$nutrient['code']] ?? 0);
            $weightedDifference += $this->relativeDifference($currentValue, $candidateValue) * $nutrient['weight'];
        }

        $score = max(0.0, 100.0 - min($weightedDifference * 100.0, 100.0));
        if ($sameGroup) {
            $score = min(100.0, $score + 6.0);
        }
        if ($sameExchange) {
            $score = min(100.0, $score + 8.0);
        }

        return round($score, 1);
    }

    public function deltas(array $current, array $candidate): array
    {
        return collect(self::KEY_NUTRIENTS)->map(function (array $nutrient) use ($current, $candidate): array {
            $currentValue = (float) ($current[$nutrient['code']] ?? 0);
            $candidateValue = (float) ($candidate[$nutrient['code']] ?? 0);

            return [
                'code' => $nutrient['code'],
                'label' => $nutrient['label'],
                'unit' => $nutrient['unit'],
                'current_value' => round($currentValue, 2),
                'candidate_value' => round($candidateValue, 2),
                'delta' => round($candidateValue - $currentValue, 2),
            ];
        })->values()->all();
    }

    public function summary(array $deltas): string
    {
        if (! $deltas) {
            return 'Alternative nutrient profile available.';
        }

        $closest = collect($deltas)->sortBy(fn (array $item) => abs((float) $item['delta']))->take(2);
        $closeBits = $closest->filter(fn (array $item) => abs((float) $item['delta']) <= max(abs((float) $item['current_value']) * 0.15, 2.0))
            ->map(fn (array $item) => strtolower($item['label']).' stays close')
            ->values()
            ->all();
        if ($closeBits) {
            return ucfirst(implode(', ', $closeBits)).'.';
        }

        $biggest = collect($deltas)->sortByDesc(fn (array $item) => abs((float) $item['delta']))->first();
        if (($biggest['delta'] ?? 0) > 0) {
            return 'Higher '.strtolower($biggest['label']).' than the current choice.';
        }
        if (($biggest['delta'] ?? 0) < 0) {
            return 'Lower '.strtolower($biggest['label']).' than the current choice.';
        }

        return 'Very close overall nutrient profile.';
    }

    public function exchangeCategory(array $nutrients, ?string $foodGroupName = null): string
    {
        $energy = (float) ($nutrients['ENERGY_KC'] ?? 0);
        $protein = (float) ($nutrients['PROCNT'] ?? 0);
        $carbs = (float) ($nutrients['CHOCDF'] ?? 0);
        $fat = (float) ($nutrients['FAT'] ?? 0);
        $fiber = (float) ($nutrients['FIBTG'] ?? 0);
        $group = strtolower((string) $foodGroupName);

        if ($protein >= 15 && $carbs <= 15) {
            return 'lean_protein';
        }
        if ($fat >= 12 && $protein < 12 && $carbs < 15) {
            return 'fat_source';
        }
        if ($carbs >= 15 && $fiber >= 3) {
            return 'high_fiber_carb';
        }
        if ($carbs >= 15) {
            return 'starchy_carb';
        }
        if (str_contains($group, 'fruit') || str_contains($group, 'vegetable') || $fiber >= 2) {
            return 'fruit_veg';
        }
        if ($energy && $protein >= 8 && $carbs >= 8) {
            return 'mixed_meal_component';
        }

        return 'general_exchange';
    }

    private function relativeDifference(float $currentValue, float $candidateValue): float
    {
        return abs($candidateValue - $currentValue) / max(abs($currentValue), 1.0);
    }
}
