<?php
require_once 'config.php';
require_once 'database.php';

// Assuming your Database class is a MySQLi connection
$db = new Database();
$conn = $db->getConnection(); // Get the actual MySQLi connection object

if (!$conn) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit();
}

$external_reference = $_GET['external_reference'];

// 1. Prepare the SQL statement with a placeholder (?)
$sql = "SELECT * FROM payments WHERE external_reference = ?";
$stmt = $conn->prepare($sql);

if ($stmt === false) {
    echo json_encode(['success' => false, 'message' => 'Failed to prepare statement: ' . $conn->error]);
    exit();
}

// 2. Bind the parameter to the placeholder
// 's' indicates the parameter is a string
$stmt->bind_param('s', $external_reference);

// 3. Execute the statement
$stmt->execute();

// 4. Get the result
$result = $stmt->get_result();

if ($result && $result->num_rows > 0) {
    $payment = $result->fetch_assoc();
    echo json_encode(['success' => true, 'payment' => $payment]);
} else {
    echo json_encode(['success' => false, 'message' => 'Payment not found']);
}

// 5. Close the statement and connection
$stmt->close();
$conn->close();
?>