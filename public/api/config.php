<?php
/**
 * ShivAmrit Healers — Secure PHP Configuration & Server-Side Calculation Helper
 * Compatible with Hostinger Shared Hosting (PHP 8.x)
 *
 * Security rules:
 * - Never hardcode Razorpay keys or secrets in source files.
 * - Configure RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and RAZORPAY_WEBHOOK_SECRET
 *   in Hostinger environment or an unexposed .env file outside/above public_html.
 */

function shivamrit_load_env_file(): void {
    $candidates = [
        dirname(__DIR__, 3) . '/.env',
        dirname(__DIR__, 2) . '/.env',
    ];
    foreach ($candidates as $path) {
        if (is_file($path) && is_readable($path)) {
            $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            if ($lines === false) {
                continue;
            }
            foreach ($lines as $line) {
                $trimmed = trim($line);
                if ($trimmed === '' || strpos($trimmed, '#') === 0 || strpos($trimmed, '=') === false) {
                    continue;
                }
                [$key, $val] = explode('=', $trimmed, 2);
                $key = trim($key);
                $val = trim($val, " \t\n\r\0\x0B\"'");
                if ($key !== '' && getenv($key) === false) {
                    putenv($key . '=' . $val);
                    $_ENV[$key] = $val;
                }
            }
            break;
        }
    }
}

shivamrit_load_env_file();

function shivamrit_env(string $key): string {
    $val = getenv($key);
    if ($val !== false && $val !== '') {
        return trim((string)$val);
    }
    if (isset($_ENV[$key]) && $_ENV[$key] !== '') {
        return trim((string)$_ENV[$key]);
    }
    return '';
}

function shivamrit_send_cors_headers(): void {
    header('Content-Type: application/json; charset=utf-8');
    $allowedOrigin = shivamrit_env('APP_URL');
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($allowedOrigin !== '' && $origin === rtrim($allowedOrigin, '/')) {
        header('Access-Control-Allow-Origin: ' . $origin);
    } elseif ($origin !== '' && (strpos($origin, 'http://localhost') === 0 || strpos($origin, 'https://') === 0)) {
        $host = $_SERVER['HTTP_HOST'] ?? '';
        if ($host !== '' && strpos($origin, 'https://' . $host) === 0) {
            header('Access-Control-Allow-Origin: ' . $origin);
        }
    }
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
}

function shivamrit_load_catalog(): array {
    $catalogPath = __DIR__ . '/catalog-data.json';
    if (!is_file($catalogPath)) {
        return [];
    }
    $decoded = json_decode((string)file_get_contents($catalogPath), true);
    return is_array($decoded) ? $decoded : [];
}

function shivamrit_read_json_store(string $filename, array $default = []): array {
    $storageDir = __DIR__ . '/storage';
    if (!is_dir($storageDir)) {
        mkdir($storageDir, 0750, true);
    }
    $filePath = $storageDir . '/' . basename($filename);
    if (!is_file($filePath)) {
        return $default;
    }
    $decoded = json_decode((string)file_get_contents($filePath), true);
    return is_array($decoded) ? $decoded : $default;
}

