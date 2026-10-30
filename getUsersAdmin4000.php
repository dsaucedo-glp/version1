<?php
header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__, 2) . '/private/core/bootstrap.php';
require_once $PATHS['core'] . 'dbConnectGo.php';

$__caller  = basename(__FILE__);
$__user    = strtoupper(trim((string)($_GET['code'] ?? '')));
$__ip      = $_GET['ip'] ?? 'Unknown';
$__country = $_GET['country'] ?? 'Unknown';
$__city    = $_GET['city'] ?? 'Unknown';

$pdo = null;
$debugFile = rtrim($PATHS['logs'], '/\\') . '/debug_log.txt';

try {
    $pdo = Database::getInstance()->getConnection($__caller, $__user !== '' ? $__user : 'Unknown', $__ip, $__country, $__city);

    if (!$pdo) {
        throw new Exception('Database connection not available.');
    }

    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $sql = "
        SELECT
            idPromoter,
            promoterCode,
            promoterName,
            market,
            stateCode,
            phone,
            email,
            active,
            promoterStatus,
            blockedForUpdate,
            supervisorLevel,
            faceDetectionIn,
            faceDetectionOut,
            environmentAnalysisIn,
            environmentAnalysisOut,
            geoRequiredIn,
            geoRequiredOut,
            photoRequiredIn,
            photoRequiredOut
        FROM promoters 
        WHERE promoterName NOT LIKE '%:%'
        ORDER BY promoterName ASC, promoterCode ASC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'ok' => true,
        'data' => $rows
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    file_put_contents(
        $debugFile,
        "[" . date('Y-m-d H:i:s') . "] ❌ {$__caller} ERROR: " . $e->getMessage() . "\n",
        FILE_APPEND
    );

    echo json_encode([
        'ok' => false,
        'message' => 'Error loading users.',
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
} finally {
    try {
        Database::closeConnection($__caller, $__user !== '' ? $__user : 'Unknown', $__ip, $__country, $__city);
    } catch (Throwable $t) {
        file_put_contents(
            $debugFile,
            "[" . date('Y-m-d H:i:s') . "] ⚠️ closeConnection error: " . $t->getMessage() . "\n",
            FILE_APPEND
        );
    }
    $pdo = null;
}
