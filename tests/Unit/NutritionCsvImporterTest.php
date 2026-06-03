<?php

namespace Tests\Unit;

use App\Services\NutritionCsvImporter;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

class NutritionCsvImporterTest extends TestCase
{
    public function test_skips_vitamin_unit_rows_and_keeps_vitamin_type(): void
    {
        $records = $this->extract([
            ['A1', 'Cereal and Cereal products', '', '', '', '', '', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', '', '', '', '', '', '', ''],
            ['', 'Vitamins', 'VITA', 'A_VITA', 'VITD', 'VITE', 'VITC', 'THIA', 'RIBF', 'NIA', 'VIT B6', 'FOL', 'VIT B12', 'PANT'],
            ['', '', 'µ g RE', 'µ g RE', 'µ gm', 'µ gm', 'mg', 'mg', 'mg', 'mg', 'mg', 'µ g L68', 'µ g', 'mg'],
            ['1', 'Biscuit', '0.0', '0.0', '0.0', '1.0', '0.0', '0.1', '0.0', '1.1', '0.0', '31.0', '0.0', '0.5'],
        ]);

        $this->assertCount(1, $records);
        $this->assertSame('vitamins', $records[0]['nutrient_type_name']);
        $this->assertSame('VITA', $records[0]['nutrient_cols'][0][1]);
        $this->assertSame('µ g RE', $records[0]['nutrient_units']['VITA']);
        $this->assertSame('µ g L68', $records[0]['nutrient_units']['FOL']);
    }

    public function test_classifies_fat_profile_header_as_macronutrients(): void
    {
        $records = $this->extract([
            ['H', 'Local Broths', '', '', '', ''],
            ['', 'Macronutrients', 'FASAT', 'FAMS', 'FAPU', 'CHOLE'],
            ['', '', 'g', 'g', 'g', 'mg'],
            ['853', 'Beef broth without oil', '0.1', '0.2', '0.3', '0.0'],
        ]);

        $this->assertCount(1, $records);
        $this->assertSame('macronutrients', $records[0]['nutrient_type_name']);
        $this->assertSame(['FASAT', 'FAMS', 'FAPU', 'CHOLE'], array_map(fn ($column) => $column[1], $records[0]['nutrient_cols']));
    }

    public function test_all_public_templates_extract_expected_nutrient_types(): void
    {
        $expected = [
            'food-group_amino_acid.csv' => 'amino_acids',
            'food-group_macronutrients.csv' => 'macronutrients',
            'food-group_minerals.csv' => 'minerals',
            'food-group_vitamins.csv' => 'vitamins',
        ];

        foreach ($expected as $file => $type) {
            $records = $this->extractFromFile(dirname(__DIR__, 2).'/public/templates/'.$file);
            $types = array_values(array_unique(array_map(fn ($record) => $record['nutrient_type_name'], $records)));

            $this->assertNotEmpty($records, $file.' should extract food records');
            $this->assertSame([$type], $types, $file.' should classify all records consistently');
        }
    }

    private function extract(array $rows): array
    {
        $maxColumns = max(array_map('count', $rows));
        $rows = array_map(fn ($row) => array_pad($row, $maxColumns, ''), $rows);

        return $this->invokeExtract($rows);
    }

    private function extractFromFile(string $path): array
    {
        $importer = new NutritionCsvImporter();
        $reflection = new ReflectionClass($importer);
        $read = $reflection->getMethod('readCsv');

        return $this->invokeExtract($read->invoke($importer, $path));
    }

    private function invokeExtract(array $rows): array
    {
        $importer = new NutritionCsvImporter();
        $reflection = new ReflectionClass($importer);
        $extract = $reflection->getMethod('extractImportRows');

        return $extract->invoke($importer, $rows);
    }
}
