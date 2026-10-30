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

    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        header('Allow: GET');
        echo json_encode(['ok' => false, 'message' => 'GET required.']);
        return;
    }
    $stmtUser = $pdo->prepare("SELECT supervisorLevel FROM promoters WHERE promoterCode = :code AND active = 1 LIMIT 1");
    $stmtUser->execute([':code' => $__user]);
    $level = $stmtUser->fetchColumn();
    if ($__user === '' || $level === false || (int)$level < 5) {
        http_response_code(403);
        echo json_encode(['ok' => false, 'message' => 'System Admin access required.']);
        return;
    }

    $stmt = $pdo->query("SELECT idExpressParameters, geoRequiredIn, geoRequiredOut, photoRequiredIn, photoRequiredOut, faceDetectionIn, faceDetectionOut, environmentAnalysisIn, environmentAnalysisOut, active, minPhotosMandatoryReport, maxPhotosMandatoryReport, minPhotosOptionalReport, maxPhotosOptionalReport, createdAt, updatedAt FROM expressParameters ORDER BY idExpressParameters ASC LIMIT 1");
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    echo json_encode($row ? ['ok' => true, 'data' => $row] : ['ok' => false, 'message' => 'No parameter row found in expressParameters.'], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    file_put_contents(
        $debugFile,
        "[" . date('Y-m-d H:i:s') . "] ❌ {$__caller} ERROR: " . $e->getMessage() . "\n",
        FILE_APPEND
    );

    echo json_encode([
        'ok' => false,
        'message' => 'Server error while loading parameters.'

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