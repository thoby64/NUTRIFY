<?php

namespace App\Services\Planning;

use App\Models\ClientPlanningProfile;
use App\Models\PlanningNutrientTarget;
use App\Models\PlanningPlan;
use App\Models\PlanningRule;

class PlanningValidation
{
    private const SPLIT_PATTERN = '/[,;\/\n]+|\band\b|\bor\b/i';
    private const STOPWORDS = ['meal', 'meals', 'food', 'foods', 'item', 'items', 'daily', 'day', 'plan', 'with', 'from', 'into', 'that', 'this', 'must', 'should'];
    private const EXCLUSION_MARKERS = ['avoid', 'exclude', 'excluding', 'without', 'no ', 'free from', 'allergy to', 'allergic to', 'restrict', 'restriction', 'limit'];
    private const INCLUSION_MARKERS = ['include', 'prefer', 'choose', 'use', 'add', 'focus on'];

    public function derivedProfileRules(?ClientPlanningProfile $profile): array
    {
        if (! $profile) {
            return [];
        }

        $rules = [];
        $add = function (string $type, string $severity, string $title, ?string $details = null) use (&$rules): void {
            $rules[] = (object) [
                'id' => null,
                'scope' => 'profile',
                'rule_type' => $type,
                'severity' => $severity,
                'title' => $title,
                'details' => $details,
                'is_active' => true,
                'client_id' => null,
                'plan_id' => null,
                'day_id' => null,
                'meal_id' => null,
                'created_at' => null,
                'updated_at' => null,
            ];
        };

        if ($profile->allergies) {
            $add('allergy', 'hard', "Avoid allergens: {$profile->allergies}", 'Derived automatically from the planning-safe client profile.');
        }
        if ($profile->exclusions) {
            $add('ingredient', 'hard', "Exclude: {$profile->exclusions}", 'Derived automatically from the planning-safe client profile.');
        }
        if ($profile->preferences) {
            $add('preference', 'soft', "Prefer: {$profile->preferences}", 'Derived automatically from the planning-safe client profile.');
        }
        if ($profile->dietary_pattern) {
            $add('clinical', 'hard', "Respect dietary pattern: {$profile->dietary_pattern}", 'Derived automatically from the planning-safe client profile.');
        }
        if ($profile->clinical_summary) {
            $add('clinical', 'soft', "Clinical context: {$profile->clinical_summary}", 'Manual professional review is recommended for this context.');
        }

        return $rules;
    }

    public function evaluateFoodAgainstRules(string $foodName, ?string $foodGroupName, array $rules): array
    {
        $text = $this->normalizeText($foodName.' '.($foodGroupName ?: ''));
        $blocked = [];
        $warnings = [];
        $info = [];

        foreach ($rules as $rule) {
            if (! $this->get($rule, 'is_active', true) || ! $this->ruleSupportsAutoCheck($rule)) {
                continue;
            }
            $matched = collect($this->extractRuleKeywords($rule))
                ->filter(fn (string $keyword) => $this->keywordMatches($keyword, $text))
                ->values()
                ->all();
            if (! $matched) {
                continue;
            }

            $payload = [
                'rule_id' => $this->get($rule, 'id'),
                'title' => $this->get($rule, 'title'),
                'severity' => $this->get($rule, 'severity'),
                'rule_type' => $this->get($rule, 'rule_type'),
                'matched_keywords' => $matched,
            ];

            if ($this->ruleHasExclusionIntent($rule)) {
                if ($this->get($rule, 'severity') === 'hard') {
                    $blocked[] = $payload;
                } else {
                    $warnings[] = $payload;
                }
            } else {
                $info[] = $payload;
            }
        }

        return [
            'hard_blocked' => count($blocked) > 0,
            'blocked_by' => $blocked,
            'warnings' => $warnings,
            'info' => $info,
        ];
    }

