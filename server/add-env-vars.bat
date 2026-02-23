@echo off
cd /d "c:\Users\user\Downloads\BETNEXA PROFESSIONAL\server"

echo Adding SUPABASE_URL...
echo SUPABASE_URL | npx vercel env add ^
  --environment production

echo Adding SUPABASE_SERVICE_KEY...
npx vercel env add SUPABASE_SERVICE_KEY sb_secret_JnzsAy2ljyd__NdzokUXhA_2k7loTgg --environment production

echo Adding SUPABASE_ANON_KEY...
npx vercel env add SUPABASE_ANON_KEY sb_publishable_Lc8dQIzND4_qyIbN2EuQrQ_0Ma0OINQ --environment production

echo Adding PAYHERO_API_KEY...
npx vercel env add PAYHERO_API_KEY 6CUxNcfi9jRpr4eWicAn --environment production

echo Adding PAYHERO_API_SECRET...
npx vercel env add PAYHERO_API_SECRET j6zP2XpAlXn9UhtHOj9PbYQVAdlQnkeyrEWuFOAH --environment production

echo Adding PAYHERO_ACCOUNT_ID...
npx vercel env add PAYHERO_ACCOUNT_ID 3398 --environment production

echo Adding NODE_ENV...
npx vercel env add NODE_ENV production --environment production

echo All variables added!
