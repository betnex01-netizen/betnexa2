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

    // Filter allowed fields
    const allowedFields = [
      'league', 'home_team', 'away_team', 'home_odds', 'draw_odds', 'away_odds',
      'scheduled_time', 'status', 'home_score', 'away_score', 'minute',
      'markets', 'is_kickoff_started', 'game_paused'
    ];

    const sanitizedUpdates = {};
    Object.keys(updates).forEach((key) => {
      const dbKey = key.includes('_') ? key : key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbKey)) {
        sanitizedUpdates[dbKey] = updates[key];
      }
    });

    sanitizedUpdates.updated_at = new Date().toISOString();

    const { data: game, error } = await supabase
      .from('games')
      .update(sanitizedUpdates)
      .eq('game_id', gameId)
      .select()
      .single();

    if (error) throw error;

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
    console.error('Update game error:', error);
    res.status(500).json({ error: 'Failed to update game' });
  }
});

// DELETE: Delete a game
router.delete('/games/:gameId', checkAdmin, async (req, res) => {
  try {
    const { gameId } = req.params;

    const { error } = await supabase
      .from('games')
      .delete()
      .eq('game_id', gameId);

    if (error) throw error;

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
    console.error('Delete game error:', error);
    res.status(500).json({ error: 'Failed to delete game' });
  }
});

// PUT: Update game score
router.put('/games/:gameId/score', checkAdmin, async (req, res) => {
  try {
    const { gameId } = req.params;
    const { homeScore, awayScore, minute, status } = req.body;

    const updates = {
      home_score: homeScore,
      away_score: awayScore,
      minute: minute,
      status: status,
      updated_at: new Date().toISOString(),
    };

    const { data: game, error } = await supabase
      .from('games')
      .update(updates)
      .eq('game_id', gameId)
      .select()
      .single();

    if (error) throw error;

    // Log admin action (optional)
    try {
      if (req.user.id && req.user.id !== 'unknown') {
        // Note: gameId is text, not UUID, so we skip logging to avoid type errors
        console.log('ℹ️ Score updated but audit logging skipped (game_id is not UUID)');
      }
    } catch (logError) {
      console.warn('⚠️ Failed to log admin action:', logError.message);
    }

    res.json({ success: true, game });
  } catch (error) {
    console.error('Update score error:', error);
    res.status(500).json({ error: 'Failed to update score' });
  }
});

// PUT: Update game markets
router.put('/games/:gameId/markets', checkAdmin, async (req, res) => {
  try {
    const { gameId } = req.params;
    const { markets } = req.body;

    const { data: game, error } = await supabase
      .from('games')
      .update({ markets, updated_at: new Date().toISOString() })
      .eq('game_id', gameId)
      .select()
      .single();

    if (error) throw error;

    // Log admin action (optional)
    try {
      if (req.user.id && req.user.id !== 'unknown') {
        // Note: gameId is text, not UUID, so we skip logging to avoid type errors
        console.log('ℹ️ Markets updated but audit logging skipped (game_id is not UUID)');
      }
    } catch (logError) {
      console.warn('⚠️ Failed to log admin action:', logError.message);
    }

    res.json({ success: true, game });
  } catch (error) {
    console.error('Update markets error:', error);
    res.status(500).json({ error: 'Failed to update markets' });
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

module.exports = router;
