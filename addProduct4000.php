<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__, 2) . '/private/core/bootstrap.php';
require_once $PATHS['core'] . 'dbConnectGo.php';

// ========= Identificación para closeConnection() =========
$__caller  = basename(__FILE__);
$__ip      = $_SERVER['REMOTE_ADDR'] ?? 'Unknown';
$__user    = isset($_POST['promoterCode']) ? strtoupper(trim((string)$_POST['promoterCode'])) : 'Unknown';
$__country = $_POST['ipCountry'] ?? 'Unknown';
$__city    = $_POST['ipCity'] ?? 'Unknown';

$pdo = null;
$debugFile = rtrim($PATHS['logs'], '/\\') . '/debug_log.txt';

// ========= LOG DE ARRANQUE =========
file_put_contents($debugFile, "[" . date('Y-m-d H:i:s') . "] ✅ Entré a " . $__caller . "\n", FILE_APPEND);

// ========= ENTRADA (POST) =========
$productName = trim((string)($_POST['productName'] ?? ''));

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
    if ($productName === '') {
        file_put_contents($debugFile, "[" . date('Y-m-d H:i:s') . "] ❌ Falta productName\n", FILE_APPEND);
        throw new Exception("Missing required parameters.");
    }

    // ===== TRANSACCIÓN =====
    $pdo->beginTransaction();

    $sql = "INSERT INTO products (productName) VALUES (:productName)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':productName' => mb_substr($productName, 0, 200)
    ]);

    $affectedRows = $stmt->rowCount();
    file_put_contents($debugFile, "[" . date('Y-m-d H:i:s') . "] INSERT filas afectadas: $affectedRows\n", FILE_APPEND);

    if ($affectedRows === 0) {
        throw new Exception("INSERT executed but affected 0 rows.");
    }

    $pdo->commit();

    echo json_encode([
        "status" => "success",
        "success" => true,
        "ok" => true
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
?>