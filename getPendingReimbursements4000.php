<?php
header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__, 2) . '/private/core/bootstrap.php';
require_once $PATHS['core'] . 'dbConnectGo.php';

$__caller  = basename(__FILE__);
$code      = strtoupper(trim((string)($_GET['code'] ?? '')));
$__user    = $code !== '' ? $code : 'Unknown';
$__ip      = $_GET['ip'] ?? ($_SERVER['REMOTE_ADDR'] ?? 'Unknown');
$__country = $_GET['country'] ?? 'Unknown';
$__city    = $_GET['city'] ?? 'Unknown';

$pdo = null;
$debugFile = rtrim($PATHS['logs'], '/\\') . '/debug_log.txt';

function short_shift_date($value) {
    $s = trim((string)($value ?? ''));
    if ($s === '') return '';

    $s = preg_replace('/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+/i', '', $s);

    return trim($s);
}

try {
    $db  = Database::getInstance();
    $pdo = $db->getConnection($__caller, $__user, $__ip, $__country, $__city);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $items = [];
    $expenseTypes = [];

    if ($code === '') {
        echo json_encode([
            'ok' => true,
            'items' => [],
            'expenseTypes' => [],
            'shiftOptions' => []
        ], JSON_UNESCAPED_UNICODE);
        return;
    }

    $sql = "
        SELECT
            r.idReimbursement,
            r.pk,
            r.promoterCode,
            r.promoterName,
            r.expensesDate,
            r.amount,
            r.expensesType,
            r.description,
            r.submittedDate,
            r.status,
            r.photoPath,
            DATEDIFF(CURDATE(), DATE(r.submittedDate)) AS daysPending,
            UPPER(TRIM(LEFT(COALESCE(r.pk, ''), 3))) AS shiftOwnerDerived,
            r.sentToManagerComments,
            r.checkedComments,

            CASE
                WHEN EXISTS (
                    SELECT 1
                    FROM reimbursementDefaultApprovers dfa
                    WHERE dfa.active = 1
                      AND UPPER(TRIM(dfa.defaulAproverCode)) = :viewerCode1
                ) THEN 1
                ELSE 0
            END AS isDefaultApprover,

            CASE
                WHEN EXISTS (
                    SELECT 1
                    FROM reimbursementManagers rm
                    WHERE rm.active = 1
                      AND UPPER(TRIM(rm.approverCode)) = :viewerCode2
                      AND UPPER(TRIM(rm.shiftOwner)) = UPPER(TRIM(LEFT(COALESCE(r.pk, ''), 3)))
                ) THEN 1
                ELSE 0
            END AS isAssignedManager,

            CASE
                WHEN EXISTS (
                    SELECT 1
                    FROM reimbursementDefaultApprovers dfa
                    WHERE dfa.active = 1
                    AND UPPER(TRIM(dfa.defaulAproverCode)) = :viewerCode5
                ) THEN 1
                ELSE 0
            END AS canApprove,

            CASE
                WHEN EXISTS (
                    SELECT 1
                    FROM reimbursementDefaultApprovers dfa
                    WHERE dfa.active = 1
                    AND UPPER(TRIM(dfa.defaulAproverCode)) = :viewerCode6
                ) THEN 1
                ELSE 0
            END AS canSendToManager,

             CASE
                WHEN r.status = 'sent_to_manager'
                    AND EXISTS (
                    SELECT 1
                    FROM reimbursementManagers rm
                    WHERE rm.active = 1
                    AND UPPER(TRIM(rm.approverCode)) = :viewerCode7
                    AND UPPER(TRIM(rm.shiftOwner)) = UPPER(TRIM(LEFT(COALESCE(r.pk, ''), 3)))
                ) THEN 1
                ELSE 0
            END AS canCheck,

            1 AS canReject

        FROM reimbursements r

        WHERE
            (
                EXISTS (
                    SELECT 1
                    FROM reimbursementDefaultApprovers dfa
                    WHERE dfa.active = 1
                      AND UPPER(TRIM(dfa.defaulAproverCode)) = :viewerCode3
                )
                AND r.status IN ('pending', 'sent_to_manager','checked')
            )
            OR
            (
                r.status = 'sent_to_manager'
                AND EXISTS (
                    SELECT 1
                    FROM reimbursementManagers rm
                    WHERE rm.active = 1
                      AND UPPER(TRIM(rm.approverCode)) = :viewerCode4
                      AND UPPER(TRIM(rm.shiftOwner)) = UPPER(TRIM(LEFT(COALESCE(r.pk, ''), 3)))
                )
            )

        ORDER BY r.submittedDate ASC, r.idReimbursement ASC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':viewerCode1' => $code,
        ':viewerCode2' => $code,
        ':viewerCode3' => $code,
        ':viewerCode4' => $code,
        ':viewerCode5' => $code,
        ':viewerCode6' => $code,
        ':viewerCode7' => $code
    ]);

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $receiptsByReimb = [];

    if (!empty($rows)) {
        $ids = array_values(array_unique(array_map(
            static fn($r) => (int)$r['idReimbursement'],
            $rows
        )));

        if (!empty($ids)) {
            $placeholders = implode(',', array_fill(0, count($ids), '?'));

            $stmtReceipts = $pdo->prepare("
                SELECT
                    idReceipt,
                    idReimbursement,
                    expenseType,
                    expenseDate,
                    expenseDescription,
                    amount,
                    photoPath,
                    originalFileName,
                    fileMime,
                    fileSize,
                    createdAt
                FROM reimbursementReceipts
                WHERE idReimbursement IN ($placeholders)
                ORDER BY idReceipt ASC
            ");

            $stmtReceipts->execute($ids);
            $receiptRows = $stmtReceipts->fetchAll(PDO::FETCH_ASSOC);

            foreach ($receiptRows as $rr) {
                $rid = (int)$rr['idReimbursement'];

                if (!isset($receiptsByReimb[$rid])) {
                    $receiptsByReimb[$rid] = [];
                }

                $receiptsByReimb[$rid][] = [
                    'idReceipt'          => $rr['idReceipt'],
                    'idReimbursement'    => $rr['idReimbursement'],
                    'expenseType'        => $rr['expenseType'],
                    'expenseDate'        => $rr['expenseDate'],
                    'expenseDescription' => $rr['expenseDescription'],
                    'amount'             => $rr['amount'],
                    'photoPath'          => $rr['photoPath'],
                    'originalFileName'   => $rr['originalFileName'],
                    'fileMime'           => $rr['fileMime'],
                    'fileSize'           => $rr['fileSize'],
                    'createdAt'          => $rr['createdAt']
                ];
            }
        }
    }


    foreach ($rows as $row) {
        $isDefaultApprover = (int)$row['isDefaultApprover'] === 1;
        $isAssignedManager = (int)$row['isAssignedManager'] === 1;
        $status = (string)$row['status'];

        $canReject = false;
        $canApprove = false;
        $canSendToManager = false;
        $canCheck = false;

        if ($isDefaultApprover) {
            if ($status === 'pending') {
                $canReject = true;
                $canApprove = true;
                $canSendToManager = true;
            } elseif ($status === 'sent_to_manager') {
                $canReject = true;
                $canApprove = false;
                $canSendToManager = false;
                $canCheck = false;
            } elseif ($status === 'checked') {
                $canReject = true;
                $canApprove = true;
                $canSendToManager = false;
            }
        } elseif ($isAssignedManager && $status === 'sent_to_manager') {
            $canReject = true;
            $canApprove = false;
            $canSendToManager = false;
            $canCheck = true;
        }

        $stmtShift = $pdo->prepare("
            SELECT pk, eventName, shiftDate, fromTo, market, location1
            FROM masterShifts
            WHERE promoter = :promoterName
            ORDER BY shiftStartUTCDatetime DESC, pk DESC
            LIMIT 50
        ");

        $stmtShift->execute([
            ':promoterName' => $row['promoterName']
        ]);
        $shiftRows = $stmtShift->fetchAll(PDO::FETCH_ASSOC);

        $itemShiftOptions = [];
        $foundCurrentPk = false;

        foreach ($shiftRows as $sr) {
            $shortDate = short_shift_date($sr['shiftDate'] ?? '');
            $label = trim($shortDate . ' • ' . ($sr['eventName'] ?? ''));

            $itemShiftOptions[] = [
                'pk' => $sr['pk'],
                'label' => $label
            ];

            if (strtoupper(trim((string)$sr['pk'])) === strtoupper(trim((string)$row['pk']))) {
                $foundCurrentPk = true;
            }
        }

        if (!$foundCurrentPk && !empty($row['pk'])) {
            $itemShiftOptions[] = [
                'pk' => $row['pk'],
                'label' => trim(short_shift_date($row['shiftDate'] ?? '') . ' • ' . ($row['eventName'] ?? ''))
            ];
        }

        $receipts = $receiptsByReimb[(int)$row['idReimbursement']] ?? [];

        if (empty($receipts) && !empty($row['photoPath'])) {
            $receipts[] = [
                'idReceipt'          => null,
                'idReimbursement'    => $row['idReimbursement'],
                'expenseType'        => $row['expensesType'],
                'expenseDate'        => $row['expensesDate'],
                'expenseDescription' => $row['description'],
                'amount'             => $row['amount'],
                'photoPath'          => $row['photoPath'],
                'originalFileName'   => null,
                'fileMime'           => null,
                'fileSize'           => null,
                'createdAt'          => null
            ];
        }

        $items[] = [
            'idReimbursement'   => $row['idReimbursement'],
            'pk'                => $row['pk'],
            'promoterCode'      => $row['promoterCode'],
            'promoterName'      => $row['promoterName'],
            'expensesDate'      => $row['expensesDate'],
            'amount'            => $row['amount'],
            'expensesType'      => $row['expensesType'],
            'description'       => $row['description'],
            'submittedDate'     => $row['submittedDate'],
            'status'            => $status,
            'daysPending'       => (int)$row['daysPending'],
            'photoPath'         => $row['photoPath'],
            'receipts'          => $receipts,
            'receiptsCount'     => count($receipts),
            'sentToManagerComments' => $row['sentToManagerComments'] ?? '',
            'checkedComments'       => $row['checkedComments'] ?? '',
            'shiftOwner'        => $row['shiftOwnerDerived'],
            'isDefaultApprover' => $isDefaultApprover ? 1 : 0,
            'isAssignedManager' => $isAssignedManager ? 1 : 0,
            'canReject'         => $canReject ? 1 : 0,
            'canApprove'        => $canApprove ? 1 : 0,
            'canSendToManager'  => $canSendToManager ? 1 : 0,
            'canCheck'          => $canCheck ? 1 : 0,
            'shiftOptions'      => $itemShiftOptions
        ];
    }

    $stmt2 = $pdo->prepare("
        SELECT expensesType AS expensesTypeName
        FROM expensesTypes
        ORDER BY idExpensesType ASC
    ");
    $stmt2->execute();
    $rows2 = $stmt2->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows2 as $r2) {
        $expenseTypes[] = $r2['expensesTypeName'];
    }

    echo json_encode([
        'ok' => true,
        'viewerCode' => $code,
        'items' => $items,
        'expenseTypes' => $expenseTypes
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    file_put_contents(
        $debugFile,
        "[" . date('Y-m-d H:i:s') . "] ❌ {$__caller} ERROR: " . $e->getMessage() . "\n",
        FILE_APPEND
    );

    echo json_encode([
        'ok' => false,
        'message' => $e->getMessage()
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