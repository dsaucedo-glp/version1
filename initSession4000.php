<?php
header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__, 2) . '/private/core/bootstrap.php';
require_once $PATHS['core'] . 'dbConnectGo.php';

$__caller  = basename(__FILE__);
$__ip      = $_POST['ip'] ?? 'Unknown';
$__user    = isset($_POST['code']) ? strtoupper(trim($_POST['code'])) : 'Unknown';
$__country = $_POST['country'] ?? 'Unknown';
$__city    = $_POST['city'] ?? 'Unknown';

$pdo = null;
$debugFile = rtrim($PATHS['logs'], '/\\') . '/debug.txt';

try {
    $code = strtoupper(trim($_POST['code'] ?? ''));
    $localDate = trim((string)($_POST['localDate'] ?? ''));
    $viewportWidth = $_POST['viewportWidth'] ?? '';
    $viewportHeight = $_POST['viewportHeight'] ?? '';
    $pendingReportsNumber = 0;
    $pendingReimbursementApprovalsNumber = 0;

    file_put_contents($debugFile, "code: " . $code . " localDate: " . $localDate . "\n", FILE_APPEND);
    file_put_contents($debugFile, "viewportWidth: " . $viewportWidth . "\n", FILE_APPEND);
    file_put_contents($debugFile, "viewportHeight: " . $viewportHeight . "\n", FILE_APPEND);

    if (strlen($code) !== 5 || $localDate === '') {
        throw new Exception("Invalid date or code.");
    }

    // Conexión DB
    try {
        $db  = Database::getInstance();
        $pdo = $db->getConnection($__caller, $code, $__ip, $__country, $__city);
    } catch (Exception $e) {
        if (function_exists('str_starts_with') && str_starts_with($e->getMessage(), "DB_CONNECTION_ERROR")) {
            echo json_encode([
                "success" => false,
                "message" => "Database connection error"
            ]);
            return;
        }
        throw $e;
    }

    // Validar código
    $stmt = $pdo->prepare("
        SELECT promoterCode, promoterName, phone AS promoterPhone, 
        active as activeSignal,  email AS promoterEmail, supervisorLevel, 
        expressInAllowed , expressPhotosRequired , canPerformAdminTasks, canAddHoursManually,
        faceDetectionIn, faceDetectionOut,environmentAnalysisIn, environmentAnalysisOut,
        geoRequiredIn, geoRequiredOut,photoRequiredIn, photoRequiredOut
        FROM promoters 
        WHERE promoterCode = :code 
    ");
    $stmt->execute([':code' => $code]);
    $promoter = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$promoter) {
        echo json_encode([
            'success' => false,
            'message' => 'Unregistered User ' . $code
        ]);
        return;
    }

    if ($promoter &&  $promoter['activeSignal'] == 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Inactive User ' . $code
        ]);
        return;
    }


    //////////////////////////////////
    // STAFFIN CHECK IN/OUT PARAMETERS 
    //////////////////////////////////
    $stmtParams = $pdo->prepare("
        SELECT 
            geoRequiredCheckIn,
            geoRequiredStartBreak,
            geoRequiredEndBreak,
            geoRequiredCheckOut,
            photoRequiredCheckIn,
            photoRequiredStartBreak,
            photoRequiredEndBreak,
            photoRequiredCheckOut,
            maxDistanceForCheckIn,
            maxDistanceForStartBreak,
            maxDistanceForEndBreak,
            maxDistanceForCheckOut,
            maxBreaks,
            applyTimeBeforeCheckIn,
            minMinutesBeforeCheckIn,
            applyTimeBeforeCheckOut,
            minMinutesBeforeCheckOut,
            reportRequiredForCheckOut,
            applyDistanceForCheckIn,
            applyDistanceForCheckOut,
            faceDetectionIn,
            faceDetectionOut,
            environmentAnalysisIn,
            environmentAnalysisOut 
        FROM checkInParameters
        WHERE active = 1
        LIMIT 1
    ");
    $stmtParams->execute();
    $globalParams = $stmtParams->fetch(PDO::FETCH_ASSOC) ?: [];

    //////////////////////////////////
    // EXPRESS IN/OUT PARAMETERES
    //////////////////////////////////
    $stmtExpressParams = $pdo->prepare("
        SELECT 
        geoRequiredIn,
        geoRequiredOut,
        photoRequiredIn,
        photoRequiredOut,
        faceDetectionIn,
        faceDetectionOut,
        environmentAnalysisIn,
        environmentAnalysisOut,
        minPhotosMandatoryReport,
        maxPhotosMandatoryReport,
        minPhotosOptionalReport,
        maxPhotosOptionalReport
        FROM expressParameters 
        WHERE active = 1 
        ORDER BY createdAt DESC 
        LIMIT 1
    ");
    $stmtExpressParams->execute();
    $expressParams = $stmtExpressParams->fetch(PDO::FETCH_ASSOC) ?: [];

    /////////////////////

    // Última acción del promoter (cualquier shift)
    $stmt = $pdo->prepare("
        SELECT pk, actionType
        FROM checkInRecords
        WHERE promoterCode = :code
        ORDER BY checkTimestamp DESC
        LIMIT 1
    ");
    $stmt->execute([':code' => $code]);
    $lastRow = $stmt->fetch(PDO::FETCH_ASSOC);

    $forcePk = null;
    if (
        $lastRow &&
        $lastRow['actionType'] !== 'CHECK OUT' &&
        !in_array($lastRow['actionType'], ['EXPRESS IN', 'EXPRESS OUT'], true)
    ) {
        $forcePk = $lastRow['pk'];
    }

    $nowUTC = date('Y-m-d H:i:s');
    file_put_contents($debugFile, "PromoterName: " . $promoter['promoterName'] . "\n", FILE_APPEND);
    file_put_contents($debugFile, "localDate: " . $localDate . "\n", FILE_APPEND);
    file_put_contents($debugFile, "nowUTC: " . $nowUTC . "\n", FILE_APPEND);

    // Shifts
    if ($forcePk) {
        $stmt = $pdo->prepare("
            SELECT s.*,
                COALESCE(l.yLat, 25.77819395748365) AS shiftLat,
                COALESCE(l.xLong, -80.1665285) AS shiftLon,
                EXISTS(
                    SELECT 1
                    FROM reportsHeader rh
                    WHERE rh.pk = s.pk
                    LIMIT 1
                ) 
                OR EXISTS (
                    SELECT 1
                    FROM reportsHeaderLegacy lh
                    WHERE lh.pk = s.pk
                    LIMIT 1
                ) AS reportDone
            FROM masterShifts s
            LEFT JOIN locations l
              ON l.idLocation = s.location1 AND l.idMarket = s.market
            WHERE s.pk = :pk
            LIMIT 1
        ");
        $stmt->execute([':pk' => $forcePk]);
    } else {
        $stmt = $pdo->prepare("
            SELECT s.*,
                COALESCE(l.yLat, 25.77819395748365) AS shiftLat,
                COALESCE(l.xLong, -80.1665285) AS shiftLon,
                EXISTS(
                    SELECT 1
                    FROM reportsHeader rh
                    WHERE rh.pk = s.pk
                    LIMIT 1
                ) 
                    OR EXISTS (
                    SELECT 1
                    FROM reportsHeaderLegacy lh
                    WHERE lh.pk = s.pk
                    LIMIT 1
                ) AS reportDone 
            FROM masterShifts s
            LEFT JOIN locations l
              ON l.idLocation = s.location1 AND l.idMarket = s.market
            WHERE s.shiftCalcDate = :localDate
              AND s.promoter = :promoterName
              AND s.pk NOT IN (
                    SELECT pk
                    FROM checkInRecords 
                    WHERE actionType = 'CHECK OUT'
                    AND promoterCode = :code  
              )
              AND s.shiftEndUTCDatetime > CURRENT_TIMESTAMP
            ORDER BY s.shiftStartUTCDatetime ASC
            LIMIT 1
        ");
        $stmt->execute([
            ':localDate'    => $localDate,
            ':promoterName' => $promoter['promoterName'],
            ':code'         => $code
        ]);
    }

    $shifts = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $stmt2 = $pdo->prepare("
        SELECT s.*
        FROM masterShifts s
        WHERE s.shiftCalcDate >= :localDate
          AND s.promoter = :promoterName
        ORDER BY s.shiftStartUTCDatetime ASC
        LIMIT 120
    ");
    $stmt2->execute([
        ':localDate'    => $localDate,
        ':promoterName' => $promoter['promoterName']
    ]);
    $allShifts = $stmt2->fetchAll(PDO::FETCH_ASSOC);

    $stmt3 = $pdo->prepare("
        SELECT idPayCalendar, payFrom, payTo
        FROM payCalendar p
        WHERE payDate >= :localDate
        ORDER BY payDate
        LIMIT 1
    ");
    $stmt3->execute([
        ':localDate' => $localDate
    ]);
    $nextDates = $stmt3->fetch(PDO::FETCH_ASSOC);

    $fromNextDate = $nextDates['payFrom'] ?? null;
    $toNextDate = $nextDates['payTo'] ?? null;
    $idPayCalendar = $nextDates['idPayCalendar'] ?? null;
    $idLastCalendar = $idPayCalendar !== null ? ((int)$idPayCalendar - 1) : null;

    file_put_contents($debugFile, "idPayCalendar: " . $idPayCalendar . " idLastCalendar: " . $idLastCalendar . "\n", FILE_APPEND);
    file_put_contents($debugFile, "fromNextDate: " . $fromNextDate . " toNextDate: " . $toNextDate . "\n", FILE_APPEND);

    $nextPayroll = [];
    if ($fromNextDate && $toNextDate) {
        $stmt4 = $pdo->prepare("
            SELECT s.*
            FROM masterShifts s
            WHERE shiftCalcDate >= :fromNextDate
              AND shiftCalcDate <= :toNextDate
              AND promoter = :promoterName
            ORDER BY shiftStartUTCDatetime
        ");
        $stmt4->execute([
            ':fromNextDate' => $fromNextDate,
            ':toNextDate' => $toNextDate,
            ':promoterName' => $promoter['promoterName']
        ]);
        $nextPayroll = $stmt4->fetchAll(PDO::FETCH_ASSOC);
    }

    $lastPayroll = [];
    if ($idLastCalendar !== null) {
        $stmt5 = $pdo->prepare("
            SELECT idPayCalendar, payFrom, payTo
            FROM payCalendar p
            WHERE idPayCalendar = :idLastCalendar
            LIMIT 1
        ");
        $stmt5->execute([
            ':idLastCalendar' => $idLastCalendar
        ]);
        $lastDates = $stmt5->fetch(PDO::FETCH_ASSOC);

        $fromLastDate = $lastDates['payFrom'] ?? null;
        $toLastDate = $lastDates['payTo'] ?? null;

        if ($fromLastDate && $toLastDate) {
            $stmt6 = $pdo->prepare("
                SELECT s.*
                FROM masterShifts s
                WHERE shiftCalcDate >= :fromLastDate
                  AND shiftCalcDate <= :toLastDate
                  AND promoter = :promoterName
                ORDER BY shiftStartUTCDatetime
            ");
            $stmt6->execute([
                ':fromLastDate' => $fromLastDate,
                ':toLastDate' => $toLastDate,
                ':promoterName' => $promoter['promoterName']
            ]);
            $lastPayroll = $stmt6->fetchAll(PDO::FETCH_ASSOC);
        }
    }

    $stmt7 = $pdo->prepare("
        SELECT s.*, DATEDIFF(:localDate, s.shiftCalcDate) AS daysPending
        FROM masterShifts s
        WHERE NOT EXISTS (
            SELECT 1
            FROM reportsHeader rh
            WHERE rh.pk = s.pk
        )
        AND NOT EXISTS (
            SELECT 1
            FROM reportsHeaderLegacy lh
        WHERE lh.pk = s.pk
        )
        AND s.promoter = :promoterName
        AND UPPER(s.eventName) NOT LIKE '%NO_REPORT%'
        AND UPPER(s.eventName) NOT LIKE '%ADMIN%'
        AND UPPER(s.eventName) NOT LIKE '%TRAINING%'
        AND UPPER(s.eventName) NOT LIKE '%ESCORT%'
        AND UPPER(s.eventName) NOT LIKE '%BADG%'
        AND UPPER(s.eventName) NOT LIKE '%SHIPMENT%'
        AND UPPER(s.eventName) NOT LIKE '%PTO%'
        AND UPPER(s.eventName) NOT LIKE '%PSL%'
        AND UPPER(s.eventName) NOT LIKE '%MEET%'
        AND s.shiftCalcDate < :localDate
        AND s.shiftCalcDate >= DATE_SUB(:localDate, INTERVAL 10 DAY)
        ORDER BY s.shiftCalcDate ASC, s.fromTo ASC
    ");
    $stmt7->execute([
        ':localDate'    => $localDate,
        ':promoterName' => $promoter['promoterName']
    ]);
    $pendingReportsArray = $stmt7->fetchAll(PDO::FETCH_ASSOC);

    if ($pendingReportsArray) {
        $pendingReportsNumber = count($pendingReportsArray);
    }

    $stmt8 = $pdo->prepare("
        SELECT s.*
        FROM masterShifts s
        WHERE promoter = :promoterName
          AND shiftCalcDate <= :localDate
          AND shiftCalcDate >= DATE_SUB(:localDate, INTERVAL 50 DAY)
        ORDER BY shiftCalcDate DESC, shiftCalcTime DESC 
        LIMIT 30 
    ");
    $stmt8->execute([
        ':localDate' => $localDate,
        ':promoterName' => $promoter['promoterName']
    ]);
    $shiftsForReimbursement = $stmt8->fetchAll(PDO::FETCH_ASSOC);

    $stmt9 = $pdo->prepare("
        SELECT e.*
        FROM expensesTypes e
        WHERE e.active = :active
        ORDER BY e.idExpensesType ASC
    ");
    $stmt9->execute([
        ':active' => 1
    ]);
    $expensesTypes = $stmt9->fetchAll(PDO::FETCH_ASSOC);

    // PRODUCTS MASTER
    $productsMaster = [];
    try {
        $sql = "SELECT DISTINCT TRIM(productName) AS productName
                FROM products
                WHERE productName IS NOT NULL
                  AND CHAR_LENGTH(productName) >= 4
                ORDER BY productName ASC";
        $st = $pdo->prepare($sql);
        $st->execute();
        while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
            $name = trim((string)($row['productName'] ?? ''));
            if ($name !== '') {
                $productsMaster[] = $name;
            }
        }
    } catch (Exception $e) {
        $productsMaster = [];
    }
    $productsVersion = md5(implode('|', $productsMaster));

    // BRANDS MASTER
    $brandsMaster = [];
    try {
        $sql = "SELECT DISTINCT TRIM(brandName) AS brandName
                FROM brands
                WHERE brandName IS NOT NULL
                  AND CHAR_LENGTH(brandName) >= 4
                ORDER BY brandName ASC";
        $st = $pdo->prepare($sql);
        $st->execute();
        while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
            $name = trim((string)($row['brandName'] ?? ''));
            if ($name !== '') {
                $brandsMaster[] = $name;
            }
        }
    } catch (Exception $e) {
        $brandsMaster = [];
    }
    $brandsVersion = md5(implode('|', $brandsMaster));

    $stmtVideos = $pdo->prepare("
        SELECT idVideo, title, videoUrl, videoLength, sequence
        FROM trainingVideos
        ORDER BY sequence ASC
    ");
    $stmtVideos->execute();
    $trainingVideos = $stmtVideos->fetchAll(PDO::FETCH_ASSOC);


    $isReimbursementDefaultApprover = 0;

    $stmtDfaFlag = $pdo->prepare("
        SELECT 1
        FROM reimbursementDefaultApprovers dfa
        WHERE dfa.active = 1
        AND UPPER(TRIM(dfa.defaulAproverCode)) = :code
        LIMIT 1
    ");
    $stmtDfaFlag->execute([':code' => $code]);
    $isReimbursementDefaultApprover = $stmtDfaFlag->fetchColumn() ? 1 : 0;

    // Pending Reimbursement Approvals count
    $stmtRA = $pdo->prepare("
        SELECT COUNT(*) AS total
        FROM reimbursements r
        WHERE
            (
                EXISTS (
                    SELECT 1
                    FROM reimbursementDefaultApprovers dfa
                    WHERE dfa.active = 1
                      AND UPPER(TRIM(dfa.defaulAproverCode)) = :viewerCode1
                )
                AND r.status IN ('pending', 'sent_to_manager', 'checked')
            )
            OR
            (
                r.status = 'sent_to_manager'
                AND EXISTS (
                    SELECT 1
                    FROM reimbursementManagers rm
                    WHERE rm.active = 1
                      AND UPPER(TRIM(rm.approverCode)) = :viewerCode2
                      AND UPPER(TRIM(rm.shiftOwner)) = UPPER(TRIM(LEFT(COALESCE(r.pk, ''), 3)))
                )
            )
    ");
    $stmtRA->execute([
        ':viewerCode1' => $code,
        ':viewerCode2' => $code
    ]);
    $rowRA = $stmtRA->fetch(PDO::FETCH_ASSOC);
    $pendingReimbursementApprovalsNumber = (int)($rowRA['total'] ?? 0);


    $stmtRP = $pdo->prepare("
        SELECT *
        FROM reimbursementParameters
        LIMIT 1
    ");
    $stmtRP->execute();

    $reimbursementParameters = $stmtRP->fetch(PDO::FETCH_ASSOC) ?: [];

    $stmtExpress = $pdo->prepare("
        SELECT idCheck, pk, actionType, userLocalDatetime
        FROM checkInRecords
        WHERE promoterCode = :code
        AND actionType IN ('EXPRESS IN', 'EXPRESS OUT')
        ORDER BY checkTimestamp DESC
        LIMIT 1
    ");

    $stmtExpress->execute([':code' => $code]);

    $expressRow = $stmtExpress->fetch(PDO::FETCH_ASSOC);

    $lastExpressAction = $expressRow['actionType'] ?? null;
    $lastExpressStartTime = null;
    $lastExpressInId = null;
    $lastExpressInPk = null;

    if ($lastExpressAction === 'EXPRESS IN') {

        $lastExpressStartTime = $expressRow['userLocalDatetime'] ?? null;
        $lastExpressInId = (int)($expressRow['idCheck'] ?? 0);
        $lastExpressInPk = trim((string)($expressRow['pk'] ?? ''));
    }

    // =========================================================
    // EXPRESS - DETECTAR SI LA SESIÓN ACTIVA YA TIENE REPORTE
    // =========================================================

    $expressReportDone = 0;

    if ($lastExpressAction === 'EXPRESS IN' && $lastExpressInPk !== '') {
        $stmtExpressReportDone = $pdo->prepare("
            SELECT 1
            FROM reportsHeader
            WHERE pk = :pk
            AND promoterCode = :code
            LIMIT 1
        ");
        $stmtExpressReportDone->execute([
            ':pk'   => $lastExpressInPk,
            ':code' => $code
        ]);
        $expressReportDone = $stmtExpressReportDone->fetchColumn() ? 1 : 0;
    }

    $toDoListArray = [];

    if ((int)($promoter['expressInAllowed'] ?? 0) === 1) {

        $sqlToDo = "
        SELECT
            owner0,
            promoter,
            brand,
            location1,
            eventName,
            DATE_FORMAT(jobDate, '%a %m/%d/%y') AS jobDateLabel
        FROM jobsCalendar
        WHERE active = 1
        ORDER BY jobDate ASC, location1 ASC, brand ASC
        ";

        $stmtToDo = $pdo->prepare($sqlToDo);
        $stmtToDo->execute();

        $toDoListArray = $stmtToDo->fetchAll(PDO::FETCH_ASSOC);
    }


    if (empty($shifts)) {
        echo json_encode([
            'success'         => true,
            'promoterCode'    => $promoter['promoterCode'],
            'supervisorLevel' => (int)($promoter['supervisorLevel'] ?? 0),
            'promoterName'    => $promoter['promoterName'],
            'promoterPhone'   => $promoter['promoterPhone'],
            'promoterEmail'   => $promoter['promoterEmail'],
            'shiftsToday'     => [],
            'selectedShift'   => null,
            'lastAction'      => null,
            'globalParams'    => $globalParams,
            'expressParams'   => $expressParams,
            'allShifts'       => $allShifts,
            'nextPayroll'     => $nextPayroll,
            'lastPayroll'     => $lastPayroll,
            'pendingReportsArray'    => $pendingReportsArray,
            'pendingReportsNumber'   => $pendingReportsNumber,
            'shiftsForReimbursement' => $shiftsForReimbursement,
            'expensesTypes'   => $expensesTypes,
            'productsMaster'  => $productsMaster,
            'productsVersion' => $productsVersion,
            'brandsMaster'    => $brandsMaster,
            'brandsVersion'   => $brandsVersion,
            'trainingVideos'  => $trainingVideos,
            'isReimbursementDefaultApprover'      => $isReimbursementDefaultApprover,
            'pendingReimbursementApprovalsNumber' => $pendingReimbursementApprovalsNumber,
            'reimbursementParameters' => $reimbursementParameters,
            'expressInAllowed'        => (int)($promoter['expressInAllowed'] ?? 0),
            'expressPhotosRequired'   => (string)($promoter['expressPhotosRequired'] ?? "NO"),
            'canPerformAdminTasks'    => (int)($promoter['canPerformAdminTasks'] ?? 0),
            'canAddHoursManually'     => (int)($promoter['canAddHoursManually'] ?? 0),
            'lastExpressAction'       => $lastExpressAction,
            'lastExpressStartTime'    => $lastExpressStartTime,
            'toDoListArray'           => $toDoListArray,
            'lastExpressInId'         => $lastExpressInId,
            'lastExpressInPk'         => $lastExpressInPk,
            'expressReportDone'       => $expressReportDone,
            'promoter'  => $promoter
        ]);
        return;
    }

    // Detectar shift activo y últimas horas para cronómetros
    $selectedShift = null;
    $lastAction = null;
    $lastBreakStartTime = null;
    $lastCheckInStartTime = null;

    foreach ($shifts as $shift) {
        $pkShift = $shift['pk'];

        $stmtShiftAction = $pdo->prepare("
            SELECT actionType
            FROM checkInRecords
            WHERE promoterCode = :code AND pk = :pk
            ORDER BY checkTimestamp DESC
            LIMIT 1
        ");
        $stmtShiftAction->execute([
            ':code' => $code,
            ':pk'   => $pkShift
        ]);
        $row = $stmtShiftAction->fetch(PDO::FETCH_ASSOC);

        if ($row && $row['actionType'] !== 'CHECK OUT') {
            $selectedShift = $shift;
            $lastAction = $row['actionType'];

            if ($row['actionType'] === 'START BREAK') {
                file_put_contents($debugFile, "Entro por IF de actionType = START BREAK\n", FILE_APPEND);

                $stmtBreak = $pdo->prepare("
                    SELECT userLocalDatetime
                    FROM checkInRecords
                    WHERE promoterCode = :code AND pk = :pk AND actionType = 'START BREAK'
                    ORDER BY checkTimestamp DESC
                    LIMIT 1
                ");
                $stmtBreak->execute([
                    ':code' => $code,
                    ':pk'   => $pkShift
                ]);
                $breakStartRow = $stmtBreak->fetch(PDO::FETCH_ASSOC);

                if ($breakStartRow) {
                    $lastBreakStartTime = $breakStartRow['userLocalDatetime'];
                    file_put_contents($debugFile, "lastBreakStartTime: " . $lastBreakStartTime . "\n", FILE_APPEND);
                }
            }

            if ($row['actionType'] === 'CHECK IN' || $row['actionType'] === 'END BREAK') {
                file_put_contents($debugFile, "Entro por IF de actionType = CHECK IN o END BREAK\n", FILE_APPEND);

                $stmtCheckIn = $pdo->prepare("
                    SELECT userLocalDatetime
                    FROM checkInRecords
                    WHERE promoterCode = :code AND pk = :pk AND actionType = 'CHECK IN'
                    ORDER BY checkTimestamp DESC
                    LIMIT 1
                ");
                $stmtCheckIn->execute([
                    ':code' => $code,
                    ':pk'   => $pkShift
                ]);
                $shiftStartRow = $stmtCheckIn->fetch(PDO::FETCH_ASSOC);

                if ($shiftStartRow) {
                    $lastCheckInStartTime = $shiftStartRow['userLocalDatetime'];
                    file_put_contents($debugFile, "lastCheckInStartTime: " . $lastCheckInStartTime . "\n", FILE_APPEND);
                }
            }
            break;
        }
    }

    if (!$selectedShift && !empty($shifts)) {
        $selectedShift = $shifts[0];
        $lastAction = null;
    }

    echo json_encode([
        'success'            => true,
        'promoterCode'       => $promoter['promoterCode'],
        'supervisorLevel'    => (int)($promoter['supervisorLevel'] ?? 0),
        'promoterName'       => $promoter['promoterName'],
        'promoterPhone'      => $promoter['promoterPhone'],
        'promoterEmail'      => $promoter['promoterEmail'],
        'shiftsToday'        => $shifts,
        'selectedShift'      => $selectedShift,
        'lastAction'         => $lastAction,
        'globalParams'       => $globalParams,
        'expressParams'      => $expressParams,
        'lastBreakStartTime' => $lastBreakStartTime,
        'lastShiftStartTime' => $lastCheckInStartTime,
        'allShifts'          => $allShifts,
        'nextPayroll'        => $nextPayroll,
        'lastPayroll'        => $lastPayroll,
        'pendingReportsArray'    => $pendingReportsArray,
        'pendingReportsNumber'   => $pendingReportsNumber,
        'shiftsForReimbursement' => $shiftsForReimbursement,
        'expensesTypes'      => $expensesTypes,
        'productsMaster'     => $productsMaster,
        'productsVersion'    => $productsVersion,
        'brandsMaster'       => $brandsMaster,
        'brandsVersion'      => $brandsVersion,
        'trainingVideos'     => $trainingVideos,
        'isReimbursementDefaultApprover'      => $isReimbursementDefaultApprover,
        'pendingReimbursementApprovalsNumber' => $pendingReimbursementApprovalsNumber,
        'reimbursementParameters' => $reimbursementParameters,
        'expressInAllowed'        => (int)($promoter['expressInAllowed'] ?? 0),
        'expressPhotosRequired'   => (string)($promoter['expressPhotosRequired'] ?? "NO"),
        'canPerformAdminTasks'    => (int)($promoter['canPerformAdminTasks'] ?? 0),
        'canAddHoursManually'     => (int)($promoter['canAddHoursManually'] ?? 0),
        'lastExpressAction'       => $lastExpressAction,
        'lastExpressStartTime'    => $lastExpressStartTime,
        'toDoListArray'           => $toDoListArray,
        'lastExpressInId'         => $lastExpressInId,
        'lastExpressInPk'         => $lastExpressInPk,
        'expressReportDone'       => $expressReportDone,
        'promoter'  => $promoter
    ]);
} catch (Exception $e) {
    file_put_contents($debugFile, "[" . date('Y-m-d H:i:s') . "] EXCEPTION: " . $e->getMessage() . "\n", FILE_APPEND);
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error',
        'details' => $e->getMessage()
    ]);
} finally {
    try {
        Database::closeConnection($__caller, $__user, $__ip, $__country, $__city);
    } catch (Throwable $t) {
        file_put_contents($debugFile, "[" . date('Y-m-d H:i:s') . "] closeConnection error: " . $t->getMessage() . "\n", FILE_APPEND);
    }
    $pdo = null;
}
