#!/usr/bin/env node

/**
 * Promote Admin User Script
 * Updates the admin user to have admin privileges
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://eaqogmybihiqzivuwyav.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl) {
  console.error('❌ SUPABASE_URL not found');
  process.exit(1);
}

// If no service key, provide instructions
if (!supabaseKey) {
  console.log('⚠️  SUPABASE_SERVICE_KEY not configured locally');
  console.log('\n📝 To complete admin setup, please run this SQL in Supabase SQL Editor:');
  console.log('https://app.supabase.com/project/_/sql/new\n');
  console.log('======================== COPY AND PASTE ========================\n');
  console.log(`UPDATE users SET is_admin = true, role = 'admin' WHERE phone_number = '0714945142';`);
  console.log('\n=============================================================\n');
  console.log('Then verify with:\n');
  console.log(`SELECT id, username, phone_number, is_admin, role, account_balance FROM users WHERE phone_number = '0714945142';`);
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function promoteAdminUser() {
  try {
    console.log('👤 Promoting admin user...\n');

    // Update admin user to have admin privileges
    const { data, error } = await supabase
      .from('users')
      .update({
        is_admin: true,
        role: 'admin'
      })
      .eq('phone_number', '0714945142')
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating admin:', error.message);
      process.exit(1);
    }

    console.log('✅ Admin user successfully promoted!\n');
    console.log('Updated Admin Details:');
    console.log(`   ID: ${data.id}`);
    console.log(`   Username: ${data.username}`);
    console.log(`   Phone: ${data.phone_number}`);
    console.log(`   Email: ${data.email}`);
    console.log(`   Is Admin: ${data.is_admin}`);
    console.log(`   Role: ${data.role}`);
    console.log(`   Account Balance: ${data.account_balance}`);
    console.log(`   Status: ${data.status}\n`);

    console.log('🎉 Admin setup complete!');
    console.log('\n📌 Login Credentials:');
    console.log('   Phone: 0714945142');
    console.log('   Password: 4306');
    console.log('\n🔗 Admin Portal: https://betnexa.vercel.app/muleiadmin\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

promoteAdminUser();
