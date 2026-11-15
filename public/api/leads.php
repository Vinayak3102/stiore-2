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

$name = substr(trim((string)($body['name'] ?? '')), 0, 120);
$rawPhone = trim((string)($body['phone'] ?? ''));
$digits = preg_replace('/\D+/', '', $rawPhone);
$email = strtolower(substr(trim((string)($body['email'] ?? '')), 0, 160));
$interest = substr(trim((string)($body['interest'] ?? 'Reiki, Astrology & Tarot Consultation')), 0, 120);
$message = substr(trim((string)($body['message'] ?? '')), 0, 500);
$sourceSlide = substr(trim((string)($body['sourceSlide'] ?? 'hero-slideshow')), 0, 60);

if (strlen($name) < 2) {
    http_response_code(400);
    echo json_encode(['error' => 'Please enter your full name (at least 2 characters).']);
    exit;
}

if (strlen($digits) < 10 || strlen($digits) > 15) {
    http_response_code(400);
    echo json_encode(['error' => 'Please enter a valid 10-digit WhatsApp mobile number.']);
    exit;
}

if (strlen($digits) === 12 && strpos($digits, '91') === 0) {
    $digits = substr($digits, 2);
}

if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Please enter a valid email address or leave email blank.']);
    exit;
}

if ($interest === '') {
    $interest = 'Reiki, Astrology & Tarot Consultation';
}

$now = gmdate('c');
$leadId = 'SH-LEAD-' . substr((string)time(), -6) . '-' . random_int(100, 999);

$webhookSynced = false;
$webhookUrl = shivamrit_env('GOOGLE_SHEETS_WEBHOOK_URL');
if ($webhookUrl !== '' && stripos($webhookUrl, 'https://') === 0 && function_exists('curl_init')) {
    $ch = curl_init($webhookUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'leadId' => $leadId,
        'createdAt' => $now,
        'name' => $name,
        'phone' => $digits,
        'email' => $email,
        'interest' => $interest,
        'message' => $message,
        'sourceSlide' => $sourceSlide,
        'status' => 'New Inquiry',
    ]));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 6);
    curl_exec($ch);
    $status = intval(curl_getinfo($ch, CURLINFO_HTTP_CODE));
    curl_close($ch);
    $webhookSynced = ($status >= 200 && $status < 300);
}

$lead = [
    'leadId' => $leadId,
    'userId' => '',
    'name' => $name,
    'phone' => $digits,
    'email' => $email,
    'interest' => $interest,
    'message' => $message,
    'sourceSlide' => $sourceSlide,
    'status' => 'new',
    'sheetSynced' => $webhookSynced,
    'sheetSyncedAt' => $webhookSynced ? $now : '',
    'createdAt' => $now,
    'updatedAt' => $now,
];

$leads = shivamrit_read_json_store('leads.json', []);
$leads[$leadId] = $lead;
shivamrit_write_json_store('leads.json', $leads);

$waLines = [
    'Namaste ShivAmrit Healers,',
    'I would like to submit an inquiry from your website:',
    'Inquiry Ref: ' . $leadId,
    'Name: ' . $name,
    'WhatsApp / Mobile: ' . $digits,
];
if ($email !== '') {
    $waLines[] = 'Email: ' . $email;
}
$waLines[] = 'Interested In: ' . $interest;
if ($message !== '') {
    $waLines[] = 'Details: ' . $message;
}
$whatsappUrl = 'https://wa.me/919876543210?text=' . rawurlencode(implode("\n", $waLines));

http_response_code(201);
echo json_encode([
    'success' => true,
    'lead' => $lead,
    'webhookSynced' => $webhookSynced,
    'whatsappUrl' => $whatsappUrl,
    'message' => $webhookSynced
        ? 'Inquiry saved and synced to your Google Sheet! Send it via WhatsApp below.'
        : 'Inquiry saved! Click below to send directly to Grandmaster Parul on WhatsApp.',
], JSON_UNESCAPED_UNICODE);
