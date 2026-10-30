<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__, 2) . '/private/core/bootstrap.php';
require_once $PATHS['core'] . 'dbConnectGo.php';

$__caller  = basename(__FILE__);
$__ip      = $_GET['ip'] ?? ($_SERVER['REMOTE_ADDR'] ?? 'Unknown');
$__user    = isset($_GET['code']) ? strtoupper(trim((string)$_GET['code'])) : 'Unknown';
$__country = $_GET['country'] ?? ($_GET['ipCountry'] ?? 'Unknown');
$__city    = $_GET['city'] ?? ($_GET['ipCity'] ?? 'Unknown');

$debugFile = rtrim($PATHS['logs'], '/\\') . '/debug_log.txt';
$pdo = null;

file_put_contents($debugFile, "[" . date('Y-m-d H:i:s') . "] ✅ Entré a {$__caller}\n", FILE_APPEND);

try {
    $db  = Database::getInstance();
    $pdo = $db->getConnection($__caller, $__user, $__ip, $__country, $__city);

    // IMPORTANTÍSIMO:
    // Usa la fecha local enviada por el frontend, NO CURDATE() del server.
    $today = trim((string)($_GET['shiftCalcDate'] ?? ''));
    if ($today === '') {
        $today = date('Y-m-d');
    }

    $sqlShifts = "
        SELECT 
            s.pk,
            p.promoterCode,
            s.promoter AS promoterName,
            s.market,
            s.eventName AS eventName,
            s.location1 AS location,
            s.shiftCalcDate,
            s.shiftDate,
            s.fromTo,
            s.applyCheckInDistanceRestriction,
            s.requirePhotoCheckIn,
            s.faceDetectionIn,
            s.environmentAnalysisIn,
            s.allowEarlyCheckIn,
            s.enableLateCheckInAlerts,
            s.lateAlertsCounter,
            s.applyCheckOutTimeRestriction,
            s.requirePhotoCheckOut,
            s.faceDetectionOut,
            s.environmentAnalysisOut,
            s.enableCheckOutAlerts,
            s.lateCheckOutAlertsCounter,
            s.requireBreak,
            s.maxBreaksAllowed,
            s.breaksCounter,
            s.mandatoryReportBeforeCheckOut
        FROM masterShifts s
        LEFT JOIN promoters p ON p.promoterName = s.promoter
        WHERE s.shiftCalcDate = :today
          AND UPPER(s.promoter) NOT IN ('OPEN','EMPTY','','CANCELLED','PROMOTER')
        ORDER BY s.shiftStartUTCDatetime ASC
    ";

    $st = $pdo->prepare($sqlShifts);
    $st->execute([':today' => $today]);
    $shifts = $st->fetchAll(PDO::FETCH_ASSOC);

    if (!$shifts) {
        file_put_contents($debugFile, "[" . date('Y-m-d H:i:s') . "] rows found: 0 for today={$today}\n", FILE_APPEND);
        echo json_encode(['success' => true, 'shifts' => []], JSON_UNESCAPED_UNICODE);
        return  ;
    }

    $pks = array_map(fn($r) => $r['pk'], $shifts);
    $inPlaceholders = implode(',', array_fill(0, count($pks), '?'));

    $sqlActions = "
        SELECT 
            idCheck,
            pk,
            promoterCode,
            actionType,
            userLocalTime,
            userLocalDatetime,
            photoPath
        FROM checkInRecords
        WHERE pk IN ($inPlaceholders)
          AND actionType IN ('CHECK IN','START BREAK','END BREAK','CHECK OUT')
        ORDER BY checkTimestamp ASC
    ";

    $st2 = $pdo->prepare($sqlActions);
    $st2->execute($pks);
    $actions = $st2->fetchAll(PDO::FETCH_ASSOC);

    $byPk = [];
    foreach ($actions as $a) {
        $pkKey = (string)($a['pk'] ?? '');
        if ($pkKey === '') continue;

        if (!isset($byPk[$pkKey])) {
            $byPk[$pkKey] = [];
        }

        $byPk[$pkKey][] = $a;
    }

    $photoEndpointBase = 'https://beta.golocalpromos.net/php/getCheckinPhoto437.php';
    $photoKey = 'dsaucedo@golocalpromos.com';

    $buildPhotoUrl = function (?array $action) use ($photoEndpointBase, $photoKey): string {
        if (!$action) return '';

        $photoPath = trim((string)($action['photoPath'] ?? ''));

        if ($photoPath === '' || !is_file($photoPath)) {
        return '';
        }

        return $photoEndpointBase
        . '?path=' . rawurlencode($photoPath)
        . '&key=' . rawurlencode($photoKey);
    };

    $formatTime = function (?array $action): string {
        if (!$action) return '';

        $t = trim((string)($action['userLocalTime'] ?? ''));

        if ($t !== '') {
            $ts = strtotime('1970-01-01 ' . $t);
            return $ts ? date('g:i A', $ts) : '';
        }

        $dt = trim((string)($action['userLocalDatetime'] ?? ''));
        if ($dt !== '') {
            $ts = strtotime($dt);
            return $ts ? date('g:i A', $ts) : '';
        }

        return '';
    };

    $out = [];

    foreach ($shifts as $s) {
        $pk = (string)($s['pk'] ?? '');
        $acts = $byPk[$pk] ?? [];

        $checkIn = null;
        $breakStart = null;
        $breakEnd = null;
        $checkOut = null;

        foreach ($acts as $a) {
            if ($a['actionType'] === 'CHECK IN') {
                $checkIn = $a;
            }

            if ($a['actionType'] === 'START BREAK') {
                $breakStart = $a;
            }

            if ($a['actionType'] === 'END BREAK') {
                $breakEnd = $a;
            }

            if ($a['actionType'] === 'CHECK OUT') {
                $checkOut = $a;
            }
        }

        $isOnBreak = 0;

        if ($breakStart && !$checkOut) {
            if (!$breakEnd) {
                $isOnBreak = 1;
            } else {
                $breakEndDt = trim((string)($breakEnd['userLocalDatetime'] ?? ''));
                $breakStartDt = trim((string)($breakStart['userLocalDatetime'] ?? ''));

                if ($breakEndDt !== '' && $breakStartDt !== '') {
                    $isOnBreak = (strtotime($breakEndDt) < strtotime($breakStartDt)) ? 1 : 0;
                }
            }
        }

        $out[] = [
            'pk' => $pk,
            'promoterCode' => $s['promoterCode'] ?? '',
            'promoterName' => $s['promoterName'] ?? '',
            'market' => $s['market'] ?? '',
            'eventName' => $s['eventName'] ?? '',
            'location' => $s['location'] ?? '',
            'shiftCalcDate' => $s['shiftCalcDate'] ?? '',
            'shiftDate' => $s['shiftDate'] ?? '',
            'fromTo' => $s['fromTo'] ?? '',
            'applyCheckInDistanceRestriction' => $s['applyCheckInDistanceRestriction'] ?? 0,
            'requirePhotoCheckIn' => $s['requirePhotoCheckIn'] ?? 0,
            'faceDetectionIn' => $s['faceDetectionIn'] ?? 0,
            'environmentAnalysisIn' => $s['environmentAnalysisIn'] ?? 0,
            'allowEarlyCheckIn' => $s['allowEarlyCheckIn'] ?? 0,
            'enableLateCheckInAlerts' => $s['enableLateCheckInAlerts'] ?? 0,
            'lateAlertsCounter' => $s['lateAlertsCounter'] ?? 0,
            'applyCheckOutTimeRestriction' => $s['applyCheckOutTimeRestriction'] ?? 0,
            'requirePhotoCheckOut' => $s['requirePhotoCheckOut'] ?? 0,
            'faceDetectionOut' => $s['faceDetectionOut'] ?? 0,
            'environmentAnalysisOut' => $s['environmentAnalysisOut'] ?? 0,
            'enableCheckOutAlerts' => $s['enableCheckOutAlerts'] ?? 0,
            'lateCheckOutAlertsCounter' => $s['lateCheckOutAlertsCounter'] ?? 0,
            'mandatoryReportBeforeCheckOut' => $s['mandatoryReportBeforeCheckOut'] ?? 0,
            'requireBreak' => $s['requireBreak'] ?? 0,
            'maxBreaksAllowed' => $s['maxBreaksAllowed'] ?? 0,
            'breaksCounter' => $s['breaksCounter'] ?? 0,
            'checkInLocalTime' => $formatTime($checkIn),
            'breakStartLocalTime' => $formatTime($breakStart),
            'checkOutLocalTime' => $formatTime($checkOut),
            'isOnBreak' => $isOnBreak,
            'checkInPhotoUrl' => $buildPhotoUrl($checkIn),
            'checkOutPhotoUrl' => $buildPhotoUrl($checkOut),
        ];
    }

    file_put_contents(
        $debugFile,
        "[" . date('Y-m-d H:i:s') . "] rows found: " . count($out) . " for today={$today}\n",
        FILE_APPEND
    );

    echo json_encode([
        'success' => true,
        'shifts' => $out
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    file_put_contents(
        $debugFile,
        "[" . date('Y-m-d H:i:s') . "] ❌ {$__caller}: " . $e->getMessage() . "\n",
        FILE_APPEND
    );

    http_response_code(500);
    echo json_encode([
        'success' => false,
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
?>