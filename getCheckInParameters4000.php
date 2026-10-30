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
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $pdo->query("
        SELECT
            idParameter,
            geoRequiredCheckIn,
            geoRequiredStartBreak,
            geoRequiredEndBreak,
            geoRequiredCheckOut,
            photoRequiredCheckIn,
            photoRequiredStartBreak,
            photoRequiredEndBreak,
            photoRequiredCheckOut,
            applyDistanceForCheckIn,
            maxDistanceForCheckIn,
            applyDistanceForStartBreak,
            maxDistanceForStartBreak,
            applyDistanceForEndBreak,
            maxDistanceForEndBreak,
            applyDistanceForCheckOut,
            maxDistanceForCheckOut,
            maxBreaks,
            applyTimeBeforeCheckIn,
            minMinutesBeforeCheckIn,
            applyTimeBeforeCheckOut,
            minMinutesBeforeCheckOut,
            reportRequiredForCheckOut,
            faceDetectionIn,
            environmentAnalysisIn,
            faceDetectionOut,
            environmentAnalysisOut
        FROM checkInParameters
        ORDER BY idParameter ASC
        LIMIT 1
    ");

    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        echo json_encode([
            'ok' => false,
            'message' => 'No parameter row found in checkInParameters.'
        ], JSON_UNESCAPED_UNICODE);
        return;
    }

    echo json_encode([
        'ok' => true,
        'data' => $row
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    file_put_contents(
        $debugFile,
        "[" . date('Y-m-d H:i:s') . "] ❌ {$__caller} ERROR: " . $e->getMessage() . "\n",
        FILE_APPEND
    );

    echo json_encode([
        'ok' => false,
        'message' => 'Server error while loading parameters.',
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
?>