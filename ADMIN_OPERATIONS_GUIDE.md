# BETNEXA Admin Operations Guide

## Overview
This guide explains how the admin panel interacts with Supabase database to manage users, games, bets, and transactions in real-time.

## Architecture

```
Admin Panel (React)
    ↓ Update request
Backend API (Express)
    ↓ Validate & Log
Supabase Database (PostgreSQL)
    ↓ Triggers & Functions
Real-time Updates
    ↓ Subscription
All Connected Users & Admin Panel
```

## Admin Features

### 1. User Management

#### Access Admin Panel
- URL: `https://your-domain.com/muleiadmin`
- Login with admin credentials:
  - Phone: `0714945142`
  - Password: `4306`

#### View All Users
- **Location**: Admin Panel → Users Tab
- **What you see**:
  - Username
  - Phone number
  - Account balance
  - Total bets placed
  - Total winnings
  - Verification status
  - Withdrawal activation status
  - User status (active, suspended, banned)

#### Edit User Details
1. Click the user row
2. Click "Edit User" button
3. Modify fields:
   - Email
   - Verification status
   - Withdrawal activation
4. Click "Save"
5. **Database action**: Updates `users` table, logs to `admin_logs`
6. **User experiences**: Their profile updates immediately (if logged in)

#### Adjust User Balance
1. Select user
2. Click "Edit Balance"
3. Enter:
   - New amount
   - Reason (bonus, correction, penalty, etc.)
4. Click "Save"
5. **Database changes**:
   - Updates `users.account_balance`
   - Creates `balance_history` record
   - Creates `admin_logs` entry
6. **Real-time effect**: Balance updates instantly for user

#### Delete User
1. Select user
2. Click "Delete User" (red button)
3. Confirm in dialog
4. **Database action**:
   - Soft-deletes user (sets `deleted_at` timestamp)
   - Deletes all transactions
   - Deletes all bets
   - User can no longer login
5. **Email**: User receives account deletion notice

---

### 2. Game Management

#### Create New Game
1. Admin Panel → Games Tab
2. Click "Add Game"
3. Enter:
   - League (Premier League, La Liga, etc.)
   - Home team name
   - Away team name
   - Home team odds (e.g., 2.00)
   - Draw odds (e.g., 3.00)
   - Away team odds (e.g., 3.50)
   - Match time
4. Click "Create"
5. **Database action**:
   - Creates `games` record
   - Auto-generates `game_id`
   - Creates market odds in `markets` table via function
   - Logs action to `admin_logs`
6. **Live action**: Game appears immediately on betting interface

#### Update Game Status

##### Mark as Live
1. Select game
2. Click "Kickoff"
3. Game marked as "live"
4. **Effects**:
   - All bets on this game stop accepting new bets
   - Live score updates become available
   - Status changes to "live" in `games` table

##### Update Live Score
1. While game is live, enter:
   - Home team score
   - Away team score
2. Click "Update Score"
3. **Database changes**:
   - Updates `games.home_score` and `games.away_score`
   - Odds auto-adjust based on score (if enabled)
   - `markets` table odds update dynamically
   - Live users see score instantly
4. **Affect on bets**:
   - Over/Under bets can auto-settle
   - BTTS bets can auto-settle
   - Correct Score bets marked as lost if impossible

##### End Game
1. Click "End Game"
2. Confirm
3. **Database action**:
   - Sets status to "finished"
   - Sets `finished_at` timestamp
   - All live betting closes
4. **Cascade effect**: Unsettled bets auto-process

#### Update Market Odds (Optional)
1. Select game
2. Click "Edit Markets" (gear icon)
3. Adjust odds for different markets
4. Click "Save"
5. **Database action**:
   - Updates `markets` table
   - Live users see new odds instantly
   - Newly placed bets use new odds
   - Existing bets keep original odds

---

### 3. Bet Management

#### View All Bets
1. Admin Panel → Bets Tab
2. See all bets with:
   - Bet ID
   - User
   - Stake amount
   - Potential win
   - Current status (Open, Won, Lost, etc.)
   - Created date
   - Selections

#### Manual Bet Settlement
When you end a game, unsettled bets auto-process, but you can also manually settle:

1. Click on unsettled bet
2. Click "Settle Bet"
3. Select outcome:
   - **Won**: Enter payout amount
   - **Lost**: No amount needed
   - **Void**: Refund stake
4. Click "Confirm"
5. **Database changes**:
   - Updates `bets.status`
   - Updates `bets.settled_at`
   - For Won bets:
     - Adds payout to `users.account_balance`
     - Updates `users.total_winnings`
     - Creates `transactions` record
     - Creates `balance_history` record
   - Logs action to `admin_logs`
