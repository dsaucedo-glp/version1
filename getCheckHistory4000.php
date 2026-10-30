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
$debugFile = rtrim($PATHS['logs'], '/\\') . '/_debug_history_shifts.log';

try {
    $dateFrom     = trim((string)($_GET['dateFrom'] ?? ''));
    $dateTo       = trim((string)($_GET['dateTo'] ?? ''));
    $promoterCode = trim((string)($_GET['promoterCode'] ?? ''));
    $market       = trim((string)($_GET['market'] ?? ''));
    $location     = trim((string)($_GET['location'] ?? ''));

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

    // 1) Shifts por shiftCalcDate + filtros opcionales
    $sqlShifts = "
        SELECT
            s.pk,
            p.promoterCode AS promoterCode,
            s.promoter     AS promoterName,
            s.eventName    AS eventName,
            s.market       AS market,
            s.location1    AS location,
            s.shiftCalcDate,
            s.fromTo
        FROM masterShifts s
        INNER JOIN promoters p ON p.promoterName = s.promoter
        WHERE s.shiftCalcDate BETWEEN :d1 AND :d2
          AND (:market = '' OR s.market = :market)
          AND (:location = '' OR s.location1 = :location)
          AND (:pcode = '' OR p.promoterCode = :pcode)
          AND s.promoter IS NOT NULL
          AND s.promoter <> ''
          AND s.promoter <> 'CANCELLED'
          AND s.promoter <> 'OPEN'
          AND UPPER(s.owner0) NOT IN ('KCK','MCK','SUS','UND','FAB')
        ORDER BY s.shiftCalcDate, s.shiftStartUTCDatetime
    ";

    $st = $pdo->prepare($sqlShifts);
    if (!$st) {
        throw new Exception("Prepare failed for shifts query");
    }

    $st->bindValue(':d1', $dateFrom, PDO::PARAM_STR);
    $st->bindValue(':d2', $dateTo, PDO::PARAM_STR);
    $st->bindValue(':market', $market, PDO::PARAM_STR);
    $st->bindValue(':location', $location, PDO::PARAM_STR);
    $st->bindValue(':pcode', $promoterCode, PDO::PARAM_STR);
    $st->execute();

    $shifts = $st->fetchAll(PDO::FETCH_ASSOC);

    file_put_contents(
        $debugFile,
        "=== SHIFTS " . date("Y-m-d H:i:s") . " ===\n" . print_r($shifts, true) . "\n\n",
        FILE_APPEND
    );

    if (!$shifts) {
        echo json_encode([
            'success' => true,
            'shifts'  => []
        ], JSON_UNESCAPED_UNICODE);
        return;
    }

    // 2) Acciones de checkInRecords para esos pk
    $pks = array_values(array_unique(array_map(fn($r) => (string)$r['pk'], $shifts)));
    $placeholders = implode(',', array_fill(0, count($pks), '?'));

    $sqlActs = "
        SELECT
            idCheck,
            pk,
            promoterCode,
            actionType,
            userLocalTime,
            userLocalDateTime,
            userLocalDate,
            userLocalTime,
            photoPath 
        FROM checkInRecords 
        WHERE pk IN ($placeholders) 
          AND actionType IN ('CHECK IN','START BREAK','END BREAK','CHECK OUT') 
        ORDER BY idCheck DESC  
    ";

    $st2 = $pdo->prepare($sqlActs);
    if (!$st2) {
        throw new Exception("Prepare failed for actions query");
    }

    $st2->execute($pks);
    $actions = $st2->fetchAll(PDO::FETCH_ASSOC);

    file_put_contents(
        $debugFile,
        "=== ACTIONS " . date("Y-m-d H:i:s") . " ===\n" . print_r($actions, true) . "\n\n",
        FILE_APPEND
    );

    // 3) Indexar acciones por pk
    $byPk = [];
    foreach ($actions as $a) {
        $pkKey = (string)($a['pk'] ?? '');
        if ($pkKey === '') {
            continue;
        }
        if (!isset($byPk[$pkKey])) {
            $byPk[$pkKey] = [];
        }
        $byPk[$pkKey][] = $a;
    }

    // helper HH:MM:SS -> g:i A
    $fmtTime = function($t) {
        if (!$t) return '';
        $ts = strtotime('1970-01-01 ' . $t);
        if (!$ts) return '';
        return date('g:i A', $ts);
    };

    $photoEndpointBase = 'https://gocheck.golocalpromos.net/php/getCheckinPhoto437.php';
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

    // 4) Resolver estado por shift
    $out = [];

    foreach ($shifts as $s) {
        $pk = (string)($s['pk'] ?? '');
        $acts = $byPk[$pk] ?? [];

        $checkIn = null;
        $breakStart = null;
        $breakEnd = null;
        $checkOut = null;

        foreach ($acts as $a) {
            if ($a['actionType'] === 'CHECK IN')    $checkIn = $a;
            if ($a['actionType'] === 'START BREAK') $breakStart = $a;
            if ($a['actionType'] === 'END BREAK')   $breakEnd = $a;
            if ($a['actionType'] === 'CHECK OUT')   $checkOut = $a;
        }

        $isOnBreak = 0;
        if ($breakStart && !$checkOut) {
            $isOnBreak = $breakEnd ? 0 : 1;
        }

        $out[] = [
            'pk' => $pk,
            'promoterCode' => $s['promoterCode'] ?? '',
            'promoterName' => $s['promoterName'] ?? '',
            'eventName' => $s['eventName'] ?? '',
            'market' => $s['market'] ?? '',
            'location' => $s['location'] ?? '',
            'shiftCalcDate' => $s['shiftCalcDate'] ?? '',
            'fromTo' => $s['fromTo'] ?? '',
            'checkInLocalTime'    => $checkIn ? $fmtTime($checkIn['userLocalTime'] ?? '') : '',
            'breakStartLocalTime' => $breakStart ? $fmtTime($breakStart['userLocalTime'] ?? '') : '',
            'breakEndLocalTime'   => $breakEnd ? $fmtTime($breakEnd['userLocalTime'] ?? '') : '',
            'checkOutLocalTime'   => $checkOut ? $fmtTime($checkOut['userLocalTime'] ?? '') : '',
            'isOnBreak' => $isOnBreak,
            'checkInPhotoUrl'  => $buildPhotoUrl($checkIn),
            'checkOutPhotoUrl' => $buildPhotoUrl($checkOut)
        ];
    }

    echo json_encode([
        'success' => true,
        'shifts'  => $out
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