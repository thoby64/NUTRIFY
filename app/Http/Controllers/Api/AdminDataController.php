<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Food;
use App\Models\FoodGroup;
use App\Models\FoodNutrient;
use App\Models\Nutrient;
use App\Models\NutrientType;
use App\Services\NutritionCsvImporter;
use App\Services\SimpleXlsxWriter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminDataController extends Controller
{
    public function importCsv(Request $request, NutritionCsvImporter $importer): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt'],
        ]);

        $file = $request->file('file');
        $result = $importer->import($file->getRealPath(), $file->getClientOriginalName());

        if (! $result['success']) {
            return response()->json([
                'detail' => 'Failed to import file: '.$file->getClientOriginalName().'. Check file format and content.',
            ], 400);
        }

        return response()->json([
            'success' => true,
            'imported_count' => 1,
            'imported_values' => $result['imported_values'],
            'food_rows' => $result['food_rows'],
            'groups' => $result['groups'],
            'filename' => $file->getClientOriginalName(),
            'message' => 'Successfully imported '.$file->getClientOriginalName().'.',
        ]);
    }

    public function resetDatabase(): JsonResponse
    {
        $counts = [
            'food_nutrients' => FoodNutrient::query()->count(),
            'foods' => Food::query()->count(),
            'nutrients' => Nutrient::query()->count(),
            'food_groups' => FoodGroup::query()->count(),
            'nutrient_types' => NutrientType::query()->count(),
        ];

        DB::transaction(function (): void {
            FoodNutrient::query()->delete();
            Food::query()->delete();
            Nutrient::query()->delete();
            FoodGroup::query()->delete();
            NutrientType::query()->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'Database reset successfully',
            'deleted_counts' => $counts,
            'total_deleted' => array_sum($counts),
        ]);
    }

    public function exportExcel(SimpleXlsxWriter $writer): BinaryFileResponse
    {
        $sheets = [
            [
                'name' => 'Food Groups',
                'rows' => array_merge(
                    [['ID', 'Name', 'Description']],
                    FoodGroup::query()->orderBy('id')->get()->map(fn (FoodGroup $group) => [
                        $group->id,
                        $group->name,
                        $group->description ?? '',
                    ])->all()
                ),
            ],
            [
                'name' => 'Nutrient Types',
                'rows' => array_merge(
                    [['ID', 'Name', 'Category', 'Description']],
                    NutrientType::query()->orderBy('id')->get()->map(fn (NutrientType $type) => [
                        $type->id,
                        $type->name,
                        $type->category ?? '',
                        $type->description ?? '',
                    ])->all()
                ),
            ],
            [
                'name' => 'Nutrients',
                'rows' => array_merge(
                    [['ID', 'Name', 'Nutrient Type', 'Unit', 'Abbreviation']],
                    Nutrient::query()->with('nutrientType')->orderBy('id')->get()->map(fn (Nutrient $nutrient) => [
                        $nutrient->id,
                        $nutrient->name,
                        $nutrient->nutrientType?->name ?? '',
                        $nutrient->unit ?? '',
                        $nutrient->abbreviation ?? '',
                    ])->all()
                ),
            ],
            [
                'name' => 'Foods',
                'rows' => array_merge(
                    [['ID', 'Code', 'Name', 'Food Group', 'Created At']],
                    Food::query()->with('foodGroup')->orderBy('id')->get()->map(fn (Food $food) => [
                        $food->id,
                        $food->code ?? '',
                        $food->name,
                        $food->foodGroup?->name ?? '',
                        optional($food->created_at)->format('Y-m-d H:i:s') ?? '',
                    ])->all()
                ),
            ],
            [
                'name' => 'Nutrient Values',
                'rows' => array_merge(
                    [['ID', 'Food ID', 'Food Name', 'Nutrient ID', 'Nutrient', 'Value', 'Unit', 'Type']],
                    FoodNutrient::query()->with(['food', 'nutrient', 'nutrientType'])->orderBy('id')->get()->map(fn (FoodNutrient $value) => [
                        $value->id,
                        $value->food_id,
                        $value->food?->name ?? '',
                        $value->nutrient_id,
                        $value->nutrient?->name ?? '',
                        $value->value,
                        $value->per_unit ?? '',
                        $value->nutrientType?->name ?? '',
                    ])->all()
                ),
            ],
        ];

        $filename = 'nutrition_data_export_'.now()->format('Ymd_His').'.xlsx';
        $path = storage_path('app/'.$filename);
        $writer->write($sheets, $path);

        return response()->download($path, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    public function exportSql(): StreamedResponse
    {
        $filename = 'nutrition_data_export_'.now()->format('Ymd_His').'.sql';

        return response()->streamDownload(function (): void {
            echo implode("\n", [
                '-- ============================================================================',
                '-- Nutrition Database Export',
                '-- Exported: '.now()->format('Y-m-d H:i:s'),
                '-- DO NOT MODIFY UNLESS YOU KNOW THE SCHEMA',
                '-- ============================================================================',
                '',
            ]);

            echo "-- ============================================================================\n";
            echo "-- Food Groups Table\n";
            echo "-- ============================================================================\n";
            $groups = FoodGroup::query()->orderBy('id')->get();
            $exportedGroupIds = $groups->map(function (FoodGroup $group): int {
                echo "INSERT INTO food_groups (id, name, description, created_at) VALUES ({$group->id}, ".$this->sqlString($group->name).', '.$this->sqlString($group->description ?? '').', '.$this->sqlCreated($group->created_at).");\n";

                return $group->id;
            })->all();

            echo "\n";

            echo "-- ============================================================================\n";
            echo "-- Nutrient Types Table (required by Nutrients)\n";
            echo "-- ============================================================================\n";
            $referencedTypeIds = Nutrient::query()->pluck('nutrient_type_id')->filter()->unique();
            $types = NutrientType::query()->orderBy('id')->get();
            $exportedTypeIds = $types
                ->filter(fn (NutrientType $type) => $referencedTypeIds->contains($type->id))
                ->map(function (NutrientType $type): int {
                    echo "INSERT INTO nutrient_types (id, name, category, description, created_at) VALUES ({$type->id}, ".$this->sqlString($type->name).', '.$this->sqlNullable($type->category).', '.$this->sqlString($type->description ?? '').', '.$this->sqlCreated($type->created_at).");\n";

                    return $type->id;
                })->all();

            $missingTypes = $referencedTypeIds->diff($types->pluck('id'));
            if ($missingTypes->isNotEmpty()) {
                echo '-- WARNING: The following nutrient_type_ids are referenced in nutrients but do not exist in nutrient_types: '.$missingTypes->implode(', ')."\n";
            }

            echo "\n";

            echo "-- ============================================================================\n";
            echo "-- Nutrients Table (only with valid nutrient_type references)\n";
            echo "-- ============================================================================\n";
            $skippedNutrients = 0;
            $exportedNutrientIds = Nutrient::query()->orderBy('id')->get()->map(function (Nutrient $nutrient) use ($exportedTypeIds, &$skippedNutrients): ?int {
                if (! in_array($nutrient->nutrient_type_id, $exportedTypeIds, true)) {
                    echo "-- SKIPPED NUTRIENT: ".$this->sqlString($nutrient->name).' references non-existent nutrient_type_id '.$nutrient->nutrient_type_id."\n";
                    $skippedNutrients++;

                    return null;
                }

                echo "INSERT INTO nutrients (id, nutrient_type_id, name, unit, abbreviation, description, created_at) VALUES ({$nutrient->id}, {$nutrient->nutrient_type_id}, ".$this->sqlString($nutrient->name).', '.$this->sqlNullable($nutrient->unit).', '.$this->sqlNullable($nutrient->abbreviation).', '.$this->sqlString($nutrient->description ?? '').', '.$this->sqlCreated($nutrient->created_at).");\n";

                return $nutrient->id;
            })->filter()->values()->all();

            echo "\n";

            echo "-- ============================================================================\n";
            echo "-- Foods Table (only with valid food_group references)\n";
            echo "-- ============================================================================\n";
            $exportedFoodIds = Food::query()->orderBy('id')->get()->map(function (Food $food) use ($exportedGroupIds): ?int {
                if (! in_array($food->food_group_id, $exportedGroupIds, true)) {
                    echo "-- SKIPPED: Food ".$this->sqlString($food->name).' references non-existent food_group_id '.$food->food_group_id."\n";

                    return null;
                }

                echo "INSERT INTO foods (id, food_group_id, name, code, description, created_at) VALUES ({$food->id}, {$food->food_group_id}, ".$this->sqlString($food->name).', '.$this->sqlNullable($food->code).', '.$this->sqlString($food->description ?? '').', '.$this->sqlCreated($food->created_at).");\n";

                return $food->id;
            })->filter()->values()->all();

            echo "\n";

            echo "-- ============================================================================\n";
            echo "-- Food-Nutrient Values Table (only with valid references)\n";
            echo "-- ============================================================================\n";
            $valueCount = FoodNutrient::query()->count();
            $skippedValues = 0;
            $exportedValues = 0;
            FoodNutrient::query()->orderBy('id')->each(function (FoodNutrient $value) use ($exportedFoodIds, $exportedNutrientIds, $exportedTypeIds, &$skippedValues, &$exportedValues): void {
                if (
                    ! in_array($value->food_id, $exportedFoodIds, true)
                    || ! in_array($value->nutrient_id, $exportedNutrientIds, true)
                    || ! in_array($value->nutrient_type_id, $exportedTypeIds, true)
                ) {
                    $skippedValues++;

                    return;
                }

                echo "INSERT INTO food_nutrients (id, food_id, nutrient_id, nutrient_type_id, value, per_unit, data_source, created_at) VALUES ({$value->id}, {$value->food_id}, {$value->nutrient_id}, {$value->nutrient_type_id}, {$value->value}, ".$this->sqlNullable($value->per_unit).', '.$this->sqlNullable($value->data_source).', '.$this->sqlCreated($value->created_at).");\n";
                $exportedValues++;
            });

            echo "\n";
            echo "-- ============================================================================\n";
            echo "-- Export Summary\n";
            echo "-- ============================================================================\n";
            echo '-- Food Groups exported: '.$groups->count()."\n";
            echo '-- Nutrient Types exported: '.count($exportedTypeIds)."\n";
            echo '-- Nutrients exported: '.count($exportedNutrientIds)."\n";
            echo '-- Nutrients skipped (orphaned): '.$skippedNutrients."\n";
            echo '-- Foods exported: '.count($exportedFoodIds)."\n";
            echo '-- Food-Nutrient values exported: '.$exportedValues."\n";
            if ($skippedValues > 0 || $valueCount !== $exportedValues) {
                echo '-- WARNING: '.$skippedValues." food_nutrient records skipped due to broken references\n";
            }
            echo "-- This export includes ONLY valid data (no orphaned records)\n";
            echo "-- ============================================================================\n";
        }, $filename, ['Content-Type' => 'text/plain']);
    }

    public function importSql(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file'],
        ]);

        $file = $request->file('file');
        if (! Str::endsWith(Str::lower($file->getClientOriginalName()), '.sql')) {
            return response()->json(['detail' => 'Only SQL files are supported. Please upload a .sql file.'], 400);
        }

        $statements = $this->parseSqlInserts(file_get_contents($file->getRealPath()));
        if ($statements === []) {
            return response()->json(['detail' => 'No INSERT statements found in the SQL file'], 400);
        }

        $executed = 0;
        $failed = 0;
        $errors = [];

        foreach ($statements as $index => $statement) {
            try {
                DB::statement($statement);
                $executed++;
            } catch (\Throwable $exception) {
                $failed++;
                $errors[] = 'Statement '.($index + 1).': '.Str::limit($exception->getMessage(), 150);
            }
        }

        return response()->json([
            'success' => $executed > 0,
            'filename' => $file->getClientOriginalName(),
            'inserted_count' => $executed,
            'failed_count' => $failed,
            'message' => 'Successfully imported '.$executed.' records from '.$file->getClientOriginalName(),
            'errors' => array_slice($errors, 0, 10),
        ]);
    }

    private function parseSqlInserts(string $sql): array
    {
        $allowedTables = ['food_groups', 'nutrient_types', 'nutrients', 'foods', 'food_nutrients'];
        $statements = [];

        foreach (explode(';', $sql) as $statement) {
            $lines = array_filter(array_map(function (string $line): string {
                return trim(Str::before($line, '--'));
            }, explode("\n", $statement)));
            $cleaned = trim(implode("\n", $lines));

            if ($cleaned === '' || ! Str::startsWith(Str::upper($cleaned), 'INSERT INTO')) {
                continue;
            }

            if (! preg_match('/INSERT\s+INTO\s+["`]?([a-zA-Z_][a-zA-Z0-9_]*)["`]?\s*/i', $cleaned, $matches)) {
                continue;
            }

            $table = Str::lower($matches[1]);
            if (! in_array($table, $allowedTables, true)) {
                continue;
            }

            $statements[] = ['table' => $table, 'sql' => $cleaned.';'];
        }

        usort($statements, fn ($a, $b) => array_search($a['table'], $allowedTables, true) <=> array_search($b['table'], $allowedTables, true));

        return array_column($statements, 'sql');
    }

    private function sqlString(mixed $value): string
    {
        return "'".str_replace("'", "''", (string) $value)."'";
    }

    private function sqlNullable(mixed $value): string
    {
        if ($value === null || $value === '') {
            return 'NULL';
        }

        return $this->sqlString($value);
    }

    private function sqlCreated(mixed $value): string
    {
        return $this->sqlNullable(optional($value)->format('Y-m-d H:i:s'));
    }
}
