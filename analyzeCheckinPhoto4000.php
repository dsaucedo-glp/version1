<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__, 2) . '/private/core/bootstrap.php';

/*
|--------------------------------------------------------------------------
| analyzeCheckinPhoto3200
|--------------------------------------------------------------------------
| Recibe:
|   photoBase64
|
| Devuelve:
|   {
|       "success": true,
|       "result": "INSIDE" | "NOT_INSIDE" | "UNCERTAIN",
|       "confidence": 0.95,
|       "vehicleType": "car",
|       "reason": "...",
|       "evidence": [...]
|   }
|--------------------------------------------------------------------------
*/

function jsonResponse(array $data, int $status = 200): never
{
    http_response_code($status);

    echo json_encode(
        $data,
        JSON_UNESCAPED_SLASHES |
        JSON_UNESCAPED_UNICODE
    );

    exit;
}


/*
|--------------------------------------------------------------------------
| INPUT
|--------------------------------------------------------------------------
*/

$photoBase64 = trim(
    (string)($_POST['photoBase64'] ?? '')
);

if ($photoBase64 === '') {

    jsonResponse([
        'success' => false,
        'message' => 'Missing photoBase64.'
    ], 400);
}


/*
|--------------------------------------------------------------------------
| QUITAR DATA URL SI ALGÚN DÍA LLEGA COMPLETA
|--------------------------------------------------------------------------
*/

if (
    str_starts_with(
        $photoBase64,
        'data:image/'
    )
) {

    $commaPos =
        strpos(
            $photoBase64,
            ','
        );

    if ($commaPos !== false) {

        $photoBase64 =
            substr(
                $photoBase64,
                $commaPos + 1
            );
    }
}


/*
|--------------------------------------------------------------------------
| VALIDAR BASE64
|--------------------------------------------------------------------------
*/

$decoded =
    base64_decode(
        $photoBase64,
        true
    );

if ($decoded === false) {

    jsonResponse([
        'success' => false,
        'message' => 'Invalid image base64.'
    ], 400);
}


/*
|--------------------------------------------------------------------------
| LIMITAR TAMAÑO
|--------------------------------------------------------------------------
|
| Para evitar que alguien mande cualquier monstruosidad al endpoint.
|
*/

$maxBytes =
    8 * 1024 * 1024;

if (strlen($decoded) > $maxBytes) {

    jsonResponse([
        'success' => false,
        'message' => 'Image exceeds maximum allowed size.'
    ], 413);
}


/*
|--------------------------------------------------------------------------
| API KEY
|--------------------------------------------------------------------------
*/

$apiKey =
    trim(
        (string)envValue(
            'OPENAI_API_KEY'
        )
    );

if ($apiKey === '') {

    error_log(
        '[VEHICLE] OPENAI_API_KEY missing.'
    );

    jsonResponse([
        'success' => false,
        'message' => 'Vehicle verification service is not configured.'
    ], 500);
}


/*
|--------------------------------------------------------------------------
| DATA URL
|--------------------------------------------------------------------------
*/

$imageDataUrl =
    'data:image/jpeg;base64,' .
    $photoBase64;


/*
|--------------------------------------------------------------------------
| PROMPT
|--------------------------------------------------------------------------
*/

$instructions = <<<'TXT'

You are validating a worker check-in selfie.

Your task is to determine whether the photo was taken in an acceptable
check-in environment.

Classify the image using exactly one of these values:

VEHICLE
PARKING
VALID
UNCERTAIN


VEHICLE
-------

Use VEHICLE when there is reasonable visual evidence that the person
taking the selfie is physically inside a road vehicle.

Evidence may include:

- vehicle seats
- headrests
- seat belts
- steering wheel
- dashboard
- center console
- vehicle interior roof or headliner
- interior door panels
- windows clearly viewed from inside a vehicle
- windshield geometry
- rear seats
- recognizable vehicle cabin structure

A vehicle merely visible behind or near the person does NOT by itself
mean the person is inside a vehicle.


PARKING
-------

Use PARKING when the person appears to be physically located in a
parking environment, even when the person is standing outside a vehicle.

This includes:

- outdoor parking lots
- indoor parking garages
- parking structures
- airport parking areas
- mall or shopping-center parking lots
- parking decks
- parking ramps
- areas dominated by parked vehicles and parking spaces

