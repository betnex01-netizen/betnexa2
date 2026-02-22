<?php
// test_api.php - Debug script to test PayHero API connection

require_once 'config.php';
require_once 'token_generator.php';

echo "=== PayHero API Testing ===\n\n";

// Display credentials (masked)
echo "API Configuration:\n";
echo "- Account ID: " . PAYHERO_ACCOUNT . "\n";
echo "- API Key: " . substr(PAYHERO_API_KEY, 0, 5) . "***\n";
echo "- Auth Token: " . substr(generateBasicAuthToken(), 0, 15) . "***\n\n";

// Test parameters
$test_amount = 100;
$test_phone = '254722123456';  // Example phone
$external_ref = 'TEST-' . time();
$channel_id = PAYHERO_ACCOUNT;

echo "Test Parameters:\n";
echo "- Amount: $test_amount\n";
echo "- Phone: $test_phone\n";
echo "- External Reference: $external_ref\n";
echo "- Channel ID: $channel_id\n\n";

// Build payload
$payload = [
    "amount" => floatval($test_amount),
    "phone_number" => $test_phone,
    "channel_id" => $channel_id,
    "provider" => "m-pesa",
    "external_reference" => $external_ref,
    "callback_url" => "https://betnexa.co.ke/pay/callback.php"
];

echo "Request Payload:\n";
echo json_encode($payload, JSON_PRETTY_PRINT) . "\n\n";

// Make the request
$basicAuthToken = trim(generateBasicAuthToken());

echo "Sending request to PayHero API...\n";
echo "Endpoint: https://backend.payhero.co.ke/api/v2/payments\n";
echo "Auth Header: " . substr($basicAuthToken, 0, 20) . "***\n\n";

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
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_HTTPHEADER => array(
        'Content-Type: application/json',
        'Authorization: ' . $basicAuthToken
    ),
    CURLOPT_VERBOSE => true,
));

$response = curl_exec($curl);
$httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
$curlError = curl_error($curl);
$curlInfo = curl_getinfo($curl);

curl_close($curl);

echo "=== Response ===\n\n";
echo "HTTP Status Code: $httpCode\n";

if ($curlError) {
    echo "cURL Error: $curlError\n";
} else {
    echo "cURL Success\n";
}

echo "\nResponse Body:\n";
echo $response . "\n\n";

echo "Decoded Response:\n";
$decodedResponse = json_decode($response, true);
if ($decodedResponse) {
    echo json_encode($decodedResponse, JSON_PRETTY_PRINT) . "\n";
} else {
    echo "Failed to decode JSON\n";
}

echo "\n=== Request Details ===\n";
echo "Request Time: " . date('Y-m-d H:i:s') . "\n";
echo "Request URL: " . $curlInfo['url'] . "\n";
echo "Request Duration: " . round($curlInfo['total_time'], 2) . "s\n";
?>
