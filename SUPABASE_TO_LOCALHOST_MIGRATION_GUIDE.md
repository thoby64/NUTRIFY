# Complete Guide: Migrating PostgreSQL Database from Supabase to Localhost

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

This guide will walk you through migrating your entire PostgreSQL database from Supabase (cloud) back to your local machine. This is useful when you need to:
- Work offline with a copy of production data
- Test locally before applying changes to production
- Backup data locally for safety
- Debug issues with local tools
- Develop features without affecting the cloud database

By the end, your entire Supabase database (structure, data, schemas) will be running on your local PostgreSQL.

### What You're Doing:
- **Exporting** your Supabase database to a SQL file
- **Cleaning** the SQL file if needed
- **Creating** a new local database
- **Importing** the SQL into your local database
- **Verifying** everything worked correctly

---

## Prerequisites

Before starting, you need:

1. **PostgreSQL installed locally** on your machine
   - `pg_dump` - for exporting databases
   - `psql` - for importing databases
   - `createdb` - for creating new databases

2. **Supabase project credentials**
   - Your Supabase project URL
   - Your database password
   - Your project reference ID (e.g., `vwvgkyzgvpchzbzuhhfm`)

3. **Access to your local PostgreSQL**
   - Usually runs on `localhost:5432`
   - Default user is often `postgres`
   - You need the password

4. **Supabase CLI installed** (optional but helpful)
   ```bash
   npm install -g supabase
   ```

---

## Step-by-Step Migration Process

### PHASE 1: Get Supabase Database Credentials

#### Step 1.1: Find Your Supabase Connection String

1. Go to https://supabase.com
2. Click your project
3. Click "Connect" button (top right)
4. Click "PostgreSQL" tab
5. Copy the connection string

**It should look like:**
```
postgresql://postgres:PASSWORD@db.PROJECTREF.supabase.co:5432/postgres
```

**Example with mock credentials:**
```
postgresql://postgres:Superbasethh@0064@db.vwvgkyzgvpchzbzuhhfm.supabase.co:5432/postgres
```

**Break it down:**
| Part | Value |
|------|-------|
| `postgres` | Username |
| `Superbasethh@0064` | Password |
| `db.vwvgkyzgvpchzbzuhhfm.supabase.co` | Host |
| `5432` | Port |
| `postgres` | Database name |

---

### PHASE 2: Export from Supabase

#### Step 2.1: Create Backup from Supabase

This command connects to your online Supabase database and creates a backup.

```bash
PGPASSWORD="your_supabase_password" pg_dump -h db.your_project_ref.supabase.co \
  -p 5432 -U postgres -d postgres > supabase_backup.sql
```

**Real Example with Mock Credentials:**
```bash
PGPASSWORD="Superbasethh@0064" pg_dump -h db.vwvgkyzgvpchzbzuhhfm.supabase.co \
  -p 5432 -U postgres -d postgres > supabase_backup.sql
```

**Breaking Down This Command:**

| Part | Meaning | Your Value |
|------|---------|-----------|
| `PGPASSWORD="Superbasethh@0064"` | Your Supabase password | From Supabase connection string |
| `pg_dump` | The export tool | (stays same) |
| `-h db.vwvgkyzgvpchzbzuhhfm.supabase.co` | Supabase host | Your host from connection string |
| `-p 5432` | Port - always 5432 for Supabase | (stays same) |
| `-U postgres` | Username - always postgres for Supabase | (stays same) |
| `-d postgres` | Database - always postgres for Supabase | (stays same) |
| `> supabase_backup.sql` | Save to this file | (stays same) |

**What's Happening:**
1. Connecting to your online Supabase database
2. Exporting entire database structure and data
3. Saving it locally as `supabase_backup.sql`

**Expected Output:**
Nothing prints, but a file `supabase_backup.sql` appears in your current directory

**Verify it worked:**
```bash
wc -l supabase_backup.sql
```

