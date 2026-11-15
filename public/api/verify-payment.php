<?php
require_once __DIR__ . '/config.php';
shivamrit_send_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Only POST supported.']);
    exit;
}

$keySecret = shivamrit_env('RAZORPAY_KEY_SECRET');
if ($keySecret === '') {
    http_response_code(503);
    echo json_encode(['success' => false, 'error' => 'Server configuration error: RAZORPAY_KEY_SECRET is not configured']);
    exit;
}

$raw = file_get_contents('php://input');
$body = json_decode((string)$raw, true);

$orderId = (string)($body['order_id'] ?? $body['razorpay_order_id'] ?? '');
$paymentId = (string)($body['payment_id'] ?? $body['razorpay_payment_id'] ?? '');
$signature = (string)($body['signature'] ?? $body['razorpay_signature'] ?? '');

if ($orderId === '' || $paymentId === '' || $signature === '') {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Missing required fields: order_id, payment_id, and signature are required',
    ]);
    exit;
}

$expectedSignature = hash_hmac('sha256', $orderId . '|' . $paymentId, $keySecret);

if (hash_equals($expectedSignature, $signature)) {
    // Idempotently update local PHP order ledger if present
    $ordersFile = __DIR__ . '/storage/orders.json';
    $storeOrderId = $orderId;
    if (is_file($ordersFile)) {
        $orders = json_decode((string)file_get_contents($ordersFile), true);
        if (is_array($orders)) {
            foreach ($orders as $id => $ord) {
                if (($ord['razorpayOrderId'] ?? '') === $orderId) {
                    $storeOrderId = (string)$id;
                    if (($ord['paymentStatus'] ?? '') !== 'paid') {
                        $orders[$id]['paymentStatus'] = 'paid';
                        $orders[$id]['fulfillmentStatus'] = 'processing';
                        $orders[$id]['razorpayPaymentId'] = $paymentId;
                        $orders[$id]['updatedAt'] = gmdate('c');
                        file_put_contents($ordersFile, json_encode($orders, JSON_PRETTY_PRINT), LOCK_EX);
                    }
                    break;
                }
            }
        }
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Payment verified successfully',
        'store_order_id' => $storeOrderId,
        'order_id' => $orderId,
        'payment_id' => $paymentId,
    ]);
} else {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Payment verification failed: Invalid signature',
    ]);
}
