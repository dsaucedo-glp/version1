<?php

header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__, 2) . "/private/core/bootstrap.php";
require_once dirname(__DIR__, 2) . "/private/core/dbConnectGo.php";

$username    = $_POST['username'] ?? 'unknown';
$ip          = $_POST['ip'] ?? '';
$country     = $_POST['country'] ?? '';
$city        = $_POST['city'] ?? '';
$recordsJson = $_POST['records'] ?? '[]';

$conn = null;

try {

    // =========================================================
    // 1. DECODE RECORDS
    // =========================================================

    $ids = json_decode($recordsJson, true);

    if (!is_array($ids) || count($ids) === 0) {
        throw new Exception('No idManualHour values received.');
    }

    $ids = array_values(
        array_unique(
            array_filter(
                array_map('intval', $ids),
                fn($id) => $id > 0
            )
        )
    );

    if (count($ids) === 0) {
        throw new Exception('No valid idManualHour values received.');
    }

    $expectedCount = count($ids);


    // =========================================================
    // 2. DATABASE
    // =========================================================

    $conn = Database::getInstance()->getConnection(
        'updateManualHoursTransmitted3200',
        $username,
        $ip,
        $country,
        $city
    );


    // =========================================================
    // 3. BEGIN TRANSACTION
    // =========================================================

    $conn->beginTransaction();

    $placeholders = implode(
        ',',
        array_fill(0, $expectedCount, '?')
    );


    // =========================================================
    // 4. LOCK AND VERIFY RECORDS
    // =========================================================

    $sqlCheck = "
        SELECT idManualHour
        FROM manualHours
        WHERE idManualHour IN ($placeholders)
        FOR UPDATE
    ";

    $stmtCheck = $conn->prepare($sqlCheck);
    $stmtCheck->execute($ids);

    $existingIds = $stmtCheck->fetchAll(PDO::FETCH_COLUMN);

    if (count($existingIds) !== $expectedCount) {

        $missingIds = array_values(
            array_diff(
                $ids,
                array_map('intval', $existingIds)
            )
        );

        throw new Exception(
            'Some manual hour records do not exist. Missing IDs: ' .
            implode(',', $missingIds)
        );
    }


    // =========================================================
    // 5. UPDATE
    // =========================================================

    $sqlUpdate = "
        UPDATE manualHours
        SET transmitted = 1
        WHERE idManualHour IN ($placeholders)
    ";

    $stmtUpdate = $conn->prepare($sqlUpdate);
    $stmtUpdate->execute($ids);


    // =========================================================
    // 6. VERIFY FINAL STATE
    // =========================================================

    $sqlVerify = "
        SELECT COUNT(*)
        FROM manualHours
        WHERE idManualHour IN ($placeholders)
          AND transmitted = 1
    ";

    $stmtVerify = $conn->prepare($sqlVerify);
    $stmtVerify->execute($ids);

    $transmittedCount = (int)$stmtVerify->fetchColumn();

    if ($transmittedCount !== $expectedCount) {

        throw new Exception(
            "Transmission verification failed. Expected {$expectedCount}, " .
            "found {$transmittedCount}."
        );
    }


    // =========================================================
    // 7. COMMIT
    // =========================================================

    $conn->commit();

    echo json_encode([
        'success'     => true,
        'received'    => $expectedCount,
        'transmitted' => $transmittedCount,
        'ids'         => $ids
    ]);

} catch (Throwable $e) {

    if ($conn instanceof PDO && $conn->inTransaction()) {
        $conn->rollBack();
    }

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);

} finally {

    $conn = null;
}
?>