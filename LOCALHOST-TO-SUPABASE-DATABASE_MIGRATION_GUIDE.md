# Complete Guide: Migrating PostgreSQL Database from Localhost to Supabase

## Table of Contents
1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Migration Process](#step-by-step-migration-process)
4. [Understanding Each Command](#understanding-each-command)
5. [Verification](#verification)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

---

## Introduction

This guide will walk you through migrating your entire PostgreSQL database from your local machine to Supabase (an online PostgreSQL provider). By the end, your database structure (tables, schemas, types) and all data will be available on Supabase's servers.

### What You're Doing:
- **Exporting** your local database to a SQL file
- **Cleaning** the SQL file to be Supabase-compatible
- **Linking** your project to Supabase via CLI
- **Importing** the SQL through a migration
- **Verifying** everything worked

---

## Prerequisites

Before starting, you need:

1. **PostgreSQL tools installed** on your machine (usually comes with PostgreSQL)
   - `pg_dump` - for exporting databases
   - `psql` - for importing databases

2. **Supabase account** with a project created
   - Go to https://supabase.com
   - Create account and project
   - Note your project reference ID (e.g., `vwvgkyzgvpchzbzuhhfm`)

3. **Node.js and npm** installed (for Supabase CLI)
   - Download from https://nodejs.org

4. **Your local database credentials**
   - Host: `localhost`
   - Port: `5432`
   - Database name
   - Username
   - Password

---

## Step-by-Step Migration Process

### PHASE 1: Install Required Tools

#### Step 1.1: Install Supabase CLI

This is the tool that manages your Supabase project from the terminal.

```bash
sudo npm install -g supabase
```

**Explanation:**
- `sudo` - Run with administrator privileges (may ask for your password)
- `npm install -g` - Install globally so it's available everywhere
- `supabase` - The package name

**Expected Output:**
```
added 2 packages in 21s
```

---

### PHASE 2: Create Database Backup

#### Step 2.1: Export Your Local Database

This creates a copy of your entire database as a SQL file.

```bash
PGPASSWORD=your_password pg_dump --no-owner --no-privileges --inserts \
  -h localhost -p 5432 -U your_username -d your_database_name > database_backup.sql
```

**Real Example with Mock Credentials:**
```bash
PGPASSWORD=secretPass123 pg_dump --no-owner --no-privileges --inserts \
  -h localhost -p 5432 -U thobbs -d laravelnutrifydb > database_backup.sql
```

**Breaking Down This Command:**

| Part | Meaning | Your Value |
|------|---------|-----------|
| `PGPASSWORD=secretPass123` | Your database password (shown in plain text for this command only) | Your local DB password |
| `pg_dump` | The export tool | (stays same) |
| `--no-owner` | Don't include owner info (Supabase doesn't need it) | (stays same) |
| `--no-privileges` | Don't include permission info | (stays same) |
| `--inserts` | Use INSERT statements instead of COPY (Supabase prefers this) | (stays same) |
| `-h localhost` | Host - your local machine | (stays same) |
| `-p 5432` | Port - default PostgreSQL port | (stays same) |
| `-U thobbs` | Username to connect with | Your local DB username |
| `-d laravelnutrifydb` | Database name to export | Your database name |
| `> database_backup.sql` | Save to this file | (stays same) |

**What's Happening:**
1. You're connecting to your local database
2. Exporting the entire structure and data
3. Saving it as `database_backup.sql`

**Expected Output:**
Nothing will print, but a file `database_backup.sql` appears in your current directory

**Verify it worked:**
```bash
wc -l database_backup.sql
```

You should see a number like `11137` (number of lines in your file).

---

### PHASE 3: Prepare for Supabase Connection

#### Step 3.1: Authenticate with Supabase

```bash
supabase login
```

**What Happens:**
1. Browser opens automatically
2. Follow the login steps
3. Copy the verification code shown in the browser
4. Paste it in the terminal

**Expected Output:**
```
Hello from Supabase! Press Enter to open browser and login automatically.

Here is your login link in case browser did not open:
https://supabase.com/dashboard/cli/login?session_id=...

Enter your verification code: [PASTE CODE HERE]
Token cli_thobbs@EastManAndro_1780321762 created successfully.
You are now logged in. Happy coding!
```

---

#### Step 3.2: Link Your Local Project to Supabase

This connects your project directory to your online Supabase project.

```bash
supabase link --project-ref vwvgkyzgvpchzbzuhhfm
```

**Replace `vwvgkyzgvpchzbzuhhfm` with your actual Supabase project reference ID**

**Where to find your project reference:**
1. Go to https://supabase.com
2. Click your project
3. Go to Settings → General
4. Look for "Reference ID" (looks like: `vwvgkyzgvpchzbzuhhfm`)

**Expected Output:**
```
Finished supabase link.
```

**What This Does:**
- Creates a `.supabase` folder in your project
- Stores your project configuration locally

---

### PHASE 4: Clean and Prepare Migration

#### Step 4.1: Clean the Backup File

Your backup contains PostgreSQL meta-commands that Supabase can't understand. Remove them.

```bash
awk '!/^\\\\/' database_backup.sql > database_backup_clean.sql
```

**Explanation:**
- `awk` - A text processing tool
- `'!/^\\\\/'` - Remove lines starting with backslash
- `database_backup.sql` - Input file
- `> database_backup_clean.sql` - Save to new file

**Expected Output:**
Nothing prints, but a new file `database_backup_clean.sql` is created

**Why This Works:**
- PostgreSQL dumps include commands like `\set` and `\restrict`
- These aren't SQL and will cause errors in Supabase
- We remove them to get only pure SQL

---

#### Step 4.2: Create a Migration File

```bash
supabase migration new initial-migration
```

**Expected Output:**
```
Created new migration at supabase/migrations/20260601135047_initial-migration.sql
```

**What's Happening:**
- Supabase creates a migration file (like a container for your SQL)
- The timestamp ensures migrations run in order
- The file is empty and ready for your SQL

---

#### Step 4.3: Copy Your Cleaned Data Into the Migration

```bash
cat database_backup_clean.sql > supabase/migrations/20260601135047_initial-migration.sql
```

**Breaking This Down:**
- `cat` - Read file contents
- `database_backup_clean.sql` - The cleaned backup
- `>` - Redirect to (save to)
- `supabase/migrations/...` - The migration file location

**What This Does:**
- Puts all your SQL code into the migration file
- Supabase will run this when you push

---

### PHASE 5: Deploy to Supabase

#### Step 5.1: Push Migration to Supabase

```bash
supabase db push
```

**What Happens:**
1. Supabase shows you the migration file
2. Asks if you want to push it
3. You confirm by typing `y` or `Y`
4. Supabase applies your migration

**Expected Output:**
```
Initialising login role...
Connecting to remote database...
Do you want to push these migrations to the remote database?
 • 20260601135047_initial-migration.sql

 [Y/n] y
Applying migration 20260601135047_initial-migration.sql...
✓ Completed successfully
Remote database is up to date.
```

**Timeline:**
- For small databases: A few seconds
- For medium databases: 1-5 minutes
- For large databases: 5-30 minutes

---

## Understanding Each Command

### Command Reference

#### 1. `pg_dump` (Export)
**Purpose:** Creates a backup of your database

**Anatomy:**
```bash
PGPASSWORD=password pg_dump [options] -h host -p port -U username -d database > output.sql
```

**Common Options:**
| Option | Purpose |
|--------|---------|
| `--no-owner` | Skip owner/role info |
| `--no-privileges` | Skip permission info |
| `--inserts` | Use INSERT instead of COPY |
| `--schema-only` | Only structure, no data |
| `--data-only` | Only data, no structure |

---

#### 2. `awk` (Filter)
**Purpose:** Process and filter text

**This specific command:**
```bash
awk '!/^\\\\/' input.sql > output.sql
```

**Meaning:**
- `'!/^\\\\/'` - Keep lines that DON'T start with backslash
- Removes PostgreSQL meta-commands

---

#### 3. `supabase link` (Connect)
**Purpose:** Links your project folder to Supabase

**Stores:**
- Project reference
- Access tokens
- Configuration

---

#### 4. `supabase migration new` (Create)
**Purpose:** Creates a new migration file

**Naming Convention:**
- Timestamp ensures order
- Your migration name follows

---

#### 5. `supabase db push` (Deploy)
**Purpose:** Uploads and runs migrations on Supabase

**Behind the scenes:**
- Connects to your Supabase database
- Checks which migrations already ran
- Runs only new ones
- Updates migration history table

---

## Verification

### How to Verify Migration Worked

#### Step 1: Check Supabase Dashboard

1. Go to https://supabase.com
2. Click your project
3. Click "SQL Editor" in left menu
4. Run this query:

```sql
SELECT COUNT(*) as table_count FROM information_schema.tables 
WHERE table_schema = 'public';
```

**Result:** Should show your table count

---

#### Step 2: Check Data

```sql
SELECT * FROM your_table_name LIMIT 5;
```

**Expected:** Rows from your original database appear

---

#### Step 3: Compare Row Counts

**On your local database:**
```bash
PGPASSWORD=your_password psql -h localhost -p 5432 -U your_username -d your_database_name \
  -c "SELECT COUNT(*) FROM your_table_name;"
```

**On Supabase (using SQL Editor):**
```sql
SELECT COUNT(*) FROM your_table_name;
```

**Expected:** Same number of rows

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: "PGPASSWORD not recognized"

**Error:**
```
'PGPASSWORD' is not recognized as an internal or external command
```

**Solution (Windows):**
```bash
set PGPASSWORD=your_password
pg_dump -h localhost -p 5432 -U your_username -d your_database_name > backup.sql
```

---

#### Issue 2: "Connection refused"

**Error:**
```
psql: could not connect to server: Connection refused
```

**Causes:**
1. PostgreSQL not running locally
2. Wrong hostname/port

**Solution:**
```bash
# Start PostgreSQL (macOS)
brew services start postgresql

# Start PostgreSQL (Linux)
sudo systemctl start postgresql

# Check if running
netstat -an | grep 5432
```

---

#### Issue 3: "Role does not exist"

**Error:**
```
ERROR: role "username" does not exist
```

**Cause:** Used `--no-owner` but old backup still has owner references

**Solution:**
```bash
sed 's/ OWNER TO [^ ;]*//g' backup.sql > backup_clean.sql
```

---

#### Issue 4: "Syntax error at or near backslash"

**Error:**
```
ERROR: syntax error at or near "\" (SQLSTATE 42601)
```

**Cause:** PostgreSQL meta-commands not removed

**Solution:**
```bash
awk '!/^\\\\/' backup.sql > backup_clean.sql
```

---

#### Issue 5: "Network is unreachable"

**Error:**
```
Network is unreachable
```

**Causes:**
1. Internet connection down
2. Supabase IP blocked by firewall

**Solution:**
```bash
# Test internet
ping google.com

# Try from different network (mobile hotspot)
# Check firewall settings
```

---

#### Issue 6: "Migration timeout"

**Error:**
```
Command timed out after timeout_ms
```

**Cause:** Very large database

**Solution:**
```bash
# Split migration into smaller chunks
# Or increase timeout manually (advanced)
```

---

## Best Practices

### 1. Always Backup Before Migration
```bash
# Keep your original backup
cp database_backup.sql database_backup_ORIGINAL.sql
```

### 2. Test on Small Data First
```bash
# Export only schema first
pg_dump --schema-only -h localhost -p 5432 -U your_username -d your_database_name > schema_only.sql

# Test migration with just schema
```

### 3. Use Environment Variables for Sensitive Data

**Never do this:**
```bash
# ❌ Don't leave password in command history
pg_dump --password=your_password ...
```

**Do this:**
```bash
# ✅ Safer way
export PGPASSWORD=your_password
pg_dump -h localhost -p 5432 -U your_username -d your_database_name > backup.sql
unset PGPASSWORD
```

### 4. Document Your Process
```bash
# Create a script you can reuse
cat > migrate.sh << 'EOF'
#!/bin/bash
echo "Starting migration..."
PGPASSWORD=$1 pg_dump --no-owner --no-privileges --inserts \
  -h localhost -p 5432 -U $2 -d $3 > backup.sql
awk '!/^\\\\/' backup.sql > backup_clean.sql
supabase migration new migration-$(date +%s)
echo "Migration created. Run 'supabase db push' to deploy"
EOF

# Use it
bash migrate.sh your_password your_username your_database
```

### 5. Verify Data Integrity
```sql
-- Check total rows across all tables
SELECT 
    schemaname,
    tablename,
    (xpath('/row', query_to_xml('SELECT COUNT(*) FROM ' || schemaname || '.' || tablename, false)))[1]::text as rows
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### 6. Keep Backups
```bash
# Keep local backup
cp database_backup_clean.sql database_backup_supabase_copy.sql

# You now have:
# - database_backup.sql (original)
# - database_backup_clean.sql (cleaned)
# - database_backup_supabase_copy.sql (for records)
```

---

## Full Command Reference for Copy-Paste

### For Beginners: Fill in Your Values

```bash
# Step 1: Install CLI
sudo npm install -g supabase

# Step 2: Create backup (REPLACE VALUES IN QUOTES)
PGPASSWORD="YOUR_LOCAL_DB_PASSWORD" pg_dump --no-owner --no-privileges --inserts \
  -h localhost -p 5432 -U YOUR_LOCAL_USERNAME -d YOUR_LOCAL_DATABASE_NAME > database_backup.sql

# Step 3: Verify backup
wc -l database_backup.sql

# Step 4: Login
supabase login

# Step 5: Link project (REPLACE WITH YOUR PROJECT REF)
supabase link --project-ref YOUR_SUPABASE_PROJECT_REF

# Step 6: Clean backup
awk '!/^\\\\/' database_backup.sql > database_backup_clean.sql

# Step 7: Create migration
supabase migration new initial-migration

# Step 8: Copy data to migration
cat database_backup_clean.sql > supabase/migrations/20260601135047_initial-migration.sql

# Step 9: Deploy
supabase db push
```

---

## Real Example with Mock Credentials

```bash
# For someone with these credentials:
# - Local DB Password: MySecurePass2024!
# - Local Username: thobbs
# - Local Database: laravelnutrifydb
# - Supabase Project Ref: vwvgkyzgvpchzbzuhhfm

# Step 1: Install CLI
sudo npm install -g supabase

# Step 2: Create backup
PGPASSWORD="MySecurePass2024!" pg_dump --no-owner --no-privileges --inserts \
  -h localhost -p 5432 -U thobbs -d laravelnutrifydb > database_backup.sql

# Step 3: Verify
wc -l database_backup.sql
# Output: 11137 database_backup.sql

# Step 4: Login
supabase login
# Browser opens, you complete login, copy verification code

# Step 5: Link
supabase link --project-ref vwvgkyzgvpchzbzuhhfm
# Output: Finished supabase link.

# Step 6: Clean
awk '!/^\\\\/' database_backup.sql > database_backup_clean.sql

# Step 7: Create migration
supabase migration new initial-migration
# Output: Created new migration at supabase/migrations/20260601135047_initial-migration.sql

# Step 8: Copy to migration
cat database_backup_clean.sql > supabase/migrations/20260601135047_initial-migration.sql

# Step 9: Deploy
supabase db push
# Output shows confirmation prompts, you type 'y' when asked
# Migration runs and completes
```

---

## Conclusion

You've successfully migrated your database! Your data is now:
- ✅ In the cloud
- ✅ Backed up by Supabase
- ✅ Accessible from anywhere
- ✅ Ready for your application to use

### Next Steps:
1. Update your application connection string to use Supabase URL
2. Test your application with the new database
3. Keep backups of important data
4. Monitor Supabase dashboard for performance

---

## Support Resources

- **Supabase Docs:** https://supabase.com/docs
- **PostgreSQL Docs:** https://www.postgresql.org/docs
- **Supabase CLI Docs:** https://supabase.com/docs/reference/cli

---

**Document Version:** 1.0  
**Last Updated:** June 1, 2026  
**Author's Note:** This guide assumes no prior database experience. If something is confusing, re-read that section carefully before asking for help.
