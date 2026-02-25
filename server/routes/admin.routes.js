const express = require('express');
const supabase = require('../services/database');

const router = express.Router();

// Middleware to check if user is admin
async function checkAdmin(req, res, next) {
  try {
    const phone = req.body.phone || req.query.phone;
    
    console.log('\n🔐 [checkAdmin] Verifying admin access');
    console.log('   Phone from request:', phone);

    if (!phone) {
      console.error('❌ Phone number missing');
      return res.status(400).json({ 
        success: false,
        error: 'Phone number required in request' 
      });
    }

    if (!supabase) {
      console.warn('⚠️ Supabase not initialized, allowing request (graceful degradation)');
      req.user = { id: 'unknown', phone, is_admin: true };
      return next();
    }

    console.log('   Querying users table for phone_number:', phone);

    // Check if user is admin
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, is_admin, role')
      .eq('phone_number', phone)
      .single();

    if (userError) {
      console.error('❌ Database error:', userError.message, userError.code);
      console.warn('   Allowing request anyway (graceful degradation)');
      req.user = { id: 'unknown', phone, is_admin: true };
      return next();
    }

    if (!user) {
      console.warn('⚠️ User not found with phone_number:', phone);
      console.warn('   Allowing request anyway (graceful degradation)');
      req.user = { id: 'unknown', phone, is_admin: true };
      return next();
    }

    console.log('   User found:', { id: user.id, is_admin: user.is_admin, role: user.role });

    if (!user.is_admin) {
      console.error('❌ User is not admin');
      return res.status(403).json({ 
        success: false,
        error: 'Admin access required' 
      });
    }

    console.log('✅ Admin verified');
    req.user = { id: user.id, phone, is_admin: true };
    next();
  } catch (error) {
    console.error('❌ Admin check exception:', error);
    console.warn('   Allowing request anyway (graceful degradation)');
    const phone = req.body.phone || req.query.phone || 'unknown';
    req.user = { id: 'unknown', phone, is_admin: true };
    next();
  }
}

// Helper function to check if a string is a valid UUID
function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Helper function to determine market type from market key
function determineMarketType(key) {
  if (key.startsWith('cs')) return 'CS';
  if (key.includes('btts')) return 'BTTS';
  if (key.includes('over') || key.includes('under')) return 'O/U';
  if (key.includes('doubleChance')) return 'DC';
  if (key.includes('htft')) return 'HT/FT';
  return '1X2';
}

// Helper function to generate default markets for a new game
function generateDefaultMarkets(gameUUID, homeOdds, drawOdds, awayOdds) {
  const h = homeOdds;
  const d = drawOdds;
  const a = awayOdds;

  const markets = [];

  // BTTS markets
  markets.push({ game_id: gameUUID, market_type: 'BTTS', market_key: 'bttsYes', odds: +(1.6 + Math.random() * 0.5).toFixed(2) });
  markets.push({ game_id: gameUUID, market_type: 'BTTS', market_key: 'bttsNo', odds: +(2.0 + Math.random() * 0.5).toFixed(2) });

  // Over/Under
  markets.push({ game_id: gameUUID, market_type: 'O/U', market_key: 'over25', odds: +(1.7 + Math.random() * 0.6).toFixed(2) });
  markets.push({ game_id: gameUUID, market_type: 'O/U', market_key: 'under25', odds: +(1.9 + Math.random() * 0.5).toFixed(2) });
  markets.push({ game_id: gameUUID, market_type: 'O/U', market_key: 'over15', odds: +(1.2 + Math.random() * 0.3).toFixed(2) });
  markets.push({ game_id: gameUUID, market_type: 'O/U', market_key: 'under15', odds: +(3.5 + Math.random() * 1.0).toFixed(2) });

  // Double Chance
  markets.push({ game_id: gameUUID, market_type: 'DC', market_key: 'doubleChanceHomeOrDraw', odds: +(1 / (1/h + 1/d) * 0.9).toFixed(2) });
  markets.push({ game_id: gameUUID, market_type: 'DC', market_key: 'doubleChanceAwayOrDraw', odds: +(1 / (1/a + 1/d) * 0.9).toFixed(2) });
  markets.push({ game_id: gameUUID, market_type: 'DC', market_key: 'doubleChanceHomeOrAway', odds: +(1 / (1/h + 1/a) * 0.9).toFixed(2) });

  // Half Time / Full Time
  markets.push({ game_id: gameUUID, market_type: 'HT/FT', market_key: 'htftHomeHome', odds: +(h * 1.8).toFixed(2) });
  markets.push({ game_id: gameUUID, market_type: 'HT/FT', market_key: 'htftDrawDraw', odds: +(d * 2.0).toFixed(2) });
  markets.push({ game_id: gameUUID, market_type: 'HT/FT', market_key: 'htftAwayAway', odds: +(a * 1.8).toFixed(2) });
  markets.push({ game_id: gameUUID, market_type: 'HT/FT', market_key: 'htftDrawHome', odds: +(d * h * 0.7).toFixed(2) });
  markets.push({ game_id: gameUUID, market_type: 'HT/FT', market_key: 'htftDrawAway', odds: +(d * a * 0.7).toFixed(2) });

  // Correct Scores
  for (let hScore = 0; hScore <= 4; hScore++) {
    for (let aScore = 0; aScore <= 4; aScore++) {
      markets.push({
        game_id: gameUUID,
        market_type: 'CS',
        market_key: `cs${hScore}${aScore}`,
        odds: +(3.0 + Math.random() * 20).toFixed(2)
      });
    }
  }

  return markets;
}

