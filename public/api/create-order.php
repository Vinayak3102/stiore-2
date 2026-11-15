<?php
require_once __DIR__ . '/config.php';
shivamrit_send_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Only POST supported.']);
    exit;
}

$keyId = shivamrit_env('RAZORPAY_KEY_ID');
$keySecret = shivamrit_env('RAZORPAY_KEY_SECRET');
if ($keyId === '' || $keySecret === '') {
    http_response_code(503);
    echo json_encode(['error' => 'Razorpay gateway is not configured on the server.']);
    exit;
}

$raw = file_get_contents('php://input');
$body = json_decode((string)$raw, true);
if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON request body']);
    exit;
}

$requestedItems = is_array($body['items'] ?? null) ? $body['items'] : [];
$couponCode = (string)($body['couponCode'] ?? '');
$calc = shivamrit_calculate_order($requestedItems, $couponCode);

if (!$calc['valid']) {
    http_response_code(400);
    echo json_encode(['error' => $calc['error'] ?? 'Invalid order items']);
    exit;
}

$amountInPaise = intval($calc['grandTotal']) * 100;
$currency = 'INR';
$storeOrderId = 'SH-' . time() . '-' . random_int(100, 999);
$receipt = 'sh_rcpt_' . time();

$payload = json_encode([
    'amount' => $amountInPaise,
    'currency' => $currency,
    'receipt' => $receipt,
    'notes' => [
        'store' => 'ShivAmrit Healers',
        'store_order_id' => $storeOrderId,
    ],
]);

$ch = curl_init('https://api.razorpay.com/v1/orders');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_USERPWD, $keyId . ':' . $keySecret);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Content-Length: ' . strlen((string)$payload),
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(500);
    echo json_encode(['error' => 'Payment gateway connection error: ' . $curlError]);
    exit;
}

$data = json_decode((string)$response, true);
if ($httpCode >= 200 && $httpCode < 300 && isset($data['id'])) {
    $customer = is_array($body['customer'] ?? null) ? $body['customer'] : [];
    $shipping = is_array($body['shippingAddress'] ?? null) ? $body['shippingAddress'] : [];

    shivamrit_save_order_record([
        'orderId' => $storeOrderId,
        'customerName' => trim((string)($customer['name'] ?? '')),
        'customerPhone' => trim((string)($customer['phone'] ?? '')),
        'customerEmail' => trim((string)($customer['email'] ?? '')),
        'shippingStreet' => trim((string)($shipping['street'] ?? '')),
        'shippingCity' => trim((string)($shipping['city'] ?? '')),
        'shippingPincode' => trim((string)($shipping['pincode'] ?? '')),
        'items' => $calc['items'],
        'subtotal' => $calc['subtotal'],
        'discountAmount' => $calc['discountAmount'],
        'couponCode' => $calc['couponCode'],
        'shippingFee' => $calc['shippingFee'],
        'grandTotal' => $calc['grandTotal'],
        'paymentMethod' => 'razorpay',
        'paymentStatus' => 'pending',
        'fulfillmentStatus' => 'pending_payment',
        'razorpayOrderId' => $data['id'],
        'razorpayPaymentId' => '',
        'createdAt' => gmdate('c'),
        'updatedAt' => gmdate('c'),
    ]);

    http_response_code(200);
    echo json_encode([
        'store_order_id' => $storeOrderId,
        'order_id' => $data['id'],
        'amount' => $data['amount'],
        'currency' => $data['currency'],
        'totals' => [
            'subtotal' => $calc['subtotal'],
            'discountAmount' => $calc['discountAmount'],
            'shippingFee' => $calc['shippingFee'],
            'grandTotal' => $calc['grandTotal'],
        ],
    ]);
} else {
    http_response_code($httpCode ?: 500);
    echo json_encode(['error' => $data['error']['description'] ?? 'Failed to create Razorpay order']);
}
