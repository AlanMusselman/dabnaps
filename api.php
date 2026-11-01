<?php
/**
 * Dabnaps Live Inventory & Store API for GoDaddy cPanel / Linux / Windows PHP Hosting
 * Reads and updates data/inventory.json and syncs data/inventory-sync.js automatically.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Admin-Passcode, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$jsonPath = __DIR__ . '/data/inventory.json';
$syncJsPath = __DIR__ . '/data/inventory-sync.js';

$adminPasscode = getenv('DABNAPS_ADMIN_PASSCODE');
if ($adminPasscode === false || $adminPasscode === '') {
    $adminPasscode = 'Dabnaps2026!';
}

function extractProvidedPasscode() {
    // 1. Check X-Admin-Passcode header
    if (!empty($_SERVER['HTTP_X_ADMIN_PASSCODE'])) {
        return trim($_SERVER['HTTP_X_ADMIN_PASSCODE']);
    }
    // 2. Check Authorization header (e.g. Bearer <passcode> or raw passcode)
    $authHeader = !empty($_SERVER['HTTP_AUTHORIZATION'])
        ? $_SERVER['HTTP_AUTHORIZATION']
        : (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION']) ? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] : null);

    if ($authHeader !== null && trim($authHeader) !== '') {
        $auth = trim($authHeader);
        if (preg_match('/^Bearer\s+(.*)$/i', $auth, $matches)) {
            return trim($matches[1]);
        }
        return $auth;
    }

    // 3. getallheaders() if available in web server environments
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        foreach ($headers as $key => $val) {
            $lower = strtolower($key);
            if ($lower === 'x-admin-passcode') {
                return trim($val);
            }
            if ($lower === 'authorization') {
                $val = trim($val);
                if (preg_match('/^Bearer\s+(.*)$/i', $val, $matches)) {
                    return trim($matches[1]);
                }
                return $val;
            }
        }
    }

    return null;
}

$providedPasscode = extractProvidedPasscode();
$hasAuthHeader = ($providedPasscode !== null && $providedPasscode !== '');
$isAuthorized = $hasAuthHeader && hash_equals($adminPasscode, $providedPasscode);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!file_exists($jsonPath)) {
        http_response_code(404);
        echo json_encode(['error' => 'inventory.json not found']);
        exit;
    }

    $requiresAdmin = (
        (isset($_GET['scope']) && strtolower($_GET['scope']) === 'admin') ||
        isset($_GET['cogs'])
    );

    // If an auth header was provided but is invalid, reject with 403
    if ($hasAuthHeader && !$isAuthorized) {
        http_response_code(403);
        echo json_encode(['error' => 'Forbidden: Invalid passcode']);
        exit;
    }

    // If admin scope is requested but no auth header was provided, reject with 401
    if ($requiresAdmin && !$hasAuthHeader) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized: Admin passcode required']);
        exit;
    }

    // If authenticated (either explicitly requested admin or provided valid passcode)
    if ($isAuthorized) {
        echo file_get_contents($jsonPath);
        exit;
    }

    // Public unauthenticated GET: sanitize output
    $raw = file_get_contents($jsonPath);
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to parse inventory database']);
        exit;
    }

    // Redact wholesale COGS (cost property) from all products
    if (isset($data['products']) && is_array($data['products'])) {
        foreach ($data['products'] as &$product) {
            unset($product['cost']);
        }
        unset($product);
    }

    // Redact customer orders and internal activity log
    $data['orders'] = [];
    $data['activityLog'] = [];

    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!$hasAuthHeader) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized: Admin passcode required']);
        exit;
    }

    if (!$isAuthorized) {
        http_response_code(403);
        echo json_encode(['error' => 'Forbidden: Invalid passcode']);
        exit;
    }

    $rawBody = file_get_contents('php://input');
    $decoded = json_decode($rawBody, true);

    if ($decoded === null) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON payload', 'debug_msg' => json_last_error_msg(), 'debug_raw' => $rawBody]);
        exit;
    }

    $timestamp = date('c');
    if (isset($decoded['company']) && is_array($decoded['company'])) {
        $decoded['company']['lastUpdated'] = $timestamp;
    }

    $prettyJson = json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    file_put_contents($jsonPath, $prettyJson, LOCK_EX);

    $syncJsContent = "// Auto-generated by Dabnaps GoDaddy API ($timestamp)\nwindow.DABNAPS_INITIAL_DATA = " . $prettyJson . ";\n";
    file_put_contents($syncJsPath, $syncJsContent, LOCK_EX);

    echo json_encode(['ok' => true, 'lastUpdated' => $timestamp]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