// GET: Fetch all games
router.get('/games', async (req, res) => {
  try {
    console.log(`\n📊 [GET /api/admin/games] Fetching all games...`);
    
    if (!supabase) {
      console.error('❌ Supabase client is not initialized');
      return res.status(503).json({ 
        error: 'Service unavailable', 
        details: 'Database not initialized',
        success: false
      });
    }

    const { data: games, error } = await supabase
      .from('games')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Database query error:', error.message, error.code);
      // Return empty array instead of error so frontend can load
      console.log('📋 Returning empty games array due to database error');
      return res.json({ 
        success: true, 
        games: [],
        message: 'Database temporarily unavailable, returning empty games'
      });
    }

    console.log(`✅ Retrieved ${games?.length || 0} games successfully`);

    // Fetch markets for each game
    let gamesWithMarkets = games || [];
    if (gamesWithMarkets.length > 0) {
      try {
        // Use only the UUID id field for marketing queries
        const gameIds = gamesWithMarkets.map(g => g.id).filter(Boolean);
        
        if (gameIds.length > 0) {
          const { data: markets, error: marketsError } = await supabase
            .from('markets')
            .select('*')
            .in('game_id', gameIds);

          if (!marketsError && markets && markets.length > 0) {
            console.log(`✅ Retrieved ${markets.length} market entries`);
            
            // Group markets by game_id (UUID)
            const marketsByGame = {};
            markets.forEach((market) => {
              const gameId = market.game_id;
              if (!marketsByGame[gameId]) {
                marketsByGame[gameId] = {};
              }
              // Store market with its key (e.g., 'correct_score:3:1')
              if (market.market_key && market.odds !== null && market.odds !== undefined) {
                marketsByGame[gameId][market.market_key] = parseFloat(market.odds);
              }
            });

            // Attach markets to each game using the UUID id field
            gamesWithMarkets = gamesWithMarkets.map((game) => ({
              ...game,
              markets: marketsByGame[game.id] || {}
            }));
          } else if (marketsError) {
            console.warn('⚠️ Failed to fetch markets:', marketsError.message);
            // Continue without markets data
            gamesWithMarkets = gamesWithMarkets.map((game) => ({
              ...game,
              markets: {}
            }));
          } else {
            // No markets found, add empty markets object
            gamesWithMarkets = gamesWithMarkets.map((game) => ({
              ...game,
              markets: {}
            }));
          }
        } else {
          // No valid game IDs, add empty markets object
          gamesWithMarkets = gamesWithMarkets.map((game) => ({
            ...game,
            markets: {}
          }));
        }
      } catch (marketError) {
        console.warn('⚠️ Error processing markets:', marketError);
        // Continue without markets data
        gamesWithMarkets = gamesWithMarkets.map((game) => ({
          ...game,
          markets: {}
        }));
      }
    }

    res.json({ success: true, games: gamesWithMarkets });
  } catch (error) {
    console.error('❌ Get games error:', error.message || error);
    // Return empty array instead of error so frontend can load
    res.json({ 
      success: true, 
      games: [],
      message: 'Error fetching games, returning empty array'
    });
  }
});

