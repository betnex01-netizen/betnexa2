#!/usr/bin/env node

/**
 * Add Northern Storm vs Rampage FC game
 * This uses the proper API endpoint instead of raw SQL
 */

const API_URL = 'https://server-tau-puce.vercel.app';
const ADMIN_PHONE = '0714945142';

const gameData = {
  phone: ADMIN_PHONE,
  league: 'Football',
  homeTeam: 'Northern Storm',
  awayTeam: 'Rampage Fc',
  homeOdds: 2.80,
  drawOdds: 3.58,
  awayOdds: 3.63,
  status: 'upcoming',
  time: '2026-02-23T23:00:00Z'
};

async function addGame() {
  console.log('\n🎮 Adding Northern Storm vs Rampage Fc\n');
  console.log('📊 Game Details:');
  console.log(`   League: ${gameData.league}`);
  console.log(`   ${gameData.homeTeam} (${gameData.homeOdds}) vs ${gameData.awayTeam} (${gameData.awayOdds})`);
  console.log(`   Draw: ${gameData.drawOdds}`);
  console.log(`   Time: ${gameData.time}`);
  console.log(`   Status: ${gameData.status}\n`);

  try {
    console.log('📤 Sending to API...\n');
    
    const response = await fetch(`${API_URL}/api/admin/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gameData)
    });

    const body = await response.json();
    console.log(`📨 API Response Status: ${response.status}\n`);

    if (response.status === 200 && body.success) {
      const game = body.game;
      console.log('✅ Game Added Successfully!\n');
      console.log('📋 Game Details:');
      console.log(`   ID: ${game.id}`);
      console.log(`   Game ID: ${game.game_id}`);
      console.log(`   ${game.home_team} vs ${game.away_team}`);
      console.log(`   Status: ${game.status}`);
      console.log(`   Time: ${game.time}`);
      console.log(`   Created: ${game.created_at}\n`);

      console.log('🔄 Game is now being fetched by the frontend...');
      console.log('⏳ It should appear on the website in 5-10 seconds\n');
      console.log('✨ Next steps:');
      console.log('   1. Refresh the website: https://betnexa.vercel.app');
      console.log('   2. The game should appear in "Upcoming Matches"');
      console.log('   3. Check Admin Portal to verify: https://betnexa.vercel.app/muleiadmin');
      return true;
    } else {
      console.log('❌ Failed to add game\n');
      console.log('📋 Response:');
      console.log(JSON.stringify(body, null, 2));
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

// Run it
addGame().then(success => {
  process.exit(success ? 0 : 1);
});
