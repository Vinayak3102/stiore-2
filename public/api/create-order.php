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
    echo json_encode(['error' => 'Method not allowed. Only POST supported.']);
    exit;
}

$raw = file_get_contents('php://input');
$body = json_decode($raw, true);

$amount = isset($body['amount']) ? intval($body['amount']) : 0;
$currency = isset($body['currency']) ? strtoupper(trim($body['currency'])) : 'INR';
$receipt = isset($body['receipt']) ? trim($body['receipt']) : 'rcpt_' . time();

// Minimum amount validation: 100 paise (₹1)
if ($amount < 100) {
    http_response_code(400);
    echo json_encode(['error' => 'Amount must be at least 100 paise (₹1)']);
    exit;
}

$keyId = getenv('RAZORPAY_KEY_ID') ?: 'rzp_test_TqRijVWiANkpat';
$keySecret = getenv('RAZORPAY_KEY_SECRET') ?: 'xtHw6RptWJzvEYac0lWXQymQ';

$payload = json_encode([
    'amount' => $amount,
    'currency' => $currency,
    'receipt' => $receipt,
    'notes' => $body['notes'] ?? ['store' => 'ShivAmrit Healers']
]);

$ch = curl_init('https://api.razorpay.com/v1/orders');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_USERPWD, $keyId . ':' . $keySecret);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Content-Length: ' . strlen($payload)
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

http_response_code($httpCode ?: 200);
$data = json_decode($response, true);

if ($httpCode >= 200 && $httpCode < 300 && isset($data['id'])) {
    echo json_encode([
        'order_id' => $data['id'],
        'amount' => $data['amount'],
        'currency' => $data['currency']
    ]);
} else {
    echo $response ?: json_encode(['error' => 'Failed to create Razorpay order']);
}
