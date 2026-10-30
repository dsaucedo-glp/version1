SELECT
    ms.pk,
    ms.promoter,
    ms.eventName,
    ms.market,

    TIMESTAMP(
        ms.shiftCalcDate,
        SEC_TO_TIME(ROUND(ms.shiftCalcTime * 3600))
    ) AS shiftDatetime,

    ms.shiftStartUTCDatetime,

    cr.userLocalDatetime AS checkInLocalDatetime,
    cr.checkTimestamp AS checkInUTCDatetime,

    TIMESTAMPDIFF(
        MINUTE,
        ms.shiftStartUTCDatetime,
        cr.checkTimestamp
    ) AS minutesDifference,

    CASE
        WHEN cr.checkTimestamp IS NULL THEN 'NO CHECK IN'
        WHEN cr.checkTimestamp < ms.shiftStartUTCDatetime THEN 'EARLY'
        WHEN cr.checkTimestamp = ms.shiftStartUTCDatetime THEN 'ON TIME'
        ELSE 'LATE'
    END AS checkInStatus

FROM masterShifts ms

LEFT JOIN checkInRecords cr
    ON cr.pk = ms.pk
    AND cr.actionType = 'CHECK IN'

WHERE ms.shiftCalcDate >= '2026-07-01'
  AND ms.shiftCalcDate <= '2026-10-12'
  AND ms.pk NOT LIKE 'MCK%' 
  AND ms.pk NOT LIKE 'DIE%'
  AND ms.pk NOT LIKE 'KCK%'

ORDER BY ms.shiftStartUTCDatetime DESC;