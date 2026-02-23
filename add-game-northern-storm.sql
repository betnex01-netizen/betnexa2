-- ==================== ADD GAME: Northern Storm VS Rampage Fc ====================
-- League: Football
-- Kickoff: 11:00 PM on 23rd Feb 2026
-- Match Odds: 1 @2.80, X @3.58, 2 @3.63

DO $$
DECLARE
  v_game_id UUID;
BEGIN
  -- 1. Insert the main game
  INSERT INTO games (
    game_id,
    league,
    home_team,
    away_team,
    home_odds,
    draw_odds,
    away_odds,
    time,
    status,
    created_at,
    updated_at
  ) VALUES (
    'g' || to_char(NOW(), 'YYYYMMDDHHmmss') || '_northernstorm_rampage',
    'Football',
    'Northern Storm',
    'Rampage Fc',
    2.80,
    3.58,
    3.63,
    '2026-02-23T23:00:00Z',
    'upcoming',
    NOW(),
    NOW()
  ) RETURNING id INTO v_game_id;

  -- ==================== MATCH ODDS ====================
  INSERT INTO markets (game_id, market_type, market_key, odds) VALUES
  (v_game_id, 'match_odds', 'match_odds:1', 2.80),
  (v_game_id, 'match_odds', 'match_odds:X', 3.58),
  (v_game_id, 'match_odds', 'match_odds:2', 3.63),
  
  -- ==================== BTTS (Both Teams To Score) ====================
  (v_game_id, 'btts', 'btts:yes', 1.89),
  (v_game_id, 'btts', 'btts:no', 2.59),
  
  -- ==================== OVER/UNDER 1.5 GOALS ====================
  (v_game_id, 'over_under', 'over_under:over_1.5', 1.24),
  (v_game_id, 'over_under', 'over_under:under_1.5', 3.89),
  
  -- ==================== OVER/UNDER 2.5 GOALS ====================
  (v_game_id, 'over_under', 'over_under:over_2.5', 2.39),
  (v_game_id, 'over_under', 'over_under:under_2.5', 2.04),
  
  -- ==================== OVER/UNDER 3.5 GOALS ====================
  (v_game_id, 'over_under', 'over_under:over_3.5', 4.50),
  (v_game_id, 'over_under', 'over_under:under_3.5', 1.18),
  
  -- ==================== CORRECT SCORES ====================
  -- User-provided scores
  (v_game_id, 'correct_score', 'correct_score:3:1', 36.00),
  
  -- Generated common correct scores
  (v_game_id, 'correct_score', 'correct_score:0:0', 8.00),
  (v_game_id, 'correct_score', 'correct_score:1:0', 5.50),
  (v_game_id, 'correct_score', 'correct_score:0:1', 6.00),
  (v_game_id, 'correct_score', 'correct_score:2:0', 9.50),
  (v_game_id, 'correct_score', 'correct_score:0:2', 11.00),
  (v_game_id, 'correct_score', 'correct_score:1:1', 7.00),
  (v_game_id, 'correct_score', 'correct_score:2:1', 13.50),
  (v_game_id, 'correct_score', 'correct_score:1:2', 15.00),
  (v_game_id, 'correct_score', 'correct_score:3:0', 25.00),
  (v_game_id, 'correct_score', 'correct_score:0:3', 28.00),
  (v_game_id, 'correct_score', 'correct_score:2:2', 20.00),
  (v_game_id, 'correct_score', 'correct_score:3:2', 42.00),
  (v_game_id, 'correct_score', 'correct_score:2:3', 48.00),
  (v_game_id, 'correct_score', 'correct_score:4:0', 80.00),
  (v_game_id, 'correct_score', 'correct_score:0:4', 90.00),
  (v_game_id, 'correct_score', 'correct_score:4:1', 120.00),
  (v_game_id, 'correct_score', 'correct_score:1:4', 135.00),
  (v_game_id, 'correct_score', 'correct_score:3:3', 75.00),
  (v_game_id, 'correct_score', 'correct_score:4:2', 150.00),
  (v_game_id, 'correct_score', 'correct_score:2:4', 160.00),
  (v_game_id, 'correct_score', 'correct_score:5:0', 250.00),
  (v_game_id, 'correct_score', 'correct_score:0:5', 280.00),
  
  -- ==================== HALF TIME RESULT ====================
  (v_game_id, 'half_time_result', 'half_time_result:1', 2.10),
  (v_game_id, 'half_time_result', 'half_time_result:X', 3.40),
  (v_game_id, 'half_time_result', 'half_time_result:2', 3.20),
  
  -- ==================== DOUBLE CHANCE ====================
  (v_game_id, 'double_chance', 'double_chance:1X', 1.45),
  (v_game_id, 'double_chance', 'double_chance:12', 1.62),
  (v_game_id, 'double_chance', 'double_chance:X2', 1.82),
  
  -- ==================== GOAL MARKETS ====================
  (v_game_id, 'goals_home', 'goals_home:over_0.5', 1.15),
  (v_game_id, 'goals_home', 'goals_home:under_0.5', 5.50),
  (v_game_id, 'goals_away', 'goals_away:over_0.5', 1.28),
  (v_game_id, 'goals_away', 'goals_away:under_0.5', 4.00),
  (v_game_id, 'goals_home', 'goals_home:over_1.5', 2.75),
  (v_game_id, 'goals_home', 'goals_home:under_1.5', 1.45),
  (v_game_id, 'goals_away', 'goals_away:over_1.5', 3.10),
  (v_game_id, 'goals_away', 'goals_away:under_1.5', 1.35),
  
  -- ==================== FIRST GOAL SCORER ====================
  -- These would typically be added with player names when available
  (v_game_id, 'first_goal', 'first_goal:any_player', 1.35),
  (v_game_id, 'first_goal', 'first_goal:no_goal_ht', 1.55),
  
  -- ==================== LAST GOAL SCORER ====================
  (v_game_id, 'last_goal', 'last_goal:any_player', 1.40),
  (v_game_id, 'last_goal', 'last_goal:no_goal_match', 2.50),
  
  -- ==================== HANDICAP MARKETS ====================
  (v_game_id, 'handicap', 'handicap:home_-0.5', 1.95),
  (v_game_id, 'handicap', 'handicap:away_+0.5', 1.95),
  (v_game_id, 'handicap', 'handicap:home_-1.5', 3.50),
  (v_game_id, 'handicap', 'handicap:away_+1.5', 1.32),
  
  -- ==================== CORNER MARKETS ====================
  (v_game_id, 'corners', 'corners:over_7.5', 1.90),
  (v_game_id, 'corners', 'corners:under_7.5', 1.95),
  (v_game_id, 'corners', 'corners:over_9.5', 2.50),
  (v_game_id, 'corners', 'corners:under_9.5', 1.60),
  
  -- ==================== CARD MARKETS ====================
  (v_game_id, 'cards', 'cards:over_3.5', 1.80),
  (v_game_id, 'cards', 'cards:under_3.5', 2.05),
  (v_game_id, 'cards', 'cards:over_5.5', 2.40),
  (v_game_id, 'cards', 'cards:under_5.5', 1.65);

  -- Confirm insertion
  RAISE NOTICE 'Game inserted successfully with ID: %', v_game_id;
  RAISE NOTICE 'Added 60+ markets for Northern Storm VS Rampage Fc';
END $$;
