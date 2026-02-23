#!/usr/bin/env node

/**
 * Add game directly to Supabase (bypassing API)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://scbnptlyfjadxiepjcfx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjYm5wdGx5ZmphZHhpZXBqY2Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDAwODQwNzEsImV4cCI6MjAxNjY2NDA3MX0.EsLw8YMWVvZi7V5HTSZ0gCJKgXoMwq_h85NLJjOZn1w';

const supabase = createClient(supabaseUrl, supabaseKey);

const gameData = {
  game_id: `g_northernstorm_${Date.now()}`,
  league: 'Football',
  home_team: 'Northern Storm',
  away_team: 'Rampage Fc',
  home_odds: 2.80,
  draw_odds: 3.58,
  away_odds: 3.63,
  status: 'upcoming',
  time: '2026-02-23T23:00:00Z',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

async function addGameDirectly() {
  console.log('\n🎮 Adding Northern Storm vs Rampage Fc directly to Supabase\n');
  console.log('📊 Game Data:');
  console.log(JSON.stringify(gameData, null, 2));
  console.log();

  try {
    console.log('📤 Inserting into database...\n');
    const { data, error } = await supabase
      .from('games')
      .insert([gameData])
      .select()
      .single();

    if (error) {
      console.error('❌ Database insert failed:');
      console.error('   Message:', error.message);
      console.error('   Code:', error.code);
      console.error('   Details:', error.details);
      console.error('   Full error:', JSON.stringify(error, null, 2));
      return false;
    }

    if (!data) {
      console.error('❌ No data returned from insert');
      return false;
    }

    console.log('✅ Game Added Successfully to Supabase!\n');
    console.log('📋 Inserted Game:');
    console.log(JSON.stringify(data, null, 2));
    console.log();

    // Now test API retrieval
    console.log('🔄 Testing API retrieval...\n');
    const response = await fetch('https://server-tau-puce.vercel.app/api/admin/games');
    const body = await response.json();

    if (body.success && Array.isArray(body.games)) {
      const game = body.games.find(g => g.game_id === gameData.game_id);
      if (game) {
        console.log('✅ Game found in API response!');
        console.log(JSON.stringify(game, null, 2));
      } else {
        console.log('⚠️  Game not found in API response yet');
        console.log(`Available games: ${body.games.length}`);
      }
    } else {
      console.log('⚠️  Could not retrieve games from API');
    }

    console.log('\n✨ Next steps:');
    console.log('   1. Refresh the website: https://betnexa.vercel.app');
    console.log('   2. The game should appear in "Upcoming Matches"');
    console.log('   3. Check Admin Portal: https://betnexa.vercel.app/muleiadmin');
    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

// Run it
addGameDirectly().then(success => {
  process.exit(success ? 0 : 1);
});
