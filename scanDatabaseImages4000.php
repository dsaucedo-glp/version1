<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once dirname(__DIR__, 2) . '/private/core/bootstrap.php';
require_once $PATHS['core'] . 'dbConnectGo.php';

function rfLoadImageResource(string $filePath, string $mime) {
    switch ($mime) {
        case 'image/jpeg':
            return @imagecreatefromjpeg($filePath);
        case 'image/png':
            return @imagecreatefrompng($filePath);
        case 'image/webp':
            return function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($filePath) : false;
        default:
            return false;
    }
}

function rfCreateNormalizedImage(string $filePath, string $mime, int $targetW = 256, int $targetH = 256): string {
    if (!extension_loaded('gd')) {
        throw new RuntimeException('gd_not_available');
    }

    $src = rfLoadImageResource($filePath, $mime);
    if (!$src) {
        throw new RuntimeException('image_load_failed');
    }

    $srcW = imagesx($src);
    $srcH = imagesy($src);

    if ($srcW <= 0 || $srcH <= 0) {
        imagedestroy($src);
        throw new RuntimeException('invalid_image_dimensions');
    }

    $dst = imagecreatetruecolor($targetW, $targetH);
    if (!$dst) {
        imagedestroy($src);
        throw new RuntimeException('image_canvas_failed');
    }

    $white = imagecolorallocate($dst, 255, 255, 255);
    imagefill($dst, 0, 0, $white);

    imagecopyresampled($dst, $src, 0, 0, 0, 0, $targetW, $targetH, $srcW, $srcH);

    imagefilter($dst, IMG_FILTER_GRAYSCALE);

    if (defined('IMG_FILTER_GAUSSIAN_BLUR')) {
        @imagefilter($dst, IMG_FILTER_GAUSSIAN_BLUR);
    } else {
        @imagefilter($dst, IMG_FILTER_SELECTIVE_BLUR);
    }

    $tmpNorm = tempnam(sys_get_temp_dir(), 'rpt_norm_');
    if ($tmpNorm === false) {
        imagedestroy($src);
        imagedestroy($dst);
        throw new RuntimeException('tempnam_failed');
    }

    $tmpNormPng = $tmpNorm . '.png';
    @unlink($tmpNorm);

    if (!imagepng($dst, $tmpNormPng, 9)) {
        imagedestroy($src);
        imagedestroy($dst);
        throw new RuntimeException('normalized_png_failed');
    }

    imagedestroy($src);
    imagedestroy($dst);

    return $tmpNormPng;
}

function rfComputeNormalizedSha256(string $filePath, string $mime): ?string {
    if (strpos($mime, 'image/') !== 0) {
        return null;
    }

    $normPath = rfCreateNormalizedImage($filePath, $mime, 256, 256);

    try {
        $hash = hash_file('sha256', $normPath);
        if (!$hash) {
            throw new RuntimeException('normalized_hash_failed');
        }
        return $hash;
    } finally {
        if (is_file($normPath)) {
            @unlink($normPath);
        }
    }
}

function rfComputeDHash(string $filePath, string $mime, int $hashSize = 8): ?string {
    if (strpos($mime, 'image/') !== 0) {
        return null;
    }

    if (!extension_loaded('gd')) {
        throw new RuntimeException('gd_not_available');
    }

    $src = rfLoadImageResource($filePath, $mime);
    if (!$src) {
        throw new RuntimeException('image_load_failed');
    }

    $w = $hashSize + 1;
    $h = $hashSize;

    $dst = imagecreatetruecolor($w, $h);
    if (!$dst) {
        imagedestroy($src);
        throw new RuntimeException('dhash_canvas_failed');
    }

    $srcW = imagesx($src);
    $srcH = imagesy($src);

    imagecopyresampled($dst, $src, 0, 0, 0, 0, $w, $h, $srcW, $srcH);
    imagefilter($dst, IMG_FILTER_GRAYSCALE);

    $bits = '';
    for ($y = 0; $y < $h; $y++) {
        for ($x = 0; $x < $hashSize; $x++) {
            $rgb1 = imagecolorat($dst, $x, $y);
            $rgb2 = imagecolorat($dst, $x + 1, $y);

            $g1 = $rgb1 & 0xFF;
            $g2 = $rgb2 & 0xFF;

            $bits .= ($g1 > $g2) ? '1' : '0';
        }
    }

    imagedestroy($src);
    imagedestroy($dst);

    $hex = '';
    foreach (str_split($bits, 4) as $chunk) {
        $hex .= dechex(bindec($chunk));
    }

    return str_pad(strtolower($hex), 16, '0', STR_PAD_LEFT);
}

function rfHammingDistanceHex(string $hex1, string $hex2): int {
    $hex1 = strtolower(trim($hex1));
    $hex2 = strtolower(trim($hex2));

    if ($hex1 === '' || $hex2 === '' || strlen($hex1) !== strlen($hex2)) {
        return 999;
    }

    $dist = 0;
    $len = strlen($hex1);

    for ($i = 0; $i < $len; $i++) {
        $n1 = hexdec($hex1[$i]);
        $n2 = hexdec($hex2[$i]);
        $xor = $n1 ^ $n2;

        while ($xor) {
            $dist += $xor & 1;
            $xor >>= 1;
        }
    }

    return $dist;
}