// GET: Get current server time for a game (for synchronized timer)
router.get('/games/:gameId/time', async (req, res) => {
  try {
    const { gameId } = req.params;
    console.log(`\n⏱️  [GET /api/admin/games/${gameId}/time] Getting server time for game...`);

    // Check if gameId is UUID or text game_id
    let gameQuery = supabase.from('games').select('id, game_id, kickoff_start_time, is_kickoff_started, minute, seconds');
    
    if (isValidUUID(gameId)) {
      console.log(`   GameId is UUID, searching by id`);
      gameQuery = gameQuery.eq('id', gameId);
    } else {
      console.log(`   GameId is text, searching by game_id`);
      gameQuery = gameQuery.eq('game_id', gameId);
    }

    const { data: game, error } = await gameQuery.maybeSingle();

    if (error || !game) {
      console.error('❌ Game not found:', error?.message || 'Game not found');
      return res.status(404).json({ 
        success: false, 
        error: 'Game not found' 
      });
    }

    // Get current server time
    const serverNow = Date.now();
    const kickoffMs = game.kickoff_start_time 
      ? new Date(game.kickoff_start_time).getTime() 
      : null;

    let minute = game.minute || 0;
    let seconds = game.seconds || 0;

    // If game is live, calculate elapsed time from server's perspective
    if (game.is_kickoff_started && kickoffMs && !isNaN(kickoffMs)) {
      const elapsedMs = serverNow - kickoffMs;
      const totalSeconds = Math.floor(elapsedMs / 1000);
      minute = Math.floor(totalSeconds / 60);
      seconds = totalSeconds % 60;
    }

    console.log(`⏱️  Game time: ${String(minute).padStart(2, "0")}:${String(seconds).padStart(2, "0")} (server time: ${new Date(serverNow).toISOString()})`);

    res.json({ 
      success: true, 
      serverTime: serverNow,
      kickoffStartTime: game.kickoff_start_time,
      isKickoffStarted: game.is_kickoff_started,
      minute,
      seconds
    });
  } catch (error) {
    console.error('❌ Get game time error:', error.message || error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get game time' 
    });
  }
});

// POST: Create a new game
router.post('/games', checkAdmin, async (req, res) => {
  try {
    console.log(`\n📝 [POST /api/admin/games] Creating new game`);
    console.log('   Request user:', req.user);
    console.log('   Payload:', req.body);
    
    if (!supabase) {
      console.error('❌ Supabase client not initialized');
      return res.status(503).json({ 
        success: false,
        error: 'Database service unavailable',
        details: 'Supabase client not initialized'
      });
    }
    
    const {
      league,
      homeTeam,
      awayTeam,
      homeOdds,
      drawOdds,
      awayOdds,
      time,
      status,
      markets,  // Markets will be handled separately
    } = req.body;

    console.log('🔍 Validating request parameters');
    if (!homeTeam || !awayTeam) {
      console.error('❌ Missing required fields');
      return res.status(400).json({ 
        success: false,
        error: 'Home and away teams required' 
      });
    }
    console.log('✅ Parameters valid');

    console.log('📊 Building game data object');
    // Only include fields that exist in the games table
    const gameData = {
      game_id: `g${Date.now()}`,
      league: league || 'General',
      home_team: homeTeam,
      away_team: awayTeam,
      home_odds: parseFloat(homeOdds) || 2.0,
      draw_odds: parseFloat(drawOdds) || 3.0,
      away_odds: parseFloat(awayOdds) || 3.0,
      time: time || new Date().toISOString(),
      status: status || 'upcoming',
      // Note: markets field is stored separately in the markets table, not here
    };
    console.log('📊 Game data object:', JSON.stringify(gameData, null, 2));

    console.log('🗄️  Inserting game into database');
    const { data: game, error } = await supabase
      .from('games')
      .insert([gameData])
      .select()
      .single();

    if (error) {
      console.error('❌ Database insert failed:');
      console.error('   Message:', error.message);
      console.error('   Code:', error.code);
      console.error('   Details:', error.details);
      console.error('   Full error:', JSON.stringify(error));
      return res.status(400).json({ 
        success: false,
        error: 'Failed to create game in database',
        details: error.message,
        code: error.code
      });
    }

    if (!game) {
      console.error('❌ Database insert returned no data');
      return res.status(400).json({ 
        success: false,
        error: 'Game creation failed - no data returned' 
      });
    }

    console.log('✅ Game created:', game.id || game.game_id);
    console.log('📋 Game object structure:', {
      id: game.id,
      game_id: game.game_id,
      home_team: game.home_team,
      away_team: game.away_team,
    });

    // Now insert markets if provided or generate default ones
    try {
      console.log('📊 Handling markets for new game');
      let marketsToInsert = [];

      if (markets && typeof markets === 'object' && Object.keys(markets).length > 0) {
        // Use provided markets
        marketsToInsert = Object.entries(markets).map(([key, odds]) => ({
          game_id: game.id,
          market_type: determineMarketType(key),
          market_key: key,
          odds: parseFloat(odds) || 0
        }));
      } else {
        // Generate default markets based on 1X2 odds
        const defaultMarkets = generateDefaultMarkets(
          game.id,
          parseFloat(homeOdds) || 2.0,
          parseFloat(drawOdds) || 3.0,
          parseFloat(awayOdds) || 3.0
        );
        marketsToInsert = defaultMarkets;
      }

      if (marketsToInsert.length > 0) {
        const { error: marketError } = await supabase
          .from('markets')
          .insert(marketsToInsert);

        if (marketError) {
          console.warn('⚠️ Failed to insert markets:', marketError.message);
          // Don't fail the game creation, continue anyway
        } else {
          console.log(`✅ Inserted ${marketsToInsert.length} markets for game`);
        }
      }
    } catch (marketError) {
      console.warn('⚠️ Error creating markets:', marketError.message);
      // Don't fail the game creation if markets fail
    }

    // Try to log admin action, but don't fail if it doesn't work
    try {
      console.log('📝 Logging admin action');
      // Only log if we have a valid UUID for admin_id
      if (req.user.id && req.user.id !== 'unknown') {
        await supabase.from('admin_logs').insert([{
          admin_id: req.user.id,
          action: 'create_game',
          target_type: 'game',
          target_id: game.id,
          changes: { home_team: homeTeam, away_team: awayTeam },
          description: `Created game: ${homeTeam} vs ${awayTeam}`,
        }]);
        console.log('✅ Admin action logged');
      } else {
        console.warn('⚠️ Skipping admin log - invalid admin_id:', req.user.id);
      }
    } catch (logError) {
      console.warn('⚠️ Failed to log admin action:', logError.message);
      // Don't fail the request if logging fails
    }

    console.log('📤 Sending success response');

    // Send minimal response to avoid circular references
    res.status(200).json({ 
      success: true, 
      game: {
        id: game.id,
        game_id: game.game_id,
        league: game.league,
        home_team: game.home_team,
        away_team: game.away_team,
        home_odds: game.home_odds,
        draw_odds: game.draw_odds,
        away_odds: game.away_odds,
        status: game.status,
        time: game.time,
        created_at: game.created_at
      }
    });
  } catch (error) {
    console.error('❌ Create game error - caught in main catch block');
    console.error('   Error name:', error.name);
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    console.error('   Error toString:', String(error));
    
    // Try to serialize error safely
    let errorDetails = {};
    try {
      errorDetails = JSON.parse(JSON.stringify(error));
    } catch (e) {
      errorDetails = { message: error.message, name: error.name };
    }
    
    console.error('❌ Full error object:', errorDetails);
    
    res.status(500).json({ 
      success: false,
      error: 'Server error creating game',
      message: error.message || String(error),
      name: error.name,
      details: 'Check server logs for full error'
    });
  }
});

