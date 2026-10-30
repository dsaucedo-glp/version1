<?php
header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__, 2) . '/private/core/bootstrap.php';
require_once $PATHS['core'] . 'dbConnectGo.php';

$__caller  = basename(__FILE__);
$__ip      = $_GET['ip'] ?? ($_SERVER['REMOTE_ADDR'] ?? 'Unknown');
$__user    = isset($_GET['code']) ? strtoupper(trim((string)$_GET['code'])) : 'Unknown';
$__country = $_GET['country'] ?? 'Unknown';
$__city    = $_GET['city'] ?? 'Unknown';

$pdo = null;
$debugFile = rtrim($PATHS['logs'], '/\\') . '/debug_log.txt';

try {
    $dateFrom = trim((string)($_GET['dateFrom'] ?? ''));
    $dateTo   = trim((string)($_GET['dateTo'] ?? ''));

    if ($dateFrom === '' || $dateTo === '') {
        echo json_encode([
            'success' => false,
            'error'   => 'Missing dateFrom/dateTo'
        ], JSON_UNESCAPED_UNICODE);
        return;
    }

    if ($dateFrom > $dateTo) {
        echo json_encode([
            'success' => false,
            'error'   => 'dateFrom cannot be after dateTo'
        ], JSON_UNESCAPED_UNICODE);
        return;
    }

    $db  = Database::getInstance();
    $pdo = $db->getConnection($__caller, $__user, $__ip, $__country, $__city);

    $sql = "
        SELECT DISTINCT
            p.promoterCode,
            s.promoter AS promoterName
        FROM masterShifts s
        INNER JOIN promoters p ON p.promoterName = s.promoter
        WHERE s.shiftCalcDate BETWEEN :d1 AND :d2
          AND s.promoter IS NOT NULL
          AND s.promoter <> ''
          AND s.promoter <> 'CANCELLED'
          AND s.promoter <> 'OPEN'
        ORDER BY promoterName ASC
    ";

    $stmt = $pdo->prepare($sql);

    if (!$stmt) {
        throw new Exception('prepare_failed');
    }

    $stmt->bindValue(':d1', $dateFrom, PDO::PARAM_STR);
    $stmt->bindValue(':d2', $dateTo, PDO::PARAM_STR);
    $stmt->execute();

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success'   => true,
        'promoters' => $rows
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    file_put_contents(
        $debugFile,
        "[" . date('Y-m-d H:i:s') . "] ❌ {$__caller} ERROR: " . $e->getMessage() . "\n",
        FILE_APPEND
    );

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => $e->getMessage()
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