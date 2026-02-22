<?php
// initiate_payment.php - MERGED VERSION FROM LIPA + PAY
// This file handles payment initiation with PayHero API
header('Content-Type: application/json');

require_once 'config.php';
require_once 'database.php';
require_once 'token_generator.php';

/**
 * Normalize phone number to PayHero format (254XXXXXXXXX)
 */
function normalizePhoneNumber($phone) {
    // Remove any spaces, dashes, or parentheses
    $phone = preg_replace('/[\s\-\(\)]/i', '', $phone);
    
    // If it starts with 07, 01, or 06, replace with 254
    if (preg_match('/^0[167]/', $phone)) {
        $phone = '254' . substr($phone, 1);
    }
    // If it already has 254 at the start, keep it
    elseif (!preg_match('/^254/', $phone)) {
        // If no country code, assume Kenya and add it
        $phone = '254' . $phone;
    }
    
    return $phone;
}

/**
 * Initiate payment with PayHero API
 */
function initiatePayment($amount, $phone_number, $channel_id, $external_reference) {
    $basicAuthToken = trim(generateBasicAuthToken());
    $phone_number = normalizePhoneNumber($phone_number);
    
    // Log the normalized phone number for debugging
    error_log("Processing payment for phone: $phone_number, amount: $amount, account: $channel_id");

    $curl = curl_init();
    $payload = [
        "amount" => floatval($amount),
        "phone_number" => $phone_number,
        "channel_id" => $channel_id,
        "provider" => "m-pesa",
        "external_reference" => $external_reference,
        "callback_url" => "https://betnexa.co.ke/pay/callback.php" 
    ];
    
    error_log("PayHero Request Payload: " . json_encode($payload));
    
    curl_setopt_array($curl, array(
        CURLOPT_URL => 'https://backend.payhero.co.ke/api/v2/payments',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_ENCODING => '',
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => 'POST',
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => array(
            'Content-Type: application/json',
            'Authorization: ' . $basicAuthToken
        ),
    ));

    $response = curl_exec($curl);
    $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    $error = curl_error($curl);
    curl_close($curl);

    if ($error) {
        error_log("cURL Error: $error");
        return ['success' => false, 'message' => "cURL Error: $error", 'code' => 'CURL_ERROR'];
    }

    error_log("PayHero Response (HTTP $httpCode): " . $response);

    $decodedResponse = json_decode($response, true);
    
    if ($httpCode != 200 && $httpCode != 201) {
        $errorMsg = $decodedResponse['error'] ?? $decodedResponse['message'] ?? "HTTP Error: $httpCode";
        error_log("PayHero API Error: $errorMsg");
        return ['success' => false, 'message' => $errorMsg, 'code' => 'API_ERROR', 'response' => $decodedResponse];
    }
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("JSON Decode Error: " . json_last_error_msg());
        return ['success' => false, 'message' => 'Invalid JSON response', 'code' => 'JSON_ERROR'];
    }

    return ['success' => true, 'data' => $decodedResponse];
}

