<?php
header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__, 2) . '/private/core/bootstrap.php';
require_once $PATHS['core'] . 'dbConnectGo.php';

$pdo = null;

$__caller  = basename(__FILE__);
$__ip      = $_POST['ip'] ?? 'Unknown';
$__country = $_POST['country'] ?? 'Unknown';
$__city    = $_POST['city'] ?? 'Unknown';
$__user    = isset($_POST['code']) ? strtoupper(trim((string)$_POST['code'])) : 'Unknown';

$debugFile = rtrim($PATHS['logs'], '/\\') . '/debug_log.txt';

try {
    $pdo = Database::getInstance()->getConnection($__caller, $__user, $__ip, $__country, $__city);

    if (!$pdo) {
        throw new Exception('Database connection not available.');
    }

    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $idPromoter = isset($_POST['idPromoter']) ? (int)$_POST['idPromoter'] : 0;
    $supervisorLevel = isset($_POST['supervisorLevel']) ? (int)$_POST['supervisorLevel'] : 0;
    $active = isset($_POST['active']) ? (int)$_POST['active'] : 0;
    $blockedForUpdate = isset($_POST['blockedForUpdate']) ? (int)$_POST['blockedForUpdate'] : 0;

    if ($idPromoter <= 0) {
        throw new Exception('Invalid promoter id.');
    }

    if ($supervisorLevel < 0) {
        $supervisorLevel = 0;
    }

    $active = ($active === 1) ? 1 : 0;
    $blockedForUpdate = ($blockedForUpdate === 1) ? 1 : 0;
    $faceDetectionIn = (isset($_POST['faceDetectionIn']) && (int)$_POST['faceDetectionIn'] === 1) ? 1 : 0;
    $faceDetectionOut = (isset($_POST['faceDetectionOut']) && (int)$_POST['faceDetectionOut'] === 1) ? 1 : 0;
    $environmentAnalysisIn = (isset($_POST['environmentAnalysisIn']) && (int)$_POST['environmentAnalysisIn'] === 1) ? 1 : 0;
    $environmentAnalysisOut = (isset($_POST['environmentAnalysisOut']) && (int)$_POST['environmentAnalysisOut'] === 1) ? 1 : 0;
    $geoRequiredIn = (isset($_POST['geoRequiredIn']) && (int)$_POST['geoRequiredIn'] === 1) ? 1 : 0;
    $geoRequiredOut = (isset($_POST['geoRequiredOut']) && (int)$_POST['geoRequiredOut'] === 1) ? 1 : 0;
    $photoRequiredIn = (isset($_POST['photoRequiredIn']) && (int)$_POST['photoRequiredIn'] === 1) ? 1 : 0;
    $photoRequiredOut = (isset($_POST['photoRequiredOut']) && (int)$_POST['photoRequiredOut'] === 1) ? 1 : 0;

    $sql = "
        UPDATE promoters
        SET
            supervisorLevel = :supervisorLevel,
            active = :active,
            blockedForUpdate = :blockedForUpdate,
            faceDetectionIn = :faceDetectionIn,
            faceDetectionOut = :faceDetectionOut,
            environmentAnalysisIn = :environmentAnalysisIn,
            environmentAnalysisOut = :environmentAnalysisOut,
            geoRequiredIn = :geoRequiredIn,
            geoRequiredOut = :geoRequiredOut,
            photoRequiredIn = :photoRequiredIn,
            photoRequiredOut = :photoRequiredOut
        WHERE idPromoter = :idPromoter
        LIMIT 1
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':supervisorLevel' => $supervisorLevel,
        ':active' => $active,
        ':blockedForUpdate' => $blockedForUpdate,
        ':faceDetectionIn' => $faceDetectionIn,
        ':faceDetectionOut' => $faceDetectionOut,
        ':environmentAnalysisIn' => $environmentAnalysisIn,
        ':environmentAnalysisOut' => $environmentAnalysisOut,
        ':geoRequiredIn' => $geoRequiredIn,
        ':geoRequiredOut' => $geoRequiredOut,
        ':photoRequiredIn' => $photoRequiredIn,
        ':photoRequiredOut' => $photoRequiredOut,
        ':idPromoter' => $idPromoter
    ]);

    echo json_encode([
        'ok' => true,
        'message' => 'User updated successfully.'
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    file_put_contents(
        $debugFile,
        "[" . date('Y-m-d H:i:s') . "] ❌ {$__caller} ERROR: " . $e->getMessage() . "\n",
        FILE_APPEND
    );

    echo json_encode([
        'ok' => false,
        'message' => 'Error saving user.',
        'error' => $e->getMessage()
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
