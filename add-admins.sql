-- Add muleiadmin (primary admin)
INSERT INTO users (
  id,
  phone_number,
  email,
  name,
  username,
  password,
  is_admin,
  email_verified,
  account_balance,
  total_bets,
  total_winnings,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '0714945142',
  'muleiadmin@betnexa.com',
  'Mulei Admin',
  'muleiadmin',
  '4306',
  true,
  true,
  0,
  0,
  0,
  NOW(),
  NOW()
) ON CONFLICT (phone_number) DO UPDATE SET
  is_admin = true,
  email_verified = true,
  updated_at = NOW();

-- Add muleiadmin2 (secondary admin)
INSERT INTO users (
  id,
  phone_number,
  email,
  name,
  username,
  password,
  is_admin,
  email_verified,
  account_balance,
  total_bets,
  total_winnings,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '0714945143',
  'muleiadmin2@betnexa.com',
  'Mulei Admin 2',
  'muleiadmin2',
  '4307',
  true,
  true,
  0,
  0,
  0,
  NOW(),
  NOW()
) ON CONFLICT (phone_number) DO UPDATE SET
  is_admin = true,
  email_verified = true,
  updated_at = NOW();

-- Verify admins were added
SELECT id, phone_number, name, username, is_admin, created_at FROM users WHERE is_admin = true ORDER BY created_at DESC;
