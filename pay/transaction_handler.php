<?php
// transaction_handler.php

function handleTransactionRecord($conn, $transactionData) {
    $sql = "INSERT INTO transactions 
            (user_id, amount, type, status, mpesa_code, external_id, transaction_code, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())";

    $stmt = $conn->prepare($sql);

    if ($stmt === false) {
        throw new Exception("Failed to prepare statement for transactions: " . $conn->error);
    }

    $stmt->bind_param(
        'idsssss',
        $transactionData['user_id'],
        $transactionData['amount'],
        $transactionData['type'],
        $transactionData['status'],
        $transactionData['mpesa_code'],
        $transactionData['external_id'],
        $transactionData['transaction_code']
    );

    if (!$stmt->execute()) {
        throw new Exception("Failed to insert into transactions table: " . $stmt->error);
    }

    $stmt->close();
}
?>