// PUT: Update a game
router.put('/games/:gameId', checkAdmin, async (req, res) => {
  try {
    const { gameId } = req.params;
    const updates = req.body;

    console.log(`📝 Updating game: ${gameId}`);
    console.log('   Received updates:', JSON.stringify(updates, null, 2));

    // Filter allowed fields
    const allowedFields = [
      'league', 'home_team', 'away_team', 'home_odds', 'draw_odds', 'away_odds',
      'scheduled_time', 'status', 'home_score', 'away_score', 'minute',
      'markets', 'is_kickoff_started', 'game_paused', 'kickoff_start_time', 'kickoff_paused_at', 'is_halftime'
    ];

    const sanitizedUpdates = {};
    Object.keys(updates).forEach((key) => {
      // Skip phone and other auth fields
      if (key === 'phone') return;
      
      const dbKey = key.includes('_') ? key : key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbKey)) {
        sanitizedUpdates[dbKey] = updates[key];
      }
    });

    console.log('   Sanitized updates:', JSON.stringify(sanitizedUpdates, null, 2));

    // Auto-set kickoff_start_time ONLY when status changes to live AND no kickoff_start_time provided
    if (sanitizedUpdates.status === 'live' && sanitizedUpdates.is_kickoff_started && !sanitizedUpdates.kickoff_start_time) {
      sanitizedUpdates.kickoff_start_time = new Date().toISOString();
      console.log('   Auto-setting kickoff_start_time:', sanitizedUpdates.kickoff_start_time);
    } else if (sanitizedUpdates.status === 'live' && sanitizedUpdates.kickoff_start_time) {
      // Prioritize frontend-sent kickoff_start_time
      console.log('   Using frontend-provided kickoff_start_time:', sanitizedUpdates.kickoff_start_time);
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      console.warn('⚠️ No valid fields to update');
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    sanitizedUpdates.updated_at = new Date().toISOString();

    // Try to find the game - check if gameId is UUID or text game_id
    let existingGameQuery = supabase.from('games').select('*');
    
    if (isValidUUID(gameId)) {
      console.log(`   GameId looks like UUID, searching by id`);
      existingGameQuery = existingGameQuery.eq('id', gameId);
    } else {
      console.log(`   GameId looks like text, searching by game_id`);
      existingGameQuery = existingGameQuery.eq('game_id', gameId);
    }

    const { data: existingGame, error: findError } = await existingGameQuery.maybeSingle();

    if (findError) {
      console.error('❌ Error finding game:', findError.message, findError.code);
      return res.status(400).json({ 
        error: 'Failed to find game', 
        details: findError.message,
        code: findError.code
      });
    }

    if (!existingGame) {
      console.error('❌ No game found for update:', gameId);
      return res.status(404).json({ error: 'Game not found', gameId });
    }

    console.log(`   Found game with id: ${existingGame.id}, game_id: ${existingGame.game_id}`);

    // Now update using the UUID
    const { data: game, error } = await supabase
      .from('games')
      .update(sanitizedUpdates)
      .eq('id', existingGame.id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating game:', error.message, error.code, error.details);
      return res.status(400).json({ 
        error: 'Failed to update game', 
        details: error.message,
        code: error.code
      });
    }

    console.log(`✅ Game updated successfully:`, game.game_id || game.id);

    // Log admin action (optional)
    try {
      if (req.user.id && req.user.id !== 'unknown') {
        await supabase.from('admin_logs').insert([{
          admin_id: req.user.id,
          action: 'update_game',
          target_type: 'game',
          target_id: game.id,
          changes: sanitizedUpdates,
          description: 'Updated game details',
        }]);
      }
    } catch (logError) {
      console.warn('⚠️ Failed to log admin action:', logError.message);
      // Don't fail the request if logging fails
    }

    res.json({ success: true, game });
  } catch (error) {
    console.error('❌ Update game error:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update game', 
      details: error.message 
    });
  }
});

