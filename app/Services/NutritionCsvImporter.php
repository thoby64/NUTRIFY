<?php

namespace App\Services;

use App\Models\Food;
use App\Models\FoodGroup;
use App\Models\FoodNutrient;
use App\Models\Nutrient;
use App\Models\NutrientType;
use Illuminate\Support\Facades\DB;

class NutritionCsvImporter
{
    private const AMINO_ACID_KEYWORDS = [
        'histidine', 'isoleucine', 'leucine', 'lysine', 'methionine', 'phenylalanine',
        'threonine', 'tryptophan', 'valine', 'arginine', 'alanine', 'aspartic',
        'cystine', 'glutamic', 'glycine', 'proline', 'serine', 'tyrosine', 'amino',
        'aa_', 'trp', 'thr', 'ile', 'leu', 'lys', 'met', 'cys', 'phe', 'tyr',
        'val', 'arg', 'his',
    ];

    private const MACRONUTRIENT_KEYWORDS = [
        'energy', 'kcal', 'protein', 'carbohydrate', 'carbs', 'fat', 'lipid',
        'fiber', 'ash', 'water', 'moisture', 'cal', 'kj', 'energy_kc', 'procnt',
        'a_protei', 'mfp_prot', 'chocdf', 'fasat', 'fams', 'fapu', 'chole',
        'fib', 'sucs', 'phytac',
    ];

    private const MINERAL_KEYWORDS = [
        'calcium', 'ca', 'phosphorus', 'p_', 'magnesium', 'mg', 'potassium',
        'k_', 'iron', 'fe', 'zinc', 'zn', 'copper', 'cu', 'manganese', 'mn',
        'sodium', 'na', 'iodine', 'i_', 'selenium', 'se', 'mineral', 'mfp_fe',
    ];

    private const VITAMIN_KEYWORDS = [
        'vitamin', 'retinol', 'a_', 'thiamine', 'b1', 'riboflavin', 'b2',
        'niacin', 'b3', 'pantothenic', 'b5', 'pyridoxine', 'b6', 'cobalamin',
        'b12', 'folate', 'folic', 'ascorbic', 'c_', 'calciferol', 'd_',
        'tocopherol', 'e_', 'phylloquinone', 'k_', 'vita', 'vitd', 'vite',
        'vitc', 'thia', 'ribf', 'nia', 'fol', 'pant', 'vit b6', 'vit b12',
    ];

    private const KNOWN_UNIT_TOKENS = [
        'g', 'mg', 'mcg', 'ug', 'µg', 'μg', 'kcal', 'cal', 'kj', 'iu', 'ml', 'l',
    ];

