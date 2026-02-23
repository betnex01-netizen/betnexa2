#!/usr/bin/env node

/**
 * Check if Northern Storm game exists in the database
 */

async function checkGame() {
  console.log('\n🔍 Checking for Northern Storm game in database...\n');

  try {
    const response = await fetch('https://server-tau-puce.vercel.app/api/admin/games');
    const body = await response.json();

    if (!body.success || !Array.isArray(body.games)) {
      console.error('❌ Could not retrieve games from API');
      console.log('Response:', JSON.stringify(body, null, 2));
      return false;
    }

    console.log(`📊 Total games in database: ${body.games.length}\n`);

    // Search for Northern Storm
    const northernStorm = body.games.find(g => 
      (g.home_team && g.home_team.includes('Northern')) ||
      (g.away_team && g.away_team.includes('Rampage'))
    );

    if (northernStorm) {
      console.log('✅ FOUND: Northern Storm game!\n');
      console.log('📋 Game Details:');
      console.log(JSON.stringify(northernStorm, null, 2));
      return true;
    } else {
      console.log('❌ Northern Storm game NOT found\n');
      console.log('📋 Latest 5 games:\n');
      body.games.slice(0, 5).forEach((game, i) => {
        console.log(`${i + 1}. ${game.home_team} vs ${game.away_team} (${game.status})`);
      });
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

checkGame();