6. **User effect**: User receives payout instantly

#### View Bet Details
1. Click bet row
2. See all selections with:
   - Market (1X2, BTTS, O/U, etc.)
   - Selection made
   - Odds
   - Current outcome status
   - Game status

#### Cancel Bet
1. Only if game hasn't finished
2. Click "Cancel Bet"
3. Confirm
4. **Database action**:
   - Sets status to "Void"
   - Refunds stake to user
   - Updates balance and history

---

### 4. Transaction Management

#### View Transactions
- Admin Panel → Transactions Tab
- See all deposits, withdrawals, payouts
- Filter by:
  - User
  - Type (deposit/withdrawal/payout/adjustment)
  - Status (pending/completed/failed)
  - Date range

#### Resolve Failed Payments
1. Click "Failed Payments" section
2. Select failed payment
3. Options:
   - **Mark as Complete**: Confirm payment received
   - **Refund**: Cancel and return stake
   - **Manual MPesa Receipt**: Enter receipt number
4. Click "Resolve"
5. **Database action**:
   - Updates `payments.status`
   - Updates `transactions.status`
   - Updates user balance if completing
   - Creates audit log

---

### 5. Statistics & Analytics

#### Dashboard Stats
Real-time displays:
- **Total Users**: Count of active users
- **Revenue Today**: Sum of deposits minus payouts
- **Active Bets**: Count of open bets
- **Total Processed**: Lifetime transactions

#### Revenue Reports
View by date range:
- Total deposits
- Total payouts
- Net revenue
- Average bet size
- Win rate

#### User Statistics
Per user:
- Total bets placed
- Total amount wagered
- Total winnings
- Current balance
- Win percentage
- Average odds

#### Game Performance
Per game:
- Total bets placed
- Total stake amount
- Actual result
- Result vs predictions
- User accuracy

---

### 6. Audit Trail

#### Admin Logs
- **Location**: Admin Panel → Logs Tab
- **What's tracked**:
  - User edits
  - Balance adjustments
  - Game updates
  - Score changes
  - Bet settlements
  - Payment resolutions
  - Settings changes

#### Each Log Shows
- Admin who performed action
- Action type
- Target (user/game/bet/etc)
- What changed (old vs. new values)
- Timestamp
- IP address (if available)

#### Export Logs
- Click "Export" to download as CSV
- Useful for compliance & audits

---

## Real-Time Synchronization Examples

### Example 1: Admin Updates User Balance

**Step-by-step:**
1. Admin opens User: Ahmed
   - Current balance: KSH 2,000
2. Admin clicks "Balance" → Adjusts to KSH 3,000
3. **What happens in database**:
   ```sql
   -- users table updated
   UPDATE users SET account_balance = 3000 WHERE id = 'user-123'
   
   -- balance_history records change
   INSERT INTO balance_history (..., change = 1000, reason = 'admin_adjustment')
   
   -- admin_logs records action
   INSERT INTO admin_logs (action = 'balance_adjust', changes = {...})
   ```
4. **What Ahmed sees** (if logged in):
   - His balance updates from KSH 2,000 → KSH 3,000
   - Happens within 1-2 seconds
   - No page refresh needed

---

### Example 2: Admin Updates Game Score

**Step-by-step:**
1. Game: Manchester vs Liverpool (LIVE)
   - Status in DB: "live"
   - Current: 0-0
2. Admin enters: Home 1-0
3. **What happens**:
   ```sql
   -- games table
   UPDATE games SET home_score = 1, away_score = 0
   
   -- bets affected
   - Over 2.5 bets: No change (still possible)
   - BTTS bets: No change (still possible)
   - Correct Score 1:0: At risk if score continues

   -- users seeing game
   - Refresh odds calculation
   - Update minimum win odds
   ```
4. **What live bettors see**:
   - Score updates instantly on page
   - Affected bets show new status
   - Some options might disable

---

### Example 3: Admin Settles Finished Game

**Step-by-step:**
1. Admin ends game: Manchester 2-1 Liverpool
2. **Automatic process**:
   ```sql
   -- Find all unsettled bets on this game
   SELECT * FROM bets WHERE status = 'Open' 
   AND selections reference this game

   -- For each bet, check if user won/lost
   -- Example: User bet on Manchester Win (2.00 odds)
   -- Result: Manchester won 2-1 → BET WON
   
   -- Update bet
   UPDATE bets SET status = 'Won', settled_at = NOW()
   
   -- Calculate payout
   payout = stake * odds = 100 * 2.00 = 200
   
   -- Update user
   UPDATE users SET 
     account_balance = account_balance + 200,
     total_winnings = total_winnings + 200
   
   -- Create transaction
   INSERT INTO transactions (type = 'bet_payout', amount = 200)
   
   -- Log it
   INSERT INTO admin_logs (action = 'autosettled')
   ```
