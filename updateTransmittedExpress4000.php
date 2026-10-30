<?php
header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__, 2) . "/private/core/bootstrap.php";
require_once dirname(__DIR__, 2) . "/private/core/dbConnectGo.php";

$username    = $_POST['username'] ?? 'unknown';
$ip          = $_POST['ip'] ?? '';
$country     = $_POST['country'] ?? '';
$city        = $_POST['city'] ?? '';
$recordsJson = $_POST['records'] ?? '[]';

try {

    $records = json_decode($recordsJson, true);

    if (!is_array($records)) {
        throw new Exception('Invalid records payload');
    }

    if (count($records) === 0) {
        echo json_encode([
            'success' => true,
            'updated' => 0
        ]);
        exit;
    }

    $conn = Database::getInstance()->getConnection(
        'updateTransmittedExpress3200',
        $username,
        $ip,
        $country,
        $city
    );

    $conn->beginTransaction();

    $sql = " UPDATE checkInRecords
        SET expressTransmitted = 1,
        expressPhotoLinks = :expressPhotoLinks,
        expressRealPk = :expressRealPk
        WHERE idCheck = :idCheck ";

    $stmt = $conn->prepare($sql);

    $updated = 0;

    foreach ($records as $r) {

        $idCheck = intval($r['idCheck'] ?? 0);

        if ($idCheck <= 0) {
            continue;
        }

        $stmt->execute([
            ':idCheck'       => $idCheck,
            ':expressPhotoLinks'    => $r['expressPhotoLinks'] ?? '',
            ':expressRealPk' => $r['expressRealPk'] ?? ''
        ]);

        $updated += $stmt->rowCount();
    }

    $conn->commit();
    echo json_encode([
        'success' => true,
        'updated' => $updated
    ]);

} catch (Throwable $e) {

    if (isset($conn) && $conn->inTransaction()) {
        $conn->rollBack();
    }

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
