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

$workshopId = trim((string)($body['workshopId'] ?? ''));
$participantName = trim((string)($body['participantName'] ?? ''));
$participantPhone = trim((string)($body['participantPhone'] ?? ''));
$participantEmail = strtolower(trim((string)($body['participantEmail'] ?? '')));
$seats = max(1, min(5, intval($body['seats'] ?? 1)));

if (
    $workshopId === '' ||
    $participantName === '' ||
    strlen(preg_replace('/\D/', '', $participantPhone)) < 10
) {
    http_response_code(400);
    echo json_encode(['error' => 'Please enter participant name, 10-digit mobile number, and select a workshop.']);
    exit;
}

$catalog = shivamrit_load_catalog();
$workshop = null;
foreach (($catalog['workshops'] ?? []) as $ws) {
    if (($ws['id'] ?? '') === $workshopId) {
        $workshop = $ws;
        break;
    }
}

if (!is_array($workshop) || !($workshop['active'] ?? false)) {
    http_response_code(409);
    echo json_encode(['error' => 'Workshop not found or inactive.']);
    exit;
}

$savedWorkshops = shivamrit_read_json_store('workshops.json', []);
if (isset($savedWorkshops[$workshopId]) && is_array($savedWorkshops[$workshopId])) {
    $workshop['seatsBooked'] = intval($savedWorkshops[$workshopId]['seatsBooked'] ?? $workshop['seatsBooked']);
}

$totalSeats = intval($workshop['totalSeats']);
$seatsBooked = intval($workshop['seatsBooked']);
if ($seatsBooked + $seats > $totalSeats) {
    $remaining = max(0, $totalSeats - $seatsBooked);
    http_response_code(409);
    echo json_encode(['error' => "Only {$remaining} seats remaining for this workshop."]);
    exit;
}

$workshop['seatsBooked'] = $seatsBooked + $seats;
$savedWorkshops[$workshopId] = $workshop;
shivamrit_write_json_store('workshops.json', $savedWorkshops);

$amount = intval($workshop['fee']) * $seats;
$registration = [
    'registrationId' => 'SH-WS-' . random_int(100000, 999999),
    'workshopId' => $workshopId,
    'workshopTitle' => (string)$workshop['title'],
    'participantName' => substr($participantName, 0, 120),
    'participantPhone' => substr($participantPhone, 0, 20),
    'participantEmail' => substr($participantEmail, 0, 160),
    'seats' => $seats,
    'amount' => $amount,
    'totalFee' => $amount,
    'status' => 'confirmed',
    'createdAt' => gmdate('c'),
];

$registrations = shivamrit_read_json_store('workshop-registrations.json', []);
$registrations[$registration['registrationId']] = $registration;
shivamrit_write_json_store('workshop-registrations.json', $registrations);

http_response_code(201);
echo json_encode([
    'success' => true,
    'registration' => $registration,
    'workshop' => $workshop,
], JSON_UNESCAPED_UNICODE);
