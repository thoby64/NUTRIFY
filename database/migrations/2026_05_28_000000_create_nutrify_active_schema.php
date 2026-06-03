<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userrole') THEN
        CREATE TYPE userrole AS ENUM ('ADMIN', 'NUTRITIONIST', 'MANAGER', 'EDITOR');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'planningplantype') THEN
        CREATE TYPE planningplantype AS ENUM ('MULTI_DAY', 'WEEKLY_CYCLE', 'TEMPLATE');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'planningplanstatus') THEN
        CREATE TYPE planningplanstatus AS ENUM ('DRAFT', 'REVIEW', 'FINALIZED', 'ARCHIVED');
    END IF;
END $$;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role userrole NOT NULL DEFAULT 'EDITOR',
    is_active BOOLEAN DEFAULT TRUE,
    created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX ix_users_username ON users(username);
CREATE UNIQUE INDEX ix_users_email ON users(email);
CREATE INDEX ix_users_id ON users(id);
CREATE INDEX ix_users_role ON users(role);
CREATE INDEX ix_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_by_id ON users(created_by_id);

CREATE TABLE food_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP
);

CREATE UNIQUE INDEX ix_food_groups_name ON food_groups(name);
CREATE INDEX ix_food_groups_id ON food_groups(id);

CREATE TABLE foods (
    id SERIAL PRIMARY KEY,
    food_group_id INTEGER NOT NULL REFERENCES food_groups(id),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP,
    CONSTRAINT uq_food_group_name UNIQUE (food_group_id, name)
);

CREATE INDEX ix_foods_id ON foods(id);
CREATE INDEX ix_foods_food_group_id ON foods(food_group_id);
CREATE INDEX ix_foods_name ON foods(name);
CREATE INDEX idx_food_name ON foods(name);

CREATE TABLE nutrient_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP
);

CREATE UNIQUE INDEX ix_nutrient_types_name ON nutrient_types(name);
CREATE INDEX ix_nutrient_types_id ON nutrient_types(id);

CREATE TABLE nutrients (
    id SERIAL PRIMARY KEY,
    nutrient_type_id INTEGER NOT NULL REFERENCES nutrient_types(id),
    name VARCHAR(100) NOT NULL,
    unit VARCHAR(50),
    abbreviation VARCHAR(20),
    description TEXT,
    created_at TIMESTAMP,
    CONSTRAINT uq_nutrient_type_name UNIQUE (nutrient_type_id, name)
);

CREATE INDEX ix_nutrients_id ON nutrients(id);
CREATE INDEX ix_nutrients_nutrient_type_id ON nutrients(nutrient_type_id);
CREATE INDEX ix_nutrients_name ON nutrients(name);
CREATE INDEX idx_nutrient_name ON nutrients(name);

CREATE TABLE food_nutrients (
    id SERIAL PRIMARY KEY,
    food_id INTEGER NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
    nutrient_id INTEGER NOT NULL REFERENCES nutrients(id),
    nutrient_type_id INTEGER NOT NULL REFERENCES nutrient_types(id),
    value DOUBLE PRECISION,
    per_unit VARCHAR(50) DEFAULT '100g',
    data_source VARCHAR(100),
    created_at TIMESTAMP,
    CONSTRAINT uq_food_nutrient UNIQUE (food_id, nutrient_id)
);

CREATE INDEX ix_food_nutrients_id ON food_nutrients(id);
CREATE INDEX ix_food_nutrients_food_id ON food_nutrients(food_id);
CREATE INDEX ix_food_nutrients_nutrient_id ON food_nutrients(nutrient_id);
CREATE INDEX ix_food_nutrients_nutrient_type_id ON food_nutrients(nutrient_type_id);
CREATE INDEX idx_food_nutrient_value ON food_nutrients(food_id, nutrient_type_id, value);
CREATE INDEX idx_nutrient_type_value ON food_nutrients(nutrient_type_id, value);

CREATE TABLE password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX ix_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX ix_password_reset_tokens_id ON password_reset_tokens(id);
CREATE INDEX ix_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX ix_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