// Handle POST request
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Determine input method (POST or JSON)
    $input = $_POST ?? json_decode(file_get_contents('php://input'), true) ?? [];
    
    // Basic validation
    if (!isset($input['amount']) || !isset($input['phone_number'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Amount and phone number are required.']);
        exit;
    }

    $amount = floatval($input['amount']);
    $phone_number = $input['phone_number'];
    
    // Validate amount
    if ($amount < 1) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Minimum amount is KES 1']);
        exit;
    }
    
    $channel_id = PAYHERO_ACCOUNT;
    $external_reference = 'INV-' . time();

    error_log("=== Payment Initiation Request ===");
    error_log("Amount: $amount, Phone: $phone_number");

    $response = initiatePayment($amount, $phone_number, $channel_id, $external_reference);

    if ($response['success']) {
        $checkout_request_id = $response['data']['CheckoutRequestID'] ?? null;
        
        if (!$checkout_request_id) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'No CheckoutRequestID received from PayHero']);
            exit;
        }

        $db = new Database();
        $conn = $db->getConnection();

        if (!$conn) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Database connection failed']);
            exit;
        }

        $sql = "INSERT INTO payments (amount, phone_number, external_reference, checkout_request_id, status) VALUES (?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($sql);

        if ($stmt === false) {
            error_log("Database Error: Failed to prepare statement: " . $conn->error);
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Database error']);
            exit;
        }
        
        $status = 'PENDING';
        $stmt->bind_param('dssss', $amount, $phone_number, $external_reference, $checkout_request_id, $status);

        if ($stmt->execute()) {
            error_log("Payment saved: $external_reference -> $checkout_request_id");
            http_response_code(200);
            echo json_encode(['success' => true, 'message' => 'Payment initiated', 'data' => [
                'external_reference' => $external_reference,
                'CheckoutRequestID' => $checkout_request_id,
                'amount' => $amount,
                'phone' => $phone_number
            ]]);
        } else {
            error_log("Database Error: Failed to save payment details: " . $stmt->error);
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to save payment']);
        }

        $stmt->close();
        $conn->close();

    } else {
        http_response_code(400);
        echo json_encode($response);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>
    $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    $error = curl_error($curl);
    curl_close($curl);
    
    error_log("PayHero Response HTTP Code: $httpCode");
    error_log("PayHero Response: $response");

    if ($error) {
        error_log("cURL Error: $error");
        return ['success' => false, 'message' => "cURL Error: $error"];
    }

    $decodedResponse = json_decode($response, true);
    
    if ($httpCode != 200 && $httpCode != 201) {
        return ['success' => false, 'message' => "HTTP Error: $httpCode", 'response' => $decodedResponse];
    }
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        return ['success' => false, 'message' => 'Invalid JSON response', 'response' => $response];
    }

    return ['success' => true, 'data' => $decodedResponse];
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');
    
    error_log("=== Deposit Request Started ===");
    error_log("POST data: " . print_r($_POST, true));
    
    // Basic validation
    if (!isset($_POST['amount']) || !isset($_POST['phone_number'])) {
        error_log("Missing required fields");
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Amount and phone number are required.']);
        exit;
    }

    $amount = $_POST['amount'];
    $phone_number = $_POST['phone_number'];
    $channel_id = PAYHERO_ACCOUNT;
    $external_reference = 'INV-' . time();

    error_log("Processing deposit - Amount: $amount, Phone: $phone_number");

    $response = initiatePayment($amount, $phone_number, $channel_id, $external_reference);

    if ($response['success']) {
        // Check if response has the expected fields
        if (!isset($response['data']) || !is_array($response['data'])) {
            error_log("Invalid response structure: " . json_encode($response['data']));
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid response from payment provider']);
            exit;
        }
        
        // Try different field names for checkout request ID
        $checkout_request_id = $response['data']['CheckoutRequestID'] ?? 
                               $response['data']['checkout_request_id'] ?? 
                               $response['data']['request_id'] ?? 
                               $response['data']['id'] ?? 
                               'CHK-' . $external_reference;
        
        error_log("Checkout Request ID: $checkout_request_id");

        $db = new Database();
        $conn = $db->getConnection();

        if (!$conn) {
            error_log("Database connection failed: " . $db->getError());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Database connection failed']);
            exit;
        }

        $sql = "INSERT INTO payments (amount, phone_number, external_reference, checkout_request_id, status) VALUES (?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($sql);

        if ($stmt === false) {
            error_log("Database Error: Failed to prepare statement: " . $conn->error);
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to prepare database statement.']);
            exit;
        }
        
        $status = 'PENDING';
        $stmt->bind_param('dssss', $amount, $phone_number, $external_reference, $checkout_request_id, $status);

        if ($stmt->execute()) {
            error_log("Payment record saved successfully");
            http_response_code(200);
            echo json_encode(['success' => true, 'message' => 'Payment initiated', 'data' => [
                'external_reference' => $external_reference,
                'CheckoutRequestID' => $checkout_request_id,
                'amount' => $amount,
                'phone_number' => $phone_number
            ]]);
        } else {
            error_log("Database Error: Failed to save payment details: " . $stmt->error);
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to save payment details']);
        }

        $stmt->close();
        $conn->close();

    } else {
        error_log("PayHero API Error: " . json_encode($response));
        http_response_code(400);
        echo json_encode($response);
    }
    exit;
}
?>