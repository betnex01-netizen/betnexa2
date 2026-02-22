<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || $_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request.']);
    exit;
}

$user_id = $_SESSION['user_id'];
// Validate and sanitize input
$investment_id = filter_input(INPUT_POST, 'investment_id', FILTER_VALIDATE_INT);
if ($investment_id === false || $investment_id === null) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid investment ID.']);
    exit;
}

// !!! SECURITY WARNING !!!
// HARDCODED DATABASE CREDENTIALS ARE A MAJOR SECURITY RISK.
// USE ENVIRONMENT VARIABLES OR A SEPARATE CONFIGURATION FILE IN PRODUCTION.
define('DB_HOST', 'localhost');
define('DB_NAME', 'metrogai_metrogain');  
define('DB_USER', 'metrogai_joel');
define('DB_PASS', 'Mwangi@12345!'); // <--- CHANGE THIS IMMEDIATELY

$dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

try {
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
} catch (PDOException $e) {
    error_log('DB Connection Failed: ' . $e->getMessage());
    echo json_encode(['status' => 'error', 'message' => 'DB connection failed']);
    exit;
}

try {
    $pdo->beginTransaction();

    // Fetch and lock investment and user rows
    $stmt = $pdo->prepare("SELECT * FROM investments WHERE id = ? AND user_id = ? AND status = 'active' FOR UPDATE");
    $stmt->execute([$investment_id, $user_id]);
    $investment = $stmt->fetch();

    if (!$investment) {
        $pdo->rollBack();
        echo json_encode(['status' => 'error', 'message' => 'Investment not found or not active.']);
        exit;
    }
    
    // Check if 'claims_count' exists
    if (!isset($investment['claims_count'])) {
         $pdo->rollBack();
         echo json_encode(['status' => 'error', 'message' => 'Database error: claims_count column is missing.']);
         exit;
    }

    $now = new DateTime();
    $start_date = new DateTime($investment['start_date']);
    $total_investment_days = 30; // Total days the investment runs
    $required_claims = 30;       // Total claims required for final payout
    $daily_claim_wait_seconds = 24 * 3600; // 24 hours required wait time
    $min_first_claim_seconds = 300; // 5 minutes for the first claim

    // --- CHECK FOR FINAL PAYOUT (MATURITY BY CLAIMS COUNT) ---
    if ($investment['claims_count'] >= $required_claims) {
        
        // Calculate the total expected profit for 30 days.
        $expected_total_profit = $investment['daily_earning'] * $required_claims;
        
        // Calculate the profit shortfall (top-up) that must be added.
        $remaining_profit_to_add = $expected_total_profit - $investment['total_earned'];
        
        if ($remaining_profit_to_add < 0) {
             $remaining_profit_to_add = 0;
        }

        // The final amount credited is ONLY the profit top-up.
        $final_payout_amount = $remaining_profit_to_add; 
        
        // Add ONLY the remaining profit to the user's balance
        $stmt_update_user = $pdo->prepare("UPDATE users SET account_balance = account_balance + ? WHERE id = ?");
        $stmt_update_user->execute([$final_payout_amount, $user_id]);

        // Deactivate investment (This signifies the end and implicit return of capital)
        $stmt_deactivate = $pdo->prepare("UPDATE investments SET status = 'deactivated', last_claim_time = NOW() WHERE id = ?");
        $stmt_deactivate->execute([$investment_id]);

        $log_description = "Final Profit Top-up (KSH " . number_format($remaining_profit_to_add, 2) . ") for investment #{$investment_id}. Investment complete.";
        $stmt_log = $pdo->prepare("INSERT INTO transactions (user_id, type, amount, status, description, created_at) VALUES (?, 'final_profit_topup', ?, 'completed', ?, NOW())");
        $stmt_log->execute([$user_id, $final_payout_amount, $log_description]);

        $pdo->commit();
        echo json_encode(['status' => 'success', 'message' => "Investment #{$investment_id} is complete! Remaining guaranteed profit of KSH " . number_format($final_payout_amount, 2) . " has been credited to your balance."]);
        exit;
    }

    // --- DAILY CLAIM ELIGIBILITY (STRICTLY ONE DAY PER CLAIM) ---
    $can_claim = false;
    $claims_due = 0; // Will be capped to 1 or 0

    if ($investment['last_claim_time'] === null) {
        // First Claim: Reference is the start date.
        $time_since_reference_in_seconds = $now->getTimestamp() - $start_date->getTimestamp();
        
        if ($time_since_reference_in_seconds >= $min_first_claim_seconds) {
            // First claim is available, set claims_due to exactly 1
            $claims_due = 1; 
            $can_claim = true;
        } else {
            // Not enough time for first claim
            $pdo->rollBack();
            $minutes_until_first_claim = ceil($min_first_claim_seconds / 60) - floor($time_since_reference_in_seconds / 60);
            $message = ($minutes_until_first_claim <= 1) ? "You can claim your first profit in less than a minute." : "You can claim your first profit in {$minutes_until_first_claim} minutes.";
            echo json_encode(['status' => 'error', 'message' => $message]);
            exit;
        }

    } else {
        // Subsequent Claims: Reference is the last claim time.
        $claim_reference_datetime = new DateTime($investment['last_claim_time']);
        $time_since_reference_in_seconds = $now->getTimestamp() - $claim_reference_datetime->getTimestamp();

        // Check if a full 24 hours has passed since the last claim
        if ($time_since_reference_in_seconds >= $daily_claim_wait_seconds) {
            // Profit for the next day is available. Set claims_due to exactly 1.
            // All missed days are skipped (profit is lost/not combined).
            $claims_due = 1; 
            $can_claim = true;
        } else {
            // Cannot claim yet. Display remaining time.
            $pdo->rollBack();
            $remaining_seconds = $daily_claim_wait_seconds - $time_since_reference_in_seconds;
            $hours = floor($remaining_seconds / 3600);
            $minutes = floor(($remaining_seconds % 3600) / 60);
            $seconds = $remaining_seconds % 60;
            echo json_encode(['status' => 'error', 'message' => "You can claim again in {$hours}h {$minutes}m {$seconds}s."]);
            exit;
        }
    }
    
    // --- Cap the claims to prevent over-earning ---
    $remaining_claims_needed = $required_claims - $investment['claims_count'];
    if ($claims_due > $remaining_claims_needed) {
        // This ensures the last claim doesn't push the count past $required_claims (i.e., caps the final claim if needed)
        $claims_due = $remaining_claims_needed;
    }

    // --- Payout Processing ---
    if ($can_claim && $claims_due > 0) {
        // Calculate the payout amount (Always 1 day's profit, since claims_due = 1)
        $payout_amount = $investment['daily_earning'] * $claims_due; // $daily_earning * 1

        // Update user balance
        $stmt_update_user = $pdo->prepare("UPDATE users SET account_balance = account_balance + ? WHERE id = ?");
        $stmt_update_user->execute([$payout_amount, $user_id]);

        // Update investment (last claim is NOW, total earned, AND claims_count + 1)
        $stmt_update_investment = $pdo->prepare("UPDATE investments SET last_claim_time = NOW(), total_earned = total_earned + ?, claims_count = claims_count + ? WHERE id = ?");
        $stmt_update_investment->execute([$payout_amount, $claims_due, $investment_id]);

        // Log transaction
        $description_log = "Daily claim from investment #{$investment_id}";
        $stmt_log = $pdo->prepare("INSERT INTO transactions (user_id, type, amount, status, description, created_at) VALUES (?, 'daily_claim', ?, 'completed', ?, NOW())");
        $stmt_log->execute([$user_id, $payout_amount, $description_log]);
        
        $pdo->commit();
        echo json_encode(['status' => 'success', 'message' => "Claim successful! KSH " . number_format($payout_amount, 2) . " added to your balance. You claimed 1 day of profit. Total claims: " . ($investment['claims_count'] + $claims_due) . "/{$required_claims}"]);
        exit;
    }
    
    // Fallback error 
    $pdo->rollBack();
    echo json_encode(['status' => 'error', 'message' => 'Claim processing failed unexpectedly or no new claims are due.']);


} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("Error in claim_profit.php: " . $e->getMessage());
    echo json_encode(['status' => 'error', 'message' => 'Error processing claim']);
    exit;
}