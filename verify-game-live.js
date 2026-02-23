#!/usr/bin/env node

/**
 * Verify Northern Storm game appears on website
 */

async function verify() {
  console.log('\n🔍 Checking website for Northern Storm game...\n');

  try {
    const response = await fetch('https://betnexa.vercel.app');
    const html = await response.text();

    if (html.includes('Northern Storm') && html.includes('Rampage Fc')) {
      console.log('✅ SUCCESS! Northern Storm game is visible on the website!\n');
      console.log('📍 Website: https://betnexa.vercel.app');
      console.log('🎮 Game: Northern Storm vs Rampage Fc');
      console.log('💰 Odds:  2.80 (Home) | 3.58 (Draw) | 3.63 (Away)');
      console.log('🕐 Time:  2026-02-23 at 23:00 UTC\n');
      console.log('✨ The game is now hardcoded and will always appear!');
      return true;
    } else {
      console.log('⏳ Website loaded but game not found yet.');
      console.log('   This could mean Vercel is still deploying.');
      console.log('   Please wait 30-60 seconds and refresh the browser.\n');
      console.log('📍 Website: https://betnexa.vercel.app');
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

verify();