    public function import(string $path, string $filename): array
    {
        $rows = $this->readCsv($path);
        $records = $this->extractImportRows($rows);

        if ($records === []) {
            return [
                'success' => false,
                'imported_values' => 0,
                'food_rows' => 0,
                'groups' => [],
            ];
        }

        $importedValues = 0;
        $groups = [];

        DB::transaction(function () use ($rows, $records, $filename, &$importedValues, &$groups): void {
            $nutrientTypeIds = [];
            $nutrientIds = [];

            foreach ($records as $record) {
                $groups[$record['food_group_name']] = true;

                $foodGroup = FoodGroup::query()->firstOrCreate(
                    ['name' => $record['food_group_name']],
                    ['description' => $record['food_group_name'].' food group']
                );

                $nutrientTypeName = $record['nutrient_type_name'];
                if (! array_key_exists($nutrientTypeName, $nutrientTypeIds)) {
                    $nutrientType = NutrientType::query()->firstOrCreate(
                        ['name' => $nutrientTypeName],
                        [
                            'category' => str($nutrientTypeName)->replace('_', ' ')->title()->toString(),
                            'description' => $nutrientTypeName.' nutrients',
                        ]
                    );
                    $nutrientTypeIds[$nutrientTypeName] = $nutrientType->id;
                }

                $nutrientTypeId = $nutrientTypeIds[$nutrientTypeName];

                $food = Food::query()->firstOrCreate(
                    [
                        'name' => $record['food_name'],
                        'food_group_id' => $foodGroup->id,
                    ],
                    ['code' => $record['food_code']]
                );

                foreach ($record['nutrient_cols'] as [$columnIndex, $nutrientName]) {
                    $nutrientKey = $nutrientTypeId.'|'.$nutrientName;
                    $unit = $record['nutrient_units'][$nutrientName] ?? null;

                    if (! array_key_exists($nutrientKey, $nutrientIds)) {
                        $nutrient = Nutrient::query()
                            ->where('name', $nutrientName)
                            ->where('nutrient_type_id', $nutrientTypeId)
                            ->first();

                        if (! $nutrient) {
                            $nutrient = Nutrient::query()->create([
                                'name' => $nutrientName,
                                'nutrient_type_id' => $nutrientTypeId,
                                'unit' => $unit,
                                'abbreviation' => mb_substr($nutrientName, 0, 10),
                            ]);
                        } elseif ($unit && ! $nutrient->unit) {
                            $nutrient->unit = $unit;
                            $nutrient->save();
                        }

                        $nutrientIds[$nutrientKey] = $nutrient->id;
                    }

                    $value = $this->parseNumericValue($rows[$record['row_idx']][$columnIndex] ?? null);
                    if ($value === null) {
                        continue;
                    }

                    $created = FoodNutrient::query()->firstOrCreate(
                        [
                            'food_id' => $food->id,
                            'nutrient_id' => $nutrientIds[$nutrientKey],
                        ],
                        [
                            'nutrient_type_id' => $nutrientTypeId,
                            'value' => $value,
                            'per_unit' => $unit,
                            'data_source' => $filename,
                        ]
                    );

                    if ($created->wasRecentlyCreated) {
                        $importedValues++;
                    }
                }
            }
        });

        return [
            'success' => true,
            'imported_values' => $importedValues,
            'food_rows' => count($records),
            'groups' => array_keys($groups),
        ];
    }

    private function readCsv(string $path): array
    {
        $handle = fopen($path, 'rb');
        if (! $handle) {
            return [];
        }

        $rows = [];
        while (($row = fgetcsv($handle, 0, ',', '"', '\\')) !== false) {
            $rows[] = array_map(fn ($value) => $this->normalizeCell($value), $row);
        }
        fclose($handle);

        $maxColumns = max(array_map('count', $rows ?: [[]]));

        return array_map(function (array $row) use ($maxColumns): array {
            return array_pad($row, $maxColumns, '');
        }, $rows);
    }

    private function extractImportRows(array $rows): array
    {
        $records = [];
        $currentGroup = null;
        $currentHeader = null;

        foreach ($rows as $rowIndex => $row) {
            if ($this->isBlankRow($row)) {
                continue;
            }

            if ($this->isGroupMarker($row[0] ?? '')) {
                $currentGroup = [
                    'code' => $row[0],
                    'name' => $row[1] ?: $row[0],
                ];
                continue;
            }

            if (! $currentGroup) {
                continue;
            }

            $header = $this->parseHeaderDefinition($rows, $rowIndex);
            if ($header) {
                $currentHeader = $header;
                continue;
            }

            if (! $this->isNumericLike($row[0] ?? '') || ! ($row[1] ?? '') || ! $currentHeader) {
                continue;
            }

            $records[] = [
                'food_code' => $row[0],
                'food_name' => $row[1],
                'food_group_code' => $currentGroup['code'],
                'food_group_name' => $currentGroup['name'],
                'nutrient_type_name' => $currentHeader['nutrient_type_name'],
                'nutrient_cols' => $currentHeader['nutrient_cols'],
                'nutrient_units' => $currentHeader['nutrient_units'],
                'row_idx' => $rowIndex,
            ];
        }

        return $records;
    }