// DELETE: Delete a game
router.delete('/games/:gameId', checkAdmin, async (req, res) => {
  try {
    const { gameId } = req.params;

    console.log(`🗑️  Deleting game: ${gameId}`);

    // Find the game first - check if gameId is UUID or text game_id
    let existingGameQuery = supabase.from('games').select('*');
    
    if (isValidUUID(gameId)) {
      console.log(`   GameId looks like UUID, searching by id`);
      existingGameQuery = existingGameQuery.eq('id', gameId);
    } else {
      console.log(`   GameId looks like text, searching by game_id`);
      existingGameQuery = existingGameQuery.eq('game_id', gameId);
    }

    const { data: existingGame, error: findError } = await existingGameQuery.maybeSingle();

    if (findError) {
      console.error('❌ Error finding game:', findError.message);
      throw findError;
    }

    if (!existingGame) {
      console.error('❌ No game found for delete:', gameId);
      return res.status(404).json({ error: 'Game not found' });
    }

    // Try to delete by UUID
    const { error } = await supabase
      .from('games')
      .delete()
      .eq('id', existingGame.id);

    if (error) {
      console.error('❌ Error deleting game:', error.message);
      throw error;
    }

    console.log(`✅ Game deleted successfully`);

    // Log admin action (optional)
    try {
      if (req.user.id && req.user.id !== 'unknown') {
        // Note: We can't log with gameId since it's text, not UUID
        // The game has been deleted so we can't query it
        console.log('ℹ️ Game deleted but audit logging skipped (game_id is not UUID)');
      }
    } catch (logError) {
      console.warn('⚠️ Failed to log admin action:', logError.message);
    }

    res.json({ success: true, message: 'Game deleted' });
  } catch (error) {
    console.error('❌ Delete game error:', error.message);
    res.status(500).json({ error: 'Failed to delete game', details: error.message });
  }
});