3. **What user sees**:
   - Bet status changes from "Open" → "Won"
   - Payout amount appears
   - Balance increases
   - Notification/toast appears

---

## Security & Permissions

### Admin Capabilities (Full Access)
- View all users and their data
- Edit user profiles
- Adjust balances
- Create games
- Update scores
- Settle bets
- View all transactions
- View audit logs
- Manage settings

### Regular Users (Limited Access)
- View only their own data
- Place bets
- View their transactions
- Request withdrawals
- Cannot see:
  - Other users' data
  - Admin logs
  - System settings

### Database-Level Security (RLS)
Even if someone bypasses frontend checks:
- Supabase RLS policies prevent data access
- Service Key (server) has full access
- Anon Key (client) respects RLS
- Example:
  ```sql
  CREATE POLICY "users_select" ON users
    FOR SELECT USING (
      auth.uid() = id OR is_admin = TRUE
    );
  ```

---

## Best Practices

### 1. Balance Adjustments
- Always add a reason (bonus, correction, refund, etc.)
- Document large adjustments
- Review audit trail monthly
- Limit manual adjustments (favor automated payouts)

### 2. Game Management
- Double-check team names and odds before creating
- Update scores regularly during live games
- Don't change odds mid-game (confuses bettors)
- End games promptly to trigger auto-settlement

### 3. Bet Settlements
- Let auto-settlement work most of the time
- Only manually settle disputed bets
- Document any manual settlements
- Review settled bets daily

### 4. User Management
- Verify identities before large payouts
- Suspend fraudulent accounts (don't delete immediately)
- Keep good records of deletions
- Never delete active accounts without contacting user

### 5. Audit & Compliance
- Review admin logs weekly
- Export logs monthly for backup
- Check balance vs. revenue reports
- Investigate discrepancies
- Keep audit trail for regulatory compliance

---

## Troubleshooting

### Issue: Balance update not reflecting
**Cause**: Database sync delay or user session cached
**Solution**:
1. Wait 2-3 seconds
2. Refresh page if needed
3. Check `balance_history` table to confirm update
4. Check user's real-time subscription is active

### Issue: Game score not updating bets
**Cause**: Score update didn't reach all clients
**Solution**:
1. Verify score was saved (check `games` table)
2. Refresh admin panel
3. Ask users to refresh page
4. Check Realtime is enabled in Supabase

### Issue: Can't settle bet
**Cause**: Insufficient permissions or bet already settled
**Solution**:
1. Confirm you're admin user
2. Check bet status (can't settle already Won/Lost)
3. Check game is finished
4. Try manual settlement

### Issue: Admin logs not showing
**Cause**: No permission or Realtime disabled
**Solution**:
1. Confirm admin account
2. Check RLS policies
3. Enable Realtime in Supabase Settings

---

## Sample Admin Workflows

### Daily Workflow
1. **Morning** (5:00 AM)
   - Check failed payments
   - Resolve if confirmed
   - View revenue summary

2. **During Sports Events**
   - Monitor live games
   - Update scores
   - Watch for disputed bets
   - Monitor user activity

3. **Evening** (10:00 PM)
   - End finished games
   - Review settled bets
   - Check audit logs
   - Prepare daily report

4. **Weekly** (Sunday)
   - Export admin logs
   - Verify revenue reports
   - Review user complaints
   - Plan upcoming changes

---

## API Endpoints for Advanced Usage

If you need to automate admin tasks via API:

```bash
# Get all users
GET /api/supabase/admin/users

# Update user
PUT /api/supabase/admin/users/{userId}

# Update balance
POST /api/supabase/admin/users/{userId}/balance

# Delete user
DELETE /api/supabase/admin/users/{userId}

# Create game
POST /api/supabase/admin/games

# Update score
PUT /api/supabase/admin/games/{gameId}/score

# Settle bet
POST /api/supabase/admin/bets/{betId}/settle

# Get stats
GET /api/supabase/admin/stats

# Get logs
GET /api/supabase/admin/logs
```

---

## Need Help?

1. Check Supabase Dashboard: https://app.supabase.com
2. View admin logs for recent changes
3. Check database schema: `supabase-schema.sql`
4. Review API code: `server/services/supabaseService.js`