function shivamrit_write_json_store(string $filename, array $data): void {
    $storageDir = __DIR__ . '/storage';
    if (!is_dir($storageDir)) {
        mkdir($storageDir, 0750, true);
    }
    $filePath = $storageDir . '/' . basename($filename);
    file_put_contents($filePath, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
}

function shivamrit_validate_coupon(string $couponCode, int $subtotal): array {
    $catalog = shivamrit_load_catalog();
    $coupons = $catalog['coupons'] ?? [];
    $normalized = strtoupper(trim($couponCode));

    if ($normalized === '') {
        return ['valid' => false, 'code' => '', 'discountAmount' => 0, 'freeShipping' => false, 'message' => 'Please enter a coupon code.'];
    }
    if (!isset($coupons[$normalized])) {
        return ['valid' => false, 'code' => $normalized, 'discountAmount' => 0, 'freeShipping' => false, 'message' => 'Invalid coupon code. Try FIRST10, BLISS15, or FREESHIP.'];
    }
    $rule = $coupons[$normalized];
    $minSubtotal = intval($rule['minSubtotal'] ?? 0);
    if ($subtotal < $minSubtotal) {
        return [
            'valid' => false,
            'code' => $normalized,
            'discountAmount' => 0,
            'freeShipping' => false,
            'message' => "Coupon {$normalized} requires a minimum order of ₹{$minSubtotal}.",
        ];
    }

    $discountAmount = 0;
    $freeShipping = false;
    if (($rule['type'] ?? '') === 'percent') {
        $discountAmount = intval(round(($subtotal * floatval($rule['value'])) / 100));
    } elseif (($rule['type'] ?? '') === 'fixed') {
        $discountAmount = min($subtotal, intval($rule['value'] ?? 0));
    } elseif (($rule['type'] ?? '') === 'freeship') {
        $freeShipping = true;
    }

    return [
        'valid' => true,
        'code' => $normalized,
        'discountAmount' => $discountAmount,
        'freeShipping' => $freeShipping,
        'message' => "Coupon {$normalized} applied: " . ($rule['description'] ?? 'Discount applied'),
    ];
}

function shivamrit_calculate_order(array $requestedItems, string $couponCode): array {
    $catalog = shivamrit_load_catalog();
    if (!isset($catalog['products']) || !is_array($catalog['products'])) {
        return ['valid' => false, 'error' => 'Server catalog configuration missing'];
    }

    if (empty($requestedItems)) {
        return ['valid' => false, 'error' => 'Order must include at least one item'];
    }

    $aggregated = [];
    foreach ($requestedItems as $line) {
        $id = isset($line['id']) ? trim((string)$line['id']) : '';
        $qty = isset($line['qty']) ? intval($line['qty']) : 0;
        if ($id === '' || $qty < 1 || $qty > 50) {
            return ['valid' => false, 'error' => 'Invalid product ID or quantity'];
        }
        $aggregated[$id] = ($aggregated[$id] ?? 0) + $qty;
    }

    $validatedLines = [];
    $subtotal = 0;
    foreach ($aggregated as $id => $qty) {
        if (!isset($catalog['products'][$id])) {
            return ['valid' => false, 'error' => 'Unknown product: ' . $id];
        }
        $prod = $catalog['products'][$id];
        $unitPrice = intval($prod['price']);
        $lineTotal = $unitPrice * $qty;
        $subtotal += $lineTotal;
        $validatedLines[] = [
            'productId' => $id,
            'name' => (string)$prod['name'],
            'unitPrice' => $unitPrice,
            'qty' => $qty,
            'lineTotal' => $lineTotal,
        ];
    }

    $couponRes = shivamrit_validate_coupon($couponCode, $subtotal);
    $discountAmount = $couponRes['valid'] ? intval($couponRes['discountAmount']) : 0;
    $freeShipping = $couponRes['valid'] ? (bool)$couponRes['freeShipping'] : false;
    $appliedCoupon = $couponRes['valid'] ? (string)$couponRes['code'] : '';

    $threshold = intval($catalog['freeShippingThreshold'] ?? 999);
    $standardShipping = intval($catalog['standardShipping'] ?? 99);
    $shippingFee = ($subtotal >= $threshold || $freeShipping) ? 0 : $standardShipping;
    $grandTotal = max(1, $subtotal - $discountAmount + $shippingFee);

    return [
        'valid' => true,
        'items' => $validatedLines,
        'subtotal' => $subtotal,
        'discountAmount' => $discountAmount,
        'couponCode' => $appliedCoupon,
        'shippingFee' => $shippingFee,
        'grandTotal' => $grandTotal,
    ];
}

function shivamrit_save_order_record(array $order): void {
    $orders = shivamrit_read_json_store('orders.json', []);
    $orders[$order['orderId']] = $order;
    shivamrit_write_json_store('orders.json', $orders);
}
