<?php
require_once __DIR__ . '/config.php';
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$webhookSecret = shivamrit_env('RAZORPAY_WEBHOOK_SECRET');
if ($webhookSecret === '') {
    http_response_code(503);
    echo json_encode(['error' => 'Webhook secret not configured']);
    exit;
}

$rawBody = (string)file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_RAZORPAY_SIGNATURE'] ?? '';

$expectedSignature = hash_hmac('sha256', $rawBody, $webhookSecret);
if (!is_string($signature) || !hash_equals($expectedSignature, $signature)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid webhook signature']);
    exit;
}

$event = json_decode($rawBody, true);
$eventType = $event['event'] ?? '';
$paymentEntity = $event['payload']['payment']['entity'] ?? [];
$rzpOrderId = $paymentEntity['order_id'] ?? '';
$rzpPaymentId = $paymentEntity['id'] ?? '';

$ordersFile = __DIR__ . '/storage/orders.json';
if ($rzpOrderId !== '' && is_file($ordersFile)) {
    $orders = json_decode((string)file_get_contents($ordersFile), true);
    if (is_array($orders)) {
        foreach ($orders as $id => $ord) {
            if (($ord['razorpayOrderId'] ?? '') === $rzpOrderId) {
                if ($eventType === 'payment.captured' && ($ord['paymentStatus'] ?? '') !== 'paid') {
                    $orders[$id]['paymentStatus'] = 'paid';
                    $orders[$id]['fulfillmentStatus'] = 'processing';
                    $orders[$id]['razorpayPaymentId'] = $rzpPaymentId;
                    $orders[$id]['updatedAt'] = gmdate('c');
                } elseif ($eventType === 'payment.failed' && ($ord['paymentStatus'] ?? '') === 'pending') {
                    $orders[$id]['paymentStatus'] = 'failed';
                    $orders[$id]['updatedAt'] = gmdate('c');
                }
                file_put_contents($ordersFile, json_encode($orders, JSON_PRETTY_PRINT), LOCK_EX);
                break;
            }
        }
    }
}

http_response_code(200);
echo json_encode(['received' => true]);
