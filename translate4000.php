<?php
header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__, 2) . '/private/core/bootstrap.php';

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

$TRANSLATE_LOG = rtrim($PATHS['logs'], '/\\') . '/translate.log';

function tlog($msg) {
    global $TRANSLATE_LOG;
    @file_put_contents($TRANSLATE_LOG, '[' . date('Y-m-d H:i:s') . '] ' . $msg . PHP_EOL, FILE_APPEND);
}

try {
    $text = isset($_POST['text']) ? trim((string)$_POST['text']) : '';
    if ($text === '') {
        echo json_encode(['ok' => false, 'error' => 'no_text'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $apiKey = trim((string) envValue('OPENAI_API_KEY'));

    if ($apiKey === '') {
        echo json_encode(['ok' => false, 'error' => 'no_api_key'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    tlog('start');
    tlog('text length=' . strlen($text));
    tlog('api key present=' . ($apiKey ? 'yes' : 'no'));

    $instruction =
    "You are a strict enterprise text sanitizer and quality gate for staffing and event reports.\n"
  . "Input may be in ANY language.\n"
  . "\n"
  . "Your job is to REMOVE disallowed content before any polishing or translation.\n"
  . "\n"
  . "DISALLOWED CONTENT:\n"
  . "- insults\n"
  . "- vulgar or obscene language\n"
  . "- offensive language\n"
  . "- hostile or disrespectful language\n"
  . "- accusations against people or entities\n"
  . "- defamatory statements\n"
  . "- claims of theft, fraud, abuse, corruption, misconduct, or bad intent unless written as a neutral operational fact already suitable for a business report\n"
  . "- attacks against products, brands, competitors, companies, managers, colleagues, clients, or superiors\n"
  . "- placeholder text, filler text, lazy text, meaningless text, or low-quality text\n"
  . "- content that is too vague, too generic, not useful for a client-facing report, or not related to the shift/event\n"
  . "- noise-only content such as: '0', '1', '123', '.', '...', '-', '_', 'N/A', 'NA', 'Nothing', 'Nada', 'None', 'ok', 'fine', 'same', 'normal', random letters, keyboard mashing, or similar low-value entries\n"
  . "- text that does not communicate at least one clear, coherent, professional observation related to the shift, event, customers, sales, traffic, product performance, execution, or recommendations\n"
  . "\n"
  . "STRICT BEHAVIOR:\n"
  . "- Do NOT reinterpret disallowed text.\n"
  . "- Do NOT soften it.\n"
  . "- Do NOT paraphrase it.\n"
  . "- Do NOT convert insults or accusations into factual-looking business statements.\n"
  . "- If a sentence contains disallowed content, delete the entire sentence.\n"
  . "- Keep only neutral, factual, operational business content.\n"
  . "- Preserve exact neutral details such as dates, times, quantities, airport names, store names, brands, SKUs, and locations.\n"
  . "- If the remaining valid content is not in English, translate it into professional American English.\n"
  . "- If the remaining valid content is already in English, only polish it.\n"
  . "- The final result must be client-ready and internally professional.\n"
  . "- The final result must be a coherent statement with real informational value.\n"
  . "- Reject content that is only filler, only a placeholder, only a number, only punctuation, only a generic statement, or only meaningless words.\n"
  . "- Reject content that does not clearly relate to the shift/event/store/venue/airport context.\n"
  . "- If nothing valid and meaningful remains, return an empty string in cleaned_text.\n"
  . "\n"
  . "QUALITY BAR FOR SUMMARY TEXT:\n"
  . "- Accept only content that reads like a real summary or real observation of the shift or the commercial environment.\n"
  . "- A valid summary should contain at least one meaningful business observation about the shift.\n"
  . "- Examples of INVALID content: '0', 'N/A', 'Nothing', 'Nada', '.', '...', '123', 'dsds', 'all good', 'normal day', 'same as usual'.\n"
  . "- Examples of VALID content: 'Customer interest was strongest in French liquors, with repeated questions about premium options'.\n"
  . "- Other examples of VALID content: 'Empty store','Low traffic','Closed terminal','No Stock available','No products for sampling'.\n"
  . "- If the text is too weak, too generic, or too low-quality for a client report, return an empty string.\n"
  . "\n"
  . "Return ONLY valid JSON in this exact shape:\n"
  . "{\"cleaned_text\":\"...\",\"has_disallowed_content\":true,\"should_be_empty\":false}\n"
  . "\n"
  . "If all content must be removed, return exactly:\n"
  . "{\"cleaned_text\":\"\",\"has_disallowed_content\":true,\"should_be_empty\":true}\n"
  . "\n"
  . "Do not return markdown. Do not use code fences. Do not add explanations.\n";

    if (!function_exists('curl_init')) {
        echo json_encode([
            'ok' => false,
            'error' => 'curl_not_available'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $postJson = function (string $url, array $payload, string $apiKey): array {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $apiKey,
                'Content-Type: application/json'
            ],
            CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
            CURLOPT_TIMEOUT => 45,
        ]);

        $raw = curl_exec($ch);
        $err = curl_error($ch);
        $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($raw === false) {
            throw new Exception($err ?: 'curl_error');
        }

        return [$http, $raw];
    };

    $extractResponseText = function (array $data): ?string {
        if (!empty($data['output'][0]['content'][0]['text']) && is_string($data['output'][0]['content'][0]['text'])) {
            return $data['output'][0]['content'][0]['text'];
        }

        if (!empty($data['output_text']) && is_string($data['output_text'])) {
            return $data['output_text'];
        }

        if (!empty($data['content'][0]['text']) && is_string($data['content'][0]['text'])) {
            return $data['content'][0]['text'];
        }

        return null;
    };

    $extractJsonObject = function (?string $rawText): ?array {
        if (!is_string($rawText)) return null;

        $rawText = trim($rawText);
        if ($rawText === '') return null;

        $parsed = json_decode($rawText, true);
        if (is_array($parsed)) return $parsed;

        $rawText = preg_replace('/^```(?:json)?\s*/i', '', $rawText);
        $rawText = preg_replace('/\s*```$/', '', $rawText);
        $rawText = trim($rawText);

        $parsed = json_decode($rawText, true);
        if (is_array($parsed)) return $parsed;

        if (preg_match('/\{.*\}/s', $rawText, $m)) {
            $candidate = trim($m[0]);
            $parsed = json_decode($candidate, true);
            if (is_array($parsed)) return $parsed;
        }

        return null;
    };

    $isLowValueSummary = function (string $txt): bool {
        $t = function_exists('mb_strtolower')
            ? trim(mb_strtolower($txt, 'UTF-8'))
            : trim(strtolower($txt));

        if ($t === '') return true;

        $blocked = [
            '0', '1', 'na', 'n/a', 'none', 'nothing', 'nada', '.', '..', '...', '-', '_',
            'ok', 'fine', 'normal', 'all good', 'good day', 'same as usual', 'no issues', 'nothing to report'
        ];

        if (in_array($t, $blocked, true)) return true;

        if (preg_match('/^[\d\W_]+$/u', $t)) return true;

        if (preg_match('/^[a-z]{1,4}$/u', $t) && !in_array($t, ['good', 'slow', 'busy'], true)) return true;

        $words = preg_split('/\s+/u', $t, -1, PREG_SPLIT_NO_EMPTY);
        if (!$words || count($words) < 4) return true;

        return false;
    };

    $normalizeResult = function (?array $parsed) use ($isLowValueSummary): ?array {
        if (!is_array($parsed) || !array_key_exists('cleaned_text', $parsed)) {
            return null;
        }

        $cleaned = trim((string)($parsed['cleaned_text'] ?? ''));
        $hasDisallowed = (bool)($parsed['has_disallowed_content'] ?? false);
        $shouldBeEmpty = (bool)($parsed['should_be_empty'] ?? false);

        if ($shouldBeEmpty) {
            $cleaned = '';
        }

        if ($isLowValueSummary($cleaned)) {
            $cleaned = '';
            $shouldBeEmpty = true;
            $hasDisallowed = true;
        }

        return [
            'cleaned_text' => $cleaned,
            'has_disallowed_content' => $hasDisallowed,
            'should_be_empty' => $shouldBeEmpty
        ];
    };

    $successResponse = function (string $english, bool $hasDisallowed = false, bool $shouldBeEmpty = false): void {
        echo json_encode([
            'ok' => true,
            'translation' => $english,
            'data' => [
                'english_text' => $english,
                'has_disallowed_content' => $hasDisallowed,
                'should_be_empty' => $shouldBeEmpty
            ]
        ], JSON_UNESCAPED_UNICODE);
        exit;
    };

    // ========= 1) Responses API =========
    tlog('calling responses api');

    $responsesUrl = 'https://api.openai.com/v1/responses';

    $respPayload = [
        'model' => 'gpt-4.1-mini',
        'input' => $instruction . "\n\nINPUT:\n\"\"\"\n" . $text . "\n\"\"\"",
        'max_output_tokens' => 500
    ];

    [$http1, $raw1] = $postJson($responsesUrl, $respPayload, $apiKey);

    tlog('responses http=' . $http1);
    tlog('responses raw len=' . strlen((string)$raw1));

    $data1 = json_decode($raw1, true);

    $parsed = null;
    if ($http1 >= 200 && $http1 < 300 && is_array($data1)) {
        $rawOut = $extractResponseText($data1);

        if (is_string($rawOut) && trim($rawOut) === '') {
            $successResponse('', true, true);
        }

        $parsed = $extractJsonObject($rawOut);
        $parsed = $normalizeResult($parsed);

        if (is_array($parsed)) {
            $successResponse(
                $parsed['cleaned_text'],
                $parsed['has_disallowed_content'],
                $parsed['should_be_empty']
            );
        }
    }

    tlog('calling chat completions fallback');

    // ========= 2) Fallback Chat Completions =========
    $chatUrl = 'https://api.openai.com/v1/chat/completions';

    $chatPayload = [
        'model' => 'gpt-4o-mini',
        'messages' => [
            [
                'role' => 'system',
                'content' => 'Return ONLY valid JSON. No markdown. No explanations. If everything must be removed, return cleaned_text as an empty string.'
            ],
            [
                'role' => 'user',
                'content' => $instruction . "\n\nINPUT:\n\"\"\"\n" . $text . "\n\"\"\""
            ]
        ],
        'temperature' => 0.0,
        'max_tokens' => 500
    ];

    [$http2, $raw2] = $postJson($chatUrl, $chatPayload, $apiKey);

    tlog('chat http=' . $http2);
    tlog('chat raw len=' . strlen((string)$raw2));

    $data2 = json_decode($raw2, true);

    if ($http2 >= 200 && $http2 < 300 && !empty($data2['choices'][0]['message']['content'])) {
        $rawOut = trim((string)$data2['choices'][0]['message']['content']);

        if ($rawOut === '') {
            $successResponse('', true, true);
        }

        $parsed = $extractJsonObject($rawOut);
        $parsed = $normalizeResult($parsed);

        if (is_array($parsed)) {
            $successResponse(
                $parsed['cleaned_text'],
                $parsed['has_disallowed_content'],
                $parsed['should_be_empty']
            );
        }
    }

    $successResponse('', true, true);

} catch (Throwable $e) {
    tlog('exception: ' . $e->getMessage());

    echo json_encode([
        'ok' => false,
        'error' => 'upstream_error',
        'status' => 500,
        'detail' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ], JSON_UNESCAPED_UNICODE);
}
?>