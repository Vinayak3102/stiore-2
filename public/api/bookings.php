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

$serviceId = trim((string)($body['serviceId'] ?? ''));
$customerName = trim((string)($body['customerName'] ?? ''));
$customerPhone = trim((string)($body['customerPhone'] ?? ''));
$customerEmail = strtolower(trim((string)($body['customerEmail'] ?? '')));
$preferredDate = trim((string)($body['preferredDate'] ?? ''));
$preferredSlot = trim((string)($body['preferredSlot'] ?? ''));
$notes = substr(trim((string)($body['notes'] ?? '')), 0, 500);

if (
    $serviceId === '' ||
    $customerName === '' ||
    strlen(preg_replace('/\D/', '', $customerPhone)) < 10 ||
    !preg_match('/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/', $preferredDate) ||
    $preferredSlot === ''
) {
    http_response_code(400);
    echo json_encode(['error' => 'Please select a service, valid date, time slot, full name, and 10-digit mobile number.']);
    exit;
}

$catalog = shivamrit_load_catalog();
$service = null;
foreach (($catalog['services'] ?? []) as $s) {
    if (($s['id'] ?? '') === $serviceId) {
        $service = $s;
        break;
    }
}

if (!is_array($service)) {
    http_response_code(409);
    echo json_encode(['error' => 'Selected consultation service was not found.']);
    exit;
}

$bookings = shivamrit_read_json_store('bookings.json', []);
foreach ($bookings as $b) {
    if (
        ($b['serviceId'] ?? '') === $serviceId &&
        ($b['preferredDate'] ?? '') === $preferredDate &&
        ($b['preferredSlot'] ?? '') === $preferredSlot &&
        ($b['bookingStatus'] ?? '') !== 'cancelled'
    ) {
        http_response_code(409);
        echo json_encode(['error' => "The {$preferredSlot} slot on {$preferredDate} is already booked. Please choose another slot."]);
        exit;
    }
}

$now = gmdate('c');
$booking = [
    'bookingId' => 'SH-BKG-' . random_int(100000, 999999),
    'serviceId' => $serviceId,
    'serviceName' => (string)$service['name'],
    'customerName' => substr($customerName, 0, 120),
    'customerPhone' => substr($customerPhone, 0, 20),
    'customerEmail' => substr($customerEmail, 0, 160),
    'preferredDate' => $preferredDate,
    'preferredSlot' => $preferredSlot,
    'notes' => $notes,
    'fee' => intval($service['fee']),
    'bookingStatus' => 'confirmed',
    'createdAt' => $now,
    'updatedAt' => $now,
];

$bookings[$booking['bookingId']] = $booking;
shivamrit_write_json_store('bookings.json', $bookings);

http_response_code(201);
echo json_encode(['success' => true, 'booking' => $booking], JSON_UNESCAPED_UNICODE);
