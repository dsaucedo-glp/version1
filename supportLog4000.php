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

    if (empty($PATHS['logs'])) {
        throw new Exception('LOGS_PATH_NOT_DEFINED');
    }

    $raw = file_get_contents('php://input');
    if (!$raw) {
        respond(false, ['message' => 'Empty body']);
    }

    $json = json_decode($raw, true);
    if (!is_array($json)) {
        respond(false, ['message' => 'Invalid JSON']);
    }

    $type = isset($json['type']) ? trim((string)$json['type']) : 'unknown';
    $type = preg_replace('/[^A-Za-z0-9_\-]/', '_', $type);

    $data = isset($json['data']) && is_array($json['data']) ? $json['data'] : [];

    $baseDir = rtrim($PATHS['logs'], '/\\') . '/support/';
    if (!is_dir($baseDir) && !mkdir($baseDir, 0755, true)) {
        throw new Exception('SUPPORT_LOG_DIR_CREATE_FAILED');
    }

    if (!is_writable($baseDir)) {
        throw new Exception('SUPPORT_LOG_DIR_NOT_WRITABLE');
    }

    $now = new DateTime('now', new DateTimeZone('America/Bogota'));
    $stamp = $now->format('Ymd_His');
    $micro = substr(str_replace('.', '', (string) microtime(true)), -6);

    $safeCode = 'NO_CODE';
    if (!empty($data['identity']['code'])) {
        $safeCode = preg_replace('/[^A-Z0-9_\-]/i', '_', (string)$data['identity']['code']);
    } elseif (!empty($data['promoterCode'])) {
        $safeCode = preg_replace('/[^A-Z0-9_\-]/i', '_', (string)$data['promoterCode']);
    }

    $fileName = "{$stamp}_{$type}_{$safeCode}_{$micro}.json";
    $fullPath = $baseDir . $fileName;

    $payload = [
        'savedAt'            => $now->format('Y-m-d H:i:s'),
        'type'               => $type,
        'ip_server'          => $_SERVER['REMOTE_ADDR'] ?? 'Unknown',
        'user_agent_server'  => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown',
        'payload'            => $json
    ];

    $encoded = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($encoded === false) {
        throw new Exception('JSON_ENCODE_FAILED');
    }

    if (file_put_contents($fullPath, $encoded) === false) {
        throw new Exception('SUPPORT_LOG_SAVE_FAILED');
    }

    $logLine = sprintf(
        "[%s] type=%s file=%s\n",
        $now->format('Y-m-d H:i:s'),
        $type,
        $fileName
    );

    if (file_put_contents($baseDir . 'support_requests.log', $logLine, FILE_APPEND) === false) {
        throw new Exception('SUPPORT_INDEX_LOG_SAVE_FAILED');
    }

    respond(true, [
        'message' => 'Support log saved',
        'file'    => $fileName
    ]);

} catch (Throwable $e) {
    respond(false, [
        'message' => 'Server error',
        'error'   => $e->getMessage()
    ]);
}
?>