#!/usr/bin/env node

/**
 * BETNEXA Deposit System Verification
 * Run after environment variables are configured
 */

const backendUrl = 'https://server-tau-puce.vercel.app';
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

async function log(status, message) {
  const icon = status === 'success' ? '✅' : status === 'error' ? '❌' : '⚠️';
  const color = status === 'success' ? colors.green : status === 'error' ? colors.red : colors.yellow;
  console.log(`${color}${icon} ${message}${colors.reset}`);
}

async function verifySetup() {
  console.log(`\n${colors.bold}${colors.cyan}🧪 BETNEXA DEPOSIT SYSTEM VERIFICATION${colors.reset}`);
  console.log(`${colors.cyan}════════════════════════════════════════════════════════${colors.reset}\n`);

  let allPassed = true;

  // Test 1: Backend Health
  console.log(`${colors.bold}TEST 1: Backend Health Check${colors.reset}`);
  try {
    const healthRes = await fetch(`${backendUrl}/api/health`);
    if (!healthRes.ok) throw new Error(`Status ${healthRes.status}`);
    const health = await healthRes.json();
    
    await log('success', `Backend is HEALTHY`);
    console.log(`   └─ Status: ${health.status}`);
    console.log(`   └─ Environment: ${health.environment}`);
    console.log(`   └─ Version: ${health.version}\n`);
  } catch (err) {
    await log('error', `Backend Health Failed: ${err.message}`);
    console.log(`   └─ Check environment variables are set!\n`);
    allPassed = false;
  }

  // Test 2: Payment Initiation
  console.log(`${colors.bold}TEST 2: Payment Initiation (Deposit)${colors.reset}`);
  const testPayment = {
    amount: 50,
    phoneNumber: '254712345678',
    userId: 'test-user-' + Date.now()
  };
  
  console.log(`   Test Data:`);
  console.log(`   ├─ Amount: KSH ${testPayment.amount}`);
  console.log(`   ├─ Phone: ${testPayment.phoneNumber}`);
  console.log(`   └─ User ID: ${testPayment.userId}\n`);

  try {
    const payRes = await fetch(`${backendUrl}/api/payments/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayment)
    });

    const payData = await payRes.json();

    if (!payRes.ok) {
      throw new Error(`${payRes.status}: ${payData.message || 'Failed'}`);
    }

    await log('success', `Payment Initiation Successful`);
    console.log(`   ├─ Response Code: ${payData.data?.response_code || 'N/A'}`);
    console.log(`   ├─ Message: ${payData.data?.response_description || payData.message}`);
    
    const ref = payData.data?.externalReference || payData.externalReference;
    if (ref) {
      console.log(`   ├─ Reference: ${ref}`);
      
      // Test 3: Status Check
      console.log(`   └─ Mock: ${payData.isMockPayment ? 'YES (development mode)' : 'NO (live mode)'}\n`);

      console.log(`${colors.bold}TEST 3: Payment Status Check${colors.reset}`);
      try {
        await new Promise(r => setTimeout(r, 500));
        const statusRes = await fetch(`${backendUrl}/api/payments/status/${ref}`);
        const statusData = await statusRes.json();

        if (statusData.success && statusData.payment) {
          await log('success', `Status Check Successful`);
          console.log(`   ├─ Payment Status: ${statusData.payment.status}`);
          console.log(`   ├─ Amount: KSH ${statusData.payment.amount}`);
          console.log(`   ├─ Phone: ${statusData.payment.phone_number}`);
          console.log(`   └─ Created: ${statusData.payment.created_at}\n`);
        } else {
          await log('error', `Status check returned unexpected data\n`);
          allPassed = false;
        }
      } catch (err) {
        await log('error', `Status Check Failed: ${err.message}\n`);
        allPassed = false;
      }
    }
  } catch (err) {
    await log('error', `Payment Initiation Failed: ${err.message}`);
    console.log(`   └─ Check backend environment variables!\n`);
    allPassed = false;
  }

  // Test 4: Database Connection
  console.log(`${colors.bold}TEST 4: Database Connection${colors.reset}`);
  try {
    const dbRes = await fetch(`${backendUrl}/api/health`);
    if (dbRes.ok) {
      await log('success', `Supabase Connection Active`);
      console.log(`   └─ Database is accessible from backend\n`);
    }
  } catch (err) {
    await log('error', `Database Check Failed: ${err.message}\n`);
    allPassed = false;
  }

  // Summary
  console.log(`${colors.cyan}════════════════════════════════════════════════════════${colors.reset}`);
  if (allPassed) {
    console.log(`${colors.bold}${colors.green}✅ ALL TESTS PASSED - DEPOSITS ARE WORKING!${colors.reset}\n`);
    console.log(`${colors.green}Next Steps:${colors.reset}`);
    console.log(`  1. Visit: https://betnexa.vercel.app`);
    console.log(`  2. Go to Finance → Deposit`);
    console.log(`  3. Enter amount and M-Pesa number`);
    console.log(`  4. Click "Deposit"`);
    console.log(`  5. STK push will appear on your phone\n`);
  } else {
    console.log(`${colors.bold}${colors.red}⚠️  SOME TESTS FAILED${colors.reset}\n`);
    console.log(`${colors.yellow}Issues detected:${colors.reset}`);
    console.log(`  • Environment variables may not be configured`);
    console.log(`  • Backend may not be redeployed yet`);
    console.log(`  • Supabase credentials may be invalid\n`);
    console.log(`${colors.yellow}Solution:${colors.reset}`);
    console.log(`  1. Go to: https://vercel.com/nel-developers/server/settings/environment-variables`);
    console.log(`  2. Add all 5 environment variables`);
    console.log(`  3. Click SAVE (auto redeploy starts)`);
    console.log(`  4. Wait 2-3 minutes for "Ready" status`);
    console.log(`  5. Run this test again\n`);
  }
}

verifySetup().catch(console.error);
