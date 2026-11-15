<?php
require_once __DIR__ . '/config.php';
shivamrit_send_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['valid' => false, 'message' => 'Method not allowed']);
    exit;
}

$body = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(['valid' => false, 'message' => 'Invalid JSON payload']);
    exit;
}

$items = is_array($body['items'] ?? null) ? $body['items'] : [];
$code = (string)($body['code'] ?? '');
$calc = shivamrit_calculate_order($items, '');

if (!$calc['valid']) {
    http_response_code(400);
    echo json_encode(['valid' => false, 'message' => $calc['error'] ?? 'Add items to cart before applying a coupon.']);
    exit;
}

echo json_encode(shivamrit_validate_coupon($code, intval($calc['subtotal'])), JSON_UNESCAPED_UNICODE);
