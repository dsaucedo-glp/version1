<?php
header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__, 2) . '/private/core/bootstrap.php';

function fail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode([
        'ok' => false,
        'message' => $msg
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        fail('Invalid request method', 405);
    }

    if (!isset($PATHS) || !is_array($PATHS) || empty($PATHS['logs'])) {
        fail('Logs path not configured', 500);
    }

    $idVideo      = trim((string)($_POST['idVideo'] ?? ''));
    $videoTitle   = trim((string)($_POST['videoTitle'] ?? ''));
    $promoterCode = trim((string)($_POST['promoterCode'] ?? ''));
    $promoterName = trim((string)($_POST['promoterName'] ?? ''));
    $openedAt     = trim((string)($_POST['openedAt'] ?? ''));

    if ($idVideo === '') {
        $idVideo = '0';
    }

    if ($videoTitle === '') {
        fail('Missing videoTitle');
    }

    if ($promoterCode === '') {
        fail('Missing promoterCode');
    }

    if ($promoterName === '') {
        fail('Missing promoterName');
    }

    if ($openedAt === '') {
        $openedAt = date('Y-m-d H:i:s');
    }

    $logDir = rtrim($PATHS['logs'], '/\\') . '/';
    if (!is_dir($logDir) && !mkdir($logDir, 0755, true)) {
        fail('Could not create logs directory', 500);
    }

    if (!is_writable($logDir)) {
        fail('Logs directory is not writable', 500);
    }

    $logFile = $logDir . 'openVideos.log';

    $safeTitle = str_replace(["|", "\n", "\r"], " ", $videoTitle);
    $safePromoterName = str_replace(["|", "\n", "\r"], " ", $promoterName);
    $safeUserAgent = str_replace(["|", "\n", "\r"], " ", ($_SERVER['HTTP_USER_AGENT'] ?? ''));

    $line = implode("|", [
        $openedAt,
        $idVideo,
        $safeTitle,
        $promoterCode,
        $safePromoterName,
        $_SERVER['REMOTE_ADDR'] ?? '',
        $safeUserAgent
    ]) . PHP_EOL;

    $result = @file_put_contents($logFile, $line, FILE_APPEND | LOCK_EX);

    if ($result === false) {
        fail('Could not write log file', 500);
    }

    echo json_encode([
        'ok' => true,
        'message' => 'Video open logged'
    ], JSON_UNESCAPED_UNICODE);
    exit;

} catch (Throwable $e) {
    fail('Unexpected server error: ' . $e->getMessage(), 500);
}
?>