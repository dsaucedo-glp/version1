<?php

/**
 * New Staffing Check In - submit action con closeConnection obligatorio
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__, 2) . '/private/core/bootstrap.php';
require_once $PATHS['core'] . 'dbConnectGo.php';
require_once $PATHS['core'] . 'communications.php';

function cleanDecimalOrNull($value): ?string
{
    if ($value === null) return null;
    $value = trim((string)$value);
    if ($value === '' || strtolower($value) === 'null' || strtolower($value) === 'undefined') {
        return null;
    }
    if (!is_numeric($value)) {
        return null;
    }
    return $value;
}

function hasValidGpsCoordinates(?string $lat, ?string $lon): bool
{
    if ($lat === null || $lon === null) {
        return false;
    }
    $latitude = (float)$lat;
    $longitude = (float)$lon;
    return
        is_finite($latitude) &&
        is_finite($longitude) &&
        $latitude >= -90 &&
        $latitude <= 90 &&
        $longitude >= -180 &&
        $longitude <= 180 &&
        !($latitude == 0.0 && $longitude == 0.0);
}

function isOutsideAllowedDistance(?string $milesDistance, ?string $maxDistanceAllowed): bool
{
    if (
        $milesDistance === null ||
        $maxDistanceAllowed === null
    ) {
        return false;
    }
    $distance = (float)$milesDistance;
    $maximum = (float)$maxDistanceAllowed;
    if ($maximum <= 0) {
        return false;
    }
    return $distance > $maximum;
}

// ========= Identificación para closeConnection() =========
$__caller  = basename(__FILE__);
$__ip      = $_POST['ip'] ?? 'Unknown';
$__user    = isset($_POST['code']) ? strtoupper(trim($_POST['code'])) : 'Unknown';
$__country = $_POST['country'] ?? 'Unknown';
$__city    = $_POST['city'] ?? 'Unknown';

$pdo = null;
$debugFile = rtrim($PATHS['logs'], '/\\') . '/debug_log.txt';

// ========= LOG DE ARRANQUE =========
file_put_contents($debugFile, "[" . date('Y-m-d H:i:s') . "] ✅ Entré a " . $__caller . "\n", FILE_APPEND);

// ========= ENTRADA (POST) =========
$promoterCode    = trim((string)($_POST['promoterCode'] ?? ''));
$promoterName    = trim((string)($_POST['promoterName'] ?? ''));
$promoterEmail   = trim((string)($_POST['promoterEmail'] ?? 'dsaucedo@golocapromos.com'));
$supervisorEmail = trim((string)($_POST['supervisorEmail'] ?? 'dsaucedo@golocapromos.com'));
$pk              = $_POST['pk'] ?? null;
$localDatetime   = trim((string)($_POST['localDatetime'] ?? ''));
$actionType      = trim((string)($_POST['actionType'] ?? ''));
$address         = trim((string)($_POST['address'] ?? 'Not provided'));
$photoBase64     = $_POST['photoBase64'] ?? null;
$displayDate     = $_POST['displayDate'] ?? null;
$displayTime     = $_POST['displayTime'] ?? null;
$checkDate       = $_POST['checkDate'] ?? null;
$checkTime       = $_POST['checkTime'] ?? null;
$brand           =  trim((string)($_POST['brand'] ?? ''));
$market          =  trim((string)($_POST['market'] ?? ''));
$venue           = trim((string)($_POST['venue'] ?? $_POST['location1'] ?? ''));
$eventName       =  trim((string)($_POST['eventName'] ?? ''));
$expressSessionId = trim((string)($_POST['expressSessionId'] ?? ''));
$expressParentId = isset($_POST['expressParentId']) && $_POST['expressParentId'] !== ''
    ? (int)$_POST['expressParentId']
    : null;



$lat = cleanDecimalOrNull($_POST['lat'] ?? null);
$lon = cleanDecimalOrNull($_POST['lon'] ?? null);
if ($lat === null || $lon === null) {
    $address = 'Location not available';
}


$milesDistance = cleanDecimalOrNull(
    $_POST['milesDistance'] ?? null
);

$targetYLat = cleanDecimalOrNull(
    $_POST['targetYLat'] ?? null
);

$targetXLong = cleanDecimalOrNull(
    $_POST['targetXLong'] ?? null
);

/*
|--------------------------------------------------------------------------
| GEO OVERRIDE
|--------------------------------------------------------------------------
| geoAccuracyMeters:
| Precisión original entregada por el navegador, en metros.
|
| maxDistanceAllowed:
| Distancia máxima permitida para esta acción, en millas.
|
| geoOverrideAccepted:
| 1 únicamente cuando el usuario vio la advertencia por distancia
| y confirmó que desea continuar.
|
| geoOverrideReason:
| Motivo auditable de la excepción geográfica.
|--------------------------------------------------------------------------
*/

$geoAccuracyMeters = cleanDecimalOrNull(
    $_POST['geoAccuracyMeters'] ?? null
);

$maxDistanceAllowed = cleanDecimalOrNull(
    $_POST['maxDistanceAllowed'] ?? null
);

$geoOverrideAccepted =
    isset($_POST['geoOverrideAccepted']) &&
    (int)$_POST['geoOverrideAccepted'] === 1
    ? 1
    : 0;

$geoOverrideReason = trim(
    (string)($_POST['geoOverrideReason'] ?? '')
);

if (strlen($geoOverrideReason) > 50) {
    $geoOverrideReason = substr(
        $geoOverrideReason,
        0,
        50
    );
}

/*
 * Siempre empieza en 0.
 * Solo se cambiará a 1 después de enviar exitosamente
 * la alerta al manager.
 */
$geoAlertSent = 0;

$twilioSid   = trim((string) envValue('TWILIO_SID'));
$twilioToken = trim((string) envValue('TWILIO_TOKEN'));
$twilioFrom  = trim((string) envValue('TWILIO_FROM'));

// Log de entrada (sin volcar el base64)
$postCopy = $_POST;
if (isset($postCopy['photoBase64'])) {
    $postCopy['photoBase64'] = '[BASE64_TRUNCATED]';
}
file_put_contents($debugFile, "[" . date('Y-m-d H:i:s') . "] POST: " . json_encode($postCopy) . "\n", FILE_APPEND);

