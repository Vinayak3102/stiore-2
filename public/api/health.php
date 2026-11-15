<?php
require_once __DIR__ . '/config.php';
shivamrit_send_cors_headers();

echo json_encode([
    'status' => 'ok',
    'service' => 'ShivAmrit Healers Hostinger PHP API',
    'timestamp' => gmdate('c'),
]);
