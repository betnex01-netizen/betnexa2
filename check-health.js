#!/usr/bin/env node

/**
 * Check backend server health
 */

async function checkHealth() {
  console.log('\n🏥 Checking backend server health...\n');

  try {
    const response = await fetch('https://server-tau-puce.vercel.app/api/health');
    const body = await response.json();

    console.log(`Status Code: ${response.status}\n`);
    console.log('📋 Response:');
    console.log(JSON.stringify(body, null, 2));

    if (body.status === 'Server is running') {
      console.log('\n✅ Server is healthy');
      console.log(`Supabase: ${body.supabase}`);
      return true;
    } else {
      console.log('\n⚠️  Server responded but status unclear');
      return false;
    }
  } catch (error) {
    console.error('\n❌ Server is not responding:', error.message);
    return false;
  }
}

checkHealth();
