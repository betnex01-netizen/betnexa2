<?php
// simple_test.php - Simple endpoint to test if PHP is working

header('Content-Type: application/json');

error_log("Received request method: " . $_SERVER['REQUEST_METHOD']);
error_log("POST data: " . print_r($_POST, true));

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    echo json_encode([
        'success' => true,
        'message' => 'PHP is working!',
        'received' => $_POST,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'POST request required',
        'method' => $_SERVER['REQUEST_METHOD']
    ]);
}
?>
