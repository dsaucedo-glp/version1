<?php

declare(strict_types=1);

/**
 * GO LOCAL PROMOTIONS
 * Firebase Cloud Messaging — HTTP v1
 *
 * Sends Android push notifications using
 * Firebase service account authentication.
 */

/**
 * Generate Google OAuth 2.0 access token
 * using Firebase service account credentials.
 */
function glpFirebaseGetAccessToken(string $credentialsPath): string
{
    if (!is_readable($credentialsPath)) {
        throw new RuntimeException('Firebase credentials not readable.');
    }

    $credentials = json_decode(
        file_get_contents($credentialsPath),
        true,
        512,
        JSON_THROW_ON_ERROR
    );

    $clientEmail = $credentials['client_email'] ?? '';
    $privateKey  = $credentials['private_key'] ?? '';

    if ($clientEmail === '' || $privateKey === '') {
        throw new RuntimeException('Invalid Firebase credentials.');
    }

    $now = time();

    $header = [
        'alg' => 'RS256',
        'typ' => 'JWT'
    ];

    $claims = [
        'iss'   => $clientEmail,
        'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
        'aud'   => 'https://oauth2.googleapis.com/token',
        'iat'   => $now,
        'exp'   => $now + 3600
    ];

    $base64url = static function (string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    };

    $unsignedToken =
        $base64url(json_encode($header, JSON_THROW_ON_ERROR)) .
        '.' .
        $base64url(json_encode($claims, JSON_THROW_ON_ERROR));

    if (!openssl_sign(
        $unsignedToken,
        $signature,
        $privateKey,
        OPENSSL_ALGO_SHA256
    )) {
        throw new RuntimeException('Firebase JWT signing failed.');
    }

    $jwt = $unsignedToken . '.' . $base64url($signature);

    $ch = curl_init('https://oauth2.googleapis.com/token');

    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query([
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $jwt
        ]),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 15
    ]);

    try {
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        if ($response === false) {
            throw new RuntimeException(
                'Firebase OAuth connection failed: ' . curl_error($ch)
            );
        }
    } finally {
        curl_close($ch);
    }

    $result = json_decode($response, true);

    if (
        $httpCode !== 200 ||
        !is_array($result) ||
        empty($result['access_token'])
    ) {
        throw new RuntimeException(
            'Firebase OAuth authentication failed. HTTP ' . $httpCode
        );
    }

    return $result['access_token'];
}


/**
 * Send a PUSH notification through Firebase Cloud Messaging HTTP v1.
 */
function glpFirebaseSendPush(
    string $deviceToken,
    string $title,
    string $body
): array {

    $credentialsPath = dirname(__DIR__) . '/firebase/service-account.json';

    $accessToken = glpFirebaseGetAccessToken($credentialsPath);

    $projectId = 'golocalpromos-beta-android';

    $url = 'https://fcm.googleapis.com/v1/projects/' .
        $projectId . '/messages:send';

    $payload = [
        'message' => [
            'token' => $deviceToken,
            'notification' => [
                'title' => $title,
                'body' => $body
            ],
            'android' => [
                'priority' => 'HIGH',
                'notification' => [
                    'channel_id' => 'golocal_notifications',
                    'sound' => 'default'
                ]
            ]
        ]
    ];

    $ch = curl_init($url);

    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $accessToken,
            'Content-Type: application/json'
        ],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_THROW_ON_ERROR),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 15
    ]);

    try {
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        if ($response === false) {
            throw new RuntimeException(
                'Firebase PUSH connection failed: ' . curl_error($ch)
            );
        }
    } finally {
        curl_close($ch);
    }

    $result = json_decode($response, true);

    if ($httpCode !== 200) {
        return [
            'ok' => false,
            'httpCode' => $httpCode,
            'error' => $result['error']['message'] ?? 'Unknown Firebase error',
            'status' => $result['error']['status'] ?? null,
            'details' => $result['error']['details'] ?? []
        ];
    }

    return [
        'ok' => true,
        'httpCode' => $httpCode,
        'messageId' => $result['name'] ?? null
    ];
}




/**
 * Send CHECK IN / CHECK OUT notification
 * to Diego's Xiaomi (Beta testing).
 */
function glpNotifyCheckInOut(
    string $actionType,
    string $promoterName,
    string $eventName,
    string $location
): void {

    // Future global parameter: sendCheckInOutNotifications
    // Currently always enabled.
    $sendCheckInOutNotifications = true;

    if (!$sendCheckInOutNotifications) {
        return;
    }

    // Only Staffing CHECK IN / CHECK OUT
    if (!in_array($actionType, ['CHECK IN', 'EXPRESS IN'], true)) {
        return;
    }

    $tokenPath = dirname(__DIR__) .
        '/firebase/diego-xiaomi-token.txt';

    if (!is_readable($tokenPath)) {
        error_log('GOLOCAL PUSH: Device token not readable.');
        return;
    }

    $deviceToken = trim(file_get_contents($tokenPath));

    if ($deviceToken === '') {
        error_log('GOLOCAL PUSH: Device token is empty.');
        return;
    }

    $title = 'GO LOCAL - ' . $actionType;

    $body = $promoterName .
        ' | ' . $eventName .
        ' | ' . $location;

    try {

        $result = glpFirebaseSendPush(
            $deviceToken,
            $title,
            $body
        );

        if (!$result['ok']) {
            error_log(
                'GOLOCAL PUSH FAILED: ' .
                ($result['error'] ?? 'Unknown error')
            );
        }

    } catch (Throwable $e) {

        error_log(
            'GOLOCAL PUSH ERROR: ' . $e->getMessage()
        );
    }
}
