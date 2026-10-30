<?php

header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__, 2) . '/private/core/bootstrap.php';

try {
    $text = trim((string)($_POST['text'] ?? ''));
    if ($text === '') {
        echo json_encode(['ok' => false, 'error' => 'no_text']);
        exit;
    }

    // === CONFIG ===
    $apiKey = trim((string) envValue('OPENAI_API_KEY'));
    if ($apiKey === '') {
        echo json_encode(['ok' => false, 'error' => 'no_openai_key']);
        exit;
    }

    $url = 'https://api.openai.com/v1/chat/completions';

    // === PROMPT SIMPLE ===
    $prompt = <<<PROMPT
You are a sales text parser.
Extract every product mentioned with its quantity and total sale amount.
Rules:
- Products may appear separated by commas, spaces, or periods.
- Accept fillers like "sold", "qty", "x", "units" and ignore them.
- Each item has: <product name> <quantity> $<amount>
  Example patterns:
  - Pepsi 1 $1.99
  - Coca Cola, 3 sold, $160
  - Sprite x2 $4.00
  - Fanta 4 $180
- 'amount' is the total sale amount (not unit price).
- If data is incomplete, skip that item.
- Do NOT include explanations.
Return ONLY valid JSON in this exact shape:

{
  "rows": [
    { "productName": "Pepsi", "quantity": 1, "salesAmount": 1.99 },
    { "productName": "Coca Cola", "quantity": 3, "salesAmount": 160 }
  ],
  "grand_total": 161.99
}
PROMPT;

    // === PAYLOAD SIMPLE ===
    $data = [
        "model" => "gpt-4o-mini",
        "response_format" => ["type" => "json_object"],
        "temperature" => 0,
        "messages" => [
            ["role" => "system", "content" => $prompt],
            ["role" => "user", "content" => $text]
        ]
    ];

    // === CURL ===
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey
        ],
        CURLOPT_POSTFIELDS => json_encode($data),
        CURLOPT_TIMEOUT => 40
    ]);

    $raw = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);

    if ($raw === false) {
        echo json_encode(['ok' => false, 'error' => 'curl_error', 'detail' => $err]);
        exit;
    }

    if ($code < 200 || $code >= 300) {
        echo json_encode(['ok' => false, 'error' => 'http_' . $code, 'detail' => $raw]);
        exit;
    }

    $resp = json_decode($raw, true);
    $content = $resp['choices'][0]['message']['content'] ?? '';
    $parsed = json_decode($content, true);

    if (!is_array($parsed) || !isset($parsed['rows'])) {
        echo json_encode(['ok' => false, 'error' => 'invalid_json', 'detail' => $content]);
        exit;
    }

    // === Sanitización mínima ===
    $rows = [];
    $sum = 0.0;

    foreach ($parsed['rows'] as $r) {
        $p = trim((string)($r['productName'] ?? ''));
        $q = (int)($r['quantity'] ?? 0);
        $a = (float)($r['salesAmount'] ?? 0);

        if ($p !== '' && $q > 0 && $a >= 0) {
            $rows[] = [
                'productName' => $p,
                'quantity' => $q,
                'salesAmount' => round($a, 2)
            ];
            $sum += $a;
        }
    }

    echo json_encode([
        'ok' => true,
        'rows' => $rows,
        'grand_total' => round($sum, 2)
    ]);
    exit;

} catch (Throwable $e) {
    echo json_encode([
        'ok' => false,
        'error' => 'exception',
        'detail' => $e->getMessage()
    ]);
    exit;
}
?>