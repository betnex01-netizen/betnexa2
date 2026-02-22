# SUPABASE SETUP GUIDE FOR BETNEXA

## Step 1: Get Your Supabase Service Key

1. Go to https://app.supabase.com/
2. Click your project: **eaqogmybihiqzivuwyav**
3. Go to **Settings** → **API**
4. Copy the **service_role** secret key (NOT the anon key)
   - This will be your `SUPABASE_SERVICE_KEY`

## Step 2: Create Database Tables

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste the ENTIRE contents of `supabase-schema-fresh.sql`
4. Click **Run**
5. Wait for all tables to be created ✅

## Step 3: Update Backend Environment

In `server/.env`:
```
SUPABASE_URL=https://eaqogmybihiqzivuwyav.supabase.co
SUPABASE_SERVICE_KEY=<your-service-key-here>
SUPABASE_ANON_KEY=<your-anon-key-here>
```

⚠️ **Never commit .env files with real secrets!** Add to .gitignore

## Step 4: Update Frontend Environment

On Vercel Dashboard (betnexa project):
- Settings → Environment Variables
- Add:
  ```
  VITE_SUPABASE_URL=https://eaqogmybihiqzivuwyav.supabase.co
  VITE_SUPABASE_ANON_KEY=<your-anon-key-here>
  VITE_API_URL=https://server-chi-orcin.vercel.app
  ```

## Step 5: Enable Supabase Auth

1. In Supabase Dashboard → Authentication → Providers
2. Enable **Email/Password**
3. Go to **URL Configuration**
4. Add Redirect URLs:
   - `http://localhost:3000/**`
   - `https://betnexa-****.vercel.app/**` (your frontend URL)
   - `https://server-chi-orcin.vercel.app/**`

## Step 6: Test Connection

1. Deploy backend with new key
2. Check: `https://server-chi-orcin.vercel.app/api/health`
3. Should see: `{"status":"Server is running"...}`

Once done, tell me and I'll update the code to properly use Supabase!
