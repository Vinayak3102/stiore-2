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
if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON payload']);
    exit;
}

$action = strtolower(trim((string)($_GET['action'] ?? ($body['action'] ?? 'subscribe'))));
$email = strtolower(trim((string)($body['email'] ?? '')));

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode([
        'error' => $action === 'unsubscribe'
            ? 'Please enter a valid email address to unsubscribe.'
            : 'Please enter a valid email address.',
    ]);
    exit;
}

$subscribers = shivamrit_read_json_store('newsletter.json', []);

if ($action === 'unsubscribe') {
    $removed = isset($subscribers[$email]);
    if ($removed) {
        unset($subscribers[$email]);
        shivamrit_write_json_store('newsletter.json', $subscribers);
    }
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'removed' => $removed,
        'message' => $removed
            ? 'You have been unsubscribed from ShivAmrit Healers newsletter updates.'
            : 'This email address is already unsubscribed.',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$consent = ($body['consent'] ?? true) !== false;
$source = substr(trim((string)($body['source'] ?? 'footer')), 0, 40);

if (!$consent) {
    http_response_code(400);
    echo json_encode(['error' => 'Please confirm subscription consent.']);
    exit;
}

$alreadySubscribed = isset($subscribers[$email]);

if (!$alreadySubscribed) {
    $subscribers[$email] = [
        'email' => $email,
        'consent' => true,
        'source' => $source,
        'createdAt' => gmdate('c'),
    ];
    shivamrit_write_json_store('newsletter.json', $subscribers);
}

http_response_code(201);
echo json_encode([
    'success' => true,
    'alreadySubscribed' => $alreadySubscribed,
    'message' => $alreadySubscribed
        ? 'This email is already subscribed to ShivAmrit Healers updates.'
        : 'Thank you for subscribing to ShivAmrit Healers sacred updates.',
], JSON_UNESCAPED_UNICODE);
