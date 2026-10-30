<?php
header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__, 2) . '/private/core/bootstrap.php';
require_once $PATHS['core'] . 'dbConnectGo.php';

$pdo = null;

$__caller  = basename(__FILE__);
$__user    = strtoupper(trim((string)($_POST['code'] ?? '')));
$__ip      = $_POST['ip'] ?? 'Unknown';
$__country = $_POST['country'] ?? 'Unknown';
$__city    = $_POST['city'] ?? 'Unknown';

$debugFile = rtrim($PATHS['logs'], '/\\') . '/debug_log.txt';

function postInt($key, $default = 0) {
    return isset($_POST[$key]) ? (int)$_POST[$key] : $default;
}

function postDec($key, $default = '0.0000') {
    return isset($_POST[$key]) ? trim((string)$_POST[$key]) : $default;
}

try {
    $pdo = Database::getInstance()->getConnection($__caller, $__user !== '' ? $__user : 'Unknown', $__ip, $__country, $__city);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmtFind = $pdo->query("SELECT idParameter FROM checkInParameters ORDER BY idParameter ASC LIMIT 1");
    $row = $stmtFind->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        echo json_encode([
            'ok' => false,
            'message' => 'No parameter row found to update.'
        ], JSON_UNESCAPED_UNICODE);
        return;
    }

    $idParameter = (int)$row['idParameter'];

    $geoRequiredCheckIn         = postInt('geoRequiredCheckIn');
    $geoRequiredStartBreak      = postInt('geoRequiredStartBreak');
    $geoRequiredEndBreak        = postInt('geoRequiredEndBreak');
    $geoRequiredCheckOut        = postInt('geoRequiredCheckOut');

    $photoRequiredCheckIn       = postInt('photoRequiredCheckIn');
    $photoRequiredStartBreak    = postInt('photoRequiredStartBreak');
    $photoRequiredEndBreak      = postInt('photoRequiredEndBreak');
    $photoRequiredCheckOut      = postInt('photoRequiredCheckOut');

    $applyDistanceForCheckIn    = postInt('applyDistanceForCheckIn');
    $maxDistanceForCheckIn      = postDec('maxDistanceForCheckIn', '1.0000');

    $applyDistanceForStartBreak = postInt('applyDistanceForStartBreak');
    $maxDistanceForStartBreak   = postDec('maxDistanceForStartBreak', '1.0000');

    $applyDistanceForEndBreak   = postInt('applyDistanceForEndBreak');
    $maxDistanceForEndBreak     = postDec('maxDistanceForEndBreak', '1.0000');

    $applyDistanceForCheckOut   = postInt('applyDistanceForCheckOut');
    $maxDistanceForCheckOut     = postDec('maxDistanceForCheckOut', '1.0000');

    $maxBreaks                  = postInt('maxBreaks', 1);

    $applyTimeBeforeCheckIn     = postInt('applyTimeBeforeCheckIn');
    $minMinutesBeforeCheckIn    = postInt('minMinutesBeforeCheckIn', 99999);

    $applyTimeBeforeCheckOut    = postInt('applyTimeBeforeCheckOut');
    $minMinutesBeforeCheckOut   = postInt('minMinutesBeforeCheckOut', 99999);

    $reportRequiredForCheckOut  = postInt('reportRequiredForCheckOut', 1);
    $faceDetectionIn = postInt('faceDetectionIn');
    $environmentAnalysisIn = postInt('environmentAnalysisIn');
    $faceDetectionOut = postInt('faceDetectionOut');
    $environmentAnalysisOut = postInt('environmentAnalysisOut');


    $stmt = $pdo->prepare("
        UPDATE checkInParameters
        SET
            geoRequiredCheckIn = :geoRequiredCheckIn,
            geoRequiredStartBreak = :geoRequiredStartBreak,
            geoRequiredEndBreak = :geoRequiredEndBreak,
            geoRequiredCheckOut = :geoRequiredCheckOut,

            photoRequiredCheckIn = :photoRequiredCheckIn,
            photoRequiredStartBreak = :photoRequiredStartBreak,
            photoRequiredEndBreak = :photoRequiredEndBreak,
            photoRequiredCheckOut = :photoRequiredCheckOut,

            applyDistanceForCheckIn = :applyDistanceForCheckIn,
            maxDistanceForCheckIn = :maxDistanceForCheckIn,

            applyDistanceForStartBreak = :applyDistanceForStartBreak,
            maxDistanceForStartBreak = :maxDistanceForStartBreak,

            applyDistanceForEndBreak = :applyDistanceForEndBreak,
            maxDistanceForEndBreak = :maxDistanceForEndBreak,

            applyDistanceForCheckOut = :applyDistanceForCheckOut,
            maxDistanceForCheckOut = :maxDistanceForCheckOut,

            maxBreaks = :maxBreaks,

            applyTimeBeforeCheckIn = :applyTimeBeforeCheckIn,
            minMinutesBeforeCheckIn = :minMinutesBeforeCheckIn,

            applyTimeBeforeCheckOut = :applyTimeBeforeCheckOut,
            minMinutesBeforeCheckOut = :minMinutesBeforeCheckOut,

            reportRequiredForCheckOut = :reportRequiredForCheckOut,
            faceDetectionIn = :faceDetectionIn,
            environmentAnalysisIn = :environmentAnalysisIn,
            faceDetectionOut = :faceDetectionOut,
            environmentAnalysisOut = :environmentAnalysisOut
        WHERE idParameter = :idParameter
        LIMIT 1
    ");

    $stmt->execute([
        ':geoRequiredCheckIn'         => $geoRequiredCheckIn,
        ':geoRequiredStartBreak'      => $geoRequiredStartBreak,
        ':geoRequiredEndBreak'        => $geoRequiredEndBreak,
        ':geoRequiredCheckOut'        => $geoRequiredCheckOut,

        ':photoRequiredCheckIn'       => $photoRequiredCheckIn,
        ':photoRequiredStartBreak'    => $photoRequiredStartBreak,
        ':photoRequiredEndBreak'      => $photoRequiredEndBreak,
        ':photoRequiredCheckOut'      => $photoRequiredCheckOut,

        ':applyDistanceForCheckIn'    => $applyDistanceForCheckIn,
        ':maxDistanceForCheckIn'      => $maxDistanceForCheckIn,

        ':applyDistanceForStartBreak' => $applyDistanceForStartBreak,
        ':maxDistanceForStartBreak'   => $maxDistanceForStartBreak,

        ':applyDistanceForEndBreak'   => $applyDistanceForEndBreak,
        ':maxDistanceForEndBreak'     => $maxDistanceForEndBreak,

        ':applyDistanceForCheckOut'   => $applyDistanceForCheckOut,
        ':maxDistanceForCheckOut'     => $maxDistanceForCheckOut,

        ':maxBreaks'                  => $maxBreaks,

        ':applyTimeBeforeCheckIn'     => $applyTimeBeforeCheckIn,
        ':minMinutesBeforeCheckIn'    => $minMinutesBeforeCheckIn,

        ':applyTimeBeforeCheckOut'    => $applyTimeBeforeCheckOut,
        ':minMinutesBeforeCheckOut'   => $minMinutesBeforeCheckOut,

        ':reportRequiredForCheckOut'  => $reportRequiredForCheckOut,
        ':faceDetectionIn' => $faceDetectionIn,
        ':environmentAnalysisIn' => $environmentAnalysisIn,
        ':faceDetectionOut' => $faceDetectionOut,
        ':environmentAnalysisOut' => $environmentAnalysisOut,

        ':idParameter'                => $idParameter
    ]);

    echo json_encode([
        'ok' => true,
        'message' => 'Parameters updated successfully.'
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    file_put_contents(
        $debugFile,
        "[" . date('Y-m-d H:i:s') . "] ❌ {$__caller} ERROR: " . $e->getMessage() . "\n",
        FILE_APPEND
    );

    echo json_encode([
        'ok' => false,
        'message' => 'Server error while saving parameters.',
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);

} finally {
    try {
        Database::closeConnection($__caller, $__user !== '' ? $__user : 'Unknown', $__ip, $__country, $__city);
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