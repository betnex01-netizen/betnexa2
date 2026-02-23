#!/usr/bin/env node

/**
 * Insert Admin User Script
 * This script creates/updates the admin user in Supabase
 * Admin credentials: 0714945142 / 4306
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://eaqogmybihiqzivuwyav.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL or SUPABASE_SERVICE_KEY not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertAdminUser() {
  try {
    console.log('📝 Creating or updating admin user...');
    console.log(`🔗 Connecting to: ${supabaseUrl}\n`);

    // First, check if admin already exists
    const { data: existingAdmin, error: fetchError } = await supabase
      .from('users')
      .select('id, username, phone_number, is_admin, role')
      .eq('phone_number', '0714945142')
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('❌ Error fetching admin:', fetchError.message);
      process.exit(1);
    }

    if (existingAdmin) {
      console.log('✅ Admin user already exists:');
      console.log(`   ID: ${existingAdmin.id}`);
      console.log(`   Username: ${existingAdmin.username}`);
      console.log(`   Phone: ${existingAdmin.phone_number}`);
      console.log(`   Role: ${existingAdmin.role}`);
      console.log(`   Is Admin: ${existingAdmin.is_admin}\n`);

      // Update if not already admin
      if (!existingAdmin.is_admin) {
        const { data: updated, error: updateError } = await supabase
          .from('users')
          .update({
            is_admin: true,
            role: 'admin',
            password: '4306',
            status: 'active',
            is_verified: true
          })
          .eq('phone_number', '0714945142')
          .select()
          .single();

        if (updateError) {
          console.error('❌ Error updating admin status:', updateError.message);
          process.exit(1);
        }

        console.log('✅ Admin status updated!');
      }
    } else {
      // Create new admin user
      const { data: newAdmin, error: createError } = await supabase
        .from('users')
        .insert([
          {
            username: 'admin',
            phone_number: '0714945142',
            password: '4306',
            email: 'admin@betnexa.com',
            account_balance: 0,
            total_bets: 0,
            total_winnings: 0,
            is_admin: true,
            is_verified: true,
            verified_at: new Date().toISOString(),
            withdrawal_activated: false,
            role: 'admin',
            status: 'active'
          }
        ])
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating admin user:', createError.message);
        process.exit(1);
      }

      console.log('✅ Admin user created successfully!');
      console.log(`   ID: ${newAdmin.id}`);
      console.log(`   Username: ${newAdmin.username}`);
      console.log(`   Phone: ${newAdmin.phone_number}`);
      console.log(`   Role: ${newAdmin.role}`);
      console.log(`   Is Admin: ${newAdmin.is_admin}\n`);
    }

    // Verify login works
    console.log('🧪 Testing admin login...\n');
    const { data: testLogin, error: loginError } = await supabase
      .from('users')
      .select('*')
      .eq('phone_number', '0714945142')
      .eq('password', '4306')
      .single();

    if (loginError) {
      console.error('❌ Error testing login:', loginError.message);
      process.exit(1);
    }

    console.log('✅ Admin login test successful!');
    console.log(`   Name: ${testLogin.username}`);
    console.log(`   Phone: ${testLogin.phone_number}`);
    console.log(`   Level: ${testLogin.role === 'admin' ? 'Administrator' : 'Regular User'}`);
    console.log(`   Status: ${testLogin.status}`);
    console.log(`   Verified: ${testLogin.is_verified}\n`);

    console.log('🎉 Admin setup complete!');
    console.log('\n📌 Login with:');
    console.log('   Phone: 0714945142');
    console.log('   Password: 4306\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

insertAdminUser();