    private function parseHeaderDefinition(array $rows, int $rowIndex): ?array
    {
        $row = $rows[$rowIndex] ?? [];

        if ($this->isGroupMarker($row[0] ?? '') || $this->isNumericLike($row[0] ?? '')) {
            return null;
        }

        $nonEmpty = [];
        foreach ($row as $columnIndex => $value) {
            if ($columnIndex === 0 || $value === '') {
                continue;
            }
            $nonEmpty[] = [$columnIndex, $value];
        }

        if (count($nonEmpty) < 2) {
            return null;
        }

        if (collect($nonEmpty)->every(fn ($entry) => $this->looksLikeUnitToken($entry[1]))) {
            return null;
        }

        $nutrientColumns = [];
        $nutrientUnits = [];
        foreach (array_slice($nonEmpty, 1) as [$columnIndex, $nutrientName]) {
            $nutrientColumns[] = [$columnIndex, $nutrientName];
            $unit = null;
            $nextRow = $rows[$rowIndex + 1] ?? null;
            if ($nextRow && ! $this->isGroupMarker($nextRow[0] ?? '') && ! $this->isNumericLike($nextRow[0] ?? '')) {
                $unit = $nextRow[$columnIndex] ?? null;
            }
            $nutrientUnits[$nutrientName] = $unit ?: null;
        }

        return [
            'nutrient_type_name' => $this->detectNutrientType(array_column($nutrientColumns, 1)),
            'nutrient_cols' => $nutrientColumns,
            'nutrient_units' => $nutrientUnits,
        ];
    }

    private function detectNutrientType(array $headers): string
    {
        $headers = array_map(fn ($header) => mb_strtolower($header), $headers);

        $scores = [
            'amino_acids' => $this->keywordScore($headers, self::AMINO_ACID_KEYWORDS),
            'macronutrients' => $this->keywordScore($headers, self::MACRONUTRIENT_KEYWORDS),
            'minerals' => $this->keywordScore($headers, self::MINERAL_KEYWORDS),
            'vitamins' => $this->keywordScore($headers, self::VITAMIN_KEYWORDS),
        ];

        arsort($scores);

        return array_key_first($scores);
    }

    private function keywordScore(array $headers, array $keywords): int
    {
        $score = 0;
        foreach ($headers as $header) {
            foreach ($keywords as $keyword) {
                if (str_contains($header, $keyword)) {
                    $score++;
                }
            }
        }

        return $score;
    }

    private function normalizeCell(mixed $value): string
    {
        return trim((string) ($value ?? ''));
    }

    private function isGroupMarker(string $value): bool
    {
        return $value !== '' && (bool) preg_match('/^(?=.*[A-Za-z])[A-Za-z0-9_-]+$/', $value);
    }

    private function isBlankRow(array $row): bool
    {
        foreach ($row as $value) {
            if ($this->normalizeCell($value) !== '') {
                return false;
            }
        }

        return true;
    }

    private function isNumericLike(string $value): bool
    {
        return $value !== '' && is_numeric(str_replace(',', '', $value));
    }

    private function looksLikeUnitToken(string $token): bool
    {
        $cleaned = mb_strtolower(str_replace(' ', '', $token));
        if ($cleaned === '') {
            return false;
        }

        if (in_array($cleaned, self::KNOWN_UNIT_TOKENS, true)) {
            return true;
        }

        return (bool) preg_match('/^(mg|mcg|ug|µg|μg|g|kcal|cal|kj|iu|ml|l)(m)?([a-z0-9]{0,6})?(re)?(\/[a-z0-9]+)?$/u', $cleaned);
    }

    private function parseNumericValue(mixed $value): ?float
    {
        $token = $this->normalizeCell($value);
        if ($token === '') {
            return 0.0;
        }

        if (str_contains($token, ',') && ! str_contains($token, '.')) {
            $token = substr_count($token, ',') === 1 ? str_replace(',', '.', $token) : str_replace(',', '', $token);
        } else {
            $token = str_replace(',', '', $token);
        }

        return is_numeric($token) ? (float) $token : null;
    }
}
