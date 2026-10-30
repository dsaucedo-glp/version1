<?php
header('Content-Type: application/json; charset=utf-8');

mb_internal_encoding('UTF-8');

function cleanText($s) {
    $s = preg_replace('/[ \t]+/u', ' ', (string)$s);
    return trim($s);
}

function parse_qty_and_product($chunk) {
    $chunk = cleanText($chunk);
    if ($chunk === '') {
        return null;
    }

    $m = [];

    // Intento 1: "Product A 4 units"
    if (preg_match('/^(.*?)[\s:,-]*([0-9]+)\s*(units?|unit|u|pcs?|ct\.?|count|x)?\s*$/iu', $chunk, $m)) {
        $name = trim((string)$m[1]);
        $qty  = (int)$m[2];

        if ($name !== '' && $qty >= 0) {
            return [
                'product' => $name,
                'qty'     => $qty
            ];
        }
    }

    // Intento 2: "Name x3" o "Name x 3"
    if (preg_match('/^(.*?)[\s:,-]*x\s*([0-9]+)\s*$/iu', $chunk, $m)) {
        $name = trim((string)$m[1]);
        $qty  = (int)$m[2];

        if ($name !== '' && $qty >= 0) {
            return [
                'product' => $name,
                'qty'     => $qty
            ];
        }
    }

    // Intento 3: número al final
    if (preg_match('/^(.*?)[\s:,-]*([0-9]+)\s*$/u', $chunk, $m)) {
        $name = trim((string)$m[1]);
        $qty  = (int)$m[2];

        if ($name !== '' && $qty >= 0) {
            return [
                'product' => $name,
                'qty'     => $qty
            ];
        }
    }

    // Fallback: sin número
    $chunk = trim((string)preg_replace('/[,:;-]+$/', '', $chunk));
    if ($chunk === '') {
        return null;
    }

    return [
        'product' => $chunk,
        'qty'     => ''
    ];
}

try {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        echo json_encode([
            'ok'    => false,
            'error' => 'POST required'
        ]);
        exit;
    }

    $raw = isset($_POST['text']) ? (string)$_POST['text'] : '';
    $raw = trim($raw);

    if ($raw === '') {
        echo json_encode([
            'ok'   => true,
            'rows' => []
        ]);
        exit;
    }

    // Romper por saltos de línea, punto y coma o coma fuera de paréntesis
    $parts = preg_split('/[\r\n;]+|,(?![^()]*\))/u', $raw);

    $rows = [];
    foreach ($parts as $p) {
        $p = cleanText($p);
        if ($p === '') {
            continue;
        }

        $row = parse_qty_and_product($p);
        if ($row !== null) {
            $row['product'] = preg_replace('/\b(units?|unit|pcs?|ct\.?|count)\b$/iu', '', (string)$row['product']);
            $row['product'] = cleanText($row['product']);

            if ($row['product'] !== '') {
                $rows[] = $row;
            }
        }
    }

    echo json_encode([
        'ok'   => true,
        'rows' => $rows
    ]);
    exit;

} catch (Throwable $e) {
    echo json_encode([
        'ok'     => false,
        'error'  => 'internal_error',
        'detail' => $e->getMessage()
    ]);
    exit;
}
?>