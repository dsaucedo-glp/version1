<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once dirname(__DIR__, 2) . '/private/core/bootstrap.php';
require_once $PATHS['core'] . 'dbConnectGo.php';

$__caller  = basename(__FILE__);
$__ip      = $_POST['ip'] ?? ($_SERVER['REMOTE_ADDR'] ?? 'Unknown');
$__user    = isset($_POST['code']) ? trim((string)$_POST['code']) : 'Unknown';
$__country = $_POST['country'] ?? 'Unknown';
$__city    = $_POST['city'] ?? 'Unknown';

$debugFile = rtrim($PATHS['logs'], '/\\') . '/debug_log.txt';
$pdo = null;

try {
    if (!class_exists('Database')) {
        throw new Exception('Database class not found.');
    }

    $db  = Database::getInstance();
    $pdo = $db->getConnection($__caller, $__user, $__ip, $__country, $__city);

    if (!$pdo instanceof PDO) {
        throw new Exception('PDO connection not available.');
    }

    $pk = isset($_POST['pk']) ? trim((string)$_POST['pk']) : '';
    if ($pk === '') {
        throw new Exception('Invalid PK.');
    }

    $applyCheckInDistanceRestriction = isset($_POST['applyCheckInDistanceRestriction']) ? (int)$_POST['applyCheckInDistanceRestriction'] : 0;
    $requirePhotoCheckIn             = isset($_POST['requirePhotoCheckIn']) ? (int)$_POST['requirePhotoCheckIn'] : 0;
    $faceDetectionIn                 = isset($_POST['faceDetectionIn']) ? (int)(bool)$_POST['faceDetectionIn'] : 0;
    $environmentAnalysisIn           = isset($_POST['environmentAnalysisIn']) ? (int)(bool)$_POST['environmentAnalysisIn'] : 0;
    $enableLateCheckInAlerts         = isset($_POST['enableLateCheckInAlerts']) ? (int)$_POST['enableLateCheckInAlerts'] : 0;
    $lateAlertsCounter               = isset($_POST['lateAlertsCounter']) ? (int)$_POST['lateAlertsCounter'] : 0;
    $allowEarlyCheckIn               = isset($_POST['allowEarlyCheckIn']) ? (int)$_POST['allowEarlyCheckIn'] : 0;

    $applyCheckOutTimeRestriction    = isset($_POST['applyCheckOutTimeRestriction']) ? (int)$_POST['applyCheckOutTimeRestriction'] : 0;
    $requirePhotoCheckOut            = isset($_POST['requirePhotoCheckOut']) ? (int)$_POST['requirePhotoCheckOut'] : 0;
    $faceDetectionOut                = isset($_POST['faceDetectionOut']) ? (int)(bool)$_POST['faceDetectionOut'] : 0;
    $environmentAnalysisOut          = isset($_POST['environmentAnalysisOut']) ? (int)(bool)$_POST['environmentAnalysisOut'] : 0;
    $enableCheckOutAlerts            = isset($_POST['enableCheckOutAlerts']) ? (int)$_POST['enableCheckOutAlerts'] : 0;
    $lateCheckOutAlertsCounter       = isset($_POST['lateCheckOutAlertsCounter']) ? (int)$_POST['lateCheckOutAlertsCounter'] : 0;

    $requireBreak                    = isset($_POST['requireBreak']) ? (int)$_POST['requireBreak'] : 0;
    $maxBreaksAllowed                = isset($_POST['maxBreaksAllowed']) ? (int)$_POST['maxBreaksAllowed'] : 0;
    $breaksCounter                   = isset($_POST['breaksCounter']) ? (int)$_POST['breaksCounter'] : 0;

    $mandatoryReportBeforeCheckOut   = isset($_POST['mandatoryReportBeforeCheckOut']) ? (int)$_POST['mandatoryReportBeforeCheckOut'] : 0;

    file_put_contents(
        $debugFile,
        "[" . date('Y-m-d H:i:s') . "] updateShiftSignals435 START pk={$pk}\n",
        FILE_APPEND
    );

    $pdo->beginTransaction();

    $sql = "
        UPDATE masterShifts
        SET
            applyCheckInDistanceRestriction = :applyCheckInDistanceRestriction,
            requirePhotoCheckIn             = :requirePhotoCheckIn,
            faceDetectionIn                 = :faceDetectionIn,
            environmentAnalysisIn           = :environmentAnalysisIn,
            allowEarlyCheckIn               = :allowEarlyCheckIn,
            enableLateCheckInAlerts         = :enableLateCheckInAlerts,
            lateAlertsCounter               = :lateAlertsCounter,
            applyCheckOutTimeRestriction    = :applyCheckOutTimeRestriction,
            requirePhotoCheckOut            = :requirePhotoCheckOut,
            faceDetectionOut                = :faceDetectionOut,
            environmentAnalysisOut          = :environmentAnalysisOut,
            enableCheckOutAlerts            = :enableCheckOutAlerts,
            lateCheckOutAlertsCounter       = :lateCheckOutAlertsCounter,
            requireBreak                    = :requireBreak,
            maxBreaksAllowed                = :maxBreaksAllowed,
            breaksCounter                   = :breaksCounter,
            mandatoryReportBeforeCheckOut   = :mandatoryReportBeforeCheckOut
        WHERE pk = :pk
        LIMIT 1
    ";

    $stmt = $pdo->prepare($sql);

    $stmt->bindValue(':applyCheckInDistanceRestriction', $applyCheckInDistanceRestriction, PDO::PARAM_INT);
    $stmt->bindValue(':requirePhotoCheckIn', $requirePhotoCheckIn, PDO::PARAM_INT);
    $stmt->bindValue(':faceDetectionIn', $faceDetectionIn, PDO::PARAM_INT);
    $stmt->bindValue(':environmentAnalysisIn', $environmentAnalysisIn, PDO::PARAM_INT);
    $stmt->bindValue(':enableLateCheckInAlerts', $enableLateCheckInAlerts, PDO::PARAM_INT);
    $stmt->bindValue(':allowEarlyCheckIn', $allowEarlyCheckIn, PDO::PARAM_INT);
    $stmt->bindValue(':lateAlertsCounter', $lateAlertsCounter, PDO::PARAM_INT);
    $stmt->bindValue(':applyCheckOutTimeRestriction', $applyCheckOutTimeRestriction, PDO::PARAM_INT);
    $stmt->bindValue(':requirePhotoCheckOut', $requirePhotoCheckOut, PDO::PARAM_INT);
    $stmt->bindValue(':faceDetectionOut', $faceDetectionOut, PDO::PARAM_INT);
    $stmt->bindValue(':environmentAnalysisOut', $environmentAnalysisOut, PDO::PARAM_INT);
    $stmt->bindValue(':enableCheckOutAlerts', $enableCheckOutAlerts, PDO::PARAM_INT);
    $stmt->bindValue(':lateCheckOutAlertsCounter', $lateCheckOutAlertsCounter, PDO::PARAM_INT);
    $stmt->bindValue(':requireBreak', $requireBreak, PDO::PARAM_INT);
    $stmt->bindValue(':maxBreaksAllowed', $maxBreaksAllowed, PDO::PARAM_INT);
    $stmt->bindValue(':breaksCounter', $breaksCounter, PDO::PARAM_INT);
    $stmt->bindValue(':mandatoryReportBeforeCheckOut', $mandatoryReportBeforeCheckOut, PDO::PARAM_INT);
    $stmt->bindValue(':pk', $pk, PDO::PARAM_STR);

    $stmt->execute();
    $affectedRows = $stmt->rowCount();
    $pdo->commit();

    file_put_contents(
        $debugFile,
        "[" . date('Y-m-d H:i:s') . "] updateShiftSignals435 OK pk={$pk} affectedRows={$affectedRows}\n",
        FILE_APPEND
    );

    echo json_encode([
        'success' => true,
        'message' => 'Shift signals updated successfully.',
        'affectedRows' => $affectedRows
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    if ($pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    file_put_contents(
        $debugFile,
        "[" . date('Y-m-d H:i:s') . "] ❌ updateShiftSignals435 ERROR: " . $e->getMessage() . "\n",
        FILE_APPEND
    );

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
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
