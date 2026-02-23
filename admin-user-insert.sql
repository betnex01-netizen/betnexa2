-- ==================== INSERT ADMIN USER ====================
-- Run this SQL in Supabase SQL Editor to create admin user
-- Credentials: Phone: 0714945142, Password: 4306

-- Delete existing admin with this phone if needed (optional)
-- DELETE FROM users WHERE phone_number = '0714945142';

-- Insert or update admin user
INSERT INTO users (
  username,
  phone_number,
  password,
  email,
  account_balance,
  total_bets,
  total_winnings,
  is_admin,
  is_verified,
  verified_at,
  withdrawal_activated,
  role,
  status
) VALUES (
  'admin',
  '0714945142',
  '4306',
  'admin@betnexa.com',
  0.00,
  0,
  0.00,
  true,
  true,
  NOW(),
  false,
  'admin',
  'active'
)
ON CONFLICT (phone_number) DO UPDATE SET
  is_admin = true,
  role = 'admin',
  password = '4306',
  username = 'admin',
  email = 'admin@betnexa.com',
  is_verified = true,
  status = 'active',
  updated_at = NOW()
RETURNING id, username, phone_number, email, role, is_admin, account_balance, created_at, updated_at;
