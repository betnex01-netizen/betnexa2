# Admin Portal Testing Guide

## 🔐 Admin Portal Location

**Secret Admin URL:** `http://localhost:5173/muleiadmin`

Only users with `is_admin = true` can access this route.

---

## ✅ Step 1: Create an Admin User

You have two options to make a user an admin:

### Option A: Via Supabase Dashboard (Easiest)

1. Open Supabase Dashboard: https://app.supabase.com
2. Click your project: `eaqogmybihiqzivuwyav`
3. Navigate to **Table Editor**
4. Open **users** table
5. Find your test user
6. Edit the row:
   - Set `is_admin` = `true` ✓
   - Set `role` = `'admin'` ✓
7. Click **Save**

### Option B: Via SQL Query

Run this SQL in Supabase SQL Editor:
```sql
UPDATE users 
SET is_admin = true, role = 'admin' 
WHERE phone_number = '254712345678';  -- Replace with your phone number
```

---

## ✅ Step 2: Login as Admin User

1. Go to: `http://localhost:5173/login`
2. Enter your phone number and password
3. Click **Login**
4. You should see the dashboard

---

## ✅ Step 3: Access Admin Portal

**Method 1: Direct URL**
```
http://localhost:5173/muleiadmin
```

**Method 2: From Dashboard**
If there's an admin link in the UI, click it.

You should see the admin dashboard with tabs for:
- Games Management
- User Management  
- Transaction Management
- Bet Settlement
- Finance Controls
- Settings

---

## 🎮 Admin Portal Features

### 1. **Games Management**
- Add new games with teams, odds, league
- Update game scores in real-time
- Set game status (upcoming, live, finished)
- Manage market odds
- Pause/resume matches
- Calculate match minutes automatically

### 2. **User Management**
- View all registered users
- Edit user details
- Adjust user balances
- Activate withdrawal access
- Edit user roles
- View user statistics

### 3. **Transaction Management**
- View all transactions
- Filter by type (deposit, withdrawal, bet)
- Mark transactions as completed/failed
- Handle payment reconciliation
- View transaction history

### 4. **Bet Settlement**
- View all open bets
- Mark bets as won/lost/void
- Set payout amounts
- View bet selections
- Track bet outcomes

### 5. **Finance Controls**
- View financial summary
- Manage system settings
- View balance history
- Monitor payments

---

## 🧪 Testing the Admin Portal

### Test 1: Add a Game
1. Click **Games** tab
2. Click **Add Game** button
3. Fill in:
   - League: "Premier League"
   - Home Team: "Arsenal"
   - Away Team: "Manchester City"
   - Home Odds: "2.50"
   - Draw Odds: "3.20"
   - Away Odds: "2.80"
   - Time: "15:00"
4. Click **Add**
✓ Should see new game in list

### Test 2: Update User Balance
1. Click **Users** tab
2. Find a user
3. Click **Edit** button
4. Change balance amount
5. Click **Save**
✓ Balance should update in real-time

### Test 3: Live Match Management
1. Click **Games** tab
2. Find a game with status "live"
3. Update scores:
   - Home: 1
   - Away: 0
4. Click **Update Score**
✓ Score should update and minute counter starts

### Test 4: Update Game Status
1. Find a game
2. Click status dropdown
3. Change to "live" or "finished"
4. Click **Update**
✓ Status changes and affects betting logic

### Test 5: View Transactions
1. Click **Transactions** tab
2. Scroll through all transactions
3. Filter by type
4. Click on transaction to see details
✓ All user deposits/withdrawals visible

---

## 📊 Admin Dashboard Sections

### Stats Display
- Total Users
- Total Bets Placed
- Total Transactions
- Revenue Summary
- Active Games

### Quick Actions
- Add New Game
- Manage Settings
- View Reports
- Export Data

### Real-Time Updates
- Game scores update every second
- User transactions sync in real-time
- Bet status changes immediately
- Balance updates live

---

## 🔒 Security Notes

✓ Admin portal only accessible to `is_admin = true` users  
✓ All admin actions logged in `admin_logs` table  
✓ Changes sync to database immediately  
✓ User and bet data protected by Row Level Security  

---

## 🛠️ Troubleshooting

**Problem: Can't access admin portal (404)**
- Solution: Make sure you're logged in as admin
- Check if `is_admin = true` in database

**Problem: Admin page won't load**
- Clear browser cache
- Logout and login again
- Check browser console for errors

**Problem: Changes not saving**
- Check network connection
- Verify Supabase credentials
- Check server is running

**Problem: Can't see users/games/bets**
- Create some test data first
- Check database has data
- Verify RLS policies allow access

---

## 📝 Creating Test Data

### Add Test Game
```sql
INSERT INTO games (game_id, league, home_team, away_team, home_odds, draw_odds, away_odds, status)
VALUES 
  ('game_001', 'Premier League', 'Manchester United', 'Liverpool', 2.50, 3.20, 2.80, 'upcoming'),
  ('game_002', 'La Liga', 'Real Madrid', 'Barcelona', 1.80, 3.50, 4.20, 'upcoming');
```

### Add Test Users
```sql
INSERT INTO users (username, phone_number, password, account_balance, role, is_admin)
VALUES 
  ('admin_user', '254712345678', 'hashed_password', 10000.00, 'admin', true),
  ('regular_user', '254787654321', 'hashed_password', 5000.00, 'user', false);
```

---

## 🚀 You're Ready!

1. Make a user admin via Supabase
2. Login as admin user
3. Go to: `http://localhost:5173/muleiadmin`
4. Start testing admin functions
5. Create games, manage users, adjust balances

Happy testing! 🎯
