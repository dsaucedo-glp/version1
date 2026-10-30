<?php

header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__, 2) . "/private/core/bootstrap.php";
require_once dirname(__DIR__, 2) . "/private/core/dbConnectGo.php";

$username = $_POST['username'] ?? 'unknown';
$ip       = $_POST['ip'] ?? '';
$country  = $_POST['country'] ?? '';
$city     = $_POST['city'] ?? '';

$conn = null;

try {

    $conn = Database::getInstance()->getConnection(
        'getPendingManualHours3200',
        $username,
        $ip,
        $country,
        $city
    );

    $sql = "
        SELECT
        mh.idManualHour,
        mh.workerCode,
        mh.workerName,
        mh.workDate,
        mh.startTimeInput,
        mh.durationHours,
        mh.completedTasks,
        p.market,
        COALESCE(p.supervisorCode, 'J6072') AS supervisorCode,
        CASE
            WHEN p.supervisorCode IS NULL THEN 'JUAN GOMEZ'
            ELSE COALESCE(s.promoterName, 'JUAN GOMEZ')
        END AS supervisorName,
        CONCAT(LPAD(mh.durationInputHours, 2, '0'),':', LPAD(mh.durationInputMinutes, 2, '0') ) AS durationInput,
        CONCAT('ADH', LPAD(mh.idManualHour, 5, '0')) AS pk
        FROM manualHours mh
        LEFT JOIN promoters p ON p.promoterCode = mh.workerCode
        LEFT JOIN promoters s ON s.promoterCode = p.supervisorCode
        WHERE mh.transmitted = 0
        ORDER BY mh.idManualHour ASC
    ";

    $stmt = $conn->prepare($sql);
    $stmt->execute();

    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'count'   => count($records),
        'records' => $records
    ]);
} catch (Throwable $e) {

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} finally {

    $conn = null;
}
