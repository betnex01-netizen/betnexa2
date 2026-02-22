<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'POST request required']);
    exit;
}

try {
    // Get POST data
    $amount = isset($_POST['amount']) ? floatval($_POST['amount']) : null;
    $phone_number = isset($_POST['phone_number']) ? $_POST['phone_number'] : null;
    
    if (!$amount || !$phone_number) {
        throw new Exception('Amount and phone number are required');
    }
    
    if ($amount < 1) {
        throw new Exception('Minimum amount is KES 1');
    }

    // Normalize phone number
    $phone_number = preg_replace('/[\s\-\(\)]/i', '', $phone_number);
    if (preg_match('/^0[167]/', $phone_number)) {
        $phone_number = '254' . substr($phone_number, 1);
    } elseif (!preg_match('/^254/', $phone_number)) {
        $phone_number = '254' . $phone_number;
    }

    // PayHero API credentials (inline to avoid dependency issues)
    $api_username = 'alcdq71nbJdHopku2ecC';
    $api_password = '5zg65ec2j2kKTfMxinRH9GGy7rvrRslvP74cYRwM';
    $account_id = 3953;
    
    // Create Basic Auth header
    $basicAuth = 'Basic ' . base64_encode($api_username . ':' . $api_password);
    
    // Generate reference
    $external_reference = 'INV-' . time() . '-' . rand(1000, 9999);
    
    // Prepare payload for PayHero
    $payload = json_encode([
        'amount' => $amount,
        'phone_number' => $phone_number,
        'channel_id' => $account_id,
        'provider' => 'm-pesa',
        'external_reference' => $external_reference,
        'callback_url' => 'https://betnexa.co.ke/pay/callback.php'
    ]);

    // Call PayHero API via cURL
    $ch = curl_init('https://backend.payhero.co.ke/api/v2/payments');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: ' . $basicAuth
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    // Check for cURL errors
    if ($curlError) {
        throw new Exception('API Connection Error: ' . $curlError);
    }

    // Decode response
    $responseData = json_decode($response, true);
    
    // Check HTTP response code
    if ($httpCode !== 200 && $httpCode !== 201) {
        $errorMsg = $responseData['message'] ?? $responseData['error'] ?? 'Unknown error';
        throw new Exception('PayHero API Error (HTTP ' . $httpCode . '): ' . $errorMsg);
    }

    // Check if we got a valid response
    if (!$responseData) {
        throw new Exception('Invalid response from PayHero: ' . substr($response, 0, 200));
    }

    // Try to save to database if available
    $db_saved = false;
    try {
        $conn = @new mysqli('localhost', 'metrogai_joel', 'Mwangi@12345!', 'metrogai_metrogain');
        
        if (!$conn->connect_error && isset($responseData['CheckoutRequestID'])) {
            $stmt = $conn->prepare('INSERT INTO payments (amount, phone_number, external_reference, checkout_request_id, status) VALUES (?, ?, ?, ?, ?)');
            if ($stmt) {
                $status = 'PENDING';
                $checkout_id = $responseData['CheckoutRequestID'];
                $stmt->bind_param('dssss', $amount, $phone_number, $external_reference, $checkout_id, $status);
                $db_saved = $stmt->execute();
                $stmt->close();
            }
            $conn->close();
        }
    } catch (Exception $e) {
        // Database error is non-critical, continue
    }

    // Success response
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Payment initiated successfully',
        'data' => [
            'external_reference' => $external_reference,
            'CheckoutRequestID' => $responseData['CheckoutRequestID'] ?? 'pending',
            'amount' => $amount,
            'phone_number' => $phone_number
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
