<?php
header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__, 2) . '/private/core/bootstrap.php';
require_once $PATHS['core'] . 'dbConnectGo.php';

$__caller  = basename(__FILE__);
$__user    = strtoupper(trim((string)($_POST['code'] ?? '')));
$__ip      = $_POST['ip'] ?? 'Unknown';
$__country = $_POST['country'] ?? 'Unknown';
$__city    = $_POST['city'] ?? 'Unknown';

$pdo = null;
$debugFile = rtrim($PATHS['logs'], '/\\') . '/debug_log.txt';

try {
    $pdo = Database::getInstance()->getConnection($__caller, $__user !== '' ? $__user : 'Unknown', $__ip, $__country, $__city);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        header('Allow: POST');
        echo json_encode(['ok' => false, 'message' => 'POST required.']);
        return;
    }
    $stmtUser = $pdo->prepare("SELECT supervisorLevel FROM promoters WHERE promoterCode = :code AND active = 1 LIMIT 1");
    $stmtUser->execute([':code' => $__user]);
    $level = $stmtUser->fetchColumn();
    if ($__user === '' || $level === false || (int)$level < 5) {
        http_response_code(403);
        echo json_encode(['ok' => false, 'message' => 'System Admin access required.']);
        return;
    }

    $values = [];
    $id = $_POST['idExpressParameters'] ?? null;
    if (!is_string($id) || !preg_match('/^[1-9][0-9]*$/D', $id) || filter_var($id, FILTER_VALIDATE_INT) === false) {
        http_response_code(422);
        echo json_encode(['ok' => false, 'message' => 'Valid parameter ID required.']);
        return;
    }
    $booleanFields = ['geoRequiredIn', 'geoRequiredOut', 'photoRequiredIn', 'photoRequiredOut', 'faceDetectionIn', 'faceDetectionOut', 'environmentAnalysisIn', 'environmentAnalysisOut', 'active'];
    foreach ($booleanFields as $field) {
        $value = $_POST[$field] ?? null;
        if (!is_string($value) || !in_array($value, ['0', '1'], true)) {
            http_response_code(422);
            echo json_encode(['ok' => false, 'message' => "Invalid boolean: {$field}."]);
            return;
        }
        $values[$field] = (int)$value;
    }
    foreach (['Mandatory', 'Optional'] as $mode) {
        $floor = $mode === 'Mandatory' ? 1 : 0;
        foreach (['min', 'max'] as $bound) {
            $field = $bound . 'Photos' . $mode . 'Report';
            $value = $_POST[$field] ?? null;
            if (!is_string($value) || !preg_match('/^[0-9]+$/D', $value) || (float)$value < $floor || (float)$value > 32767) {
                http_response_code(422);
                echo json_encode(['ok' => false, 'message' => "Invalid photo limit: {$field}."]);
                return;
            }
            $values[$field] = (int)$value;
        }
        if ($values['minPhotos' . $mode . 'Report'] > $values['maxPhotos' . $mode . 'Report']) {
            http_response_code(422);
            echo json_encode(['ok' => false, 'message' => "{$mode} report minimum exceeds maximum."]);
            return;
        }
    }
    $pdo->beginTransaction();
    $stmtFind = $pdo->query("SELECT idExpressParameters FROM expressParameters ORDER BY idExpressParameters ASC LIMIT 1 FOR UPDATE");
    $currentId = $stmtFind->fetchColumn();
    if ($currentId === false || (int)$currentId !== (int)$id) {
        $pdo->rollBack();
        http_response_code(409);
        echo json_encode(['ok' => false, 'message' => 'Parameter row changed or missing. Reload before saving.']);
        return;
    }
    $assignments = [];
    foreach (array_keys($values) as $field) {
        $assignments[] = "`{$field}` = :{$field}";
    }
    $stmt = $pdo->prepare("UPDATE expressParameters SET " . implode(', ', $assignments) . " WHERE idExpressParameters = :idExpressParameters LIMIT 1");
    $values['idExpressParameters'] = (int)$id;
    $stmt->execute($values);
    $pdo->commit();
    echo json_encode(['ok' => true, 'message' => 'Parameters updated successfully.'], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    if ($pdo && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    file_put_contents(
        $debugFile,
        "[" . date('Y-m-d H:i:s') . "] ERROR {$__caller}: "
        . $e->getMessage() . "\n",
        FILE_APPEND
    );

    http_response_code(500);

    echo json_encode([
        'ok' => false,
        'message' => 'Server error while saving Express parameters.'
    ], JSON_UNESCAPED_UNICODE);

} finally {
    try {
        Database::closeConnection(
            $__caller,
            $__user !== '' ? $__user : 'Unknown',
            $__ip,
            $__country,
            $__city
        );
    } catch (Throwable $t) {
        file_put_contents(
            $debugFile,
            "[" . date('Y-m-d H:i:s') . "] closeConnection error: "
            . $t->getMessage() . "\n",
            FILE_APPEND
        );
    }

    $pdo = null;
}