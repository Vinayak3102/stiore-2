<?php
require_once __DIR__ . '/config.php';
shivamrit_send_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$orderId = strtoupper(trim((string)($_GET['orderId'] ?? '')));
$contact = trim((string)($_GET['contact'] ?? ''));

if ($orderId === '' || $contact === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Please provide both Order ID and your registered mobile number or email.']);
    exit;
}

$orders = shivamrit_read_json_store('orders.json', []);
$found = $orders[$orderId] ?? null;

if (!is_array($found)) {
    foreach ($orders as $k => $ord) {
        if (strtoupper((string)$k) === $orderId) {
            $found = $ord;
            break;
        }
    }
}

if (!is_array($found)) {
    http_response_code(404);
    echo json_encode(['error' => 'No matching order found. Please verify your Order ID and mobile number/email.']);
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
    echo json_encode(['error' => 'No matching order found. Please verify your Order ID and mobile number/email.']);
    exit;
}

echo json_encode([
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
        'createdAt' => $found['createdAt'] ?? '',
        'updatedAt' => $found['updatedAt'] ?? '',
    ],
], JSON_UNESCAPED_UNICODE);
