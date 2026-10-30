<?php
header('Content-Type: application/json; charset=utf-8');
require_once dirname(__DIR__, 2) . '/private/core/bootstrap.php';

function respond($ok, $extra = []) {
    echo json_encode(array_merge(['ok' => $ok], $extra), JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    if (!isset($PATHS) || !is_array($PATHS)) {
        throw new Exception('PATHS_NOT_INITIALIZED');
    }

    if (empty($PATHS['support']) || empty($PATHS['public_support_url'])) {
        throw new Exception('SUPPORT_PATH_NOT_DEFINED');
    }

    $raw  = file_get_contents('php://input'); 
    $json = json_decode($raw, true);

    if (!is_array($json) || empty($json['imageBase64'])) {
        respond(false, ['message' => 'Missing imageBase64']);
    }

    $img = $json['imageBase64'];

    if (!preg_match('/^data:image\/png;base64,/', $img)) {
        respond(false, ['message' => 'Invalid image format']);
    }

    $img = preg_replace('/^data:image\/png;base64,/', '', $img);
    $img = str_replace(' ', '+', $img);
    $binary = base64_decode($img, true);

    if ($binary === false) {
        respond(false, ['message' => 'Base64 decode failed']);
    }

    $dir = rtrim($PATHS['support'], '/\\') . '/';

    if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
        throw new Exception('SUPPORT_DIR_CREATE_FAILED');
    }

    if (!is_writable($dir)) {
        throw new Exception('SUPPORT_DIR_NOT_WRITABLE');
    }

    $safeCode = !empty($json['promoterCode'])
        ? preg_replace('/[^A-Za-z0-9_\-]/', '_', $json['promoterCode'])
        : 'NO_CODE';

    $fileName = 'support_' . date('Ymd_His') . '_' . $safeCode . '_' . mt_rand(1000, 9999) . '.png';
    $fullPath = $dir . $fileName;

    if (file_put_contents($fullPath, $binary) === false) {
        throw new Exception('SUPPORT_FILE_SAVE_FAILED');
    }

    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host   = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $url    = $scheme . '://' . $host . rtrim($PATHS['public_support_url'], '/\\') . '/' . $fileName;

    respond(true, [
        'message' => 'Screenshot saved',
        'file'    => $fileName,
        'url'     => $url
    ]);

} catch (Throwable $e) {
    respond(false, [
        'message' => 'Server error',
        'error'   => $e->getMessage()
    ]);
}
?>