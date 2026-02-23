-- Insert Admin User for BETNEXA
-- This script adds the admin user to enable admin portal access

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
  status = 'active'
RETURNING id, username, phone_number, role, is_admin, created_at;