    public function buildScopeValidation(string $scope, array $rules, array $targets, $foods, array $summary): array
    {
        $checks = [];

        foreach ($rules as $rule) {
            if (! $this->get($rule, 'is_active', true)) {
                continue;
            }
            if (! $this->ruleSupportsAutoCheck($rule)) {
                $checks[] = [
                    'kind' => 'rule',
                    'rule_id' => $this->get($rule, 'id'),
                    'title' => $this->get($rule, 'title'),
                    'severity' => 'info',
                    'status' => 'manual_review',
                    'message' => 'This rule needs manual professional review.',
                ];
                continue;
            }
            if (count($foods) === 0) {
                $checks[] = [
                    'kind' => 'rule',
                    'rule_id' => $this->get($rule, 'id'),
                    'title' => $this->get($rule, 'title'),
                    'severity' => 'info',
                    'status' => 'pending_foods',
                    'message' => 'No foods are selected yet, so this rule cannot be checked.',
                ];
                continue;
            }

            $keywords = $this->extractRuleKeywords($rule);
            $matchedFoods = collect($foods)->filter(function ($food) use ($keywords): bool {
                $text = $this->normalizeText(($food->food_name ?? '').' '.($food->food_group_name ?? ''));
                return collect($keywords)->contains(fn (string $keyword) => $this->keywordMatches($keyword, $text));
            })->pluck('food_name')->values()->all();

            if ($this->ruleHasExclusionIntent($rule) && $matchedFoods) {
                $checks[] = [
                    'kind' => 'rule',
                    'rule_id' => $this->get($rule, 'id'),
                    'title' => $this->get($rule, 'title'),
                    'severity' => $this->get($rule, 'severity') === 'hard' ? 'blocker' : 'warning',
                    'status' => 'matched_exclusion',
                    'matched_foods' => $matchedFoods,
                    'message' => 'Rule matched selected foods: '.implode(', ', array_slice($matchedFoods, 0, 5)).'.',
                ];
            } elseif ($this->ruleHasInclusionIntent($rule) && ! $matchedFoods) {
                $checks[] = [
                    'kind' => 'rule',
                    'rule_id' => $this->get($rule, 'id'),
                    'title' => $this->get($rule, 'title'),
                    'severity' => $this->get($rule, 'severity') === 'hard' ? 'warning' : 'info',
                    'status' => 'missing_preference',
                    'matched_foods' => [],
                    'message' => 'No selected foods appear to satisfy this inclusion/preference rule yet.',
                ];
            }
        }

        $checks = array_merge($checks, $this->evaluateTargets($targets, $summary));
        $blockers = count(array_filter($checks, fn (array $check) => ($check['severity'] ?? '') === 'blocker'));
        $warnings = count(array_filter($checks, fn (array $check) => ($check['severity'] ?? '') === 'warning'));
        $info = count(array_filter($checks, fn (array $check) => ($check['severity'] ?? '') === 'info'));

        return [
            'scope' => $scope,
            'overall_status' => $blockers > 0 ? 'blocked' : ($warnings > 0 ? 'warning' : 'ok'),
            'blockers_count' => $blockers,
            'warnings_count' => $warnings,
            'info_count' => $info,
            'checks' => $checks,
        ];
    }

