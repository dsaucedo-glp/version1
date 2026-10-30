<?php
header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__, 2) . '/private/core/bootstrap.php';
require_once $PATHS['core'] . 'dbConnectGo.php';

function fail($msg) {
    echo json_encode([
        'ok' => false,
        'message' => $msg
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$pdo = null;
$pendingReimbursementApprovalsNumber = 0;

$__caller  = basename(__FILE__);
$__user    = isset($_POST['code']) ? strtoupper(trim((string)$_POST['code'])) : 'Unknown';
$__ip      = $_POST['ip'] ?? 'Unknown';
$__country = $_POST['country'] ?? 'Unknown';
$__city    = $_POST['city'] ?? 'Unknown';

$debugFile = rtrim($PATHS['logs'], '/\\') . '/debug_log.txt';

try {
    $pdo = Database::getInstance()->getConnection($__caller, $__user, $__ip, $__country, $__city);

    if (!$pdo) {
        fail('Database connection is null.');
    }

    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $idReimbursement = isset($_POST['idReimbursement']) ? (int)$_POST['idReimbursement'] : 0;
    $actionType      = trim((string)($_POST['actionType'] ?? ''));
    $amount          = trim((string)($_POST['amount'] ?? ''));
    $expensesType    = trim((string)($_POST['expensesType'] ?? ''));
    $description     = trim((string)($_POST['description'] ?? ''));
    $pk              = trim((string)($_POST['pk'] ?? ''));
    $adminCode       = strtoupper(trim((string)($_POST['adminCode'] ?? '')));
    $adminName       = trim((string)($_POST['adminName'] ?? ''));
    $rejectionReason = trim((string)($_POST['rejectionReason'] ?? ''));
    $checkedComments = trim((string)($_POST['checkedComments'] ?? ''));
    $sentToManagerComments = trim((string)($_POST['sentToManagerComments'] ?? ''));

    if ($actionType === 'reject' && $rejectionReason === '') {
        echo json_encode([
            'ok' => false,
            'message' => 'Rejection reason is required.'
        ], JSON_UNESCAPED_UNICODE);
        return;
    }

    if ($actionType === 'checked' && $checkedComments === '') {
        echo json_encode([
            'ok' => false,
            'message' => 'Manager comments are required.'
        ], JSON_UNESCAPED_UNICODE);
        return;
    }

    if ($actionType === 'send_to_manager' && $sentToManagerComments === '') {
        echo json_encode([
            'ok' => false,
            'message' => 'Comments for manager are required.'
        ], JSON_UNESCAPED_UNICODE);
        return;
    }

    if ($idReimbursement <= 0) fail('Invalid reimbursement id.');
    if (!in_array($actionType, ['approve', 'send_to_manager', 'checked', 'reject'], true)) fail('Invalid action.');
    if (!is_numeric($amount) || (float)$amount <= 0) fail('Invalid amount.');
    if ($expensesType === '') fail('Expense type is required.');
    if ($description === '') fail('Description is required.');
    if ($pk === '') fail('Shift is required.');

    $pdo->beginTransaction();

    
    $stmt0 = $pdo->prepare("
        SELECT r.*, p.email AS promoterEmail, ms.eventName 
        FROM reimbursements r 
        LEFT JOIN promoters p ON p.promoterCode = r.promoterCode 
        LEFT JOIN masterShifts ms ON ms.pk = r.pk
        WHERE r.idReimbursement = :id 
        LIMIT 1 
    "); 

    $stmt0->execute([':id' => $idReimbursement]);
    $current = $stmt0->fetch(PDO::FETCH_ASSOC);

    if (!$current) {
        $pdo->rollBack();
        fail('Reimbursement not found.');
    }

    $baseSql = "
        UPDATE reimbursements
        SET
            amount = :amount,
            expensesType = :expensesType,
            description = :description,
            pk = :pk,
            updateDatetime = NOW()
    ";

    $params = [
        ':amount'       => $amount,
        ':expensesType' => $expensesType,
        ':description'  => $description,
        ':pk'           => $pk,
        ':id'           => $idReimbursement
    ];

    if ($actionType === 'approve') {
        $baseSql .= ",
            status = 'approved',
            approved = 1,
            approvedByCode = :approvedByCode,
            approvedByName = :approvedByName,
            approvedDate = NOW(),
            rejected = 0,
            rejectedByCode = NULL,
            rejectedByName = NULL,
            rejectedDate = NULL,
            rejectionReason = NULL,
            sentToManager = 0,
            sentToManagerByCode = NULL,
            sentToManagerByName = NULL,
            sentToManagerDate = NULL
        ";
        $params[':approvedByCode'] = $adminCode;
        $params[':approvedByName'] = $adminName;
    }

    if ($actionType === 'send_to_manager') {
        $baseSql .= ",
            status = 'sent_to_manager',
            sentToManager = 1,
            sentToManagerByCode = :sentToManagerByCode,
            sentToManagerByName = :sentToManagerByName,
            sentToManagerDate = NOW(),
            approved = 0,
            approvedByCode = NULL,
            approvedByName = NULL,
            approvedDate = NULL,
            rejected = 0,
            rejectedByCode = NULL,
            rejectedByName = NULL,
            rejectedDate = NULL,
            rejectionReason = NULL,
            sentToManagerComments = :sentToManagerComments 
        ";
        $params[':sentToManagerByCode'] = $adminCode;
        $params[':sentToManagerByName'] = $adminName;
        $params[':sentToManagerComments'] = $sentToManagerComments;
    }

    if ($actionType === 'checked') {
        $baseSql .= ",
            status = 'checked',
            checked = 1,
            checkedByCode = :checkedByCode,
            checkedByName = :checkedByName,
            checkedDate = NOW(),
            checkedIp = :checkedIp,
            checkedComments = :checkedComments,

            approved = 0,
            approvedByCode = NULL,
            approvedByName = NULL,
            approvedDate = NULL,

            rejected = 0,
            rejectedByCode = NULL,
            rejectedByName = NULL,
            rejectedDate = NULL,
            rejectedIp = NULL,
            rejectionReason = NULL,

            sentToManager = 1
        ";

        $params[':checkedByCode'] = $adminCode;
        $params[':checkedByName'] = $adminName;
        $params[':checkedIp'] = $__ip;
        $params[':checkedComments'] = $checkedComments;
    }

    if ($actionType === 'reject') {
        $baseSql .= ",
            status = 'rejected',
            rejected = 1,
            rejectedByCode = :rejectedByCode,
            rejectedByName = :rejectedByName,
            rejectedDate = NOW(),
            approved = 0,
            approvedByCode = NULL,
            approvedByName = NULL,
            approvedDate = NULL,
            sentToManager = 0,
            sentToManagerByCode = NULL,
            sentToManagerByName = NULL,
            sentToManagerDate = NULL,
            rejectionReason = :rejectionReason
        ";
        $params[':rejectedByCode'] = $adminCode;
        $params[':rejectedByName'] = $adminName;
        $params[':rejectionReason'] = $rejectionReason;
    }

    $baseSql .= " WHERE idReimbursement = :id LIMIT 1";

    $stmt1 = $pdo->prepare($baseSql);
    $stmt1->execute($params);

    $stmtCount = $pdo->prepare("
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

    $stmtCount->execute([
        ':viewerCode1' => $adminCode,
        ':viewerCode2' => $adminCode
    ]);

    $rowCount = $stmtCount->fetch(PDO::FETCH_ASSOC);
    $pendingReimbursementApprovalsNumber = (int)($rowCount['total'] ?? 0);

    if ($actionType === 'send_to_manager') {

        require_once $PATHS['core'] . 'communications.php';

        // Buscar manager según owner0 del PK
        $stmtMgr = $pdo->prepare("
            SELECT 
                rm.approverCode,
                p.promoterName AS managerName,
                p.email AS managerEmail,
                p.phone AS managerPhone
            FROM reimbursementManagers rm
            LEFT JOIN promoters p
                ON UPPER(TRIM(p.promoterCode)) = UPPER(TRIM(rm.approverCode))
            WHERE rm.active = 1
            AND UPPER(TRIM(rm.shiftOwner)) = UPPER(TRIM(LEFT(:pk, 3)))
            LIMIT 1
        ");

        $stmtMgr->execute([
            ':pk' => $pk
        ]);

        $manager = $stmtMgr->fetch(PDO::FETCH_ASSOC);

        $managerEmail = trim((string)($manager['managerEmail'] ?? ''));
        $managerPhone = trim((string)($manager['managerPhone'] ?? ''));
        $managerName  = trim((string)($manager['managerName'] ?? 'Manager'));

        $expenseDateFormatted = !empty($current['expensesDate'])
            ? date('m/d/Y', strtotime((string)$current['expensesDate']))
            : '';

        $eventName = trim((string)($current['eventName'] ?? ''));

        if ($eventName === '') {
            $eventName = $pk;
        }

        // =====================================================
        // EMAIL TO MANAGER
        // =====================================================

        if ($managerEmail !== '' && filter_var($managerEmail, FILTER_VALIDATE_EMAIL)) {

            $htmlBody = '
            <div style="font-family: Arial, Helvetica, sans-serif; font-size:14px; color:#222;">

                <h2 style="color:#0d6efd;">
                    Reimbursement Sent to Manager
                </h2>

                <p>
                    Hello <strong>' . htmlspecialchars($managerName) . '</strong>,
                </p>

                <p>
                    A reimbursement request has been sent to you for review.
                </p>

                <table cellpadding="6" cellspacing="0" border="0" style="border-collapse: collapse;">

                    <tr>
                        <td><strong>Reimbursement ID:</strong></td>
                        <td>' . htmlspecialchars((string)$idReimbursement) . '</td>
                    </tr>

                    <tr>
                        <td><strong>Promoter:</strong></td>
                        <td>' . htmlspecialchars((string)($current['promoterName'] ?? '')) . '</td>
                    </tr>

                    <tr>
                        <td><strong>Amount:</strong></td>
                        <td>$' . number_format((float)$amount, 2) . '</td>
                    </tr>

                    <tr>
                        <td><strong>Expense Type:</strong></td>
                        <td>' . htmlspecialchars($expensesType) . '</td>
                    </tr>

                    <tr>
                        <td><strong>Expense Date:</strong></td>
                        <td>' . htmlspecialchars($expenseDateFormatted) . '</td>
                    </tr>

                    <tr>
                        <td><strong>Event:</strong></td>
                        <td>' . htmlspecialchars($eventName) . '</td>
                    </tr>

                    <tr>
                        <td><strong>Description:</strong></td>
                        <td>' . nl2br(htmlspecialchars($description)) . '</td>
                    </tr>

                </table>

                <br>

                <div style="
                    background:#eef5ff;
                    border:1px solid #b8d4ff;
                    padding:12px;
                    border-radius:6px;
                ">
                    <strong>Comments from Accounting:</strong><br><br>
                    ' . nl2br(htmlspecialchars($sentToManagerComments)) . '
                </div>

                <br>

                <p>
                    Sent by:
                    <strong>' . htmlspecialchars($adminName) . ' (' . htmlspecialchars($adminCode) . ')</strong>
                </p>

                <p style="color:#777;">
                    Go Local Promotions
                </p>

            </div>
            ';

            $emailResult = glpSendEmailSmtp(
                'G',
                [$managerEmail],
                [],
                ['dsaucedo@golocalpromos.com'],
                'REIMBURSEMENT SENT TO MANAGER | ID ' . $idReimbursement,
                $htmlBody
            );

            file_put_contents(
                $debugFile,
                "[" . date('Y-m-d H:i:s') . "] SEND_TO_MANAGER EMAIL RESULT: "
                . json_encode($emailResult, JSON_UNESCAPED_UNICODE)
                . "\n",
                FILE_APPEND
            );

        } else {

            file_put_contents(
                $debugFile,
                "[" . date('Y-m-d H:i:s') . "] SEND_TO_MANAGER EMAIL SKIPPED: invalid manager email. PK={$pk}, ManagerEmail={$managerEmail}\n",
                FILE_APPEND
            );
        }

        // =====================================================
        // SMS TO MANAGER
        // =====================================================

        if ($managerPhone !== '') {

            $smsMessage =
                "Go Local: Reimbursement ID {$idReimbursement} was sent to you for review. " .
                "Promoter: " . ($current['promoterName'] ?? '') . ". " .
                "Amount: $" . number_format((float)$amount, 2) . ". " .
                "Event: {$eventName}.";

            $smsResult = glpSendSms(
                [$managerPhone],
                envValue('TWILIO_SID', ''),
                envValue('TWILIO_TOKEN', ''),
                $smsMessage
            );

            file_put_contents(
                $debugFile,
                "[" . date('Y-m-d H:i:s') . "] SEND_TO_MANAGER SMS RESULT: "
                . json_encode($smsResult, JSON_UNESCAPED_UNICODE)
                . "\n",
                FILE_APPEND
            );

        } else {

            file_put_contents(
                $debugFile,
                "[" . date('Y-m-d H:i:s') . "] SEND_TO_MANAGER SMS SKIPPED: empty manager phone. PK={$pk}\n",
                FILE_APPEND
            );
        }
    }    

    if ($actionType === 'checked') {

        require_once $PATHS['core'] . 'communications.php';

        // Buscar default approver activo
        $stmtDfa = $pdo->prepare("
            SELECT 
            rp.defaulAproverCode,
            p.promoterName AS approverName,
            p.email AS approverEmail,
            p.phone AS approverPhone
            FROM reimbursementParameters rp
            LEFT JOIN promoters p
            ON UPPER(TRIM(p.promoterCode)) = UPPER(TRIM(rp.defaulAproverCode))
            WHERE p.active = 1
            LIMIT 1
        ");


        $stmtDfa->execute();
        $defaultApprover = $stmtDfa->fetch(PDO::FETCH_ASSOC);

        $approverEmail = trim((string)($defaultApprover['approverEmail'] ?? ''));
        $approverPhone = trim((string)($defaultApprover['approverPhone'] ?? ''));
        $approverName  = trim((string)($defaultApprover['approverName'] ?? 'Default Approver'));

        $expenseDateFormatted = !empty($current['expensesDate'])
            ? date('m/d/Y', strtotime((string)$current['expensesDate']))
            : '';

        $eventName = trim((string)($current['eventName'] ?? ''));

        if ($eventName === '') {
            $eventName = $pk;
        }

        // =====================================================
        // EMAIL TO DEFAULT APPROVER
        // =====================================================

        if ($approverEmail !== '' && filter_var($approverEmail, FILTER_VALIDATE_EMAIL)) {

            $htmlBody = '
            <div style="font-family: Arial, Helvetica, sans-serif; font-size:14px; color:#222;">

                <h2 style="color:#198754;">
                    Reimbursement Checked by Manager
                </h2>

                <p>
                    Hello <strong>' . htmlspecialchars($approverName) . '</strong>,
                </p>

                <p>
                    A reimbursement request was checked by the manager and is ready for accounting review.
                </p>

                <table cellpadding="6" cellspacing="0" border="0" style="border-collapse: collapse;">

                    <tr>
                        <td><strong>Reimbursement ID:</strong></td>
                        <td>' . htmlspecialchars((string)$idReimbursement) . '</td>
                    </tr>

                    <tr>
                        <td><strong>Promoter:</strong></td>
                        <td>' . htmlspecialchars((string)($current['promoterName'] ?? '')) . '</td>
                    </tr>

                    <tr>
                        <td><strong>Amount:</strong></td>
                        <td>$' . number_format((float)$amount, 2) . '</td>
                    </tr>

                    <tr>
                        <td><strong>Expense Type:</strong></td>
                        <td>' . htmlspecialchars($expensesType) . '</td>
                    </tr>

                    <tr>
                        <td><strong>Expense Date:</strong></td>
                        <td>' . htmlspecialchars($expenseDateFormatted) . '</td>
                    </tr>

                    <tr>
                        <td><strong>Event:</strong></td>
                        <td>' . htmlspecialchars($eventName) . '</td>
                    </tr>

                    <tr>
                        <td><strong>Description:</strong></td>
                        <td>' . nl2br(htmlspecialchars($description)) . '</td>
                    </tr>

                </table>

                <br>

                <div style="
                    background:#f0fff4;
                    border:1px solid #b7e4c7;
                    padding:12px;
                    border-radius:6px;
                ">
                    <strong>Manager Comments:</strong><br><br>
                    ' . nl2br(htmlspecialchars($checkedComments)) . '
                </div>

                <br>

                <p>
                    Checked by:
                    <strong>' . htmlspecialchars($adminName) . ' (' . htmlspecialchars($adminCode) . ')</strong>
                </p>

                <p style="color:#777;">
                    Go Local Promotions
                </p>

            </div>
            ';

            $emailResult = glpSendEmailSmtp(
                'G',
                [$approverEmail],
                [],
                ['dsaucedo@golocalpromos.com'],
                'REIMBURSEMENT CHECKED | ID ' . $idReimbursement,
                $htmlBody
            );

            file_put_contents(
                $debugFile,
                "[" . date('Y-m-d H:i:s') . "] CHECKED EMAIL RESULT: "
                . json_encode($emailResult, JSON_UNESCAPED_UNICODE)
                . "\n",
                FILE_APPEND
            );

        } else {

            file_put_contents(
            $debugFile,
            "[" . date('Y-m-d H:i:s') . "] CHECKED EMAIL SKIPPED: invalid default approver email. ApproverEmail={$approverEmail}\n",
            FILE_APPEND
        );
        }

        // =====================================================
        // SMS TO DEFAULT APPROVER
        // =====================================================

        if ($approverPhone !== '') {

            $smsMessage =
                "Go Local: Reimbursement ID {$idReimbursement} was checked by manager and is ready for accounting review. " .
                "Promoter: " . ($current['promoterName'] ?? '') . ". " .
                "Amount: $" . number_format((float)$amount, 2) . ". " .
                "Event: {$eventName}.";

            

            $smsResult = glpSendSms(
                [$approverPhone],
                envValue('TWILIO_SID', ''),
                envValue('TWILIO_TOKEN', ''),
                $smsMessage
            );

            file_put_contents(
            $debugFile,
            "[" . date('Y-m-d H:i:s') . "] CHECKED SMS RESULT: "
            . json_encode($smsResult, JSON_UNESCAPED_UNICODE)
            . "\n",
            FILE_APPEND
            );

        } else {

            file_put_contents(
                $debugFile,
                "[" . date('Y-m-d H:i:s') . "] CHECKED SMS SKIPPED: empty default approver phone.\n",
                FILE_APPEND
            );
        }
    }

   if ($actionType === 'reject') {

        $requesterEmail = trim((string)($current['promoterEmail'] ?? ''));

        if (
            $requesterEmail !== '' &&
            filter_var($requesterEmail, FILTER_VALIDATE_EMAIL)
        ) {

            require_once $PATHS['core'] . 'communications.php';

            $htmlBody = '
                <div style="font-family: Arial, Helvetica, sans-serif; font-size:14px; color:#222;">

                <h2 style="color:#c62828;">
                    Reimbursement Request Rejected
                </h2>

                <p>
                    Hello <strong>' . htmlspecialchars($current['promoterName'] ?? 'there') . '</strong>,
                </p>

                <p>
                    Your reimbursement request has been rejected.
                </p>

                <table cellpadding="6" cellspacing="0" border="0" style="border-collapse: collapse;">

                    <tr>
                        <td><strong>Reimbursement ID:</strong></td>
                        <td>' . htmlspecialchars((string)$idReimbursement) . '</td>
                    </tr>

                    <tr>
                        <td><strong>Amount:</strong></td>
                        <td>$' . number_format((float)$amount, 2) . '</td>
                    </tr>

                    <tr>
                        <td><strong>Expense Type:</strong></td>
                        <td>' . htmlspecialchars($expensesType) . '</td>
                    </tr>

                    <tr>
                        <td><strong>Expense Date:</strong></td>
                        <td>' . (
                        !empty($current['expensesDate'])
                        ? date('m/d/Y', strtotime((string)$current['expensesDate']))
                        : ''
                        ) . '</td>
                    </tr>

                    <tr>
                        <td><strong>Event:</strong></td>
                        <td>' . htmlspecialchars((string)($current['eventName'] ?? '')) . '</td>
                    </tr>

                    <tr>
                        <td><strong>Description:</strong></td>
                        <td>' . nl2br(htmlspecialchars($description)) . '</td>
                    </tr>

                </table>

                <br>

                <div style="
                    background:#fff3f3;
                    border:1px solid #e0b4b4;
                    padding:12px;
                    border-radius:6px;
                ">
                    <strong>Rejection Reason:</strong><br><br>
                    ' . nl2br(htmlspecialchars($rejectionReason)) . '
                </div>

                <br>

                <p>
                    Reviewed by:
                    <strong>' . htmlspecialchars($adminName) . '</strong>
                </p>

                <br>

                <p style="color:#777;">
                    Go Local Promotions
                </p>

            </div>
            ';

            $emailResult = glpSendEmailSmtp(
                'G',
                [$requesterEmail],                  // TO
                ['sofia@golocalpromos.com'],       // CC
                ['dsaucedo@golocalpromos.com'],    // BCC
                'REIMBURSEMENT REJECTED | ID ' . $idReimbursement,
                $htmlBody
            );

            file_put_contents(
                $debugFile,
                "[" . date('Y-m-d H:i:s') . "] REJECT EMAIL RESULT: "
                . json_encode($emailResult, JSON_UNESCAPED_UNICODE)
                . "\n",
                FILE_APPEND
            );
        }
    }

    
    $pdo->commit();

    echo json_encode([
        'ok' => true,
        'message' => 'Reimbursement updated successfully.',
        'pendingReimbursementApprovalsNumber' => $pendingReimbursementApprovalsNumber
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    if ($pdo && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    file_put_contents(
        $debugFile,
        "[" . date('Y-m-d H:i:s') . "] ❌ {$__caller} ERROR: " . $e->getMessage() . "\n",
        FILE_APPEND
    );

    echo json_encode([
        'ok' => false,
        'message' => $e->getMessage(),
        'pendingReimbursementApprovalsNumber' => $pendingReimbursementApprovalsNumber
    ], JSON_UNESCAPED_UNICODE);

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
?>