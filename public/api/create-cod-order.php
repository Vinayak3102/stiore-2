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

$raw = file_get_contents('php://input');
$body = json_decode((string)$raw, true);
if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON payload']);
    exit;
}

$customer = is_array($body['customer'] ?? null) ? $body['customer'] : [];
$shipping = is_array($body['shippingAddress'] ?? null) ? $body['shippingAddress'] : [];
$name = trim((string)($customer['name'] ?? ''));
$phone = trim((string)($customer['phone'] ?? ''));
$street = trim((string)($shipping['street'] ?? ''));
$pincode = trim((string)($shipping['pincode'] ?? ''));

if ($name === '' || strlen(preg_replace('/\D/', '', $phone)) < 10 || $street === '' || !preg_match('/^[0-9]{6}$/', $pincode)) {
    http_response_code(400);
    echo json_encode(['error' => 'Please provide valid customer name, 10-digit phone, street address, and 6-digit PIN code.']);
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

$orderId = 'SH-COD-' . random_int(100000, 999999);
$order = [
    'orderId' => $orderId,
    'customerName' => $name,
    'customerPhone' => $phone,
    'customerEmail' => trim((string)($customer['email'] ?? '')),
    'shippingStreet' => $street,
    'shippingCity' => trim((string)($shipping['city'] ?? '')),
    'shippingPincode' => $pincode,
    'items' => $calc['items'],
    'subtotal' => $calc['subtotal'],
    'discountAmount' => $calc['discountAmount'],
    'couponCode' => $calc['couponCode'],
    'shippingFee' => $calc['shippingFee'],
    'grandTotal' => $calc['grandTotal'],
    'paymentMethod' => 'cod',
    'paymentStatus' => 'cod_pending',
    'fulfillmentStatus' => 'processing',
    'razorpayOrderId' => '',
    'razorpayPaymentId' => '',
    'createdAt' => gmdate('c'),
    'updatedAt' => gmdate('c'),
];

shivamrit_save_order_record($order);

http_response_code(201);
echo json_encode([
    'success' => true,
    'order' => $order,
]);