function rfNormalizeFilesArray(array $files): array {
    $normalized = [];

    if (!isset($files['name']) || !is_array($files['name'])) {
        return $normalized;
    }

    $count = count($files['name']);

    for ($i = 0; $i < $count; $i++) {
        $normalized[] = [
            'name'     => $files['name'][$i] ?? ('file_' . $i),
            'type'     => $files['type'][$i] ?? '',
            'tmp_name' => $files['tmp_name'][$i] ?? '',
            'error'    => $files['error'][$i] ?? UPLOAD_ERR_NO_FILE,
            'size'     => (int)($files['size'][$i] ?? 0),
            'index'    => $i
        ];
    }

    return $normalized;
}

$pdo = null;
$db  = null;

$__caller  = basename(__FILE__);
$__ip      = $_POST['ip'] ?? 'Unknown';
$__user    = isset($_POST['code']) ? strtoupper(trim($_POST['code'])) : 'Unknown';
$__country = $_POST['country'] ?? 'Unknown';
$__city    = $_POST['city'] ?? 'Unknown';

$response = [
    'ok' => false,
    'results' => []
];

try {
    if (!isset($_FILES['files']) || !is_array($_FILES['files'])) {
        throw new RuntimeException('missing_files');
    }

    $incomingFiles = rfNormalizeFilesArray($_FILES['files']);

    if (count($incomingFiles) === 0) {
        throw new RuntimeException('empty_batch');
    }

    $allowed = ['image/jpeg', 'image/png', 'image/webp'];
    $prepared = [];
    $results = [];

    // 1) Validaciones básicas + hashes
    foreach ($incomingFiles as $file) {
        $item = [
            'index' => $file['index'],
            'name' => (string)$file['name'],
            'ok' => false,
            'duplicate' => false,
            'reason' => '',
            'fileHash' => null,
            'normalizedSha256' => null,
            'dHash' => null,
            'mime' => null,
            'tmp' => (string)$file['tmp_name']
        ];

        try {
            if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
                throw new RuntimeException('upload_error_' . ($file['error'] ?? 'unknown'));
            }

            $tmp = (string)$file['tmp_name'];
            $size = (int)$file['size'];

            if ($tmp === '' || !is_uploaded_file($tmp)) {
                throw new RuntimeException('invalid_uploaded_file');
            }

            if ($size <= 0) {
                throw new RuntimeException('empty_file');
            }

            if ($size > 20 * 1024 * 1024) {
                throw new RuntimeException('too_big');
            }

            $finfo = function_exists('finfo_open') ? finfo_open(FILEINFO_MIME_TYPE) : null;
            $mime  = $finfo ? finfo_file($finfo, $tmp) : (mime_content_type($tmp) ?: '');
            if ($finfo) finfo_close($finfo);

            if (!in_array($mime, $allowed, true)) {
                throw new RuntimeException('bad_type_' . $mime);
            }

            $fileHash = hash_file('sha256', $tmp);
            if (!$fileHash) {
                throw new RuntimeException('hash_failed');
            }

            $normalizedSha256 = rfComputeNormalizedSha256($tmp, $mime);
            $dHash = rfComputeDHash($tmp, $mime);

            $item['mime'] = $mime;
            $item['fileHash'] = $fileHash;
            $item['normalizedSha256'] = $normalizedSha256;
            $item['dHash'] = $dHash;

            $prepared[] = $item;

        } catch (Throwable $e) {
            $results[$file['index']] = [
                'index' => $file['index'],
                'name' => (string)$file['name'],
                'ok' => false,
                'duplicate' => false,
                'reason' => $e->getMessage()
            ];
        }
    }

    if (count($prepared) === 0) {
        ksort($results);
        $response = [
            'ok' => true,
            'results' => array_values($results)
        ];
        echo json_encode($response, JSON_UNESCAPED_UNICODE);
        exit;
    }

    // 2) UNA sola conexión DB
    $db  = Database::getInstance();
    $pdo = $db->getConnection($__caller, $__user, $__ip, $__country, $__city);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // 3) Coincidencias exactas fileHash
    $fileHashes = array_values(array_unique(array_filter(array_map(fn($x) => $x['fileHash'], $prepared))));
    $dbFileHashMatches = [];

    if (count($fileHashes) > 0) {
        $ph = implode(',', array_fill(0, count($fileHashes), '?'));
        $stmt = $pdo->prepare("
            SELECT id, idReportHeader, fileName, uploadedAt, promoterName, fileHash
            FROM reportsFiles
            WHERE fileHash IN ($ph)
        ");
        $stmt->execute($fileHashes);

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $dbFileHashMatches[(string)$row['fileHash']] = $row;
        }
    }

    // 4) Coincidencias normalizedSha256
    $normHashes = array_values(array_unique(array_filter(array_map(fn($x) => $x['normalizedSha256'], $prepared))));
    $dbNormMatches = [];

    if (count($normHashes) > 0) {
        $ph = implode(',', array_fill(0, count($normHashes), '?'));
        $stmt = $pdo->prepare("
            SELECT id, idReportHeader, fileName, uploadedAt, promoterName, normalizedSha256
            FROM reportsFiles
            WHERE normalizedSha256 IN ($ph)
        ");
        $stmt->execute($normHashes);

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $dbNormMatches[(string)$row['normalizedSha256']] = $row;
        }
    }

    // 5) Últimos visualHash para similitud
    $stmtVisual = $pdo->prepare("
        SELECT id, idReportHeader, fileName, uploadedAt, promoterName, visualHash
        FROM reportsFiles
        WHERE visualHash IS NOT NULL AND visualHash <> ''
        ORDER BY id DESC
        LIMIT 300
    ");
    $stmtVisual->execute();
    $visualRows = $stmtVisual->fetchAll(PDO::FETCH_ASSOC);

    // 6) Duplicados dentro del mismo lote y contra DB
    $seenBatchFileHash = [];
    $seenBatchNormHash = [];
    $seenBatchDHash = [];

    foreach ($prepared as $item) {
        $idx = $item['index'];
        $name = $item['name'];
        $fileHash = (string)$item['fileHash'];
        $normHash = (string)($item['normalizedSha256'] ?? '');
        $dHash = (string)($item['dHash'] ?? '');

        $result = [
            'index' => $idx,
            'name' => $name,
            'ok' => true,
            'duplicate' => false,
            'reason' => ''
        ];

        if (isset($dbFileHashMatches[$fileHash])) {
            $dup = $dbFileHashMatches[$fileHash];
            $result['ok'] = false;
            $result['duplicate'] = true;
            $result['reason'] = 'Duplicate image: already used by ' . ($dup['promoterName'] ?? 'another user') . ' at ' . ($dup['uploadedAt'] ?? '');
            $results[$idx] = $result;
            continue;
        }

        if (isset($seenBatchFileHash[$fileHash])) {
            $prevName = $seenBatchFileHash[$fileHash];
            $result['ok'] = false;
            $result['duplicate'] = true;
            $result['reason'] = 'Duplicate image inside this upload batch: same as ' . $prevName;
            $results[$idx] = $result;
            continue;
        }
        $seenBatchFileHash[$fileHash] = $name;

        if ($normHash !== '' && isset($dbNormMatches[$normHash])) {
            $dup = $dbNormMatches[$normHash];
            $result['ok'] = false;
            $result['duplicate'] = true;
            $result['reason'] = 'Duplicate image (normalized): already used by ' . ($dup['promoterName'] ?? 'another user') . ' at ' . ($dup['uploadedAt'] ?? '');
            $results[$idx] = $result;
            continue;
        }

        if ($normHash !== '' && isset($seenBatchNormHash[$normHash])) {
            $prevName = $seenBatchNormHash[$normHash];
            $result['ok'] = false;
            $result['duplicate'] = true;
            $result['reason'] = 'Duplicate image inside this upload batch (normalized): same as ' . $prevName;
            $results[$idx] = $result;
            continue;
        }
        if ($normHash !== '') {
            $seenBatchNormHash[$normHash] = $name;
        }

        if ($dHash !== '') {
            foreach ($seenBatchDHash as $prevVisual) {
                $prevName = (string)$prevVisual['name'];
                $prevDHash = (string)$prevVisual['dHash'];

                if ($prevDHash === '') {
                    continue;
                }

                $distance = rfHammingDistanceHex($dHash, $prevDHash);

                if ($distance <= 3) {
                    $result['ok'] = false;
                    $result['duplicate'] = true;
                    $result['reason'] = 'Very similar image inside this upload batch: same as ' . $prevName;
                    $results[$idx] = $result;
                    continue 2;
                }
            }

            $seenBatchDHash[] = [
                'name' => $name,
                'dHash' => $dHash
            ];
        }

        if ($dHash !== '') {
            foreach ($visualRows as $vr) {
                $prevDHash = (string)($vr['visualHash'] ?? '');
                if ($prevDHash === '') {
                    continue;
                }

                $distance = rfHammingDistanceHex($dHash, $prevDHash);
                if ($distance <= 3) {
                    $result['ok'] = false;
                    $result['duplicate'] = true;
                    $result['reason'] = 'Very similar image: already used by ' . ($vr['promoterName'] ?? 'another user') . ' at ' . ($vr['uploadedAt'] ?? '');
                    break;
                }
            }
        }

        $results[$idx] = $result;
    }

    ksort($results);

    $response = [
        'ok' => true,
        'results' => array_values($results)
    ];

} catch (Throwable $e) {
    $response = [
        'ok' => false,
        'results' => [],
        'reason' => $e->getMessage()
    ];
} finally {
    try {
        Database::closeConnection($__caller, $__user, $__ip, $__country, $__city);
    } catch (Throwable $e) {
        $pdo = null;
    }
}

echo json_encode($response, JSON_UNESCAPED_UNICODE);
exit;
?>