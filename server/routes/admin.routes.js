const express = require('express');
const { supabase } = require('../services/database');

const router = express.Router();

// Middleware to check if user is admin
async function checkAdmin(req, res, next) {
  try {
    const phone = req.body.phone || req.query.phone;
    if (!phone) {
      return res.status(401).json({ error: 'Phone number required' });
    }

    // Check if user is admin
    const { data: user } = await supabase
      .from('users')
      .select('is_admin, role')
      .eq('phone', phone)
      .single();

    if (!user || !user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = { phone, is_admin: true };
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

// GET: Fetch all games
router.get('/games', async (req, res) => {
  try {
    const { data: games, error } = await supabase
      .from('games')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, games });
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// POST: Create a new game
router.post('/games', checkAdmin, async (req, res) => {
  try {
    const {
      league,
      homeTeam,
      awayTeam,
      homeOdds,
      drawOdds,
      awayOdds,
      time,
      status,
      markets,
    } = req.body;

    if (!homeTeam || !awayTeam) {
      return res.status(400).json({ error: 'Home and away teams required' });
    }

    const gameData = {
      game_id: `g${Date.now()}`,
      league: league || '',
      home_team: homeTeam,
      away_team: awayTeam,
      home_odds: parseFloat(homeOdds) || 2.0,
      draw_odds: parseFloat(drawOdds) || 3.0,
      away_odds: parseFloat(awayOdds) || 3.0,
      scheduled_time: time || new Date().toISOString(),
      status: status || 'upcoming',
      markets: markets || {},
      created_by: req.user.phone,
      created_at: new Date().toISOString(),
    };

    const { data: game, error } = await supabase
      .from('games')
      .insert([gameData])
      .select()
      .single();

    if (error) throw error;

    // Log admin action
    await supabase.from('admin_logs').insert([{
      admin_phone: req.user.phone,
      action: 'create_game',
      details: { game_id: gameData.game_id, home_team: homeTeam, away_team: awayTeam },
      created_at: new Date().toISOString(),
    }]);

    res.json({ success: true, game });
  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({ error: 'Failed to create game' });
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

    // Log admin action
    await supabase.from('admin_logs').insert([{
      admin_phone: req.user.phone,
      action: 'update_game',
      details: { game_id: gameId, updates: sanitizedUpdates },
      created_at: new Date().toISOString(),
    }]);

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

    // Log admin action
    await supabase.from('admin_logs').insert([{
      admin_phone: req.user.phone,
      action: 'delete_game',
      details: { game_id: gameId },
      created_at: new Date().toISOString(),
    }]);

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

    // Log admin action
    await supabase.from('admin_logs').insert([{
      admin_phone: req.user.phone,
      action: 'update_score',
      details: { game_id: gameId, home_score: homeScore, away_score: awayScore },
      created_at: new Date().toISOString(),
    }]);

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

    // Log admin action
    await supabase.from('admin_logs').insert([{
      admin_phone: req.user.phone,
      action: 'update_markets',
      details: { game_id: gameId },
      created_at: new Date().toISOString(),
    }]);

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
      previous_balance: previousBalance,
      new_balance: balance,
      change_amount: balanceChange,
      change_reason: reason || 'Admin adjustment',
      changed_by: req.user.phone,
      created_at: new Date().toISOString(),
    }]);

    // Log admin action
    await supabase.from('admin_logs').insert([{
      admin_phone: req.user.phone,
      action: 'update_balance',
      details: { user_id: userId, previous_balance: previousBalance, new_balance: balance, reason },
      created_at: new Date().toISOString(),
    }]);

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

    // Log admin action
    await supabase.from('admin_logs').insert([{
      admin_phone: req.user.phone,
      action: 'resolve_payment',
      details: { payment_id: paymentId, status, notes },
      created_at: new Date().toISOString(),
    }]);

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

    // Log admin action
    await supabase.from('admin_logs').insert([{
      admin_phone: req.user.phone,
      action: 'activate_withdrawal',
      details: { user_id: userId, withdrawal_id: withdrawalId },
      created_at: new Date().toISOString(),
    }]);

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