Visual evidence may include:

- multiple parked vehicles
- painted parking-space lines
- numbered parking spaces
- parking signs
- parking meters
- concrete parking decks
- garage columns
- low parking-garage ceilings
- rows of parked vehicles
- wheel stops
- parking barriers or gates
- vehicle access lanes
- clearly recognizable parking-lot layout

IMPORTANT:

A worker standing outside a vehicle but clearly surrounded by a parking
lot or parking garage must be classified as PARKING.

Do not classify a scene as PARKING merely because one vehicle happens
to be visible in an otherwise valid environment.


VALID
-----

Use VALID when the person clearly appears to be outside a vehicle AND
the surrounding environment does not appear to be a parking area.

Examples include:

- sidewalk
- pedestrian entrance
- storefront
- store
- airport terminal
- building interior
- warehouse
- office
- event venue
- pedestrian outdoor area


UNCERTAIN
---------

Use UNCERTAIN whenever the visible scene does not provide enough
information to reliably determine whether the person is:

1. inside a vehicle,
2. in a parking environment, or
3. in a valid environment.

Examples include:

- the face fills almost the entire image
- very little background is visible
- the background is blurred
- the image is very dark
- only a neutral wall is visible
- vehicle or parking evidence is ambiguous
- the visible context is insufficient

IMPORTANT DECISION RULE:

Do NOT use VALID merely because there is insufficient evidence of
VEHICLE or PARKING.

VALID requires positive visual evidence that the surrounding environment
is reasonably consistent with a non-vehicle, non-parking location.

When the environment cannot be determined reliably, use UNCERTAIN.

Confidence must be between 0 and 1.

The reason must be short and based only on visible evidence.

The evidence array must contain only short visual observations.

TXT;


/*
|--------------------------------------------------------------------------
| RESPONSES API
|--------------------------------------------------------------------------
*/

$payload = [

    'model' => 'gpt-5.6',

    'input' => [

        [
            'role' => 'system',
            'content' => [
                [
                    'type' => 'input_text',
                    'text' => $instructions
                ]
            ]
        ],

        [
            'role' => 'user',
            'content' => [

                [
                    'type' => 'input_text',
                    'text' =>
                        'Analyze this check-in photo and determine whether the person is inside a vehicle.'
                ],

                [
                    'type' => 'input_image',
                    'image_url' =>
                        $imageDataUrl,

                    /*
                     * LOW es suficiente para esta
                     * clasificación y reduce costo/latencia.
                     */
                    'detail' => 'low'
                ]
            ]
        ]
    ],

    /*
    |--------------------------------------------------------------------------
    | STRUCTURED OUTPUT
    |--------------------------------------------------------------------------
    */

    'text' => [

        'format' => [

            'type' => 'json_schema',

            'name' =>
                'vehicle_scene_analysis',

            'strict' => true,

            'schema' => [

                'type' => 'object',

                'properties' => [

                    'result' => [
                        'type' => 'string',
                        'enum' => [
                            'INSIDE',
                            'NOT_INSIDE',
                            'UNCERTAIN'
                        ]
                    ],

                    'confidence' => [
                        'type' => 'number'
                    ],

                    'vehicleType' => [
                        'type' => 'string'
                    ],

                    'reason' => [
                        'type' => 'string'
                    ],

                    'evidence' => [
                        'type' => 'array',
                        'items' => [
                            'type' => 'string'
                        ]
                    ]
                ],

                'required' => [
                    'result',
                    'confidence',
                    'vehicleType',
                    'reason',
                    'evidence'
                ],

                'additionalProperties' =>
                    false
            ]
        ]
    ]
];


/*
|--------------------------------------------------------------------------
| CURL
|--------------------------------------------------------------------------
*/

$ch =
    curl_init(
        'https://api.openai.com/v1/responses'
    );

curl_setopt_array(
    $ch,
    [

        CURLOPT_RETURNTRANSFER => true,

        CURLOPT_POST => true,

        CURLOPT_HTTPHEADER => [

            'Authorization: Bearer ' .
                $apiKey,

            'Content-Type: application/json'
        ],

        CURLOPT_POSTFIELDS =>
            json_encode(
                $payload,
                JSON_UNESCAPED_SLASHES
            ),

        CURLOPT_CONNECTTIMEOUT => 10,

        CURLOPT_TIMEOUT => 30
    ]
);


