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
    $dateFrom     = trim((string)($_GET['dateFrom'] ?? ''));
    $dateTo       = trim((string)($_GET['dateTo'] ?? ''));
    $promoterCode = trim((string)($_GET['promoterCode'] ?? ''));

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
        SELECT DISTINCT s.market, s.location1 AS location
        FROM masterShifts s
        INNER JOIN promoters p ON p.promoterName = s.promoter
        WHERE s.shiftCalcDate BETWEEN :d1 AND :d2
          AND (:pcode = '' OR p.promoterCode = :pcode)
          AND s.market IS NOT NULL AND s.market <> ''
          AND s.location1 IS NOT NULL AND s.location1 <> ''
          AND s.promoter IS NOT NULL AND s.promoter <> ''
          AND s.promoter <> 'CANCELLED'
          AND s.promoter <> 'OPEN'
        ORDER BY s.market ASC, s.location1 ASC
    ";

    $st = $pdo->prepare($sql);
    $st->bindValue(':d1', $dateFrom, PDO::PARAM_STR);
    $st->bindValue(':d2', $dateTo, PDO::PARAM_STR);
    $st->bindValue(':pcode', $promoterCode, PDO::PARAM_STR);
    $st->execute();

    $rows = $st->fetchAll(PDO::FETCH_ASSOC);

    $markets = [];
    $locationsByMarket = [];

    foreach ($rows as $r) {
        $m = trim((string)($r['market'] ?? ''));
        $l = trim((string)($r['location'] ?? ''));

        if ($m === '' || $l === '') {
            continue;
        }

        $markets[$m] = true;

        if (!isset($locationsByMarket[$m])) {
            $locationsByMarket[$m] = [];
        }

        $locationsByMarket[$m][$l] = true;
    }

    $markets = array_keys($markets);
    sort($markets);

    $locOut = [];
    foreach ($locationsByMarket as $m => $locSet) {
        $locs = array_keys($locSet);
        sort($locs);
        $locOut[$m] = $locs;
    }

    echo json_encode([
        'success' => true,
        'markets' => $markets,
        'locationsByMarket' => $locOut
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