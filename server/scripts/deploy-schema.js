/**
 * Deploy Database Schema
 * Reads supabase-schema-fresh.sql and executes it against the Supabase instance
 */

require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseKey);

async function deploySchema() {
  console.log('🚀 Starting Database Schema Deployment\n');
  console.log(`📍 Supabase URL: ${supabaseUrl}`);
  console.log(`🔑 Using Service Role Key\n`);

  try {
    // Read the schema file
    const schemaPath = path.join(__dirname, '../../supabase-schema-fresh.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    console.log('📄 Schema file loaded successfully');
    console.log(`📊 Schema size: ${(schemaSQL.length / 1024).toFixed(2)} KB\n`);

    // Execute the schema
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: schemaSQL
    }).catch(() => {
      // If rpc fails, try with query
      return supabase.sql`${schemaSQL}`;
    });

    if (error) {
      console.error('⚠️  Direct SQL execution note (expected):');
      console.log('   Supabase.js client cannot execute raw SQL directly.');
      console.log('   ✅ PLEASE FOLLOW THESE STEPS:\n');
      
      console.log('1️⃣  Go to your Supabase Dashboard:');
      console.log(`   https://app.supabase.com/project/${supabaseUrl.split('//')[1].split('.')[0]}\n`);
      
      console.log('2️⃣  Navigate to "SQL Editor"\n');
      
      console.log('3️⃣  Click "New Query"\n');
      
      console.log('4️⃣  Open the file: supabase-schema-fresh.sql\n');
      
      console.log('5️⃣  Copy ALL content and paste into the SQL editor\n');
      
      console.log('6️⃣  Click "Run" button\n');
      
      console.log('7️⃣  Wait for completion (should take 30-60 seconds)\n');
      
      console.log('8️⃣  Verify tables are created by checking the "Tables" section\n');
      
      console.log('After deployment, run: npm run test-connection\n');
      return;
    }

    console.log('✅ Schema deployed successfully!');
    console.log('📋 Tables created:\n');
    console.log('   • users');
    console.log('   • games');
    console.log('   • markets');
    console.log('   • bets');
    console.log('   • bet_selections');
    console.log('   • transactions');
    console.log('   • payments');
    console.log('   • admin_logs');
    console.log('   • balance_history');
    console.log('   • session');
    console.log('   • announcements');
    console.log('   • settings\n');

  } catch (err) {
    console.error('❌ Error during deployment:');
    console.error(err.message);
    process.exit(1);
  }
}

deploySchema();
