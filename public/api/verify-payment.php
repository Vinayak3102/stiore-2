<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Only POST supported.']);
    exit;
}

$raw = file_get_contents('php://input');
$body = json_decode($raw, true);

$orderId = $body['order_id'] ?? $body['razorpay_order_id'] ?? '';
$paymentId = $body['payment_id'] ?? $body['razorpay_payment_id'] ?? '';
$signature = $body['signature'] ?? $body['razorpay_signature'] ?? '';

if (empty($orderId) || empty($paymentId) || empty($signature)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Missing required fields: order_id, payment_id, and signature are required'
    ]);
    exit;
}

$keySecret = getenv('RAZORPAY_KEY_SECRET') ?: 'xtHw6RptWJzvEYac0lWXQymQ';

// Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
$expectedSignature = hash_hmac('sha256', $orderId . '|' . $paymentId, $keySecret);

if (hash_equals($expectedSignature, $signature)) {
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Payment verified successfully',
        'order_id' => $orderId,
        'payment_id' => $paymentId
    ]);
} else {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Payment verification failed: Invalid signature'
    ]);
}
