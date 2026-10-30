<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__, 2) . '/private/core/bootstrap.php';
require_once $PATHS['core'] . 'dbConnectGo.php';
require_once $PATHS['core'] . 'communications.php';

$DEBUG_LOG = rtrim($PATHS['logs'], '/\\') . '/debug_log.txt';

function dlog_reimb(string $msg): void
{
    global $DEBUG_LOG;
    @file_put_contents($DEBUG_LOG, '[' . date('Y-m-d H:i:s') . '] ' . $msg . PHP_EOL, FILE_APPEND);
}

function respond_json(array $payload, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function clean_str($v, int $max = 255): string
{
    $s = trim((string)($v ?? ''));
    if ($s === '') return '';
    return mb_substr($s, 0, $max);
}

function valid_date_or_null($v): ?string
{
    $s = trim((string)($v ?? ''));
    if ($s === '') return null;
    $ts = strtotime($s);
    if ($ts === false) return null;
    return date('Y-m-d', $ts);
}

function sanitize_file_part(string $s): string
{
    $s = trim($s);
    $s = str_replace([' ', '/', '\\'], '_', $s);
    $s = preg_replace('/[^A-Za-z0-9_\-\.]/u', '_', $s);
    return preg_replace('/_+/', '_', $s);
}

function detect_mime(string $tmp): string
{
    $finfo = function_exists('finfo_open') ? finfo_open(FILEINFO_MIME_TYPE) : null;
    $mime  = $finfo ? finfo_file($finfo, $tmp) : (mime_content_type($tmp) ?: '');
    if ($finfo) finfo_close($finfo);
    return (string)$mime;
}

function sendReimbEmail(array $payload): array
{
    $to = trim((string)($payload['promoterEmail'] ?? ''));
    if ($to === '') return ['ok' => false, 'error' => 'empty_to'];

    $idReimb      = htmlspecialchars((string)($payload['idReimb'] ?? ''), ENT_QUOTES, 'UTF-8');
    $promoterName = htmlspecialchars((string)($payload['promoterName'] ?? ''), ENT_QUOTES, 'UTF-8');
    $promoterCode = htmlspecialchars((string)($payload['promoterCode'] ?? ''), ENT_QUOTES, 'UTF-8');
    $pk           = htmlspecialchars((string)($payload['pk'] ?? ''), ENT_QUOTES, 'UTF-8');
    $eventName    = htmlspecialchars((string)($payload['eventName'] ?? ''), ENT_QUOTES, 'UTF-8');
    $amount       = htmlspecialchars((string)($payload['amount'] ?? ''), ENT_QUOTES, 'UTF-8');
    $submittedRaw = trim((string)($payload['submittedDate'] ?? ''));
    $submittedTs = $submittedRaw !== '' ? strtotime($submittedRaw) : false;
    $submitted = $submittedTs !== false ? date('D m/d/Y', $submittedTs) : '';
    $count        = (int)($payload['receiptsCount'] ?? 0);
    $expensesDateRaw = trim((string)($payload['expensesDate'] ?? ''));
    $expensesDateTs = $expensesDateRaw !== '' ? strtotime($expensesDateRaw) : false;
    $expensesDate = $expensesDateTs !== false ? date('D m/d/Y', $expensesDateTs) : '';
    $expensesType = htmlspecialchars((string)($payload['expensesType'] ?? ''), ENT_QUOTES, 'UTF-8');
    $description  = htmlspecialchars((string)($payload['description'] ?? ''), ENT_QUOTES, 'UTF-8');

    $subject = 'Reimbursement Request Received';

    // =====================================================
    // GO LOCAL BRAND LOGO — EMBEDDED EMAIL IMAGE
    // =====================================================

    $logoPath = dirname(__DIR__) . '/img/GoLocalLogoWhite148.png';
    $logoCid = 'golocal_brand_logo';

    $emailImages = [];
    $logoHtml = '';

    if (is_file($logoPath) && is_readable($logoPath)) {

        $emailImages[] = [
            'path' => $logoPath,
            'cid'  => $logoCid,
            'name' => 'GoLocalLogoWhite148.png'
        ];

        $logoHtml = '<img src="cid:' . $logoCid . '"
        alt="Go Local Promotions"
        width="180"
        style="display:block;width:180px;max-width:100%;height:auto;border:0;">';
    }

    // =====================================================
    // GO LOCAL 4.0 — REIMBURSEMENT EMAIL TEMPLATE
    // =====================================================

    $html = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
</head>

<body style="margin:0;padding:0;background:#E7E7E7;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
       style="background:#E7E7E7;">
<tr>
<td align="center" style="padding:24px 12px;">

<table role="presentation" width="600" cellpadding="0" cellspacing="0"
       style="width:100%;max-width:600px;background:#FFFFFF;">

<!-- HEADER -->
<tr>
<td align="center"
    style="background:#010F3C;padding:28px 32px;text-align:center;">
    {$logoHtml}
</td>
</tr>

<!-- BRAND DIVIDER -->
<tr>
<td style="height:5px;background:linear-gradient(90deg,#FF1B59,#FF4F2A);
           font-size:0;line-height:0;">
&nbsp;
</td>
</tr>

<!-- TITLE -->
<tr>
<td style="padding:32px 32px 10px;">

<div style="font-family:'Oswald','Arial Narrow',Arial,sans-serif;
            font-size:27px;font-weight:bold;color:#FF4F2A;">
REIMBURSEMENT REQUEST
</div>

<div style="font-family:Arial,sans-serif;font-size:15px;
            color:#010F3C;margin-top:8px;">
Request Received Successfully
</div>

</td>
</tr>

<!-- PROMOTER -->
<tr>
<td style="padding:16px 32px 28px;">

<div style="font-family:'Oswald','Arial Narrow',Arial,sans-serif;
            font-size:30px;font-weight:bold;color:#010F3C;">
{$promoterName}
</div>


<!-- DETAILS -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
       style="margin-top:24px;border-top:1px solid #E7E7E7;">

<tr>
<td style="padding:16px 0;border-bottom:1px solid #E7E7E7;
           font-size:12px;font-weight:bold;letter-spacing:1px;
           color:#595959;width:34%;">
REIMBURSEMENT ID
</td>
<td style="padding:16px 0;border-bottom:1px solid #E7E7E7;
           font-size:15px;color:#010F3C;">
{$idReimb}
</td>
</tr>

<tr>
<td style="padding:16px 0;border-bottom:1px solid #E7E7E7;
           font-size:12px;font-weight:bold;letter-spacing:1px;
           color:#595959;">
SHIFT
</td>
<td style="padding:16px 0;border-bottom:1px solid #E7E7E7;
           font-size:15px;color:#010F3C;">
{$eventName}
</td>
</tr>

<tr>
<td style="padding:16px 0;border-bottom:1px solid #E7E7E7;
           font-size:12px;font-weight:bold;letter-spacing:1px;
           color:#595959;">
SHIFT ID
</td>
<td style="padding:16px 0;border-bottom:1px solid #E7E7E7;
           font-size:15px;color:#010F3C;">
{$pk}
</td>
</tr>

<!-- EXPENSES DATE -->
<tr>
<td style="padding:16px 0;border-bottom:1px solid #E7E7E7;
           font-size:12px;font-weight:bold;letter-spacing:1px;
           color:#595959;">
EXPENSES DATE
</td>
<td style="padding:16px 0;border-bottom:1px solid #E7E7E7;
           font-size:15px;color:#010F3C;">
{$expensesDate}
</td>
</tr>

<!-- EXPENSES TYPE -->
<tr>
<td style="padding:16px 0;border-bottom:1px solid #E7E7E7;
           font-size:12px;font-weight:bold;letter-spacing:1px;
           color:#595959;">
EXPENSES TYPE
</td>
<td style="padding:16px 0;border-bottom:1px solid #E7E7E7;
           font-size:15px;color:#010F3C;">
{$expensesType}
</td>
</tr>

<!-- DESCRIPTION -->
<tr>
<td style="padding:16px 0;border-bottom:1px solid #E7E7E7;
           font-size:12px;font-weight:bold;letter-spacing:1px;
           color:#595959;">
DESCRIPTION
</td>
<td style="padding:16px 0;border-bottom:1px solid #E7E7E7;
           font-size:15px;line-height:1.5;color:#010F3C;
           overflow-wrap:anywhere;">
{$description}
</td>
</tr>

<!-- RECEIPTS -->
<tr>
<td style="padding:16px 0;border-bottom:1px solid #E7E7E7;
           font-size:12px;font-weight:bold;letter-spacing:1px;
           color:#595959;">
RECEIPTS
</td>
<td style="padding:16px 0;border-bottom:1px solid #E7E7E7;
           font-size:15px;color:#010F3C;">
{$count}
</td>
</tr>

<tr>
<td style="padding:18px 0;border-bottom:1px solid #E7E7E7;
           font-size:12px;font-weight:bold;letter-spacing:1px;
           color:#595959;">
TOTAL AMOUNT
</td>
<td style="padding:18px 0;border-bottom:1px solid #E7E7E7;
           font-family:'Oswald','Arial Narrow',Arial,sans-serif;
           font-size:25px;font-weight:bold;color:#FF4F2A;">
\${$amount}
</td>
</tr>

<tr>
<td style="padding:16px 0;border-bottom:1px solid #E7E7E7;
           font-size:12px;font-weight:bold;letter-spacing:1px;
           color:#595959;">
SUBMITTED
</td>
<td style="padding:16px 0;border-bottom:1px solid #E7E7E7;
           font-size:15px;color:#010F3C;">
{$submitted}
</td>
</tr>

</table>
</td>
</tr>

<!-- FOOTER -->
<tr>
<td style="background:#010F3C;padding:22px 32px;color:#FFFFFF;">

<div style="font-family:Arial,sans-serif;font-size:13px;
            letter-spacing:.5px;margin-bottom:7px;">
GO LOCAL AUTOMATED MESSAGES
</div>

<div style="font-family:Arial,sans-serif;font-size:11px;line-height:1.4;">

<a href="https://golocalpromos.com"
   style="color:#FFFFFF;text-decoration:none;">
GOLOCALPROMOS.COM
</a>

&nbsp;&middot;&nbsp; @GOLOCALPROMOS
&nbsp;&middot;&nbsp; MIAMI, FLORIDA

</div>
</td>
</tr>

</table>
</td>
</tr>
</table>

</body>
</html>
HTML;

    // =====================================================
    // GO LOCAL 4.0 — SMTP EMAIL DELIVERY
    // =====================================================

    $emailResult = glpSendEmailSmtp(
        'G',
        [$to],
        [],
        [],
        $subject,
        $html,
        $emailImages,
        []
    );

    return [
        'ok' => !empty($emailResult['ok']),
        'error' => !empty($emailResult['ok'])
            ? null
            : ($emailResult['error'] ?? 'smtp_failed')
    ];
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        respond_json(['ok' => false, 'error' => 'method_not_allowed'], 405);
    }

    $ip      = clean_str($_POST['ip'] ?? '', 50);
    $country = clean_str($_POST['country'] ?? '', 80);
    $city    = clean_str($_POST['city'] ?? '', 80);

    $promoterCode  = clean_str($_POST['promoterCode'] ?? ($_POST['code'] ?? ''), 20);
    $promoterName  = clean_str($_POST['promoterName'] ?? '', 100);
    $promoterEmail = clean_str($_POST['promoterEmail'] ?? '', 150);

    $pk          = clean_str($_POST['shiftPk'] ?? '', 20);
    $eventName   = clean_str($_POST['eventName'] ?? '', 200);
    $longIdShift = clean_str($_POST['longIdShift'] ?? '', 500);

    $receiptsMetaRaw = trim((string)($_POST['receiptsMeta'] ?? ''));
    $receiptsMeta = json_decode($receiptsMetaRaw, true);

    if ($promoterCode === '' || $promoterName === '' || $pk === '') {
        respond_json(['ok' => false, 'error' => 'missing_required_header'], 400);
    }

    if (!is_array($receiptsMeta) || count($receiptsMeta) === 0) {
        respond_json(['ok' => false, 'error' => 'receipts_required', 'detail' => 'At least one receipt is required.'], 400);
    }

    if (!isset($_FILES['receipts']) || !is_array($_FILES['receipts']['name'])) {
        respond_json(['ok' => false, 'error' => 'receipt_files_required'], 400);
    }

    $countFiles = count($_FILES['receipts']['name']);

    if ($countFiles !== count($receiptsMeta)) {
        respond_json(['ok' => false, 'error' => 'receipt_files_meta_mismatch'], 400);
    }

    $db = Database::getInstance();
    $pdo = $db->getConnection(basename(__FILE__), $promoterCode, $ip, $country, $city);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmtParams = $pdo->query("SELECT maxReceiptsPerRequest FROM reimbursementParameters LIMIT 1");
    $maxReceiptsPerRequest = (int)($stmtParams->fetchColumn() ?: 1);
    if ($maxReceiptsPerRequest < 1) $maxReceiptsPerRequest = 1;

    if ($countFiles > $maxReceiptsPerRequest) {
        respond_json([
            'ok' => false,
            'error' => 'max_receipts_exceeded',
            'detail' => "Maximum {$maxReceiptsPerRequest} receipt(s) allowed."
        ], 400);
    }

    $totalAmount = 0.0;
    $firstDate = null;
    $firstType = '';
    $descParts = [];

    foreach ($receiptsMeta as $idx => $r) {
        $amt = (float)($r['amount'] ?? 0);
        if ($amt <= 0) {
            respond_json(['ok' => false, 'error' => 'invalid_amount', 'detail' => 'Invalid amount in receipt #' . ($idx + 1)], 400);
        }

        $type = clean_str($r['expenseType'] ?? '', 100);
        $desc = clean_str($r['expenseDescription'] ?? '', 255);

        if ($type === '' || $desc === '') {
            respond_json(['ok' => false, 'error' => 'missing_receipt_fields', 'detail' => 'Missing fields in receipt #' . ($idx + 1)], 400);
        }

        $totalAmount += $amt;
        if ($firstDate === null) $firstDate = valid_date_or_null($r['expenseDate'] ?? null);
        if ($firstType === '') $firstType = $type;
        $descParts[] = '#' . ($idx + 1) . ' ' . $desc . ' $' . number_format($amt, 2, '.', '');
    }

    $totalAmountSql = number_format($totalAmount, 2, '.', '');
    $today = date('Y-m-d');
    $now   = date('Y-m-d H:i:s');

    $headerDescription = count($receiptsMeta) === 1
        ? clean_str($receiptsMeta[0]['expenseDescription'] ?? '', 400)
        : clean_str('Multiple receipts: ' . implode(' | ', $descParts), 400);

    $headerExpenseType = count($receiptsMeta) === 1
        ? clean_str($receiptsMeta[0]['expenseType'] ?? '', 100)
        : 'MULTIPLE';

    $pdo->beginTransaction();

    $sql = "INSERT INTO `reimbursements`
        (`pk`, `promoterCode`, `promoterName`, `description`, `amount`,
         `expensesType`, `expensesDate`, `submittedDate`,
         `approved`, `rejected`,
         `approvedByCode`, `approvedByName`, `approvedDate`,
         `rejectedByCode`, `rejectedByName`, `rejectedDate`,
         `insertDatetime`, `updateDatetime`, `longIdShift`)
        VALUES
        (:pk, :promoterCode, :promoterName, :description, :amount,
         :expensesType, :expensesDate, :submittedDate,
         :approved, :rejected,
         :approvedByCode, :approvedByName, :approvedDate,
         :rejectedByCode, :rejectedByName, :rejectedDate,
         :insertDatetime, :updateDatetime, :longIdShift)";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':pk'             => mb_substr($pk, 0, 20),
        ':promoterCode'   => mb_substr($promoterCode, 0, 20),
        ':promoterName'   => mb_substr($promoterName, 0, 100),
        ':description'    => mb_substr($headerDescription, 0, 400),
        ':amount'         => $totalAmountSql,
        ':expensesType'   => mb_substr($headerExpenseType, 0, 100),
        ':expensesDate'   => $firstDate,
        ':submittedDate'  => $today,
        ':approved'       => 0,
        ':rejected'       => 0,
        ':approvedByCode' => null,
        ':approvedByName' => null,
        ':approvedDate'   => null,
        ':rejectedByCode' => null,
        ':rejectedByName' => null,
        ':rejectedDate'   => null,
        ':insertDatetime' => $now,
        ':updateDatetime' => $now,
        ':longIdShift'    => $longIdShift
    ]);

    $idReimb = (int)$pdo->lastInsertId();

    $dir = rtrim($PATHS['receipts'], '/\\') . '/';
    if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
        throw new RuntimeException('mk_receipts_failed');
    }

    if (!is_writable($dir)) {
        throw new RuntimeException('receipts_dir_not_writable');
    }

    $allowed = [
        'image/jpeg'      => 'jpg',
        'image/png'       => 'png',
        'image/webp'      => 'webp',
        'application/pdf' => 'pdf'
    ];

    $insertReceiptSql = "INSERT INTO reimbursementReceipts
        (idReimbursement, expenseType, expenseDate, expenseDescription, amount,
         photoPath, originalFileName, fileHash, fileMime, fileSize,
         normalizedSha256, visualHash, createdAt)
        VALUES
        (:idReimbursement, :expenseType, :expenseDate, :expenseDescription, :amount,
         :photoPath, :originalFileName, :fileHash, :fileMime, :fileSize,
         :normalizedSha256, :visualHash, :createdAt)";

    $stmtReceipt = $pdo->prepare($insertReceiptSql);

    $firstPublicUrl = null;
    $savedFiles = [];

    for ($i = 0; $i < $countFiles; $i++) {
        $meta = $receiptsMeta[$i];

        if ($_FILES['receipts']['error'][$i] !== UPLOAD_ERR_OK) {
            throw new RuntimeException('upload_error_receipt_' . ($i + 1) . ': ' . $_FILES['receipts']['error'][$i]);
        }

        $tmp = $_FILES['receipts']['tmp_name'][$i];
        $size = (int)($_FILES['receipts']['size'][$i] ?? 0);
        $originalName = (string)($_FILES['receipts']['name'][$i] ?? ('receipt_' . ($i + 1)));

        if ($size <= 0) throw new RuntimeException('empty_file_' . ($i + 1));
        if ($size > 12 * 1024 * 1024) throw new RuntimeException('too_big_' . ($i + 1));

        $mime = detect_mime($tmp);
        if (!isset($allowed[$mime])) {
            throw new RuntimeException('bad_type_receipt_' . ($i + 1) . ': ' . $mime);
        }

        $ext = $allowed[$mime];

        $fileHash = hash_file('sha256', $tmp);
        if (!$fileHash) throw new RuntimeException('hash_failed_' . ($i + 1));

        $stmtDup = $pdo->prepare("
            SELECT idReceipt, idReimbursement, originalFileName, createdAt
            FROM reimbursementReceipts
            WHERE fileHash = :fileHash
            LIMIT 1
        ");
        $stmtDup->execute([':fileHash' => $fileHash]);
        $dup = $stmtDup->fetch(PDO::FETCH_ASSOC);

        if ($dup) {
            throw new RuntimeException(
                'Duplicate receipt: This receipt has already been used in reimbursement ID ' .
                    $dup['idReimbursement']
            );
        }

        $idMask = str_pad((string)$idReimb, 5, '0', STR_PAD_LEFT);
        $fileName =
            $idMask . '_' .
            sanitize_file_part($promoterCode) . '_' .
            sanitize_file_part($pk) . '_R' . ($i + 1) . '_' .
            date('YmdHi') . '.' . $ext;

        $destAbs = $dir . $fileName;

        if (!move_uploaded_file($tmp, $destAbs)) {
            throw new RuntimeException('move_failed_' . ($i + 1));
        }

        @chmod($destAbs, 0644);

        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host   = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $publicUrl = $scheme . '://' . $host . rtrim($PATHS['public_receipts_url'], '/\\') . '/' . $fileName;

        if ($firstPublicUrl === null) {
            $firstPublicUrl = $publicUrl;
        }

        $stmtReceipt->execute([
            ':idReimbursement'    => $idReimb,
            ':expenseType'        => mb_substr(clean_str($meta['expenseType'] ?? '', 100), 0, 100),
            ':expenseDate'        => valid_date_or_null($meta['expenseDate'] ?? null),
            ':expenseDescription' => mb_substr(clean_str($meta['expenseDescription'] ?? '', 255), 0, 255),
            ':amount'             => number_format((float)($meta['amount'] ?? 0), 2, '.', ''),
            ':photoPath'          => $publicUrl,
            ':originalFileName'   => mb_substr($originalName, 0, 255),
            ':fileHash'           => $fileHash,
            ':fileMime'           => $mime,
            ':fileSize'           => $size,
            ':normalizedSha256'   => null,
            ':visualHash'         => null,
            ':createdAt'          => $now
        ]);

        $savedFiles[] = $fileName;
    }

    if ($firstPublicUrl !== null) {
        $stmtUpd = $pdo->prepare("
            UPDATE reimbursements
            SET photoPath = :photoPath
            WHERE idReimbursement = :idReimbursement
        ");
        $stmtUpd->execute([
            ':photoPath' => $firstPublicUrl,
            ':idReimbursement' => $idReimb
        ]);
    }

    $pdo->commit();

    $emailSent = false;
    $emailErr = null;

    try {
        $mailRes = sendReimbEmail([
            'idReimb' => $idReimb,
            'promoterCode' => $promoterCode,
            'promoterName' => $promoterName,
            'promoterEmail' => $promoterEmail,
            'pk' => $pk,
            'eventName' => $eventName,
            'amount' => $totalAmountSql,
            'submittedDate' => $today,
            'receiptsCount' => $countFiles,
            'expensesDate' => $firstDate,
            'expensesType' => $headerExpenseType,
            'description' => $headerDescription
        ]);

        $emailSent = (bool)($mailRes['ok'] ?? false);
        $emailErr = $mailRes['error'] ?? null;
    } catch (Throwable $mailEx) {
        $emailSent = false;
        $emailErr = $mailEx->getMessage();
    }

    dlog_reimb("✅ INSERT reimbursement id={$idReimb} receipts={$countFiles} total={$totalAmountSql} by {$promoterCode}");

    respond_json([
        'ok' => true,
        'idReimb' => $idReimb,
        'receiptsInserted' => $countFiles,
        'files' => $savedFiles,
        'totalAmount' => $totalAmountSql,
        'emailSent' => $emailSent,
        'emailError' => $emailErr,
        'message' => 'Inserted'
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    dlog_reimb("❌ ERROR submitReimb3101: " . $e->getMessage());

    respond_json([
        'ok' => false,
        'error' => 'server_error',
        'detail' => $e->getMessage()
    ], 500);
}
