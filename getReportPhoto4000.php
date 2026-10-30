<?php
declare(strict_types=1);
require_once dirname(__DIR__, 2) . '/private/core/bootstrap.php';

// Params
$key  = $_GET['key'] ?? '';
$file = $_GET['file'] ?? '';

// Seguridad básica (misma lógica que checkin)
if ($key !== 'dsaucedo@golocalpromos.com') {
    http_response_code(403);
    exit;
}

// Base dir PRIVATE (reports)
$baseDir = realpath(rtrim($PATHS['reports'], '/\\'));

// Construir path seguro (NO confiar en input directo)
$fileName = basename($file); // evita path traversal tipo ../../
$filePath = realpath($baseDir . DIRECTORY_SEPARATOR . $fileName);

// Validaciones
if (!$baseDir || !$filePath || strpos($filePath, $baseDir . DIRECTORY_SEPARATOR) !== 0) {
    http_response_code(403);
    exit;
}

if (!is_file($filePath)) {
    http_response_code(404);
    exit;
}

// MIME
$mime = mime_content_type($filePath) ?: 'image/jpeg';

// Headers
header('Content-Type: ' . $mime);
header('Content-Length: ' . filesize($filePath));
header('Cache-Control: private, max-age=300');

// Output
readfile($filePath);
exit;
