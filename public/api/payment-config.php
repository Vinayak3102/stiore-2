<?php
require_once __DIR__ . '/config.php';
shivamrit_send_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$keyId = shivamrit_env('RAZORPAY_KEY_ID');
$configured = $keyId !== '' && shivamrit_env('RAZORPAY_KEY_SECRET') !== '';

echo json_encode([
    'configured' => $configured,
    'key_id' => $configured ? $keyId : '',
    'mode' => strpos($keyId, 'rzp_live_') === 0 ? 'live' : ($configured ? 'test' : 'unconfigured'),
]);
