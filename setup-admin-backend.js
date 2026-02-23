#!/usr/bin/env node

/**
 * Setup Admin User via Backend
 * This uses the backend Supabase connection which has proper credentials
 */

const BACKEND_URL = 'https://server-tau-puce.vercel.app';

async function setupAdmin() {
  try {
    console.log('🔐 Setting up admin user via backend API...\n');

    // Try to signup admin first
    console.log('1️⃣  Attempting to register admin user...');
    const signupResponse = await fetch(`${BACKEND_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        email: 'admin@betnexa.com',
        phone: '0714945142',
        password: '4306'
      })
    });

    const signupData = await signupResponse.json();

    if (signupData.success) {
      console.log('✅ Admin signup successful!\n');
      console.log('Admin Details:');
      console.log(`   ID: ${signupData.user.id}`);
      console.log(`   Name: ${signupData.user.name}`);
      console.log(`   Phone: ${signupData.user.phone}`);
      console.log(`   Email: ${signupData.user.email}`);
      console.log(`   Level: ${signupData.user.level}\n`);
    } else if (signupResponse.status === 409) {
      console.log('⚠️  Admin user already exists');
      console.log('   Attempting to verify login...\n');

      // Try to login as admin
      const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: '0714945142',
          password: '4306'
        })
      });

      const loginData = await loginResponse.json();

      if (loginData.success) {
        console.log('✅ Admin login verification successful!\n');
        console.log('Admin Details:');
        console.log(`   ID: ${loginData.user.id}`);
        console.log(`   Name: ${loginData.user.name}`);
        console.log(`   Phone: ${loginData.user.phone}`);
        console.log(`   Level: ${loginData.user.level}`);
        console.log(`   Is Admin: ${loginData.user.isAdmin}\n`);
      } else {
        console.error('❌ Login failed:', loginData.message);
        process.exit(1);
      }
    } else {
      console.error('❌ Error:', signupData.message || 'Unknown error');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  console.log('🎉 Admin setup complete!');
  console.log('\n📌 Login Credentials:');
  console.log('   Phone: 0714945142');
  console.log('   Password: 4306');
  console.log('\n🔗 Admin Portal: https://betnexa.vercel.app/muleiadmin\n');
}

setupAdmin();