CREATE TABLE planning_clients (
    id SERIAL PRIMARY KEY,
    client_code VARCHAR(100) NOT NULL,
    display_label VARCHAR(255) NOT NULL,
    privacy_tier VARCHAR(50) NOT NULL DEFAULT 'standard',
    assigned_nutritionist_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX ix_planning_clients_client_code ON planning_clients(client_code);
CREATE INDEX ix_planning_clients_id ON planning_clients(id);
CREATE INDEX ix_planning_clients_assigned_nutritionist_id ON planning_clients(assigned_nutritionist_id);
CREATE INDEX ix_planning_clients_created_by_id ON planning_clients(created_by_id);
CREATE INDEX ix_planning_clients_status ON planning_clients(status);
CREATE INDEX idx_planning_clients_client_code ON planning_clients(client_code);
CREATE INDEX idx_planning_clients_assigned_nutritionist_id ON planning_clients(assigned_nutritionist_id);
CREATE INDEX idx_planning_clients_created_by_id ON planning_clients(created_by_id);

CREATE TABLE client_planning_profiles (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL UNIQUE REFERENCES planning_clients(id) ON DELETE CASCADE,
    age_group VARCHAR(100),
    sex VARCHAR(50),
    goal_summary TEXT,
    clinical_summary TEXT,
    dietary_pattern VARCHAR(255),
    allergies TEXT,
    exclusions TEXT,
    preferences TEXT,
    cultural_notes TEXT,
    planning_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ix_client_planning_profiles_id ON client_planning_profiles(id);
CREATE UNIQUE INDEX ix_client_planning_profiles_client_id ON client_planning_profiles(client_id);

CREATE TABLE planning_plans (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES planning_clients(id) ON DELETE SET NULL,
    created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assigned_nutritionist_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    plan_type planningplantype NOT NULL DEFAULT 'MULTI_DAY',
    start_date DATE,
    days_count INTEGER NOT NULL DEFAULT 1,
    cycle_length INTEGER,
    status planningplanstatus NOT NULL DEFAULT 'DRAFT',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ix_planning_plans_id ON planning_plans(id);
CREATE INDEX ix_planning_plans_client_id ON planning_plans(client_id);
CREATE INDEX ix_planning_plans_created_by_id ON planning_plans(created_by_id);
CREATE INDEX ix_planning_plans_assigned_nutritionist_id ON planning_plans(assigned_nutritionist_id);
CREATE INDEX ix_planning_plans_title ON planning_plans(title);
CREATE INDEX ix_planning_plans_plan_type ON planning_plans(plan_type);
CREATE INDEX ix_planning_plans_status ON planning_plans(status);
CREATE INDEX idx_planning_plans_client_id ON planning_plans(client_id);
CREATE INDEX idx_planning_plans_created_by_id ON planning_plans(created_by_id);
CREATE INDEX idx_planning_plans_assigned_nutritionist_id ON planning_plans(assigned_nutritionist_id);
CREATE INDEX idx_planning_plans_status ON planning_plans(status);

CREATE TABLE planning_plan_days (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER NOT NULL REFERENCES planning_plans(id) ON DELETE CASCADE,
    day_index INTEGER NOT NULL,
    day_name VARCHAR(100) NOT NULL,
    actual_date DATE,
    template_group VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq_planning_plan_day_index UNIQUE (plan_id, day_index)
);

CREATE INDEX ix_planning_plan_days_id ON planning_plan_days(id);
CREATE INDEX ix_planning_plan_days_plan_id ON planning_plan_days(plan_id);
CREATE INDEX idx_planning_plan_days_plan_id ON planning_plan_days(plan_id);

CREATE TABLE planning_plan_meals (
    id SERIAL PRIMARY KEY,
    day_id INTEGER NOT NULL REFERENCES planning_plan_days(id) ON DELETE CASCADE,
    meal_name VARCHAR(255) NOT NULL,
    meal_type VARCHAR(100),
    meal_time VARCHAR(50),
    meal_order INTEGER NOT NULL,
    instructions TEXT,
    target_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq_planning_day_meal_order UNIQUE (day_id, meal_order)
);

CREATE INDEX ix_planning_plan_meals_id ON planning_plan_meals(id);
CREATE INDEX ix_planning_plan_meals_day_id ON planning_plan_meals(day_id);
CREATE INDEX idx_planning_plan_meals_day_id ON planning_plan_meals(day_id);

CREATE TABLE planning_meal_foods (
    id SERIAL PRIMARY KEY,
    meal_id INTEGER NOT NULL REFERENCES planning_plan_meals(id) ON DELETE CASCADE,
    food_id INTEGER REFERENCES foods(id) ON DELETE SET NULL,
    food_name VARCHAR(255) NOT NULL,
    food_code VARCHAR(50),
    food_group_name VARCHAR(100),
    portion_grams DOUBLE PRECISION NOT NULL,
    portion_description VARCHAR(120),
    household_measure VARCHAR(120),
    unit_label VARCHAR(50),
    preparation_state VARCHAR(100),
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 1,
    nutrient_snapshot JSON NOT NULL,
    calculated_nutrients JSON NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ix_planning_meal_foods_id ON planning_meal_foods(id);
CREATE INDEX ix_planning_meal_foods_meal_id ON planning_meal_foods(meal_id);
CREATE INDEX ix_planning_meal_foods_food_id ON planning_meal_foods(food_id);
CREATE INDEX idx_planning_meal_foods_meal_id ON planning_meal_foods(meal_id);
CREATE INDEX idx_planning_meal_foods_food_id ON planning_meal_foods(food_id);

CREATE TABLE planning_plan_versions (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER NOT NULL REFERENCES planning_plans(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    status planningplanstatus NOT NULL DEFAULT 'DRAFT',
    snapshot_json JSON,
    finalized_at TIMESTAMP,
    finalized_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq_planning_plan_version_number UNIQUE (plan_id, version_number)
);

CREATE INDEX ix_planning_plan_versions_id ON planning_plan_versions(id);
CREATE INDEX ix_planning_plan_versions_plan_id ON planning_plan_versions(plan_id);
CREATE INDEX ix_planning_plan_versions_status ON planning_plan_versions(status);
CREATE INDEX idx_planning_plan_versions_plan_id ON planning_plan_versions(plan_id);

CREATE TABLE planning_rules (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES planning_clients(id) ON DELETE CASCADE,
    plan_id INTEGER REFERENCES planning_plans(id) ON DELETE CASCADE,
    day_id INTEGER REFERENCES planning_plan_days(id) ON DELETE CASCADE,
    meal_id INTEGER REFERENCES planning_plan_meals(id) ON DELETE CASCADE,
    scope VARCHAR(50) NOT NULL DEFAULT 'plan',
    rule_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL DEFAULT 'soft',
    title VARCHAR(255) NOT NULL,
    details TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ix_planning_rules_id ON planning_rules(id);
CREATE INDEX ix_planning_rules_client_id ON planning_rules(client_id);
CREATE INDEX ix_planning_rules_plan_id ON planning_rules(plan_id);
CREATE INDEX ix_planning_rules_day_id ON planning_rules(day_id);
CREATE INDEX ix_planning_rules_meal_id ON planning_rules(meal_id);
CREATE INDEX idx_planning_rules_plan_id ON planning_rules(plan_id);
CREATE INDEX idx_planning_rules_day_id ON planning_rules(day_id);
CREATE INDEX idx_planning_rules_meal_id ON planning_rules(meal_id);

CREATE TABLE planning_nutrient_targets (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER REFERENCES planning_plans(id) ON DELETE CASCADE,
    day_id INTEGER REFERENCES planning_plan_days(id) ON DELETE CASCADE,
    meal_id INTEGER REFERENCES planning_plan_meals(id) ON DELETE CASCADE,
    nutrient_code VARCHAR(100) NOT NULL,
    unit VARCHAR(50),
    min_value DOUBLE PRECISION,
    target_value DOUBLE PRECISION,
    max_value DOUBLE PRECISION,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ix_planning_nutrient_targets_id ON planning_nutrient_targets(id);
CREATE INDEX ix_planning_nutrient_targets_plan_id ON planning_nutrient_targets(plan_id);
CREATE INDEX ix_planning_nutrient_targets_day_id ON planning_nutrient_targets(day_id);
CREATE INDEX ix_planning_nutrient_targets_meal_id ON planning_nutrient_targets(meal_id);
CREATE INDEX ix_planning_nutrient_targets_nutrient_code ON planning_nutrient_targets(nutrient_code);
CREATE INDEX idx_planning_nutrient_targets_plan_id ON planning_nutrient_targets(plan_id);
CREATE INDEX idx_planning_nutrient_targets_day_id ON planning_nutrient_targets(day_id);
CREATE INDEX idx_planning_nutrient_targets_meal_id ON planning_nutrient_targets(meal_id);
CREATE INDEX idx_planning_nutrient_targets_code ON planning_nutrient_targets(nutrient_code);
SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
DROP TABLE IF EXISTS planning_nutrient_targets CASCADE;
DROP TABLE IF EXISTS planning_rules CASCADE;
DROP TABLE IF EXISTS planning_plan_versions CASCADE;
DROP TABLE IF EXISTS planning_meal_foods CASCADE;
DROP TABLE IF EXISTS planning_plan_meals CASCADE;
DROP TABLE IF EXISTS planning_plan_days CASCADE;
DROP TABLE IF EXISTS planning_plans CASCADE;
DROP TABLE IF EXISTS client_planning_profiles CASCADE;
DROP TABLE IF EXISTS planning_clients CASCADE;
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS food_nutrients CASCADE;
DROP TABLE IF EXISTS nutrients CASCADE;
DROP TABLE IF EXISTS nutrient_types CASCADE;
DROP TABLE IF EXISTS foods CASCADE;
DROP TABLE IF EXISTS food_groups CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS planningplanstatus CASCADE;
DROP TYPE IF EXISTS planningplantype CASCADE;
DROP TYPE IF EXISTS userrole CASCADE;
SQL);
    }
};
