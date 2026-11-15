<?php
require_once __DIR__ . '/config.php';
shivamrit_send_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$body = json_decode((string)file_get_contents('php://input'), true);
$orderId = strtoupper(trim((string)($body['orderId'] ?? '')));
$contact = trim((string)($body['contact'] ?? ''));
$action = strtolower(trim((string)($body['action'] ?? '')));
$reason = trim((string)($body['reason'] ?? ''));

if ($orderId === '' || $contact === '' || !in_array($action, ['cancel', 'return'], true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Valid Order ID, contact, and action (cancel/return) are required.']);
    exit;
}

$orders = shivamrit_read_json_store('orders.json', []);
$matchedKey = null;
$found = null;

if (isset($orders[$orderId]) && is_array($orders[$orderId])) {
    $matchedKey = $orderId;
    $found = $orders[$orderId];
} else {
    foreach ($orders as $k => $ord) {
        if (strtoupper((string)$k) === $orderId && is_array($ord)) {
            $matchedKey = (string)$k;
            $found = $ord;
            break;
        }
    }
}

if (!is_array($found) || $matchedKey === null) {
    http_response_code(404);
    echo json_encode(['error' => 'Order verification failed. Enter matching Order ID and registered phone/email.']);
    exit;
}

$normContactEmail = strtolower($contact);
$normContactDigits = substr(preg_replace('/\D/', '', $contact), -10);
$orderEmail = strtolower(trim((string)($found['customerEmail'] ?? '')));
$orderDigits = substr(preg_replace('/\D/', '', (string)($found['customerPhone'] ?? '')), -10);

$emailMatches = $normContactEmail !== '' && $orderEmail !== '' && $normContactEmail === $orderEmail;
$phoneMatches = strlen($normContactDigits) === 10 && $normContactDigits === $orderDigits;

if (!$emailMatches && !$phoneMatches) {
    http_response_code(404);
    echo json_encode(['error' => 'Order verification failed. Enter matching Order ID and registered phone/email.']);
    exit;
}

$status = strtolower((string)($found['fulfillmentStatus'] ?? 'processing'));
if ($action === 'cancel' && !in_array($status, ['pending_payment', 'processing', 'packed'], true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Cannot cancel order once it has been dispatched or delivered.']);
    exit;
}
if ($action === 'return' && $status !== 'delivered') {
    http_response_code(400);
    echo json_encode(['error' => 'Return or refund requests can only be submitted after delivery.']);
    exit;
}

$cleanReason = substr($reason !== '' ? $reason : ($action === 'cancel' ? 'Customer requested cancellation' : 'Customer requested return/refund'), 0, 300);

if ($action === 'cancel') {
    $found['fulfillmentStatus'] = 'cancelled';
    if (($found['paymentStatus'] ?? '') === 'paid') {
        $found['paymentStatus'] = 'refunded';
    }
    if (!empty($found['stockDeducted']) && !empty($found['items']) && is_array($found['items'])) {
        $stockState = shivamrit_read_json_store('inventory.json', []);
        foreach ($found['items'] as $line) {
            $pid = (string)($line['productId'] ?? '');
            $qty = max(0, intval($line['qty'] ?? 0));
            if ($pid !== '' && isset($stockState[$pid])) {
                $stockState[$pid] = intval($stockState[$pid]) + $qty;
            }
        }
        shivamrit_write_json_store('inventory.json', $stockState);
        $found['stockDeducted'] = false;
    }
    $found['customerNote'] = 'Cancelled: ' . $cleanReason;
} else {
    $found['fulfillmentStatus'] = 'returned';
    $found['customerNote'] = 'Return/Refund requested: ' . $cleanReason;
}

$found['updatedAt'] = gmdate('c');
$orders[$matchedKey] = $found;
shivamrit_write_json_store('orders.json', $orders);

echo json_encode([
    'success' => true,
    'order' => [
        'orderId' => $found['orderId'],
        'customerName' => $found['customerName'] ?? '',
        'shippingCity' => $found['shippingCity'] ?? '',
        'shippingPincode' => $found['shippingPincode'] ?? '',
        'items' => $found['items'] ?? [],
        'subtotal' => $found['subtotal'] ?? 0,
        'discountAmount' => $found['discountAmount'] ?? 0,
        'shippingFee' => $found['shippingFee'] ?? 0,
        'grandTotal' => $found['grandTotal'] ?? 0,
        'paymentMethod' => $found['paymentMethod'] ?? 'cod',
        'paymentStatus' => $found['paymentStatus'] ?? 'cod_pending',
        'fulfillmentStatus' => $found['fulfillmentStatus'] ?? 'processing',
        'trackingNumber' => $found['trackingNumber'] ?? '',
        'courierName' => $found['courierName'] ?? '',
        'customerNote' => $found['customerNote'] ?? '',
        'createdAt' => $found['createdAt'] ?? '',
        'updatedAt' => $found['updatedAt'] ?? '',
    ],
], JSON_UNESCAPED_UNICODE);
