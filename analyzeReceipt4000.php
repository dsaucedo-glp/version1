<?php
declare(strict_types=1);

// analyzeReceipt453.php
// Lee una IMAGEN de recibo y devuelve JSON:
// vendor, service, amount, currency, date, confidence
//
// Reglas:
// - NO acepta PDF.
// - Calcula fileHash SHA256 del archivo recibido.
// - Valida duplicado contra reimbursementReceipts.fileHash.
// - Devuelve fileHash, fileMime y fileSize al frontend.

header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__, 2) . '/private/core/bootstrap.php';
require_once $PATHS['core'] . 'dbConnectGo.php';

function fail($code, $detail = null): void {
    echo json_encode([
        'ok' => false,
        'error' => $code,
        'detail' => $detail
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function clean_unknown_text($value): string {
    $s = trim((string)($value ?? ''));
    if ($s === '') return '';

    $s = preg_replace('/\s*[—–-]\s*/u', ' — ', $s);
    $s = trim($s);

    if (preg_match('/^UNKNOWN$/iu', $s)) return '';
    if (preg_match('/^UNKNOWN\s+—\s+UNKNOWN$/iu', $s)) return '';

    $s = preg_replace('/^UNKNOWN\s+—\s+/iu', '', $s);
    $s = preg_replace('/\s+—\s+UNKNOWN$/iu', '', $s);

    $s = preg_replace('/^\s*—\s*/u', '', $s);
    $s = preg_replace('/\s*—\s*$/u', '', $s);

    $s = preg_replace('/\s{2,}/u', ' ', $s);
    return trim($s);
}

function normalize_receipt_output($data): array {
    if (!is_array($data)) {
        $data = [];
    }

    $amount = $data['amount'] ?? 0;
    if (is_string($amount)) {
        $amount = preg_replace('/[^0-9.\-]/', '', $amount);
    }

    $currency = strtoupper(trim((string)($data['currency'] ?? 'USD')));
    if ($currency === '') $currency = 'USD';

    $confidence = $data['confidence'] ?? 0;

    return [
        'vendor'     => clean_unknown_text($data['vendor'] ?? ''),
        'service'    => clean_unknown_text($data['service'] ?? ''),
        'amount'     => is_numeric($amount) ? (float)$amount : 0,
        'currency'   => $currency,
        'date'       => ($data['date'] ?? null),
        'confidence' => is_numeric($confidence) ? (float)$confidence : 0
    ];
}

function extract_openai_text(array $res): ?string {
    if (!empty($res['output_text']) && is_string($res['output_text'])) {
        return $res['output_text'];
    }

    if (!empty($res['output']) && is_array($res['output'])) {
        foreach ($res['output'] as $out) {
            if (empty($out['content']) || !is_array($out['content'])) continue;

            foreach ($out['content'] as $c) {
                if (!empty($c['text']) && is_string($c['text'])) {
                    return $c['text'];
                }
            }
        }
    }

    return null;
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        fail('method_not_allowed');
    }

    if (!isset($_FILES['receipt'])) {
        fail('no_file');
    }

    if ($_FILES['receipt']['error'] !== UPLOAD_ERR_OK) {
        fail('upload_error', $_FILES['receipt']['error']);
    }

    $tmp  = $_FILES['receipt']['tmp_name'];
    $size = (int)($_FILES['receipt']['size'] ?? 0);

    if ($size <= 0) {
        fail('empty_file');
    }

    if ($size > 8 * 1024 * 1024) {
        fail('too_big');
    }

    $mime = mime_content_type($tmp) ?: '';

    // Regla de negocio: solo imágenes.
    // HEIC/HEIF deben llegar convertidos desde el frontend antes de este PHP.
    $allowed = [
        'image/jpeg',
        'image/png',
        'image/webp'
    ];

    if (!in_array($mime, $allowed, true)) {
        fail('bad_type_images_only', $mime);
    }

    // Duplicado exacto de archivo.
    $fileHash = hash_file('sha256', $tmp);
    if (!$fileHash) {
        fail('hash_failed');
    }

    // Validación inmediata contra histórico ya guardado.
    $db = Database::getInstance();
    $pdo = $db->getConnection(
        basename(__FILE__),
        'Unknown',
        'Unknown',
        'Unknown',
        'Unknown'
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmtDup = $pdo->prepare("
        SELECT idReceipt, idReimbursement, originalFileName, createdAt
        FROM reimbursementReceipts
        WHERE fileHash = :fileHash
        LIMIT 1
    ");

    $stmtDup->execute([
        ':fileHash' => $fileHash
    ]);

    $dup = $stmtDup->fetch(PDO::FETCH_ASSOC);

    if ($dup) {
        echo json_encode([
            'ok' => false,
            'duplicate' => true,
            'error' => 'duplicate_receipt',
            'detail' => 'Duplicate receipt. This receipt was already used in reimbursement ID ' . $dup['idReimbursement'] . '.',
            'duplicateInfo' => $dup
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $openaiKey = trim((string)envValue('OPENAI_API_KEY'));
    if ($openaiKey === '') {
        fail('no_openai_key');
    }

    $fileContent = file_get_contents($tmp);
    if ($fileContent === false) {
        fail('file_read_failed');
    }

    $dataUrl = "data:$mime;base64," . base64_encode($fileContent);

    $out = openai_from_image($openaiKey, $dataUrl);
    $out = normalize_receipt_output($out);

    echo json_encode([
        'ok' => true,
        'fileHash' => $fileHash,
        'fileMime' => $mime,
        'fileSize' => $size,
        'data' => $out
    ], JSON_UNESCAPED_UNICODE);
    exit;

} catch (Throwable $e) {
    fail('server_error', $e->getMessage());
}

/** ---------- Helpers ---------- **/

function openai_from_image($apiKey, $dataUrl): array {
    $payload = [
        'model' => 'gpt-4o-mini',
        'input' => [[
            'role' => 'user',
            'content' => [
                [
                    'type' => 'input_text',
                    'text' => "You are a precise receipt parser. Extract ONLY what is printed on the receipt image.
Return JSON with:
- vendor: merchant/supplier name
- service: short label (e.g., PARKING, UBER, MEAL). If unclear use 'UNKNOWN'.
- amount: FINAL/TOTAL amount paid as number
- currency: 3-letter if shown; infer from symbols ($, COP) else 'USD'
- date: as printed or ISO if possible, else null
- confidence: 0..1 about correctness.

If this is a bank transaction screenshot, use merchant name, spend category/service, transaction amount and purchase date.
If multiple amounts, choose FINAL/TOTAL. Do NOT fabricate."
                ],
                [
                    'type' => 'input_image',
                    'image_url' => $dataUrl,
                    'detail' => 'auto'
                ]
            ]
        ]],
        'text' => [
            'format' => [
                'type'   => 'json_schema',
                'name'   => 'receipt_schema',
                'strict' => true,
                'schema' => [
                    'type' => 'object',
                    'additionalProperties' => false,
                    'properties' => [
                        'vendor'     => ['type' => 'string'],
                        'service'    => ['type' => 'string'],
                        'amount'     => ['type' => 'number'],
                        'currency'   => ['type' => 'string'],
                        'date'       => ['anyOf' => [['type' => 'string'], ['type' => 'null']]],
                        'confidence' => ['type' => 'number']
                    ],
                    'required' => ['vendor', 'service', 'amount', 'currency', 'date', 'confidence']
                ]
            ]
        ]
    ];

    $res = openai_call($apiKey, $payload);
    $text = extract_openai_text($res);

    if (!$text) {
        return [
            'vendor' => '',
            'service' => '',
            'amount' => 0,
            'currency' => 'USD',
            'date' => null,
            'confidence' => 0
        ];
    }

    $json = json_decode($text, true);

    if (!is_array($json)) {
        return [
            'vendor' => '',
            'service' => '',
            'amount' => 0,
            'currency' => 'USD',
            'date' => null,
            'confidence' => 0
        ];
    }

    return $json;
}

function openai_call($apiKey, $payload): array {
    $ch = curl_init('https://api.openai.com/v1/responses');

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $apiKey,
            'Content-Type: application/json'
        ],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
        CURLOPT_TIMEOUT => 60
    ]);

    $raw = curl_exec($ch);

    if ($raw === false) {
        $err = curl_error($ch);
        curl_close($ch);
        throw new Exception('curl_error: ' . $err);
    }

    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $json = json_decode($raw, true);

    if ($code >= 400) {
        throw new Exception('openai_http_' . $code . ': ' . ($raw ?: ''));
    }

    if (!is_array($json)) {
        throw new Exception('openai_bad_json: ' . substr((string)$raw, 0, 500));
    }

    return $json;
}
?>