<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$keyId = getenv('RAZORPAY_KEY_ID') ?: 'rzp_test_TqRijVWiANkpat';
echo json_encode([
    'key_id' => $keyId
]);
