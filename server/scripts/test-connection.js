/**
 * Test Supabase Connection
 * Verifies the database connection and checks if tables exist
 */

require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('\n🧪 Testing Supabase Connection\n');
  console.log(`📍 URL: ${supabaseUrl}\n`);

  try {
    // Test 1: Basic connection
    console.log('✓ Supabase client initialized\n');

    // Test 2: Check if users table exists
    console.log('Testing database tables...\n');
    
    const tables = [
      'users',
      'games',
      'bets',
      'transactions',
      'payments',
      'settings',
      'admin_logs',
      'balance_history'
    ];

    for (const table of tables) {
      try {
        const { data, error, status } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        if (status === 200 || status === 206) {
          console.log(`   ✅ ${table}`);
        } else if (error?.code === 'PGRST116') {
          console.log(`   ⚠️  ${table} - Not found (deploy schema first)`);
        } else {
          console.log(`   ❌ ${table} - ${error?.message}`);
        }
      } catch (err) {
        console.log(`   ❌ ${table} - ${err.message}`);
      }
    }

    console.log('\n✅ Connection test complete!\n');
    console.log('Next steps:');
    console.log('1. If tables show "Not found", deploy schema:');
    console.log('   npm run deploy-schema\n');
    console.log('2. Start the server:');
    console.log('   npm start\n');

  } catch (err) {
    console.error('\n❌ Connection failed:');
    console.error(err.message);
    process.exit(1);
  }
}

testConnection();
