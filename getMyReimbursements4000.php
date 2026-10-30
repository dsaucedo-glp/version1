<?php
header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__, 2) . '/private/core/bootstrap.php';
require_once $PATHS['core'] . 'dbConnectGo.php';

$pdo = null;

$__caller  = basename(__FILE__);
$__user    = isset($_REQUEST['code']) ? strtoupper(trim((string)$_REQUEST['code'])) : (isset($_REQUEST['promoterCode']) ? strtoupper(trim((string)$_REQUEST['promoterCode'])) : 'Unknown');
$__ip      = $_REQUEST['ip'] ?? 'Unknown';
$__country = $_REQUEST['country'] ?? 'Unknown';
$__city    = $_REQUEST['city'] ?? 'Unknown';

$debugFile = rtrim($PATHS['logs'], '/\\') . '/debug_log.txt';

function fail($msg) {
    echo json_encode([
        'ok' => false,
        'message' => $msg,
        'items' => []
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $pdo = Database::getInstance()->getConnection($__caller, $__user, $__ip, $__country, $__city);

    if (!$pdo) {
        fail('Database connection is null.');
    }

    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $promoterCode = strtoupper(trim((string)($_REQUEST['promoterCode'] ?? $_REQUEST['code'] ?? '')));
    if ($promoterCode === '') {
        fail('Promoter code is required.');
    }

    $sql = "
        SELECT
            r.idReimbursement,
            r.promoterCode,
            r.promoterName,
            r.amount,
            r.expensesType,
            r.description,
            r.pk,
            r.expensesDate,
            r.submittedDate,
            r.status,
            r.approvedDate,
            r.rejectedDate,
            r.rejectionReason,
            r.checkedDate,
            r.checkedByName,
            r.checkedComments,
            r.photoPath,
            DATEDIFF(CURDATE(), DATE(COALESCE(r.submittedDate, r.insertDatetime, NOW()))) AS daysPending,
            s.eventName,
            s.shiftDate,
            r.approvedByName,
            r.sentToManagerByName,
            r.checkedByName,
            r.rejectedByName
        FROM reimbursements r
        LEFT JOIN masterShifts s ON s.pk = r.pk
        WHERE UPPER(TRIM(r.promoterCode)) = :promoterCode
        ORDER BY COALESCE(r.submittedDate, r.insertDatetime) DESC, r.idReimbursement DESC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':promoterCode' => $promoterCode
    ]);

    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'ok' => true,
        'items' => $items
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    file_put_contents(
        $debugFile,
        "[" . date('Y-m-d H:i:s') . "] ❌ {$__caller} ERROR: " . $e->getMessage() . "\n",
        FILE_APPEND
    );

    echo json_encode([
        'ok' => false,
        'message' => $e->getMessage(),
        'items' => []
    ], JSON_UNESCAPED_UNICODE);

} finally {
    try {
        Database::closeConnection($__caller, $__user, $__ip, $__country, $__city);
    } catch (Throwable $t) {
        file_put_contents(
            $debugFile,
            "[" . date('Y-m-d H:i:s') . "] ⚠️ closeConnection error: " . $t->getMessage() . "\n",
            FILE_APPEND
        );
    }
    $pdo = null;
}
?>