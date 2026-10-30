<?php
header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__, 2) . "/private/core/bootstrap.php";
require_once dirname(__DIR__, 2) . "/private/core/dbConnectGo.php";

$username = $_POST['username'] ?? 'unknown';
$ip       = $_POST['ip'] ?? '';
$country  = $_POST['country'] ?? '';
$city     = $_POST['city'] ?? '';

$startDate = $_POST['startDate'] ?? date('Y-m-d');

try {

    $conn = Database::getInstance()->getConnection(
        'getWorkedTimeExpress20260630',
        $username,
        $ip,
        $country,
        $city
    );

    /*
      Regla:
      - Busca EXPRESS IN no transmitidos
      - Les encuentra el primer EXPRESS OUT posterior
      - Filtra por fecha del CHECK OUT, para permitir IN ayer / OUT hoy
      - Solo devuelve parejas completas
    */

    $sql = "
    SELECT
    cout.pk AS shiftId,
    cin.idCheck AS checkInId,
    cout.idCheck AS checkOutId,

    cin.promoterCode AS workerCode,
    cin.promoterName AS workerName,

    COALESCE(p.market, '') AS market,
    COALESCE(cin.promoterLongLocation, cin.venue, '') AS venue,
   COALESCE(rh.shiftSummary, '') AS description,
    rh.idReportHeader AS idReportHeader,

    cin.checkTimestamp AS checkInDatetime,
    cout.checkTimestamp AS checkOutDatetime,

    cin.checkDate AS checkInDate,
    cin.checkTime AS checkInTime,

    DATE_FORMAT(cin.userLocalDateTime, '%a %m/%d/%y %h:%i %p') AS checkInLocalDatetime,
    DATE_FORMAT(cout.userLocalDateTime, '%a %m/%d/%y %h:%i %p') AS checkOutLocalDatetime,

    DATE_FORMAT(cin.checkTimestamp, '%a %m/%d/%y %h:%i %p') AS checkInUTCDatetime,
    DATE_FORMAT(cout.checkTimestamp, '%a %m/%d/%y %h:%i %p') AS checkOutUTCDatetime,

    TIMESTAMPDIFF(MINUTE, cin.checkTimestamp, cout.checkTimestamp) AS workedMinutes,

    CONCAT(
    LPAD(FLOOR(TIMESTAMPDIFF(MINUTE, cin.checkTimestamp, cout.checkTimestamp) / 60), 2, '0'),
    ':',
    LPAD(MOD(TIMESTAMPDIFF(MINUTE, cin.checkTimestamp, cout.checkTimestamp), 60), 2, '0')
    ) AS workedFormattedTime,

    COALESCE(cin.pk, '') AS pk,
    LEFT(COALESCE(cin.pk, ''), 3) AS ownerAbb,
    '' AS ownerName,
    
    CASE TRIM(p.supervisorCode)
    WHEN 'K1152' THEN 'KCK'
    WHEN 'M5129' THEN 'MCK'
    ELSE 'DIE'
	END AS ownerAbb2,

    CONCAT(
    CASE
        WHEN TRIM(p.supervisorCode) = 'K1152' THEN 'KCK'
        WHEN TRIM(p.supervisorCode) = 'M5129' THEN 'MCK'
        ELSE 'DIE'
    END,
    LPAD(cout.idCheck, 5, '0')
    ) AS expressPk,

    COALESCE(p.supervisorCode, '') AS supervisorCode,
    COALESCE(sp.promoterName, '') AS supervisorName

    FROM checkInRecords cin

    LEFT JOIN promoters p
    ON TRIM(p.promoterCode) = TRIM(cin.promoterCode)

    LEFT JOIN promoters sp
    ON TRIM(sp.promoterCode) = TRIM(p.supervisorCode)

    INNER JOIN checkInRecords cout
    ON cout.promoterCode = cin.promoterCode
    AND cout.actionType = 'EXPRESS OUT'
    AND cout.checkTimestamp = (
    SELECT MIN(cout2.checkTimestamp)
    FROM checkInRecords cout2
    WHERE cout2.promoterCode = cin.promoterCode
      AND cout2.actionType = 'EXPRESS OUT'
      AND cout2.checkTimestamp > cin.checkTimestamp
      AND COALESCE(cout2.transmitted, 0) = 0
    )
    
    LEFT JOIN reportsHeader rh
    ON TRIM(rh.promoterCode) = TRIM(cin.promoterCode)
    AND rh.pk = cin.pk
    AND rh.source = 'GEN'
    AND rh.active = 1

    WHERE cin.actionType = 'EXPRESS IN'
    AND COALESCE(cin.expressTransmitted, 0) = 0
    AND COALESCE(cout.expressTransmitted, 0) = 0
    AND DATE(cout.checkTimestamp) >= '2026-10-01'

    ORDER BY cout.checkTimestamp ASC  
    LIMIT 3 ;
    ";

    $stmt = $conn->prepare($sql);
    $stmt->execute();

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $records = [];

    foreach ($rows as $r) {


    $reportPhotos = [];

        if (!empty($r['idReportHeader'])) {

        $stmtPhotos = $conn->prepare("
            SELECT fileName
            FROM reportsFiles
            WHERE idReportHeader = :idReportHeader
            ORDER BY id ASC
            ");

            $stmtPhotos->execute([
            ':idReportHeader' => $r['idReportHeader']
        ]);

            $reportPhotos = $stmtPhotos->fetchAll(PDO::FETCH_COLUMN);
        }
        
        $minutes = intval($r['workedMinutes']);
        if ($minutes < 0) {
            continue;
        }

        $hours = floor($minutes / 60);
        $mins  = $minutes % 60;

        $workedDuration = str_pad($hours, 2, '0', STR_PAD_LEFT) . ':' . str_pad($mins, 2, '0', STR_PAD_LEFT);
        $workedDecimal  = round($minutes / 60, 2);

        $records[] = [
            'shiftId' => $r['shiftId'],
            'checkInId' => $r['checkInId'],
            'checkOutId' => $r['checkOutId'],
            'workerCode' => $r['workerCode'],
            'workerName' => $r['workerName'],
            'market' => $r['market'],
            'venue' => $r['venue'],
            'description' => $r['description'],
            'idReportHeader' => $r['idReportHeader'],
            'reportPhotos' => $reportPhotos,
            'checkInDatetime' => $r['checkInDatetime'],
            'checkOutDatetime' => $r['checkOutDatetime'],
            'checkInLocalDatetime' => $r['checkInLocalDatetime'],
            'checkOutLocalDatetime' => $r['checkOutLocalDatetime'],
            'checkInUTCDatetime' => $r['checkInUTCDatetime'],
            'checkOutUTCDatetime' => $r['checkOutUTCDatetime'],
            'workedMinutes' => $r['workedMinutes'],
            'workedFormattedTime' => $r['workedFormattedTime'],
            'ownerName' => $r['ownerName'],
            'ownerAbb2' => $r['ownerAbb2'],
            'expressPk' => $r['expressPk'],
            'supervisorCode' => $r['supervisorCode'],
            'supervisorName' => $r['supervisorName'],
            'workedDuration' => $workedDuration,
            'workedDurationDecimal' => $workedDecimal,
            'ownerAbb' => $r['ownerAbb'],
            'pk' => $r['pk'],
            'checkInDate' => $r['checkInDate'],
            'checkInTime' => $r['checkInTime'],

        ];
    }

    echo json_encode($records);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