    public function buildEffectivePlanValidation(PlanningPlan $plan, callable $aggregateFoods): array
    {
        $checks = [];
        if ($plan->days->isEmpty()) {
            $checks[] = ['kind' => 'structure', 'severity' => 'warning', 'status' => 'missing_days', 'message' => 'The plan does not contain any days yet.'];
        }

        foreach ($plan->days->sortBy('day_index') as $day) {
            if ($day->meals->isEmpty()) {
                $checks[] = ['kind' => 'structure', 'severity' => 'warning', 'status' => 'missing_meals', 'day_id' => $day->id, 'day_name' => $day->day_name, 'message' => "{$day->day_name} has no meals yet."];
            }
            foreach ($day->meals->sortBy('meal_order') as $meal) {
                $foods = $meal->foods->sortBy(['sort_order', 'id'])->values();
                if ($foods->isEmpty()) {
                    $checks[] = ['kind' => 'structure', 'severity' => 'warning', 'status' => 'empty_meal', 'day_id' => $day->id, 'meal_id' => $meal->id, 'day_name' => $day->day_name, 'meal_name' => $meal->meal_name, 'message' => "{$meal->meal_name} on {$day->day_name} does not have any foods yet."];
                }

                [$rules, $targets] = $this->effectiveContext($plan, $day, $meal);
                $mealChecks = $this->buildScopeValidation("day-{$day->day_index}-meal-{$meal->meal_order}", $rules, $targets, $foods, $aggregateFoods($foods))['checks'];
                foreach ($mealChecks as $check) {
                    $check['day_id'] = $day->id;
                    $check['meal_id'] = $meal->id;
                    $check['day_name'] = $day->day_name;
                    $check['meal_name'] = $meal->meal_name;
                    $checks[] = $check;
                }
            }
        }

        $planFoods = $plan->days->flatMap(fn ($day) => $day->meals->flatMap(fn ($meal) => $meal->foods));
        $checks = array_merge($checks, $this->buildScopeValidation('plan', [], $plan->nutrientTargets->all(), $planFoods, $aggregateFoods($planFoods))['checks']);
        $blockers = count(array_filter($checks, fn (array $check) => ($check['severity'] ?? '') === 'blocker'));
        $warnings = count(array_filter($checks, fn (array $check) => ($check['severity'] ?? '') === 'warning'));
        $info = count(array_filter($checks, fn (array $check) => ($check['severity'] ?? '') === 'info'));

        return [
            'scope' => 'effective_plan',
            'overall_status' => $blockers > 0 ? 'blocked' : ($warnings > 0 ? 'warning' : 'ok'),
            'blockers_count' => $blockers,
            'warnings_count' => $warnings,
            'info_count' => $info,
            'checks' => $checks,
        ];
    }

    public function effectiveContext(PlanningPlan $plan, $day = null, $meal = null): array
    {
        $rules = array_merge($this->derivedProfileRules($plan->client?->planningProfile), $plan->rules->where('is_active', true)->values()->all());
        $targets = $plan->nutrientTargets->values()->all();
        if ($day) {
            $rules = array_merge($rules, $day->rules->where('is_active', true)->values()->all());
            $targets = array_merge($targets, $day->nutrientTargets->values()->all());
        }
        if ($meal) {
            $rules = array_merge($rules, $meal->rules->where('is_active', true)->values()->all());
            $targets = array_merge($targets, $meal->nutrientTargets->values()->all());
        }

        return [$rules, $targets];
    }

    public function extractRuleKeywords($rule): array
    {
        $keywords = [];
        foreach ([$this->get($rule, 'title', ''), $this->get($rule, 'details', '')] as $raw) {
            $normalized = $this->normalizeText((string) $raw);
            if ($normalized === '') {
                continue;
            }
            foreach (preg_split(self::SPLIT_PATTERN, $normalized) ?: [] as $piece) {
                $cleaned = $this->stripMarkers(trim($piece));
                $cleaned = trim(preg_replace('/\b(low|high|moderate|reduced)\b/', '', $cleaned) ?: '', ' -');
                $cleaned = trim(preg_replace('/\b(allergen|allergens)\b/', '', $cleaned) ?: '', ' -');
                if (strlen($cleaned) < 3 || in_array($cleaned, self::STOPWORDS, true)) {
                    continue;
                }
                $keywords[$cleaned] = $cleaned;
            }
        }

        return array_values($keywords);
    }

