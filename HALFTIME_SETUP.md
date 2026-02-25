# Adding is_halftime Column to Supabase

The app needs the `is_halftime` column added to the `games` table to support halftime functionality.

## Option 1: Run SQL in Supabase Web UI (Recommended)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" on the left sidebar
4. Create a new query and paste this:

```sql
ALTER TABLE games ADD COLUMN IF NOT EXISTS is_halftime BOOLEAN DEFAULT FALSE;
```

5. Click "RUN"
6. Refresh your browser (Ctrl+F5 or Cmd+Shift+R)

## Option 2: Run via Supabase CLI

```bash
supabase db push
```

This will run all migrations in the migrations folder.

## Verification

After running the migration, test by:
1. Creating a new game in admin
2. Starting kickoff
3. When timer hits ~45 seconds, click "Halftime" button in admin
4. Should show halftime status without errors
