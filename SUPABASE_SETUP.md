# BETNEXA Supabase Integration Setup Guide

## Overview
This guide walks through setting up BETNEXA with Supabase as the primary database. The system includes real-time synchronization between admin panel, database, and user interface.

## Prerequisites
- Supabase account (https://supabase.com)
- Node.js and npm installed
- The provided SQL schema file

## Step 1: Create Supabase Project

1. Go to https://supabase.com and sign up/login
2. Create a new project:
   - Click "New Project"
   - Give it a name: "betnexa-production" or similar
   - Choose a region closest to your users
   - Set a strong database password
   - Click "Create New Project"
3. Wait for the project to initialize (2-3 minutes)

## Step 2: Load Database Schema

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy the entire schema from `supabase-schema.sql`
4. Paste it into the SQL editor
5. Click **"Run"** to execute
6. Wait for completion (you should see "Success" messages)

This will create:
- All tables (users, games, bets, transactions, payments, etc.)
- Functions (for balance updates, bet settlement, etc.)
- Triggers (for automatic timestamps and cascading updates)
- Views (for stats and summaries)
- Row-Level Security policies
- Indexes for performance

## Step 3: Get Supabase Credentials

1. In Supabase Dashboard, go to **Settings > API**
2. Note down:
   - **Project URL**: `https://xxx.supabase.co`
   - **Project Anon Key**: `eyJhbGc...` (public key)
   - **Service Role Secret Key** (needed for backend operations)

3. For Auth, go to **Settings > Auth**
   - Confirm JWT Secret and other settings

## Step 4: Configure Environment Variables

### Backend (.env)
```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGci...
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_JWT_SECRET=your-jwt-secret

# Payment Services
PAYHERO_API_KEY=6CUxNcfi9jRpr4eWicAn
PAYHERO_API_SECRET=j6zP2XpAlXn9UhtHOj9PbYQVAdlQnkeyrEWuFOAH
PAYHERO_ACCOUNT_ID=3398

# Server Configuration
NODE_ENV=production
PORT=5000
CALLBACK_URL=https://your-domain.com/api/payments/callback
USE_MOCK_PAYMENTS=false
```

### Frontend (.env)
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_API_URL=https://your-domain.com/api
```

## Step 5: Update Backend Routes

Create `/server/routes/supabase.routes.js`:

```javascript
import express from 'express';
import supabaseService from '../services/supabaseService.js';

const router = express.Router();

// ==================== USER ROUTES ====================

// Get user profile
router.get('/users/:userId', async (req, res) => {
  try {
    const user = await supabaseService.getUserById(req.params.userId);
    res.json({ success: true, user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get all users (admin only)
router.get('/admin/users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .is('deleted_at', null);

    if (error) throw error;
    res.json({ success: true, users: data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update user (admin)
router.put('/admin/users/:userId', async (req, res) => {
  try {
    const user = await supabaseService.updateUser(req.params.userId, req.body);
    
    // Log admin action
    await supabaseService.logAdminAction(
      req.body.adminId,
      'user_edit',
      'user',
      req.params.userId,
      req.body
    );
    
    res.json({ success: true, user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update user balance (admin)
router.post('/admin/users/:userId/balance', async (req, res) => {
  try {
    const { amount, reason, adminId } = req.body;
    const user = await supabaseService.updateUserBalance(
      req.params.userId,
      amount,
      reason,
      adminId
    );
    
    res.json({ success: true, user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete user (admin)
router.delete('/admin/users/:userId', async (req, res) => {
  try {
    const adminId = req.body.adminId;
    const user = await supabaseService.deleteUser(req.params.userId, adminId);
    
    res.json({ success: true, message: 'User deleted successfully', user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ==================== GAME ROUTES ====================

// Get all games
router.get('/games', async (req, res) => {
  try {
    const games = await supabaseService.getAllGames();
    res.json({ success: true, games });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Create game (admin)
router.post('/admin/games', async (req, res) => {
  try {
    const game = await supabaseService.createGame(req.body);
    
    await supabaseService.logAdminAction(
      req.body.adminId,
      'game_create',
      'game',
      game.id,
      req.body
    );
    
    res.json({ success: true, game });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update game score (admin)
router.put('/admin/games/:gameId/score', async (req, res) => {
  try {
    const { homeScore, awayScore, status, adminId } = req.body;
    const game = await supabaseService.updateGameScore(
      req.params.gameId,
      homeScore,
      awayScore,
      status,
      adminId
    );
    
    res.json({ success: true, game });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ==================== BET ROUTES ====================

// Get user bets
router.get('/bets/user/:userId', async (req, res) => {
  try {
    const bets = await supabaseService.getUserBets(req.params.userId);
    res.json({ success: true, bets });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Place bet
router.post('/bets', async (req, res) => {
  try {
    const { userId, betData } = req.body;
    const bet = await supabaseService.createBet(userId, betData);
    
    res.json({ success: true, bet });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Settle bet (admin)
router.post('/admin/bets/:betId/settle', async (req, res) => {
  try {
    const { status, payoutAmount, adminId } = req.body;
    const bet = await supabaseService.settleBet(
      req.params.betId,
      status,
      payoutAmount,
      adminId
    );
    
    res.json({ success: true, bet });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ==================== TRANSACTION ROUTES ====================

// Get user transactions
router.get('/transactions/user/:userId', async (req, res) => {
  try {
    const transactions = await supabaseService.getUserTransactions(req.params.userId);
    res.json({ success: true, transactions });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ==================== ADMIN STATS ====================

// Get platform statistics (admin)
router.get('/admin/stats', async (req, res) => {
  try {
    const stats = await supabaseService.getPlatformStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get admin logs (admin)
router.get('/admin/logs', async (req, res) => {
  try {
    const logs = await supabaseService.getAdminLogs();
    res.json({ success: true, logs });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;
```

Add to `server/server.js`:
```javascript
import supabaseRoutes from './routes/supabase.routes.js';

app.use('/api/supabase', supabaseRoutes);
```

## Step 6: Update Frontend Services

Create `/src/services/supabaseClient.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Real-time subscription example
export function subscribeToGames(callback) {
  return supabase
    .from('games')
    .on('*', (payload) => {
      callback(payload)
    })
    .subscribe()
}

export function subscribeToUserBalance(userId, callback) {
  return supabase
    .from('users')
    .on('UPDATE', (payload) => {
      if (payload.new.id === userId) {
        callback(payload.new.account_balance)
      }
    })
    .subscribe()
}
```

## Step 7: Real-Time Synchronization

The database includes automatic triggers that:
1. Update timestamps on all changes
2. Sync admin edits instantly to database
3. Enable real-time subscriptions for frontend

Example frontend real-time listener in Context:

```typescript
useEffect(() => {
  // Subscribe to balance updates
  const subscription = supabase
    .from('users')
    .on('UPDATE', (payload) => {
      if (payload.new.id === userId) {
        setBalance(payload.new.account_balance)
        updateUser(payload.new)
      }
    })
    .subscribe()

  return () => supabase.removeSubscription(subscription)
}, [userId])
```

## Step 8: Row-Level Security (RLS)

The SQL schema includes RLS policies that:
- **Users**: Can only see their own data (except admins)
- **Games**: Visible to all users
- **Bets**: Users see only their own
- **Transactions**: Users see only their own
- **Admin Logs**: Only admins can access

To test RLS:
1. In Supabase, enable "Enforce RLS" on each table
2. Test with different user roles to verify permissions

## Step 9: Testing

### Test User Registration
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "phoneNumber": "254712345678",
    "password": "test123"
  }'
```

### Test Admin User Update
```bash
curl -X PUT http://localhost:5000/api/supabase/admin/users/[USER_ID] \
  -H "Content-Type: application/json" \
  -d '{
    "account_balance": 5000,
    "adminId": "[ADMIN_ID]"
  }'
```

### Test Balance Update
```bash
curl -X POST http://localhost:5000/api/supabase/admin/users/[USER_ID]/balance \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "reason": "admin_adjustment",
    "adminId": "[ADMIN_ID]"
  }'
```

## Database Diagram

```
users
├── id (PK)
├── username
├── phone_number
├── account_balance
├── is_admin
└── ...

games
├── id (PK)
├── home_team
├── away_team
├── status
├── home_score
└── ...

markets
├── id (PK)
├── game_id (FK)
├── market_key
├── odds
└── ...

bets
├── id (PK)
├── user_id (FK)
├── stake
├── potential_win
├── status
└── ...

bet_selections
├── id (PK)
├── bet_id (FK)
├── game_id (FK)
├── market_key
├── odds
└── ...

transactions
├── id (PK)
├── user_id (FK)
├── amount
├── status
├── type
└── ...

payments
├── id (PK)
├── transaction_id (FK)
├── user_id (FK)
├── status
├── external_reference
└── ...

admin_logs
├── id (PK)
├── admin_id (FK)
├── action
├── target_type
├── changes (JSONB)
└── ...
```

## Key Features

✅ **Real-Time Sync**: Changes instantly reflect across all sessions
✅ **Admin Audit Trail**: Every admin action logged with changes
✅ **Balance Tracking**: Complete history of all balance changes
✅ **Bet Settlement**: Automatic or manual bet settlement with payouts
✅ **Row-Level Security**: Enforced data privacy by role
✅ **Backup**: Supabase provides automatic backups
✅ **Scalability**: Handles millions of transactions
✅ **API**: Full REST API + Real-time subscriptions

## Troubleshooting

### Issue: "Permission denied" error
**Solution**: Check RLS policies are set correctly and service key is used for backend operations

### Issue: Real-time not working
**Solution**: Ensure Realtime is enabled in Supabase Settings > Realtime

### Issue: Schema import fails
**Solution**: Copy SQL in smaller chunks, or use Supabase CLI: `supabase db push`

## Production Checklist

- [ ] Enable RLS on all tables
- [ ] Set up database backups
- [ ] Configure CORS for your domain
- [ ] Update environment variables to production values
- [ ] Test all payment flows
- [ ] Configure edge functions for PayHero callbacks
- [ ] Set up monitoring and alerts
- [ ] Enable API rate limiting
- [ ] Regular security audits
- [ ] Comply with data protection regulations (GDPR, CCPA, etc.)

## Support & Documentation

- Supabase Docs: https://supabase.com/docs
- Supabase Dashboard: https://app.supabase.com
- BETNEXA Schema: See `supabase-schema.sql`
- Service Code: See `server/services/supabaseService.js`
