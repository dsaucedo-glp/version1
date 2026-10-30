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

try {
    $pdo = Database::getInstance()->getConnection($__caller, $__user !== '' ? $__user : 'Unknown', $__ip, $__country, $__city);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmtFind = $pdo->query("
        SELECT idReportParameter
        FROM reportsParameters
        ORDER BY idReportParameter ASC
        LIMIT 1
    ");
    $row = $stmtFind->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        echo json_encode([
            'ok' => false,
            'message' => 'No parameter row found to update.'
        ], JSON_UNESCAPED_UNICODE);
        return;
    }

    $idReportParameter            = (int)$row['idReportParameter'];
    $reportsModuleActive          = postInt('reportsModuleActive', 1);
    $applyDfaRestriction          = postInt('applyDfaRestriction', 1);
    $validatePhotosWhileUpload    = postInt('validatePhotosWhileUpload', 1);
    $validatePhotosPostUpload     = postInt('validatePhotosPostUpload', 0);
    $maxPhotoAllowed              = postInt('maxPhotoAllowed', 9);
    $minPhotosAllowed             = postInt('minPhotosAllowed', 1);
    $allowMicrophoseUseForSummary = postInt('allowMicrophoseUseForSummary', 1);
    $maxSecondsSummaryRecording   = postInt('maxSecondsSummaryRecording', 20);
    $maxIssuesFieldLength         = postInt('maxIssuesFieldLength', 300);
    $minSummaryFieldLength        = postInt('minSummaryFieldLength', 10);
    $maxSummaryFieldLength        = postInt('maxSummaryFieldLength', 2000);

    if ($minPhotosAllowed > $maxPhotoAllowed) {
        echo json_encode([
            'ok' => false,
            'message' => 'Min Photos Allowed cannot be greater than Max Photos Allowed.'
        ], JSON_UNESCAPED_UNICODE);
        return;
    }

    if ($minSummaryFieldLength > $maxSummaryFieldLength) {
        echo json_encode([
            'ok' => false,
            'message' => 'Min Summary Field Length cannot be greater than Max Summary Field Length.'
        ], JSON_UNESCAPED_UNICODE);
        return;
    }

    $stmt = $pdo->prepare("
        UPDATE reportsParameters
        SET
            reportsModuleActive = :reportsModuleActive,
            applyDfaRestriction = :applyDfaRestriction,
            validatePhotosWhileUpload = :validatePhotosWhileUpload,
            validatePhotosPostUpload = :validatePhotosPostUpload,
            maxPhotoAllowed = :maxPhotoAllowed,
            minPhotosAllowed = :minPhotosAllowed,
            allowMicrophoseUseForSummary = :allowMicrophoseUseForSummary,
            maxSecondsSummaryRecording = :maxSecondsSummaryRecording,
            maxIssuesFieldLength = :maxIssuesFieldLength,
            minSummaryFieldLength = :minSummaryFieldLength,
            maxSummaryFieldLength = :maxSummaryFieldLength
        WHERE idReportParameter = :idReportParameter
        LIMIT 1
    ");

    $stmt->execute([
        ':reportsModuleActive'          => $reportsModuleActive,
        ':applyDfaRestriction'          => $applyDfaRestriction,
        ':validatePhotosWhileUpload'    => $validatePhotosWhileUpload,
        ':validatePhotosPostUpload'     => $validatePhotosPostUpload,
        ':maxPhotoAllowed'              => $maxPhotoAllowed,
        ':minPhotosAllowed'             => $minPhotosAllowed,
        ':allowMicrophoseUseForSummary' => $allowMicrophoseUseForSummary,
        ':maxSecondsSummaryRecording'   => $maxSecondsSummaryRecording,
        ':maxIssuesFieldLength'         => $maxIssuesFieldLength,
        ':minSummaryFieldLength'        => $minSummaryFieldLength,
        ':maxSummaryFieldLength'        => $maxSummaryFieldLength,
        ':idReportParameter'            => $idReportParameter
    ]);

    echo json_encode([
        'ok' => true,
        'message' => 'Reports parameters updated successfully.'
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    file_put_contents(
        $debugFile,
        "[" . date('Y-m-d H:i:s') . "] ❌ {$__caller} ERROR: " . $e->getMessage() . "\n",
        FILE_APPEND
    );

    echo json_encode([
        'ok' => false,
        'message' => 'Server error while saving reports parameters.',
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