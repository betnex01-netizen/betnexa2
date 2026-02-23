/**
 * Test the fixed game creation endpoint
 */

const apiUrl = 'https://server-tau-puce.vercel.app';
const adminPhone = '0714945142';

async function testGameCreation() {
  console.log('🧪 Testing fixed game creation endpoint\n');
  console.log(`📍 API URL: ${apiUrl}`);
  console.log(`👤 Admin Phone: ${adminPhone}\n`);

  const gameData = {
    phone: adminPhone,
    league: 'Premier League',
    homeTeam: 'Manchester United',
    awayTeam: 'Manchester City',
    homeOdds: 2.5,
    drawOdds: 3.0,
    awayOdds: 2.8,
    time: new Date().toISOString(),
    status: 'upcoming',
  };

  console.log('📤 Sending request:');
  console.log(JSON.stringify(gameData, null, 2));
  console.log('\n⏳ Waiting for response...\n');

  try {
    const response = await fetch(`${apiUrl}/api/admin/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gameData),
      timeout: 15000, // 15 second timeout
    });

    console.log(`📨 Response Status: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Failed to parse JSON response:', responseText);
      return;
    }

    console.log('\n📥 Response Body:');
    console.log(JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('\n✅ SUCCESS! Game created:');
      console.log(`   Game ID: ${data.game.id || data.game.game_id}`);
      console.log(`   Match: ${data.game.home_team} vs ${data.game.away_team}`);
      console.log(`   Odds: ${data.game.home_odds} - ${data.game.draw_odds} - ${data.game.away_odds}`);
    } else {
      console.log('\n❌ FAILED! Error response:');
      console.log(`   Error: ${data.error || 'Unknown error'}`);
      if (data.details) {
        console.log(`   Details: ${data.details}`);
      }
      if (data.code) {
        console.log(`   Code: ${data.code}`);
      }
    }
  } catch (error) {
    console.error('\n❌ Request failed:', error.message);
  }
}

// Run the test
testGameCreation();
