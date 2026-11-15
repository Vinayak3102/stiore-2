<?php
require_once __DIR__ . '/config.php';
shivamrit_send_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$reviews = shivamrit_read_json_store('reviews.json', []);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $productId = trim((string)($_GET['productId'] ?? ''));
    $approved = array_values(array_filter($reviews, function ($r) use ($productId) {
        if (!is_array($r) || !($r['approved'] ?? false)) {
            return false;
        }
        return $productId === '' || ($r['productId'] ?? '') === $productId;
    }));
    echo json_encode(['reviews' => $approved], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode((string)file_get_contents('php://input'), true);
    $productId = trim((string)($body['productId'] ?? ''));
    $comment = trim((string)($body['comment'] ?? ''));
    $authorName = trim((string)($body['authorName'] ?? 'ShivAmrit Member'));
    $rating = max(1, min(5, intval($body['rating'] ?? 5)));

    if ($productId === '' || strlen($comment) < 5) {
        http_response_code(400);
        echo json_encode(['error' => 'Please provide a product ID and a review comment (min 5 characters).']);
        exit;
    }

    $id = 'rev_' . bin2hex(random_bytes(6));
    $entry = [
        'id' => $id,
        'productId' => $productId,
        'authorName' => substr($authorName !== '' ? $authorName : 'ShivAmrit Member', 0, 100),
        'rating' => $rating,
        'comment' => substr($comment, 0, 1000),
        'verifiedPurchase' => false,
        'approved' => false,
        'createdAt' => gmdate('c'),
    ];
    $reviews[$id] = $entry;
    shivamrit_write_json_store('reviews.json', $reviews);

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'review' => $entry,
        'message' => 'Thank you! Your review has been submitted for moderation.',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