You should see a number like `11137` (total lines in your backup)

**Troubleshooting the connection:**
If you get "Network is unreachable", see [Network Issues](#issue-5-network-is-unreachable) in Troubleshooting.

---

#### Step 2.2 (Optional): Clean the Backup File

If you get errors during import, remove PostgreSQL meta-commands:

```bash
awk '!/^\\\\/' supabase_backup.sql > supabase_backup_clean.sql
```

**Only do this if you encounter errors in Step 3.2**

---

### PHASE 3: Create Local Database

#### Step 3.1: Check Your Local PostgreSQL

First, verify PostgreSQL is running locally:

```bash
psql --version
```

**Expected Output:**
```
psql (PostgreSQL) 15.2
```

**If you get "command not found":**
- PostgreSQL not installed
- See [PostgreSQL Not Installed](#issue-2-postgresql-not-running-locally) in Troubleshooting

---

#### Step 3.2: Connect to Local PostgreSQL

Connect to your local database as the default user:

```bash
psql -h localhost -p 5432 -U postgres
```

**What This Does:**
- Connects to your local PostgreSQL
- `-h localhost` - local machine
- `-p 5432` - standard port
- `-U postgres` - as postgres user (default admin)

**Expected Output:**
```
Password for user postgres:
```

**Type your local PostgreSQL password** (the one you set when installing PostgreSQL)

**Successful Connection Shows:**
```
psql (15.2)
Type "help" for help.

postgres=#
```

---

#### Step 3.3: Create a New Database

While in `psql`, create a new database for your Supabase data:

```bash
CREATE DATABASE supabase_local;
```

**What This Does:**
- Creates a new empty database named `supabase_local`
- You'll import Supabase data into this

**Expected Output:**
```
CREATE DATABASE
```

---

#### Step 3.4: Exit psql

```bash
\q
```

Or press `Ctrl + D`

**Expected Output:**
Back to your terminal prompt

---

### PHASE 4: Import Data to Local Database

#### Step 4.1: Import the Backup

Now import your Supabase backup into the new local database:

```bash
PGPASSWORD="your_local_postgres_password" psql -h localhost -p 5432 \
  -U postgres -d supabase_local < supabase_backup.sql
```

**Real Example with Mock Credentials:**
```bash
PGPASSWORD="LocalPostgresPass2024" psql -h localhost -p 5432 \
  -U postgres -d supabase_local < supabase_backup.sql
```

**Breaking Down This Command:**

| Part | Meaning | Your Value |
|------|---------|-----------|
| `PGPASSWORD="LocalPostgresPass2024"` | Your LOCAL PostgreSQL password | Your local postgres password |
| `psql` | The import tool | (stays same) |
| `-h localhost` | Host - your machine | (stays same) |
| `-p 5432` | Port - standard | (stays same) |
| `-U postgres` | Username | (stays same) |
| `-d supabase_local` | Target database | Your new local database name |
| `< supabase_backup.sql` | Read from backup file | (stays same) |

**What's Happening:**
1. Connecting to your local PostgreSQL
2. Reading the backup SQL file
3. Executing all SQL statements
4. Creating tables, schemas, indexes
5. Inserting all data

**Expected Output:**
```
CREATE SCHEMA
CREATE TYPE
CREATE TABLE
...
INSERT 0 1000
...
```

Many lines of output showing progress

**Timeline:**
- For small databases: A few seconds
- For medium databases: 1-5 minutes
- For large databases: 5-30 minutes

**Monitor Progress:**
The import should show progress. If it stops without completing, see [Import Hangs](#issue-7-import-process-hangs-or-stalls) in Troubleshooting.

---

### PHASE 5: Verify Migration

#### Step 5.1: Connect to Your New Local Database

```bash
psql -h localhost -p 5432 -U postgres -d supabase_local
```

**Enter your local PostgreSQL password when prompted**

**Expected Output:**
```
psql (15.2)
Type "help" for help.

supabase_local=#
```

---

#### Step 5.2: Check Table Count

While in `psql`, check how many tables were created:

```sql
SELECT COUNT(*) as table_count FROM information_schema.tables 
WHERE table_schema = 'public';
```

**Expected Output:**
```
 table_count
─────────────
          15
(1 row)
```

**Note the number** - should match your original database

---

#### Step 5.3: List All Tables

See the actual table names:

```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

**Expected Output:**
```
         tablename
─────────────────────────────
 client_planning_profiles
 clients
 migrations
 password_resets
 personal_access_tokens
 sessions
 users
(7 rows)
```

**These should match your Supabase tables**

---

#### Step 5.4: Check Data in a Table

Verify data was imported:

```sql
SELECT COUNT(*) FROM your_table_name;
```

**Example:**
```sql
SELECT COUNT(*) FROM clients;
```

**Expected Output:**
```
 count
───────
   245
(1 row)
```

**Compare this with Supabase:**
- Log into Supabase
- SQL Editor → Run same query
- Should have same number of rows

---

#### Step 5.5: Check Database Size

```sql
SELECT pg_size_pretty(pg_database_size('supabase_local'));
```

**Expected Output:**
```
 pg_size_pretty
────────────────
 156 MB
(1 row)
```

This shows your total database size

---

#### Step 5.6: Exit psql

```sql
\q
```

---

## Understanding Each Command

### Command Reference

#### 1. `pg_dump` (Export from Remote)
**Purpose:** Exports Supabase database to a local SQL file

**Anatomy:**
```bash
PGPASSWORD=password pg_dump -h host -p port -U username -d database > output.sql
```

**Key Difference from Local:**
- `-h` points to Supabase server instead of `localhost`
- Password usually contains special characters (use quotes)

---

#### 2. `psql` (Import to Local)
**Purpose:** Imports SQL file into local database

**Anatomy:**
```bash
PGPASSWORD=password psql -h localhost -p port -U username -d database < input.sql
```

**Common Variations:**

**Interactive mode (connect manually):**
```bash
psql -h localhost -p 5432 -U postgres -d database_name
```

**Execute single command:**
```bash
psql -h localhost -p 5432 -U postgres -d database_name -c "SELECT COUNT(*) FROM users;"
```

---

#### 3. `createdb` (Create Database)
**Purpose:** Creates new database (alternative to SQL CREATE DATABASE)

**Usage:**
```bash
createdb -h localhost -p 5432 -U postgres my_new_database
```

**Equivalent SQL:**
```sql
CREATE DATABASE my_new_database;
```

---

### psql Special Commands

**These work inside psql (after `psql>` prompt):**

| Command | Purpose |
|---------|---------|
| `\l` | List all databases |
| `\dt` | List all tables |
| `\d tablename` | Describe table structure |
| `\c databasename` | Connect to database |
| `\q` | Quit psql |
| `\h` | Help on SQL commands |
| `SELECT * FROM users LIMIT 5;` | Run SQL query |

---

## Verification

### Complete Verification Checklist

#### ✅ Step 1: Table Structure Verification

**Run locally:**
```sql
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'clients' ORDER BY ordinal_position;
```

**Run on Supabase (SQL Editor):**
Same query

**Compare:** Column names and data types should match exactly

---

#### ✅ Step 2: Row Count Verification

**For each important table:**

**Locally:**
```bash
PGPASSWORD="your_password" psql -h localhost -p 5432 -U postgres \
  -d supabase_local -c "SELECT COUNT(*) FROM clients;"
```

**On Supabase:**
Use SQL Editor to run same query

**Compare:** Should be identical

---

#### ✅ Step 3: Data Sample Verification

**Locally:**
```sql
SELECT * FROM clients WHERE id = 1;
```

**On Supabase:**
Same query

**Compare:** All column values should match

---

#### ✅ Step 4: Indexes and Constraints

**Check indexes were created:**
```sql
SELECT indexname FROM pg_indexes WHERE tablename = 'clients';
```

**Check constraints:**
```sql
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'clients';
```

---

#### ✅ Step 5: Sequences (for auto-increment)

**Check sequences:**
```sql
SELECT * FROM information_schema.sequences WHERE sequence_schema = 'public';
```

**Verify they're in sync:**
```sql
SELECT last_value FROM clients_id_seq;
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: "Password authentication failed"

**Error:**
```
psql: error: FATAL: password authentication failed for user "postgres"
```

**Causes:**
1. Wrong password
2. Wrong username
3. PostgreSQL not running

**Solutions:**

**Check if PostgreSQL is running:**
```bash
# Linux
sudo systemctl status postgresql

# macOS
brew services list | grep postgresql

# Windows
# Check Services app
```

**Start PostgreSQL if needed:**
```bash
# Linux
sudo systemctl start postgresql

# macOS
brew services start postgresql
```

**Reset password (if you forgot it):**
```bash
# Linux - as root
sudo -u postgres psql

# Then inside psql:
ALTER USER postgres WITH PASSWORD 'new_password';
\q
```

---

#### Issue 2: "PostgreSQL not running locally"

**Error:**
```
psql: could not connect to server: Connection refused
Is the server running on host "localhost" (127.0.0.1) port 5432?
```

**Solution:**

**macOS:**
```bash
brew services start postgresql
```

**Linux:**
```bash
sudo systemctl start postgresql
```

**Windows:**
- Open Services application
- Find "PostgreSQL"
- Right-click → Start

**Check if running:**
```bash
# Should show PostgreSQL process
ps aux | grep postgres
```

---

#### Issue 3: "Supabase host unreachable"

**Error:**
```
pg_dump: error: could not translate host name "db.vwvgkyzgvpchzbzuhhfm.supabase.co" to address
```

**Causes:**
1. Internet connection down
2. Wrong host name
3. Firewall blocking connection

**Solutions:**

**Test internet:**
```bash
ping google.com
```

**Test Supabase connection:**
```bash
ping db.vwvgkyzgvpchzbzuhhfm.supabase.co
```

**If still fails:**
- Try from mobile hotspot
- Check firewall settings
- Verify host name from Supabase dashboard

---

#### Issue 4: "Database does not exist"

**Error:**
```
psql: error: FATAL: database "supabase_local" does not exist
```

**Cause:** Database wasn't created

**Solution:**

**Create it manually:**
```bash
psql -h localhost -p 5432 -U postgres -c "CREATE DATABASE supabase_local;"
```

**Verify it exists:**
```bash
psql -h localhost -p 5432 -U postgres -l
```

---

#### Issue 5: "Connection timeout during export"

**Error:**
```
pg_dump: error: server does not respond
```

**Causes:**
1. Large database
2. Network instability
3. Supabase server overloaded

**Solutions:**

**Try again (sometimes it's temporary):**
```bash
PGPASSWORD="your_password" pg_dump -h db.YOUR_REF.supabase.co \
  -p 5432 -U postgres -d postgres > supabase_backup.sql
```

**Export schema only first:**
```bash
PGPASSWORD="your_password" pg_dump --schema-only \
  -h db.YOUR_REF.supabase.co -p 5432 -U postgres -d postgres > schema_only.sql
```

**Then export data separately:**
```bash
PGPASSWORD="your_password" pg_dump --data-only \
  -h db.YOUR_REF.supabase.co -p 5432 -U postgres -d postgres > data_only.sql
```

---

#### Issue 6: "Syntax error during import"

**Error:**
```
psql: error: syntax error at or near "\"
```

**Cause:** PostgreSQL meta-commands in backup

**Solution:**

**Clean the backup:**
```bash
awk '!/^\\\\/' supabase_backup.sql > supabase_backup_clean.sql
```

**Then import cleaned version:**
```bash
PGPASSWORD="your_password" psql -h localhost -p 5432 \
  -U postgres -d supabase_local < supabase_backup_clean.sql
```

---

#### Issue 7: "Import process hangs or stalls"

**Error:**
Process seems stuck for too long

**Cause:**
1. Large dataset
2. Slow disk
3. Network timeout
4. Foreign key constraints checking

**Solutions:**

**Let it continue** - Very large imports can take 30+ minutes

**Check progress in another terminal:**
```bash
# Linux/macOS - watch the log file size
watch -n 5 'wc -l supabase_backup.sql'

# Windows - keep checking
wc -l supabase_backup.sql
```

**If truly stuck, restart:**
1. Press `Ctrl + C` to stop
2. Drop the incomplete database:
```bash
psql -h localhost -p 5432 -U postgres -c "DROP DATABASE supabase_local;"
```
3. Create new database again
4. Try again with cleaned backup file

---

#### Issue 8: "Permission denied"

**Error:**
```
permission denied for schema public
```

**Cause:** User permissions don't allow creating objects

**Solution:**

**Grant permissions:**
```sql
-- Connect as postgres first
psql -h localhost -p 5432 -U postgres -d supabase_local

-- Then run:
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
```

---

## Best Practices

### 1. Always Backup Both Ways
```bash
# Keep original Supabase backup
cp supabase_backup.sql supabase_backup_ORIGINAL.sql

# Keep cleaned version
cp supabase_backup_clean.sql supabase_backup_CLEAN.sql
```

### 2. Use Descriptive Database Names
```bash
# ✅ Good naming
CREATE DATABASE supabase_prod_backup_2026_06_01;
CREATE DATABASE supabase_dev_copy;
CREATE DATABASE supabase_for_testing;

# ❌ Confusing naming
CREATE DATABASE temp_db;
CREATE DATABASE backup;
```

### 3. Verify Before Deleting
```bash
# NEVER delete Supabase database immediately
# Keep it for at least 24 hours
# Verify all data is safely on local first

# Then safely delete:
DROP DATABASE supabase_local;
```

### 4. Document Your Process
```bash
# Create a script for future migrations
cat > backup_from_supabase.sh << 'EOF'
#!/bin/bash
# Backup Supabase database to local
# Usage: bash backup_from_supabase.sh

SUPABASE_HOST="db.YOUR_REF.supabase.co"
SUPABASE_PASS="YOUR_PASSWORD"
LOCAL_DB="supabase_backup_$(date +%Y%m%d_%H%M%S)"

echo "Exporting from Supabase..."
PGPASSWORD="$SUPABASE_PASS" pg_dump -h $SUPABASE_HOST \
  -p 5432 -U postgres -d postgres > supabase_export.sql

echo "Creating local database..."
createdb -h localhost -p 5432 -U postgres $LOCAL_DB

echo "Importing to local..."
PGPASSWORD="YOUR_LOCAL_PASS" psql -h localhost -p 5432 \
  -U postgres -d $LOCAL_DB < supabase_export.sql

echo "Done! Database: $LOCAL_DB"
EOF

chmod +x backup_from_supabase.sh
```

### 5. Monitor Disk Space
```bash
# Check available space before import
df -h

# Check backup file size
ls -lh supabase_backup.sql

# You need at least 2x the backup file size
```

### 6. Use Screen or Tmux for Long Operations
```bash
# For very large databases, use screen to prevent interruptions

# Start screen session
screen -S supabase_migration

# Run import (it continues even if terminal closes)
PGPASSWORD="your_password" psql -h localhost -p 5432 \
  -U postgres -d supabase_local < supabase_backup.sql

# Detach: Ctrl + A, then D
# Reattach later: screen -r supabase_migration
```

### 7. Compress Your Backups
```bash
# After successful import, compress backup to save space
gzip supabase_backup.sql

# Later, to use it again
gunzip supabase_backup.sql.gz
```

### 8. Version Your Database Copies
```bash
# Create timestamped backups
BACKUP_NAME="supabase_backup_$(date +%Y%m%d_%H%M%S).sql"
PGPASSWORD="your_password" pg_dump -h db.YOUR_REF.supabase.co \
  -p 5432 -U postgres -d postgres > $BACKUP_NAME

# Keep multiple versions
ls -l supabase_backup_*.sql
```

---

## Full Command Reference for Copy-Paste

### Quick Reference (Fill in Your Values)

```bash
# Step 1: Get Supabase credentials
# Go to: https://supabase.com → Your Project → Connect
# Copy connection string

# Step 2: Export from Supabase
PGPASSWORD="SUPABASE_PASSWORD" pg_dump \
  -h db.YOUR_PROJECT_REF.supabase.co \
  -p 5432 -U postgres -d postgres > supabase_backup.sql

# Step 3: Verify export
wc -l supabase_backup.sql

# Step 4: Create local database
psql -h localhost -p 5432 -U postgres -c "CREATE DATABASE supabase_local;"

# Step 5: Import to local
PGPASSWORD="YOUR_LOCAL_POSTGRES_PASSWORD" psql \
  -h localhost -p 5432 -U postgres \
  -d supabase_local < supabase_backup.sql

# Step 6: Verify import
psql -h localhost -p 5432 -U postgres -d supabase_local \
  -c "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';"
```

---

## Real Example with Mock Credentials

```bash
# Using these credentials:
# - Supabase Host: db.vwvgkyzgvpchzbzuhhfm.supabase.co
# - Supabase Password: Superbasethh@0064
# - Local Database: supabase_local
# - Local Postgres Password: LocalPostgresPass2024

# Step 1: Export from Supabase
PGPASSWORD="Superbasethh@0064" pg_dump \
  -h db.vwvgkyzgvpchzbzuhhfm.supabase.co \
  -p 5432 -U postgres -d postgres > supabase_backup.sql

# Output: File created, no text output

# Step 2: Verify
wc -l supabase_backup.sql
# Output: 11137 supabase_backup.sql

# Step 3: Create local database
psql -h localhost -p 5432 -U postgres -c "CREATE DATABASE supabase_local;"
# Output: Password prompt → Enter local postgres password
# Output: CREATE DATABASE

# Step 4: Import to local
PGPASSWORD="LocalPostgresPass2024" psql \
  -h localhost -p 5432 -U postgres \
  -d supabase_local < supabase_backup.sql

# Output: Many CREATE/INSERT statements scrolling
# Output: Process completes

# Step 5: Verify
psql -h localhost -p 5432 -U postgres -d supabase_local \
  -c "SELECT COUNT(*) FROM clients;"
# Output: Password prompt → count
#    count
# ────────
#     245
```

---

## Conclusion

You've successfully migrated your Supabase database locally! You now have:
- ✅ A complete copy of your Supabase data on your machine
- ✅ Ability to work offline
- ✅ Local backup for safety
- ✅ Environment for testing and development

### Next Steps:
1. Verify all data matches original
2. Test your local application against new database
3. Keep backups safe
4. Update your application configuration if needed

### When to Use This:
- **Development:** Working on features without touching production
- **Testing:** Running tests on real data
- **Backup:** Local safety copy
- **Analysis:** Complex queries on large dataset
- **Migration:** Moving data between environments

---

## Support Resources

- **Supabase Docs:** https://supabase.com/docs
- **PostgreSQL Docs:** https://www.postgresql.org/docs
- **psql Commands:** https://www.postgresql.org/docs/current/app-psql.html

---

**Document Version:** 1.0  
**Last Updated:** June 1, 2026  
**Author's Note:** This guide assumes basic terminal knowledge. If you're stuck, re-read the relevant section carefully, and don't skip the verification steps.
