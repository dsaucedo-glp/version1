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

function postDec($key, $default = '0.00') {
    return isset($_POST[$key]) ? trim((string)$_POST[$key]) : $default;
}

function postStr($key, $default = '') {
    return isset($_POST[$key]) ? trim((string)$_POST[$key]) : $default;
}

try {
    $pdo = Database::getInstance()->getConnection($__caller, $__user !== '' ? $__user : 'Unknown', $__ip, $__country, $__city);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmtFind = $pdo->query("
        SELECT idReimbursementParameters
        FROM reimbursementParameters
        ORDER BY idReimbursementParameters ASC
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

    $idReimbursementParameters = (int)$row['idReimbursementParameters'];

    $reimbursementsModuleActive    = postInt('reimbursementsModuleActive', 1);
    $defaulAproverCode             = postStr('defaulAproverCode', '');
    $maxAmountApproval             = postDec('maxAmountApproval', '1000000.00');
    $allowChangeExpenseDate        = postInt('allowChangeExpenseDate', 0);
    $maxDaysForRequestAfterExpense = postInt('maxDaysForRequestAfterExpense', 15);
    $daysBeforeExpenseForShift     = postInt('daysBeforeExpenseForShift', 7);
    $dayAfterExpenseForShift       = postInt('dayAfterExpenseForShift', 1);
    $approvalRoute                 = postStr('approvalRoute', 'ACC_TO_RMG');
    $receiptRequiredForRequest     = postInt('receiptRequiredForRequest', 1);
    $shiftRequiredForRequest       = postInt('shiftRequiredForRequest', 1);
    $daysForYellowCard             = postInt('daysForYellowCard', 2);
    $daysForRedCard                = postInt('daysForRedCard', 3);

    if ($approvalRoute !== 'ACC_TO_RMG' && $approvalRoute !== 'RMG_TO_ACC') {
        echo json_encode([
            'ok' => false,
            'message' => 'Invalid approval route.'
        ], JSON_UNESCAPED_UNICODE);
        return;
    }

    $stmt = $pdo->prepare("
        UPDATE reimbursementParameters
        SET
            reimbursementsModuleActive = :reimbursementsModuleActive,
            defaulAproverCode = :defaulAproverCode,
            maxAmountApproval = :maxAmountApproval,
            allowChangeExpenseDate = :allowChangeExpenseDate,
            maxDaysForRequestAfterExpense = :maxDaysForRequestAfterExpense,
            daysBeforeExpenseForShift = :daysBeforeExpenseForShift,
            dayAfterExpenseForShift = :dayAfterExpenseForShift,
            approvalRoute = :approvalRoute,
            receiptRequiredForRequest = :receiptRequiredForRequest,
            shiftRequiredForRequest = :shiftRequiredForRequest,
            daysForYellowCard = :daysForYellowCard,
            daysForRedCard = :daysForRedCard
        WHERE idReimbursementParameters = :idReimbursementParameters
        LIMIT 1
    ");

    $stmt->execute([
        ':reimbursementsModuleActive'    => $reimbursementsModuleActive,
        ':defaulAproverCode'             => ($defaulAproverCode !== '' ? $defaulAproverCode : null),
        ':maxAmountApproval'             => $maxAmountApproval,
        ':allowChangeExpenseDate'        => $allowChangeExpenseDate,
        ':maxDaysForRequestAfterExpense' => $maxDaysForRequestAfterExpense,
        ':daysBeforeExpenseForShift'     => $daysBeforeExpenseForShift,
        ':dayAfterExpenseForShift'       => $dayAfterExpenseForShift,
        ':approvalRoute'                 => $approvalRoute,
        ':receiptRequiredForRequest'     => $receiptRequiredForRequest,
        ':shiftRequiredForRequest'       => $shiftRequiredForRequest,
        ':daysForYellowCard'             => $daysForYellowCard,
        ':daysForRedCard'                => $daysForRedCard,
        ':idReimbursementParameters'     => $idReimbursementParameters
    ]);

    echo json_encode([
        'ok' => true,
        'message' => 'Reimbursement parameters updated successfully.'
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    file_put_contents(
        $debugFile,
        "[" . date('Y-m-d H:i:s') . "] ❌ {$__caller} ERROR: " . $e->getMessage() . "\n",
        FILE_APPEND
    );

    echo json_encode([
        'ok' => false,
        'message' => 'Server error while saving reimbursement parameters.',
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