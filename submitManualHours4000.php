<?php

header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__, 2) . '/private/core/bootstrap.php';
require_once $PATHS['core'] . 'dbConnectGo.php';

$__caller  = basename(__FILE__);
$__ip      = $_POST['ip'] ?? 'Unknown';
$__user    = strtoupper(trim($_POST['promoterCode'] ?? 'Unknown'));
$__country = $_POST['country'] ?? 'Unknown';
$__city    = $_POST['city'] ?? 'Unknown';

try {

    // =========================================================
    // INPUT
    // =========================================================

    $promoterCode = strtoupper(
        trim((string)($_POST['promoterCode'] ?? ''))
    );

    $workDate = trim(
        (string)($_POST['workDate'] ?? '')
    );

    /*
     * RAW start time exactly as received from UI.
     * Example: "1:00 PM"
     */
    $startTimeInput = trim(
        (string)($_POST['startTimeInput'] ?? '')
    );

    /*
     * RAW duration exactly as entered by user.
     */
    $durationInputHours = filter_var(
        $_POST['durationInputHours'] ?? null,
        FILTER_VALIDATE_INT
    );

    $durationInputMinutes = filter_var(
        $_POST['durationInputMinutes'] ?? null,
        FILTER_VALIDATE_INT
    );

    $completedTasks = trim(
        (string)($_POST['completedTasks'] ?? '')
    );


    // =========================================================
    // BASIC VALIDATION
    // =========================================================

    if ($promoterCode === '') {
        throw new Exception('Missing user code.');
    }

    if (
        !preg_match(
            '/^\d{4}-\d{2}-\d{2}$/',
            $workDate
        )
    ) {
        throw new Exception('Invalid work date.');
    }

    /*
     * Validate real calendar date.
     */
    [$year, $month, $day] = array_map(
        'intval',
        explode('-', $workDate)
    );

    if (!checkdate($month, $day, $year)) {
        throw new Exception('Invalid work date.');
    }

    if ($startTimeInput === '') {
        throw new Exception('Start time is required.');
    }

    /*
    * Parse UI value in 24-hour format.
    *
    * Accepted examples:
    * 00:00
    * 09:30
    * 15:00
    * 23:45
    */
    if (
        !preg_match(
            '/^([01]\d|2[0-3]):([0-5]\d)$/',
            $startTimeInput,
            $matches
        )
    ) {
        throw new Exception('Invalid start time.');
    }

    $hour24      = (int)$matches[1];
    $startMinute = (int)$matches[2];

    $startAmPm = ($hour24 >= 12) ? 'PM' : 'AM';

    $startHour = $hour24 % 12;

    if ($startHour === 0) {
        $startHour = 12;
    }

    // =========================================================
    // DURATION VALIDATION
    // =========================================================

    if (
        $durationInputHours === false ||
        $durationInputHours < 0 ||
        $durationInputHours > 24
    ) {
        throw new Exception('Invalid duration hours.');
    }

    if (
        $durationInputMinutes === false ||
        $durationInputMinutes < 0 ||
        $durationInputMinutes > 59
    ) {
        throw new Exception('Invalid duration minutes.');
    }

    /*
     * 0 hours + 0 minutes makes no sense.
     */
    if (
        $durationInputHours === 0 &&
        $durationInputMinutes === 0
    ) {
        throw new Exception(
            'Duration must be greater than zero.'
        );
    }

    /*
     * If hours = 24, minutes must be zero.
     * This keeps maximum duration at exactly 24 hours.
     */
    if (
        $durationInputHours === 24 &&
        $durationInputMinutes > 0
    ) {
        throw new Exception(
            'Duration cannot exceed 24 hours.'
        );
    }

    if ($completedTasks === '') {
        throw new Exception(
            'Completed tasks are required.'
        );
    }


    // =========================================================
    // DATABASE CONNECTION
    // =========================================================

    $db = Database::getInstance();

    $pdo = $db->getConnection(
        $__caller,
        $promoterCode,
        $__ip,
        $__country,
        $__city
    );


    // =========================================================
    // VERIFY USER + PERMISSION
    // =========================================================

    $stmt = $pdo->prepare("
        SELECT
            promoterCode,
            promoterName,
            active,
            canAddHoursManually
        FROM promoters
        WHERE promoterCode = :code
        LIMIT 1
    ");

    $stmt->execute([
        ':code' => $promoterCode
    ]);

    $promoter = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$promoter) {
        throw new Exception('User not found.');
    }

    if ((int)$promoter['active'] !== 1) {
        throw new Exception('Inactive user.');
    }

    if (
        (int)$promoter['canAddHoursManually'] !== 1
    ) {
        throw new Exception(
            'You are not authorized to add manual hours.'
        );
    }


    // =========================================================
    // TRUSTED USER DATA
    // =========================================================

    /*
     * Do NOT trust workerName / addedByName from browser.
     * Get them directly from promoters.
     *
     * Current design:
     * Worker = logged-in user
     * Added By = logged-in user
     */

    $workerCode = trim(
        (string)$promoter['promoterCode']
    );

    $workerName = trim(
        (string)$promoter['promoterName']
    );

    $addedByCode = $workerCode;
    $addedByName = $workerName;


    // =========================================================
    // CALCULATED DURATION
    // =========================================================

    /*
     * Preserve RAW values:
     *
     * durationInputHours
     * durationInputMinutes
     *
     * And calculate decimal duration:
     *
     * 4h 30m = 4.50
     * 1h 15m = 1.25
     * 1h 20m = 1.33
     * 0h 45m = 0.75
     */

    $durationHours =
        $durationInputHours +
        ($durationInputMinutes / 60);

    $durationHours = round(
        $durationHours,
        2
    );


    // =========================================================
    // INSERT
    // =========================================================

    $stmt = $pdo->prepare("
        INSERT INTO manualHours
        (
            workerCode,
            workerName,
            workDate,

            startTimeInput,
            startHour,
            startMinute,
            startAmPm,

            durationInputHours,
            durationInputMinutes,
            durationHours,

            completedTasks,

            addedByCode,
            addedByName
        )
        VALUES
        (
            :workerCode,
            :workerName,
            :workDate,

            :startTimeInput,
            :startHour,
            :startMinute,
            :startAmPm,

            :durationInputHours,
            :durationInputMinutes,
            :durationHours,

            :completedTasks,

            :addedByCode,
            :addedByName
        )
    ");

    $stmt->execute([

        ':workerCode' => $workerCode,
        ':workerName' => $workerName,
        ':workDate'   => $workDate,

        ':startTimeInput' => $startTimeInput,
        ':startHour'      => $startHour,
        ':startMinute'    => $startMinute,
        ':startAmPm'      => $startAmPm,

        ':durationInputHours' =>
            $durationInputHours,

        ':durationInputMinutes' =>
            $durationInputMinutes,

        ':durationHours' =>
            $durationHours,

        ':completedTasks' =>
            $completedTasks,

        ':addedByCode' =>
            $addedByCode,

        ':addedByName' =>
            $addedByName
    ]);


    // =========================================================
    // SUCCESS
    // =========================================================

    $idManualHour = (int)$pdo->lastInsertId();

    echo json_encode([
        'success' => true,
        'idManualHour' => $idManualHour,
        'durationHours' => $durationHours,
        'message' => 'Admin hours submitted successfully.'
    ]);

} catch (Throwable $e) {

    http_response_code(400);

    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}