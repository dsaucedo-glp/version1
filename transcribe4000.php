<?php
// transcribe435.php
header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__, 2) . '/private/core/bootstrap.php';
// ===== LOG =====
$LOG_DIR = rtrim($PATHS['logs'], '/\\');
$LOG     = $LOG_DIR . '/transcribe.log';

if (!is_dir($LOG_DIR)) {
    @mkdir($LOG_DIR, 0755, true);
}

function logx($msg) {
    global $LOG;
    @file_put_contents($LOG, '[' . date('Y-m-d H:i:s') . '] ' . $msg . PHP_EOL, FILE_APPEND);
}

try {
    if (!isset($_FILES['audio']) || $_FILES['audio']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('no_audio_upload');
    }

    // ===== CONFIG =====
    $OPENAI_API_KEY = trim((string) envValue('OPENAI_API_KEY'));
    $MODEL          = 'whisper-1';
    $OPENAI_URL     = 'https://api.openai.com/v1/audio/transcriptions';
    // ==================

    if (!$OPENAI_API_KEY || strlen($OPENAI_API_KEY) < 20) {
        throw new Exception('missing_api_key');
    }

    $tmpPath  = $_FILES['audio']['tmp_name'];
    $origName = $_FILES['audio']['name'] ?: ('audio_' . time() . '.webm');
    $mimeType = $_FILES['audio']['type'] ?: 'application/octet-stream';

    $size = filesize($tmpPath);
    if ($size === 0 || $size < 1500) {
        echo json_encode([
            'ok' => false,
            'error' => 'file_too_small',
            'detail' => 'no audio or too short'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $cfile = new CURLFile($tmpPath, $mimeType, $origName);

    $post = [
        'file'  => $cfile,
        'model' => $MODEL,
    ];

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => $OPENAI_URL,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $post,
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . $OPENAI_API_KEY,
            'Expect:'
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 120,
    ]);

    $resp   = curl_exec($ch);
    $errno  = curl_errno($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($errno) {
        logx("cURL error #$errno");
        throw new Exception('curl_error_' . $errno);
    }

    logx("HTTP $status - bytes:" . strlen((string)$resp));

    if ($status === 401 || $status === 403) {
        echo json_encode([
            'ok'    => false,
            'error' => 'auth_error',
            'detail'=> $resp
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($status < 200 || $status >= 300) {
        echo json_encode([
            'ok'    => false,
            'error' => 'upstream_' . $status,
            'detail'=> $resp
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $json = json_decode($resp, true);
    $text = $json['text'] ?? null;

    if (!$text) {
        echo json_encode([
            'ok' => false,
            'error' => 'empty_text',
            'detail' => $resp
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode([
        'ok' => true,
        'text' => $text
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    echo json_encode([
        'ok' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>