    public function evaluateTargets(array $targets, array $summary): array
    {
        $totals = collect($summary['totals'] ?? [])->keyBy('code');

        return collect($targets)->map(function (PlanningNutrientTarget $target) use ($totals): array {
            $actual = $totals->get($target->nutrient_code);
            $actualValue = $actual['value'] ?? null;
            $unit = $target->unit ?: ($actual['unit'] ?? '');
            $status = 'within_range';
            $severity = 'info';
            $message = 'Within configured range.';

            if ($actualValue === null) {
                $status = 'missing_nutrient';
                $severity = 'warning';
                $message = 'No nutrient value was available for this target.';
            } elseif ($target->min_value !== null && $actualValue < $target->min_value) {
                $status = 'below_min';
                $severity = 'warning';
                $message = sprintf('Actual value %.2f is below minimum %.2f.', $actualValue, $target->min_value);
            } elseif ($target->max_value !== null && $actualValue > $target->max_value) {
                $status = 'above_max';
                $severity = 'warning';
                $message = sprintf('Actual value %.2f is above maximum %.2f.', $actualValue, $target->max_value);
            } elseif ($target->target_value !== null && $target->min_value === null && $target->max_value === null) {
                $tolerance = max(abs($target->target_value) * 0.05, 1.0);
                if (abs($actualValue - $target->target_value) > $tolerance) {
                    $status = 'off_target';
                    $severity = 'warning';
                    $message = sprintf('Actual value %.2f differs from target %.2f.', $actualValue, $target->target_value);
                } else {
                    $status = 'on_target';
                    $message = 'Actual value is close to the configured target.';
                }
            }

            return [
                'kind' => 'target',
                'target_id' => $target->id,
                'nutrient_code' => $target->nutrient_code,
                'unit' => $unit,
                'min_value' => $target->min_value,
                'target_value' => $target->target_value,
                'max_value' => $target->max_value,
                'actual_value' => $actualValue,
                'status' => $status,
                'severity' => $severity,
                'message' => $message,
            ];
        })->values()->all();
    }

    private function ruleSupportsAutoCheck($rule): bool
    {
        return count($this->extractRuleKeywords($rule)) > 0;
    }

    private function ruleHasExclusionIntent($rule): bool
    {
        $blob = $this->normalizeText(implode(' ', array_filter([$this->get($rule, 'rule_type'), $this->get($rule, 'title'), $this->get($rule, 'details')])));
        return in_array($this->get($rule, 'rule_type'), ['allergy', 'ingredient', 'clinical'], true)
            || collect(self::EXCLUSION_MARKERS)->contains(fn (string $marker) => str_contains($blob, trim($marker)));
    }

    private function ruleHasInclusionIntent($rule): bool
    {
        $blob = $this->normalizeText(implode(' ', array_filter([$this->get($rule, 'rule_type'), $this->get($rule, 'title'), $this->get($rule, 'details')])));
        return $this->get($rule, 'rule_type') === 'preference'
            || collect(self::INCLUSION_MARKERS)->contains(fn (string $marker) => str_contains($blob, $marker));
    }

    private function keywordMatches(string $keyword, string $text): bool
    {
        return (bool) preg_match('/\b'.str_replace('\ ', '\s+', preg_quote($keyword, '/')).'\b/', $text);
    }

    private function stripMarkers(string $value): string
    {
        foreach (array_merge(self::EXCLUSION_MARKERS, self::INCLUSION_MARKERS) as $marker) {
            if (str_starts_with($value, $marker)) {
                return trim(substr($value, strlen($marker)), ' :-');
            }
        }

        return $value;
    }

    private function normalizeText(?string $value): string
    {
        $value = strtolower((string) $value);
        $value = preg_replace('/[^a-z0-9\s-]/', ' ', $value) ?: '';
        return trim(preg_replace('/\s+/', ' ', $value) ?: '');
    }

    private function get($rule, string $key, mixed $default = null): mixed
    {
        if (is_array($rule)) {
            return $rule[$key] ?? $default;
        }

        return $rule->{$key} ?? $default;
    }
}
