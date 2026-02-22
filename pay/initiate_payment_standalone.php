<?php
header('Content-Type: application/json');

// Standalone initiate payment - no dependencies
try {
    error_log("=== Deposit Request Started ===");
    error_log("POST data: " . print_r($_POST, true));
    
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('POST request required');
    }
    
    if (!isset($_POST['amount']) || !isset($_POST['phone_number'])) {
        throw new Exception('Amount and phone number are required');
    }

    $amount = floatval($_POST['amount']);
    $phone_number = $_POST['phone_number'];
    
    if ($amount < 1) {
        throw new Exception('Minimum amount is 1');
    }

    // Normalize phone number
    $phone_number = preg_replace('/[\s\-\(\)]/i', '', $phone_number);
    if (preg_match('/^0[167]/', $phone_number)) {
        $phone_number = '254' . substr($phone_number, 1);
    } elseif (!preg_match('/^254/', $phone_number)) {
        $phone_number = '254' . $phone_number;
    }

    error_log("Processing deposit - Amount: $amount, Phone: $phone_number");

    // PayHero credentials
    $api_key = 'alcdq71nbJdHopku2ecC';
    $api_secret = '5zg65ec2j2kKTfMxinRH9GGy7rvrRslvP74cYRwM';
    $account_id = 3953;
    
    // Create Basic Auth token
    $credentials = $api_key . ':' . $api_secret;
    $basicAuthToken = 'Basic ' . base64_encode($credentials);
    
    $external_reference = 'INV-' . time();
    $channel_id = $account_id;
    
    // Prepare payload
    $payload = [
        "amount" => $amount,
        "phone_number" => $phone_number,
        "channel_id" => $channel_id,
        "provider" => "m-pesa",
        "external_reference" => $external_reference,
        "callback_url" => "https://betnexa.co.ke/pay/callback.php"
    ];
    
    error_log("PayHero Request Payload: " . json_encode($payload));
    
    // Call PayHero API
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://backend.payhero.co.ke/api/v2/payments');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: ' . $basicAuthToken
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    error_log("PayHero Response HTTP Code: $httpCode");
    error_log("PayHero Response: $response");
    
    if ($curlError) {
        throw new Exception("cURL Error: $curlError");
    }
    
    $decodedResponse = json_decode($response, true);
    
    if ($httpCode != 200 && $httpCode != 201) {
        throw new Exception("PayHero API Error: HTTP $httpCode - " . ($decodedResponse['message'] ?? $response));
    }
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON response from PayHero');
    }
    
    if (!isset($decodedResponse['CheckoutRequestID'])) {
        throw new Exception('No CheckoutRequestID in response: ' . json_encode($decodedResponse));
    }
    
    $checkout_request_id = $decodedResponse['CheckoutRequestID'];
    
    // Try to save to database (if available)
    try {
        $conn = new mysqli('localhost', 'metrogai_joel', 'Mwangi@12345!', 'metrogai_metrogain');
        
        if ($conn->connect_error) {
            error_log("Database warning: " . $conn->connect_error . " - proceeding without database save");
        } else {
            $sql = "INSERT INTO payments (amount, phone_number, external_reference, checkout_request_id, status) VALUES (?, ?, ?, ?, ?)";
            $stmt = $conn->prepare($sql);
            
            if ($stmt) {
                $status = 'PENDING';
                $stmt->bind_param('dssss', $amount, $phone_number, $external_reference, $checkout_request_id, $status);
                
                if ($stmt->execute()) {
                    error_log("Payment record saved to database");
                } else {
                    error_log("Database insert failed: " . $stmt->error);
                }
                $stmt->close();
            }
            $conn->close();
        }
    } catch (Exception $dbError) {
        error_log("Database error (non-critical): " . $dbError->getMessage());
        // Continue anyway - payment was initiated
    }
    
    // Success response
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Payment initiated successfully',
        'data' => [
            'external_reference' => $external_reference,
            'CheckoutRequestID' => $checkout_request_id,
            'amount' => $amount,
            'phone_number' => $phone_number
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
