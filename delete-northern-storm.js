#!/usr/bin/env node

/**
 * Delete Northern Storm vs Rampage Fc game from database
 */

async function deleteGame() {
  console.log('\n🗑️  Deleting Northern Storm vs Rampage Fc game from database...\n');

  try {
    // First, fetch all games to find Northern Storm
    console.log('📋 Searching for Northern Storm game...');
    const getResponse = await fetch('https://server-tau-puce.vercel.app/api/admin/games');
    const getBody = await getResponse.json();

    if (!getBody.success || !Array.isArray(getBody.games)) {
      console.error('❌ Could not retrieve games from API');
      console.error('Response:', getBody);
      process.exit(1);
    }

    // Find Northern Storm game
    const northernStormGame = getBody.games.find(
      (game) => game.home_team === 'Northern Storm' || game.homeTeam === 'Northern Storm'
    );

    if (!northernStormGame) {
      console.log('⚠️ Northern Storm game not found in database. It may have already been deleted.');
      process.exit(0);
    }

    const gameId = northernStormGame.id || northernStormGame.game_id;
    console.log(`✅ Found game: ${northernStormGame.home_team || northernStormGame.homeTeam} vs ${northernStormGame.away_team || northernStormGame.awayTeam}`);
    console.log(`   Game ID: ${gameId}`);

    // Delete the game
    console.log('\n🗑️  Deleting game...');
    const deleteResponse = await fetch(`https://server-tau-puce.vercel.app/api/admin/games/${gameId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: '0714945142' // Admin phone
      })
    });

    const deleteBody = await deleteResponse.json();

    if (deleteResponse.ok && deleteBody.success) {
      console.log('✅ Game deleted successfully!\n');
      console.log(`   Game: ${northernStormGame.home_team || northernStormGame.homeTeam} vs ${northernStormGame.away_team || northernStormGame.awayTeam}`);
      console.log(`   ID: ${gameId}\n`);
      process.exit(0);
    } else {
      console.error('❌ Failed to delete game');
      console.error('Response:', deleteBody);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deleteGame();