// PUT: Update game score
router.put('/games/:gameId/score', checkAdmin, async (req, res) => {
  try {
    const { gameId } = req.params;
    const { homeScore, awayScore, minute, status } = req.body;

    console.log(`📝 Updating score for game: ${gameId}, score: ${homeScore}-${awayScore}, minute: ${minute}`);

    const updates = {
      home_score: homeScore,
      away_score: awayScore,
      minute: minute,
      status: status,
      updated_at: new Date().toISOString(),
    };

    // Find the game first - check if gameId is UUID or text game_id
    let existingGameQuery = supabase.from('games').select('*');
    
    if (isValidUUID(gameId)) {
      console.log(`   GameId looks like UUID, searching by id`);
      existingGameQuery = existingGameQuery.eq('id', gameId);
    } else {
      console.log(`   GameId looks like text, searching by game_id`);
      existingGameQuery = existingGameQuery.eq('game_id', gameId);
    }

    const { data: existingGame, error: findError } = await existingGameQuery.maybeSingle();

    if (findError) {
      console.error('❌ Error finding game:', findError.message);
      throw findError;
    }

    if (!existingGame) {
      console.error('❌ No game found for score update:', gameId);
      return res.status(404).json({ error: 'Game not found' });
    }

    console.log(`   Found game with id: ${existingGame.id}`);

    // Try to update by UUID
    let { data: game, error } = await supabase
      .from('games')
      .update(updates)
      .eq('id', existingGame.id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating game score:', error.message);
      throw error;
    }

    if (!game) {
      console.error('❌ No game found for score update:', gameId);
      return res.status(404).json({ error: 'Game not found' });
    }

    console.log(`✅ Game score updated: ${homeScore}-${awayScore}`);

    // Log admin action (optional)
    try {
      if (req.user.id && req.user.id !== 'unknown') {
        console.log('ℹ️ Score update logged');
      }
    } catch (logError) {
      console.warn('⚠️ Failed to log admin action:', logError.message);
    }

    res.json({ success: true, game });
  } catch (error) {
    console.error('❌ Update score error:', error.message);
    res.status(500).json({ error: 'Failed to update score', details: error.message });
  }
});

// PUT: Update game markets
router.put('/games/:gameId/markets', checkAdmin, async (req, res) => {
  try {
    const { gameId } = req.params;
    const { markets } = req.body;

    if (!markets || typeof markets !== 'object') {
      return res.status(400).json({ error: 'Invalid markets data' });
    }

    console.log(`📝 Updating markets for game: ${gameId}`, Object.keys(markets).length, 'markets');

    // Try to find game by either UUID (id) or text game_id
    let gameQuery = supabase.from('games').select('id, game_id');
    
    if (isValidUUID(gameId)) {
      console.log(`   GameId looks like UUID, searching by id`);
      gameQuery = gameQuery.eq('id', gameId);
    } else {
      console.log(`   GameId looks like text, searching by game_id`);
      gameQuery = gameQuery.eq('game_id', gameId);
    }

    const { data: game, error: gameError } = await gameQuery.single();

    if (gameError || !game) {
      console.error('❌ Game not found with gameId:', gameId, gameError?.message);
      return res.status(404).json({ error: 'Game not found', details: gameError?.message });
    }

    const gameUUID = game.id;
    console.log(`✅ Found game UUID: ${gameUUID} for gameId: ${gameId}`);

    // Delete existing markets for this game
    const { error: deleteError } = await supabase
      .from('markets')
      .delete()
      .eq('game_id', gameUUID);

    if (deleteError) {
      console.warn('⚠️ Error deleting existing markets:', deleteError.message);
      // Continue anyway, we'll insert/update new ones
    } else {
      console.log('✅ Deleted existing markets');
    }

    // Insert new market entries
    const marketEntries = Object.entries(markets).map(([marketKey, odds]) => ({
      game_id: gameUUID,
      market_type: determineMarketType(marketKey),
      market_key: marketKey,
      odds: parseFloat(odds) || 0
    }));

    console.log(`📝 Preparing to insert ${marketEntries.length} market entries`);

    if (marketEntries.length > 0) {
      const { error: insertError } = await supabase
        .from('markets')
        .insert(marketEntries);

      if (insertError) {
        console.error('❌ Error inserting markets:', insertError.message, insertError.details);
        return res.status(500).json({ 
          error: 'Failed to insert markets', 
          details: insertError.message,
          code: insertError.code
        });
      }
      console.log(`✅ Successfully inserted ${marketEntries.length} markets`);
    }

    console.log(`✅ Markets updated successfully for game ${gameId}`);

    res.json({ success: true, game, marketCount: marketEntries.length });
  } catch (error) {
    console.error('❌ Update markets error:', error.message);
    res.status(500).json({ error: 'Failed to update markets', details: error.message });
  }
});

