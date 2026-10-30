<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/private/core/bootstrap.php';

$key  = $_GET['key'] ?? '';
$path = $_GET['path'] ?? '';

if ($key !== 'dsaucedo@golocalpromos.com') {
    http_response_code(403);
    exit;
}

$baseDir = realpath(rtrim($PATHS['checkin'], '/\\'));

$filePath = realpath($path);

if (!$baseDir || !$filePath || strpos($filePath, $baseDir . DIRECTORY_SEPARATOR) !== 0) {
    http_response_code(403);
    exit;
}

if (!is_file($filePath)) {
    http_response_code(404);
    exit;
}

$mime = mime_content_type($filePath) ?: 'image/jpeg';

header('Content-Type: ' . $mime);
header('Content-Length: ' . filesize($filePath));
header('Cache-Control: private, max-age=300');

readfile($filePath);
exit;