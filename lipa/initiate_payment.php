<?php
// initiate_payment.php
require_once 'config.php';
require_once 'database.php';
require_once 'token_generator.php';

function initiatePayment($amount, $phone_number, $channel_id, $external_reference) {
    $basicAuthToken = trim(generateBasicAuthToken());

    $curl = curl_init();
    curl_setopt_array($curl, array(
        CURLOPT_URL => 'https://backend.payhero.co.ke/api/v2/payments',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_ENCODING => '',
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => 'POST',
        CURLOPT_POSTFIELDS => json_encode([
            "amount" => floatval($amount),
            "phone_number" => $phone_number,
            "channel_id" => $channel_id,
            "provider" => "m-pesa",
            "external_reference" => $external_reference,
            // CORRECT THIS TO YOUR ACTUAL CALLBACK URL
            "callback_url" => "https://metrogain.co.ke/lipa/callback.php" 
        ]),
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
    // Basic validation
    if (!isset($_POST['amount']) || !isset($_POST['phone_number'])) {
        echo json_encode(['success' => false, 'message' => 'Amount and phone number are required.']);
        exit;
    }

    $amount = $_POST['amount'];
    $phone_number = $_POST['phone_number'];
    $channel_id = PAYHERO_ACCOUNT;
    $external_reference = 'INV-' . time();

    $response = initiatePayment($amount, $phone_number, $channel_id, $external_reference);

    if ($response['success']) {
        $checkout_request_id = $response['data']['CheckoutRequestID'];

        $db = new Database();
        $conn = $db->getConnection();

        $sql = "INSERT INTO payments (amount, phone_number, external_reference, checkout_request_id, status) VALUES (?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($sql);

        if ($stmt === false) {
            error_log("Database Error: Failed to prepare statement: " . $conn->error);
            echo json_encode(['success' => false, 'message' => 'Failed to prepare database statement.']);
            exit;
        }
        
        $status = 'PENDING';
        $stmt->bind_param('dssss', $amount, $phone_number, $external_reference, $checkout_request_id, $status);

        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Payment initiated', 'data' => [
                'external_reference' => $external_reference,
                'CheckoutRequestID' => $checkout_request_id
            ]]);
        } else {
            error_log("Database Error: Failed to save payment details: " . $stmt->error);
            echo json_encode(['success' => false, 'message' => 'Failed to save payment details']);
        }

        $stmt->close();
        $conn->close();

    } else {
        echo json_encode($response);
    }
}
?>