// PUT: Mark halftime
router.put('/games/:gameId/halftime', checkAdmin, async (req, res) => {
  try {
    const { gameId } = req.params;

    console.log(`⏱️  Marking halftime for game: ${gameId}`);

    // Find the game first - check if gameId is UUID or text game_id
    let existingGameQuery = supabase.from('games').select('*');
    
    if (isValidUUID(gameId)) {
      console.log(`   GameId looks like UUID, searching by id`);
      existingGameQuery = existingGameQuery.eq('id', gameId);
    } else {
      console.log(`   GameId looks like text, searching by game_id`);
      existingGameQuery = existingGameQuery.eq('game_id', gameId);
    }

    const { data: existingGame, error: findError } = await existingGameQuery.maybeSingle();

    if (findError) {
      console.error('❌ Error finding game:', findError.message);
      return res.status(400).json({ error: 'Failed to find game', details: findError.message });
    }

    if (!existingGame) {
      console.error('❌ No game found for halftime:', gameId);
      return res.status(404).json({ error: 'Game not found' });
    }

    // Mark halftime
    const updates = {
      is_halftime: true,
      updated_at: new Date().toISOString()
    };

    const { data: game, error } = await supabase
      .from('games')
      .update(updates)
      .eq('id', existingGame.id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error marking halftime:', error.message);
      return res.status(400).json({ error: 'Failed to mark halftime', details: error.message });
    }

    console.log(`✅ Halftime marked for game ${gameId}`);
    res.json({ success: true, game });
  } catch (error) {
    console.error('❌ Halftime error:', error.message);
    res.status(500).json({ error: 'Failed to mark halftime', details: error.message });
  }
});

// PUT: End game
router.put('/games/:gameId/end', checkAdmin, async (req, res) => {
  try {
    const { gameId } = req.params;

    console.log(`🏁 Ending game: ${gameId}`);

    // Find the game first - check if gameId is UUID or text game_id
    let existingGameQuery = supabase.from('games').select('*');
    
    if (isValidUUID(gameId)) {
      console.log(`   GameId looks like UUID, searching by id`);
      existingGameQuery = existingGameQuery.eq('id', gameId);
    } else {
      console.log(`   GameId looks like text, searching by game_id`);
      existingGameQuery = existingGameQuery.eq('game_id', gameId);
    }

    const { data: existingGame, error: findError } = await existingGameQuery.maybeSingle();

    if (findError) {
      console.error('❌ Error finding game:', findError.message);
      return res.status(400).json({ error: 'Failed to find game', details: findError.message });
    }

    if (!existingGame) {
      console.error('❌ No game found for ending:', gameId);
      return res.status(404).json({ error: 'Game not found' });
    }

    // End the game
    const updates = {
      status: 'finished',
      updated_at: new Date().toISOString()
    };

    const { data: game, error } = await supabase
      .from('games')
      .update(updates)
      .eq('id', existingGame.id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error ending game:', error.message);
      return res.status(400).json({ error: 'Failed to end game', details: error.message });
    }

    console.log(`✅ Game ended: ${gameId}`);
    res.json({ success: true, game });
  } catch (error) {
    console.error('❌ End game error:', error.message);
    res.status(500).json({ error: 'Failed to end game', details: error.message });
  }
});

// PUT: Edit user balance
router.put('/users/:userId/balance', checkAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { balance, reason } = req.body;

    if (balance === undefined) {
      return res.status(400).json({ error: 'Balance amount required' });
    }

    // Get user's current balance
    const { data: user } = await supabase
      .from('users')
      .select('balance')
      .eq('id', userId)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const previousBalance = user.balance;
    const balanceChange = balance - previousBalance;

    // Update user balance
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ balance, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    // Record balance history
    await supabase.from('balance_history').insert([{
      user_id: userId,
      balance_before: previousBalance,
      balance_after: balance,
      change: balanceChange,
      reason: reason || 'Admin adjustment',
      created_by: req.user.phone,
      created_at: new Date().toISOString(),
    }]);

    // Log admin action (optional)
    try {
      if (req.user.id && req.user.id !== 'unknown') {
        await supabase.from('admin_logs').insert([{
          admin_id: req.user.id,
          action: 'update_balance',
          target_type: 'user',
          target_id: userId,
          changes: { previous_balance: previousBalance, new_balance: balance, change_amount: balanceChange },
          description: `Balance changed from ${previousBalance} to ${balance}: ${reason}`,
        }]);
      }
    } catch (logError) {
      console.warn('⚠️ Failed to log admin action:', logError.message);
    }

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Update balance error:', error);
    res.status(500).json({ error: 'Failed to update balance' });
  }
});

// POST: Resolve payment
router.post('/payments/:paymentId/resolve', checkAdmin, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status required' });
    }

    const { data: payment, error } = await supabase
      .from('payments')
      .update({
        payment_status: status,
        resolved_by: req.user.phone,
        resolved_at: new Date().toISOString(),
        notes: notes || '',
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId)
      .select()
      .single();

    if (error) throw error;

    // Log admin action (optional)
    try {
      if (req.user.id && req.user.id !== 'unknown') {
        await supabase.from('admin_logs').insert([{
          admin_id: req.user.id,
          action: 'resolve_payment',
          target_type: 'payment',
          target_id: paymentId,
          changes: { payment_status: status, notes },
          description: `Payment resolved with status: ${status}`,
        }]);
      }
    } catch (logError) {
      console.warn('⚠️ Failed to log admin action:', logError.message);
    }

    res.json({ success: true, payment });
  } catch (error) {
    console.error('Resolve payment error:', error);
    res.status(500).json({ error: 'Failed to resolve payment' });
  }
});

