<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__, 2) . '/private/core/bootstrap.php';
require_once $PATHS['core'] . 'dbConnectGo.php';

$arrayBlocked = [];

$timestamp1 = date("Y-m-d H:i:s");

$numReceivedRecords = 0;
$numInsertedRecords = 0;
$numUpdatedRecords = 0;
$numBlockedRecords = 0;

$pdo = null;

$__caller  = basename(__FILE__);
$__user    = trim((string)($_POST['username'] ?? 'Unknown'));
$__ip      = $_POST['ip'] ?? ($_SERVER['REMOTE_ADDR'] ?? 'Unknown');
$__country = $_POST['country'] ?? 'Unknown';
$__city    = $_POST['city'] ?? 'Unknown';

$debugFile = rtrim($PATHS['logs'], '/\\') . '/debug_log.txt';

try {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        throw new Exception('Invalid request method.');
    }

    $recordsJson = $_POST['records'] ?? '';
    if ($recordsJson === '') {
        throw new Exception('Missing records.');
    }

    $records = json_decode($recordsJson, true);
    if (!is_array($records)) {
        throw new Exception('Invalid records JSON.');
    }

    $db  = Database::getInstance();
    $pdo = $db->getConnection($__caller, $__user, $__ip, $__country, $__city);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    ////
    file_put_contents($debugFile, "DB TEST START\n", FILE_APPEND);

    $stmtTest = $pdo->query("SELECT DATABASE() AS dbname");
    $rowTest = $stmtTest->fetch(PDO::FETCH_ASSOC);
    file_put_contents($debugFile, "CONNECTED DB: " . ($rowTest['dbname'] ?? 'NULL') . "\n", FILE_APPEND);

    $stmtCount = $pdo->query("SELECT COUNT(*) AS total FROM promoters");
    $rowCount = $stmtCount->fetch(PDO::FETCH_ASSOC);
    file_put_contents($debugFile, "PROMOTERS BEFORE: " . ($rowCount['total'] ?? 'NULL') . "\n", FILE_APPEND);
    ///// 


    $selectSql = "SELECT COUNT(*) FROM promoters WHERE promoterCode = :promoterCode";
    $selectStmt = $pdo->prepare($selectSql);
    if (!$selectStmt) {
        throw new Exception('Select Statement Preparation Error.');
    }

    $selectSql2 = "SELECT blockedForUpdate FROM promoters WHERE promoterCode = :promoterCode";
    $selectStmt2 = $pdo->prepare($selectSql2);
    if (!$selectStmt2) {
        throw new Exception('Select Statement2 Preparation Error.');
    }

    $updateSql = "
        UPDATE promoters
        SET
            promoterName = :promoterName,
            market = :market,
            phone = :phone,
            email = :email,
            active = :active,
            blockedForUpdate = :blockedForUpdate,
            stateCode = :stateCode,
            promoterStatus = :promoterStatus,
            expressInAllowed = :expressInAllowed,
            regularInAllowed = :regularInAllowed,
            expressPhotosRequired = :expressPhotosRequired,
            supervisorCode = :supervisorCode,
            canPerformAdminTasks  = :canPerformAdminTasks,
            canAddHoursManually = :canAddHoursManually
        WHERE promoterCode = :promoterCode
    ";
    $updateStmt = $pdo->prepare($updateSql);
    if (!$updateStmt) {
        throw new Exception('Update Statement Preparation Error.');
    }

    $insertSql = "
        INSERT INTO promoters
            (promoterName, promoterCode, market, phone, email, active, blockedForUpdate, 
            stateCode, promoterStatus, expressInAllowed, regularInAllowed, 
            expressPhotosRequired, supervisorCode, canPerformAdminTasks, canAddHoursManually)
        VALUES
            (:promoterName, :promoterCode, :market, :phone, :email, :active, :blockedForUpdate,
             :stateCode, :promoterStatus, :expressInAllowed, :regularInAllowed, 
             :expressPhotosRequired	, :supervisorCode, :canPerformAdminTasks, :canAddHoursManually)
    ";
    $insertStmt = $pdo->prepare($insertSql);
    if (!$insertStmt) {
        throw new Exception('Insert Statement Preparation Error.');
    }

    foreach ($records as $record) {

        if ($numReceivedRecords === 0) {
            file_put_contents($debugFile, "FIRST RECORD: " . json_encode($record) . "\n", FILE_APPEND);
        }

        $promoterName   = trim((string)($record['promoterName'] ?? ''));
        $promoterCode   = trim((string)($record['promoterCode'] ?? ''));
        $market         = trim((string)($record['market'] ?? ''));
        $stateCode      = trim((string)($record['stateCode'] ?? ''));
        $phone          = trim((string)($record['phone'] ?? ''));
        $email          = trim((string)($record['email'] ?? ''));
        $active         = isset($record['active']) ? (int)$record['active'] : 0;
        $promoterStatus = trim((string)($record['promoterStatus'] ?? ''));
        $expressInAllowed = isset($record['expressIn']) ? (int)$record['expressIn'] : 0;
        $regularInAllowed = isset($record['regularIn']) ? (int)$record['regularIn'] : 1;
        $expressPhotosRequired	= isset($record['expressPhotosRequired']) ? (string)$record['expressPhotosRequired'] : 'NO';
        $supervisorCode  = trim((string)($record['supervisorCode'] ?? ''));
        $canPerformAdminTasks = isset($record['canPerformAdminTasks']) ? (int)$record['canPerformAdminTasks'] : 0;
        $canAddHoursManually = isset($record['canAddHoursManually']) ? (int)$record['canAddHoursManually'] : 0;
        $blockedForUpdate = 0;

        if ($promoterCode === '') {
            continue;
        }

        $numReceivedRecords++;

        // Verificar existencia
        $selectStmt->execute([
            ':promoterCode' => $promoterCode
        ]);

        $matchedRows = (int)$selectStmt->fetchColumn();
        $selectStmt->closeCursor();

        if ($matchedRows > 0) {
            // Verificar bloqueo
            $selectStmt2->execute([
                ':promoterCode' => $promoterCode
            ]);

            $result = $selectStmt2->fetch(PDO::FETCH_ASSOC);
            $blocked = isset($result['blockedForUpdate']) ? (int)$result['blockedForUpdate'] : 0;
            $selectStmt2->closeCursor();

            $arrayBlocked[] = $blocked;

            if ($blocked === 0) {
                $updateStmt->execute([
                    ':promoterName'      => $promoterName,
                    ':promoterCode'      => $promoterCode,
                    ':market'            => $market,
                    ':stateCode'         => $stateCode,
                    ':phone'             => $phone,
                    ':email'             => $email,
                    ':active'            => $active,
                    ':blockedForUpdate'  => $blockedForUpdate,
                    ':promoterStatus'    => $promoterStatus,
                    ':expressInAllowed'  => $expressInAllowed,
                    ':regularInAllowed'  => $regularInAllowed,
                    ':expressPhotosRequired' => $expressPhotosRequired,
                    ':supervisorCode'        => $supervisorCode,
                    ':canPerformAdminTasks'  => $canPerformAdminTasks,
                    ':canAddHoursManually'   => $canAddHoursManually
                ]); 

                

                $affectedRows = $updateStmt->rowCount();
                $updateStmt->closeCursor();

                if ($affectedRows > 0) {
                    $numUpdatedRecords += $affectedRows;
                }
            } else {
                $numBlockedRecords++;
            }

        } else {
            // Insertar nuevo
            $insertStmt->execute([
                ':promoterName'      => $promoterName,
                ':promoterCode'      => $promoterCode,
                ':market'            => $market,
                ':stateCode'         => $stateCode,
                ':phone'             => $phone,
                ':email'             => $email,
                ':active'            => $active,
                ':blockedForUpdate'  => $blockedForUpdate,
                ':promoterStatus'    => $promoterStatus,
                ':expressInAllowed'  => $expressInAllowed,
                ':regularInAllowed'  => $regularInAllowed,
                ':expressPhotosRequired' => $expressPhotosRequired,
                ':supervisorCode'        => $supervisorCode,
                ':canPerformAdminTasks'  => $canPerformAdminTasks,
                ':canAddHoursManually'   => $canAddHoursManually
            ]);

            
            $rowCount = $insertStmt->rowCount();
            $insertStmt->closeCursor();
            file_put_contents($debugFile, "INSERT ROWCOUNT: " . $rowCount . "\n", FILE_APPEND);

            
            if ($rowCount > 0) {
                $numInsertedRecords++;
            } else {
                throw new Exception('Error inserting record.');
            }
        }
    }

} catch (Throwable $e) {
    file_put_contents(
        $debugFile,
        "[" . date('Y-m-d H:i:s') . "] ❌ {$__caller} ERROR: " . $e->getMessage() . "\n",
        FILE_APPEND
    );

    http_response_code(500);

    echo json_encode([
        'ok' => false,
        'message' => $e->getMessage(),
        'startTime' => $timestamp1,
        'numReceivedRecords' => $numReceivedRecords,
        'numInsertedRecords' => $numInsertedRecords,
        'numUpdatedRecords' => $numUpdatedRecords,
        'numBlockedRecords' => $numBlockedRecords,
        'finishTime' => date("Y-m-d H:i:s")
    ], JSON_UNESCAPED_UNICODE);

    return;

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

$timestamp2 = date("Y-m-d H:i:s");

$data = [
    'ok' => true,
    'startTime' => $timestamp1,
    'numReceivedRecords' => $numReceivedRecords,
    'numInsertedRecords' => $numInsertedRecords,
    'numUpdatedRecords' => $numUpdatedRecords,
    'numBlockedRecords' => $numBlockedRecords,
    'finishTime' => $timestamp2
    // 'arrayBlocked' => $arrayBlocked
];

echo json_encode($data, JSON_UNESCAPED_UNICODE);
?>