$responseBody =
    curl_exec($ch);

$curlError =
    curl_error($ch);

$httpStatus =
    (int)curl_getinfo(
        $ch,
        CURLINFO_HTTP_CODE
    );

curl_close($ch);


/*
|--------------------------------------------------------------------------
| CURL ERROR
|--------------------------------------------------------------------------
*/

if ($responseBody === false) {

    error_log(
        '[VEHICLE] CURL error: ' .
        $curlError
    );

    jsonResponse([
        'success' => false,
        'message' =>
            'Vehicle verification request failed.'
    ], 502);
}


/*
|--------------------------------------------------------------------------
| HTTP ERROR
|--------------------------------------------------------------------------
*/

$response =
    json_decode(
        $responseBody,
        true
    );

if (
    $httpStatus < 200 ||
    $httpStatus >= 300
) {

    error_log(
        '[VEHICLE] OpenAI HTTP ' .
        $httpStatus .
        ': ' .
        $responseBody
    );

    jsonResponse([
        'success' => false,
        'message' =>
            'Vehicle verification service returned an error.'
    ], 502);
}


/*
|--------------------------------------------------------------------------
| EXTRAER output_text
|--------------------------------------------------------------------------
|
| Responses API devuelve el texto dentro de:
|
| output[]
|   -> type = message
|      -> content[]
|         -> type = output_text
|            -> text
|
*/

$outputText = '';

foreach (
    ($response['output'] ?? [])
    as $outputItem
) {

    if (
        ($outputItem['type'] ?? '') !==
        'message'
    ) {
        continue;
    }

    foreach (
        ($outputItem['content'] ?? [])
        as $contentItem
    ) {

        if (
            ($contentItem['type'] ?? '') ===
            'output_text'
        ) {

            $outputText =
                (string)(
                    $contentItem['text']
                    ?? ''
                );

            break 2;
        }
    }
}


/*
|--------------------------------------------------------------------------
| SIN RESPUESTA UTIL
|--------------------------------------------------------------------------
*/

if ($outputText === '') {

    error_log(
        '[VEHICLE] No output_text. Raw response: ' .
        $responseBody
    );

    jsonResponse([
        'success' => false,
        'message' =>
            'Vehicle verification returned no usable result.'
    ], 502);
}


/*
|--------------------------------------------------------------------------
| PARSEAR STRUCTURED JSON
|--------------------------------------------------------------------------
*/

$analysis =
    json_decode(
        $outputText,
        true
    );

if (!is_array($analysis)) {

    error_log(
        '[VEHICLE] Invalid structured output: ' .
        $outputText
    );

    jsonResponse([
        'success' => false,
        'message' =>
            'Vehicle verification returned invalid data.'
    ], 502);
}


/*
|--------------------------------------------------------------------------
| NORMALIZAR
|--------------------------------------------------------------------------
*/

$result =
    strtoupper(
        trim(
            (string)(
                $analysis['result']
                ?? 'UNCERTAIN'
            )
        )
    );

if (
    !in_array(
        $result,
        [
            'INSIDE',
            'NOT_INSIDE',
            'UNCERTAIN'
        ],
        true
    )
) {

    $result =
        'UNCERTAIN';
}


$confidence =
    (float)(
        $analysis['confidence']
        ?? 0
    );

$confidence =
    max(
        0,
        min(
            1,
            $confidence
        )
    );


$vehicleType =
    trim(
        (string)(
            $analysis['vehicleType']
            ?? ''
        )
    );


$reason =
    trim(
        (string)(
            $analysis['reason']
            ?? ''
        )
    );


$evidence =
    is_array(
        $analysis['evidence']
        ?? null
    )
        ? $analysis['evidence']
        : [];


/*
|--------------------------------------------------------------------------
| RESPONSE AL JS
|--------------------------------------------------------------------------
*/

jsonResponse([

    'success' =>
        true,

    'result' =>
        $result,

    'insideVehicle' =>
        $result === 'INSIDE',

    'confidence' =>
        $confidence,

    'vehicleType' =>
        $vehicleType,

    'reason' =>
        $reason,

    'evidence' =>
        array_values(
            array_map(
                static fn($value) =>
                    trim(
                        (string)$value
                    ),
                $evidence
            )
        )
]);