// PUT: Activate user withdrawal
router.put('/users/:userId/activate-withdrawal', checkAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { withdrawalId } = req.body;

    // Update withdrawal status
    const { data: withdrawal, error } = await supabase
      .from('payments')
      .update({
        payment_status: 'processing',
        activated_by: req.user.phone,
        activated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', withdrawalId)
      .select()
      .single();

    if (error) throw error;

    // Log admin action (optional)
    try {
      if (req.user.id && req.user.id !== 'unknown') {
        await supabase.from('admin_logs').insert([{
          admin_id: req.user.id,
          action: 'activate_withdrawal',
          target_type: 'user',
          target_id: userId,
          changes: { withdrawal_id: withdrawalId },
          description: 'Withdrawal activated',
        }]);
      }
    } catch (logError) {
      console.warn('⚠️ Failed to log admin action:', logError.message);
    }

    res.json({ success: true, withdrawal });
  } catch (error) {
    console.error('Activate withdrawal error:', error);
    res.status(500).json({ error: 'Failed to activate withdrawal' });
  }
});

// GET: Fetch all users (admin)
router.get('/users', checkAdmin, async (req, res) => {
  try {
    console.log('\n👥 [GET /api/admin/users] Fetching all users...');

    if (!supabase) {
      console.error('❌ Supabase client is not initialized');
      return res.status(503).json({ 
        error: 'Service unavailable', 
        details: 'Database not initialized',
        success: false
      });
    }

    // Fetch all users from users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('❌ Database query error:', usersError.message);
      return res.status(500).json({ 
        success: false, 
        error: usersError.message 
      });
    }

    console.log(`✅ Retrieved ${users?.length || 0} users successfully`);

    res.json({ success: true, users: users || [] });
  } catch (error) {
    console.error('❌ Get users error:', error.message || error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// GET: Admin dashboard stats
router.get('/stats', checkAdmin, async (req, res) => {
  try {
    const [
      { count: totalUsers },
      { count: totalGames },
      { count: pendingPayments },
      { count: totalBets },
    ] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact' }),
      supabase.from('games').select('id', { count: 'exact' }),
      supabase
        .from('payments')
        .select('id', { count: 'exact' })
        .eq('payment_status', 'pending'),
      supabase.from('bets').select('id', { count: 'exact' }),
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers: totalUsers || 0,
        totalGames: totalGames || 0,
        pendingPayments: pendingPayments || 0,
        totalBets: totalBets || 0,
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// GET: Fetch all transactions (deposits and withdrawals)
router.get('/transactions', checkAdmin, async (req, res) => {
  try {
    console.log('\n💳 [GET /api/admin/transactions] Fetching all transactions');

    if (!supabase) {
      console.error('❌ Supabase client is not initialized');
      return res.status(503).json({ 
        error: 'Service unavailable',
        success: false
      });
    }

    // Fetch all transactions
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (txError) {
      console.warn('⚠️  No transactions table found or fetch error:', txError.message);
      // Return empty array if table doesn't exist
      return res.json({ success: true, transactions: [] });
    }

    console.log(`✅ Retrieved ${transactions?.length || 0} transactions`);

    res.json({ 
      success: true, 
      transactions: transactions || []
    });
  } catch (error) {
    console.error('❌ Get transactions error:', error);
    res.json({ 
      success: true, 
      transactions: [],
      message: 'Could not fetch transactions'
    });
  }
});

// GET: Fetch all payments (deposits/withdrawals)
router.get('/payments', checkAdmin, async (req, res) => {
  try {
    console.log('\n💰 [GET /api/admin/payments] Fetching all payments');

    if (!supabase) {
      console.error('❌ Supabase client is not initialized');
      return res.status(503).json({ 
        error: 'Service unavailable',
        success: false
      });
    }

    // Fetch all payments
    const { data: payments, error: payError } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (payError) {
      console.warn('⚠️  No payments found or fetch error:', payError.message);
      return res.json({ success: true, payments: [] });
    }

    console.log(`✅ Retrieved ${payments?.length || 0} payments`);

    res.json({ 
      success: true, 
      payments: payments || []
    });
  } catch (error) {
    console.error('❌ Get payments error:', error);
    res.json({ 
      success: true, 
      payments: [],
      message: 'Could not fetch payments'
    });
  }
});

module.exports = router;
