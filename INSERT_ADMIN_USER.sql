-- Insert Admin User into BETNEXA
-- Run this in Supabase SQL Editor

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
);

-- Verify the insert was successful
SELECT id, username, phone_number, is_admin, role, status FROM users WHERE phone_number = '0714945142';
