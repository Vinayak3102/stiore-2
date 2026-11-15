<?php
require_once __DIR__ . '/config.php';
shivamrit_send_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$catalog = shivamrit_load_catalog();
$rawProducts = is_array($catalog['products'] ?? null) ? $catalog['products'] : [];
$products = [];
foreach ($rawProducts as $id => $p) {
    $inv = intval($p['inventory'] ?? 20);
    $products[] = [
        'id' => (string)$id,
        'name' => (string)($p['name'] ?? ''),
        'category' => (string)($p['category'] ?? ''),
        'price' => intval($p['price'] ?? 0),
        'compareAtPrice' => intval($p['compareAtPrice'] ?? 0),
        'inventory' => $inv,
        'stockStatus' => $inv <= 0 ? 'out' : ($inv <= 5 ? 'low' : 'in'),
        'active' => (bool)($p['active'] ?? true),
    ];
}

$defaultWorkshops = is_array($catalog['workshops'] ?? null) ? $catalog['workshops'] : [];
$savedWorkshops = shivamrit_read_json_store('workshops.json', []);
$workshops = [];
foreach ($defaultWorkshops as $ws) {
    $wsId = (string)($ws['id'] ?? '');
    if ($wsId !== '' && isset($savedWorkshops[$wsId]) && is_array($savedWorkshops[$wsId])) {
        $ws['seatsBooked'] = intval($savedWorkshops[$wsId]['seatsBooked'] ?? $ws['seatsBooked']);
    }
    $workshops[] = $ws;
}

echo json_encode([
    'products' => $products,
    'services' => $catalog['services'] ?? [],
    'workshops' => $workshops,
], JSON_UNESCAPED_UNICODE);
