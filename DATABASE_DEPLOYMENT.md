# Database Schema Deployment Guide

## Quick Summary
✅ Supabase connection verified  
❌ Tables need to be created  

## Deploy Schema to Supabase

### Method 1: Supabase Dashboard (Easiest) - 2 minutes

1. **Open Supabase Dashboard**
   - Go to: https://app.supabase.com
   - Click your project: **eaqogmybihiqzivuwyav**

2. **Navigate to SQL Editor**
   - Left sidebar → **SQL Editor**
   - Click **New Query** button

3. **Load the Schema**
   - Open file: `supabase-schema-fresh.sql`
   - Copy the entire contents (Ctrl+A then Ctrl+C)

4. **Execute the Schema**
   - Paste into the SQL editor
   - Click **Run** button (top-right)
   - Wait for completion (30-60 seconds)

5. **Verify Creation**
   - Left sidebar → **Table Editor**
   - Check these tables exist:
     ✓ users
     ✓ games
     ✓ bets
     ✓ transactions
     ✓ payments
     ✓ settings
     ✓ admin_logs
     ✓ balance_history

### Method 2: Using PostgreSQL Client

```bash
# Install psql if you don't have it
# Then run:

psql postgresql://postgres:[PASSWORD]@db.eaqogmybihiqzivuwyav.supabase.co:5432/postgres \
  -f supabase-schema-fresh.sql
```

Get password from: Supabase Dashboard → Settings → Database → Password

---

## After Schema Deployment

Run this command to verify:
```bash
cd server
npm run test-connection
```

Expected output:
```
✅ users
✅ games
✅ bets
✅ transactions
✅ payments
✅ settings
✅ admin_logs
✅ balance_history
```

---

## Start the Application

```bash
# Install dependencies (if not done)
npm install

# Start frontend (from root):
npm run dev

# Start backend (from server folder):
npm start
```

---

## Multi-Device Login Setup

Your system already supports multi-device login through:
- **Supabase Sessions Table**: Tracks active sessions per device
- **Session Management**: Each device gets unique session token
- **UserContext**: Handles session persistence

Users can login on multiple devices and each will maintain separate sessions.

---

## Admin Portal Setup

The admin portal is already integrated:
- Admin users identified by `is_admin = true` in users table
- Secret admin panel at `/admin`
- Full database control via admin functions