try {
    // ========= CONEXIÓN DB =========
    try {
        $db  = Database::getInstance();
        $pdo = $db->getConnection($__caller, $__user, $__ip, $__country, $__city);
    } catch (Exception $e) {
        if (function_exists('str_starts_with') && str_starts_with($e->getMessage(), "DB_CONNECTION_ERROR")) {
            echo json_encode([
                "success" => false,
                "message" => "Database connection error"
            ]);
            return;
        }

        file_put_contents($debugFile, "[" . date('Y-m-d H:i:s') . "] ❌ DB error: " . $e->getMessage() . "\n", FILE_APPEND);
        throw $e;
    }

    // ===== VALIDACIONES =====
    if ($promoterCode === '' || $promoterName === '' || empty($pk) || $localDatetime === '' || $actionType === '') {
        file_put_contents($debugFile, "[" . date('Y-m-d H:i:s') . "] ❌ Faltan parámetros requeridos\n", FILE_APPEND);
        throw new Exception("Missing required parameters.");
    }

    $isExpress = in_array($actionType, ['EXPRESS IN', 'EXPRESS OUT'], true);
    if (!$isExpress && empty($pk)) {
        throw new Exception("Missing required pk.");
    }

    // GPS requirement will be determined from database parameters.
    // Never trust a GPS-required flag supplied by the browser.
    // $geoRequiredByServer = false;

    /*
    |--------------------------------------------------------------------------
    | VALIDACIÓN DEL GEO OVERRIDE
    |--------------------------------------------------------------------------
    */

    $isOutsideAllowedDistance = isOutsideAllowedDistance(
        $milesDistance,
        $maxDistanceAllowed
    );

    /*
    * EXPRESS IN / OUT no utiliza restricción de distancia.
    * Por seguridad, nunca debe registrarse como geo override.
    */
    if ($isExpress) {
        $isOutsideAllowedDistance = false;
        $geoOverrideAccepted = 0;
        $geoOverrideReason = '';
    }

    /*
    * Si el front envía geoOverrideAccepted = 1,
    * el backend verifica que realmente exista una distancia
    * superior al máximo permitido.
    */
    if ($geoOverrideAccepted === 1) {
        if (!$isOutsideAllowedDistance) {
            file_put_contents(
                $debugFile,
                "[" . date('Y-m-d H:i:s') . "] " .
                    "⚠️ GEO override inválido ignorado. " .
                    "Distance=" . ($milesDistance ?? 'NULL') . ", " .
                    "Max=" . ($maxDistanceAllowed ?? 'NULL') . "\n",
                FILE_APPEND
            );

            $geoOverrideAccepted = 0;
            $geoOverrideReason = '';
        } else {
            $geoOverrideReason = 'OUTSIDE_ALLOWED_DISTANCE';
        }
    }

    /*
    * Si realmente está fuera del rango, pero el usuario
    * no confirmó YES, el backend no permite continuar.
    */
    if (
        $isOutsideAllowedDistance &&
        $geoOverrideAccepted !== 1
    ) {
        file_put_contents(
            $debugFile,
            "[" . date('Y-m-d H:i:s') . "] " .
                "❌ Acción fuera del rango sin autorización del usuario. " .
                "Distance=" . ($milesDistance ?? 'NULL') . ", " .
                "Max=" . ($maxDistanceAllowed ?? 'NULL') . "\n",
            FILE_APPEND
        );

        throw new Exception(
            "Outside allowed distance without confirmation."
        );
    }

    // Acepta "YYYY-MM-DD HH:MM:SS" y "YYYY-MM-DDTHH:MM:SS"
    $dt = str_replace('T', ' ', $localDatetime);
    $parts = explode(' ', $dt, 2);
    $localDate = $parts[0] ?? '';
    $localTime = $parts[1] ?? '';

    if ($localDate === '' || $localTime === '') {
        $ts = strtotime($localDatetime);
        if ($ts !== false) {
            $localDate = date('Y-m-d', $ts);
            $localTime = date('H:i:s', $ts);
        }
    }

    if ($localDate === '' || $localTime === '') {
        throw new Exception("Invalid localDatetime.");
    }

    // ===== PREPARAR CARPETA DE IMÁGENES =====
    $uploadDir = rtrim($PATHS['checkin'], '/\\') . '/';

    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0755, true) && !is_dir($uploadDir)) {
            throw new Exception("Cannot create checkin uploads directory.");
        }
    }

    if (!is_writable($uploadDir)) {
        throw new Exception("Checkin uploads directory is not writable.");
    }

    $noBreakReason = isset($_POST['noBreakReason']) ? trim((string)$_POST['noBreakReason']) : '';
    if (strlen($noBreakReason) > 200) {
        $noBreakReason = substr($noBreakReason, 0, 200);
    }

    $expressTasks = '';

    if (isset($_POST['expressTasks'])) {
        file_put_contents(
            $debugFile,
            "[" . date('Y-m-d H:i:s') . "] " . "⚠️ Ignored deprecated expressTasks field for actionType={$actionType}\n",
            FILE_APPEND
        );
    }

    $photoPath = null;
    $publicUrl = null;

    $workedText = '';

    if ($actionType === 'EXPRESS OUT' && $expressParentId !== null) {
        $stmtLastIn = $pdo->prepare("
            SELECT userLocalDatetime
            FROM checkInRecords
            WHERE idCheck = :idCheck
            AND promoterCode = :code
            AND actionType = 'EXPRESS IN'
            LIMIT 1
        ");

        $stmtLastIn->execute([
            ':idCheck' => $expressParentId,
            ':code'    => $promoterCode
        ]);

        $lastIn = $stmtLastIn->fetch(PDO::FETCH_ASSOC);

        if ($lastIn && !empty($lastIn['userLocalDatetime'])) {
            $startTs = strtotime($lastIn['userLocalDatetime']);
            $endTs   = strtotime($localDatetime);

            if ($startTs !== false && $endTs !== false && $endTs >= $startTs) {
                $totalMinutes = (int) floor(($endTs - $startTs) / 60);
                $hours = intdiv($totalMinutes, 60);
                $minutes = $totalMinutes % 60;
                $workedText = sprintf('%02d:%02d', $hours, $minutes);
            }
        }
    }


    // ===== GUARDAR FOTO (opcional) =====
    if (!empty($photoBase64)) {
        file_put_contents($debugFile, "[" . date('Y-m-d H:i:s') . "] Photo base64 received, decoding…\n", FILE_APPEND);

        $safeCode = preg_replace('/[^A-Za-z0-9]/', '', $promoterCode);
        $safeName = preg_replace('/[^A-Za-z0-9]/', '', str_replace(' ', '_', $promoterName));
        $safePk   = preg_replace('/[^A-Za-z0-9]/', '', (string)$pk);
        $safeAction = preg_replace('/[^A-Za-z0-9_\-]/', '_', $actionType);

        $timestamp = date('YmdHis');

        $fileName  = "{$safePk}_{$safeAction}_{$safeCode}_{$safeName}_{$timestamp}.jpg";
        $fullPath  = $uploadDir . $fileName;

        $photoData = base64_decode($photoBase64, true);

        if ($photoData === false) {
            file_put_contents($debugFile, "[" . date('Y-m-d H:i:s') . "] ❌ base64_decode failed\n", FILE_APPEND);
            throw new Exception("Image base64 could not be decoded.");
        }

        $bytes = file_put_contents($fullPath, $photoData);
        file_put_contents($debugFile, "[" . date('Y-m-d H:i:s') . "] Saving image in $fullPath => " . ($bytes !== false ? "OK ($bytes bytes)" : "FAILED") . "\n", FILE_APPEND);

        if ($bytes === false || !file_exists($fullPath)) {
            throw new Exception("Could not save image at $fullPath.");
        }

        $photoPath = $fullPath;

        // Si checkin es privado, NO devuelvas URL pública.
        // Si luego decides hacerlo público, aquí ajustas esta lógica.
        $publicUrl = null;
    }

    // ===== TRANSACCIÓN =====
    $pdo->beginTransaction();

    $sql = "INSERT INTO checkInRecords (
        promoterCode, promoterName, pk, userLocalDate, userLocalTime,
        userLocalDatetime, promoterLongLocation, actionType, lat, lon,
        photoPath, noBreakReason, checkDisplayDate, checkDisplayTime,
        checkDate, checkTime, milesDistance, geoAccuracyMeters,
        maxDistanceAllowed, geoOverrideAccepted, geoOverrideReason,
        geoAlertSent, targetYLat, targetXLong,
        brand, market, venue, eventName,
        expressSessionId, expressParentId, expressTasks
    ) VALUES (
        :promoterCode, :promoterName, :pk, :localDate, :localTime,
        :localDatetime, :promoterLongLocation, :actionType, :lat, :lon,
        :photoPath, :noBreakReason, :displayDate, :displayTime,
        :checkDate, :checkTime, :milesDistance, :geoAccuracyMeters,
        :maxDistanceAllowed, :geoOverrideAccepted, :geoOverrideReason,
        :geoAlertSent, :targetYLat, :targetXLong,
        :brand, :market, :venue, :eventName,
        :expressSessionId, :expressParentId, :expressTasks
    )";

    $stmt = $pdo->prepare($sql);

    $stmt->bindValue(':promoterCode', $promoterCode);
    $stmt->bindValue(':promoterName', $promoterName);
    $stmt->bindValue(':pk', $pk);
    $stmt->bindValue(':localDate', $localDate);
    $stmt->bindValue(':localTime', $localTime);
    $stmt->bindValue(':localDatetime', $localDatetime);
    $stmt->bindValue(':promoterLongLocation', $address);
    $stmt->bindValue(':actionType', $actionType);

    $stmt->bindValue(':lat', $lat, $lat === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
    $stmt->bindValue(':lon', $lon, $lon === null ? PDO::PARAM_NULL : PDO::PARAM_STR);

    $stmt->bindValue(':photoPath', $photoPath);
    $stmt->bindValue(':noBreakReason', $noBreakReason);
    $stmt->bindValue(':displayDate', $displayDate);
    $stmt->bindValue(':displayTime', $displayTime);
    $stmt->bindValue(':checkDate', $checkDate);
    $stmt->bindValue(':checkTime', $checkTime);

    $stmt->bindValue(
        ':milesDistance',
        $milesDistance,
        $milesDistance === null ? PDO::PARAM_NULL : PDO::PARAM_STR
    );
    $stmt->bindValue(
        ':geoAccuracyMeters',
        $geoAccuracyMeters,
        $geoAccuracyMeters === null ? PDO::PARAM_NULL : PDO::PARAM_STR
    );
    $stmt->bindValue(
        ':maxDistanceAllowed',
        $maxDistanceAllowed,
        $maxDistanceAllowed === null ? PDO::PARAM_NULL : PDO::PARAM_STR
    );
    $stmt->bindValue(':geoOverrideAccepted', $geoOverrideAccepted, PDO::PARAM_INT);
    $stmt->bindValue(
        ':geoOverrideReason',
        $geoOverrideReason !== '' ? $geoOverrideReason : null,
        $geoOverrideReason !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL
    );
    $stmt->bindValue(':geoAlertSent', $geoAlertSent, PDO::PARAM_INT);
    $stmt->bindValue(':targetYLat', $targetYLat, $targetYLat === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
    $stmt->bindValue(':targetXLong', $targetXLong, $targetXLong === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
    $stmt->bindValue(':brand', $brand);
    $stmt->bindValue(':market', $market);
    $stmt->bindValue(':venue', $venue);
    $stmt->bindValue(':eventName', $eventName);
    $stmt->bindValue(':expressSessionId', $expressSessionId);
    $stmt->bindValue(
        ':expressParentId',
        $expressParentId,
        $expressParentId === null ? PDO::PARAM_NULL : PDO::PARAM_INT
    );
    $stmt->bindValue(':expressTasks', $expressTasks);
    $stmt->execute();

    $idCheck = (int)$pdo->lastInsertId();

    $affectedRows = $stmt->rowCount();
    file_put_contents(
        $debugFile,
        "[" . date('Y-m-d H:i:s') . "] INSERT idCheck={$idCheck}, Affected rows={$affectedRows}\n",
        FILE_APPEND
    );

    if ($affectedRows === 0) {
        throw new Exception("INSERT executed but affected 0 rows.");
    }

    // Si fue START BREAK => incrementa contador
    if ($actionType === 'START BREAK') {
        $updateSql = "UPDATE masterShifts SET breaksCounter = breaksCounter + 1 WHERE pk = :pk";
        $stmt2 = $pdo->prepare($updateSql);
        $stmt2->execute([':pk' => $pk]);
        file_put_contents($debugFile, "[" . date('Y-m-d H:i:s') . "] UPDATE breaksCounter (+1) OK para pk=$pk\n", FILE_APPEND);
    }

    $pdo->commit();


    // =====================================================
    // GO LOCAL PUSH NOTIFICATIONS — FIREBASE
    // =====================================================
    // Future global parameter: sendCheckInOutNotifications
    // Currently enabled for all CHECK IN / CHECK OUT actions.
    // PUSH failures must never affect saved records.
    // =====================================================

    $sendCheckInOutNotifications = true;

    // =====================================================
    // FIREBASE PUSH — STAFFING CHECK IN / CHECK OUT
    // =====================================================

    if (
        $sendCheckInOutNotifications &&
        in_array($actionType, ['CHECK IN', 'EXPRESS IN'], true)
    ) {
        try {
            require_once $PATHS['core'] . 'firebasePush.php';

            glpNotifyCheckInOut(
                $actionType,
                $promoterName,
                $eventName,
                $venue
            );
        } catch (Throwable $pushError) {
            error_log(
                '[GOLOCAL PUSH] idCheck=' . $idCheck .
                    ' Error: ' . $pushError->getMessage()
            );
        }
    }


    // Notifications are best-effort: the database transaction is already committed.
    try {


        // =====================================================================
        // EMAILS DESPUÉS DEL COMMIT
        // =====================================================================
        //
        // IMPORTANTE:
        // - La acción ya quedó grabada en la base de datos.
        // - Si el correo falla, NO se revierte el CHECK IN / CHECK OUT.
        // - EXPRESS conserva su notificación.
        // - CHECK IN / CHECK OUT normales notifican siempre al manager.
        // =====================================================================

        $latText = $lat ?? '0';
        $lonText = $lon ?? '0';

        $photoHtml = '';
        $emailImages = [];

        // =====================================================
        // GO LOCAL BRAND LOGO - EMBEDDED EMAIL IMAGE
        // =====================================================

        $logoPath = dirname(__DIR__) . '/img/GoLocalLogoWhite148.png';
        $logoCid = 'golocal_brand_logo';

        $logoHtml = '';

        if (is_file($logoPath) && is_readable($logoPath)) {

            $emailImages[] = [
                'path' => $logoPath,
                'cid'  => $logoCid,
                'name' => 'GoLocalLogoWhite148.png'
            ];

            $logoHtml = '<img src="cid:' . $logoCid . '"
        alt="Go Local Promotions"
        width="180"
        style="display:block;width:180px;max-width:100%;height:auto;border:0;">';
        }


        if ($photoPath && file_exists($photoPath)) {
            $photoCid = 'check_action_photo_' . $idCheck . '_' . time();

            $photoHtml = "
            <div style=\"margin-top:20px;\">
                <p style=\"margin-bottom:8px;\">
                    <strong>Photo:</strong>
                </p>

                <img
                    src=\"cid:" . htmlspecialchars($photoCid) . "\"
                    alt=\"Action photo\"
                    style=\"
                        display:block;
                        max-width:500px;
                        width:100%;
                        height:auto;
                        border-radius:10px;
                        border:1px solid #dddddd;
                    \"
                >
            </div>
        ";

            $emailImages[] = [
                'path' => $photoPath,
                'cid'  => $photoCid,
                'name' => basename($photoPath)
            ];
        }


        // =====================================================================
        // EXPRESS OUT - REPORT SUMMARY + PHOTOS
        // =====================================================================

        $reportPhotosHtml = '';
        $expressReportSummary = '';

        if ($actionType === 'EXPRESS OUT') {
            try {
                // Buscar el reporte correspondiente al Express PK.
                // Conserva la misma ruta que ya funcionaba para las fotos.
                $stmtExpressReport = $pdo->prepare("
                SELECT rh.idReportHeader, rh.shiftSummary
                FROM reportsHeader rh
                INNER JOIN checkInRecords ci
                    ON ci.pk = rh.pk
                   AND ci.promoterCode = rh.promoterCode
                   AND ci.actionType = 'EXPRESS IN'
                WHERE rh.promoterCode = :promoterCode
                  AND ci.idCheck < :currentOutId
                ORDER BY ci.idCheck DESC, rh.idReportHeader DESC
                LIMIT 1
            ");

                $stmtExpressReport->execute([
                    ':promoterCode' => strtoupper($promoterCode),
                    ':currentOutId' => $idCheck
                ]);

                $expressReportRow = $stmtExpressReport->fetch(PDO::FETCH_ASSOC);
                $expressReportHeaderId = false;

                if ($expressReportRow) {
                    $expressReportHeaderId = (int)$expressReportRow['idReportHeader'];
                    $expressReportSummary = trim(
                        (string)($expressReportRow['shiftSummary'] ?? '')
                    );
                }

                file_put_contents(
                    $debugFile,
                    "[" . date('Y-m-d H:i:s') . "] " .
                        "EXPRESS REPORT EMAIL LOOKUP: " .
                        "outPk={$pk}, " .
                        "currentOutId={$idCheck}, " .
                        "promoterCode={$promoterCode}, " .
                        "idReportHeader=" . ($expressReportHeaderId ?: 'NOT FOUND') . "\n",
                    FILE_APPEND
                );

                if ($expressReportHeaderId) {
                    $stmtExpressPhotos = $pdo->prepare("
                    SELECT fileName
                    FROM reportsFiles
                    WHERE idReportHeader = :idReportHeader
                    ORDER BY fileName ASC
                ");

                    $stmtExpressPhotos->execute([
                        ':idReportHeader' => $expressReportHeaderId
                    ]);

                    $expressReportPhotos = $stmtExpressPhotos->fetchAll(PDO::FETCH_ASSOC);

                    file_put_contents(
                        $debugFile,
                        "[" . date('Y-m-d H:i:s') . "] " .
                            "EXPRESS REPORT EMAIL PHOTOS: " .
                            "idReportHeader={$expressReportHeaderId}, " .
                            "count=" . count($expressReportPhotos) . "\n",
                        FILE_APPEND
                    );

                    if ($expressReportPhotos) {
                        $reportPhotosHtml = "
                        <div style=\"margin-top:25px;\">
                            <p style=\"margin-bottom:12px;\">
                                <strong>Express Report Photos:</strong>
                            </p>
                    ";

                        $reportPhotoNumber = 1;

                        foreach ($expressReportPhotos as $reportPhoto) {
                            $reportFileName = basename(
                                (string)($reportPhoto['fileName'] ?? '')
                            );

                            if ($reportFileName === '') {
                                continue;
                            }

                            $reportPhotoPath =
                                rtrim($PATHS['reports'], '/\\') .
                                '/' .
                                $reportFileName;

                            if (!file_exists($reportPhotoPath)) {
                                continue;
                            }

                            $reportPhotoCid =
                                'express_report_' .
                                $idCheck . '_' .
                                $reportPhotoNumber . '_' .
                                time();

                            $reportPhotosHtml .= "
                            <div style=\"margin-bottom:18px;\">
                                <div style=\"
                                    font-size:13px;
                                    color:#666666;
                                    margin-bottom:6px;
                                \">
                                    Report Photo {$reportPhotoNumber}
                                </div>

                                <img
                                    src=\"cid:" . htmlspecialchars($reportPhotoCid) . "\"
                                    alt=\"Express Report Photo {$reportPhotoNumber}\"
                                    style=\"
                                        display:block;
                                        max-width:500px;
                                        width:100%;
                                        height:auto;
                                        border-radius:10px;
                                        border:1px solid #dddddd;
                                    \">
                            </div>
                        ";

                            $emailImages[] = [
                                'path' => $reportPhotoPath,
                                'cid'  => $reportPhotoCid,
                                'name' => $reportFileName
                            ];

                            $reportPhotoNumber++;
                        }

                        $reportPhotosHtml .= "</div>";
                    }
                }
            } catch (Throwable $reportPhotoError) {
                // Un fallo recuperando el reporte no debe impedir el Express Out
                // ni el correo con la selfie.
                file_put_contents(
                    $debugFile,
                    "[" . date('Y-m-d H:i:s') . "] " .
                        "⚠️ Could not load Express Report data for email. " .
                        "PK={$pk}. Error: " .
                        $reportPhotoError->getMessage() . "\n",
                    FILE_APPEND
                );
            }
        }


        // =====================================================================
        // EXPRESS IN / EXPRESS OUT
        // =====================================================================

        if ($isExpress) {

            // Primary recipient: worker
            $expressRecipients = [];
            if ($promoterEmail !== '' && filter_var($promoterEmail, FILTER_VALIDATE_EMAIL)) {
                $expressRecipients[] = $promoterEmail;
            }
            // Count report photos (not the check-in/check-out selfie)
            $reportPhotoCount = isset($expressReportPhotos) ? count($expressReportPhotos) : 0;

            if ($actionType === 'EXPRESS OUT' && $reportPhotoCount > 0) {
                // Express OUT with report photos
                // $expressCc = ['operations@golocalpromos.com'];
                $expressCc = [];
                $expressBcc = ['dsaucedo@golocalpromos.com'];
            } else {
                // Express IN or Express OUT without report photos
                //$expressCc = ['karen@golocalpromos.com', 'milena@golocalpromos.com'];
                // $expressBcc = ['juang@golocalpromos.com', 'dsaucedo@golocalpromos.com', 'jeanpierre@golocalpromos.com'];
                $expressCc = [];
                $expressBcc = ['dsaucedo@golocalpromos.com'];
            }

            $subject = $actionType . ' : ' . $promoterName;

            // Branded Express email: same header/footer as forgotCode3200.php.
            $safe = static fn($value): string => htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
            $isExpressOut = ($actionType === 'EXPRESS OUT');
            $expressTitle = $isExpressOut ? 'EXPRESS OUT' : 'EXPRESS IN';
            $expressSubtitle = $isExpressOut ? 'Work Session Completed' : 'Work Session Started';
            $safePromoter = $safe($promoterName);
            $safeCode = $safe($promoterCode);
            $safeDate = $safe(date('D m/d/Y h:i a', strtotime($localDatetime)));
            $addressText = trim((string)$address);

            $hasValidLocation =  $lat !== null && $lon !== null
                && is_numeric($lat) && is_numeric($lon) &&
                !in_array(strtolower($addressText), [
                    '',
                    'geolocation failed',
                    'location not available',
                    'not provided',
                    'unknown'
                ], true);

            if ($hasValidLocation) {

                $mapsUrl = 'https://www.google.com/maps/search/?api=1&query='
                    . rawurlencode($addressText);

                $safeAddress = '<a href="' . $safe($mapsUrl) . '"
                style="color:#010F3C;text-decoration:underline;">
                ' . $safe($addressText) . '
                </a>';
            } else {

                $safeAddress = $safe($addressText !== ''
                    ? $addressText
                    : 'Location not available');
            }

            $safePk = $safe($pk);
            $detailRows = [
                ['ADDRESS', $safeAddress],
            ];
            if ($isExpressOut && $workedText !== '') {
                $detailRows[] = ['WORKED TIME', '<strong style="font-size:22px;color:#FF4F2A;">' . $safe($workedText) . '</strong>'];
            }
            if ($isExpressOut && $expressReportSummary !== '') {
                $detailRows[] = ['TASKS PERFORMED', nl2br($safe($expressReportSummary))];
            }

            $detailsHtml = '';
            foreach ($detailRows as [$label, $value]) {
                $detailsHtml .= '<tr><td style="padding:16px 0;border-bottom:1px solid #E7E7E7;'
                    . 'font-family:Arial,sans-serif;font-size:12px;font-weight:bold;letter-spacing:1px;'
                    . 'color:#595959;vertical-align:top;width:34%;">' . $label . '</td>'
                    . '<td style="padding:16px 0;border-bottom:1px solid #E7E7E7;'
                    . 'font-family:Arial,sans-serif;font-size:15px;line-height:1.6;'
                    . 'color:#010F3C;vertical-align:top;overflow-wrap:anywhere;">'
                    . $value . '</td></tr>';
            }

            // Existing CID images remain embedded and attached exactly as before.
            $photosSection = '';
            if ($photoHtml !== '') {
                $photoLabel = $isExpressOut ? 'CHECK-OUT PHOTO' : 'CHECK-IN PHOTO';
                $photosSection .= '<div style="font-family:Arial,sans-serif;font-size:13px;'
                    . 'font-weight:bold;letter-spacing:1px;color:#010F3C;margin-top:24px;">'
                    . $photoLabel . '</div>' . $photoHtml;
            }
            if ($isExpressOut && $reportPhotosHtml !== '') {
                $photosSection .= $reportPhotosHtml;
            }

            $message = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#E7E7E7;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
       style="background-color:#E7E7E7;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600"
       style="width:100%;max-width:600px;background:#FFFFFF;">
<!-- HEADER: identical to Recovery Access Code -->
<!-- GO LOCAL BRAND LOGO -->
<tr>
    <td align="center"
        style="background:#010F3C;padding:28px 32px;text-align:center;">
        {$logoHtml}
    </td>
</tr>
<tr><td style="height:5px;font-size:0;line-height:0;background:linear-gradient(90deg,#FF1B59,#FF4F2A);">&nbsp;</td></tr>
<!-- BODY -->
<tr><td style="padding:32px 32px 10px;">
<div style="font-family:'Oswald','Arial Narrow',Arial,sans-serif;font-size:27px;font-weight:700;line-height:1.2;color:#FF4F2A;">{$expressTitle}</div>
<div style="font-family:Arial,sans-serif;font-size:15px;color:#010F3C;margin-top:8px;">{$expressSubtitle}</div>
</td></tr>
<tr><td style="padding:16px 32px 28px;">
<div style="font-family:'Oswald','Arial Narrow',Arial,sans-serif;font-size:30px;font-weight:bold;color:#010F3C;">{$safePromoter}</div>
<div style="font-family:Arial,sans-serif;font-size:14px;color:#595959;">{$safeCode} &nbsp;&middot;&nbsp; {$safeDate}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
       style="margin-top:24px;border-top:1px solid #E7E7E7;">
{$detailsHtml}
</table>
{$photosSection}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
       style="margin-top:24px;border-top:1px solid #E7E7E7;">
<tr><td style="padding:16px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:bold;letter-spacing:1px;color:#595959;width:34%;">EXPRESS ID</td>
<td style="padding:16px 0;font-family:Arial,sans-serif;font-size:14px;color:#010F3C;">{$safePk}</td></tr>
</table>
</td></tr>
<!-- FOOTER: identical to Recovery Access Code -->
<tr><td style="background:#010F3C;padding:22px 32px;color:#FFFFFF;">
<div style="font-family:'Arial Narrow',Arial,sans-serif;font-size:13px;font-weight:400;letter-spacing:.5px;margin-bottom:7px;">GO LOCAL AUTOMATED MESSAGES</div>
<div style="font-family:'Arial Narrow',Arial,sans-serif;font-size:11px;font-weight:400;letter-spacing:0;line-height:1.4;color:#FFFFFF;white-space:nowrap;">
<a href="https://golocalpromos.com" style="color:#FFFFFF;text-decoration:none;">GOLOCALPROMOS.COM</a>
&nbsp;&middot;&nbsp;@GOLOCALPROMOS&nbsp;&middot;&nbsp;MIAMI, FLORIDA
</div></td></tr>
</table></td></tr></table>
</body></html>
HTML;

            file_put_contents(
                $debugFile,
                "[" . date('Y-m-d H:i:s') . "] " .
                    "EXPRESS EMAIL DEBUG 3200 | " .
                    "FILE=" . __FILE__ . " | " .
                    "ACTION=" . $actionType . " | " .
                    "IDCHECK=" . $idCheck . " | " .
                    "HTML=" . $message . "\n",
                FILE_APPEND
            );


            if (count($expressRecipients) > 0) {
                $emailResult = glpSendEmailSmtp(
                    'G',
                    $expressRecipients,
                    $expressCc,
                    $expressBcc,
                    $subject,
                    $message,
                    $emailImages,
                    []
                );

                file_put_contents(
                    $debugFile,
                    "[" . date('Y-m-d H:i:s') . "] " .
                        "EXPRESS EMAIL RESULT idCheck={$idCheck}: " .
                        json_encode($emailResult) . "\n",
                    FILE_APPEND
                );
            } else {
                file_put_contents(
                    $debugFile,
                    "[" . date('Y-m-d H:i:s') . "] " .
                        "⚠️ EXPRESS email skipped. Invalid promoter email: " .
                        $promoterEmail . "\n",
                    FILE_APPEND
                );
            }
        }


        // =====================================================================
        // CHECK IN / CHECK OUT NORMALES → SIEMPRE NOTIFICAR AL MANAGER
        // =====================================================================
        $supervisorEmail = 'dsaucedo@golocalpromos.com';
        if (!$isExpress && in_array($actionType, ['CHECK IN', 'CHECK OUT'], true)) {

            $managerRecipients = [];

            if (
                $supervisorEmail !== '' &&
                filter_var($supervisorEmail, FILTER_VALIDATE_EMAIL)
            ) {
                $managerRecipients[] = $supervisorEmail;
            }

            $isGeoException =
                $geoOverrideAccepted === 1 &&
                $isOutsideAllowedDistance;

            $subject = $isGeoException
                ? '[LOCATION EXCEPTION] ' .
                $actionType . ' by ' . $promoterName
                : $actionType . ' by ' . $promoterName;

            $accuracyFeet = null;

            if ($geoAccuracyMeters !== null) {
                $accuracyFeet = round(
                    (float)$geoAccuracyMeters * 3.28084
                );
            }

            $locationNotRequired = !hasValidGpsCoordinates($lat, $lon)
                && in_array(strtolower(trim($address)), [
                    'location not required',
                    'location not required for this action'
                ], true);

            $distanceText = $milesDistance !== null
                ? number_format((float)$milesDistance, 2)
                : 'Not available';

            $maximumText = $maxDistanceAllowed !== null
                ? number_format((float)$maxDistanceAllowed, 2)
                : 'Not applicable';

            $exceptionHtml = '';

            if ($isGeoException) {
                $exceptionHtml = "
                <div style=\"
                    background:#fff3cd;
                    border:1px solid #ffda6a;
                    color:#664d03;
                    padding:14px;
                    border-radius:8px;
                    margin-bottom:18px;
                \">
                    <strong>⚠ Location Exception</strong><br><br>

                    The worker was outside the allowed distance and
                    confirmed that they wanted to continue.

                    <br><br>

                    <strong>Distance detected:</strong>
                    " . htmlspecialchars($distanceText) . " mi<br>

                    <strong>Maximum allowed:</strong>
                    " . htmlspecialchars($maximumText) . " mi
                </div>
            ";
            }

            $accuracyHtml = (!$locationNotRequired && $accuracyFeet !== null)
                ? '
                <p style="font-family:Arial,sans-serif;font-size:14px;color:#010F3C;">
                    <strong>Location Accuracy:</strong>
                    ' . htmlspecialchars((string)$accuracyFeet) . ' ft
                </p>'
                : '';

            // STAFFING branded email preparation
            $safe = static fn($value): string =>
            htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');

            $staffingTitle = $actionType;
            $staffingSubtitle = $actionType === 'CHECK IN'
                ? 'Shift Started'
                : 'Shift Completed';

            $safePromoter = $safe($promoterName);
            $safeCode = $safe($promoterCode);
            $safeDate = $safe(date('D m/d/Y h:i a', strtotime($localDatetime)));
            $safeEvent = $safe($eventName);
            $safeMarket = $safe($market);
            $safeVenue = $safe($venue);
            $safePk = $safe($pk);

            // Location details: omit meaningless distance fields
            // when geolocation was not required.
            $locationRows = '';

            if ($locationNotRequired) {
                $locationRows = '
                <tr>
                    <td style="padding:16px 0;border-bottom:1px solid #E7E7E7;
                        font-size:12px;font-weight:bold;letter-spacing:1px;
                        color:#595959;width:34%;">
                        LOCATION VERIFICATION
                    </td>
                    <td style="padding:16px 0;border-bottom:1px solid #E7E7E7;
                        font-size:15px;color:#010F3C;">
                        Not Required
                    </td>
                </tr>';
            } else {
                $locationRows = '
                <tr>
                    <td style="padding:16px 0;border-bottom:1px solid #E7E7E7;
                        font-size:12px;font-weight:bold;letter-spacing:1px;
                        color:#595959;width:34%;">
                        ADDRESS
                    </td>
                    <td style="padding:16px 0;border-bottom:1px solid #E7E7E7;
                        font-size:15px;color:#010F3C;">
                        ' . $safe($address) . '
                    </td>
                </tr>
                <tr>
                    <td style="padding:16px 0;border-bottom:1px solid #E7E7E7;
                        font-size:12px;font-weight:bold;letter-spacing:1px;
                        color:#595959;">
                        DISTANCE TO TARGET
                    </td>
                    <td style="padding:16px 0;border-bottom:1px solid #E7E7E7;
                        font-size:15px;color:#010F3C;">
                        ' . $safe($distanceText) . ' mi
                    </td>
                </tr>
                <tr>
                    <td style="padding:16px 0;border-bottom:1px solid #E7E7E7;
                        font-size:12px;font-weight:bold;letter-spacing:1px;
                        color:#595959;">
                        MAXIMUM ALLOWED
                    </td>
                    <td style="padding:16px 0;border-bottom:1px solid #E7E7E7;
                        font-size:15px;color:#010F3C;">
                        ' . $safe($maximumText) . ' mi
                    </td>
                </tr>';
            }

            // Remove the legacy "Photo:" label only from STAFFING emails.
            // EXPRESS continues using the original $photoHtml.
            $staffingPhotoHtml = str_replace(
                '<p style="margin-bottom:8px;">
                    <strong>Photo:</strong>
                </p>',
                '',
                $photoHtml
            );

            // GPS accuracy as a branded table row, in feet only.
            $accuracyRowHtml = '';

            if (!$locationNotRequired && $accuracyFeet !== null) {
                $accuracyRowHtml = '
                <tr>
                    <td style="padding:16px 0;border-bottom:1px solid #E7E7E7;
                        font-family:Arial,sans-serif;font-size:12px;
                        font-weight:bold;letter-spacing:1px;
                        color:#595959;width:34%;">
                        LOCATION ACCURACY
                    </td>
                    <td style="padding:16px 0;border-bottom:1px solid #E7E7E7;
                        font-family:Arial,sans-serif;font-size:15px;
                        color:#010F3C;">
                        ' . htmlspecialchars((string)$accuracyFeet) . ' ft
                    </td>
                </tr>';
            }

            $staffingPhotosSection = '';

            if ($staffingPhotoHtml !== '') {
                $staffingPhotoLabel = $actionType === 'CHECK IN'
                    ? 'CHECK-IN PHOTO'
                    : 'CHECK-OUT PHOTO';

                $staffingPhotosSection =
                    '<div style="font-family:Arial,sans-serif;font-size:13px;
                    font-weight:bold;letter-spacing:1px;color:#010F3C;
                    margin-top:24px;">'
                    . $staffingPhotoLabel
                    . '</div>'
                    . $staffingPhotoHtml;
            }

            $message = <<<HTML
        <!DOCTYPE html>
        <html lang="en">
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="margin:0;padding:0;background:#E7E7E7;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#E7E7E7;">
        <tr><td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0"
        style="width:100%;max-width:600px;background:#FFFFFF;">
        <tr>
        <td align="center"
        style="background:#010F3C;padding:28px 32px;text-align:center;">
        {$logoHtml}
        </td>
        </tr>
        <tr>
        <td style="height:5px;background:linear-gradient(90deg,#FF1B59,#FF4F2A);font-size:0;line-height:0;">
        &nbsp;
        </td>
        </tr>
        <tr>
        <td style="padding:32px 32px 10px;">
        <div style="font-family:'Oswald','Arial Narrow',Arial,sans-serif;
            font-size:27px;font-weight:bold;color:#FF4F2A;">
        {$staffingTitle}
        </div>
        <div style="font-family:Arial,sans-serif;font-size:15px;
            color:#010F3C;margin-top:8px;">
        {$staffingSubtitle}
        </div>
        </td>
        </tr>

        <tr>
        <td style="padding:16px 32px 28px;">

        <div style="font-family:'Oswald','Arial Narrow',Arial,sans-serif;
            font-size:30px;font-weight:bold;color:#010F3C;">
        {$safePromoter}
        </div>

        <div style="font-family:Arial,sans-serif;font-size:14px;color:#595959;">
        {$safeCode} &nbsp;&middot;&nbsp; {$safeDate}
        </div>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="margin-top:24px;border-top:1px solid #E7E7E7;">

        <tr>
        <td style="padding:16px 0;border-bottom:1px solid #E7E7E7;
           font-size:12px;font-weight:bold;letter-spacing:1px;
           color:#595959;width:34%;">
        EVENT NAME
        </td>
        <td style="padding:16px 0;border-bottom:1px solid #E7E7E7;
           font-size:15px;color:#010F3C;">
        {$safeEvent}
        </td>
        </tr>

        <tr>
        <td style="padding:16px 0;border-bottom:1px solid #E7E7E7;
           font-size:12px;font-weight:bold;letter-spacing:1px;
           color:#595959;">
        MARKET
        </td>
        <td style="padding:16px 0;border-bottom:1px solid #E7E7E7;
           font-size:15px;color:#010F3C;">
        {$safeMarket}
        </td>
        </tr>

        <tr>
        <td style="padding:16px 0;border-bottom:1px solid #E7E7E7;
           font-size:12px;font-weight:bold;letter-spacing:1px;
           color:#595959;">
        ASSIGNED LOCATION
        </td>
        <td style="padding:16px 0;border-bottom:1px solid #E7E7E7;
           font-size:15px;color:#010F3C;">
        {$safeVenue}
        </td>
        </tr>

        {$locationRows}
        {$accuracyRowHtml}

        </table>

        {$exceptionHtml}

        {$staffingPhotosSection}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="margin-top:24px;border-top:1px solid #E7E7E7;">
        <tr>
        <td style="padding:16px 0;font-size:12px;font-weight:bold;
           letter-spacing:1px;color:#595959;width:34%;">
        SHIFT ID
        </td>
        <td style="padding:16px 0;font-size:14px;color:#010F3C;">
        {$safePk}
        </td>
        </tr>
        </table>

        </td>
        </tr>

        <tr>
        <td style="background:#010F3C;padding:22px 32px;color:#FFFFFF;">
        <div style="font-family:Arial,sans-serif;font-size:13px;
            letter-spacing:.5px;margin-bottom:7px;">
        GO LOCAL AUTOMATED MESSAGES
        </div>
        <div style="font-family:Arial,sans-serif;font-size:11px;line-height:1.4;">
        <a href="https://golocalpromos.com"
        style="color:#FFFFFF;text-decoration:none;">
        GOLOCALPROMOS.COM
        </a>
        &nbsp;&middot;&nbsp; @GOLOCALPROMOS
        &nbsp;&middot;&nbsp; MIAMI, FLORIDA
        </div>
        </td>
        </tr>

        </table>
        </td></tr>
        </table>
        </body>
        </html>
        HTML;

            if (count($managerRecipients) > 0) {
                $managerEmailResult = glpSendEmailSmtp(
                    'G',
                    $managerRecipients,
                    [],
                    [],
                    $subject,
                    $message,
                    $emailImages,
                    []
                );

                file_put_contents(
                    $debugFile,
                    "[" . date('Y-m-d H:i:s') . "] " .
                        "MANAGER ACTION EMAIL RESULT idCheck={$idCheck}: " .
                        json_encode($managerEmailResult) . "\n",
                    FILE_APPEND
                );

                /*
            * geoAlertSent se refiere específicamente a la alerta
            * por excepción de distancia.
            *
            * Un email normal de CHECK IN/CHECK OUT no cambia este campo.
            */
                if (
                    $isGeoException &&
                    !empty($managerEmailResult['ok'])
                ) {
                    try {
                        $stmtGeoAlert = $pdo->prepare("
                        UPDATE checkInRecords
                        SET geoAlertSent = 1
                        WHERE idCheck = :idCheck
                        ");

                        $stmtGeoAlert->execute([
                            ':idCheck' => $idCheck
                        ]);

                        $geoAlertSent = 1;

                        file_put_contents(
                            $debugFile,
                            "[" . date('Y-m-d H:i:s') . "] " .
                                "✅ geoAlertSent updated to 1 " .
                                "for idCheck={$idCheck}\n",
                            FILE_APPEND
                        );
                    } catch (Throwable $alertUpdateError) {
                        file_put_contents(
                            $debugFile,
                            "[" . date('Y-m-d H:i:s') . "] " .
                                "⚠️ Could not update geoAlertSent " .
                                "for idCheck={$idCheck}: " .
                                $alertUpdateError->getMessage() . "\n",
                            FILE_APPEND
                        );
                    }
                }
            } else {
                file_put_contents(
                    $debugFile,
                    "[" . date('Y-m-d H:i:s') . "] " .
                        "⚠️ Manager email skipped. Invalid supervisorEmail: " .
                        $supervisorEmail . "\n",
                    FILE_APPEND
                );
            }
        }
    } catch (Throwable $notificationError) {
        // Never report a committed action as failed because a notification failed.
        error_log(
            "[submitAction4000] Post-commit notification error for idCheck={$idCheck}: " .
                $notificationError->getMessage()
        );
    }

    echo json_encode([
        "status" => "success",
        "success" => true
    ]);
} catch (PDOException $ex) {
    if ($pdo && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    file_put_contents($debugFile, "[" . date('Y-m-d H:i:s') . "] ❌ PDOException: " . $ex->getMessage() . "\n", FILE_APPEND);
    echo json_encode([
        "status" => "error",
        "success" => false,
        "message" => "DB error: " . $ex->getMessage()
    ]);
} catch (Exception $e) {
    if ($pdo && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    file_put_contents($debugFile, "[" . date('Y-m-d H:i:s') . "] ❌ Exception: " . $e->getMessage() . "\n", FILE_APPEND);
    echo json_encode([
        "status" => "error",
        "success" => false,
        "message" => $e->getMessage()
    ]);
} finally {
    try {
        Database::closeConnection($__caller, $__user, $__ip, $__country, $__city);
    } catch (Throwable $t) {
        file_put_contents($debugFile, "[" . date('Y-m-d H:i:s') . "] ⚠️ closeConnection error: " . $t->getMessage() . "\n", FILE_APPEND);
    }

    $pdo = null;
}

function sendTwilioSMS(array $phonesArray, string $workerName, string $eventName, string $twilioSid, string $twilioToken, string $twilioFrom): void
{
    $shortName = explode(' ', trim($workerName))[0] ?? '';
    $shortName = ucfirst(strtolower($shortName));

    $body = "Hi $shortName! You have finished your shift for $eventName. Please do not forget to submit the report and/or sales tracker data, Thank you!";

    foreach ($phonesArray as $toPhone) {
        $url = "https://api.twilio.com/2010-04-01/Accounts/$twilioSid/Messages.json";

        $data = http_build_query([
            'To'   => $toPhone,
            'From' => $twilioFrom,
            'Body' => $body
        ]);

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_USERPWD, "$twilioSid:$twilioToken");
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $data);

        $response = curl_exec($ch);
        $httpStatus = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        if ($httpStatus >= 200 && $httpStatus < 300) {
            error_log("✅ Twilio SMS sent to $toPhone: $body");
        } else {
            error_log("❌ Twilio error to $toPhone: " . curl_error($ch));
            error_log("Response: $response");
        }

        curl_close($ch);
    }
}
