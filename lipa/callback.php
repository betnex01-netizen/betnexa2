<?php
require_once 'config.php';
require_once 'database.php';
require_once 'transaction_handler.php';

$callbackData = json_decode(file_get_contents('php://input'), true);
error_log("PayHero Callback Received: " . print_r($callbackData, true));

$response = [];
if ($callbackData) {
    if (isset($callbackData['CheckoutRequestID'])) {
        $response = $callbackData;
    } elseif (isset($callbackData['response'])) {
        $response = $callbackData['response'];
    }
}

$db = new Database();
$conn = $db->getConnection();

if (!$conn) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed']);
    exit();
}

$conn->begin_transaction();

try {
    if (!empty($response) && isset($response['CheckoutRequestID'])) {
        $updatePaymentSql = "UPDATE payments SET status = ?, mpesa_receipt_number = ?, result_code = ?, result_desc = ? WHERE checkout_request_id = ?";
        $updatePaymentStmt = $conn->prepare($updatePaymentSql);
        if ($updatePaymentStmt === false) {
            throw new Exception("Failed to prepare statement for payments: " . $conn->error);
        }
        $updatePaymentStmt->bind_param(
            'sssss',
            $response['Status'],
            $response['MpesaReceiptNumber'],
            $response['ResultCode'],
            $response['ResultDesc'],
            $response['CheckoutRequestID']
        );
        if (!$updatePaymentStmt->execute()) {
            throw new Exception("Failed to update payments table: " . $updatePaymentStmt->error);
        }
        $updatePaymentStmt->close();

        $getPaymentSql = "SELECT user_id, amount FROM payments WHERE checkout_request_id = ?";
        $getPaymentStmt = $conn->prepare($getPaymentSql);
        $getPaymentStmt->bind_param('s', $response['CheckoutRequestID']);
        $getPaymentStmt->execute();
        $result = $getPaymentStmt->get_result();

        if ($result->num_rows > 0) {
            $paymentRow = $result->fetch_assoc();
            $userId = $paymentRow['user_id'];
            $amount = $paymentRow['amount'];

            $transactionData = [
                'user_id' => $userId,
                'amount' => $amount,
                'type' => 'deposit',
                'status' => $response['Status'],
                'mpesa_code' => $response['MpesaReceiptNumber'],
                'external_id' => $response['CheckoutRequestID'],
                'transaction_code' => $response['MpesaReceiptNumber']
            ];
            handleTransactionRecord($conn, $transactionData);

            if ($response['Status'] === 'Success' && $response['ResultCode'] == 0) {
                $floatAmount = (float)$amount;

                $sql_activate = "UPDATE users SET is_withdrawal_activated = 1 WHERE id = ?";
                $stmt_activate = $conn->prepare($sql_activate);
                if ($stmt_activate === false) {
                    throw new Exception("Failed to prepare activation statement: " . $conn->error);
                }
                $stmt_activate->bind_param('i', $userId);
                if (!$stmt_activate->execute()) {
                    throw new Exception("Failed to update user activation status: " . $stmt_activate->error);
                }
                $stmt_activate->close();

                if ($floatAmount !== 400.00) {
                    $updateUserSql = "UPDATE users SET account_balance = account_balance + ? WHERE id = ?";
                    $updateUserStmt = $conn->prepare($updateUserSql);
                    if ($updateUserStmt === false) {
                        throw new Exception("Failed to prepare user balance update statement: " . $conn->error);
                    }
                    $updateUserStmt->bind_param('di', $floatAmount, $userId);
                    if (!$updateUserStmt->execute()) {
                        throw new Exception("Failed to update user account balance: " . $updateUserStmt->error);
                    }
                    $updateUserStmt->close();
                } else {
                    error_log("INFO: KES 400 Activation Fee processed for user $userId. Account activated but balance NOT credited.");
                }
            }

            error_log("Deposit transaction successful: Tables updated.");
        } else {
            throw new Exception("No payment record found for CheckoutRequestID: " . $response['CheckoutRequestID']);
        }
        $getPaymentStmt->close();

    } elseif (isset($callbackData['transaction_reference'])) {
        $external_reference = $callbackData['external_reference'];
        $status = $callbackData['status'];
        $transaction_reference = $callbackData['transaction_reference'];

        $updateWithdrawalSql = "UPDATE withdrawals1 SET status = ?, transaction_reference = ? WHERE external_reference = ?";
        $updateWithdrawalStmt = $conn->prepare($updateWithdrawalSql);
        if ($updateWithdrawalStmt === false) {
            throw new Exception("Failed to prepare withdrawal statement: " . $conn->error);
        }
        $updateWithdrawalStmt->bind_param('sss', $status, $transaction_reference, $external_reference);
        if (!$updateWithdrawalStmt->execute()) {
            throw new Exception("Failed to update withdrawals1 table: " . $updateWithdrawalStmt->error);
        }
        $updateWithdrawalStmt->close();

        $getWithdrawalSql = "SELECT user_id, amount FROM withdrawals1 WHERE external_reference = ?";
        $getWithdrawalStmt = $conn->prepare($getWithdrawalSql);
        $getWithdrawalStmt->bind_param('s', $external_reference);
        $getWithdrawalStmt->execute();
        $result = $getWithdrawalStmt->get_result();

        if ($result->num_rows > 0) {
            $withdrawalRow = $result->fetch_assoc();
            $userId = $withdrawalRow['user_id'];
            $amount = $withdrawalRow['amount'];

            $transactionData = [
                'user_id' => $userId,
                'amount' => $amount,
                'type' => 'withdrawal',
                'status' => $status,
                'mpesa_code' => '',
                'external_id' => $external_reference,
                'transaction_code' => $transaction_reference
            ];
            handleTransactionRecord($conn, $transactionData);

            if ($status === 'SUCCESS') {
                $updateUserSql = "UPDATE users SET account_balance = account_balance - ? WHERE id = ?";
                $updateUserStmt = $conn->prepare($updateUserSql);
                if ($updateUserStmt === false) {
                    throw new Exception("Failed to prepare user update statement for withdrawal: " . $conn->error);
                }
                $updateUserStmt->bind_param('di', $amount, $userId);
                if (!$updateUserStmt->execute()) {
                    throw new Exception("Failed to update user account balance for withdrawal: " . $updateUserStmt->error);
                }
                $updateUserStmt->close();
            }

            error_log("Withdrawal transaction successful: Tables updated.");
        } else {
            throw new Exception("No withdrawal record found for external_reference: " . $external_reference);
        }
        $getWithdrawalStmt->close();

    } else {
        throw new Exception("Invalid callback data or missing transaction identifiers.");
    }

    $conn->commit();
    http_response_code(200);
    echo json_encode(['status' => 'success', 'message' => 'Transaction details updated successfully']);

} catch (Exception $e) {
    $conn->rollback();
    error_log("Transaction failed: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Transaction failed: ' . $e->getMessage()]);
} finally {
    $conn->close();
}
?>
