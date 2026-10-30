<?php
// submitReport445.php

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

$response = ['ok' => false];
$pdo = null;

$__caller  = basename(__FILE__);
$__ip      = $_POST['ip'] ?? 'Unknown';
$__user    = isset($_POST['code']) ? strtoupper(trim($_POST['code'])) : 'Unknown';
$__country = $_POST['country'] ?? 'Unknown';
$__city    = $_POST['city'] ?? 'Unknown';

$debugFile = rtrim($PATHS['logs'], '/\\') . '/submitReport8.log';

try {
    $pk           = isset($_POST['pk']) ? trim((string)$_POST['pk']) : '';
    $promoterCode = isset($_POST['promoterCode']) ? trim((string)$_POST['promoterCode']) : '';
    $promoterName = isset($_POST['promoterName']) ? trim((string)$_POST['promoterName']) : '';
    $eventName    = isset($_POST['eventName']) ? trim((string)$_POST['eventName']) : '';
    $longIdShift  = isset($_POST['longIdShift']) ? trim((string)$_POST['longIdShift']) : '';
    $shiftDate    = isset($_POST['shiftDate']) ? trim((string)$_POST['shiftDate']) : '';
    $marketName   = isset($_POST['market']) ? trim((string)$_POST['market']) : '';
    $locationName = isset($_POST['location1']) ? trim((string)$_POST['location1']) : '';
    $reportType = isset($_POST['reportType']) ? strtoupper(trim((string)$_POST['reportType'])) : 'STAFFING';

    $expressPhotosRequired = isset($_POST['expressPhotosRequired']) ? (int)$_POST['expressPhotosRequired'] : 0;

    if ($pk === '' || $promoterCode === '' || $promoterName === '' || $eventName === '') {
        throw new Exception('Missing required fields: pk, promoterCode, promoterName, eventName.');
    }

    $reportDateForDB = null;

    if (!empty($shiftDate)) {
        $dt = DateTime::createFromFormat('n/j/Y H:i:s', $shiftDate);
        if ($dt) {
            $reportDateForDB = $dt->format('Y-m-d');
        }
    }

    $answers = json_decode($_POST['answers'] ?? '{}', true);
    if (!is_array($answers)) {
        $answers = [];
    }

    $footTraffic  = isset($answers['footTraffic']) ? trim((string)$answers['footTraffic']) : null;
    $interactions = isset($answers['interactions']) ? (int)$answers['interactions'] : null;
    $samples      = isset($answers['samples']) ? (int)$answers['samples'] : null;
    $gender       = isset($answers['gender']) ? trim((string)$answers['gender']) : null;

    $ethnics       = is_array($answers['ethnicity'] ?? null) ? $answers['ethnicity'] : [];
    $nationalities = is_array($answers['nationalities'] ?? null) ? $answers['nationalities'] : [];
    $destinations  = is_array($answers['destinations'] ?? null) ? $answers['destinations'] : [];
    $ageGroups     = is_array($answers['ages'] ?? null) ? $answers['ages'] : [];
    $reportText    = $answers['eventSummary'] ?? null;
    $urgentIssues  = $answers['urgentIssues'] ?? null;

    $salesReportText = '';

    if (isset($_POST['salesFreeText'])) {
        $salesReportText = trim((string)$_POST['salesFreeText']);
    } elseif (isset($answers['salesFreeText'])) {
        $salesReportText = trim((string)$answers['salesFreeText']);
    }

    $salesReportText = mb_substr($salesReportText, 0, 4000);

    $totalSalesHeader = null;
    if (isset($answers['totalSales']) && $answers['totalSales'] !== '') {
        $totalSalesHeader = (float)$answers['totalSales'];
    }       

    $products = [];
    $promotedTable = $answers['promotedTable'] ?? [];
    if (is_array($promotedTable)) {
        foreach ($promotedTable as $row) {
            if (is_array($row) && isset($row['product'])) {
                $p = trim((string)$row['product']);
                if ($p !== '') $products[] = $p;
            } elseif (is_string($row)) {
                $p = trim($row);
                if ($p !== '') $products[] = $p;
            }
        }
    }
    $products = array_values(array_unique($products));

    $competitors = [];
    $competitorsTable = $answers['competitorsTable'] ?? [];
    if (is_array($competitorsTable)) {
        foreach ($competitorsTable as $row) {
            if (is_array($row) && isset($row['brand'])) {
                $b = trim((string)$row['brand']);
                if ($b !== '') $competitors[] = $b;
            } elseif (is_string($row)) {
                $b = trim($row);
                if ($b !== '') $competitors[] = $b;
            }
        }
    }
    $competitors = array_values(array_unique($competitors));

    $db  = Database::getInstance();
    $pdo = $db->getConnection($__caller, $__user, $__ip, $__country, $__city);

    $now = date('Y-m-d H:i:s');
    $pdo->beginTransaction();

    $sqlHeader = "
        INSERT INTO reportsHeader
            (pk, promoterCode, promoterName, eventName, footTraffic, interactions, samples,
             salesReport, totalSales,
             longIdShift, shiftSummary, shiftProblems, marketName, locationName, shiftDate,
             predominantGender)
        VALUES
            (:pk, :promoterCode, :promoterName, :eventName, :footTraffic, :interactions, :samples,
             :salesReport, :totalSales,
             :longIdShift, :shiftSummary, :shiftProblem, :marketName, :locationName, :shiftDate,
             :predominantGender)
    ";

    $stHeader = $pdo->prepare($sqlHeader);
    $stHeader->execute([
        ':pk'                => $pk,
        ':promoterCode'      => strtoupper($promoterCode),
        ':promoterName'      => $promoterName,
        ':eventName'         => $eventName,
        ':footTraffic'       => $footTraffic,
        ':interactions'      => $interactions,
        ':samples'           => $samples,
        ':salesReport'       => $salesReportText,
        ':totalSales'        => $totalSalesHeader,
        ':longIdShift'       => $longIdShift,
        ':shiftSummary'      => $reportText,
        ':shiftProblem'      => $urgentIssues,
        ':marketName'        => $marketName,
        ':locationName'      => $locationName,
        ':shiftDate'         => $shiftDate,
        ':predominantGender' => $gender
    ]);

    $idReportHeader = (int)$pdo->lastInsertId();

    $sqlDetail = "
        INSERT INTO reportsDetails
        (pk, originTable, recordType, recordValue, active, originalSource, originalDate, insertDate)
        VALUES
        (:pk, 'reportsHeader', :recordType, :recordValue, 1, 'Pre-CheckOut', :originalDate, :insertDate)
    ";

    $stDetail = $pdo->prepare($sqlDetail);

    $insertArray = function (array $values, string $recordType) use ($stDetail, $pk, $now) {
        foreach ($values as $v) {
            $v = trim((string)$v);
            if ($v === '') continue;

            $stDetail->execute([
                ':pk'           => $pk,
                ':recordType'   => $recordType,
                ':recordValue'  => mb_substr($v, 0, 200),
                ':originalDate' => $now,
                ':insertDate'   => $now,
            ]);
        }
    };

    $insertArray($ethnics,       'ETHNICS');
    $insertArray($nationalities, 'NATIONALITIES');
    $insertArray($destinations,  'DESTINATIONS');
    $insertArray($ageGroups,     'AGE GROUPS');
    $insertArray($products,      'PRODUCTS');
    $insertArray($competitors,   'COMPETITORS');

    $baseDir = rtrim($PATHS['reports'], '/\\') . '/';
    if (!is_dir($baseDir) && !mkdir($baseDir, 0755, true)) {
        throw new Exception('Could not create reports directory.');
    }

    if (!is_writable($baseDir)) {
        throw new Exception('Reports directory is not writable.');
    }
    $uploadedPhotos = 0;
    
    foreach ($_FILES as $info) {

        if (!isset($info['name'])) {
            continue;
        }

        if (is_array($info['name'])) {
            foreach ($info['name'] as $k => $name) {
                if (($info['error'][$k] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK) {
                    $uploadedPhotos++;
                }
            }
        } else {
            if (($info['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK) {
                $uploadedPhotos++;
            }
        }
    }

    // ===== VALIDACIÓN DE CANTIDAD DE FOTOS =====

    if ($reportType === 'EXPRESS') {

        if ($expressPhotosRequired === 1) {

            if ($uploadedPhotos < 3) {
                throw new Exception(
                    'At least 3 photos are required for this Express Report.'
                );
            }

            if ($uploadedPhotos > 6) {
                throw new Exception(
                    'A maximum of 6 photos is allowed for this Express Report.'
                );
            }
        }

    } else {

        // Staffing Report actual: conserva su comportamiento
        if ($uploadedPhotos < 1) {
            throw new Exception('At least one photo is required.');
        }
    }
    
    
    $fileCounter = 1;

    $sanEvent = preg_replace('/[^A-Za-z0-9_-]/', '_', $eventName);
    $sanEvent = preg_replace('/_+/', '_', $sanEvent);
    $sanEvent = trim((string)$sanEvent, '_');

    $sanCode = preg_replace('/[^A-Za-z0-9]/', '', $promoterCode);
    $timestamp = date('YmdHis');

    foreach ($_FILES as $fieldName => $info) {
        if (!isset($info['name'])) continue;

        $isMultiple = is_array($info['name']);
        $countFiles = $isMultiple ? count($info['name']) : 1;

        for ($i = 0; $i < $countFiles; $i++) {
            $err = $isMultiple ? ($info['error'][$i] ?? UPLOAD_ERR_NO_FILE) : ($info['error'] ?? UPLOAD_ERR_NO_FILE);
            if ($err !== UPLOAD_ERR_OK) continue;

            $tmpPath = $isMultiple ? $info['tmp_name'][$i] : $info['tmp_name'];
            if (!is_uploaded_file($tmpPath)) continue;

            $origName = $isMultiple ? ($info['name'][$i] ?? '') : ($info['name'] ?? '');
            $fileSize = (int)($isMultiple ? ($info['size'][$i] ?? 0) : ($info['size'] ?? 0));

            if ($fileSize <= 0) {
                throw new Exception('Empty uploaded image.');
            }

            $finfo = function_exists('finfo_open') ? finfo_open(FILEINFO_MIME_TYPE) : null;
            $mime  = $finfo ? finfo_file($finfo, $tmpPath) : (mime_content_type($tmpPath) ?: '');
            if ($finfo) finfo_close($finfo);

            $allowed = [
                'image/jpeg' => 'jpg',
                'image/png'  => 'png',
                'image/webp' => 'webp'
            ];

            if (!isset($allowed[$mime])) {
                throw new Exception('Invalid image type: ' . $mime);
            }

            $fileHash = hash_file('sha256', $tmpPath);
            if (!$fileHash) {
                throw new Exception('hash_failed');
            }

            $normalizedSha256 = rfComputeNormalizedSha256($tmpPath, $mime);
            $dHash = rfComputeDHash($tmpPath, $mime);

            $finalName = "{$pk}_{$sanEvent}_{$sanCode}_{$timestamp}_{$fileCounter}.jpg";
            $finalPath = $baseDir . $finalName;

            if (!@move_uploaded_file($tmpPath, $finalPath)) {
                throw new Exception('Failed moving uploaded image.');
            }

            @chmod($finalPath, 0644);

            $savedMime = mime_content_type($finalPath) ?: $mime;
            $savedSize = filesize($finalPath) ?: $fileSize;

            $stmtReportFile = $pdo->prepare("
                INSERT INTO reportsFiles (
                    idReportHeader,
                    fileName,
                    fileHash,
                    promoterName,
                    visualHash,
                    sourceMime,
                    fileSize,
                    normalizedSha256
                ) VALUES (
                    :idReportHeader,
                    :fileName,
                    :fileHash,
                    :promoterName,
                    :visualHash,
                    :sourceMime,
                    :fileSize,
                    :normalizedSha256
                )
            ");

            $stmtReportFile->execute([
                ':idReportHeader'   => $idReportHeader,
                ':fileName'         => $finalName,
                ':fileHash'         => $fileHash,
                ':promoterName'     => $promoterName,
                ':visualHash'       => $dHash,
                ':sourceMime'       => $savedMime,
                ':fileSize'         => $savedSize,
                ':normalizedSha256' => $normalizedSha256
            ]);

            // Como reports es privado, guardamos el nombre del archivo, no una URL pública
            $stDetail->execute([
                ':pk'           => $pk,
                ':recordType'   => 'FILES',
                ':recordValue'  => $finalName,
                ':originalDate' => $now,
                ':insertDate'   => $now,
            ]);

            $fileCounter++;
        }
    }

    if (!empty($_POST['sales_qty']) && !empty($_POST['sales_product']) && !empty($_POST['sales_amount'])) {
        $qtys          = $_POST['sales_qty'];
        $productsSales = $_POST['sales_product'];
        $amounts       = $_POST['sales_amount'];

        $n = min(count($qtys), count($productsSales), count($amounts));
        if ($n === 0) {
            throw new Exception('Sales vacío.');
        }

        $lines = [];
        $total = 0.0;

        for ($i = 0; $i < $n; $i++) {
            $q   = (int)$qtys[$i];
            $pr  = trim((string)$productsSales[$i]);
            $raw = preg_replace('/[^\d\.\-]/', '', (string)$amounts[$i]);
            $am  = (float)($raw === '' ? '0' : $raw);

            if ($q > 0 && $pr !== '') {
                $lines[] = [
                    'qty'     => $q,
                    'product' => $pr,
                    'amount'  => $am
                ];
                $total += $am;
            }
        }

        if (!count($lines)) {
            throw new Exception('Sin líneas válidas de ventas.');
        }

        $stmt = $pdo->prepare("SELECT id FROM salesReports WHERE pk = ?");
        $stmt->execute([$pk]);
        $salesReportId = $stmt->fetchColumn();

        if ($salesReportId) {
            $stmt = $pdo->prepare("
                UPDATE salesReports
                SET promoterCode = ?, promoterName = ?, 
                reportDate = ?, sourceText = ?, 
                totalAmount = ?, updatedAt = NOW()
                WHERE id = ?
            ");
            $stmt->execute([
                $promoterCode,
                $promoterName,
                $reportDateForDB,
                $salesReportText,
                $total,
                $salesReportId
            ]);

            $stmt = $pdo->prepare("DELETE FROM salesReportLines WHERE salesReportId = ?");
            $stmt->execute([$salesReportId]);
        } else {
            $stmt = $pdo->prepare("
                INSERT INTO salesReports (pk, promoterCode, promoterName, reportDate, sourceText, totalAmount)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $pk,
                $promoterCode,
                $promoterName,
                $reportDateForDB,
                $salesReportText,
                $total
            ]);

            $salesReportId = (int)$pdo->lastInsertId();
        }

        $ins = $pdo->prepare("
            INSERT INTO salesReportLines (salesReportId, lineNo, qty, product, amount)
            VALUES (?, ?, ?, ?, ?)
        ");

        $ln = 1;
        foreach ($lines as $r) {
            $ins->execute([
                $salesReportId,
                $ln++,
                $r['qty'],
                $r['product'],
                $r['amount']
            ]);
        }

        $responseSales = [
            'id'    => $salesReportId,
            'rows'  => count($lines),
            'total' => $total
        ];
    }

    $pdo->commit();

    $response['ok']         = true;
    $response['nextAction'] = 'CHECK_OUT';
    $response['message']    = 'Report saved. Proceed to CHECK OUT.';

    if (isset($responseSales)) {
        $response['sales'] = $responseSales;
    }

    @file_put_contents(
        $debugFile,
        sprintf(
            "[%s] OK pk:%s promoter:%s files:%d\n",
            date('Y-m-d H:i:s'),
            $pk,
            $promoterCode,
            $fileCounter - 1
        ),
        FILE_APPEND
    );

} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    @file_put_contents(
        $debugFile,
        sprintf(
            "[%s] ERROR: %s | POST:%s | FILES_SUMMARY:%s\n",
            date('Y-m-d H:i:s'),
            $e->getMessage(),
            json_encode($_POST),
            json_encode(array_keys($_FILES))
        ),
        FILE_APPEND
    );

    $response['error'] = $e->getMessage();

} finally {
    try {
        Database::closeConnection($__caller, $__user, $__ip, $__country, $__city);
    } catch (Throwable $e) {
        $pdo = null;
    }
}

echo json_encode($response);
exit;
?>