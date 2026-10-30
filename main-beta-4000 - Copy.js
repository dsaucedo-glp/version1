let version = 'Beta 4.01-10.29.26';
const APP_VERSION = '401.10-29-26';
console.log(version);
let promoterCode = "";
let promoterName = "";
let promoterEmail = "";
let promoterPhone = "";
let selectedShift = null;
let lastAction = null;
let breakTimerInterval = null;
let shiftTimerInterval = null;
let reloadInterval = null;
let globalParams = {};
let expressParams = {};
let promoterParams = {};
let currentLat = null;
let currentLon = null;
let photoBase64 = null;
let localDatetime = '';
let clickLocalDatetime = '';
let lastBreakStartTime = '';
let lastShiftStartTime = '';
let viewportWidth = window.innerWidth || document.documentElement.clientWidth;
let viewportHeight = window.innerHeight || document.documentElement.clientHeight;
let distance = 0;
let currentGeoContext = {
    accuracyMeters: null,
    maxDistanceAllowed: null,
    overrideAccepted: 0,
    overrideReason: ""
};
let earlyCheckInInterval = null;
let scheduledShiftBeforeExpress = null;
let scheduledLastActionBeforeExpress = null;
const EXPRESS_BEFORE_SHIFT_MINUTES = 60;

let sGeoRequiredCheckIn = 0;
let sGeoRequiredStartBreak = 0;
let sGeoRequiredEndBreak = 0;
let sGeoRequiredCheckOut = 0;

let sPhotoRequiredCheckIn = 0;
let sPhotoRequiredCheckOut = 0;
let sPhotoRequiredStartBreak = 0;
let sPhotoRequiredEndBreak = 0;

let sMaxBreaks = 0;
let sBreaksCounter = 0;
let sTimeRestrictionCheckOut = 0;
let sTimeRestrictionStartBreak = 0;

let pendingCheckoutNoBreakReason = "";
let bypassNoBreakModalOnce = false;
let pendingCheckoutShiftPk = null;   // por si lo necesitas (opcional)
let pendingCheckoutActionType = "";  // "CHECK OUT"

let allShifts = [];
let isSchedulerOpen = false;
let nextPayroll = [];
let lastPayroll = [];
let pendingReportsNumber = 0;
let pendingReports = [];
let toDoList = [];
let reimbShifts = [];
let expensesTypes = [];

// =========== Reports ==============================================
let reportSchema = null;       // se inyecta 
let reportAnswers = {};        // valores del usuario
let reportFiles = {};          // map por fieldId -> File[]
let rcCurrentStep = 0;
let currentReportCtx = null;   // { id, idx, ... }
let rcAfterSubmitAction = null;
let rcPhotoStatusHideTimer = null;


let summaryRec = null;
let summaryRecActive = false;

let sttMediaRecorder = null;
let sttChunks = [];
let sttStream = null;
let sttBusy = false;
let sttMime = 'audio/webm';
let sttExt = 'webm';

let rcProductsMaster = [];   // array de strings con nombres
const RC_PRODUCTS_DATALIST_ID = 'rcProductsList';

let supervisorLevel = 0; // global

let liveSupAllShifts = [];
let liveSupFilters = { market: "", venue: "" };

let historyAllShifts = [];
let historyPromoters = [];

let ip = 'Failed Unknown';
let country = 'Failed Unknown';
let city = 'Failed Unknown';
let supportScreenshotBase64 = "";
let supportScreenshotUrl = "";
let supportSnapshotLogged = false;
let supportPayloadBase = null;

let validateCodeCall = 0;

let lastExpressSessionId = null;
let lastExpressInId = null;
let lastExpressInPk = null;
let expressReportDone = 0;
let pendingExpressTasksText = "";
let bypassExpressTasksModalOnce = false;

let pendingExpressPhotos = [];
let expressPhotosRequired = "NO";
let canPerformAdminTasks = 0;
let canAddHoursManually = 0;

const API_BASE = 'php/';

// ================= CHECK HISTORY STATE =================

let historyFilters = {
    dateFrom: "",
    dateTo: "",
    promoterCode: "",
    market: "",
    location: ""
};

let historyML = {
    markets: [],
    locationsByMarket: {}
};


let rcPhotosProcessing = false;

// ============================================================
// HUMAN FACE DETECTION - MediaPipe
// ============================================================

let humanFaceDetector = null;
let humanFaceDetectorPromise = null;

const HUMAN_FACE_MIN_CONFIDENCE = 0.50;

const MEDIAPIPE_WASM_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm";

const MEDIAPIPE_FACE_MODEL_PATH =
    "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite";

// ============================================================

let lsCurrentShiftPk = "";

let trainingVideos = [];
let currentTrainingVideoUrl = "";
let currentTrainingVideoTitle = "";
let trainingVideoAutoplayAllowed = true;

let isReimbursementDefaultApprover = 0;
let reimbursementApprovals = [];
let reimbursementApprovalCurrent = null;
let reimbursementApprovalExpenseTypes = [];
let reimbursementApprovalShiftOptions = [];
let pendingReimbursementApprovalsNumber = 0;
let reimbursementParameters = {};
let reimbMaxReceiptsPerRequest = 6;
let reimbFiles = [];

let expressInAllowed = 0;
let lastExpressAction = null;
let lastExpressStartTime = null;


let rcBrandsMaster = [];     // array de strings con nombres de marcas
const RC_BRANDS_DATALIST_ID = 'rcBrandsList';
const RC_AUTOSAVE_VER = "v1";
function rcStorageKey(id) { return `rc:${RC_AUTOSAVE_VER}:${promoterCode || ''}:${id}`; }
function rcDebounce(fn, t = 300) { let h; return (...a) => { clearTimeout(h); h = setTimeout(() => fn(...a), t); }; }
const VOICE_PREF = { canRecord: null };


async function checkAppVersion() {
    try {
        const response = await fetch("version.json?t=" + Date.now(), {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("Unable to load version.json");
        }

        const data = await response.json();

        // LOGIN SLOGAN — Interruptor remoto
        const slogan = document.querySelector(".gl-login-slogan");

        if (slogan) {
            slogan.classList.toggle(
                "gl-animate",
                data.loginSloganAnimation === true
            );
        }

        // CONTROL DE VERSIÓN EXISTENTE
        if (data.appVersion && data.appVersion !== APP_VERSION) {
            showForceUpdateScreen(data.appVersion, data.appLabel || "");
            return false;
        }

        return true;

    } catch (err) {
        console.warn("[VERSION CHECK ERROR]", err);
        return true;
    }
}

function showForceUpdateScreen(serverVersion, appLabel = "") {
    $("#code-container").hide();
    $("#selected-shift-info").hide();
    $("#action-container").hide();
    $("#break-timer").hide();
    $("#shift-timer").hide();
    $("#responseMessage").html(`
        <div class="alert alert-warning" role="alert">
            <strong>Update Required</strong><br>
            A new version of the app is available.<br>
            ${appLabel}<br><br>
            <button type="button" class="btn btn-primary" onclick="forceReloadApp()">
                Update App
            </button>
        </div>
    `).show();
}

function forceReloadApp() {
    const cleanUrl = window.location.origin + window.location.pathname;
    window.location.href = cleanUrl + "?v=" + Date.now();
}

async function captureSupportScreenshot() {
    try {
        const target = document.documentElement;

        const canvas = await html2canvas(target, {
            backgroundColor: null,
            scale: 1,
            useCORS: true,
            logging: false,
            scrollX: 0,
            scrollY: -window.scrollY,
            windowWidth: document.documentElement.scrollWidth,
            windowHeight: document.documentElement.scrollHeight
        });

        supportScreenshotBase64 = canvas.toDataURL("image/png");
        return supportScreenshotBase64;
    } catch (err) {
        console.error("[Support] Screenshot failed:", err);
        supportScreenshotBase64 = "";
        return "";
    }
}


async function uploadSupportScreenshot() {
    if (!supportScreenshotBase64) return "";

    try {
        const res = await fetch(API_BASE + "supportScreenshot4000.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                imageBase64: supportScreenshotBase64,
                promoterCode: promoterCode || "",
                ip: ip || "",
                country: country || "",
                city: city || "",
                version: version || ""
            })
        });

        const json = await res.json();
        if (json && json.ok && json.url) {
            supportScreenshotUrl = json.url;
            return json.url;
        }

        console.warn("[Support] Screenshot upload failed:", json);
        return "";
    } catch (err) {
        console.error("[Support] Screenshot upload error:", err);
        return "";
    }
}


function buildSupportPayloadBase() {
    const payload = {
        ip: ip || "Unknown",
        country: country || "Unknown",
        city: city || "Unknown",
        version: version || "Unknown",
        localTime: new Date().toLocaleString(),
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        url: location.href,
        userAgent: navigator.userAgent
    };

    if (selectedShift?.pk) payload.currentShiftPk = selectedShift.pk;
    if (selectedShift?.eventName) payload.event = selectedShift.eventName;
    if (selectedShift?.market) payload.market = selectedShift.market;
    if (selectedShift?.location1) payload.location = selectedShift.location1;
    if (lastAction) payload.lastAction = lastAction;

    if (supportScreenshotUrl) payload.screenshotUrl = supportScreenshotUrl;

    return payload;
}


function buildSupportMessage(identity) {
    let msg = `
        TECH SUPPORT REQUEST

        Privacy notice:
        By contacting support, diagnostic information from your session may be included.

        --- TECH INFO ---
        IP: ${ip || 'Unknown'}
        Country: ${country || 'Unknown'}
        City: ${city || 'Unknown'}
        Version: ${version || 'Unknown'}
        Time: ${new Date().toLocaleString()}
        Viewport: ${window.innerWidth}x${window.innerHeight}
        User agent: ${navigator.userAgent}

        --- USER ---
        Name: ${identity.name || 'N/A'}
        Code: ${identity.code || 'N/A'}
        Phone: ${identity.phone || 'N/A'}
        `.trim();

    if (selectedShift?.pk || selectedShift?.eventName || selectedShift?.market || selectedShift?.location1 || lastAction) {
        msg += `
        --- SHIFT ---
        PK: ${selectedShift?.pk || 'N/A'}
        Event: ${selectedShift?.eventName || 'N/A'}
        Market: ${selectedShift?.market || 'N/A'}
        Location: ${selectedShift?.location1 || 'N/A'}
        Last action: ${lastAction || 'N/A'}`;
    }

    if (supportScreenshotUrl) {
        msg += `
        --- SCREENSHOT ---
        ${supportScreenshotUrl}`;
    }
    return msg;
}

function getPromoterIdentity() {
    if (
        promoterName &&
        promoterCode &&
        promoterPhone
    ) {
        console.log(promoterName, promoterCode, promoterPhone)
        return {
            name: promoterName,
            code: promoterCode,
            phone: promoterPhone
        };
    }

    return null;
}
function supportSetFieldError(fieldId, msg) {
    const err = document.getElementById(`err_${fieldId}`);
    const grp = document.getElementById(`grp_${fieldId}`);
    if (err) {
        err.textContent = msg || "";
        err.style.display = msg ? "block" : "none";
    }
    if (grp) {
        grp.classList.toggle("rc-invalid", !!msg);
    }
}

function supportClearIdentityErrors() {
    supportSetFieldError("supportName", "");
    supportSetFieldError("supportCode", "");
    supportSetFieldError("supportPhone", "");
}

function showSupportIdentityForm(prefill = {}) {
    const wrap = document.getElementById("supportIdentityWrap");
    const nameEl = document.getElementById("supportName");
    const codeEl = document.getElementById("supportCode");
    const phoneEl = document.getElementById("supportPhone");

    if (!wrap || !nameEl || !codeEl || !phoneEl) return;

    supportClearIdentityErrors();
    nameEl.value = (prefill.name || promoterName || "").trim();
    codeEl.value = (prefill.code || promoterCode || "").trim();
    phoneEl.value = (prefill.phone || promoterPhone || "").trim();
    wrap.style.display = "block";
    document.querySelector("#contact-modal .support-privacy-note")?.style.setProperty("display", "none");
    document.querySelector("#contact-modal .support-wa-row")?.style.setProperty("display", "none");
    setTimeout(() => {
        if (!nameEl.value.trim()) nameEl.focus();
        else if (!codeEl.value.trim()) codeEl.focus();
        else phoneEl.focus();
    }, 0);
}

function hideSupportIdentityForm() {
    const wrap = document.getElementById("supportIdentityWrap");
    if (wrap) wrap.style.display = "none";
    document.querySelector("#contact-modal .support-privacy-note")?.style.removeProperty("display");
    document.querySelector("#contact-modal .support-wa-row")?.style.removeProperty("display");
    supportClearIdentityErrors();
}

// SUPPORT REQUEST - PHONE: ONLY DIGITS, MAX 10
document.getElementById("supportPhone")?.addEventListener("input", function () {
    this.value = this.value.replace(/\D/g, "").slice(0, 10);
});

function readSupportIdentityForm() {
    const name = (document.getElementById("supportName")?.value || "").trim();
    const code = (document.getElementById("supportCode")?.value || "").trim().toUpperCase();
    const phone = (document.getElementById("supportPhone")?.value || "").trim();
    return { name, code, phone };
}

function validateSupportIdentity(identity) {
    let ok = true;
    supportClearIdentityErrors();

    if (!identity.name) {
        supportSetFieldError("supportName", "Required.");
        ok = false;
    }

    if (!identity.code) {
        supportSetFieldError("supportCode", "Required.");
        ok = false;
    }

    if (!/^\d{10}$/.test(identity.phone)) {
        supportSetFieldError(
            "supportPhone",
            "Enter a valid 10-digit phone number."
        );
        ok = false;
    }

    return ok;
}

async function sendSupportToWhatsApp(identity) {
    const message = buildSupportMessage(identity);

    fetch(API_BASE + "supportLog4000.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            type: "final",
            data: {
                ...supportPayloadBase,
                identity,
                message
            }
        })
    }).catch(() => { });

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const phone = "+17879567661";
    const encoded = encodeURIComponent(message);

    let url = "";
    if (isMobile) {
        url = `https://wa.me/${phone}?text=${encoded}`;
    } else {
        url = `https://web.whatsapp.com/send?phone=${phone}&text=${encoded}`;
    }
    try {
        window.location.href = url;
    } catch (e) {
        showMessage("Could not open WhatsApp automatically.", "warning");
    }
}

$(document).ready(async function () {
    const versionOk = await checkAppVersion();
    if (!versionOk) return;
    const info = await getUserIPInfo();
    console.log(info);
    ip = info.ip;
    city = info.city;
    country = info.country;
    $("#forgotCodeBtn").removeClass("d-none").show();
});

// ==== Menu & Scheduler ====
$(document).ready(function () {
    const versionLabel = document.getElementById("versionLabel");
    if (versionLabel) {
        versionLabel.textContent = `${version}`;
    }
    hidePostLoginMenuItems();
    const $menu = $("#sideMenu");
    const $backdrop = $("#sideMenuBackdrop");
    const $hamburger = $("#hamburgerBtn");
    const $firstItem = $("#menuScheduler");
    const $closeBtn = $("#closeMenuBtn");
    document.getElementById("waSupportBtn").addEventListener("click", async function () {
        let identity = getPromoterIdentity();

        if (!identity || !identity.name || !identity.code || !identity.phone) {
            showSupportIdentityForm(identity || {});
            return;
        }

        await sendSupportToWhatsApp(identity);
    });

    document.getElementById("supportIdentityCancelBtn")?.addEventListener("click", function () {
        hideSupportIdentityForm();
    });

    document.getElementById("supportIdentityContinueBtn")?.addEventListener("click", async function () {
        const identity = readSupportIdentityForm();

        if (!validateSupportIdentity(identity)) {
            return;
        }

        hideSupportIdentityForm();
        await sendSupportToWhatsApp(identity);
    });


    /* --- Estado inicial: menú siempre cerrado --- */
    function hardCloseOnBoot() {
        $menu.removeClass("open")
            .attr({ "aria-hidden": "true", inert: "" });
        $backdrop.removeClass("show");
        $hamburger.attr("aria-expanded", "false");
    }
    hardCloseOnBoot();  // ← ejecuta al inicio

    /* --- Funciones de abrir / cerrar --- */
    function openMenu() {
        $menu.addClass("open").removeAttr("aria-hidden inert");
        $backdrop.addClass("show");
        $hamburger.attr("aria-expanded", "true");
        // foco interno
        setTimeout(() => {
            ($closeBtn[0] || $firstItem[0] || $menu.find("button, a")[0])?.focus();
        }, 100);
    }

    function closeMenu() {
        if ($menu[0].contains(document.activeElement)) {
            $hamburger.trigger("focus");
        }
        $menu.removeClass("open")
            .attr({ "aria-hidden": "true", inert: "" });
        $backdrop.removeClass("show");
        $hamburger.attr("aria-expanded", "false");
    }

    let _lastFocusEl = null;

    $hamburger.off("click.menu").on("click.menu", (e) => {
        e.preventDefault();
        if ($menu.hasClass("open")) closeMenu(); else openMenu();
    });

    $closeBtn.off("click.menu").on("click.menu", (e) => {
        e.preventDefault();
        closeMenu();
    });

    $backdrop.off("click.menu").on("click.menu", () => closeMenu());

    $(document).off("keydown.menu").on("keydown.menu", (e) => {
        if (e.key === "Escape" && $menu.hasClass("open")) {
            e.preventDefault();
            closeMenu();
        }
    });


    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState !== "visible") closeMenu();
    });
    $(window).off("resize.menu").on("resize.menu", () => {
        if (window.innerWidth >= 992) closeMenu();
    });

    $("#closeMenuBtn, #sideMenuBackdrop").on("click", closeMenu);

    $("#menuScheduler").on("click", function () {
        openScheduler();
    });

    $(document).off("keydown.menuEsc").on("keydown.menuEsc", (e) => {
        if (e.key === "Escape" && $menu.hasClass("open")) {
            e.preventDefault();
            closeMenu();
        }
    });

    $("#closeSchedulerBtn").on("click", function () {
        closeScheduler();
        const $hamburger = $("#hamburgerBtn");
        if ($hamburger.length) $hamburger.trigger("focus");
    });

    $(document).on("click", "#menuManualHours", function () {
        closeMenu();
        openManualHours();
    });


    $(document).on("click", "#closeManualHoursBtn, #btnCancelManualHours",
        function () {
            closeManualHours();
        }
    );

    function openContactModal() {
        const activeEl = document.activeElement;
        const sideMenuEl = document.getElementById("sideMenu");

        // No guarda foco si viene de algo que quedará oculto
        if (
            activeEl &&
            activeEl !== document.body &&
            !(sideMenuEl && sideMenuEl.contains(activeEl)) &&
            !$("#contact-modal")[0]?.contains(activeEl)
        ) {
            _lastFocusEl = activeEl;
        } else {
            _lastFocusEl = $("#hamburgerBtn")[0] || null;
        }

        const $m = $("#contact-modal");
        $m.addClass("show").attr("aria-hidden", "false");
        hideSupportIdentityForm();

        // resetea cualquier desplazamiento raro
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        const wrap = document.getElementById("supportShotWrap");
        const img = document.getElementById("supportShotPreview");

        if (wrap && img) {
            if (supportScreenshotBase64) {
                img.src = supportScreenshotBase64;
                wrap.style.display = "block";
            } else {
                img.src = "";
                wrap.style.display = "none";
            }
        }
        setTimeout(() => {
            ($m.find("#contactCloseBtn")[0] || $m.find(".modal-close")[0])?.focus({ preventScroll: true });
        }, 0);

        $(document).on("keydown.cmEsc", (e) => {
            if (e.key === "Escape") closeContactModal();
        });
    }

    function closeContactModal() {
        const $m = $("#contact-modal");
        $m.removeClass("show").attr("aria-hidden", "true");
        $(document).off("keydown.cmEsc");

        const fallbackEl = $("#hamburgerBtn")[0] || null;
        const lastEl = _lastFocusEl;

        const canRestoreFocus =
            lastEl &&
            document.contains(lastEl) &&
            lastEl.offsetParent !== null &&
            !$("#contact-modal")[0]?.contains(lastEl) &&
            !$("#sideMenu")[0]?.contains(lastEl);

        const targetEl = canRestoreFocus ? lastEl : fallbackEl;

        setTimeout(() => {
            try {
                targetEl?.focus({ preventScroll: true });
            } catch (e) {
                try { targetEl?.focus(); } catch (_) { }
            }

            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
        }, 0);
    }


    $(document).off("click.contactClose", "#contactCloseBtn").on("click.contactClose", "#contactCloseBtn", function (e) {
        e.preventDefault();
        e.stopPropagation();
        closeContactModal();
    });

    // Cerrar por backdrop o botón
    $(document)
        .off("click.contactModalClose", "#contact-modal .cm-backdrop, #contact-modal .modal-close")
        .on("click.contactModalClose", "#contact-modal .cm-backdrop, #contact-modal .modal-close", function (e) {
            e.preventDefault();
            e.stopPropagation();
            closeContactModal();
        });




    $("#menuContact").on("click", async function () {
        closeMenu();

        supportScreenshotBase64 = "";
        supportScreenshotUrl = "";
        supportSnapshotLogged = false;

        await captureSupportScreenshot();
        await uploadSupportScreenshot();

        supportPayloadBase = buildSupportPayloadBase();

        try {
            await fetch(API_BASE + "supportLog4000.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "snapshot",
                    data: supportPayloadBase
                })
            });
            supportSnapshotLogged = true;
        } catch (e) {
            console.warn("[Support] Snapshot log failed", e);
        }

        openContactModal();
    });




    // Abrir Next Payroll desde el menú
    $("#menuPayroll").on("click", function () {
        openPayroll();
    });

    // Abrir Last Payroll desde el menú
    $("#menuLastPayroll").on("click", function () {
        openLastPayroll();
    });

    $("#closePayrollBtn").on("click", function () {
        closePayroll();
        $("#hamburgerBtn").trigger("focus"); // accesibilidad
    });

    $("#closeLastPayrollBtn").on("click", function () {
        closeLastPayroll();
        $("#hamburgerBtn").trigger("focus"); // accesibilidad
    });


    // Abrir Reportes
    $("#menuReports").on("click", function () {
        if ($(this).is(':disabled') || $(this).hasClass('is-disabled')) return;
        openReports();
    });

    $("#closeReportsBtn").on("click", function () {
        closeReports();
        $("#hamburgerBtn").trigger("focus"); // accesibilidad
    });

    // Abrir Reimbursements desde el menú
    // Reimbursements submenu toggle
    $("#menuReimbursements").off("click.reimbMenu").on("click.reimbMenu", function () {
        const $btn = $(this);
        const $submenu = $("#menuReimbursementsSubmenu");
        const isOpen = !$submenu.prop("hidden");

        $btn.toggleClass("is-open", !isOpen);
        $btn.attr("aria-expanded", !isOpen ? "true" : "false");
        $submenu.prop("hidden", isOpen);
    });

    $("#menuReimbRequest").off("click.reimbRequest").on("click.reimbRequest", function () {
        openReimb();
    });

    $("#menuMyReimbursements").off("click.myReimb").on("click.myReimb", function () {
        openMyReimbursementsView();
    });



    // Cerrar Reimbursements
    $("#closeReimbBtn").on("click", function () {
        closeReimb();
        $("#hamburgerBtn").trigger("focus");
    });

    $(document).off("click.menuExit", "#menuExit").on("click.menuExit", "#menuExit", function () {
        closeMenu();
        try {
            closeContactModal();
        } catch (e) { }
        try {
            closeTrainingVideoPlayer();
        } catch (e) { }
        window.location.href = "https://beta.golocalpromos.net";
    });

    // === Reimbursements: handler global y delegado del file input ===
    $(document)
        .off("change.reimb", "#reimbReceipt")
        .on("change.reimb", "#reimbReceipt", async function () {
            try {
                let file = this.files && this.files[0] ? this.files[0] : null;
                this.value = "";

                if (!file) {
                    setReimbFileStatus("No file selected.", "warn");
                    return;
                }

                if (reimbFiles.length >= reimbMaxReceiptsPerRequest) {
                    setReimbFileStatus([
                        "0 Accepted / 1 Rejected",
                        `Maximum ${reimbMaxReceiptsPerRequest} receipt(s) allowed.`,
                        "The additional receipt was not added."
                    ], "err", { autoHideMs: 8000 });
                    return;
                }

                file = await rcConvertHeicToJpgIfNeeded(file);

                if (file.size > 8 * 1024 * 1024) {
                    showFieldError("reimbReceipt", "File is too large (> 8MB).");
                    setReimbFileStatus("File too large (>8MB).", "err");
                    return;
                }

                clearFieldError("reimbReceipt");
                await reimbAnalyzeAndAddReceipt(file);

            } catch (e) {
                console.error("[reimb] handler error:", e);
                setReimbFileStatus("Could not process the file.", "err");
            }
        });


    $(document)
        .off("input.reimbRows change.reimbRows")
        .on("input.reimbRows change.reimbRows", ".reimb-row-date, .reimb-row-amount, .reimb-row-type, .reimb-row-desc", function () {
            const i = Number($(this).data("index"));
            if (!reimbFiles[i]) return;

            if ($(this).hasClass("reimb-row-date")) {
                reimbFiles[i].expenseDate = $(this).val();
            }

            if ($(this).hasClass("reimb-row-amount")) {
                reimbFiles[i].amount = $(this).val();
            }

            if ($(this).hasClass("reimb-row-type")) {
                reimbFiles[i].expenseType = $(this).val();
            }

            if ($(this).hasClass("reimb-row-desc")) {
                reimbFiles[i].expenseDescription = $(this).val();
            }

            $("#reimbTotal").val(reimbCalcTotal().toFixed(2));
        });

    $(document)
        .off("click.reimbRemoveReceipt")
        .on("click.reimbRemoveReceipt", ".reimb-remove-receipt", function () {
            const i = Number($(this).data("index"));
            reimbFiles.splice(i, 1);
            renderReimbReceiptsList();
            setReimbFileStatus("Receipt removed.", "info");
        });

    $(document).off("click.reimb", "#reimbRemoveFile").on("click.reimb", "#reimbRemoveFile", function () {
        resetReimbReceipt(true);              // borra archivo + limpia campos
        showMessage("Receipt removed.", "info");
    });

    // v188.x: datalist solo cuando el usuario haya escrito >= 4 caracteres
    (function bindDatalistMinChars() {
        const LIST_ID = (typeof RC_PRODUCTS_DATALIST_ID !== 'undefined')
            ? RC_PRODUCTS_DATALIST_ID
            : 'rcProductsList';

        function toggleList(el) {
            const v = String(el.value || '').trim();
            if (v.length >= 4) {
                // Activa datalist
                el.setAttribute('list', LIST_ID);
            } else {
                // Desactiva datalist (no sugerencias)
                el.removeAttribute('list');
            }
        }

        // Delegado: funciona para filas nuevas (Add row)
        $(document)
            .off('input.rclistmin', '.rc-product-input')
            .on('input.rclistmin', '.rc-product-input', function () {
                toggleList(this);
            });

        // Al enfocar, aplica la regla inmediatamente
        $(document)
            .off('focus.rclistmin', '.rc-product-input')
            .on('focus.rclistmin', '.rc-product-input', function () {
                toggleList(this);
            });

        // Al abrir la sección / renderizar filas existentes, asegúrate de arrancar “apagado”
        // (opcional, pero recomendado para que no muestre nada con 0-3 chars)
        $(document).on('rc:promoted-rendered', function () {
            document.querySelectorAll('.rc-product-input').forEach(toggleList);
        });
    })();

    $(document).on('click', '#menuReimbursementApproval', function () {
        openReimbursementApprovalView();
    });

    $(document).on('click', '#closeReimbursementApprovalView', function () {
        appCloseAllViewsHard({ showMain: true });
    });

    $(document).on('click', '#closeReimbursementApprovalDetailView', function () {
        reimbursementApprovalCurrent = null;

        $("#reimbursementApprovalDetailHeader").hide();
        $("#reimbursementApprovalListHeader").show();

        $("#reimbursementApprovalDetailWrap").hide();
        $("#reimbursementApprovalListWrap").show();

        raHideStatus();
    });

    $(document).on("click", "#closeMyReimbursementsView", function () {
        closeMyReimbursementsView();
    });

    $(document).on("click", "#closeMyReimbursementsDetailView", function () {
        myReimbursementCurrent = null;

        $("#myReimbursementsDetailHeader").hide();
        $("#myReimbursementsListHeader").show();

        $("#myReimbursementsDetailWrap").hide();
        $("#myReimbursementsListWrap").show();
    });

    $(document).on("click", "#menuSystemAdmin", function () {
        openSystemAdminView();
    });

    $(document).on("click", "#closeSystemAdminBtn", function () {
        closeSystemAdminView();
        $("#hamburgerBtn").trigger("focus");
    });

    $(document).on("click", "#closeCheckInParamsBtn", function () {
        closeCheckInParamsView();
        $("#hamburgerBtn").trigger("focus");
    });

    $(document).on("click", "#btnCancelCheckInParams", function () {
        closeCheckInParamsView();
    });

});


function buildHamburgerMenu() {
    const lvl = parseInt(supervisorLevel || 0, 10);

    const $list = $("#sideMenu .sideMenu-list");
    if (!$list.length) {
        console.warn("[Menu] sideMenu-list not found");
        return;
    }

    if (expressInAllowed == 1 && !document.getElementById("menuToDoList")) {
        /*
        $list.append(`
            <li>
                <button type="button"
                    class="sideMenu-item sideMenu-yellow"
                    id="menuToDoList">
                <i class="bi bi-calendar-check"></i> To Do List
                </button>
            </li>
        `);
        */
    }

    // =====================================================
    // MANUAL HOURS
    // =====================================================
    if (Number(canAddHoursManually || 0) === 1) {
        $("#menuManualHoursLi").prop("hidden", false);
    } else {
        $("#menuManualHoursLi").prop("hidden", true);
    }

    // ===== Opciones para supervisor =====
    if (lvl >= 4) {
        if (!document.getElementById("menuLiveCompact")) {
            $list.append(`
                <li>
                    <button type="button" class="sideMenu-item sideMenu-yellow" id="menuLiveCompact">
                        <i class="bi bi-broadcast-pin"></i>
                        <span class="menu-text">Today Compact View</span>
                    </button>
                </li>
            `);
        }
        if (!document.getElementById("menuLiveSupervisor")) {
            $list.append(`
                <li>
                    <button type="button" class="sideMenu-item" id="menuLiveSupervisor">
                        <i class="bi bi-layout-three-columns"></i>
                        <span class="menu-text">Today Full View</span>
                    </button>
                </li>
            `);
        }

        if (!document.getElementById("menuCheckHistory")) {
            $list.append(`
                <li>
                    <button type="button" class="sideMenu-item" id="menuCheckHistory">
                        <i class="bi bi-clock-history"></i>
                        <span class="menu-text">Timekeeping History</span>
                    </button>
                </li>
            `);
        }
        // TEMPORARILY DISABLED - Reimbursement Approval menu
        // buildReimbursementApprovalMenuOption();
    } else {
        $("#menuLiveCompact").closest("li").remove();
        $("#menuLiveSupervisor").closest("li").remove();
        $("#menuCheckHistory").closest("li").remove();
        $("#menuReimbursementApprovalWrap").remove();
    }

    if (lvl >= 5) {
        $("#menuSystemAdmin").closest("li").remove();

        $list.append(`
        <li id="menuSystemAdminLi" class="sideMenu-item-wrap">
            <button type="button" class="sideMenu-item" id="menuSystemAdmin">
                <span class="sideMenu-icon">
                    <i class="bi bi-shield-lock"></i>
                </span>
                <span class="menu-text">System Admin</span>
            </button>
        </li>
    `);
    } else {
        $("#menuSystemAdmin").closest("li").remove();
    }



    // ===== Close Session / Exit SIEMPRE al final =====
    $("#menuExit").closest("li").remove();

    $list.append(`
        <li>
            <button type="button" class="sideMenu-item" id="menuExit">
                <i class="bi bi-box-arrow-right"></i> Sign Out
            </button>
        </li>
    `);
}

function setMenuItemDisabled(selector, disabled = true) {
    const $el = $(selector);
    $el.prop('disabled', disabled)
        .attr('aria-disabled', disabled ? 'true' : 'false')
        .toggleClass('is-disabled', disabled);
    if (disabled) $el.attr('tabindex', '-1'); else $el.removeAttr('tabindex');
}

function hidePostLoginMenuItems() {
    $("#menuTrainingVideosLi").attr("hidden", true);
    $("#menuSchedulerLi").attr("hidden", true);
    //$("#menuLastPayrollLi").attr("hidden", true);
    $("#menuReimbursementsLi").attr("hidden", true);
    $("#menuPayrollLi").attr("hidden", true);
    $("#menuReportsLi").attr("hidden", true);

    // por seguridad: limpia disabled viejo si quedó algo
    $("#menuTrainingVideos, #menuScheduler, #menuLastPayroll, #menuReimbursements, #menuPayroll, #menuReports")
        .prop("disabled", false)
        .removeAttr("aria-disabled tabindex")
        .removeClass("is-disabled");
}

function showPostLoginMenuItems() {
    $("#menuTrainingVideosLi").removeAttr("hidden");
    $("#menuSchedulerLi").removeAttr("hidden");
    //$("#menuLastPayrollLi").removeAttr("hidden");
    $("#menuReimbursementsLi").removeAttr("hidden");
    $("#menuPayrollLi").removeAttr("hidden");
    $("#menuReportsLi").removeAttr("hidden");

    $("#menuTrainingVideos, #menuScheduler, #menuLastPayroll, #menuReimbursements, #menuPayroll, #menuReports")
        .prop("disabled", false)
        .removeAttr("aria-disabled tabindex")
        .removeClass("is-disabled");
}




// ===== VOICE FLOW GATE (elige Record o Dictate) =========================
async function detectAudioRecordCapability() {
    const hasDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const hasMediaRec = !!window.MediaRecorder;
    if (!hasDevices || !hasMediaRec) return false;

    if (navigator.permissions?.query) {
        try {
            const p = await navigator.permissions.query({ name: 'microphone' });
            p.onchange = () => { VOICE_PREF.canRecord = (p.state !== 'denied'); renderVoiceUI(); };
            return (p.state !== 'denied');
        } catch { return true; }
    }
    return true;
}

function removeSummaryDictationUI() {
    document.querySelectorAll('[data-role="btn-dictate"]').forEach(el => el.remove());
}
function removeSummaryRecordUI() {
    document.querySelectorAll('[data-role="btn-record-stt"]').forEach(el => el.remove());
}

function renderVoiceUI() {
    if (VOICE_PREF.canRecord) {
        ensureSummaryRecordUI();    // crea 🎧 Record 
        //ensureSummaryDictationUI(); // crea 🎙️ Dictate // Temporal

        //removeSummaryDictationUI(); // elimina 🎙️ Dictate si estuviera - comentado temporal
    } else {
        //ensureSummaryDictationUI(); // crea 🎙️ Dictate
        removeSummaryRecordUI();    // elimina 🎧 Record si estuviera
    }
}

async function initVoiceUIFlow() {
    if (VOICE_PREF.canRecord === null) {
        VOICE_PREF.canRecord = await detectAudioRecordCapability();
    }
    renderVoiceUI();
}
// ======================================================================
$("#codeInput").on("keypress", function (e) {
    if (e.which === 13) {
        e.preventDefault();
        validateCode();
    }
});

$("form").on("submit", function (e) {
    e.preventDefault();
});

function validateCode() {

    validateCodeCall++;

    const code = $("#codeInput").val().trim().toUpperCase();
    const codeInput = document.getElementById("codeInput");
    const continueBtn = document.querySelector("#code-container button");

    hideKeyboard(codeInput);

    if (!navigator.onLine) {
        showMessage("🚫 No internet connection.", "danger");
        codeInput.value = "";
        continueBtn.disabled = false;
        continueBtn.innerText = "Continue";
        // codeInput.focus();
        return;
    }


    if (code.length !== 5) {
        hideKeyboard(codeInput);
        showMessage("⚠️ Enter a valid code.", "warning");
        codeInput.value = "";
        continueBtn.disabled = false;
        continueBtn.innerText = "Continue";
        return
    }

    const now = new Date();
    const localDate = now.getFullYear() + "-" +
        String(now.getMonth() + 1).padStart(2, "0") + "-" +
        String(now.getDate()).padStart(2, "0");

    const userLocalTime = String(now.getHours()).padStart(2, "0") + ":" +
        String(now.getMinutes()).padStart(2, "0") + ":" +
        String(now.getSeconds()).padStart(2, "0");

    const userLocalDatetime = localDate + " " + userLocalTime;
    localDatetime = userLocalDatetime;

    const mainLabel = document.getElementById("mainLabel");

    // Deshabilitar botón mientras se hace la validación
    continueBtn.disabled = true;
    continueBtn.innerText = "Loading...";
    console.log("localDate : " + localDate);
    $.ajax({
        url: API_BASE + "initSession4000.php",
        method: "POST",
        data: { code, ip, country, city, localDate, viewportWidth, viewportHeight },
        dataType: "json",
        success: function (res) {
            console.log(res);

            if (!res.success) {
                hideKeyboard(codeInput);
                showMessage("❌ " + (res.message || "Unknown error"), "danger");
                codeInput.value = "";
                continueBtn.disabled = false;
                continueBtn.innerText = "Continue";
                return
            }

            ////////////////////////////////////////////////
            // Nuevo para rediseño de UI 

            document.body.classList.add("gl-authenticated");

            ////////////////////////////////////////////////


            // console.log(res)
            promoterCode = res.promoterCode || "";
            promoterName = res.promoterName || "";
            setUserAvatar(promoterName);
            promoterEmail = res.promoterEmail || "";
            promoterPhone = res.promoterPhone || "";

            expressParams = res.expressParams || {};
            promoterParams = res.promoter || {};
            console.log("[EXPRESS PARAMETERS]", expressParams);
            // Nuevo para Express In/Out


            expressInAllowed = Number(res.expressInAllowed || 0);
            lastExpressAction = res.lastExpressAction || null;
            lastExpressStartTime = res.lastExpressStartTime || null;
            lastExpressSessionId = res.lastExpressSessionId || null;
            lastExpressInId = res.lastExpressInId || null;
            lastExpressInPk = String(res.lastExpressInPk || "").trim();
            expressReportDone = res.expressReportDone || 0;

            console.log("[EXPRESS DEBUG] lastExpressInPk SAVED:", lastExpressInPk);


            console.log("[EXPRESS DEBUG] res.expressPhotosRequired RAW:", res.expressPhotosRequired, "| type:", typeof res.expressPhotosRequired);
            console.log("[EXPRESS DEBUG] res.lastExpressInPk:", res.lastExpressInPk, "| type:", typeof res.lastExpressInPk);
            console.log("[EXPRESS DEBUG] res.expressReportDone:", res.expressReportDone, "| type:", typeof res.expressReportDon);

            expressPhotosRequired = String(res.expressPhotosRequired || "NO").trim().toUpperCase();

            if (!["NO", "OPTIONAL", "MANDATORY"].includes(expressPhotosRequired)) {
                console.warn("[EXPRESS] Invalid expressPhotosRequired value:", expressPhotosRequired, "-> using NO");
                expressPhotosRequired = "NO";
            }
            console.log("[EXPRESS] expressPhotosRequired:", expressPhotosRequired);

            canPerformAdminTasks = Number(res.canPerformAdminTasks || 0);
            canAddHoursManually = Number(res.canAddHoursManually || 0);
            supervisorLevel = parseInt(res.supervisorLevel || 0, 10);
            showPostLoginMenuItems();
            const name = promoterName || "User";
            allShifts = Array.isArray(res.allShifts) ? res.allShifts : [];
            reimbShifts = Array.isArray(res.shiftsForReimbursement) ? res.shiftsForReimbursement : [];
            expensesTypes = Array.isArray(res.expensesTypes) ? res.expensesTypes : [];
            reimbursementParameters = res.reimbursementParameters || {};

            reimbMaxReceiptsPerRequest = Number(reimbursementParameters.maxReceiptsPerRequest || 6);

            if (!Number.isFinite(reimbMaxReceiptsPerRequest) || reimbMaxReceiptsPerRequest < 6) {
                reimbMaxReceiptsPerRequest = 6;
            }
            trainingVideos = Array.isArray(res.trainingVideos) ? res.trainingVideos : [];
            pendingReimbursementApprovalsNumber = Number(res.pendingReimbursementApprovalsNumber || 0);
            isReimbursementDefaultApprover = Number(res.isReimbursementDefaultApprover || 0);
            //console.log("[Scheduler] total shifts:", allShifts.length);
            //console.log("[Reimb Shifts] total shifts:", reimbShifts.length);
            //console.log("[Expenses Types] total records:", expensesTypes.length);
            //console.log("[Expenses Types] :", expensesTypes);

            buildHamburgerMenu();


            nextPayroll = Array.isArray(res.nextPayroll)
                ? res.nextPayroll
                : (Array.isArray(res.nextPayrollRecords)
                    ? res.nextPayrollRecords
                    : (Array.isArray(res.payrollNext) ? res.payrollNext : []));

            lastPayroll = Array.isArray(res.lastPayroll)
                ? res.lastPayroll
                : (Array.isArray(res.payrollLast)
                    ? res.payrollLast
                    : (Array.isArray(res.lastPayrollRecords) ? res.lastPayrollRecords : []));

            pendingReportsNumber = Number(res.pendingReportsNumber || 0);
            pendingReports = Array.isArray(res.pendingReportsArray) ? res.pendingReportsArray : [];
            toDoList = Array.isArray(res.toDoListArray) ? res.toDoListArray : [];
            // habilita y pinta menú “Reportes”
            //enableReportsMenu(true);
            //enableSchedulerMenu(true);
            //enablePayrollMenu(true);
            //enableReimbursementsMenu(true);
            //enableVideosMenu(true);
            showPostLoginMenuItems();
            setReportsBadge(pendingReportsNumber);
            setReimbursementApprovalBadge(pendingReimbursementApprovalsNumber);

            try {
                rcProductsMaster = Array.isArray(res.productsMaster) ? res.productsMaster : [];
                localStorage.setItem('rcProductsVersion', res.productsVersion || '');
            } catch (_) { rcProductsMaster = []; }
            rcRenderProductsDatalist();



            try {
                rcBrandsMaster = Array.isArray(res.brandsMaster) ? res.brandsMaster : [];
                localStorage.setItem('rcBrandsVersion', res.brandsVersion || '');
            } catch (_) { rcBrandsMaster = []; }
            rcRenderBrandsDatalist();

            if ((!res.shiftsToday || res.shiftsToday.length === 0) && expressInAllowed === 1) {
                selectedShift = buildExpressShift();
                lastAction = lastExpressAction;
                $("#code-container").hide();
                if (name) mainLabel.innerText = name;
                renderActions();
                return;
            }

            if (res.shiftsToday.length === 0 && expressInAllowed !== 1) {

                hideKeyboard(codeInput);
                continueBtn.disabled = false;
                continueBtn.innerText = "Continue";
                codeInput.value = "";

                $("#code-container").hide();
                if (name) mainLabel.innerText = name.toString();
                showMessage("📭 " + name + ", No available shifts for today.", "info");
                codeInput.focus();
                openScheduler();
                return
            }

            $("#code-container").hide();
            if (name) mainLabel.innerText = name;
            selectedShift = res.selectedShift;
            lastAction = res.lastAction;
            globalParams = res.globalParams || {};
            lastBreakStartTime = res.lastBreakStartTime;
            lastShiftStartTime = res.lastShiftStartTime;
            scrollMainHomeTop();
            renderActions();
            scrollMainHomeTop();
        },
        error: function () {
            hideKeyboard(codeInput);
            showMessage("❌ Unable to connect.", "danger");
            codeInput.value = "";
            // codeInput.focus();
            continueBtn.disabled = false;
            continueBtn.innerText = "Continue";

        }
    });
}

function shouldShowReportAndCheckout(shift) {
    if (!shift) return false;

    // ✅ ROBUSTO: verdad del backend
    if (String(shift.reportDone) === "1" || shift.reportDone === 1 || shift.reportDone === true) {
        return false;
    }

    // (opcional) fallback inmediato local, por si aún no refrescó initSession
    if (localStorage.getItem(`rc_report_done_${shift.pk}`) === "1") {
        return false;
    }

    if (shift.mandatoryReportBeforeCheckOut === "0" || shift.mandatoryReportBeforeCheckOut === 0 ||
        shift.mandatoryReportBeforeCheckOut === false) {
        return false;
    }

    // "Texto del shift": junta campos típicos donde lo pueden marcar
    const parts = [
        shift.eventName,
        shift.market,
        shift.location1,
        shift.fromTo,
        shift.shiftText,
        shift.notes,
        shift.comments,
        shift.description
    ];

    const text = parts
        .filter(Boolean)
        .map(v => String(v).toUpperCase())
        .join(" ");

    // Mostrar el botón SOLO si NO aparece NO_REPORT
    return text && !text.includes("NO_REPORT");
}

function shouldAskNoBreakReasonForCheckout(shift) {
    const bc = Number(shift?.breaksCounter ?? 0);
    const mba = Number(shift?.maxBreaksAllowed ?? 0);
    // Regla del usuario: si breaksCounter < maxBreaksAllowed => no tomó los breaks permitidos
    return (mba > 0) && (bc < mba);
}


function openNoBreakModal(onContinue, onCancel) {
    // limpia selección anterior
    pendingCheckoutNoBreakReason = "";
    $("#noBreakError").hide();
    $('input[name="noBreakReason"]').prop("checked", false);

    const modalEl = document.getElementById("noBreakModal");
    const modal = new bootstrap.Modal(modalEl, { backdrop: "static", keyboard: false });

    let continued = false;

    // handler botón Continue
    $("#btnNoBreakContinue")
        .off("click.noBreak")
        .on("click.noBreak", function () {
            const val = $('input[name="noBreakReason"]:checked').val();
            if (!val) {
                $("#noBreakError").show();
                return;
            }

            pendingCheckoutNoBreakReason = String(val).trim();
            continued = true;

            const inst = bootstrap.Modal.getInstance(modalEl);
            if (inst) inst.hide();

            if (typeof onContinue === "function") onContinue(pendingCheckoutNoBreakReason);
        });

    // Cualquier botón de cerrar/cancelar del modal
    $(modalEl)
        .find('[data-bs-dismiss="modal"]')
        .off("click.noBreakCancel")
        .on("click.noBreakCancel", function () {
            // el hidden event se encargará de disparar onCancel
        });

    // Si el modal se cierra sin "Continue", eso es cancel
    $(modalEl)
        .off("hidden.bs.modal.noBreak")
        .on("hidden.bs.modal.noBreak", function () {
            if (!continued && typeof onCancel === "function") onCancel();
        });

    modal.show();
}

function parseUtcDateTime(dt) {
    if (!dt) return null;

    let s = String(dt).trim();

    // MySQL UTC con o sin microsegundos:
    // 2026-07-08 16:45:00
    // 2026-07-08 16:45:00.000000
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) {
        s = s.replace(" ", "T");

        // Quita microsegundos, deja milisegundos máximo
        s = s.replace(/\.(\d{3})\d+$/, ".$1");

        return new Date(s + "Z");
    }

    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
}

function formatCountdown(totalSeconds) {

    const sec = Math.max(0, Math.floor(totalSeconds));

    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = sec % 60;

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}


function clearEarlyCheckInTimer() {
    if (earlyCheckInInterval) {
        clearInterval(earlyCheckInInterval);
        earlyCheckInInterval = null;
    }
    $("#earlyCheckInMessage").remove();
}

function getEarlyCheckInStatus(shift) {

    const applyTimeRestriction =
        Number(globalParams?.applyTimeBeforeCheckIn || 0) === 1;

    const allowEarlyCheckIn =
        Number(shift?.allowEarlyCheckIn || 0) === 1;

    const minutesEarly =
        Number(globalParams?.minMinutesBeforeCheckIn);

    // Excepción por shift:
    // allowEarlyCheckIn = 1 permite CHECK IN sin restricción de horario.
    if (allowEarlyCheckIn) {
        return {
            allowed: true,
            waitSeconds: 0
        };
    }

    // Si la validación global está desactivada, permite CHECK IN.
    if (!applyTimeRestriction) {
        return {
            allowed: true,
            waitSeconds: 0
        };
    }

    // Solo consideramos inválidos valores negativos, nulos o no numéricos.
    // El valor 0 es válido: CHECK IN exactamente a la hora de inicio.
    if (!Number.isFinite(minutesEarly) || minutesEarly < 0) {
        console.warn(
            "[Early Check In] Invalid minMinutesBeforeCheckIn:",
            globalParams?.minMinutesBeforeCheckIn
        );

        return {
            allowed: true,
            waitSeconds: 0
        };
    }

    const start = parseUtcDateTime(shift?.shiftStartUTCDatetime);

    if (!start) {
        console.warn(
            "[Early Check In] Missing or invalid shiftStartUTCDatetime",
            shift
        );

        return {
            allowed: true,
            waitSeconds: 0
        };
    }

    const allowedFrom = new Date(
        start.getTime() - minutesEarly * 60 * 1000
    );

    const waitSeconds = Math.ceil(
        (allowedFrom.getTime() - Date.now()) / 1000
    );

    return {
        allowed: waitSeconds <= 0,
        waitSeconds: Math.max(0, waitSeconds)
    };
}


function getMinutesUntilShiftStart(shift) {
    const start = parseUtcDateTime(shift?.shiftStartUTCDatetime);
    if (!start) return null;

    return Math.floor((start.getTime() - Date.now()) / 60000);
}

function canOfferExpressBeforeScheduledShift(shift) {
    if (Number(expressInAllowed || 0) !== 1) return false;
    if (!shift || shift.brand === "EXPRESS") return false;

    // Si ya está en flujo normal del shift, no mezclar
    if (lastAction) return false;

    // Si tiene EXPRESS abierto, dejarlo cerrar siempre
    if (lastExpressAction === "EXPRESS IN") return true;

    const minutes = getMinutesUntilShiftStart(shift);

    if (minutes === null) return false;

    return minutes >= EXPRESS_BEFORE_SHIFT_MINUTES;
}

function switchToExpressContextIfNeeded(actionType) {
    if (actionType !== "EXPRESS IN" && actionType !== "EXPRESS OUT") return;

    if (selectedShift?.brand === "EXPRESS") return;

    scheduledShiftBeforeExpress = selectedShift;
    scheduledLastActionBeforeExpress = lastAction;

    selectedShift = buildExpressShift();
    lastAction = lastExpressAction;
}

function restoreScheduledContextAfterExpressCancel() {

    // Si entramos a Express desde un scheduled shift,
    // restauramos el contexto original.
    if (scheduledShiftBeforeExpress) {

        selectedShift = scheduledShiftBeforeExpress;
        lastAction = scheduledLastActionBeforeExpress;

        scheduledShiftBeforeExpress = null;
        scheduledLastActionBeforeExpress = null;

        renderActions();
        return;
    }

    // Express puro: no existe scheduled shift para restaurar.
    // Simplemente reconstruimos la UI con el estado actual.
    renderActions();
}


function getScheduledShiftStartLabel(shift) {
    if (!shift) return "";

    // Preferimos fromTo porque representa la hora del mercado/shift,
    // no la hora local del teléfono.
    const fromTo = String(shift.fromTo || "").trim();

    if (fromTo) {
        // Ejemplos:
        // 6:00p/7:00p
        // 6:00 PM - 7:00 PM
        // 6:00p - 7:00p
        let start = fromTo
            .split("/")[0]
            .split(" - ")[0]
            .trim();

        start = start
            .replace(/(\d)\s*a$/i, "$1 AM")
            .replace(/(\d)\s*p$/i, "$1 PM")
            .replace(/\s*am$/i, " AM")
            .replace(/\s*pm$/i, " PM");

        return start;
    }

    // Fallback si no existe fromTo.
    const startDate = parseUtcDateTime(shift.shiftStartUTCDatetime);

    if (!startDate) return "";

    return startDate.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });
}

function showExpressBeforeScheduledShiftWarning(shift) {
    const oldModal = document.getElementById("expressScheduledWarningModal");

    if (oldModal) {
        oldModal.remove();
    }

    const shiftTime = getScheduledShiftStartLabel(shift) || "the scheduled time";

    const modalEl = document.createElement("div");
    modalEl.id = "expressScheduledWarningModal";
    modalEl.className = "modal fade";
    modalEl.tabIndex = -1;
    modalEl.setAttribute("aria-hidden", "true");

    modalEl.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content text-start">
                <div class="modal-header">
                    <h5 class="modal-title text-danger fw-bold">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        WARNING
                    </h5>
                </div>

                <div class="modal-body">
                    <p>
                        Remember that you have a scheduled shift starting at
                        <strong>${shiftTime}</strong>.
                    </p>

                    <p>
                        Use <strong>EXPRESS IN</strong> only if you will perform
                        tasks different from those assigned to your scheduled shift.
                    </p>

                    <p>
                        After completing those Express tasks, you must perform
                        <strong>EXPRESS OUT</strong> and later
                        <strong>CHECK IN</strong> for your scheduled shift.
                    </p>

                    <p class="mb-0">
                        Otherwise, please <strong>sign out</strong> and return
                        30 minutes before your scheduled shift to complete the
                        normal check-in process.
                    </p>
                </div>

                <div class="modal-footer">
                    <button
                        type="button"
                        class="btn btn-primary w-100 fw-bold"
                        id="expressScheduledWarningGotIt">
                        OK
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modalEl);

    const modal = new bootstrap.Modal(modalEl, {
        backdrop: "static",
        keyboard: false
    });

    document
        .getElementById("expressScheduledWarningGotIt")
        .addEventListener("click", function () {
            modal.hide();
        });

    modalEl.addEventListener("hidden.bs.modal", function () {
        modal.dispose();
        modalEl.remove();
    }, { once: true });

    modal.show();
}

// =====================================================
// EXPRESS PHOTO NOTICE - TIMER CONTROL
// =====================================================

let expressPhotoNoticeTimer = null;

function cancelExpressPhotoNotice() {

    if (expressPhotoNoticeTimer !== null) {
        clearTimeout(expressPhotoNoticeTimer);
        expressPhotoNoticeTimer = null;
    }

    const noticeEl = document.getElementById("expressPhotoNotice");

    if (noticeEl && typeof bootstrap !== "undefined") {
        bootstrap.Offcanvas.getInstance(noticeEl)?.hide();
    }
}

function showExpressPhotoRequirementNotice() {
    expressPhotoNoticeTimer = null;
    const photoMode = String(
        expressPhotosRequired || "NO"
    ).trim().toUpperCase();


    // =====================================================
    // NO PHOTOS
    // =====================================================

    if (photoMode === "NO") {
        return;
    }


    // =====================================================
    // VALID MODES ONLY
    // =====================================================

    if (!["OPTIONAL", "MANDATORY"].includes(photoMode)) {
        console.warn(
            "[EXPRESS PHOTO NOTICE] Invalid mode:",
            photoMode
        );

        return;
    }


    // Same minimum currently used by Express Report
    const { min: minPhotos } = getExpressReportPhotoLimits(photoMode);

    const noticeEl =
        document.getElementById("expressPhotoNotice");

    const titleEl =
        document.getElementById("expressPhotoNoticeTitle");

    const badgeEl =
        document.getElementById("expressPhotoNoticeBadge");

    const textEl =
        document.getElementById("expressPhotoNoticeText");

    const okBtn =
        document.getElementById("expressPhotoNoticeOk");


    if (!noticeEl || !titleEl || !badgeEl || !textEl || !okBtn) {
        console.warn(
            "[EXPRESS PHOTO NOTICE] UI elements not found."
        );

        return;
    }


    // Clean previous state
    noticeEl.classList.remove("is-optional");


    // =====================================================
    // MANDATORY
    // =====================================================

    if (photoMode === "MANDATORY") {

        titleEl.textContent =
            "IMPORTANT";

        badgeEl.textContent =
            "PHOTOS REQUIRED";

        textEl.innerHTML = `
            Before checking out, you will be required to upload
            <strong>at least ${minPhotos} relevant photos</strong>
            for your work-session report.
            <br><br>
            Please make sure you take photos of the work performed
            during your session.
        `;
    }


    // =====================================================
    // OPTIONAL
    // =====================================================

    else if (photoMode === "OPTIONAL") {

        noticeEl.classList.add("is-optional");

        titleEl.textContent =
            "IMPORTANT";

        badgeEl.textContent =
            "PHOTOS MAY BE REQUIRED";

        textEl.innerHTML = `
            You may be required to upload relevant photos
            for your work-session report before checking out.
            <br><br>
            Please make sure you take photos of the work performed
            during your session and keep them available in case
            they are needed.
        `;
    }


    // =====================================================
    // SHOW OFFCANVAS
    // =====================================================

    const offcanvas =
        bootstrap.Offcanvas.getOrCreateInstance(noticeEl);


    // GOT IT button
    okBtn.onclick = function () {
        offcanvas.hide();
    };


    console.log(
        "[EXPRESS PHOTO NOTICE]",
        {
            photoMode,
            minPhotos
        }
    );


    offcanvas.show();
}


function setupEarlyCheckInButton($btn, shift) {
    clearEarlyCheckInTimer();

    const $msg = $(`
        <div id="earlyCheckInMessage" class="early-checkin-message" style="display:none;"></div>
    `);

    $btn.after($msg);

    function tick() {
        const status = getEarlyCheckInStatus(shift);

        if (status.allowed) {
            $("#selected-shift-info .gl-staffing-allowed").hide();
            $btn.prop("disabled", false)
                .removeClass("early-checkin-disabled")
                .attr("aria-disabled", "false");

            $msg.hide().text("");
            clearEarlyCheckInTimer();
            return;
        }

        $btn.prop("disabled", true)
            .addClass("early-checkin-disabled")
            .attr("aria-disabled", "true");

        $msg
            .text(`Wait ${formatCountdown(status.waitSeconds)} for check in...`)
            .show();
    }

    // Disabled inicialmente, como pediste
    $btn.prop("disabled", true)
        .addClass("early-checkin-disabled")
        .attr("aria-disabled", "true");

    tick();

    earlyCheckInInterval = setInterval(tick, 1000);
}

function isCheckInTooEarly() {
    if (!selectedShift || lastAction) return false;
    return !getEarlyCheckInStatus(selectedShift).allowed;
}


let earlyCheckOutInterval = null;

function getEarlyCheckOutStatus(shift) {
    if (
        !shift ||
        shift.brand === "EXPRESS" ||
        Number(shift.applyCheckOutTimeRestriction) !== 1 ||
        Number(globalParams?.applyTimeBeforeCheckOut) !== 1
    ) {
        return { allowed: true, waitSeconds: 0 };
    }

    const minutes = Number(globalParams?.minMinutesBeforeCheckOut);
    const end = parseUtcDateTime(shift.shiftEndUTCDatetime);

    if (!Number.isInteger(minutes) || minutes < 0 || !end) {
        console.error("[Early CHECK OUT] Invalid timing configuration");
        return { allowed: false, waitSeconds: null };
    }

    const waitSeconds = Math.max(
        0,
        Math.ceil(
            (end.getTime() - minutes * 60000 - Date.now()) / 1000
        )
    );

    return {
        allowed: waitSeconds === 0,
        waitSeconds
    };
}

function clearEarlyCheckOutTimer() {
    if (earlyCheckOutInterval !== null) {
        clearInterval(earlyCheckOutInterval);
        earlyCheckOutInterval = null;
    }
}


function setupEarlyCheckOutButton(btn, shift) {
    clearEarlyCheckOutTimer();

    const $msg = $(`
        <div class="early-checkin-message"
             style="display:none;"></div>
    `);

    btn.after($msg);

    const $card = $("#selected-shift-info .gl-staffing-card");

    // Use the same card style as CHECK IN ALLOWED AT.
    const $allowed = $(`
        <div class="gl-staffing-allowed"
             id="glCheckOutAllowed"
             style="display:none;">
            <span class="gl-staffing-label">
                CHECK OUT ALLOWED AT
            </span>
            <strong id="glCheckOutAllowedTime">—</strong>
        </div>
    `);

    $card.find("#glCheckOutAllowed").remove();
    $card.append($allowed);

    const minutes = Number(globalParams?.minMinutesBeforeCheckOut);
    const end = parseUtcDateTime(shift?.shiftEndUTCDatetime);

    if (
        end &&
        !Number.isNaN(end.getTime()) &&
        Number.isInteger(minutes) &&
        minutes >= 0
    ) {
        const allowedDate = new Date(
            end.getTime() - minutes * 60000
        );

        const allowedTime = allowedDate.toLocaleTimeString("en-US", {
            timeZone: shift.shiftTimezone || undefined,
            hour: "numeric",
            minute: "2-digit",
            hour12: true
        });

        $allowed.find("#glCheckOutAllowedTime").text(allowedTime);
    }

    function tick() {
        if (!btn[0]?.isConnected || selectedShift?.pk !== shift?.pk) {
            $msg.remove();
            $allowed.remove();
            clearEarlyCheckOutTimer();
            return;
        }

        const status = getEarlyCheckOutStatus(shift);

        if (status.allowed) {
            btn.prop("disabled", false)
                .attr("aria-disabled", "false")
                .css("opacity", "");

            $msg.remove();
            $allowed.remove();
            clearEarlyCheckOutTimer();
            return;
        }

        btn.prop("disabled", true)
            .attr("aria-disabled", "true")
            .css("opacity", "0.5");

        if (status.waitSeconds === null) {
            $msg.text("CHECK OUT timing is unavailable.").show();
            $allowed.hide();
            clearEarlyCheckOutTimer();
            return;
        }

        const total = status.waitSeconds;
        const hours = Math.floor(total / 3600);
        const minutesLeft = Math.floor((total % 3600) / 60);
        const seconds = total % 60;

        const countdown =
            hours + ":" +
            String(minutesLeft).padStart(2, "0") + ":" +
            String(seconds).padStart(2, "0");

        $msg.text(`Wait ${countdown} for check out...`).show();
        $allowed.show();
    }

    tick();

    if (btn.prop("disabled") && getEarlyCheckOutStatus(shift).waitSeconds !== null) {
        earlyCheckOutInterval = setInterval(tick, 1000);
    }
}


function renderActions() {
    // Cada vez que se reconstruye la pantalla principal,
    // elimina cualquier progreso geográfico de la acción anterior.
    removeGeoProgressPanel();

    const container = $("#action-container");

    if (selectedShift?.brand === "EXPRESS") {
        container.empty().show();
        clearEarlyCheckInTimer();
        $("#break-timer").hide();
        $("#shift-timer").hide();

        renderSelectedShiftInfo();

        if (!lastAction || lastAction === "EXPRESS OUT") {
            renderActionButton("EXPRESS IN", "expressin");
        }

        if (lastAction === "EXPRESS IN") {
            if (Number(expressReportDone || 0) === 1) {
                renderActionButton("EXPRESS OUT", "expressout");
            } else {
                renderActionButton("REPORT & EXPRESS OUT", "expressout");
            }
            startShiftTimer(lastExpressStartTime);
        }

        scrollMainHomeTop();
        return;
    }

    const shift = selectedShift;

    sGeoRequiredCheckIn = parseInt(shift.applyCheckInDistanceRestriction);
    sGeoRequiredStartBreak = parseInt(shift.applyDistanceRestrictionStartBreak);
    sGeoRequiredEndBreak = parseInt(shift.applyDistanceRestrictionEndBreak);
    sGeoRequiredCheckOut = parseInt(shift.applyCheckOutDistanceRestriction);

    sPhotoRequiredCheckIn = parseInt(shift.requirePhotoCheckIn);
    sPhotoRequiredStartBreak = parseInt(shift.requirePhotoStartBreak);
    sPhotoRequiredEndBreak = parseInt(shift.requirePhotoEndBreak);
    sPhotoRequiredCheckOut = parseInt(shift.requirePhotoCheckOut);

    sMaxBreaks = parseInt(shift.maxBreaksAllowed);
    sBreaksCounter = parseInt(shift.breaksCounter);
    sTimeRestrictionCheckOut = parseInt(shift.applyCheckOutTimeRestriction);
    sTimeRestrictionStartBreak = parseInt(shift.applyStartBreakTimeRestriction);

    window.needNoBreakReasonOnCheckout = shouldAskNoBreakReasonForCheckout(shift);

    container.empty().show();
    clearEarlyCheckInTimer();
    $("#break-timer").hide();
    $("#shift-timer").hide();



    // EXPRESS permitido solo si falta 60+ min para el shift normal.
    // En ese caso NO mostramos CHECK IN para evitar confusión.

    if (!lastAction && canOfferExpressBeforeScheduledShift(shift)) {
        scheduledShiftBeforeExpress = selectedShift;
        scheduledLastActionBeforeExpress = lastAction;

        selectedShift = buildExpressShift();
        lastAction = lastExpressAction;

        renderSelectedShiftInfo();

        if (lastAction === "EXPRESS IN") {

            if (Number(expressReportDone || 0) === 1) {
                renderActionButton("EXPRESS OUT", "expressout");
            } else {
                renderActionButton("REPORT & EXPRESS OUT", "expressout");
            }

            startShiftTimer(lastExpressStartTime);

        } else {
            renderActionButton("EXPRESS IN", "expressin");

            // El warning aparece únicamente cuando se ofrece EXPRESS IN
            // existiendo un shift normal programado más adelante.
            setTimeout(() => {
                showExpressBeforeScheduledShiftWarning(
                    scheduledShiftBeforeExpress
                );
            }, 250);
        }

        scrollMainHomeTop();
        return;
    }

    renderSelectedShiftInfo();

    if (!lastAction) {
        renderActionButton("CHECK IN", "checkin");
    }

    if (lastAction === "CHECK IN") {
        if (sBreaksCounter < sMaxBreaks) {
            renderActionButton("START BREAK", "break");
        }

        if (shouldShowReportAndCheckout(shift)) {
            renderActionButton("REPORT & CHECK OUT", "report_checkout");
        } else {
            renderActionButton("CHECK OUT", "checkout");
        }

        startShiftTimer(lastShiftStartTime);
    }

    if (lastAction === "START BREAK") {
        renderActionButton("END BREAK", "break");
        startBreakTimer(lastBreakStartTime);
    }

    if (lastAction === "END BREAK") {
        if (sBreaksCounter < sMaxBreaks) {
            renderActionButton("START BREAK", "break");
        }

        if (shouldShowReportAndCheckout(shift)) {
            renderActionButton("REPORT & CHECK OUT", "report_checkout");
        } else {
            renderActionButton("CHECK OUT", "checkout");
        }

        startShiftTimer(lastShiftStartTime);
    }

    scrollMainHomeTop();
}


function renderSelectedShiftInfo() {
    const shift = selectedShift;
    //console.log(shift);

    if (shift?.brand === "EXPRESS") {
        $("#selected-shift-info").html(`
        <div class="gl-staffing-card gl-express-card">

            <div class="gl-staffing-heading">
                FAB/INSTALL/ADMIN WORK
            </div>

            <div class="gl-staffing-event">
                EXPRESS CHECK IN / OUT
            </div>

            <div class="gl-staffing-field">
                <div class="gl-staffing-label">
                    SCHEDULE
                </div>
                <div class="gl-staffing-value">
                    No scheduled shift required
                </div>
            </div>

            <div class="gl-express-requirements" id="shiftDatetime">
                <span class="gl-staffing-label">
                    VERIFICATION REQUIREMENTS
                </span>
                <strong>
                    <span class="gl-express-requirement-line">
                        <i class="bi bi-geo-alt-fill"></i>
                        Geolocation
                    </span>
                    <span class="gl-express-requirement-line">
                        <i class="bi bi-camera-fill"></i>
                        Photo
                        </span>
                </strong>
            </div>

        </div>
    `).fadeIn();
        return;
    }

    // STAFFING - Scheduled Shift Card
    const escapeShiftText = (value) =>
        String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[char]));

    const truncateShiftText = (value, max = 50) => {
        const text = String(value ?? "").trim();
        return text.length > max
            ? text.substring(0, max) + "..."
            : text;
    };

    const eventDisplay = escapeShiftText(shift.eventName);
    const marketDisplay = escapeShiftText(truncateShiftText(shift.market));
    const locationDisplay = escapeShiftText(truncateShiftText(shift.location1));

    const restrictionEnabled =
        Number(globalParams?.applyTimeBeforeCheckIn) === 1 &&
        Number(shift.allowEarlyCheckIn || 0) !== 1;

    const minutesEarly =
        Number(globalParams?.minMinutesBeforeCheckIn);

    const checkInStatus = getEarlyCheckInStatus(shift);

    const showCheckInTime =
        !lastAction &&
        restrictionEnabled &&
        Number.isFinite(minutesEarly) &&
        minutesEarly >= 0 &&
        !checkInStatus.allowed;

    const info = `
        <div class="gl-staffing-card">

            <div class="gl-staffing-heading">
                SCHEDULED SHIFT
            </div>

            <div class="gl-staffing-event">
                ${eventDisplay}
            </div>

            <div class="gl-staffing-field">
                <div class="gl-staffing-label">MARKET</div>
                <div class="gl-staffing-value">${marketDisplay}</div>
            </div>

            <div class="gl-staffing-field">
                <div class="gl-staffing-label">LOCATION</div>
                <div class="gl-staffing-value">${locationDisplay}</div>
            </div>

            <div class="gl-staffing-datetime" id="shiftDatetime">
                ${escapeShiftText(shift.shiftDate)}
                <span class="gl-staffing-separator">•</span>
                ${escapeShiftText(shift.fromTo)}
            </div>

            ${showCheckInTime ? `
                <div class="gl-staffing-allowed">
                    <span class="gl-staffing-label">
                        CHECK IN ALLOWED AT
                    </span>
                    <strong id="glCheckInAllowedTime">—</strong>
                </div>
            ` : ""}

        </div>
    `;

    $("#selected-shift-info").html(info).fadeIn();

    // El horario se obtiene del mismo origen de datos
    // que utiliza la restricción de Early Check In.
    if (showCheckInTime) {
        const startUtc = shift.shiftStartUTCDatetime;
        const startDate = startUtc
            ? new Date(String(startUtc).replace(" ", "T") + (
                /Z$|[+-]\d\d:\d\d$/.test(String(startUtc)) ? "" : "Z"
            ))
            : null;

        if (startDate && !Number.isNaN(startDate.getTime())) {
            const allowedDate = new Date(
                startDate.getTime() - minutesEarly * 60000
            );

            const allowedTime = allowedDate.toLocaleTimeString("en-US", {
                timeZone: shift.shiftTimezone,
                hour: "numeric",
                minute: "2-digit",
                hour12: true
            });

            $("#glCheckInAllowedTime").text(allowedTime);
        } else {
            $("#glCheckInAllowedTime")
                .closest(".gl-staffing-allowed")
                .hide();
        }
    }
}

function renderActionButton(label, type) {

    const shift = selectedShift;

    const btn = $("<button>")
        .addClass("mb-3 w-100 text-white fw-bold border-0 py-3")
        .text(label)
        .on("click", () => handleActionClick(label));

    if (label === "CHECK IN") {
        btn.addClass("btn-checkin");
    } else if (label === "CHECK OUT") {
        btn.addClass("btn-checkout");
    } else if (label === "START BREAK" || label === "END BREAK") {
        btn.addClass("btn-break");
        btn.removeClass("mb-3").css("margin-bottom", "0px");
        btn.html(`<i class="bi bi-clock-fill d-block mb-1"></i>${label}`);
    } else if (label === "REPORT & CHECK OUT") {
        btn.addClass("btn-report-checkout");
    }

    if (label === "EXPRESS IN") {
        btn.addClass("btn-checkin");
    } else if (label === "EXPRESS OUT" || label == "REPORT & EXPRESS OUT") {
        btn.addClass("btn-checkout");
    }

    $("#action-container").append(btn);


    if (label === "CHECK IN") {
        setupEarlyCheckInButton(btn, shift);
    }

    if (label === "CHECK OUT" || label === "REPORT & CHECK OUT") {
        setupEarlyCheckOutButton(btn, shift);
    }

}

function proceedCheckoutWithNoBreakReason(reason) {
    submitActionWithOptionalNoBreakReason("CHECK OUT", reason);
}

async function handleActionClick(actionType) {
    let lat = null;
    let lon = null;
    let geoAddress = "";
    let geoAccuracy = null;
    let geoAttempts = 0;

    let geoOverrideAccepted = false;
    let geoOverrideReason = "";
    currentGeoContext = {
        accuracyMeters: null,
        maxDistanceAllowed: null,
        overrideAccepted: 0,
        overrideReason: ""
    };


    if (actionType === "CHECK IN" && isCheckInTooEarly()) {
        return;
    }

    // EARLY CHECK OUT - Scheduled shifts only
    if (
        actionType === "CHECK OUT" ||
        actionType === "REPORT & CHECK OUT"
    ) {
        const status = getEarlyCheckOutStatus(selectedShift);

        if (!status.allowed) {
            showMessage(
                "CHECK OUT is not allowed yet. Please wait until the permitted time.",
                "warning"
            );
            return;
        }
    }

    switchToExpressContextIfNeeded(actionType);


    // Flujo especial: primero reporte, luego check-out
    if (actionType === "REPORT & CHECK OUT") {
        return openReportAndThenCheckoutForCurrentShift();
    }

    if (actionType === "REPORT & EXPRESS OUT") {
        return openExpressReportAndThenCheckout();
    }

    // EXPRESS OUT no usa el antiguo Tasks Completed.
    // Las tareas ya pertenecen exclusivamente al Express Report.
    if (actionType === "EXPRESS OUT") {
        pendingExpressTasksText = "";
    }

    // Confirmación previa solo para breaks
    if (actionType === "START BREAK" || actionType === "END BREAK") {
        const ok = await confirmBreakAction(actionType);
        if (!ok) {
            showMessage("⛔ Cancelled.", "warning");
            return;
        }
    }
    removeGeoProgressPanel();
    hideActionUI();


    // ========================================
    // ACTION PARAMETERS AND VALIDATIONS
    // ========================================

    const flag = (value) => Number(value) === 1 ? 1 : 0;

    let geoRequired = 0;
    let photoRequired = 0;
    let faceDetection = 0;
    let environmentAnalysis = 0;
    let maxDistance = 0;

    const shift = selectedShift;

    // ========================================
    // EXPRESS IN
    // ========================================

    if (actionType === "EXPRESS IN") {

        geoRequired = flag(expressParams.geoRequiredIn) * flag(promoterParams?.geoRequiredIn);
        photoRequired = flag(expressParams.photoRequiredIn) * flag(promoterParams?.photoRequiredIn);
        faceDetection = photoRequired * flag(expressParams.faceDetectionIn) * flag(promoterParams?.faceDetectionIn);
        environmentAnalysis = photoRequired * flag(expressParams.environmentAnalysisIn) * flag(promoterParams?.environmentAnalysisIn);
        maxDistance = 0;

        // ========================================
        // EXPRESS OUT
        // ========================================

    } else if (actionType === "EXPRESS OUT") {

        geoRequired = flag(expressParams.geoRequiredOut) * flag(promoterParams?.geoRequiredOut);
        photoRequired = flag(expressParams.photoRequiredOut) * flag(promoterParams?.photoRequiredOut);
        faceDetection = photoRequired * flag(expressParams.faceDetectionOut) * flag(promoterParams?.faceDetectionOut);
        environmentAnalysis = photoRequired * flag(expressParams.environmentAnalysisOut) * flag(promoterParams?.environmentAnalysisOut);
        maxDistance = 0;

        // ========================================
        // STAFFING CHECK IN
        // ========================================

    } else if (actionType === "CHECK IN") {

        // GPS: ALL THREE CONDITIONS MUST BE 1
        geoRequired = flag(globalParams.geoRequiredCheckIn) *
            flag(globalParams.applyDistanceForCheckIn) *
            flag(shift?.applyCheckInDistanceRestriction);

        photoRequired = flag(globalParams.photoRequiredCheckIn) * flag(sPhotoRequiredCheckIn);

        faceDetection = photoRequired *
            flag(globalParams.faceDetectionIn) *
            flag(shift?.faceDetectionIn);

        environmentAnalysis = photoRequired *
            flag(globalParams.environmentAnalysisIn) *
            flag(shift?.environmentAnalysisIn);

        maxDistance = parseFloat(globalParams.maxDistanceForCheckIn);

        // ========================================
        // STAFFING START BREAK
        // ========================================

    } else if (actionType === "START BREAK") {

        geoRequired = flag(globalParams.geoRequiredStartBreak) *
            flag(sGeoRequiredStartBreak);

        photoRequired = flag(globalParams.photoRequiredStartBreak) * flag(sPhotoRequiredStartBreak);
        maxDistance = parseFloat(globalParams.maxDistanceForStartBreak);

        // ========================================
        // STAFFING END BREAK
        // ========================================

    } else if (actionType === "END BREAK") {

        geoRequired = flag(globalParams.geoRequiredEndBreak) * flag(sGeoRequiredEndBreak);
        photoRequired = flag(globalParams.photoRequiredEndBreak) * flag(sPhotoRequiredEndBreak);
        maxDistance = parseFloat(globalParams.maxDistanceForEndBreak);

        // ========================================
        // STAFFING CHECK OUT
        // ========================================

    } else if (actionType === "CHECK OUT") {

        // GPS: ALL THREE CONDITIONS MUST BE 1
        geoRequired = flag(globalParams.geoRequiredCheckOut) *
            flag(globalParams.applyDistanceForCheckOut) *
            flag(shift?.applyCheckInDistanceRestriction);

        photoRequired = flag(globalParams.photoRequiredCheckOut) * flag(sPhotoRequiredCheckOut);

        faceDetection = photoRequired *
            flag(globalParams.faceDetectionOut) *
            flag(shift?.faceDetectionOut);

        environmentAnalysis = photoRequired *
            flag(globalParams.environmentAnalysisOut) *
            flag(shift?.environmentAnalysisOut);

        maxDistance = parseFloat(globalParams.maxDistanceForCheckOut);

        // PRESERVE EXISTING NO BREAK MODAL
        if (shouldAskNoBreakReasonForCheckout(shift) &&
            !bypassNoBreakModalOnce
        ) {
            openNoBreakModal(
                function (reason) {
                    pendingCheckoutActionType = "CHECK OUT";
                    proceedCheckoutWithNoBreakReason(reason);
                },
                function () {
                    showMessage("⛔ Cancelled.", "warning");
                    handleCheckoutCancelUI();
                }
            );
            return;
        }
        bypassNoBreakModalOnce = false;
    }

    // ========================================
    // GEO CONTEXT
    // ========================================
    currentGeoContext.geoRequired = geoRequired;
    currentGeoContext.maxDistanceAllowed = geoRequired === 1
        && Number.isFinite(Number(maxDistance)) ? Number(maxDistance) : null;


    // ========================================
    // DEBUG - ACTION RULES
    // ========================================
    console.log("[GPS STAFFING CHECK IN DEBUG]", {
        actionType,
        globalGeo: globalParams.geoRequiredCheckIn,
        globalDistance: globalParams.applyDistanceForCheckIn,
        shiftDistance: selectedShift?.applyCheckInDistanceRestriction,
        geoRequiredCalculated: geoRequired,
        selectedShiftPk: selectedShift?.pk
    });

    console.log("[ACTION RULES]", {
        actionType,
        geoRequired,
        photoRequired,
        faceDetection,
        environmentAnalysis,
        maxDistance: currentGeoContext.maxDistanceAllowed
    });

    // ===== GEO =====
    if (geoRequired == 1) {
        let geoFailed = false;

        try {
            console.log("[GEO] Requesting position…");
            console.log("[GEO CONFIG]", {
                timeoutMs: 30000,
                targetAccuracyMeters: 150,
                minimumAttempts: 4,
                delayBetweenAttemptsMs: 1200
            });
            const coords = await getBestCurrentPosition({
                timeoutMs: 30000,
                targetAccuracyMeters: 150,
                minimumAttempts: 4,
                delayBetweenAttemptsMs: 1200
            });

            lat = coords.latitude;
            lon = coords.longitude;
            currentLat = lat;
            currentLon = lon;
            geoAddress = coords.address || "";
            geoAccuracy = coords.accuracy;
            geoAttempts = Number(
                coords.totalAttempts || 4
            );
            currentGeoContext.accuracyMeters =
                Number.isFinite(Number(geoAccuracy))
                    ? Number(geoAccuracy)
                    : null;
            console.log("[GEO] Best position selected", {
                lat,
                lon,
                accuracyMeters: geoAccuracy,
                bestReadingAttempt: coords.attempt,
                totalAttempts: geoAttempts
            });


        } catch (err) {
            const geoError = classifyGeolocationError(err);
            console.warn("[GEO] Failed", {
                type: geoError.type,
                userMessage: geoError.userMessage,
                technicalMessage: geoError.technicalMessage,
                originalError: err
            });
            lat = 0;
            lon = 0;
            geoFailed = true;
            /*
             * El usuario negó expresamente el permiso.
             * No existe una ubicación confiable alternativa.
             */
            if (geoError.type === "PERMISSION_DENIED") {
                updateGeoProgressPanel({
                    attempt: null,
                    latitude: null,
                    longitude: null,
                    accuracy: null,
                    address: "User denied Location Services permission.",
                    status: "error"
                });
                return;
            }
            /*
            * GPS is required for this action. If no valid position was obtained, 
            * do not continue to camera or submit coordinates 0,0.
            */
            updateGeoProgressPanel({
                attempt: null,
                latitude: null,
                longitude: null,
                accuracy: null,
                address: geoError.userMessage,
                status: "error"
            });
            console.error("[GEO] Action blocked: no valid GPS position.", {
                actionType,
                errorType: geoError.type,
                technicalMessage: geoError.technicalMessage
            });
            showMessage(
                `⚠️ ${geoError.userMessage} Location is required to continue.`,
                "warning"
            );
            return;
        }

        // Validar distancia únicamente cuando:
        // 1. No es Express.
        // 2. La geolocalización sí funcionó.
        // 3. Existen coordenadas target.
        // 4. La distancia máxima está configurada.
        if (
            actionType !== "EXPRESS IN" &&
            actionType !== "EXPRESS OUT" &&
            !geoFailed &&
            isValidCoordinatePair(
                selectedShift?.shiftLat,
                selectedShift?.shiftLon
            ) &&
            Number.isFinite(Number(maxDistance)) &&
            Number(maxDistance) > 0
        ) {
            distance = calculateDistance(
                Number(lat),
                Number(lon),
                Number(selectedShift.shiftLat),
                Number(selectedShift.shiftLon)
            );

            console.log("[GEO] Distance validation", {
                workerLat: Number(lat),
                workerLon: Number(lon),
                targetLat: Number(selectedShift.shiftLat),
                targetLon: Number(selectedShift.shiftLon),
                distanceMiles: distance,
                maxDistanceMiles: Number(maxDistance)
            });

            if (!Number.isFinite(distance)) {
                console.error("[GEO] Could not calculate distance.");
                showMessage(
                    "⛔ Location obtained, but distance could not be calculated. Please try again.",
                    "warning"
                );
                removeGeoProgressPanel();
                showActionUI();
                return;
            } else if (distance > Number(maxDistance)) {
                const continueOutsideRange =
                    await confirmGeoDistanceOverride({
                        distanceMiles: distance,
                        maxDistanceMiles: Number(maxDistance),
                        accuracyMeters: geoAccuracy,
                        attempts: geoAttempts,
                        estimatedAddress:
                            geoAddress ||
                            await getAddressFromMapbox(lat, lon),
                        targetLocation:
                            `${selectedShift?.market || ""} - ` +
                            `${selectedShift?.location1 || ""}`
                    });

                if (!continueOutsideRange) {
                    showMessage(
                        "⛔ Cancelled due to Location exception.",
                        "warning"
                    );

                    removeGeoProgressPanel();
                    showActionUI();
                    return;
                }

                geoOverrideAccepted = true;
                geoOverrideReason = "OUTSIDE_ALLOWED_DISTANCE";
                currentGeoContext.overrideAccepted = 1;
                currentGeoContext.overrideReason =
                    "OUTSIDE_ALLOWED_DISTANCE";

                showMessage(
                    "⚠️ Continuing with a location exception. Your manager will be notified.",
                    "warning"
                );

                /*
                 * No hacemos return.
                 * Continúa a foto y envío.
                 */
            }

        } else {
            // STAFFING: GPS obligatorio implica distancia calculada.
            // EXPRESS no utiliza restricción de distancia.
            if (
                geoRequired == 1 &&
                actionType !== "EXPRESS IN" &&
                actionType !== "EXPRESS OUT"
            ) {
                console.error("[GEO] STAFFING blocked: distance not calculated.", {
                    actionType,
                    geoFailed,
                    lat,
                    lon,
                    targetLat: selectedShift?.shiftLat,
                    targetLon: selectedShift?.shiftLon,
                    maxDistance
                });

                showMessage(
                    "⛔ Unable to verify your distance from the assigned location. Please try again.",
                    "warning"
                );

                removeGeoProgressPanel();
                showActionUI();
                return;
            }

            // EXPRESS or actions with GPS restriction disabled.
            distance = 0;

            console.log("[GEO] Distance validation skipped", {
                actionType,
                geoFailed,
                targetLat: selectedShift?.shiftLat,
                targetLon: selectedShift?.shiftLon,
                maxDistance
            });
        }

    } else {
        distance = 0;
    }


    // ===== FINAL GPS SAFETY CHECK =====
    // GPS required: never proceed without valid coordinates.
    // GPS optional: preserve the existing 0,0 behavior.
    const hasValidActionCoordinates = isValidCoordinatePair(lat, lon);
    if (geoRequired == 1 && !hasValidActionCoordinates) {
        console.error("[GEO] Action blocked by final GPS safety check.", {
            actionType,
            geoRequired,
            lat,
            lon
        });
        showMessage(
            "⛔ A valid GPS location is required to continue. Please try again.",
            "warning"
        );
        removeGeoProgressPanel();
        showActionUI();
        return;
    }

    if (!hasValidActionCoordinates) {
        lat = 0;
        lon = 0;
    }

    // ===== FOTO / ENVÍO =====
    if (photoRequired == 1) {
        try {
            window.currentGeoActionType = actionType;
            const rawBase64 = await interactivePhotoCapture({
                faceDetection,
                environmentAnalysis
            });

            const photoNow = new Date();
            const timestamp = `${formatDisplayDateFromDate(photoNow)}, ${formatDisplayTimeFromDate(photoNow)}`;

            const address = !hasValidActionCoordinates
                ? (geoRequired == 1 ? "Geolocation Failed" : "Location not required for this action")
                : (
                    geoAddress ||
                    await getAddressFromMapbox(lat, lon)
                );

            drawOverlayAndSend(
                rawBase64,
                actionType,
                promoterName,
                promoterCode,
                `Shift ID: ${selectedShift.pk}`,
                timestamp,
                lat,
                lon,
                address,
                selectedShift.lastCheckInId,
                selectedShift.lastCheckInLocalTime,
                selectedShift.promoterEmail,
                selectedShift.promoterPhone
            );
        } catch (err) {
            // usuario canceló
            if (err && (err.type === "USER_CANCEL" || err === "User canceled")) {
                removeGeoProgressPanel();
                showMessage("⛔ Operation cancelled.", "warning");

                if (actionType === "EXPRESS IN" || actionType === "EXPRESS OUT") {
                    validateCode();
                    return;
                }

                if (actionType === "CHECK OUT") {
                    handleCheckoutCancelUI();
                } else {
                    showActionUI();
                }
                return;
            }

            else {
                console.error("[PHOTO] Camera capture failed:", err);
                removeGeoProgressPanel();
                showMessage("📷 Camera error. Photo was not captured. Please try again.", "danger");
                if (actionType === "EXPRESS IN" || actionType === "EXPRESS OUT") {
                    validateCode();
                } else if (actionType === "CHECK OUT") {
                    handleCheckoutCancelUI();
                } else {
                    showActionUI();
                }
                return;
            }

        }

    } else {
        try {
            const addressText = !hasValidActionCoordinates
                ? (geoRequired == 1 ? "Geolocation Failed" : "Location not required for this action")
                : (
                    geoAddress ||
                    await getAddressFromMapbox(lat, lon)
                );
            await overlayAndSubmitFromImageUrl(
                "img/PhotoNotRequired.png",
                actionType,
                lat,
                lon,
                addressText
            );
        } catch (e) {
            console.error("[NO-PHOTO] Fallback error:", e);
            showMessage("❌ Could not use 'No photo required' image.", "danger");
            showActionUI();
        }
    }
}

function openExpressTasksModal() {
    return new Promise((resolve) => {
        const existing = document.getElementById("expressTasksModal");
        if (existing) existing.remove();

        const modal = document.createElement("div");
        modal.id = "expressTasksModal";
        modal.className = "express-tasks-modal";

        modal.innerHTML = `
            <div class="express-tasks-backdrop"></div>
            <div class="express-tasks-dialog">
                <div class="express-tasks-header">
                    <h4>TASKS PERFORMED</h4>
                    <p>Please describe the tasks completed before Express Out.</p>
                </div>

                <div class="express-tasks-body">
                    <textarea id="expressTasksText"
                        class="express-tasks-textarea"
                        rows="7"
                        maxlength="2000"
                        placeholder="Write the tasks completed here..."></textarea>

                    <div id="expressTasksError" class="express-tasks-error" style="display:none;">
                        Please enter the tasks completed.
                    </div>
                </div>

                <div class="express-tasks-footer">
                    <button type="button" id="expressTasksCancel" class="btn btn-danger">Cancel</button>
                    <button type="button" id="expressTasksClear" class="btn btn-primary">Clear Text</button>
                    <button type="button" id="expressTasksAccept" class="btn btn-success">Accept</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const textEl = document.getElementById("expressTasksText");
        const errEl = document.getElementById("expressTasksError");

        const close = (result) => {
            modal.remove();
            resolve(result);
        };

        document.getElementById("expressTasksCancel").onclick = () => close(null);

        document.getElementById("expressTasksClear").onclick = () => {
            textEl.value = "";
            errEl.style.display = "none";
            textEl.focus();
        };

        document.getElementById("expressTasksAccept").onclick = () => {
            const val = String(textEl.value || "").trim();

            if (!val) {
                errEl.style.display = "block";
                textEl.focus();
                return;
            }

            close(val);
        };

        textEl.addEventListener("input", () => {
            if (String(textEl.value || "").trim()) {
                errEl.style.display = "none";
            }
        });

        modal.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                close(null);
            }
        });

        setTimeout(() => textEl.focus(), 0);
    });
}

function confirmBreakAction(actionType) {
    return new Promise((resolve) => {
        // Previene modales duplicados
        const existing = document.getElementById("confirm-modal");
        if (existing) existing.remove();

        const modal = document.createElement("div");
        modal.id = "confirm-modal";
        Object.assign(modal.style, {
            position: "fixed",
            top: 0, left: 0, width: "100vw", height: "100vh",
            backgroundColor: "rgba(0,0,0,0.85)",
            display: "flex", flexDirection: "column",
            justifyContent: "center", alignItems: "center",
            padding: "20px", zIndex: 9999
        });

        const box = document.createElement("div");
        Object.assign(box.style, {
            backgroundColor: "#fff",
            borderRadius: "12px",
            padding: "20px",
            width: "90%",
            maxWidth: "420px",
            textAlign: "center",
            boxShadow: "0 8px 30px rgba(0,0,0,0.35)"
        });

        const title = document.createElement("h5");
        title.textContent = actionType;

        Object.assign(title.style, {
            fontFamily: "'Oswald', sans-serif",
            fontWeight: "700",
            fontSize: "25px",
            color: "#010F3C",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            marginBottom: "12px",
            textAlign: "center"
        });

        const msg = document.createElement("p");
        msg.textContent = `Confirm ${actionType}?`;

        Object.assign(msg.style, {
            fontFamily: "'Oswald', sans-serif",
            fontWeight: "300",
            fontSize: "19px",
            color: "#595959",
            marginBottom: "22px",
            textAlign: "center"
        });

        const btnRow = document.createElement("div");
        Object.assign(btnRow.style, {
            display: "flex",
            gap: "10px",
            justifyContent: "center",
            flexWrap: "nowrap"
        });

        const btnCancel = document.createElement("button");
        btnCancel.type = "button";
        btnCancel.textContent = "CANCEL";

        const btnConfirm = document.createElement("button");
        btnConfirm.type = "button";
        btnConfirm.textContent = "CONFIRM";

        [btnCancel, btnConfirm].forEach(btn => {
            Object.assign(btn.style, {
                flex: "1 1 0",
                minWidth: "0",
                minHeight: "46px",
                padding: "10px 8px",
                borderRadius: "8px",
                border: "none",
                color: "#FFFFFF",
                fontFamily: "'Oswald', sans-serif",
                fontWeight: "700",
                fontSize: "17px",
                letterSpacing: "0.5px",
                cursor: "pointer"
            });
        });

        btnCancel.style.backgroundColor = "#FF1B59";
        btnConfirm.style.backgroundColor = "#010F3C";

        btnCancel.onclick = () => {
            document.body.removeChild(modal);
            resolve(false);
        };
        btnConfirm.onclick = () => {
            document.body.removeChild(modal);
            resolve(true);
        };

        btnRow.appendChild(btnCancel);
        btnRow.appendChild(btnConfirm);
        box.appendChild(title);
        box.appendChild(msg);
        box.appendChild(btnRow);
        modal.appendChild(box);
        document.body.appendChild(modal);
    });
}


async function initHumanFaceDetector() {

    if (humanFaceDetector) {
        return humanFaceDetector;
    }

    if (humanFaceDetectorPromise) {
        return humanFaceDetectorPromise;
    }

    humanFaceDetectorPromise = (async () => {

        console.log("[FACE] Initializing MediaPipe Face Detector...");

        if (!window.__mediapipeVisionPromise) {
            throw new Error(
                "MediaPipe Vision library was not loaded."
            );
        }

        const {
            FaceDetector,
            FilesetResolver
        } = await window.__mediapipeVisionPromise;

        const vision = await FilesetResolver.forVisionTasks(
            MEDIAPIPE_WASM_PATH
        );

        humanFaceDetector =
            await FaceDetector.createFromOptions(
                vision,
                {
                    baseOptions: {
                        modelAssetPath:
                            MEDIAPIPE_FACE_MODEL_PATH
                    },

                    runningMode: "IMAGE",

                    minDetectionConfidence:
                        HUMAN_FACE_MIN_CONFIDENCE,

                    minSuppressionThreshold: 0.3
                }
            );

        console.log(
            "[FACE] MediaPipe Face Detector ready."
        );

        return humanFaceDetector;

    })();

    try {

        return await humanFaceDetectorPromise;

    } catch (err) {

        humanFaceDetectorPromise = null;
        humanFaceDetector = null;

        console.error(
            "[FACE] Initialization failed:",
            err
        );

        throw err;
    }
}

async function detectHumanFace(imageSource) {

    const detector =
        await initHumanFaceDetector();

    console.log("[FACE] Running detection...");

    const result =
        detector.detect(imageSource);

    const detections =
        Array.isArray(result?.detections)
            ? result.detections
            : [];

    if (detections.length === 0) {

        console.log(
            "[FACE] No human face detected."
        );

        return {
            detected: false,
            count: 0,
            confidence: 0,
            boundingBox: null
        };
    }

    /*
     * Tomamos la detección con mayor confidence.
     */
    let bestDetection = null;
    let bestConfidence = 0;

    detections.forEach(detection => {

        const confidence =
            Number(
                detection?.categories?.[0]?.score || 0
            );

        if (
            bestDetection === null ||
            confidence > bestConfidence
        ) {
            bestDetection = detection;
            bestConfidence = confidence;
        }
    });

    const box =
        bestDetection?.boundingBox || null;

    const response = {

        detected: true,

        count: detections.length,

        confidence:
            Number(bestConfidence || 0),

        boundingBox: box
            ? {
                x: Number(box.originX || 0),
                y: Number(box.originY || 0),
                width: Number(box.width || 0),
                height: Number(box.height || 0)
            }
            : null
    };

    console.log(
        "[FACE] Detection result:",
        response
    );

    return response;
}


function setFaceDetectionStatus(
    container,
    type,
    message
) {

    if (!container) return;

    container.className = "alert mb-0 text-center";

    if (type === "checking") {
        container.classList.add("alert-info");
    }

    else if (type === "success") {
        container.classList.add("alert-success");
    }

    else if (type === "error") {
        container.classList.add("alert-danger");
    }

    else if (type === "warning") {
        container.classList.add("alert-warning");
    }

    if (type === "checking") {

        container.innerHTML = `
        <div class="d-flex flex-column align-items-center justify-content-center gap-1">
            <div
               class="spinner-border spinner-border-sm" style="color: #FF4F2A;"
                role="status"
                aria-label="Verification in progress"
            ></div>
            <div>${message}</div>
        </div>
    `;

    } else if (type === "success") {

        container.innerHTML = `
        <div class="d-flex flex-column align-items-center justify-content-center gap-1">
            <i
                class="bi bi-person-check-fill text-success"
                style="font-size: 22px; line-height: 1.2;"
                aria-hidden="true"
            ></i>
            <div>${message}</div>
        </div>
    `;

    } else if (type === "error") {

        container.innerHTML = `
            <div class="d-flex flex-column align-items-center justify-content-center gap-1">
                <i
                    class="bi bi-person-x-fill"
                    style="font-size: 26px; line-height: 1.2; color: #FF4F2A;"
                    aria-hidden="true"
                ></i>
                <div>${message}</div>
            </div>
        `;

    } else {

        container.textContent = message;

    }

    container.style.display = "block";
}

async function analyzeCheckinScene(
    photoBase64
) {

    if (!photoBase64) {
        throw new Error(
            "Missing photoBase64 for scene analysis."
        );
    }

    console.log(
        "[VEHICLE] Sending photo for scene analysis..."
    );


    const response =
        await fetch(
            API_BASE +
            "analyzeCheckinPhoto4000.php",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded; charset=UTF-8"
                },

                body:
                    new URLSearchParams({
                        photoBase64:
                            photoBase64,

                        promoterCode:
                            promoterCode || "",

                        actionType:
                            window.currentGeoActionType ||
                            ""
                    })
            }
        );


    let data = null;

    try {

        data =
            await response.json();

    } catch (err) {

        console.error(
            "[VEHICLE] Invalid JSON response:",
            err
        );

        throw new Error(
            "Invalid response from vehicle verification."
        );
    }


    if (
        !response.ok ||
        !data ||
        data.success !== true
    ) {

        console.error(
            "[VEHICLE] Analysis failed:",
            data
        );

        throw new Error(
            data?.message ||
            "Vehicle verification failed."
        );
    }


    const result =
        String(
            data.result ||
            "UNCERTAIN"
        )
            .trim()
            .toUpperCase();


    const normalized = {

        result:
            [
                "INSIDE",
                "NOT_INSIDE",
                "UNCERTAIN"
            ].includes(result)
                ? result
                : "UNCERTAIN",

        insideVehicle:
            result === "INSIDE",

        confidence: Number(data.confidence || 0),
        vehicleType: String(data.vehicleType || ""),
        reason: String(
            data.reason || ""
        ),

        evidence:
            Array.isArray(
                data.evidence
            )
                ? data.evidence
                : []
    };


    console.log(
        "[VEHICLE] Analysis result:",
        normalized
    );


    return normalized;
}

function interactivePhotoCapture(options = {}) {

    const requireFace = Number(options.faceDetection) === 1;
    const requireEnvironment = Number(options.environmentAnalysis) === 1;

    return new Promise((resolve, reject) => {

        // =====================================================
        // MODAL
        // =====================================================

        const modal = document.createElement("div");

        modal.id = "camera-modal";

        Object.assign(modal.style, {
            position: "fixed",
            inset: "0",
            background: "rgba(0,0,0,0.9)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            alignItems: "center",
            padding: "12px 20px 20px",
            boxSizing: "border-box",
            overflowY: "auto",
            overscrollBehavior: "contain"
        });


        // =====================================================
        // VIDEO PREVIEW
        // =====================================================
        const video = document.createElement("video");
        video.autoplay = true;
        video.playsInline = true;
        video.setAttribute("playsinline", "");
        video.setAttribute("webkit-playsinline", "");
        video.muted = true;
        Object.assign(video.style, {
            width: "100%",
            maxWidth: "500px",
            borderRadius: "10px",
            background: "black",
            objectFit: "cover"
        });
        // ==========================================
        // GO LOCAL - CAMERA LOGO
        // ==========================================
        const cameraLogo = document.createElement("img");
        cameraLogo.src = "img/GoLocalLogoWhite148.png";
        cameraLogo.alt = "Go Local Promotions";
        cameraLogo.className = "gl-camera-logo";
        modal.appendChild(cameraLogo);
        modal.appendChild(video);
        // =====================================================
        // SNAPSHOT
        // =====================================================
        const snapshot = document.createElement("img");
        Object.assign(snapshot.style, {
            display: "none",
            width: "100%",
            maxWidth: "500px",
            maxHeight: "48dvh",
            borderRadius: "10px",
            background: "black",
            objectFit: "contain"
        });
        modal.appendChild(snapshot);
        // =====================================================
        // FACE DETECTION STATUS
        // =====================================================

        const faceStatus = document.createElement("div");
        faceStatus.id = "humanFaceDetectionStatus";
        Object.assign(faceStatus.style, {
            display: "none",
            width: "100%",
            maxWidth: "500px",
            fontSize: "17px",
            lineHeight: "1.5",
            fontWeight: "500",
            padding: "14px 16px"
        });

        modal.appendChild(faceStatus);
        // =====================================================
        // BUTTON ROW
        // =====================================================
        const row = document.createElement("div");
        row.className = "gl-camera-actions";
        Object.assign(row.style, {
            marginTop: "10px",
            display: "flex",
            gap: "10px",
            flexWrap: "nowrap",
            justifyContent: "center"
        });
        const btnTake =
            Object.assign(
                document.createElement("button"),
                {
                    className: "btn btn-primary gl-camera-take",
                    innerText: "📸 Take Photo"
                }
            );
        const btnRetry =
            Object.assign(
                document.createElement("button"),
                {
                    className: "btn btn-warning gl-camera-retry",
                    innerText: "🔁 Retry"
                }
            );
        btnRetry.style.display = "none";

        const btnSubmit =
            Object.assign(
                document.createElement("button"),
                {
                    className: "btn btn-submit-glp",
                    innerHTML: '<i class="bi bi-check2"></i> Submit'
                }
            );
        /*
         * IMPORTANTE:
         * Submit empieza oculto.
         * Solamente aparecerá cuando
         * MediaPipe detecte una cara.
         */
        btnSubmit.style.display = "none";


        const btnCancel =
            Object.assign(
                document.createElement("button"),
                {
                    className: "btn btn-danger gl-camera-cancel",
                    innerText: "❌ Cancel"
                }
            );
        row.append(
            btnTake,
            btnRetry,
            btnSubmit,
            btnCancel
        );
        modal.appendChild(row);
        document.body.appendChild(modal);

        ////////////////////////////////////////////////////////////////////////////////
        ////////////////////////////////////////////////////////////////////////////////


        // =====================================================
        // GO LOCAL - CAMERA RESPONSIVE VIEWPORT FIX
        // Logo + Photo + Status + ALL buttons visible
        // =====================================================

        const cameraLayoutStyle = document.createElement("style");

        cameraLayoutStyle.textContent = `
        #camera-modal {
        height: 100dvh !important;
        max-height: 100dvh !important;
        box-sizing: border-box !important;
        padding: 8px 12px 14px !important;
        overflow: hidden !important;

        display: grid !important;
        grid-template-columns: minmax(0, 1fr);
        grid-template-rows: auto minmax(0, 1fr) auto auto;
        justify-items: center !important;
        align-items: stretch !important;
        align-content: stretch !important;
        gap: 8px !important;
        }

        #camera-modal .gl-camera-logo {
        grid-row: 1;
        width: auto !important;
        max-width: 180px !important;
        height: 40px !important;
        max-height: 40px !important;
        object-fit: contain !important;
        margin: 0 auto !important;
        }

        #camera-modal > video,
        #camera-modal > img:not(.gl-camera-logo) {
        grid-column: 1;
        grid-row: 2;
        width: 100% !important;
        max-width: 500px !important;
        height: 100% !important;
        min-height: 0 !important;
        max-height: 100% !important;
        object-fit: contain !important;
        background: #000 !important;
        border-radius: 8px !important;
        margin: 0 auto !important;
        }

        /* Verification message: more compact */
        #camera-modal #humanFaceDetectionStatus {
        grid-column: 1;
        grid-row: 3;
        width: 100% !important;
        max-width: 500px !important;
        max-height: none !important;
        overflow-y: hidden !important;
        margin: 0 auto !important;
        padding: 5px 8px !important;
         font-family: 'Oswald', Arial, sans-serif !important;
        font-size: 13px !important;
        line-height: 1.15 !important;
        box-sizing: border-box !important;
        }

        #camera-modal #humanFaceDetectionStatus > * {
        margin: 0 !important;
        padding: 0 !important;
        line-height: 1.15 !important;
        }

        #camera-modal .gl-camera-actions {
        grid-column: 1;
        grid-row: 4;
        width: 100% !important;
        max-width: 500px !important;

        display: flex !important;
        flex-direction: column !important;
        flex-wrap: nowrap !important;
        gap: 10px !important;

        margin: 0 auto !important;
        padding: 10px !important;
        box-sizing: border-box !important;
        }

        #camera-modal .gl-camera-actions .btn {
        width: 100% !important;
        height: 52px !important;
        min-height: 52px !important;
        padding: 8px 12px !important;
        margin: 0 !important;
        flex-shrink: 0 !important;

        font-family: 'Oswald', Arial, sans-serif !important;
        font-weight: 700 !important;
        font-size: 1.18rem !important;
        line-height: 1.2 !important;
        border-radius: 9px !important;
        }

        /* Compact phones: preserve comfortable buttons */
        @media (max-height: 700px) {
        #camera-modal {
            gap: 5px !important;
            padding: 5px 10px 8px !important;
        }

        #camera-modal .gl-camera-logo {
            height: 32px !important;
            max-height: 32px !important;
        }

        #camera-modal #humanFaceDetectionStatus {
            max-height: none !important;
            overflow: hidden !important;
            padding: 5px 8px !important;
        }

        #camera-modal .gl-camera-actions {
            gap: 8px !important;
            padding: 7px !important;
        }

        #camera-modal .gl-camera-actions .btn {
            height: 46px !important;
            min-height: 46px !important;
        }
        }
        `;

        modal.appendChild(cameraLayoutStyle);

        ////////////////////////////////////////////////////////////////////////////////
        ////////////////////////////////////////////////////////////////////////////////

        // =====================================================
        // STATE
        // =====================================================
        let stream = null;
        let currentSnapshotBase64 = "";
        let faceValidationPassed = false;
        // =====================================================
        // START CAMERA
        // =====================================================
        // =====================================================
        // START CAMERA
        // =====================================================
        const startStream = async () => {
            btnTake.disabled = true;
            btnTake.style.display = "none";
            if (stream) {
                stream
                    .getTracks()
                    .forEach(
                        track => track.stop()
                    );
                stream = null;
            }
            stream =
                await navigator.mediaDevices
                    .getUserMedia({
                        video: {
                            facingMode: "user",
                            width: { ideal: 1280 },
                            height: { ideal: 960 },
                            aspectRatio: { ideal: 4 / 3 },
                            resizeMode: "none"
                        },
                        audio: false
                    });
            video.srcObject = stream;
            console.log("[CAMERA] Actual track settings:", stream.getVideoTracks()[0].getSettings());

            try {
                await video.play();
            } catch (err) {
                console.error("[CAMERA] Video playback failed:", err);
                throw err;
            }
            if (!video.videoWidth || !video.videoHeight) {
                throw new Error("Camera video is not ready.");
            }
            btnTake.disabled = false;
            btnTake.style.display = "inline-block";
        };
        startStream()
            .catch(err => {
                console.error("[CAMERA] Initial startup failed:", err);
                btnTake.disabled = true;
                btnTake.style.display = "none";
                btnSubmit.style.display = "none";
                const permissionDenied =
                    err.name === "NotAllowedError" ||
                    err.name === "PermissionDeniedError";
                btnRetry.style.display = permissionDenied
                    ? "none"
                    : "inline-block";
                faceStatus.style.display = "block";
                setFaceDetectionStatus(
                    faceStatus,
                    "error",
                    err.name === "NotAllowedError" ||
                        err.name === "PermissionDeniedError"
                        ? "Camera access blocked. Please enable Camera permission for this website in your browser or device settings."
                        : "Camera could not start. Please check your camera and try again."
                );
            });
        // =====================================================
        // TAKE PHOTO
        // =====================================================
        btnTake.onclick = async () => {
            btnTake.disabled = true;
            faceValidationPassed = false;
            currentSnapshotBase64 = "";
            btnSubmit.style.display = "none";
            // -------------------------------------------------
            // CAPTURE CANVAS
            // -------------------------------------------------
            const canvas = document.createElement("canvas");

            const sourceWidth = video.videoWidth;
            const sourceHeight = video.videoHeight;

            if (!sourceWidth || !sourceHeight) {
                btnTake.disabled = false;
                console.error("[CAMERA] Invalid video dimensions");
                return;
            }

            canvas.width = sourceWidth;
            canvas.height = sourceHeight;

            const ctx = canvas.getContext("2d");

            ctx.drawImage(
                video,
                0, 0, sourceWidth, sourceHeight
            );

            // -------------------------------------------------
            // SNAPSHOT
            // -------------------------------------------------
            const snapshotDataUrl =
                canvas.toDataURL(
                    "image/jpeg",
                    0.92
                );
            snapshot.src = snapshotDataUrl;

            currentSnapshotBase64 = snapshotDataUrl.split(",")[1];
            snapshot.style.display = "block";
            video.style.display = "none";
            // -------------------------------------------------
            // STOP CAMERA
            // -------------------------------------------------
            if (stream) {
                stream
                    .getTracks()
                    .forEach(
                        track => track.stop()
                    );
                stream = null;
            }
            btnTake.style.display = "none";
            btnRetry.style.display = "inline-block";
            btnRetry.disabled = true;

            // =================================================
            // PARAMETERIZED PHOTO VALIDATION
            // =================================================
            try {

                const validations = [];

                // ---------------------------------------------
                // HUMAN FACE DETECTION
                // ---------------------------------------------
                if (requireFace) {

                    setFaceDetectionStatus(
                        faceStatus,
                        "checking",
                        "Detecting a human face..."
                    );

                    const faceResult = await detectHumanFace(canvas);

                    console.log("[FACE] Validation:", faceResult);

                    if (!faceResult.detected) {

                        faceValidationPassed = false;
                        btnSubmit.style.display = "none";

                        setFaceDetectionStatus(
                            faceStatus,
                            "error",
                            "No human face detected. Please take another photo."
                        );

                        return;
                    }

                    validations.push("Human face detected");
                }
                // ---------------------------------------------
                // ENVIRONMENT ANALYSIS
                // ---------------------------------------------
                if (requireEnvironment) {

                    setFaceDetectionStatus(
                        faceStatus,
                        "checking",
                        "Checking photo environment..."
                    );

                    let sceneResult;

                    try {
                        sceneResult = await analyzeCheckinScene(
                            currentSnapshotBase64
                        );
                    } catch (sceneError) {

                        console.error(
                            "[ENVIRONMENT] Verification error:",
                            sceneError
                        );

                        sceneResult = null;
                    }

                    // Vehicle detected: reject photo.
                    if (sceneResult?.result === "INSIDE") {

                        faceValidationPassed = false;
                        btnSubmit.style.display = "none";

                        setFaceDetectionStatus(
                            faceStatus,
                            "error",
                            "Photo cannot be accepted. " +
                            "Please step outside the vehicle and retry."
                        );

                        return;
                    }

                    // Environment verified: accept this validation.
                    if (sceneResult?.result === "NOT_INSIDE") {

                        validations.push("Environment verified");

                    } else {

                        // Unknown, inconclusive, empty or technical error:
                        // reject instead of allowing Submit.
                        faceValidationPassed = false;
                        btnSubmit.style.display = "none";

                        setFaceDetectionStatus(
                            faceStatus,
                            "error",
                            "Photo environment could not be verified. " +
                            "Please take another photo."
                        );

                        return;
                    }
                }

                // ---------------------------------------------
                // ALL REQUIRED VALIDATIONS DONE
                // ---------------------------------------------
                faceValidationPassed = true;
                btnSubmit.style.display = "inline-block";

                if (validations.length === 0) {

                    faceStatus.style.display = "none";

                } else {

                    setFaceDetectionStatus(
                        faceStatus,
                        "success",
                        validations.join(" · ")
                    );
                }

                console.log("[PHOTO VALIDATION]", {
                    actionType: window.currentGeoActionType,
                    requireFace,
                    requireEnvironment,
                    accepted: true,
                    validations
                });

            } catch (err) {

                console.error("[PHOTO VALIDATION] Error:", err);

                faceValidationPassed = false;
                btnSubmit.style.display = "none";

                setFaceDetectionStatus(
                    faceStatus,
                    "error",
                    "Photo verification could not be completed. " +
                    "Please take another photo."
                );
            }

            finally {
                btnRetry.disabled = false;
                btnTake.disabled = false;
            }
        };


        // =====================================================
        // RETRY
        // =====================================================

        btnRetry.onclick = () => {

            faceValidationPassed = false;
            currentSnapshotBase64 = "";
            faceStatus.style.display = "none";
            faceStatus.innerHTML = "";
            snapshot.src = "";
            snapshot.style.display = "none";
            video.style.display = "block";
            btnTake.style.display = "none";
            btnTake.disabled = true;
            btnRetry.style.display = "none";
            btnSubmit.style.display = "none";

            startStream()
                .then(() => {
                    btnTake.disabled = false;
                    btnTake.style.display = "inline-block";
                    btnRetry.style.display = "none";
                })
                .catch(err => {
                    console.error("[CAMERA] Retry failed:", err);

                    btnTake.disabled = true;
                    btnTake.style.display = "none";
                    btnSubmit.style.display = "none";

                    const permissionDenied =
                        err.name === "NotAllowedError" ||
                        err.name === "PermissionDeniedError";

                    btnRetry.style.display = permissionDenied
                        ? "none"
                        : "inline-block";

                    faceStatus.style.display = "block";

                    setFaceDetectionStatus(
                        faceStatus,
                        "error",
                        permissionDenied
                            ? "Camera access blocked. Please enable Camera permission for this website in your browser or device settings."
                            : "Camera unavailable. Check your camera and tap Retry."
                    );
                });
        };


        // =====================================================
        // SUBMIT
        // =====================================================

        btnSubmit.onclick = () => {

            /*
             * Doble protección.
             *
             * Aunque alguien intente disparar
             * programáticamente el botón,
             * necesitamos validación aprobada.
             */

            if (!faceValidationPassed) {
                console.warn("[FACE] Submit blocked: " + "face validation did not pass.");
                return;
            }

            try {

                if (!currentSnapshotBase64) {
                    throw new Error("Photo snapshot is empty.");
                }

                if (stream) {
                    stream
                        .getTracks()
                        .forEach(
                            track => track.stop()
                        );
                    stream = null;
                }

                if (document.body.contains(modal)) {

                    document.body.removeChild(modal);
                }

                resolve(currentSnapshotBase64);

            } catch (e) {

                if (stream) {

                    stream
                        .getTracks()
                        .forEach(
                            track => track.stop()
                        );

                    stream = null;
                }


                if (document.body.contains(modal)) {
                    document.body.removeChild(modal);
                }


                reject(e);
            }
        };


        // =====================================================
        // CANCEL
        // =====================================================

        btnCancel.onclick = () => {

            if (stream) {

                stream
                    .getTracks()
                    .forEach(
                        track => track.stop()
                    );

                stream = null;
            }


            if (
                document.body.contains(modal)
            ) {

                document.body.removeChild(modal);
            }

            reject({ type: "USER_CANCEL" });

        };
    });
}

async function openReportAndThenCheckoutForCurrentShift() {
    const s = selectedShift;
    if (!s) {
        showMessage("No active shift loaded.", "warning");
        return;
    }

    currentReportCtx = {
        idx: null,
        id: `SHIFT-${s.pk ?? s.id ?? ''}`,
        pk: (s.pk || s.id || '').toString().trim(),
        eventName: (s.eventName || '').trim(),
        market: (s.market || '').toString().trim(),
        location1: (s.location1 || '').toString().trim(),
        date: (s.shiftDate || '').toString().trim(),
        time: (s.fromTo || s.shiftTime || '').toString().trim(),
        shiftDateForReport: (s.order0 || s.shiftDate || '').toString().trim(),
        longIdShiftForReport: (s.idShift || '').toString().trim()
    };

    reportSchema = await (typeof rcLoadDraftSchema === "function"
        ? rcLoadDraftSchema()
        : rcLoadDefaultSchema());

    reportAnswers = rcPrefillFromReport ? (rcPrefillFromReport(s) || {}) : {};
    reportFiles = {};

    rcBuildUI();

    rcAfterSubmitAction = { type: 'REPORT_CHECKOUT' };

    appCloseAllViewsHard({ showMain: false });
    $("#report-capture-view").show();

    rcScrollStepTop();

    const rcv = document.getElementById("report-capture-view");
    if (rcv && rcv.style.display !== "none") {
        document.dispatchEvent(new CustomEvent("report-view:ready"));
    }
}

async function openExpressReportAndThenCheckout() {

    const s = selectedShift;

    if (!s) {
        showMessage("No active Express session loaded.", "warning");
        return;
    }

    // =====================================================
    // EXPRESS REPORT CONTEXT
    // =====================================================

    currentReportCtx = {
        idx: null,

        id: `EXPRESS-${lastExpressSessionId || s.pk || ""}`,

        pk: String(lastExpressInPk || ""),

        eventName: "EXPRESS",

        market: String(s.market || "EXPRESS"),

        location1: String(
            s.location1 || "Express Check In"
        ),

        date: new Date().toISOString().slice(0, 10),

        reportType: "EXPRESS",

        expressSessionId: String(
            lastExpressSessionId ||
            s.expressSessionId ||
            ""
        ),

        expressParentId: String(
            s.expressParentId ||
            lastExpressInId ||
            ""
        )
    };


    // =====================================================
    // LOAD EXPRESS REPORT SCHEMA
    // =====================================================

    reportSchema = await rcLoadExpressReportSchema({
        requirePhotos: Number(expressPhotosRequired || 0) === 1
    });


    // =====================================================
    // CLEAN PREVIOUS REPORT DATA
    // =====================================================

    reportAnswers = {};
    reportFiles = {};

    rcCurrentStep = 0;


    // =====================================================
    // BUILD REPORT UI
    // =====================================================

    rcBuildUI();


    // After successfully saving the report,
    // EXPRESS OUT will be executed.
    rcAfterSubmitAction = {
        type: "EXPRESS_REPORT_CHECKOUT"
    };


    // =====================================================
    // SHOW REPORT VIEW
    // =====================================================

    appCloseAllViewsHard({
        showMain: false
    });

    $("#report-capture-view").show();

    rcScrollStepTop();

    document.dispatchEvent(
        new CustomEvent("report-view:ready")
    );
}

function startBreakTimer(lastBreakStartTime = null) {
    $("#break-timer").show();
    clearInterval(breakTimerInterval);

    let seconds = 0;

    if (lastBreakStartTime) {
        // Convierte el string de fecha a objeto Date
        const start = new Date(lastBreakStartTime);
        const now = new Date();
        seconds = Math.floor((now - start) / 1000); // diferencia en segundos
    }

    breakTimerInterval = setInterval(() => {
        seconds++;
        const hh = String(Math.floor(seconds / 3600)).padStart(2, "0");
        const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
        const ss = String(seconds % 60).padStart(2, "0");
        $("#break-chrono").text(`${hh}:${mm}:${ss}`);
    }, 1000);
}

function startShiftTimer(lastShiftStartTime = null) {
    $("#shift-timer").show();
    clearInterval(shiftTimerInterval);

    let seconds = 0;

    if (lastShiftStartTime) {
        // Convierte el string de fecha a objeto Date
        const start = new Date(lastShiftStartTime);
        const now = new Date();
        seconds = Math.floor((now - start) / 1000); // diferencia en segundos
    }

    shiftTimerInterval = setInterval(() => {
        seconds++;
        const hh = String(Math.floor(seconds / 3600)).padStart(2, "0");
        const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
        const ss = String(seconds % 60).padStart(2, "0");
        $("#shift-chrono").text(`${hh}:${mm}:${ss}`);
    }, 1000);
}


function showMessage(text, type = "info") {
    const el = document.getElementById("responseMessage");
    if (!el) return;

    // Go Local 4.0 - Notification type normalization
    if (["warning", "cancelled", "error"].includes(type)) {
        type = "danger";
    }

    const geoPanel = document.getElementById("geoProgressPanel");
    const actionContainer = document.getElementById("action-container");

    /*
     * Durante una validación geográfica, el mensaje aparece
     * inmediatamente debajo del panel de ubicación.
     *
     * Fuera del flujo geográfico, vuelve a su posición normal,
     * debajo del contenedor de acciones.
     */
    // LOGIN: conservar el mensaje dentro del panel de acceso.
    // NO modificar la ubicación de los mensajes después del login.
    const loginContainer = document.getElementById("code-container");

    const isLoginVisible =
        loginContainer &&
        window.getComputedStyle(loginContainer).display !== "none" &&
        !document.body.classList.contains("gl-authenticated");

    if (isLoginVisible) {
        const loginBtn = document.getElementById("loginBtn");

        if (loginBtn) {
            loginBtn.insertAdjacentElement("afterend", el);
        } else {
            loginContainer.appendChild(el);
        }
    } else if (geoPanel) {
        geoPanel.insertAdjacentElement("afterend", el);
    } else if (actionContainer) {
        actionContainer.insertAdjacentElement("afterend", el);
    }

    el.innerHTML = `
        <div class="alert alert-${type}" role="alert">
            ${text}
        </div>
    `;

    el.style.display = "block";

    clearTimeout(window.__msgTO);

    if (type === "info" && text.includes("Sending...")) {
        return;
    }

    window.__msgTO = setTimeout(() => {
        el.innerHTML = "";
        el.style.display = "none";
    }, 4000);
}


// === Reimbursements: status banners (File + Submit) =====================
// En Reimb View NO usamos #responseMessage (ese vive en #main-view).
// Usamos 2 banners:
//  1) #reimbFileStatusBanner   -> feedback inmediato al cargar/leer el archivo
//  2) #reimbSubmitStatusBanner -> feedback del envío del reimbursement

let __reimbFileStatusTimer = null;
let __reimbSubmitStatusTimer = null;

function _ensureReimbBanner(which) {
    // which: 'file' | 'submit'
    const id = (which === 'file') ? 'reimbFileStatusBanner' : 'reimbSubmitStatusBanner';
    let $host = $('#' + id);
    if ($host.length) return $host;

    // Fallback (por compatibilidad si el HTML no trae los divs)
    if (which === 'file') {
        const $grp = $('#grp_reimbReceipt');
        if ($grp.length) {
            $grp.find('.rc-help').last().after(`<div id="${id}" class="alert reimb-banner py-2 mt-2 mb-0" style="display:none;"></div>`);
        } else {
            $('#reimbForm').prepend(`<div id="${id}" class="alert reimb-banner py-2 mb-2" style="display:none;"></div>`);
        }
    } else {
        const $footer = $('#reimbForm').find('#reimbSubmit').closest('.rc-footer');
        if ($footer.length) {
            $footer.before(`<div id="${id}" class="alert reimb-banner py-2 mb-2" style="display:none;"></div>`);
        } else {
            $('#reimbForm').append(`<div id="${id}" class="alert reimb-banner py-2 mb-2" style="display:none;"></div>`);
        }
    }

    return $('#' + id);
}

function _setReimbBanner(which, msg, tone = "muted", { autoHideMs = 5000, scroll = true } = {}) {
    // tone: 'muted' | 'info' | 'warn' | 'err' | 'ok'
    const $host = _ensureReimbBanner(which);
    if (!$host.length) return;

    const timerKey = (which === 'file') ? '__reimbFileStatusTimer' : '__reimbSubmitStatusTimer';

    // limpia timer previo del banner específico
    if (which === 'file' && __reimbFileStatusTimer) { clearTimeout(__reimbFileStatusTimer); __reimbFileStatusTimer = null; }
    if (which === 'submit' && __reimbSubmitStatusTimer) { clearTimeout(__reimbSubmitStatusTimer); __reimbSubmitStatusTimer = null; }

    if (!msg) {
        $host.hide().removeClass("alert-success alert-danger alert-warning alert-info").text("");
        return;
    }

    // clases bootstrap
    $host.removeClass("alert-success alert-danger alert-warning alert-info");
    if (tone === "ok") $host.addClass("alert-success");
    else if (tone === "err") $host.addClass("alert-danger");
    else if (tone === "warn") $host.addClass("alert-warning");
    else $host.addClass("alert-info");

    const messages = Array.isArray(msg) ? msg : String(msg).split(/\r?\n/);

    $host
        .html(buildUploadStatusLines($host.attr("id"), messages))
        .show();

    // hace visible el banner dentro del scroll container (reimb-wrap)
    if (scroll) {
        try { $host[0].scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch (e) { }
    }

    // auto-hide (por UX consistente)
    const to = setTimeout(() => {
        const $b = $('#' + $host.attr('id'));
        if (!$b.length) return;
        $b.fadeOut(200, function () {
            $(this).removeClass("alert-success alert-danger alert-warning alert-info").text("");
        });
    }, autoHideMs);

    if (which === 'file') __reimbFileStatusTimer = to;
    else __reimbSubmitStatusTimer = to;
}

// API pública
function setReimbFileStatus(msg, tone = "muted", opts) {
    _setReimbBanner('file', msg, tone, opts);
}
function setReimbSubmitStatus(msg, tone = "muted", opts) {
    _setReimbBanner('submit', msg, tone, opts);
}

// Backward-compat: lo existente que llama setReimbStatus ahora irá al banner de SUBMIT
function setReimbStatus(msg, tone = "muted", opts) {
    setReimbSubmitStatus(msg, tone, opts);
}
// ======================================================================



function ensureGeoProgressPanel() {
    let panel = document.getElementById("geoProgressPanel");

    if (panel) return panel;

    panel = document.createElement("div");
    panel.id = "geoProgressPanel";
    panel.className = "alert alert-info text-start";
    panel.setAttribute("role", "status");
    panel.setAttribute("aria-live", "polite");

    panel.style.marginBottom = "16px";

    const selectedShiftInfo = document.getElementById("selected-shift-info");

    if (selectedShiftInfo) {
        selectedShiftInfo.insertAdjacentElement("afterend", panel);
    } else {
        document.getElementById("action-container")?.prepend(panel);
    }

    return panel;
}

function updateGeoProgressPanel({
    attempt,
    totalAttempts = 4,
    successfulSamples = null,
    latitude,
    longitude,
    accuracy,
    address = "",
    status = "searching"
}) {
    const panel = ensureGeoProgressPanel();

    /*
     * ============================================================
     * ERROR
     * ============================================================
     */
    if (status === "error") {
        panel.className = "alert alert-warning text-start";

        panel.innerHTML = `
            <div class="fw-bold mb-2" style="color:#FF4F2A;">
            <i class="bi bi-exclamation-triangle-fill me-1"></i>
            Location could not be verified
            </div>

            <div class="mb-3">
                ${escapeGeoHtml(
            address ||
            "Location Services permission was denied."
        )}
            </div>

            <div class="small mb-3">
                Location permission must be enabled before performing
                this action.
            </div>

          <button type="button" id="geoPermissionDeniedOk"
            class="btn w-100 fw-bold"
            style="background-color:#FF4F2A; border-color:#FF4F2A; color:#FFFFFF;">OK
            </button>
        `;

        document
            .getElementById("geoPermissionDeniedOk")
            ?.addEventListener("click", function () {
                removeGeoProgressPanel();
            });

        return;
    }

    const accuracyMeters = Number(accuracy);

    const accuracyText = Number.isFinite(accuracyMeters)
        ? `${Math.round(accuracyMeters * 3.28084)} ft`
        : "Waiting…";

    /*
     * ============================================================
     * SEARCHING
     * ============================================================
     */
    if (status === "searching") {
        panel.className = "alert alert-info text-start";

        const completed = Math.max(
            0,
            Math.min(
                Number(attempt || 0),
                Number(totalAttempts || 4)
            )
        );

        const target = Math.max(
            1,
            Number(totalAttempts || 4)
        );

        const progressPercent = Math.round(
            (completed / target) * 100
        );

        const activeMeasurement = Math.min(
            completed + 1,
            target
        );

        panel.innerHTML = `
            <div class="d-flex align-items-center mb-3">
                <div
                    class="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true">
                </div>

                <div class="fw-bold">
                    Verifying your location…
                </div>
            </div>

            <div class="mb-2">
                <strong>Measurement:</strong>
                ${activeMeasurement} of ${target}
            </div>

            <div
                class="progress mb-2"
                style="height:10px;"
                role="progressbar"
                aria-valuenow="${progressPercent}"
                aria-valuemin="0"
                aria-valuemax="100">

                <div
                    class="
                        progress-bar
                        progress-bar-striped
                        progress-bar-animated
                    "
                    style="width:${progressPercent}%;">
                </div>
            </div>

            <div class="small">
                ${completed > 0
                ? `
                            <strong>Best accuracy:</strong>
                            ${accuracyText}
                        `
                : `
                            Waiting for the first GPS measurement…
                        `
            }
            </div>

            <div class="small mt-2 text-muted">
                Please keep this screen open while the location
                is being verified.
            </div>
        `;

        return;
    }

    /*
     * ============================================================
     * SUCCESS / LIMITED
     * ============================================================
     */
    /*
         <div>
            <strong>Best measurement:</strong>
            #${Number(attempt || 0)}
        </div>

        <div>
            <strong>Measurements performed:</strong>
            ${Number(totalAttempts || 0)}
        </div>

        ${successfulSamples !== null
            ? `
                    <div>
                        <strong>Valid measurements:</strong>
                        ${Number(successfulSamples || 0)}
                    </div>
                `
            : ""
        }

        <div>
            <strong>Coordinates:</strong>
            ${latText}, ${lonText}
        </div>

        */
    const latText = Number.isFinite(Number(latitude))
        ? Number(latitude).toFixed(7)
        : "Not available";

    const lonText = Number.isFinite(Number(longitude))
        ? Number(longitude).toFixed(7)
        : "Not available";

    let heading = "✅ Location verified";
    let alertClass = "alert-success";

    if (status === "limited") {
        heading = "⚠️ Best available location";
        alertClass = "alert-warning";
    }

    panel.className = `alert ${alertClass} text-start`;

    panel.innerHTML = `
        <div class="fw-bold mb-2">
            ${heading}
        </div>

        <div>
            <strong>Accuracy:</strong>
            ${accuracyText}
        </div>

        <div class="mt-1">
            <strong>Estimated user location:</strong>
            ${escapeGeoHtml(
        address || "Address not found"
    )}
        </div>
    `;
}


function updateGeoProgressAddress(address) {
    const addressEl = document.getElementById("geoProgressAddress");

    if (addressEl) {
        addressEl.textContent = address || "Address not found";
    }
}

function removeGeoProgressPanel(delayMs = 0) {
    const remove = () => {
        const panel = document.getElementById("geoProgressPanel");
        const responseMessage = document.getElementById("responseMessage");
        const actionContainer = document.getElementById("action-container");

        panel?.remove();

        // Devuelve el banner general a su posición normal:
        // debajo de los botones de acción.
        if (responseMessage && actionContainer) {
            actionContainer.insertAdjacentElement(
                "afterend",
                responseMessage
            );
        }
    };

    if (delayMs > 0) {
        setTimeout(remove, delayMs);
    } else {
        remove();
    }
}

async function getBestCurrentPosition({
    timeoutMs = 30000,
    targetAccuracyMeters = 150,
    minimumAttempts = 4,
    delayBetweenAttemptsMs = 1200
} = {}) {
    if (!navigator.geolocation) {
        throw {
            code: "GEO_NOT_SUPPORTED",
            message: "Geolocation is not supported."
        };
    }

    const totalRequiredAttempts = Math.max(
        1,
        Number(minimumAttempts) || 4
    );

    const startedAt = Date.now();

    let bestCoords = null;
    let successfulSamples = 0;
    let lastError = null;

    updateGeoProgressPanel({
        attempt: 0,
        totalAttempts: totalRequiredAttempts,
        latitude: null,
        longitude: null,
        accuracy: null,
        address: "",
        status: "searching"
    });

    // GPS INITIALIZATION — MEASUREMENT #1
    const initialRemainingMs = timeoutMs - (Date.now() - startedAt);

    if (initialRemainingMs <= 0) {
        throw {
            code: "GEO_TIMEOUT",
            message: "GPS initialization timed out."
        };
    }

    const initial = await initializeGpsPosition(
        Math.min(initialRemainingMs, 12000)
    );

    bestCoords = {
        ...initial,
        attempt: 1,
        address: ""
    };

    successfulSamples = 1;
    let measurementsPerformed = 1;

    console.log("[GEO] Measurement #1 (initialization)", {
        latitude: initial.latitude,
        longitude: initial.longitude,
        accuracy: initial.accuracy
    });

    updateGeoProgressPanel({
        attempt: 1,
        totalAttempts: totalRequiredAttempts,
        latitude: null,
        longitude: null,
        accuracy: bestCoords.accuracy,
        address: "",
        status: "searching"
    });

    // MEASUREMENTS #2 THROUGH #4
    for (
        let attemptNumber = 2;
        attemptNumber <= totalRequiredAttempts;
        attemptNumber++
    ) {
        const remainingMs = timeoutMs - (Date.now() - startedAt);

        if (remainingMs <= 0) {
            console.warn("[GEO] Global acquisition timeout reached.");
            break;
        }

        const pauseMs = Math.min(
            delayBetweenAttemptsMs,
            remainingMs
        );

        if (pauseMs > 0) {
            await waitGeoDelay(pauseMs);
        }

        const sampleRemainingMs = timeoutMs - (Date.now() - startedAt);

        if (sampleRemainingMs <= 0) {
            break;
        }

        measurementsPerformed = attemptNumber;

        try {
            const position = await getGeoPositionSample(
                Math.min(sampleRemainingMs, 9000)
            );

            const coords = position.coords;

            const latitude = Number(coords.latitude);
            const longitude = Number(coords.longitude);
            const accuracy = Number(coords.accuracy);

            if (
                !Number.isFinite(latitude) ||
                !Number.isFinite(longitude) ||
                latitude < -90 ||
                latitude > 90 ||
                longitude < -180 ||
                longitude > 180 ||
                (latitude === 0 && longitude === 0) ||
                !Number.isFinite(accuracy) ||
                accuracy < 0
            ) {
                console.warn(
                    `[GEO] Invalid sample #${attemptNumber}:`,
                    coords
                );
            } else {
                successfulSamples++;

                const currentCoords = {
                    latitude,
                    longitude,
                    accuracy,
                    altitude: coords.altitude,
                    altitudeAccuracy: coords.altitudeAccuracy,
                    heading: coords.heading,
                    speed: coords.speed,
                    timestamp: position.timestamp,
                    attempt: attemptNumber,
                    address: ""
                };

                const isNewBest =
                    accuracy < bestCoords.accuracy;

                if (isNewBest) {
                    bestCoords = currentCoords;
                }

                console.log(
                    `[GEO] Measurement #${attemptNumber}`,
                    {
                        latitude,
                        longitude,
                        accuracy,
                        isNewBest,
                        successfulSamples
                    }
                );
            }

        } catch (error) {
            lastError = error;

            console.warn(
                `[GEO] Measurement #${attemptNumber} failed:`,
                error
            );

            if (Number(error?.code) === 1) {
                console.warn(
                    "[GEO] Permission denied during additional measurement. " +
                    "Stopping GPS acquisition and preserving the previous valid position."
                );

                break;
            }

            // Keep the best previous GPS position.

            // Keep the best previous GPS position.
        }

        updateGeoProgressPanel({
            attempt: attemptNumber,
            totalAttempts: totalRequiredAttempts,
            latitude: null,
            longitude: null,
            accuracy: bestCoords.accuracy,
            address: "",
            status: "searching"
        });
    }

    if (!bestCoords) {
        throw (
            lastError || {
                code: "NO_POSITION",
                message: "No geographic position was obtained."
            }
        );
    }

    bestCoords.totalAttempts = totalRequiredAttempts;
    bestCoords.successfulSamples = successfulSamples;

    /*
     * Una sola consulta a Mapbox para la mejor medición.
     */
    try {
        bestCoords.address = await getAddressFromMapbox(
            bestCoords.latitude,
            bestCoords.longitude
        );
    } catch (addressError) {
        console.warn(
            "[GEO] Final reverse geocoding failed:",
            addressError
        );

        bestCoords.address = "Address not found";
    }

    const finalStatus =
        bestCoords.accuracy <= targetAccuracyMeters
            ? "success"
            : "limited";

    updateGeoProgressPanel({
        attempt: bestCoords.attempt,
        totalAttempts: totalRequiredAttempts,
        successfulSamples,
        latitude: bestCoords.latitude,
        longitude: bestCoords.longitude,
        accuracy: bestCoords.accuracy,
        address: bestCoords.address,
        status: finalStatus
    });

    console.log("[GEO] Acquisition completed", {
        bestReadingAttempt: bestCoords.attempt,
        measurementsPerformed: measurementsPerformed,
        successfulSamples,
        accuracyMeters: bestCoords.accuracy,
        accuracyFeet: Math.round(
            bestCoords.accuracy * 3.28084
        ),
        latitude: bestCoords.latitude,
        longitude: bestCoords.longitude,
        address: bestCoords.address,
        status: finalStatus
    });

    return bestCoords;
}

// ============================================================
// GPS INITIALIZATION — BETA 4.0
// Obtiene la primera ubicación válida antes de iniciar
// las mediciones de precisión o los cálculos de distancia.
// ============================================================

async function initializeGpsPosition(timeoutMs = 12000) {

    if (!navigator.geolocation) {
        throw {
            code: "GEO_NOT_SUPPORTED",
            message: "Geolocation is not supported by this browser."
        };
    }

    console.log("[GPS INIT] Waiting for first valid position...");

    const position = await getGeoPositionSample(timeoutMs);

    const latitude = Number(position?.coords?.latitude);
    const longitude = Number(position?.coords?.longitude);
    const accuracy = Number(position?.coords?.accuracy);

    const validCoordinates =
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180 &&
        !(latitude === 0 && longitude === 0);

    if (!validCoordinates) {
        throw {
            code: "GEO_INVALID_POSITION",
            message: "GPS returned invalid coordinates."
        };
    }

    if (!Number.isFinite(accuracy) || accuracy < 0) {
        throw {
            code: "GEO_INVALID_ACCURACY",
            message: "GPS returned an invalid accuracy value."
        };
    }

    console.log("[GPS INIT] First valid position acquired", {
        latitude,
        longitude,
        accuracyMeters: accuracy
    });

    return {
        latitude,
        longitude,
        accuracy,
        timestamp: position.timestamp,
        altitude: position.coords.altitude,
        altitudeAccuracy: position.coords.altitudeAccuracy,
        heading: position.coords.heading,
        speed: position.coords.speed
    };
}


function getGeoPositionSample(timeoutMs = 9000) {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
            position => resolve(position),

            error => reject(
                error || {
                    code: "UNKNOWN",
                    message: "Unknown geolocation error."
                }
            ),

            {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: timeoutMs
            }
        );
    });
}

function waitGeoDelay(delayMs) {
    return new Promise(resolve => {
        setTimeout(resolve, delayMs);
    });
}

function classifyGeolocationError(error) {
    const code = Number(error?.code);
    const rawMessage = String(error?.message || "").trim();

    if (code === 1) {
        return {
            type: "PERMISSION_DENIED",
            userMessage: "User denied Location Services permission.",
            technicalMessage: rawMessage || "Geolocation permission denied."
        };
    }

    if (code === 2) {
        return {
            type: "POSITION_UNAVAILABLE",
            userMessage: "Location is temporarily unavailable.",
            technicalMessage: rawMessage || "Position unavailable."
        };
    }

    if (
        code === 3 ||
        error?.code === "TIMEOUT"
    ) {
        return {
            type: "TIMEOUT",
            userMessage: "Location verification timed out.",
            technicalMessage: rawMessage || "Geolocation timeout."
        };
    }

    if (error?.code === "GEO_NOT_SUPPORTED") {
        return {
            type: "NOT_SUPPORTED",
            userMessage: "Location Services are not supported on this device.",
            technicalMessage: rawMessage || "Geolocation not supported."
        };
    }

    return {
        type: "UNKNOWN",
        userMessage: "Location could not be verified.",
        technicalMessage: rawMessage || "Unknown geolocation error."
    };
}


function escapeGeoHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function calculateDistance(lat1, lon1, lat2, lon2) {
    const earthRadiusKm = 6371.0088;

    const latitude1 = Number(lat1);
    const longitude1 = Number(lon1);
    const latitude2 = Number(lat2);
    const longitude2 = Number(lon2);

    if (
        !isValidCoordinatePair(latitude1, longitude1) ||
        !isValidCoordinatePair(latitude2, longitude2)
    ) {
        return NaN;
    }

    const dLat = toRad(latitude2 - latitude1);
    const dLon = toRad(longitude2 - longitude1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(latitude1)) *
        Math.cos(toRad(latitude2)) *
        Math.sin(dLon / 2) ** 2;

    const centralAngle = 2 * Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
    );

    const distanceKm = earthRadiusKm * centralAngle;
    const distanceMiles = distanceKm / 1.609344;

    return distanceMiles;
}

function isValidCoordinatePair(lat, lon) {
    const latitude = Number(lat);
    const longitude = Number(lon);

    return (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180 &&
        !(latitude === 0 && longitude === 0)
    );
}

function toRad(value) {
    return (value * Math.PI) / 180;
}

function confirmGeoDistanceOverride({
    distanceMiles,
    maxDistanceMiles,
    accuracyMeters,
    attempts,
    estimatedAddress,
    targetLocation
}) {
    return new Promise(resolve => {
        const existing =
            document.getElementById("geoDistanceOverrideModal");

        existing?.remove();

        const accuracyFeet = Number.isFinite(Number(accuracyMeters))
            ? Math.round(Number(accuracyMeters) * 3.28084)
            : null;

        const attemptsText =
            Number.isFinite(Number(attempts)) &&
                Number(attempts) > 0
                ? Number(attempts)
                : 0;

        const modal = document.createElement("div");
        modal.id = "geoDistanceOverrideModal";
        modal.className = "modal fade";
        modal.tabIndex = -1;


        modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content text-start">

            <div class="modal-header">
                <h5 class="modal-title text-danger fw-bold">
                    <i class="bi bi-geo-alt-fill me-2"></i>
                    LOCATION OUT OF RANGE
                </h5>
            </div>

            <div class="modal-body">

                ${targetLocation
                ? `
                    <div class="mb-2">
                        <strong>Assigned location:</strong><br>
                        ${escapeGeoHtml(targetLocation)}
                    </div>
                    `
                : ""
            }

                <div class="mb-2">
                    <strong>Estimated user location:</strong><br>
                    ${escapeGeoHtml(estimatedAddress || "Address unavailable")}
                </div>

                ${accuracyFeet !== null
                ? `
                    <div class="mb-2">
                        <strong>Location accuracy:</strong><br>
                        ${accuracyFeet} ft
                    </div>
                    `
                : ""
            }

                <div class="mb-2">
                    <strong>Distance to assigned location:</strong><br>
                    ${Number(distanceMiles).toFixed(2)} mi
                </div>

                <div class="mb-3">
                    <strong>Maximum allowed:</strong><br>
                    ${Number(maxDistanceMiles).toFixed(2)} mi
                </div>

                <div class="alert alert-warning mb-0">
                    <div class="mb-2"><strong>Warning</strong>
                    </div>
                    <div>
                    You may continue. The location details and photo fingerprint will be saved for verification.
                    </div>
                    </div>
                </div>

                <div class="modal-footer d-flex gap-2">
                    <button type="button" class="btn btn-danger flex-fill" id="geoOverrideNo">Cancel
                    </button>
                    <button type="button" class="btn btn-success flex-fill" id="geoOverrideYes">Continue
                    </button>
                </div>
            </div>
        </div>
        `;


        document.body.appendChild(modal);

        const instance = new bootstrap.Modal(modal, {
            backdrop: "static",
            keyboard: false
        });

        let answer = false;

        document
            .getElementById("geoOverrideNo")
            .addEventListener("click", () => {
                answer = false;
                instance.hide();
            });

        document
            .getElementById("geoOverrideYes")
            .addEventListener("click", () => {
                answer = true;
                instance.hide();
            });

        modal.addEventListener(
            "hidden.bs.modal",
            () => {
                instance.dispose();
                modal.remove();
                resolve(answer);
            },
            { once: true }
        );

        instance.show();
    });
}


function getAddressFromMapbox(lat, lon) {

    return new Promise((resolve, reject) => {
      
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?access_token=${mapBoxToken}`;

        fetch(url)
            .then(res => res.json())
            .then(data => {
                const address = data.features[0]?.place_name || "Unknown address";
                resolve(address);
            })
            .catch(err => {
                console.error("Error fetching address:", err);
                resolve("Address not found");
            });
    });

}

async function loadImageAsBase64(url) {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result;               // "data:image/png;base64,...."
            resolve(dataUrl.split(",")[1]);              // solo la parte base64
        };
        reader.readAsDataURL(blob);
    });
}

async function overlayAndSubmitFromImageUrl(imageUrl, actionType, lat, lon, addressText) {
    // normaliza lat/lon por si vienen null
    const _lat = (lat === null || lat === undefined || isNaN(Number(lat))) ? 0 : Number(lat);
    const _lon = (lon === null || lon === undefined || isNaN(Number(lon))) ? 0 : Number(lon);
    const base64 = await loadImageAsBase64(imageUrl);

    const photoNow = new Date();
    const timestamp = `${formatDisplayDateFromDate(photoNow)}, ${formatDisplayTimeFromDate(photoNow)}`;

    const address = (_lat === 0 && _lon === 0)
        ? (addressText || (
            Number(currentGeoContext.geoRequired) === 1
                ? "Geolocation Failed"
                : "Location not required for this action"
        ))
        : (addressText || "");
    drawOverlayAndSend(
        base64,
        actionType,
        promoterName,
        promoterCode,
        `Shift ID: ${selectedShift.pk}`,
        timestamp,
        _lat,
        _lon,
        address,
        selectedShift.lastCheckInId,
        selectedShift.lastCheckInLocalTime,
        selectedShift.promoterEmail,
        selectedShift.promoterPhone
    );
}

async function drawOverlayAndSend(
    photoBase64, actionType, workerName, workerCode,
    description, timestamp, lat, lon, address,
    lastCheckInId, lastCheckInLocalTime, workerEmail, workerPhone
) {
    try {
        const loadImage = (src) => new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = src;
        });

        const img = await loadImage(
            'data:image/jpeg;base64,' + photoBase64
        );

        if (document.fonts && document.fonts.load) {
            await Promise.all([
                document.fonts.load('700 24px Oswald'),
                document.fonts.load('300 18px Oswald')
            ]);
        }

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const W = canvas.width;
        const H = canvas.height;

        const scale = Math.max(0.65, Math.min(W / 720, 1.8));
        const px = n => Math.round(n * scale);

        const pad = px(22);
        const innerWidth = W - pad * 2;
        const rightX = W - pad;

        const ORANGE = '#FF4F2A';

        const setFont = (weight, size) => {
            ctx.font = `${weight} ${px(size)}px Oswald, Arial, sans-serif`;
        };


        // ==================================================
        // TEXTOS
        // ==================================================

        const safeName = String(workerName || 'WORKER').toUpperCase();
        const safeAction = String(actionType || '').toUpperCase();
        const safeDate = timestamp;
        console.log("[PHOTO TIMESTAMP DEBUG]", {
            actionType,
            originalTimestamp: timestamp,
            formattedTimestamp: safeDate,
            deviceTime: new Date().toString(),
            deviceTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });
        const safeAddress = String(
            address || 'Location not available'
        );

        // ==================================================
        // AJUSTE DE TEXTO PARA ALINEACIÓN DERECHA
        // ==================================================

        const wrapText = (text, maxWidth, maxLines = 3) => {
            const words = String(text || '').trim().split(/\s+/);
            const lines = [];
            let line = '';

            for (const word of words) {
                const test = line ? `${line} ${word}` : word;

                if (ctx.measureText(test).width <= maxWidth) {
                    line = test;
                } else {
                    if (line) lines.push(line);
                    line = word;
                }
            }

            if (line) lines.push(line);

            if (lines.length > maxLines) {
                const remaining = lines.slice(maxLines - 1).join(' ');
                lines.length = maxLines;

                let last = remaining;

                while (
                    last.length > 1 &&
                    ctx.measureText(last + '…').width > maxWidth
                ) {
                    last = last.slice(0, -1);
                }

                lines[maxLines - 1] = last + '…';
            }

            return lines;
        };

        setFont(300, 19);

        const addressLines = wrapText(
            safeAddress,
            innerWidth,
            3
        );

        // ==================================================
        // LOGO ORIGINAL - MÁS GRANDE
        // ==================================================

        let logo = null;
        let logoWidth = 0;
        let logoHeight = 0;

        try {
            logo = await loadImage('img/logo.png');

            // Antes: 115px.
            // Ahora: 210px, respetando proporciones.
            logoWidth = Math.min(
                px(240),
                innerWidth * 0.62
            );

            logoHeight =
                logoWidth * logo.height / logo.width;

        } catch (logoError) {
            console.warn(
                '[PHOTO OVERLAY] Logo unavailable:',
                logoError
            );
        }

        // ==================================================
        // CALCULAR ALTURA DEL CONTENIDO
        // SIN PANEL, SIN FONDO, SIN FRANJAS
        // ==================================================

        const nameHeight = px(37);
        const actionHeight = px(32);
        const dateHeight = px(30);
        const addressLineHeight = px(24);

        const logoGap = logo ? px(5) : 0;
        const bottomPad = px(18);

        const totalHeight =
            logoHeight +
            logoGap +
            nameHeight +
            actionHeight +
            dateHeight +
            addressLines.length * addressLineHeight +
            bottomPad;

        // Posicionar todo desde abajo.
        let y = Math.max(
            pad,
            H - totalHeight
        );

        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';

        // Contraste para textos sobre cualquier fotografía
        ctx.shadowColor = 'rgba(1, 15, 60, 0.95)';
        ctx.shadowBlur = px(4);
        ctx.shadowOffsetX = px(1);
        ctx.shadowOffsetY = px(1);


        // ==================================================
        // DIBUJAR LOGO ALINEADO A LA DERECHA
        // ==================================================

        if (logo) {
            ctx.drawImage(
                logo,
                W + px(5) - logoWidth,
                y,
                logoWidth,
                logoHeight
            );

            y += logoHeight + logoGap;
        }

        // ==================================================
        // NOMBRE
        // ==================================================

        setFont(700, 25);
        ctx.fillStyle = ORANGE;

        ctx.fillText(
            safeName,
            rightX,
            y,
            innerWidth
        );

        y += nameHeight;

        // ==================================================
        // ACCIÓN
        // ==================================================

        setFont(700, 23);
        ctx.fillStyle = ORANGE;

        ctx.fillText(
            safeAction,
            rightX,
            y,
            innerWidth
        );

        y += actionHeight;

        // ==================================================
        // FECHA Y HORA - SIN SEGUNDOS
        // ==================================================

        setFont(300, 19);
        ctx.fillStyle = ORANGE;

        ctx.fillText(
            safeDate,
            rightX,
            y,
            innerWidth
        );

        y += dateHeight;

        // ==================================================
        // DIRECCIÓN - ALINEADA A LA DERECHA
        // ==================================================

        setFont(300, 19);
        ctx.fillStyle = ORANGE;

        addressLines.forEach((line, index) => {
            ctx.fillText(
                line,
                rightX,
                y + index * addressLineHeight,
                innerWidth
            );
        });

        // ==================================================
        // CONVERTIR Y ENVIAR - SIN CAMBIOS DE LÓGICA
        // ==================================================

        const finalBase64 = canvas
            .toDataURL('image/jpeg', 0.92)
            .split(',')[1];

        submitData(
            finalBase64,
            actionType,
            workerName,
            workerCode,
            lat,
            lon,
            address,
            description,
            lastCheckInId,
            lastCheckInLocalTime,
            workerEmail,
            workerPhone,
            distance,
            selectedShift.shiftLat,
            selectedShift.shiftLon
        );

    } catch (error) {
        console.error('[PHOTO OVERLAY] Error:', error);
        showMessage('Could not prepare action photo.', 'danger');
        showActionUI();
    }
}


function submitActionWithOptionalNoBreakReason(actionType, noBreakReason) {
    pendingCheckoutNoBreakReason = String(noBreakReason || "").trim();
    bypassNoBreakModalOnce = true;           // evita que se reabra el modal
    handleActionClick(actionType);           // reusa el flujo normal (geo/foto/overlay/submitData)
}


function submitData(photoBase64Final, actionType, workerName, workerCode, lat, lon, address, description,
    lastCheckInId, lastCheckInLocalTime, workerEmail, workerPhone, distance,
    targetYLat, targetXLong) {

    // Final GPS validation before submitting the action.
    if (Number(currentGeoContext.geoRequired) === 1 && !isValidCoordinatePair(lat, lon)) {
        console.error("[GEO] Submission blocked: invalid GPS coordinates.", { actionType, lat, lon });
        showMessage("⛔ A valid GPS location is required to continue. Please try again.", "warning");
        showActionUI();
        return;
    }

    if (actionType == 'END BREAK') {
        $("#break-timer").hide();
    }

    if (actionType == 'CHECK OUT') {
        $("#shift-timer").hide();
    }

    const now = new Date();

    const clickLocalDate = now.getFullYear() + "-" +
        String(now.getMonth() + 1).padStart(2, "0") + "-" +
        String(now.getDate()).padStart(2, "0");

    const clickLocalTime = String(now.getHours()).padStart(2, "0") + ":" +
        String(now.getMinutes()).padStart(2, "0") + ":" +
        String(now.getSeconds()).padStart(2, "0");

    const clickLocalDatetime = clickLocalDate + " " + clickLocalTime;
    const displayDate = formatDisplayDateFromDate(now);
    const displayTime = formatDisplayTimeFromDate(now);
    console.log("===== GEO DATA SENT TO PHP =====");
    console.log({
        milesDistance: distance,
        geoAccuracyMeters: currentGeoContext.accuracyMeters,
        maxDistanceAllowed: currentGeoContext.maxDistanceAllowed,
        geoOverrideAccepted: currentGeoContext.overrideAccepted,
        geoOverrideReason: currentGeoContext.overrideReason
    });

    // Evitar solicitudes simultáneas
    if (submitActionInProgress) {
        console.warn("[submitAction] Request already in progress.");
        return;
    }

    submitActionInProgress = true;

    // Mostrar progreso mientras se envía el registro
    showMessage(
        '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Sending...',
        "info"
    );


    $.ajax({
        url: API_BASE + "submitAction4000.php",
        method: "POST",
        data: {
            ip: ip,
            country: country,
            city: city,
            code: workerCode,
            promoterCode: workerCode,
            promoterName: workerName,
            pk: selectedShift.pk,
            brand: selectedShift.brand,
            market: selectedShift.market,
            venue: selectedShift.location1,
            eventName: selectedShift.eventName,
            actionType,
            lat,
            lon,
            address,
            localDatetime: clickLocalDatetime,
            photoBase64: photoBase64Final,
            description,
            lastCheckInId,
            lastCheckInLocalTime,
            promoterEmail: workerEmail,
            promoterPhone: workerPhone,
            noBreakReason: (actionType === "CHECK OUT" ? (pendingCheckoutNoBreakReason || "") : ""),
            displayDate: displayDate,
            displayTime: displayTime,
            checkDate: clickLocalDate,
            checkTime: clickLocalTime,
            milesDistance: distance,
            geoAccuracyMeters: currentGeoContext.accuracyMeters,

            maxDistanceAllowed:
                currentGeoContext.maxDistanceAllowed,

            geoOverrideAccepted:
                currentGeoContext.overrideAccepted,

            geoOverrideReason:
                currentGeoContext.overrideReason,

            targetYLat: targetYLat,
            targetXLong: targetXLong,


            expressSessionId: selectedShift.expressSessionId || "",
            expressParentId: selectedShift.expressParentId || "",
            expressTasks: (actionType === "EXPRESS OUT" ? (pendingExpressTasksText || "") : "")
        },
        success: function (resp) {
            console.log("[submitAction response]", resp);

            // El envío terminó: retirar el mensaje Sending...
            clearTimeout(window.__msgTO);
            const responseEl = document.getElementById("responseMessage");
            if (responseEl) {
                responseEl.innerHTML = "";
                responseEl.style.display = "none";
            }

            // Retirar el panel de progreso geográfico
            removeGeoProgressPanel();

            if (!resp || resp.success !== true) {

                // El servidor respondió, pero no confirmó el guardado.
                // No avanzamos ni limpiamos datos pendientes.
                showRecordSendingStatus(false, function () {
                    showActionUI();
                });

                return;
            }

            // El servidor confirmó que guardó el registro.
            // La interfaz solo avanzará después de pulsar OK.
            showRecordSendingStatus(true, function () {

                pendingExpressTasksText = "";
                pendingCheckoutNoBreakReason = "";

                cancelExpressPhotoNotice();

                const isExpressIn = actionType === "EXPRESS IN";

                const showPhotoNotice = isExpressIn &&
                    ["MANDATORY", "OPTIONAL"].includes(expressPhotosRequired);

                validateCode();

                if (showPhotoNotice) {
                    expressPhotoNoticeTimer = setTimeout(() => {
                        expressPhotoNoticeTimer = null;
                        showExpressPhotoRequirementNotice();
                    }, 700);
                }
            });
        },
        error: function (xhr, textStatus, errorThrown) {

            console.error("[submitAction AJAX error]", {
                status: xhr.status,
                textStatus: textStatus,
                errorThrown: errorThrown
            });

            // Retirar el mensaje Sending...
            clearTimeout(window.__msgTO);

            const responseEl = document.getElementById("responseMessage");

            if (responseEl) {
                responseEl.innerHTML = "";
                responseEl.style.display = "none";
            }

            // Retirar el panel de progreso geográfico
            removeGeoProgressPanel();

            // No borrar datos pendientes ni asumir que falló el guardado.
            showRecordSendingStatus(false, function () {

                // Consultar nuevamente el estado real de la sesión.
                // Un error de red no garantiza que el servidor
                // no haya guardado el registro.
                validateCode();

            });
        }
    });
}


// ==========================================
// SUBMIT ACTION — DUPLICATE REQUEST GUARD
// ==========================================

let submitActionInProgress = false;


// ==========================================
// RECORD SENDING STATUS MODAL — BETA 4.0
// ==========================================

function showRecordSendingStatus(success, onOk = null) {

    const modalEl = document.getElementById(
        "recordSendingStatusModal"
    );

    const iconEl = document.getElementById(
        "recordSendingStatusIcon"
    );

    const messageEl = document.getElementById(
        "recordSendingStatusMessage"
    );

    const okBtn = document.getElementById(
        "recordSendingStatusOkBtn"
    );

    if (!modalEl || !iconEl || !messageEl || !okBtn) {
        console.error("Record Sending Status modal elements missing.");
        return;
    }

    iconEl.innerHTML = success
        ? '<i class="bi bi-check-circle-fill"></i>'
        : '<i class="bi bi-x-circle-fill"></i>';

    messageEl.textContent = success
        ? "Record Saved"
        : "Error Sending Record";

    const modal = bootstrap.Modal.getOrCreateInstance(modalEl, {
        backdrop: "static",
        keyboard: false
    });
    okBtn.onclick = function () {

        // Evitar múltiples pulsaciones
        okBtn.disabled = true;

        if (typeof onOk === "function") {
            modalEl.addEventListener(
                "hidden.bs.modal",
                function () {
                    okBtn.disabled = false;
                    submitActionInProgress = false;
                    onOk();
                },
                { once: true }
            );
        } else {
            modalEl.addEventListener(
                "hidden.bs.modal",
                function () {
                    okBtn.disabled = false;
                    submitActionInProgress = false;
                },
                { once: true }
            );
        }

        modal.hide();
    };

    modal.show();
}



function hideKeyboard(el) {
    const input = el || document.activeElement;
    if (input && typeof input.blur === "function") {
        // truco iOS/Android: readonly -> blur -> quitar readonly
        const wasReadonly = input.hasAttribute("readonly");
        input.setAttribute("readonly", "readonly");
        setTimeout(() => {
            input.blur();
            if (!wasReadonly) input.removeAttribute("readonly");
            // pequeña correción de scroll en algunos Android
            setTimeout(() => window.scrollTo(0, 0), 50);
        }, 0);
    } else {
        // plan b
        document.body.focus?.();
        document.activeElement?.blur?.();
    }
}

function scrollMainHomeTop() {
    requestAnimationFrame(() => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;

        const mainEl = document.querySelector("main");
        if (mainEl) mainEl.scrollTop = 0;

        const containerEl = document.querySelector("main .container");
        if (containerEl) containerEl.scrollTop = 0;

        const mainViewEl = document.getElementById("main-view");
        if (mainViewEl) mainViewEl.scrollTop = 0;
    });
}

function hideActionUI() {
    // Oculta contenedores de botones y deshabilita por si vuelven a mostrarse
    //console.log("Entro a hideActionUI()")
    $("#action-container")
        .find("button").prop("disabled", true).end()
        .stop(true, true).fadeOut(150);
}

function showActionUI() {
    //console.log("Entro a showActionUI()")
    // Muestra de nuevo y habilita (para cuando haya error o cancel)
    $("#action-container")
        .stop(true, true).fadeIn(150)
        .find("button").prop("disabled", false);
}

function openScheduler() {
    isSchedulerOpen = true;
    appCloseAllViewsHard({ showMain: false });
    $("#scheduler-view").show();
    renderSchedulerList();
}

function closeScheduler() {
    isSchedulerOpen = false;
    $("#scheduler-view").hide();
    $("#main-view").show();
}

function renderSchedulerList() {
    const list = $("#scheduler-list");
    const empty = $("#schedulerEmpty");
    list.empty();

    if (!Array.isArray(allShifts) || allShifts.length === 0) {
        empty.show();
        return;
    }
    empty.hide();

    // Upcoming Shifts: el scroll lo controla la vista.
    list.css({
        maxHeight: "none",
        overflowY: "visible"
    });

    allShifts.forEach((s, idx) => {
        const shiftDate = s.shiftDate || s.shiftCalcDate || "";
        const shiftTime = s.fromTo || s.shiftTime || "";
        const eventName = (s.eventName || "").toString();
        const location1 = (s.location1 || "").toString();

        const $card = $(`
      <button class="scheduler-card w-100" type="button" data-index="${idx}">
        <div class="row1"><i class="bi bi-calendar-event"></i><span>${shiftDate} • ${shiftTime}</span></div>
        <div class="row2">${eventName}</div>
        <div class="row3"><i class="bi bi-geo-alt-fill"></i> ${location1}</div>
      </button>
    `);
        /*
        $card.on("click", () => {
            selectedShift = s;
            lastAction = s.lastAction || lastAction; // si viene por shift
            closeScheduler();
            renderActions();
            showMessage("✅ Shift selected.", "success");
        });
        */

        list.append($card);
    });
}


function parseNumber(str) {
    if (typeof str === "number") return str;
    if (!str) return 0;
    // elimina todo excepto dígitos, punto, coma y signo
    let s = String(str).trim().replace(/[^0-9,.\-]/g, "");
    // quita comas (asumiendo separador de miles)
    s = s.replace(/,/g, "");
    const val = parseFloat(s);
    return isNaN(val) ? 0 : val;
}

function fmt2(n) {
    return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtMoney(n) {
    return '$' + fmt2(n);
}

// NEXT PAYROLL 

function openPayroll() {
    appCloseAllViewsHard({ showMain: false });
    $("#payroll-view").show();
    renderPayrollList();
}

function closePayroll() {
    $("#payroll-view").hide();
    $("#main-view").show();
}


function renderPayrollTable() {
    const $tbody = $("#payrollTbody");
    const $empty = $("#payrollEmpty");
    const $title = $("#payrollTitleSum");

    $tbody.empty();

    if (!Array.isArray(nextPayroll) || nextPayroll.length === 0) {
        $empty.show();
        $title.html(`
            <span class="gl-title-primary">NEXT</span>
            <span class="gl-title-secondary">PAYROLL</span>
        `);
        return;
    }
    $empty.hide();

    let sumTotal = 0;

    nextPayroll.forEach(rec => {
        // Esperado desde backend:
        // shiftDate, fromTo, eventName, Hours, Rate, Reimb, Total
        const shiftDate = rec.shiftDate || "";
        const time = rec.fromTo || rec.shiftTime || "";
        const event = rec.eventName || "";

        const hours = parseNumber(rec.shiftHours);
        const rate = parseNumber(rec.rate);
        const reimb = parseNumber(rec.reimbursement1);
        const total = parseNumber(rec.total);

        sumTotal += total;

        const $tr = $(`
      <tr>
        <td class="payroll-dt">
            <div class="dt-date">${shiftDate}</div>
            <div class="dt-time">${time}</div>
        </td>
        <td class="event">${event}</td>
        <td class="num center">${fmt2(hours)}</td>
        <td class="num">${fmtMoney(rate)}</td>
        <td class="num">${fmtMoney(reimb)}</td>
        <td class="num"><strong>${fmtMoney(total)}</strong></td>
      </tr>
    `);

        $tbody.append($tr);
    });

    $title.text(`NEXT PAYROLL: ${fmtMoney(sumTotal)}`);
}

function renderPayrollList() {

    const $list = $("#payroll-list");
    const $empty = $("#payrollEmpty");
    const $title = $("#payrollTitleSum");

    $list.empty();


    if (!Array.isArray(nextPayroll) || nextPayroll.length === 0) {
        $empty.show();
        $title.html(`
        <span class="gl-title-primary">NEXT</span>
        <span class="gl-title-secondary">PAYROLL</span>
    `);
        return;
    }


    $empty.hide();

    let sumTotal = 0;

    nextPayroll.forEach((rec, idx) => {

        const shiftDate = rec.shiftDate || "";
        const time = rec.fromTo || rec.shiftTime || "";
        const event = rec.eventName || "";

        const hours = parseNumber(rec.shiftHours);
        const rate = parseNumber(rec.rate);
        const reimb = parseNumber(rec.reimbursement1);
        const total = parseNumber(rec.total);

        sumTotal += total;

        const reimbClass = reimb > 0 ? 'chip--reimb' : 'chip--reimb-zero';

        const $card = $(`
        <button class="scheduler-card w-100 payroll-card" type="button">

            <div class="row1">
                <i class="bi bi-calendar-event"></i>
                <span>${shiftDate} • ${time}</span>
            </div>

            <div class="row2">${event}</div>

            <div class="row3">
                <span class="chip chip--hrs">
                    <i class="bi bi-clock-history"></i> ${fmt2(hours)} hrs
                </span>

                <span class="chip chip--rate">
                    <i class="bi bi-cash-coin"></i> ${fmtMoney(rate)}
                </span>

                <span class="chip ${reimbClass}">
                    <i class="bi bi-receipt"></i> ${fmtMoney(reimb)}
                </span>
            </div>

            <div class="row4 total-bar">
                <span><i class="bi bi-cash-stack"></i> Total</span>
                <strong>${fmtMoney(total)}</strong>
            </div>

        </button>
        `);

        $list.append($card);

    });


    $title.html(`
        <span class="gl-title-primary">NEXT</span>
        <span class="gl-title-secondary">PAYROLL: ${fmtMoney(sumTotal)}</span>
    `);

}

// LAST PAYROLL 

function openLastPayroll() {
    appCloseAllViewsHard({ showMain: false });
    $("#lastpayroll-view").show();
    renderLastPayrollList();
}

function closeLastPayroll() {
    $("#lastpayroll-view").hide();
    $("#main-view").show();
}

function renderLastPayrollList() {
    const $list = $("#last-list");
    const $empty = $("#lpEmpty");
    const $title = $("#lpTitleSum");

    $list.empty();

    if (!Array.isArray(lastPayroll) || lastPayroll.length === 0) {
        $empty.show();
        $title.text("LAST PAYROLL");
        return;
    }
    $empty.hide();

    let sumTotal = 0;

    lastPayroll.forEach((rec, idx) => {
        // Campos esperados: shiftDate, fromTo, eventName, shiftHours, rate, reimbursement1, total
        const shiftDate = rec.shiftDate || "";
        const time = rec.fromTo || rec.shiftTime || "";
        const event = rec.eventName || "";

        const hours = parseNumber(rec.shiftHours);
        const rate = parseNumber(rec.rate);
        const reimb = parseNumber(rec.reimbursement1);
        const total = parseNumber(rec.total);

        sumTotal += total;

        // clases dinámicas
        const reimbClass = reimb > 0 ? 'chip--reimb' : 'chip--reimb-zero';
        // const totalClass = total >= 200 ? 'total--hi' : (total >= 100 ? 'total--med' : 'total--low');
        const totalClass = 'total--hi';

        const $card = $(`
      <button class="scheduler-card w-100 last-card" type="button" data-index="${idx}">
        <div class="row1">
        <i class="bi bi-calendar-event"></i>
        <span>${shiftDate} • ${time}</span>
       
        </div>
        <div class="row2">${event}</div>
        <div class="row3">
         <span class="chip chip--hrs"><i class="bi bi-clock-history"></i> Hrs ${fmt2(hours)}</span>
          <span class="chip chip--rate"><i class="bi bi-cash-coin"></i> Rate ${fmtMoney(rate)}</span>
          <span class="chip ${reimbClass}"><i class="bi bi-receipt"></i> Reimb ${fmtMoney(reimb)}</span>
        </div>
        <div class="row4 total-bar ${totalClass}">
          <span><i class="bi bi-cash-stack"></i> Total</span>
          <strong>${fmtMoney(total)}</strong>
        </div>
      </button>
    `);

        $list.append($card);
    });

    $title.text(`LAST PAYROLL: ${fmtMoney(sumTotal)}`);
}


// REPORTES //

function setReportsBadge(n) {
    const $b = $("#reportsBadge");
    const show = Number(n) > 0;
    $b.text(n > 99 ? "99+" : String(n));
    $b.toggle(show);
}

function setReimbursementApprovalBadge(n) {
    const $b = $("#reimbursementApprovalBadge");
    if (!$b.length) return;

    const val = Number(n || 0);
    const show = val > 0;

    $b.text(val > 999 ? "999+" : String(val));
    $b.toggle(show);
}

function enableReportsMenu(enable = true) {
    const $el = $("#menuReports");
    $el.prop('disabled', !enable)
        .attr('aria-disabled', enable ? 'false' : 'true')
        .toggleClass('is-disabled', !enable);
    if (!enable) $el.attr('tabindex', '-1'); else $el.removeAttr('tabindex');
}

function enableSchedulerMenu(enable = true) {
    const $el = $("#menuScheduler");
    $el.prop('disabled', !enable)
        .attr('aria-disabled', enable ? 'false' : 'true')
        .toggleClass('is-disabled', !enable);
    if (!enable) $el.attr('tabindex', '-1'); else $el.removeAttr('tabindex');
}

function enablePayrollMenu(enable = true) {
    const $el = $("#menuPayroll");
    $el.prop('disabled', !enable)
        .attr('aria-disabled', enable ? 'false' : 'true')
        .toggleClass('is-disabled', !enable);
    if (!enable) $el.attr('tabindex', '-1'); else $el.removeAttr('tabindex');
}


function enableReimbursementsMenu(enable = true) {
    const $el = $("#menuReimbursements");
    $el.prop('disabled', !enable)
        .attr('aria-disabled', enable ? 'false' : 'true')
        .toggleClass('is-disabled', !enable);
    if (!enable) $el.attr('tabindex', '-1'); else $el.removeAttr('tabindex');
}

function enableVideosMenu(enable = true) {
    const $el = $("#menuTrainingVideos");
    $el.prop('disabled', !enable)
        .attr('aria-disabled', enable ? 'false' : 'true')
        .toggleClass('is-disabled', !enable);
    if (!enable) $el.attr('tabindex', '-1'); else $el.removeAttr('tabindex');
}


function safeStr(v) { return (v === undefined || v === null) ? "" : String(v); }
function isOverdue(due) {
    if (!due) return false;
    const t = Date.parse(due);
    if (Number.isNaN(t)) return false;
    return t < Date.now();
}

function openReports() {
    appCloseAllViewsHard({ showMain: false });
    $("#reports-view").css("display", "flex");
    renderPendingReports();
    $("#reports-list").scrollTop(0);
}

function closeReports() {
    $("#reports-view").hide();
    $("#main-view").show();
}

function renderPendingReports() {
    const $list = $("#reports-list");
    const $empty = $("#reportsEmpty");
    const $title = $("#reportsTitle");

    $list.empty();

    const total = Array.isArray(pendingReports) ? pendingReports.length : 0;
    $title.text(`PENDING REPORTS ${total ? ` (${total})` : ''}`);

    if (!total) {
        $empty.show();
        $list.off('click', '.report-card');
        return;
    }
    $empty.hide();

    $list.off('click', '.report-card').on('click', '.report-card', function () {
        const idx = Number($(this).data('index'));
        openReportCaptureByIndex(idx);
    });

    pendingReports.forEach((r, idx) => {
        const id = safeStr(r.id || r.reportId || r.pk || r.code || (idx + 1));
        const title = safeStr(r.title || r.subject || r.eventName || r.type || `REPORT ${id}`);
        const when = safeStr(r.date || r.createdDate || r.created_at || r.shiftDate || "");
        const loc = safeStr(r.location1 || r.location || r.market || "");

        const daysPendingNum = parseInt(r.daysPending, 10);
        const safeDaysPending = Number.isFinite(daysPendingNum) && daysPendingNum > 0 ? daysPendingNum : 0;

        const statusClass = safeDaysPending >= 3 ? 'chip--urgent' : 'chip--status';
        const statusText = safeDaysPending === 1 ? '1 day' : `${safeDaysPending} days`;

        const leftInfo = when
            ? `<span><i class="bi bi-clock"></i> Date ${when}</span>`
            : '<span></span>';

        const $card = $(`
            <button class="scheduler-card w-100 report-card" type="button" data-index="${idx}">
                <div class="row1">
                    <i class="bi bi-flag"></i>
                    <span>${title}</span>
                </div>

                ${loc ? `
                    <div class="row3">
                        <span class="report-location">
                            <i class="bi bi-geo-alt-fill"></i> ${loc}
                        </span>
                    </div>
                ` : ``}

                <div class="row4">
                    ${leftInfo}
                    <span class="chip ${statusClass}">
                        <i class="bi bi-exclamation-circle"></i> ${statusText}
                    </span>
                </div>
            </button>
        `);

        $list.append($card);
    });
}


// ================= INPUT REPORTS ======================================================= //
async function openReportCaptureByIndex(idx) {
    const r = (pendingReports || [])[idx];
    if (!r) {
        showMessage("Report not found.", "warning");
        return;
    }

    // Pending Reports no debe continuar hacia CHECK OUT.
    rcAfterSubmitAction = null;

    currentReportCtx = {
        idx,
        id: String(r.id || r.reportId || r.pk || (idx + 1)),
        pk: (r.pk || '').toString().trim(),
        eventName: (r.eventName || r.title || r.subject || "").trim(),
        market: (r.market || '').toString().trim(),
        location1: (r.location1 || r.location || '').toString().trim(),
        date: (r.shiftDate || r.date || "").toString().trim(),
        time: (r.fromTo || r.shiftTime || '').toString().trim(),
        shiftDateForReport: (r.order0 || r.shiftDate || r.date || '').toString().trim(),
        longIdShiftForReport: (r.idShift || '').toString().trim()
    };

    reportSchema = r.reportSchema || await rcLoadDraftSchema();
    reportAnswers = rcLoadAutosave(currentReportCtx.id) || rcPrefillFromReport(r);
    reportFiles = {};

    rcBuildUI();

    appCloseAllViewsHard({ showMain: false });
    $("#report-capture-view").show();

    rcScrollStepTop();

    const rcv = document.getElementById('report-capture-view');
    if (rcv && rcv.style.display !== 'none') {
        document.dispatchEvent(new CustomEvent('report-view:ready'));
    }

}


function openReportCaptureView() {
    // … tu lógica que muestra #report-capture-view y arma el formulario …
    // Asegúrate que #fld_eventSummary ya exista en el DOM:
    document.dispatchEvent(new CustomEvent('report-view:ready'));
}



function closeReportCapture(goToMain = false) {

    const isPreCheckout =
        rcAfterSubmitAction?.type === "EXPRESS_REPORT_CHECKOUT" ||
        rcAfterSubmitAction?.type === "REPORT_CHECKOUT";

    $("#report-capture-view").hide();

    if (goToMain || isPreCheckout) {

        $("#reports-view, #scheduler-view, #payroll-view, #lastpayroll-view").hide();
        $("#main-view").show();

    } else {

        $("#reports-view").css("display", "flex");

    }

    // Solo cancelar la continuación automática
    // cuando el usuario cierra voluntariamente.
    if (!goToMain && isPreCheckout) {
        rcAfterSubmitAction = null;
    }
}


// ************** Esquema demo (para trabajar ya). Mañana sustituyes por el draft.Esquema demo (para trabajar ya). Mañana sustituyes por el draft.
async function rcLoadDefaultSchema() {
    return {
        title: "REPORT",
        sections: [
            {
                id: "about", label: "About", fields: [
                    { id: "reportId", label: "Report ID", type: "text", readonly: true },
                    {
                        id: "type", label: "Type", type: "singleChoice", required: true,
                        options: [{ value: "Incident", label: "Incident" }, { value: "Reimbursement", label: "Reimbursement" }, { value: "Feedback", label: "Feedback" }, { value: "Other", label: "Other" }]
                    },
                    { id: "title", label: "Title / Subject", type: "text", required: true, maxLength: 120 }
                ]
            },
            {
                id: "context", label: "Context", fields: [
                    { id: "date", label: "Date", type: "date", required: true },
                    { id: "location", label: "Location", type: "text", placeholder: "Market / Location" },
                    {
                        id: "tags", label: "Tags", type: "multiChoice",
                        options: [{ value: "Store", label: "Store Issue" }, { value: "Inventory", label: "Inventory" }, { value: "Customer", label: "Customer" }, { value: "Travel", label: "Travel" }, { value: "Expense", label: "Expense" }, { value: "Other", label: "Other" }]
                    },
                    {
                        id: "severity", label: "Severity", type: "singleChoice", required: true,
                        options: [{ value: "Low", label: "Low" }, { value: "Medium", label: "Medium" }, { value: "High", label: "High" }], default: "Medium"
                    }
                ]
            },
            {
                id: "details", label: "Details", fields: [
                    { id: "description", label: "Description", type: "textarea", required: true, minLength: 10 },
                    {
                        id: "amount", label: "Amount ($)", type: "number", min: 0, step: 0.01,
                        visibleWhen: [{ question: "type", op: "=", value: "Reimbursement" }],
                        requiredWhen: [{ question: "type", op: "=", value: "Reimbursement" }]
                    }
                ]
            },
            {
                id: "evidence", label: "Evidence", fields: [
                    { id: "attachments", label: "Attachments", type: "file", multiple: true, maxFiles: 12, maxSizeMB: 8, accept: ["image/*", "application/pdf"] },
                    { id: "photos", label: "Photos", type: "file", multiple: true, maxFiles: 6, maxSizeMB: 8, accept: ["image/*"], capture: "environment" }
                ]
            },
            {
                id: "confirm", label: "Confirmation", fields: [
                    { id: "cert", label: "I certify the information is accurate.", type: "toggle", required: true }
                ]
            }
        ]
    };
}


function rcIsMiamiSpecialMarket(market, eventName) {
    const m = String(market || "").trim().toUpperCase();
    const e = String(eventName || "").trim().toUpperCase();

    const isMiami = m === "MIAMI,FL";
    const hasPopUp =
        e.includes("POP-UP") ||
        e.includes("POP UP") ||
        e.includes("POPUP") ||
        e.includes("POP--UP") ||
        e.includes("POP -- UP") ||
        e.includes("POP - UP") ||
        e.includes("POP- UP") ||
        e.includes("POP -UP")

    return isMiami && !hasPopUp;
}


function rcFilterSchemaByMarket(schema, market, eventName) {
    if (!schema || !Array.isArray(schema.sections)) return schema;

    if (!rcIsMiamiSpecialMarket(market, eventName)) {
        return schema;
    }

    const allowedIds = new Set(["summary", "photos", "sales", "reach", "confirm"]);

    return {
        ...schema,
        sections: schema.sections.filter(sec => allowedIds.has(sec.id))
    };
}


// === SCHEMA desde draft ===
async function rcLoadDraftSchema() {
    const schema = {
        id: "golocal_shift_report_v1",
        title: "REPORT",
        sections: [
            {
                id: "summary",
                label: "Summary",
                fields: [
                    { id: "urgentIssues", label: "ISSUES TO BE REPORTED?", type: "textarea", maxLength: 1500, placeholder: "Optional" },
                    // Brief or incomplete responses are not sufficient.
                    { id: "eventSummary", label: "SUMMARY", type: "textarea", required: true, maxLength: 9000, placeholder: "Provide clear and complete sentences with relevant feedback and key highlights from your shift." }
                ]
            },
            {
                id: "photos",
                label: "Photos",
                fields: [
                    {
                        id: "photos",
                        label: "ADD SOME PHOTOS",
                        type: "file",
                        multiple: true,
                        accept: [
                            "image/*",
                            "image/heic",
                            "image/heif",
                            ".heic",
                            ".heif"
                        ],
                        required: true,
                        minFiles: 1,
                        maxFiles: 10,
                        maxSizeMB: 20,
                        help: "",
                        compress: { maxWidth: 2000, maxHeight: 2000, quality: 0.82 }
                    }
                ]
            },
            {
                id: "sales",
                label: "Sales",
                fields: [
                    {
                        id: "salesFreeText",
                        label: "SALES REPORT",
                        type: "textarea",
                        help: "",
                        required: true,
                        placeholder: "Write N/A if no sales"
                    },
                    {
                        id: "salesTable",
                        label: "",
                        type: "table",
                        columns: [
                            { id: "product", label: "Product", kind: "text", required: true },
                            { id: "qty", label: "Units", kind: "int>0", required: true },
                            { id: "total", label: "Total $", kind: "money>0", required: true }
                        ],
                        parseFrom: "salesFreeText",
                        showGrandTotal: true,
                        grandTotalField: "totalSales"
                    },
                    {
                        id: "totalSales",
                        label: "TOTAL SALES",
                        type: "number",
                        integer: false,
                        min: 0.00,
                        required: true,
                        help: "Write 0 if no sales"
                    }
                ]
            },
            {
                id: "reach",
                label: "Reach",
                fields: [
                    {
                        id: "footTraffic",
                        label: "FOOT TRAFFIC",
                        type: "singleChoice",
                        widget: "select",
                        required: true,
                        options: [
                            { value: "0-50", label: "0 to 50" },
                            { value: "50-100", label: "50 to 100" },
                            { value: "100-250", label: "100 to 250" },
                            { value: "250-500", label: "250 to 500" },
                            { value: "500-1000", label: "500 to 1,000" },
                            { value: "1000+", label: "1,000+" }
                        ],
                        help: ""
                    },
                    {
                        id: "interactions",
                        label: "INTERACTIONS",
                        type: "number",
                        integer: true,
                        min: 0,
                        required: true,
                        maxFromTrafficId: "footTraffic",
                        help: " "
                    },
                    {
                        id: "samples",
                        label: "SHOPPERS SAMPLED",
                        type: "number",
                        integer: true,
                        min: 0,
                        required: true,
                        maxFromFieldId: "interactions",
                        help: " "
                    }
                ]
            },
            {
                id: "products",
                label: "",
                fields: [
                    {
                        id: "promotedTable",
                        label: "",
                        type: "table",
                        columns: [
                            { id: "product", label: "Product", kind: "productSelect", required: false }
                        ]
                    }
                ]
            },
            {
                id: "competitors",
                label: "",
                fields: [
                    {
                        id: "competitorsTable",
                        label: "",
                        type: "table",
                        columns: [
                            { id: "brand", label: "", kind: "brandSelect", required: false }
                        ]
                    }
                ]
            },
            {
                id: "demo",
                label: "Audience",
                fields: [
                    {
                        id: "gender",
                        label: "PREDOMINANT GENDER",
                        type: "singleChoice",
                        options: [
                            { value: "Male", label: "Male" },
                            { value: "Female", label: "Female" },
                            { value: "Even split", label: "Even split" }
                        ],
                        required: true
                    },
                    {
                        id: "ages",
                        label: "PREDOMINANT AGE GROUPS",
                        type: "multiChoice",
                        options: ["Children/Teens", "20s", "30s", "40s", "50s", "60s+"].map(x => ({ value: x, label: x })),
                        required: true
                    },
                    {
                        id: "destinations",
                        label: "PREDOMINANT DESTINATIONS",
                        type: "multiChoice",
                        options: ["Europe", "Asia", "South America", "Caribbean / Central America", "Canada", "Middle East", "Africa", "Australia / Oceania"]
                            .map(x => ({ value: x, label: x })),
                        required: true
                    }
                ]
            },
            {
                id: "demo2",
                label: "Audience2",
                fields: [
                    {
                        id: "nationalities",
                        label: "PREDOMINANT NATIONALITIES",
                        type: "multiChoice",
                        options: ["American", "Australian", "British", "Canadian", "Chinese", "French", "German", "Indian", "Italian", "Korean", "Japanese", "Middle Eastern", "Native American", "Mexican", "Russian"].map(x => ({ value: x, label: x })),
                        required: true
                    },
                    {
                        id: "ethnicity",
                        label: "PREDOMINANT ETHNICITY",
                        type: "multiChoice",
                        options: ["Caucasian", "Hispanic", "Asian", "African American"].map(x => ({ value: x, label: x })),
                        required: true
                    }
                ]
            },
            {
                id: "confirm",
                label: "Confirm",
                fields: [
                    {
                        id: "cert",
                        label: `
                        <span class="rc-cert-text">
                        <span class="rc-cert-paragraph">
                        I certify that the information provided is truthful and relates to the reported work session or shift.
                        </span><br>

                        <span class="rc-cert-paragraph">
                        I certify that any submitted photos are authentic and were taken during the reported work session or shift.
                        </span><br>

                        <span class="rc-cert-paragraph">
                        I certify that none of the submitted photos were created or altered using artificial intelligence.
                        </span>
                        </span>
                        `,
                        type: "toggle",
                        required: true
                    }
                ]
            }
        ]
    };

    const market = currentReportCtx?.market || selectedShift?.market || "";
    const eventName = currentReportCtx?.eventName || selectedShift?.eventName || "";
    return rcFilterSchemaByMarket(schema, market, eventName);
}

async function rcLoadExpressReportSchema({ requirePhotos = false } = {}) {

    const summaryFields = [];

    summaryFields.push({
        id: "eventSummary",
        label: "TASKS COMPLETED / SUMMARY",
        type: "textarea",
        required: true,
        maxLength: 9000,
        placeholder: "Describe the tasks completed during this session."
    });

    const sections = [
        {
            id: "summary",
            label: "Summary",
            fields: summaryFields
        }
    ];

    // =====================================================
    // EXPRESS PHOTOS RULE
    // NO        -> no Photos section
    // OPTIONAL  -> Photos section, 0 to 6 photos
    // MANDATORY -> Photos section, minimum 3 / maximum 6
    // =====================================================

    const photoMode = String(
        expressPhotosRequired || "NO"
    ).trim().toUpperCase();

    if (photoMode === "OPTIONAL" || photoMode === "MANDATORY") {

        const photoLimits = getExpressReportPhotoLimits(photoMode);
        const photosMandatory = photoLimits.min > 0;

        sections.push({
            id: "photos",
            label: "Photos",
            fields: [
                {
                    id: "photos",
                    label: "ADD PHOTOS",
                    type: "file",
                    multiple: true,
                    accept: [
                        "image/*",
                        "image/heic",
                        "image/heif",
                        ".heic",
                        ".heif"
                    ],

                    required: photosMandatory,

                    minFiles: photoLimits.min,
                    maxFiles: photoLimits.max,

                    maxSizeMB: 20,

                    compress: {
                        maxWidth: 2000,
                        maxHeight: 2000,
                        quality: 0.82
                    }
                }
            ]
        });
    }

    // =====================================================
    // CONFIRMATION
    // Forces the user to review the report before submit.
    // It also guarantees that Summary passes through NEXT,
    // where translation / processing is performed.
    // =====================================================

    sections.push({
        id: "confirm",
        label: "Confirm",
        fields: [
            {
                id: "cert",
                label: `
                <span class="rc-cert-text">
                        <span class="rc-cert-paragraph">
                        I certify that the information provided is truthful and relates to the reported work session or shift.
                        </span><br>

                        <span class="rc-cert-paragraph">
                        I certify that any submitted photos are authentic and were taken during the reported work session or shift.
                        </span><br>

                        <span class="rc-cert-paragraph">
                        I certify that none of the submitted photos were created or altered using artificial intelligence.
                        </span>
                </span>
                `,
                type: "toggle",
                required: true
            }
        ]
    });

    return {
        id: "golocal_express_report_v1",
        title: "EXPRESS REPORT",
        sections
    };
}


function rcInjectTranslateButton() {
    const $grp = $("#grp_eventSummary");
    if (!$grp.length) return;

    const $label = $grp.find(".rc-label");
    $label.addClass("rc-label--row");

    if ($grp.find(".rc-trans-btn").length) return;

    const $btn = $(`
      <button type="button" class="btn btn-sm btn-outline-success rc-trans-btn"
              data-role="btn-translate" title="Translate to English" aria-label="Translate to English">
        <i class="bi bi-translate"></i>
      </button>
    `);

    $label.append($btn);

    $btn.on("click", async () => {
        const $issues = $("#fld_urgentIssues");
        const $summary = $("#fld_eventSummary");

        const rawIssues = ($issues.val() || "").trim();
        const rawSummary = ($summary.val() || "").trim();

        if (!rawIssues && !rawSummary) {
            showMessage("Nothing to translate.", "warning");
            return;
        }

        rcHideSummaryButtonsExcept('btn-translate');
        $btn.prop("disabled", true).html(`<span class="spinner-border spinner-border-sm"></span> Translating`);

        try {
            if (rawIssues) {
                const issuesOut = await translateAndPolish(rawIssues);
                if (issuesOut && issuesOut.trim()) {
                    $issues.val(issuesOut.trim()).trigger("input");
                }
            }

            if (rawSummary) {
                const summaryOut = await translateAndPolish(rawSummary);
                if (summaryOut && summaryOut.trim()) {
                    $summary.val(summaryOut.trim()).trigger("input");
                }
            }

            showMessage("Translated & polished ✅", "success");
            rcShowSummaryButtons();
        } catch (e) {
            console.error(e);
            showMessage("Network error.", "danger");
        } finally {
            $btn.prop("disabled", false).html(`<i class="bi bi-translate"></i>`);
            rcShowSummaryButtons();
        }
    });
}

// === SUMMARY BUTTONS VISIBILITY HELPERS ===
function rcSummaryButtonsLabel() {
    const grp = document.getElementById('grp_eventSummary');
    if (!grp) return null;
    return grp.querySelector('.rc-label, label');
}
function rcHideSummaryButtonsExcept(role) {
    const label = rcSummaryButtonsLabel();
    if (!label) return;
    label.querySelectorAll('[data-role]').forEach(btn => {
        btn.style.display = (btn.dataset.role === role) ? '' : 'none';
    });
}
function rcShowSummaryButtons() {
    const label = rcSummaryButtonsLabel();
    if (!label) return;
    label.querySelectorAll('[data-role]').forEach(btn => { btn.style.display = ''; });
}


// === CLEAR BUTTONS ======================================================
function rcFindFieldDef(id) {
    for (const sec of (reportSchema?.sections || [])) {
        const f = (sec.fields || []).find(x => x.id === id);
        if (f) return f;
    }
    return null;
}

function rcAddClearButton(fieldId, { alignRight = false, label = 'Clear' } = {}) {
    const grp = document.getElementById(`grp_${fieldId}`);
    if (!grp) return;
    const lbl = grp.querySelector('.rc-label, label');
    if (!lbl) return;
    if (lbl.querySelector(`[data-clear-for="${fieldId}"]`)) return; // ya existe

    lbl.classList.add('rc-label--row');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rc-clear-btn btn btn-sm btn-outline-danger';
    btn.setAttribute('data-clear-for', fieldId);
    btn.innerHTML = '<i class="bi bi-eraser"></i> Clear';

    if (alignRight) btn.style.marginLeft = 'auto';

    btn.addEventListener('click', () => rcClearField(fieldId));
    lbl.appendChild(btn);
}

function rcClearTable(tableId) {
    const def = rcFindFieldDef(tableId);
    const cols = def?.columns || [];
    reportAnswers[tableId] = [];
    rcAutosave();
    rcTableRenderRows(tableId, cols, []);
    rcTableSync(tableId, cols, def);
}

function rcClearField(id) {
    // Normaliza: limpia UI + answers + errores
    const $fld = $(`#fld_${id}`);

    // 1) limpiezas específicas
    if (id === 'urgentIssues') {
        $fld.val('');
        rcSetAnswer('urgentIssues', '');
        rcShowError('urgentIssues', '');
        showMessage('Issues cleared.', 'info');
        return;
    }

    if (id === 'eventSummary') {
        $fld.val('');
        rcSetAnswer('eventSummary', '');
        rcShowError('eventSummary', '');
        showMessage('Summary cleared.', 'info');
        return;
    }

    if (id === 'salesTable') {
        // borra textarea libre, tabla y total
        $('#fld_salesFreeText').val('');
        rcSetAnswer('salesFreeText', '');
        rcShowError('salesFreeText', '');

        rcClearTable('salesTable');
        $('#gt_salesTable').text('$0.00');

        $('#fld_totalSales').val('');
        rcSetAnswer('totalSales', '');
        rcShowError('totalSales', '');

        showMessage('Sales report cleared.', 'info');
        return;
    }

    if (id === 'stockTable') {
        // borra textarea libre y tabla
        $('#fld_stockFreeText').val('');
        rcSetAnswer('stockFreeText', '');
        rcShowError('stockFreeText', '');

        rcClearTable('stockTable');

        showMessage('Inventory cleared.', 'info');
        return;
    }

    // 2) genérico (fallback)
    if ($fld.length) {
        $fld.val('');
        rcSetAnswer(id, '');
        rcShowError(id, '');
        showMessage('Cleared.', 'info');
    }
}

function rcCreateTrashButton(onClick) {
    return $(`
        <button type="button"
                class="btn btn-sm btn-link rc-btn-trash"
                title="Remove">
            <i class="bi bi-trash-fill"></i>
        </button>
    `).on('click', onClick);
}


function rcInjectClearButtons() {
    // Issues
    rcAddClearButton('urgentIssues', { label: 'Clear' });

    // Summary (alineado a la derecha)
    rcAddClearButton('eventSummary', { label: 'Clear', alignRight: true });

    // Sales (limpia todo el sales report)
    rcAddClearButton('salesTable', { label: 'Clear' });

    // Inventory (limpia todo el inventario)
    rcAddClearButton('stockTable', { label: 'Clear' });
}


// Wrapper para que onReportViewReady no falle:
function ensureSummaryTranslateUI() {
    // Hoy solo inyectamos el botón de traducir al inglés
    rcInjectTranslateButton();
}


function rcPrefillFromReport(r) {
    return {
        reportId: String(r.id || r.reportId || r.pk || ""),
        type: r.type || "",
        title: r.title || r.subject || r.eventName || "",
        date: (r.date || r.shiftDate || "").slice?.(0, 10) || "",
        location: r.location1 || r.location || r.market || "",
        tags: Array.isArray(r.tags) ? r.tags : [],
        severity: r.severity || "Medium",
        description: r.description || "",
        amount: r.amount || r.reimb || ""
    };
}

// *************** Construcción de UI, stepper, campos, chips, archivos

function rcFitTitleToLine(el, minPx = 13, maxPx = 18) {
    if (!el) return;
    const cs = window.getComputedStyle(el);
    let size = Math.min(parseFloat(cs.fontSize) || 16, maxPx);

    el.style.whiteSpace = 'nowrap';
    el.style.textOverflow = 'ellipsis';
    el.style.overflow = 'hidden';
    el.style.fontSize = size + 'px';

    // Reduce de a 0.5px hasta que quepa la cadena de 30 chars sin cortar
    while (el.scrollWidth > el.clientWidth && size > minPx) {
        size -= 0.5;
        el.style.fontSize = size + 'px';
    }
}


function rcBuildUI() {
    // ==== HEADER: Title + Subtitle ====
    // Usamos .rc-title si existe; si no, caemos a #rcTitle (compat v172+)

    const $title = $(".rc-title").length ? $(".rc-title") : $("#rcTitle");

    if ($title.length) {
        const evName =
            (currentReportCtx && (currentReportCtx.eventName || currentReportCtx.title || currentReportCtx.name)) || "";

        const rawTitle =
            currentReportCtx?.reportType === "EXPRESS"
                ? "EXPRESS REPORT"
                : (evName || "");

        const truncated = rawTitle.length > 30 ? rawTitle.slice(0, 30) : rawTitle;

        $title.text(truncated).attr('title', rawTitle);

        setTimeout(() => rcFitTitleToLine($title[0], 13, 18), 0);

    }

    const isExpressReport = currentReportCtx?.reportType === "EXPRESS";

    $("#report-capture-view").toggleClass(
        "gl-express-report",
        isExpressReport
    );

    $("#rcSteps").empty();
    $("#rcSections").empty();

    const steps = reportSchema.sections || [];

    steps.forEach((s, i) => {
        const $step = $(`<div class="rc-step${i === 0 ? ' is-active' : ''}" data-i="${i}">${s.label || ('Step ' + (i + 1))}</div>`);
        $("#rcSteps").append($step);
        const $sec = $(`<section class="rc-section${i === 0 ? ' is-active' : ''}" data-i="${i}" id="sec_${s.id}"></section>`);
        rcRenderSection($sec, s);
        $("#rcSections").append($sec);
    });

    rcCurrentStep = 0;
    rcUpdateFooterButtons();
    // handlers navegación
    $("#rcPrev").off().on("click", () => rcGo(-1));
    $("#rcNext").off().on("click", async () => { await rcGo(+1); });

    ///////////////// TEMPORAL ///////////////////////////////////
    $("#rcSubmit").off().on("click", function () {

        console.log("🔥🔥🔥 CLICK EN REPORT SUBMIT 🔥🔥🔥");

        console.log("reportSchema:", reportSchema);
        console.log("reportAnswers:", reportAnswers);
        console.log("currentReportCtx:", currentReportCtx);
        console.log("rcAfterSubmitAction:", rcAfterSubmitAction);

        rcSubmit();
    });

    //////////////////////////////////////////////////////////////




    $("#rcCloseBtn").off().on("click", () => {
        // guard de salida si hay cambios sin certificar (opcional)
        closeReportCapture();
        $("#hamburgerBtn").trigger("focus");
    });

    // Permitir saltar tocando la pill (sin validar el paso actual)
    $('#rcSteps').off('click', '.rc-step').on('click', '.rc-step', function () {
        const i = Number($(this).data('i'));
        const sections = reportSchema.sections || [];
        if (i < 0 || i >= sections.length) return;

        $('.rc-step').removeClass('is-active');
        $(`.rc-step[data-i=${i}]`).addClass('is-active');

        $('.rc-section').removeClass('is-active').hide();
        $(`.rc-section[data-i=${i}]`).addClass('is-active').show();

        rcCurrentStep = i;
        rcUpdateFooterButtons();
        rcScrollStepTop();
    });
    // rcInjectTranslateButton();
    // rcInjectClearButtons();

}

function rcPhAttr(f) {
    if (!f || !f.placeholder) return '';
    return ` placeholder="${String(f.placeholder).replace(/"/g, '&quot;')}"`;
}

function rcRenderSection($sec, section) {

    const fields = Array.isArray(section?.fields) ? section.fields : [];
    if (!Array.isArray(section?.fields)) {
        console.warn('[rc] SECTION WITHOUT fields:', section?.id || section?.label || section, section);
    }

    fields.forEach(f => {
        const id = f.id;
        const val = reportAnswers[id];
        const visible = rcEvalVisible(f, reportAnswers);
        const required = rcEvalRequired(f, reportAnswers, f.required === true);
        const reqCls = required ? ' is-required' : '';
        const reqStar = required ? ' <span class="rc-req" aria-hidden="true"></span>' : '';

        const $g = $(`<div class="rc-group" id="grp_${id}" ${visible ? '' : 'style="display:none"'}></div>`);
        if (f.type !== 'toggle' && f.type !== 'table' && f.label) {
            const labelTxt = (typeof f.label === 'string') ? f.label.trim() : (f.label ?? '');
            if (labelTxt) {
                $g.append(`<label class="rc-label${reqCls}" for="fld_${id}">${labelTxt}${reqStar}</label>`);
            } else {
                // si no hay label, NO mostramos el id (evita que salga "promotedTable")
                // pero igual mantenemos required internamente
            }
        }

        let $field;

        switch (f.type) {
            case 'text':
            case 'number':
            case 'date':
            case 'time': {
                const ph = rcPhAttr(f);
                const step = (f.type === 'number' && f.step != null) ? ` step="${f.step}"` : '';
                const min = (f.type === 'number' && f.min != null) ? ` min="${f.min}"` : '';
                const max = (f.type === 'number' && f.max != null) ? ` max="${f.max}"` : '';
                const ro = f.readonly ? ' readonly' : '';
                const typeAttr = (f.type === 'text' ? 'text' : f.type);
                $field = $(
                    `<input class="rc-input" id="fld_${id}" type="${typeAttr}"${ph}${step}${min}${max}${ro}>`
                ).val(val || '');
                break;
            }
            case 'textarea': {
                const ph = rcPhAttr(f);
                $field = $(
                    `<textarea class="rc-textarea" id="fld_${id}"${ph}></textarea>`
                ).val(val || '');
                break;
            }
            case 'singleChoice':
                // como chips exclusivas
                $field = $(`<div class="rc-chips" id="fld_${id}"></div>`);
                (f.options || []).forEach(opt => {
                    const on = (val || f.default) === opt.value;
                    const $chip = $(`<span class="rc-chip${on ? ' is-on' : ''}" data-val="${opt.value}">${opt.label}</span>`);
                    $chip.on('click', () => {
                        $field.find('.rc-chip').removeClass('is-on');
                        $chip.addClass('is-on');

                        rcSetAnswer(id, opt.value);

                        const err = rcValidateField(f, reportAnswers[id]);
                        rcShowError(id, err);

                        rcUpdateVisibilityAll();
                    });
                    $field.append($chip);
                });
                break;

            case 'multiChoice':
                $field = $(`<div class="rc-chips" id="fld_${id}"></div>`);
                const cur = new Set(Array.isArray(val) ? val : []);
                (f.options || []).forEach(opt => {
                    const on = cur.has(opt.value);
                    const $chip = $(`<span class="rc-chip${on ? ' is-on' : ''}" data-val="${opt.value}">${opt.label}</span>`);
                    $chip.on('click', () => {
                        $chip.toggleClass('is-on');

                        const set = new Set(Array.isArray(reportAnswers[id]) ? reportAnswers[id] : []);
                        if ($chip.hasClass('is-on')) set.add(opt.value);
                        else set.delete(opt.value);

                        rcSetAnswer(id, Array.from(set));

                        const err = rcValidateField(f, reportAnswers[id]);
                        rcShowError(id, err);

                        rcUpdateVisibilityAll();
                    });
                    $field.append($chip);
                });
                break;

            case 'toggle': {
                const reqCls = required ? ' is-required' : '';
                const reqStar = required ? ' <span class="rc-req" aria-hidden="true"></span>' : '';
                $field = $(
                    `<label class="rc-checklabel${reqCls}">
                    <input type="checkbox" id="fld_${id}" ${required ? 'aria-required="true" data-required="1"' : ''}>
                    ${(f.label || id)}${reqStar}
                    </label>`
                );
                $field.find('input').prop('checked', !!val);
                break;
            }

            case 'file': {
                $field = $(`
                    <div>
                    <div class="rc-actions">
                    <label class="btn btn-light file-btn">
                    <i class="bi bi-paperclip"></i> Add ${f.multiple ? 'files' : 'file'}
                    <input type="file" id="fld_${id}" ${f.multiple ? 'multiple' : ''}
                        ${f.accept ? `accept="${f.accept.join(',')}"` : ''}
                        ${f.capture ? `capture="${f.capture}"` : ''} hidden>
                    </label>
                    </div>
                    <div class="rc-gallery" id="gal_${id}"></div>
                    </div>
                    <div id="rcPhotoStatus" class="rc-photo-status d-none"></div>

                `);


                $field.find('input[type=file]').on('change', (e) => {
                    const files = Array.from(e.target.files || []);
                    e.target.value = ''; // limpia de una vez

                    if (!files.length) return;

                    // 1) UI inmediata (Safari necesita respirar)
                    rcSetPhotosProcessing(true, `Processing photos... (0/${files.length})`);

                    // 2) suelta el hilo para que repinte (footer/Next/status)
                    setTimeout(async () => {
                        try {
                            await rcHandleFiles2(f, files);
                        } finally {
                            rcSetPhotosProcessing(false);
                            // asegura refresco final del footer
                            if (typeof rcUpdateFooterButtons === "function") rcUpdateFooterButtons();
                        }
                    }, 0);
                });

                break;
            }

            case 'table': {
                const tableId = f.id;

                if (tableId === 'promotedTable') {
                    const initial =
                        (reportAnswers?.promotedTable && Array.isArray(reportAnswers.promotedTable))
                            ? reportAnswers.promotedTable
                            : [];

                    const $slot = $('<div class="mb-3"></div>');
                    rcRenderPromotedTable($slot, initial);   // tu renderer datalist
                    $field = $slot;                          // <- esto es lo que se inserta al group

                    break; // 🚨 evita que se construya la tabla genérica
                }

                if (tableId === 'competitorsTable') {
                    const initial =
                        (reportAnswers?.competitorsTable && Array.isArray(reportAnswers.competitorsTable))
                            ? reportAnswers.competitorsTable
                            : [];

                    const $slot = $('<div class="mb-3"></div>');
                    rcRenderCompetitorsTable($slot, initial); // renderer datalist brands
                    $field = $slot;
                    break; // 🚨 evita que se construya la tabla genérica
                }


                const cols = f.columns || [];
                const parseFrom = f.parseFrom; // p.ej. "salesFreeText"

                // 1) Wrap base de la tabla
                const $wrap = $(`<div class="rc-table-wrap" id="tbl_${tableId}"></div>`);

                // 2) Acciones (se crean una sola vez)
                const $actions = $(`<div class="rc-actions" style="margin-bottom:8px; gap:6px;"></div>`);
                if (parseFrom) {
                    $actions.append(`
                    <button type="button" class="btn btn-sm btn-outline-primary" hidden id="parse_${tableId}">
                    <i class="bi bi-magic"></i> Convert to table
                    </button>
                `);
                }
                $actions.append(`
                    <button type="button" class="btn btn-sm btn-outline-secondary" id="addrow_${tableId}">
                    <i class="bi bi-plus-circle"></i> Add row
                </button>
                `);

                $wrap.append($actions);

                // 3) Tabla
                const $table = $(`
                <table class="rc-table">
                <thead><tr>${cols.map(c => `<th>${c.label || c.id}</th>`).join('')}<th></th></tr></thead>
                <tbody id="body_${tableId}"></tbody>
                </table>
                `);

                $wrap.append($table);

                if (f.showGrandTotal) {
                    $wrap.append(`<div class="rc-grandtotal">Grand Total: <strong id="gt_${tableId}">$0.00</strong></div>`);
                }

                // 4) Inserta en el contenedor YA
                $field = $wrap;

                // 5) Solo para SALES: mover el botón Parse bajo el free-text y ocultar la tabla
                if (tableId === 'salesTable' && parseFrom) {
                    const $parseBtn = $actions.find(`#parse_${tableId}`).detach();

                    // localizar el textarea del free text de forma robusta
                    const k = parseFrom;

                    let $free = $sec.find(`#fld_${k}, #${k}, [name="${k}"], [data-rc-key="${k}"]`)
                        .filter('textarea, input').first();
                    if (!$free.length) {
                        // fallback seguro a tu markup actual (.rc-group)
                        $free = $sec.find(`#grp_${k} textarea, #grp_${k} input`).first();
                    }

                    if ($free.length) {
                        const $holder = $('#salesFreeActions').length
                            ? $('#salesFreeActions')
                            : $('<div class="mt-2" id="salesFreeActions"></div>').insertAfter($free);
                        $holder.append($parseBtn);
                    }


                    // ocultar la tabla del formulario (vivirá en el modal)
                    $wrap.hide();
                }

                // 6) Estado inicial
                const rowsInit = Array.isArray(reportAnswers[tableId]) ? reportAnswers[tableId] : [];
                rcTableRenderRows(tableId, cols, rowsInit);
                rcTableSync(tableId, cols, f); // calcula GT si aplica

                // 7) Eventos de tabla
                $wrap.on('input change', 'input', rcDebounce(() => rcTableSync(tableId, cols, f), 120));
                $wrap.find(`#addrow_${tableId}`).on('click', () => rcTableAddRow(tableId, cols));

                // 8) Evento del botón Parse (está MOVIDO; delegación segura por ID)
                // 8) Evento del botón Parse (está MOVIDO; delegación segura por ID)
                // 8) Evento del botón Parse (solo API, sin fallback local)
                // 8) Evento del botón Parse (SOLO API, con logs, sin fallback)
                if (parseFrom) {
                    $(document).off('click', `#parse_${tableId}`).on('click', `#parse_${tableId}`, async () => {
                        // 1) Lee el free text desde ESTA sección ($sec). Si no encuentra, usa reportAnswers como último recurso.
                        const k = parseFrom;
                        let $free = $sec.find(`#fld_${k}, #${k}, [name="${k}"], [data-rc-key="${k}"]`).filter('textarea,input').first();
                        if (!$free.length) $free = $sec.find(`#grp_${k} textarea, #grp_${k} input`).first();

                        const free = (($free.val && $free.val()) || (reportAnswers[k] || '')).toString().trim();
                        if (!free) { showMessage('Paste or type the sales text first.', 'warning'); return; }

                        const $btn = $(`#parse_${tableId}`);
                        const oldHtml = $btn.html();              // guarda "✨ Parse"
                        $btn.prop('disabled', true).html('<i class="bi bi-magic"></i> Converting…');
                        //console.log('[SalesParse] sending text:', free);


                        try {
                            const res = await $.ajax({
                                url: API_BASE + 'parseSales4000.php',
                                method: 'POST',
                                dataType: 'json',
                                data: { text: free }
                            });

                            //console.log('[SalesParse] response:', res);

                            if (res && res.ok === true && Array.isArray(res.rows)) {
                                // normaliza SOLO nombres de campos (sin adivinar)
                                const rows = res.rows.map(r => ({
                                    product: String(r.productName ?? r.product ?? '').trim(),
                                    qty: Number(r.quantity ?? r.qty ?? NaN),
                                    total: Number(r.salesAmount ?? r.amount ?? r.total ?? NaN)
                                })).filter(r => r.product || Number.isFinite(r.qty) || Number.isFinite(r.total));

                                openSalesModal(rows, f);
                                if (typeof res.grand_total === 'number') {
                                    $('#salesModalTotal').text('$' + res.grand_total.toFixed(2));
                                }
                            } else {
                                // API no dio estructura válida → modal vacío (sin fallback)
                                console.warn('[SalesParse] invalid payload, opening empty modal');
                                showMessage('Parser could not extract items. Please edit manually.', 'warning');
                                openSalesModal([], f);
                            }
                        } catch (xhrErr) {
                            console.error('[SalesParse] ajax error:', xhrErr);
                            showMessage('Parser error. Please try again or edit manually.', 'danger');
                            openSalesModal([], f);
                        } finally {
                            $btn.prop('disabled', false).html(oldHtml);
                            $btn.prop('disabled', false);
                        }
                    });
                }

                // INVENTORY: botón Parse
                if (tableId === 'stockTable' && parseFrom) {
                    // 1) Igual que con Sales: movemos el botón Parse al lado del textarea free text
                    const $actions = $wrap.find('.rc-actions'); // acciones originales de la tabla
                    const $parseBtnInv = $actions.find(`#parse_${tableId}`).detach(); // #parse_stockTable
                    // Localiza el textarea origen (stockFreeText)
                    const kInv = parseFrom;
                    let $freeInv = $sec.find(`#fld_${kInv}, #${kInv}, [name="${kInv}"], [data-rc-key="${kInv}"]`)
                        .filter('textarea,input').first();
                    if (!$freeInv.length) {
                        $freeInv = $sec.find(`#grp_${kInv} textarea, #grp_${kInv} input`).first();
                    }
                    if ($freeInv.length) {
                        // si quieres un contenedor dedicado (como salesFreeActions), puedes crear otro:
                        const $holderInv = $('#stockFreeActions').length
                            ? $('#stockFreeActions')
                            : $('<div class="mt-2" id="stockFreeActions"></div>').insertAfter($freeInv);
                        $holderInv.append($parseBtnInv);
                    }

                    // 2) Ocultamos la tabla del wizard (igual que sales)
                    $wrap.hide();

                    // 3) Listener del botón Parse que llama parseInventory179 y abre el modal
                    $(document).off('click', `#parse_${tableId}`).on('click', `#parse_${tableId}`, async () => {
                        // lee el free text
                        const k = parseFrom;
                        let $free = $sec.find(`#fld_${k}, #${k}, [name="${k}"], [data-rc-key="${k}"]`).filter('textarea,input').first();
                        if (!$free.length) $free = $sec.find(`#grp_${k} textarea, #grp_${k} input`).first();
                        const freeTxt = (($free.val && $free.val()) || (reportAnswers[k] || '')).toString().trim();
                        if (!freeTxt) { showMessage('Paste or type the inventory text first.', 'warning'); return; }

                        const $btn = $(`#parse_${tableId}`).prop('disabled', true);

                        try {
                            const res = await $.ajax({
                                url: API_BASE + 'parseInventory4000.php',
                                method: 'POST',
                                dataType: 'json',
                                data: { text: freeTxt }
                            });

                            if (res && res.ok === true && Array.isArray(res.rows)) {
                                // Normalizamos filas: product / qty
                                const rows = res.rows.map(r => ({
                                    product: (r.product ?? r.productName ?? '').toString().trim(),
                                    qty: (r.qty !== undefined && r.qty !== null && r.qty !== '' ?
                                        parseInt(r.qty, 10) :
                                        '')
                                })).filter(r => r.product || r.qty !== '');

                                openInventoryModal(rows, f); // <-- abre el nuevo modal
                            } else {
                                console.warn('[InvParse] invalid payload, opening empty modal');
                                showMessage('Parser could not extract inventory. Please edit manually.', 'warning');
                                openInventoryModal([], f);
                            }
                        } catch (xhrErr) {
                            console.error('[InvParse] ajax error:', xhrErr);
                            showMessage('Inventory parser error. Please try again or edit manually.', 'danger');
                            openInventoryModal([], f);
                        } finally {
                            $btn.prop('disabled', false);
                        }
                    });

                    // 4) Listener para reabrir modal manualmente (si quieres un botón "Edit inventory table")
                    $(document).off('click', `#open_${tableId}_modal`).on('click', `#open_${tableId}_modal`, () => {
                        const rowsNow = Array.isArray(reportAnswers['stockTable']) ? reportAnswers['stockTable'] : [];
                        openInventoryModal(rowsNow, f);
                    });
                }


                // (Opcional) botón “Edit table” para reabrir el modal con lo ya guardado
                $(document).off('click', `#open_${tableId}_modal`).on('click', `#open_${tableId}_modal`, () => {
                    const rows = Array.isArray(reportAnswers['salesTable']) ? reportAnswers['salesTable'] : [];
                    openSalesModal(rows, f);   // <-- f, no fdef
                });


                break;
            }

            default:
                $field = $(`<input class="rc-input" id="fld_${id}" type="text">`).val(val || '');
        }

        if (required) {
            $field.attr('aria-required', 'true').attr('data-required', '1');
        }

        $g.append($field);
        $g.append(`<div class="rc-error" id="err_${id}" style="display:none"></div>`);
        if (f.help) $g.append(`<div class="rc-help">${f.help}</div>`);
        $sec.append($g);

        // listeners
        if (['text', 'number', 'date', 'time', 'textarea'].includes(f.type)) {
            $field.on('input change', rcDebounce(() => rcOnFieldChange(f, $field)));
        } else if (f.type === 'toggle') {
            $field.find('input').on('change', () => { rcSetAnswer(id, $field.find('input').is(':checked')); rcOnAnyChange(); });
        }

    });

    // al entrar, recalcula condiciones por si prefills cambian visibilidad
    rcUpdateVisibilityAll(section);
}


// 2.2 Lógica de tablas (render, add, parse, total)

function rcTableRenderRows(tableId, cols, rows) {
    const $tbody = $(`#body_${tableId}`); $tbody.empty();
    rows.forEach((r, i) => {
        const tds = cols.map(c => {
            const v = r[c.id] ?? '';
            const type = (c.kind && c.kind.startsWith('int')) ? 'number'
                : (c.kind && c.kind.startsWith('money')) ? 'number'
                    : 'text';
            const step = (type === 'number' ? (c.kind && c.kind.startsWith('int') ? '1' : '0.01') : undefined);
            return `<td><input type="${type}" ${step ? `step="${step}"` : ''} value="${v}" data-c="${c.id}" data-i="${i}" class="rc-input"></td>`;
        }).join('');
        const remove = `<td><button type="button" class="btn btn-light rc-delrow" data-i="${i}"><i class="bi bi-trash"></i></button></td>`;
        $tbody.append(`<tr>${tds}${remove}</tr>`);
    });
    $tbody.find('.rc-delrow').on('click', function () {
        const i = Number($(this).data('i'));
        const arr = Array.isArray(reportAnswers[tableId]) ? reportAnswers[tableId] : [];
        arr.splice(i, 1);
        reportAnswers[tableId] = arr;
        rcAutosave();
        rcTableRenderRows(tableId, cols, arr);
        rcTableSync(tableId, cols); // recalc total
    });
}

function rcTableAddRow(tableId, cols) {
    const arr = Array.isArray(reportAnswers[tableId]) ? reportAnswers[tableId] : [];
    const newRow = {}; cols.forEach(c => newRow[c.id] = '');
    arr.push(newRow);
    reportAnswers[tableId] = arr;
    rcAutosave();
    rcTableRenderRows(tableId, cols, arr);
}

function rcTableSync(tableId, cols, f) {
    const arr = [];
    $(`#body_${tableId} tr`).each(function () {
        const row = {};
        $(this).find('input').each(function () {
            const key = $(this).data('c');
            let val = $(this).val();
            // casts
            const def = (cols.find(c => c.id === key) || {});
            if (def.kind && def.kind.startsWith('int')) val = val === '' ? '' : parseInt(val, 10);
            if (def.kind && def.kind.startsWith('money')) val = val === '' ? '' : parseFloat(val);
            row[key] = val;
        });
        // ignora filas completamente vacías
        const filled = Object.values(row).some(v => String(v).trim() !== '');
        if (filled) arr.push(row);
    });
    reportAnswers[tableId] = arr;
    rcAutosave();

    // totalizador para sales
    if (f && f.showGrandTotal) {
        const sum = arr.reduce((s, r) => s + (parseFloat(r.total) || 0), 0);
        $(`#gt_${tableId}`).text(fmtMoney(sum));
        if (f.grandTotalField) {
            reportAnswers[f.grandTotalField] = Number(sum.toFixed(2));
            $(`#fld_${f.grandTotalField}`).val(reportAnswers[f.grandTotalField]);
            rcAutosave();
        }
    }
}

// === SALES MODAL (usa el que ya está en el HTML) ===
function openSalesModal(rows, fdef) {
    const $m = $('#sales-modal');                       // ya existe en el HTML
    const $tb = $('#salesModalTable tbody');
    const $gt = $('#salesModalTotal');

    // 1) poblar filas
    $tb.empty();
    const addRow = (r = { product: '', qty: '', total: '' }) => {
        const i = $tb.children().length;
        const tr = $(`
        <tr>
        <td class="col-product">
        <input
          type="text"
          class="sales-input"
          name="product"
          data-k="product"
          data-i="${i}"
          value="${(r.product ?? '').toString().replace(/"/g, '&quot;')}"
        >
        </td>
        <td class="col-qty">
        <input
          type="number"
          class="sales-input"
          name="qty"
          step="1"
          min="0"
          data-k="qty"
          data-i="${i}"
          value="${(r.qty ?? '').toString().replace(/"/g, '&quot;')}"
        >
        </td>
        <td class="col-amount">
        <input
          type="number"
          class="sales-input"
          name="total"
          step="0.01"
          min="0"
          data-k="total"
          data-i="${i}"
          value="${(r.total ?? '').toString().replace(/"/g, '&quot;')}"
        >
        </td>
        <td class="col-actions">
        <button
          type="button"
          class="btn rc-delrow"
          title="Remove"
          data-i="${i}">
          <i class="bi bi-trash-fill"></i>
        </button>
        </td>
        </tr>
    `);
        $tb.append(tr);
    };



    (rows && rows.length ? rows : [{}]).forEach(addRow);

    // 2) totalizador
    const recalc = () => {
        let sum = 0;
        $tb.find('tr').each(function () {
            const v = parseFloat($(this).find('input[data-k="total"]').val());
            if (!Number.isNaN(v)) sum += v;
        });
        $gt.text(fmtMoney(sum));
    };
    const renumberRows = () => {
        $tb.find('tr').each(function (i) {
            $(this).find('input,button').attr('data-i', i);
        });
    };

    // 3) eventos dentro del modal
    $tb.off('click', '.rc-delrow').on('click', '.rc-delrow', function () {
        $(this).closest('tr').remove();
        renumberRows();
        recalc();
    });
    $tb.off('input change').on('input change', 'input', rcDebounce(recalc, 120));

    // 4) aceptar → persistir y sincronizar totales/campos
    $('#salesModalAccept').off('click').on('click', () => {
        const arr = [];
        $tb.find('tr').each(function () {
            const product = $(this).find('input[data-k="product"]').val().trim();
            const qty = $(this).find('input[data-k="qty"]').val();
            const total = $(this).find('input[data-k="total"]').val();
            if (product || qty || total) {
                arr.push({
                    product,
                    qty: qty === '' ? '' : parseInt(qty, 10),
                    total: total === '' ? '' : parseFloat(total)
                });
            }
        });

        // GT numérico
        let grand = 0;
        arr.forEach(r => { if (typeof r.total === 'number' && !Number.isNaN(r.total)) grand += r.total; });

        // 4.1 guardar en respuestas
        reportAnswers['salesTable'] = arr;

        // 4.2 refrescar la tabla oculta + su GT
        if (fdef && fdef.columns) {
            rcTableRenderRows('salesTable', fdef.columns, arr);
            rcTableSync('salesTable', fdef.columns, fdef);
        }

        // 4.3 sincronizar el input TOTAL SALES (ajusta si tu key es otra)
        const setTotalSales = (valNum) => {
            const $total = $('#fld_totalSales, [name="totalSales"], [data-rc-key="totalSales"]')
                .filter('input').first();
            if ($total.length) {
                $total.val(valNum.toFixed(2)).trigger('input').trigger('change');
            }
            reportAnswers['totalSales'] = parseFloat(valNum.toFixed(2));
            rcAutosave && rcAutosave();
        };
        setTotalSales(grand);

        // 4.4 cerrar y feedback
        $m.removeClass('show').attr('aria-hidden', 'true');
        showMessage('Sales parsed and applied ✅', 'success');
    });

    // 5) cerrar por backdrop/X
    $m.off('click.modal').on('click.modal', '[data-close="1"]', () => {
        $m.removeClass('show').attr('aria-hidden', 'true');
    });

    // 6) abrir
    $m.addClass('show').attr('aria-hidden', 'false');
    recalc();
}

// --- Parsers BONUS ---
function rcTableParseFromText(tableId, cols, f) {
    const src = f.parseFrom;
    const txt = (reportAnswers[src] || '').toString();
    let rows = [];
    if (tableId === 'salesTable') rows = rcParseSales(txt);
    else if (tableId === 'stockTable') rows = rcParseInventory(txt);
    else if (tableId === 'promotedTable' || tableId === 'competitorTable') rows = rcParseCSVProducts(txt);

    reportAnswers[tableId] = rows;
    rcAutosave();
    rcTableRenderRows(tableId, cols, rows);
    rcTableSync(tableId, cols, f);
}


// Fallback local parser para Sales (flexible con formatos)
function rcParseSales(text) {
    const rows = [];
    const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);

    for (let line of lines) {
        // 1) Monto: $ 1,234.56 ó 1234.56 ó 1234
        const amtMatch = line.match(/(?:\$|\b)\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})|[0-9]+(?:[.,][0-9]{2})?)(?!\S)/);
        let amount = '';
        if (amtMatch) {
            let raw = amtMatch[1];
            // normaliza “1.234,56” o “1,234.56” → 1234.56
            if (/,/.test(raw) && /\./.test(raw)) {
                // asume formato US: quitar comas de miles
                raw = raw.replace(/,/g, '');
            } else if (/,/.test(raw) && !/\./.test(raw)) {
                // asume formato EU: coma = decimal
                raw = raw.replace(/\./g, '').replace(',', '.');
            }
            amount = parseFloat(raw);
            line = line.replace(amtMatch[0], '').trim();
        }

        // 2) Qty: “qty 2”, “x2”, “sold 2”, o número suelto al final
        let qty = '';
        const qtyMatch =
            line.match(/\bqty\s*[:x-]?\s*(\d+)\b/i) ||
            line.match(/\bx\s*(\d+)\b/i) ||
            line.match(/\bsold\s*(\d+)\b/i) ||
            line.match(/(\d+)\s*$/);
        if (qtyMatch) {
            qty = parseInt(qtyMatch[1], 10);
            line = line.replace(qtyMatch[0], '').trim();
        }

        // 3) TXN (opcional): (ABC123) al final
        const txnMatch = line.match(/\(([^)]+)\)\s*$/);
        const txn = txnMatch ? txnMatch[1].trim() : '';
        if (txnMatch) line = line.replace(txnMatch[0], '').trim();

        // 4) Producto: lo que quede
        let product = line.replace(/[-–—,:;]+$/, '').trim();

        // filtra líneas vacías
        if (!product && qty === '' && amount === '') continue;

        rows.push({ product, qty, total: amount, txn });
    }

    // si hay líneas pero sin montos, no falles: deja 0
    return rows.map(r => ({
        product: r.product || '',
        qty: Number.isFinite(r.qty) ? r.qty : '',
        total: Number.isFinite(r.total) ? r.total : ''
    }));
}

// === INVENTORY MODAL (similar al Sales modal, pero sin $ total) ===
function openInventoryModal(rows, fdef) {
    const $m = $('#inventory-modal');
    const $tb = $('#inventoryModalTable tbody');

    // 1) poblar filas
    $tb.empty();
    const addRow = (r = { product: '', qty: '' }) => {
        const i = $tb.children().length;
        const tr = $(`
        <tr>
          <td class="col-product">
            <input
              type="text"
              class="sales-input"
              name="product"
              data-k="product"
              data-i="${i}"
              value="${(r.product ?? '').toString().replace(/"/g, '&quot;')}"
            >
          </td>
          <td class="col-qty">
            <input
              type="number"
              class="sales-input"
              name="qty"
              step="1"
              min="0"
              data-k="qty"
              data-i="${i}"
              value="${(r.qty ?? '').toString().replace(/"/g, '&quot;')}"
            >
          </td>
          <td class="col-actions">
            <button
              type="button"
              class="btn rc-delrow"
              title="Remove"
              data-i="${i}">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `);
        $tb.append(tr);
    };

    (rows && rows.length ? rows : [{}]).forEach(addRow);

    const renumberRows = () => {
        $tb.find('tr').each(function (i) {
            $(this).find('input,button').attr('data-i', i);
        });
    };

    // 2) eventos: borrar fila
    $tb.off('click', '.rc-delrow').on('click', '.rc-delrow', function () {
        $(this).closest('tr').remove();
        renumberRows();
    });

    // 3) botón Add row dentro del modal
    $('#addrow_stockTable_modal').off('click').on('click', () => {
        addRow();
        renumberRows();
    });

    // 4) Accept → persistimos en reportAnswers.stockTable y refrescamos la tabla oculta
    $('#inventoryModalAccept').off('click').on('click', () => {
        const arr = [];
        $tb.find('tr').each(function () {
            const product = $(this).find('input[data-k="product"]').val().trim();
            const qty = $(this).find('input[data-k="qty"]').val();
            if (product || qty) {
                arr.push({
                    product,
                    qty: qty === '' ? '' : parseInt(qty, 10)
                });
            }
        });

        // 4.1 guardar en respuestas
        reportAnswers['stockTable'] = arr;

        // 4.2 refrescar la tabla oculta en el wizard
        if (fdef && fdef.columns) {
            rcTableRenderRows('stockTable', fdef.columns, arr);
            rcTableSync('stockTable', fdef.columns, fdef);
        }

        // 4.3 cerrar modal y feedback
        $m.removeClass('show').attr('aria-hidden', 'true');
        showMessage('Inventory parsed and applied ✅', 'success');
    });

    // 5) cerrar modal por backdrop / Cancel / X
    $m.off('click.modal').on('click.modal', '[data-close="1"]', () => {
        $m.removeClass('show').attr('aria-hidden', 'true');
    });

    // 6) abrir modal
    $m.addClass('show').attr('aria-hidden', 'false');
}


function rcParseInventory(txt) {
    // Ej: "Product A 4 units, Product B 6 units"
    const parts = txt.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
    const out = [];
    parts.forEach(p => {
        const m = p.match(/^(.*?)[\s:]*([0-9]+)\s*(units?|u|pcs?)?$/i);
        if (m) { out.push({ product: m[1].trim(), qty: parseInt(m[2], 10) }); }
        else if (p) { out.push({ product: p, qty: '' }); }
    });
    return out;
}

function rcParseCSVProducts(txt) {
    if (!txt) return [];
    return txt.split(',').map(s => s.trim()).filter(Boolean).map(name => ({ product: name }));
}




function rcOnFieldChange(f, $field) {
    const id = f.id;
    let v = $field.val();
    if (f.type === 'number') { v = v === '' ? '' : Number(v); }
    rcSetAnswer(id, v);
    // validación instantánea
    const err = rcValidateField(f, reportAnswers[id]);
    rcShowError(id, err);
    if (id === "interactions") {
        const samplesDef = (reportSchema.sections || [])
            .flatMap(sec => sec.fields || [])
            .find(x => x.id === "samples");

        if (samplesDef) {
            const samplesErr = rcValidateField(samplesDef, reportAnswers.samples);
            rcShowError("samples", samplesErr);
        }
    }
    rcUpdateVisibilityAll(); // por si hay campos dependientes
}

function rcSetAnswer(id, val) {
    reportAnswers[id] = val;
    rcAutosave();
}
const rcAutosave = rcDebounce(() => {
    try { localStorage.setItem(rcStorageKey(currentReportCtx.id), JSON.stringify(reportAnswers)); } catch (_e) { }
}, 400);
function rcLoadAutosave(id) {
    try { const s = localStorage.getItem(rcStorageKey(id)); return s ? JSON.parse(s) : null; } catch (_e) { return null; }
}


// ************* Condiciones y validaciones

function rcEvalVisible(f, ans) {
    if (!f.visibleWhen) return true;
    return f.visibleWhen.every(cond => rcCheckCond(cond, ans));
}
function rcEvalRequired(f, ans, base) {
    if (!f.requiredWhen) return base;
    return base || f.requiredWhen.every(cond => rcCheckCond(cond, ans));
}
function rcCheckCond(c, ans) {
    const left = ans[c.question];
    const op = c.op || '=';
    const val = c.value;
    switch (op) {
        case '=': return Array.isArray(left) ? left.includes(val) : left == val;
        case '!=': return Array.isArray(left) ? !left.includes(val) : left != val;
        case 'in': return Array.isArray(left) ? left.includes(val) : (Array.isArray(val) ? val.includes(left) : false);
        case 'not-in': return Array.isArray(left) ? !left.includes(val) : (Array.isArray(val) ? !val.includes(left) : true);
        case '>': return Number(left) > Number(val);
        case '>=': return Number(left) >= Number(val);
        case '<': return Number(left) < Number(val);
        case '<=': return Number(left) <= Number(val);
        default: return false;
    }
}

function rcValidateField(f, v) {

    const req = rcEvalRequired(f, reportAnswers, f.required === true);

    if (f.type === "file") {
        const count = (reportFiles?.[f.id] || []).length;
        const minFiles = Number(f.minFiles || (req ? 1 : 0));
        if (minFiles > 0 && count < minFiles) {

            // SOLO EXPRESS PHOTOS
            if (minFiles > 0 && count < minFiles) {
                const remaining = minFiles - count;

                if (count === 0) {
                    return `Please add at least ${minFiles} photos to continue.`;
                }

                if (remaining === 1) {
                    return `Please add 1 more photo to continue.\n(${count} of ${minFiles} added)`;
                }

                return `Please add ${remaining} more photos to continue.\n(${count} of ${minFiles} added)`;
            }

            // STAFFING queda exactamente como estaba
            return "Required.";
        }
        return "";
    }

    if (req) {
        if (f.type === 'toggle') { if (!v) return 'Required.'; }
        else if (f.type === 'multiChoice') { if (!Array.isArray(v) || v.length === 0) return 'Required.'; }
        else if (v === undefined || v === null || String(v).trim() === '') return 'Required.';
    }
    if (v === '' || v === null || v === undefined) return '';
    if (f.type === 'number') {
        if (f.min != null && Number(v) < f.min) return `Min ${f.min}.`;
        if (f.max != null && Number(v) > f.max) return `Max ${f.max}.`;
    }
    if (f.minLength && String(v).length < f.minLength) return `Min ${f.minLength} chars.`;
    if (f.maxLength && String(v).length > f.maxLength) return `Max ${f.maxLength} chars.`;
    if (f.regex) {
        try { const re = new RegExp(f.regex); if (!re.test(String(v))) return 'Invalid format.'; } catch (_e) { }
    }
    if (f.integer === true && v !== '' && v !== null && v !== undefined) {
        if (!Number.isInteger(Number(v))) return 'Must be an integer.';
    }
    if (f.type === 'number' && v !== '' && v !== null && v !== undefined) {
        if (f.min != null && Number(v) < f.min) return `Min ${f.min}.`;
        if (f.max != null && Number(v) > f.max) return `Max ${f.max}.`;
    }

    // Regla especial: interactions ≤ traffic upper bound
    if (f.maxFromTrafficId) {
        const range = reportAnswers[f.maxFromTrafficId]; // p.ej. "100-250" o "1000+"
        const upper = rcTrafficUpperBound(range);
        if (isFinite(upper) && Number(v) > upper) return `Must be ≤ ${upper} (traffic).`;
    }

    // Regla especial: samples ≤ interactions
    if (f.maxFromFieldId) {
        const upper = Number(reportAnswers[f.maxFromFieldId]);
        if (!Number.isNaN(upper) && Number(v) > upper) {
            return `Must be ≤ ${upper} (interactions).`;
        }
    }

    if (f.id === "totalSales") {
        const salesText = String(reportAnswers.salesFreeText || "").trim().toUpperCase();
        const n = Number(v);

        if (v === undefined || v === null || String(v).trim() === "") {
            return "Total sales is required. Write 0 if no sales.";
        }

        if (Number.isNaN(n) || n < 0) {
            return "Total sales must be 0 or greater.";
        }

        if (salesText !== "N/A" && salesText !== "NA" && n <= 0) {
            return "Total sales must be greater than 0, or write N/A if no sales.";
        }
    }

    return '';
}



function rcTrafficUpperBound(val) {
    if (!val) return Infinity;
    if (val.endsWith('+')) return Infinity;
    const m = val.match(/(\d+)\s*-\s*(\d+)/);
    if (m) return parseInt(m[2], 10);
    const m2 = val.match(/(\d+)/g);
    return m2 && m2.length ? parseInt(m2[m2.length - 1], 10) : Infinity;
}

function rcShowError(id, msg) {
    const $g = $(`#grp_${id}`);
    const $e = $(`#err_${id}`);
    if (msg) { $g.addClass('rc-invalid'); $e.text(msg).show(); }
    else { $g.removeClass('rc-invalid'); $e.hide().text(''); }
}

function rcUpdateVisibilityAll(section) {
    const sections = section ? [section] : (reportSchema.sections || []);
    sections.forEach(sec => {
        (sec.fields || []).forEach(f => {
            const vis = rcEvalVisible(f, reportAnswers);
            const $g = $(`#grp_${f.id}`);
            vis ? $g.show() : $g.hide();
        });
    });
}


// Archivos: manejo, previews, límites

function rcHandleFiles(f, files) {
    const fieldId = f.id;
    if (!reportFiles[fieldId]) reportFiles[fieldId] = [];
    const maxFiles = f.maxFiles ?? 12;
    const maxSize = (f.maxSizeMB || 8) * 1024 * 1024;
    const accept = f.accept || [];

    files.forEach(file => {
        if (reportFiles[fieldId].length >= maxFiles) { showMessage(`Max ${maxFiles} files for ${f.label}.`, 'warning'); return; }
        if (file.size > maxSize) { showMessage(`${file.name} too large.`, 'warning'); return; }
        if (accept.length) {
            const ok = accept.some(a => a === '*/*' || (a.endsWith('/*') ? file.type.startsWith(a.replace('/*', '/')) : file.type === a));
            if (!ok) { showMessage(`${file.name} type not allowed.`, 'warning'); return; }
        }
        const blobUrl = URL.createObjectURL(file);
        reportFiles[fieldId].push({ file, blobUrl });
    });

    rcRenderGallery(fieldId);
}

function rcRefreshPhotoValidation(fieldId = "photos") {

    const f = rcFindFieldDef(fieldId);
    if (!f) return;

    const err = rcValidateField(
        f,
        reportAnswers[fieldId]
    );

    rcShowError(fieldId, err);
    rcApplyFooterState();
}


function rcRenderGallery(fieldId) {

    const $gal = $(`#gal_${fieldId}`);
    $gal.empty();

    (reportFiles[fieldId] || []).forEach((it, i) => {

        const isImg = it.file.type.startsWith('image/');

        const $t = $(`
            <div class="rc-thumb" data-i="${i}">
                ${isImg
                ? `<img src="${it.blobUrl}" alt="">`
                : `<i class="bi bi-file-earmark" style="font-size:28px;opacity:.8"></i>`
            }

                <button
                    class="rc-remove"
                    type="button"
                    title="Remove">
                    <i class="bi bi-x"></i>
                </button>
            </div>
        `);

        $t.find('.rc-remove').on('click', () => {

            URL.revokeObjectURL(it.blobUrl);

            reportFiles[fieldId].splice(i, 1);

            rcRenderGallery(fieldId);
        });

        $gal.append($t);
    });

    // Siempre recalcular:
    // mensaje de validación + estado del botón Next
    rcRefreshPhotoValidation(fieldId);
}




// Navegación entre pasos y envío

function rcVisibleFields(sec) {
    return (sec.fields || []).filter(f => rcEvalVisible(f, reportAnswers));
}
function rcValidateSection(sec) {
    let ok = true;
    rcVisibleFields(sec).forEach(f => {
        const err = rcValidateField(f, reportAnswers[f.id]);
        rcShowError(f.id, err);
        if (err) ok = false;
    });
    return ok;
}

let rcSummaryPolishBusy = false;
let rcLastPolishCache = {
    urgentIssues: { in: "", out: "" },
    eventSummary: { in: "", out: "" }
};

function rcScrollStepTop() {
    const view = document.getElementById('report-capture-view');
    const appHeader = document.querySelector('body > header, header');

    if (!view) return;

    const appHeaderH = appHeader ? Math.ceil(appHeader.getBoundingClientRect().height) : 0;
    const viewTop = view.getBoundingClientRect().top + window.pageYOffset;

    // Restamos el header global para que no tape el título del reporte
    const targetY = Math.max(0, viewTop - appHeaderH - 8);

    requestAnimationFrame(() => {
        window.scrollTo(0, targetY);

        setTimeout(() => {
            window.scrollTo(0, targetY);
        }, 30);
    });
}

async function rcGo(delta) {
    const sections = reportSchema.sections || [];
    const cur = rcCurrentStep;
    const next = cur + delta;

    // valida antes de avanzar
    if (delta > 0 && !rcValidateSection(sections[cur])) return;

    // si voy a Next, primero traducir/pulir ISSUES + SUMMARY
    if (delta > 0) {
        const did = await rcMaybePolishSummaryFieldsBeforeNext();
        if (!did) return;

        // ✅ revalidar DESPUÉS del polish/sanitización
        const stillValid = rcValidateSection(sections[cur]);
        if (!stillValid) {
            const $summary = $("#fld_eventSummary");
            const summaryVal = ($summary.val() || "").trim();

            if ($summary.length && summaryVal === "") {
                rcShowError("eventSummary", "Required.");
                showMessage("Please complete the summary.", "warning");
                $summary.trigger("focus");
            }

            return;
        }
    }

    if (next < 0 || next >= sections.length) return;

    $(`.rc-step[data-i=${cur}]`).removeClass('is-active');
    $(`.rc-section[data-i=${cur}]`).removeClass('is-active').hide();

    rcCurrentStep = next;

    $(`.rc-step[data-i=${next}]`).addClass('is-active');
    $(`.rc-section[data-i=${next}]`).addClass('is-active').show();

    rcUpdateFooterButtons();
    rcScrollStepTop();
}


function rcUpdateFooterButtons() {
    rcApplyFooterState();
}


async function rcSubmit() {
    // 1) Validación completa de secciones

    // =====================================================
    // PHOTO VALIDATION - SCHEMA DRIVEN
    // =====================================================
    console.log("🚀 rcSubmit START");
    const photoField = rcFindFieldDef("photos");

    if (photoField) {

        const photosCount = (reportFiles?.photos || []).length;

        const minPhotos = Number(photoField.minFiles ?? (photoField.required ? 1 : 0));

        if (photosCount < minPhotos) {

            const photoWord = minPhotos === 1 ? "photo" : "photos";

            rcShowError("photos", `At least ${minPhotos} ${photoWord} are required.`);

            showMessage(`📷 At least ${minPhotos} ${photoWord} are required.`, "danger");

            const idx = (reportSchema.sections || []).findIndex(section =>
                (section.fields || []).some(field => field.id === "photos")
            );

            if (idx >= 0) {
                rcCurrentStep = idx;

                $('.rc-section').removeClass('is-active').hide();
                $(`.rc-section[data-i=${idx}]`).addClass('is-active').show();

                $('.rc-step').removeClass('is-active');
                $(`.rc-step[data-i=${idx}]`).addClass('is-active');

                rcUpdateFooterButtons();
                rcScrollStepTop();
            }

            return;
        }
    }

    const sections = reportSchema.sections || [];
    for (let i = 0; i < sections.length; i++) {
        if (!rcValidateSection(sections[i])) {
            if (i !== rcCurrentStep) {
                rcCurrentStep = i;
                $('.rc-section').removeClass('is-active').hide();
                $(`.rc-section[data-i=${i}]`).addClass('is-active').show();
                $('.rc-step').removeClass('is-active');
                $(`.rc-step[data-i=${i}]`).addClass('is-active');
                rcUpdateFooterButtons();
                rcScrollStepTop();
            }
            showMessage('Please complete required fields.', 'warning');
            return;
        }
    }
    console.log("✅ rcSubmit VALIDATION PASSED");
    const $btn = $('#rcSubmit');
    $btn.prop('disabled', true).html('<i class="bi bi-hourglass-split"></i> Submitting...');

    const fd = new FormData();

    // =====================================================
    // REPORT TYPE / EXPRESS PHOTO RULE
    // =====================================================

    const reportType = currentReportCtx?.reportType === "EXPRESS" ? "EXPRESS" : "STAFFING";

    fd.append("reportType", reportType);

    fd.append("expressPhotosRequired", reportType === "EXPRESS" ? String(Number(expressPhotosRequired || 0)) : "0");

    // =====================================================

    const isPendingReport = currentReportCtx && typeof currentReportCtx.idx === "number";
    const s = selectedShift || {};

    const reportPk = reportType === "EXPRESS"
        ? (currentReportCtx?.pk || '')
        : (
            isPendingReport
                ? (currentReportCtx?.pk || '')
                : (s.pk ?? s.id ?? '')
        );

    const reportEventName = isPendingReport
        ? (currentReportCtx?.eventName || '')
        : (s.eventName || '');


    const reportShiftDate =
        reportType === "EXPRESS"
            ? (currentReportCtx?.date || new Date().toISOString().slice(0, 10))
            : (
                isPendingReport
                    ? (currentReportCtx?.shiftDateForReport || currentReportCtx?.date || '')
                    : (s.order0 || '')
            );

    const reportMarket = isPendingReport
        ? (currentReportCtx?.market || '')
        : (s.market || '');

    const reportLocation1 = isPendingReport
        ? (currentReportCtx?.location1 || '')
        : (s.location1 || '');

    fd.append('code', promoterCode);
    fd.append('ip', ip);
    fd.append('country', country);
    fd.append('city', city);

    fd.append('pk', reportPk);
    fd.append('promoterCode', promoterCode || '');
    fd.append('promoterName', promoterName || '');
    fd.append('eventName', reportEventName);
    fd.append('shiftDate', reportShiftDate);
    fd.append('market', reportMarket);
    fd.append('location1', reportLocation1);
    fd.append('reportId', currentReportCtx?.id || '');
    fd.append('schemaId', reportSchema?.id || '');
    fd.append('longIdShift', currentReportCtx?.longIdShiftForReport || '');

    // (Opcional) Texto libre si lo usas
    if (reportAnswers && reportAnswers.freeText) {
        fd.append('reportText', String(reportAnswers.freeText || ''));
    }

    // Archivos del wizard
    Object.keys(reportFiles || {}).forEach(fid => {
        (reportFiles[fid] || []).forEach((it, i) => {
            const realFile = it?.file || it;
            if (realFile instanceof File || realFile instanceof Blob) {
                fd.append(`${fid}[]`, realFile, realFile.name || `${fid}_${i}`);
            }
        });
    });

    // === SALES REPORT ===
    // Siempre capturamos el texto libre aunque NO conviertan a tabla
    const salesFreeText = ($("#fld_salesFreeText").val() || reportAnswers?.salesFreeText || "").toString().trim();

    reportAnswers.salesFreeText = salesFreeText;
    fd.append("salesFreeText", salesFreeText);

    // submitReport espera sales_qty[], sales_product[], sales_amount[]
    const salesRows = Array.isArray(reportAnswers?.salesTable) ? reportAnswers.salesTable : [];

    if (salesRows.length) {
        for (const r of salesRows) {
            const qty = parseInt(r?.qty ?? 0, 10) || 0;
            const product = (r?.product ?? '').toString().trim();
            const amount = parseFloat(r?.total ?? 0) || 0;

            if (qty > 0 && product) {
                fd.append('sales_qty[]', qty);
                fd.append('sales_product[]', product);
                fd.append('sales_amount[]', amount);
            }
        }
    }

    // PROMOTED PRODUCTS
    (function collectPromoted() {
        const $host = $('.rc-promoted').closest('div');
        const getter =
            ($host && typeof $host.data('getPromotedRows') === 'function')
                ? $host.data('getPromotedRows')
                : ($('#rcPromotedTable').closest('div').data('getPromotedRows'));

        const rows = (typeof getter === 'function') ? getter() : [];
        reportAnswers.promotedTable = rows;
    })();

    // COMPETITORS BRANDS
    (function collectCompetitors() {
        const $host = $('.rc-competitors').closest('div');
        const getter =
            ($host && typeof $host.data('getCompetitorRows') === 'function')
                ? $host.data('getCompetitorRows')
                : ($('#rcCompetitorsTable').closest('div').data('getCompetitorRows'));

        const rows = (typeof getter === 'function') ? getter() : [];
        reportAnswers.competitorsTable = rows;
    })();

    // =====================================================
    // EXPRESS ADMIN TASK PREFIX
    // =====================================================

    let finalExpressSummary = "";

    if (reportType === "EXPRESS") {

        const originalSummary = String(
            reportAnswers?.eventSummary || ""
        ).trim();

        /* Modificado por cambio en la especificación
        const isAdminTask =
            Number(canPerformAdminTasks || 0) === 1 &&
            reportAnswers?.taskType === "ADMIN";
        */

        const isAdminTask = 0;

        finalExpressSummary = isAdminTask
            ? `ADMIN : ${originalSummary}`
            : originalSummary;

        // Enviamos al backend el Summary definitivo,
        // pero NO modificamos reportAnswers en memoria.
        const answersToSubmit = {
            ...reportAnswers,
            eventSummary: finalExpressSummary
        };

        fd.append("answers", JSON.stringify(answersToSubmit));

    } else {

        fd.append("answers", JSON.stringify(reportAnswers || {}));
    }

    ///////////////////////////////////////////////////////////////////
    console.log("📤 rcSubmit BEFORE AJAX");

    console.log("reportType:", reportType);
    console.log("reportPk:", reportPk);
    console.log("reportEventName:", reportEventName);
    console.log("reportShiftDate:", reportShiftDate);

    console.log(
        "FORM DATA:",
        Object.fromEntries(fd.entries())
    );
    ///////////////////////////////////////////////////////////////////


    $.ajax({
        url: API_BASE + 'submitReport4000.php',
        method: 'POST',
        data: fd,
        processData: false,
        contentType: false,
        dataType: 'json',

        success: function (resp) {
            if (!resp || !resp.ok) {
                showMessage(resp?.error ? `Submit error: ${resp.error}` : 'Submit failed.', 'danger');
                return;
            }

            showMessage('Report submitted ✅', 'success');

            try {
                localStorage.removeItem(rcStorageKey(currentReportCtx?.id));
            } catch (_e) { }

            if (
                currentReportCtx &&
                Array.isArray(pendingReports) &&
                typeof currentReportCtx.idx === "number" &&
                currentReportCtx.idx >= 0
            ) {
                pendingReports.splice(currentReportCtx.idx, 1);
                pendingReportsNumber = Math.max(0, (pendingReportsNumber || 0) - 1);
                setReportsBadge(pendingReportsNumber);
                renderPendingReports();
            }

            // =====================================================
            // EXPRESS REPORT -> EXPRESS OUT
            // =====================================================

            if (rcAfterSubmitAction?.type === "EXPRESS_REPORT_CHECKOUT") {

                // Save summary BEFORE closing the report,
                // because closing may clear reportAnswers.

                rcAfterSubmitAction = null;

                // Use exactly the same final Summary that was sent
                // to reportsHeader.
                pendingExpressTasksText = finalExpressSummary;

                // The report already collected Tasks Completed,
                // so EXPRESS OUT must not open the old tasks modal again.
                bypassExpressTasksModalOnce = true;

                closeReportCapture(true);


                setTimeout(() => {
                    const modalEl = document.getElementById('postReportModal');
                    const proceedBtn = document.getElementById('postReportProceedBtn');
                    const instruction = modalEl?.querySelector('.post-report-instruction');

                    if (!modalEl || !proceedBtn || !window.bootstrap?.Modal) {
                        showMessage(
                            'Report saved. Please proceed with Express Check Out.',
                            'success'
                        );
                        return;
                    }

                    if (instruction) {
                        instruction.textContent =
                            'Press Continue to proceed with Express Check Out.';
                    }

                    const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl, {
                        backdrop: 'static',
                        keyboard: false
                    });

                    let locked = false;

                    const proceed = () => {
                        if (locked) return;
                        locked = true;
                        bsModal.hide();
                    };

                    const onKeyDown = (ev) => {
                        if (ev.key === 'Enter') {
                            ev.preventDefault();
                            proceed();
                        }
                    };

                    modalEl.addEventListener('shown.bs.modal', () => {
                        proceedBtn.focus();
                        document.addEventListener('keydown', onKeyDown);
                    }, { once: true });

                    modalEl.addEventListener('hidden.bs.modal', () => {
                        document.removeEventListener('keydown', onKeyDown);
                        proceedBtn.removeEventListener('click', proceed);
                        handleActionClick("EXPRESS OUT");
                    }, { once: true });

                    proceedBtn.addEventListener('click', proceed);

                    bsModal.show();
                }, 80);

                return;
            }

            if (rcAfterSubmitAction && rcAfterSubmitAction.type === "REPORT_CHECKOUT") {
                rcAfterSubmitAction = null;

                if (selectedShift) {
                    selectedShift.reportDone = 1;
                    localStorage.setItem(`rc_report_done_${selectedShift.pk}`, "1");
                }

                closeReportCapture(true);

                setTimeout(() => {
                    const modalEl = document.getElementById('postReportModal');
                    const proceedBtn = document.getElementById('postReportProceedBtn');

                    if (!modalEl || !proceedBtn || typeof bootstrap === "undefined" || !bootstrap.Modal) {
                        setTimeout(() => handleActionClick("CHECK OUT"), 200);
                        return;
                    }

                    const bsModal = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false });
                    let locked = false;

                    const proceed = () => {
                        if (locked) return;
                        locked = true;
                        try { bsModal.hide(); } catch (_) { }
                        setTimeout(() => handleActionClick("CHECK OUT"), 150);
                    };

                    const onKeyDown = (ev) => {
                        if (ev.key === 'Enter') {
                            ev.preventDefault();
                            proceed();
                        }
                    };

                    modalEl.addEventListener('shown.bs.modal', () => {
                        try { proceedBtn.focus(); } catch (_) { }
                        document.addEventListener('keydown', onKeyDown);
                    }, { once: true });

                    modalEl.addEventListener('hidden.bs.modal', () => {
                        document.removeEventListener('keydown', onKeyDown);
                    }, { once: true });

                    proceedBtn.addEventListener('click', proceed, { once: true });

                    bsModal.show();
                }, 80);

                return;
            }

            closeReportCapture(true);
        },

        error: function (xhr, _st, err) {
            console.error("submitReport error:", xhr?.responseText || err);
            showMessage('Submit error: ' + (xhr?.responseText || err || 'network'), 'danger');
        },

        complete: function () {
            $btn.prop('disabled', false).html('<i class="bi bi-send"></i> Submit');
        }
    });
}



async function rcComputeSha256(fileOrBlob) {
    const buffer = await fileOrBlob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function validateImagesBatchWithServer(fileBlobs) {
    const fd = new FormData();

    fileBlobs.forEach((fileBlob, idx) => {
        fd.append("files[]", fileBlob, fileBlob.name || `report_image_${idx + 1}.jpg`);
    });

    fd.append("code", promoterCode || "");
    fd.append("ip", ip || "Unknown");
    fd.append("country", country || "Unknown");
    fd.append("city", city || "Unknown");

    try {
        const res = await $.ajax({
            url: API_BASE + "scanDatabaseImages4000.php",
            method: "POST",
            data: fd,
            processData: false,
            contentType: false,
            dataType: "json",
            timeout: 120000
        });

        if (!res || res.ok !== true || !Array.isArray(res.results)) {
            return {
                ok: false,
                reason: res?.reason || "Invalid batch validation response",
                results: []
            };
        }

        return {
            ok: true,
            results: res.results
        };

    } catch (err) {
        console.error("[REPORT PHOTO BATCH VALIDATION] ajax error:", err);
        return {
            ok: false,
            reason: "Validation failed (network/server)",
            results: []
        };
    }
}

function rcEscapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, function (m) {
        return ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[m];
    });
}



function buildUploadStatusLines(prefix, messages) {
    return `
        <div id="${prefix}Lines" class="upload-status-lines">
            ${messages.map((message, index) => `
                <div
                    id="${prefix}Line${index + 1}"
                    class="upload-status-line"
                >${rcEscapeHtml(String(message))}</div>
            `).join("")}
        </div>
    `;
}

function rcBuildPhotoValidationHtml(_acceptedList, rejectedList) {
    const messages = [];

    const limitItems = rejectedList.filter(item => item.limitExceeded);
    const realRejectedItems = rejectedList.filter(item => !item.limitExceeded);

    realRejectedItems.forEach(item => {
        messages.push(String(item.name || "Photo"));

        if (item.reason) {
            messages.push(String(item.reason));
        }
    });

    if (limitItems.length) {
        const maxPhotos = reportSchema?.sections
            ?.flatMap(s => s.fields || [])
            ?.find(f => f.id === "photos")?.maxFiles ?? 6;

        messages.push(`Maximum ${maxPhotos} photos allowed.`);

        messages.push(
            limitItems.length === 1
                ? "The additional photo was not added."
                : `${limitItems.length} additional photos were not added.`
        );
    }

    return buildUploadStatusLines("rcPhotoDetail", messages);
}

function rcSetPhotoValidationResult(summaryMsg, acceptedList, rejectedList, toneClass) {
    const $status = rcEnsurePhotoStatusEl();
    $status
        .removeClass(
            "d-none rc-photo-status--info rc-photo-status--ok " +
            "rc-photo-status--warn rc-photo-status--err"
        )
        .addClass(toneClass)
        .html(`
            <div class="gl-photo-upload-result">
                <div class="gl-photo-upload-title">
                    PHOTO UPLOAD STATUS
                </div>
                <div class="gl-photo-upload-summary">
                    <div id="rcPhotoSummaryLine" class="upload-status-line">${rcEscapeHtml(summaryMsg)}
                    </div>
                </div>
                <div class="gl-photo-upload-details">
                    ${rcBuildPhotoValidationHtml(acceptedList, rejectedList)}
                </div>
            </div>
        `);
}


function rcGetRejectedPhotosReadMs(rejectedCount) {
    const n = Number(rejectedCount || 0);

    if (n <= 0) return 3500;

    // 6.5s base + 2.2s por imagen rechazada
    // mínimo 8s, máximo 30s
    return Math.min(30000, Math.max(8000, 6500 + (n * 2200)));
}

function rcSchedulePhotoStatusHide(rejectedCount) {
    if (rcPhotoStatusHideTimer !== null) {
        clearTimeout(rcPhotoStatusHideTimer);
        rcPhotoStatusHideTimer = null;
    }

    // Si hubo rechazo, queda visible hasta la próxima carga
    // o hasta salir del formulario.
    if (Number(rejectedCount) > 0) return;

    // Si todo fue aceptado, permanece diez segundos.
    rcPhotoStatusHideTimer = setTimeout(() => {
        rcPhotoStatusHideTimer = null;

        if (rcPhotosProcessing) return;

        $("#rcPhotoStatus")
            .addClass("d-none")
            .removeClass(
                "rc-photo-status--info rc-photo-status--ok " +
                "rc-photo-status--warn rc-photo-status--err"
            )
            .empty();
    }, 10000);
}

async function rcConvertHeicToJpgIfNeeded(file) {

    const name = (file.name || "").toLowerCase();
    const type = (file.type || "").toLowerCase();

    const isHeic =
        type.includes("heic") ||
        type.includes("heif") ||
        name.endsWith(".heic") ||
        name.endsWith(".heif");

    if (!isHeic) {
        return file;
    }

    console.log("Converting HEIC:", file.name);

    const convertedBlob = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.9
    });

    const jpgName = file.name.replace(/\.(heic|heif)$/i, ".jpg");

    return new File(
        [convertedBlob],
        jpgName,
        {
            type: "image/jpeg",
            lastModified: Date.now()
        }
    );
}

async function rcNormalizeHeicFiles(files) {

    const out = [];

    for (const file of files) {

        const converted = await rcConvertHeicToJpgIfNeeded(file);

        out.push(converted);
    }

    return out;
}

async function rcHandleFiles2(f, files) {

    files = await rcNormalizeHeicFiles(files);

    const fieldId = f.id;
    if (!reportFiles[fieldId]) reportFiles[fieldId] = [];

    const maxFiles = f.maxFiles ?? 12;
    const maxSize = (f.maxSizeMB || 8) * 1024 * 1024;
    const accept = Array.isArray(f.accept) ? f.accept : [];

    let acceptedCount = 0;
    let rejectedCount = 0;

    const preAccepted = [];
    const rejectedList = [];
    const acceptedList = [];

    try {
        // ==========================================
        // 0) HASHES DE ARCHIVOS YA ACEPTADOS EN ESTA SESIÓN
        // ==========================================
        const existingHashes = new Map();

        for (const it of (reportFiles[fieldId] || [])) {
            const existingFile = it?.file || it;
            if (!(existingFile instanceof Blob)) continue;

            try {
                const h = await rcComputeSha256(existingFile);
                if (h) {
                    existingHashes.set(h, existingFile.name || "previous_file");
                }
            } catch (e) {
                console.warn("[REPORT PHOTO] could not hash existing file:", e);
            }
        }

        const newBatchHashes = new Map();

        // ==========================================
        // 1) VALIDACIONES LOCALES + COMPRESIÓN + DUP LOCAL
        // ==========================================
        for (let idx = 0; idx < files.length; idx++) {
            const file = files[idx];

            if (reportFiles[fieldId].length + preAccepted.length >= maxFiles) {
                rejectedCount++;
                rejectedList.push({
                    name: file.name,
                    reason: `Maximum ${maxFiles} photos allowed.`,
                    limitExceeded: true
                });
                continue;
            }

            if (accept.length) {
                const okType = accept.some(a => {
                    if (a === "*/*") return true;
                    if (a.endsWith("/*")) {
                        const prefix = a.slice(0, -1);
                        return file.type.startsWith(prefix);
                    }
                    return file.type === a;
                });

                if (!okType) {
                    rejectedCount++;
                    rejectedList.push({
                        name: file.name,
                        reason: "Type not allowed"
                    });
                    continue;
                }
            }

            if (file.size > maxSize && !f.compress) {
                rejectedCount++;
                rejectedList.push({
                    name: file.name,
                    reason: `Too large (> ${f.maxSizeMB}MB)`
                });
                continue;
            }

            rcSetPhotosProcessing(true, `Processing photos... (${idx + 1}/${files.length})`);
            await new Promise(r => setTimeout(r, 0));

            let finalFile = file;

            if (f.compress && /^image\//.test(file.type)) {
                try {
                    finalFile = await rcCompressImage(file, f.compress);
                } catch (e) {
                    console.warn("[REPORT PHOTO] compression failed, using original:", e);
                    finalFile = file;
                }
            }

            if (finalFile.size > maxSize) {
                rejectedCount++;
                rejectedList.push({
                    name: file.name,
                    reason: `Too large after processing (> ${f.maxSizeMB}MB)`
                });
                continue;
            }

            // ==========================================
            // 1.1) DUPLICADO EXACTO CONTRA YA CARGADAS
            // ==========================================
            let localHash = "";
            try {
                localHash = await rcComputeSha256(finalFile);
            } catch (e) {
                console.warn("[REPORT PHOTO] hash failed:", e);
            }

            if (localHash && existingHashes.has(localHash)) {
                rejectedCount++;
                rejectedList.push({
                    name: file.name,
                    reason: `Duplicate image already loaded in this report: same as ${existingHashes.get(localHash)}`
                });
                continue;
            }

            // ==========================================
            // 1.2) DUPLICADO EXACTO DENTRO DEL NUEVO CARGUE
            // ==========================================
            if (localHash && newBatchHashes.has(localHash)) {
                rejectedCount++;
                rejectedList.push({
                    name: file.name,
                    reason: `Duplicate image inside this upload: same as ${newBatchHashes.get(localHash)}`
                });
                continue;
            }

            if (localHash) {
                newBatchHashes.set(localHash, file.name);
            }

            preAccepted.push({
                originalName: file.name,
                finalFile,
                localHash
            });
        }

        if (!preAccepted.length) {
            rcRenderGallery(fieldId);

            const summaryMsg = `${acceptedCount} Accepted / ${rejectedCount} Rejected`;

            let toneClass = "rc-photo-status--err";
            let toastType = "danger";

            if (rejectedCount > 0 && acceptedCount === 0) {
                toneClass = "rc-photo-status--err";
                toastType = "danger";
            } else {
                toneClass = "rc-photo-status--warn";
                toastType = "warning";
            }

            rcSetPhotoValidationResult(summaryMsg, acceptedList, rejectedList, toneClass);
            showMessage(summaryMsg, toastType);

            rcSchedulePhotoStatusHide(rejectedCount);

            return;
        }

        // ==========================================
        // 2) VALIDACIÓN BATCH EN BACKEND
        // ==========================================
        rcSetPhotosProcessing(true, `Validating photos... (0/${preAccepted.length})`);
        await new Promise(r => setTimeout(r, 0));

        const batchFiles = preAccepted.map(x => x.finalFile);
        const batchValidation = await validateImagesBatchWithServer(batchFiles);

        if (!batchValidation.ok) {
            preAccepted.forEach(item => {
                rejectedCount++;
                rejectedList.push({
                    name: item.originalName,
                    reason: batchValidation.reason || "Batch validation failed"
                });
            });

            rcRenderGallery(fieldId);

            const summaryMsg = `${acceptedCount} Accepted / ${rejectedCount} Rejected`;
            rcSetPhotoValidationResult(summaryMsg, acceptedList, rejectedList, "rc-photo-status--err");
            showMessage(summaryMsg, "danger");

            rcSchedulePhotoStatusHide(rejectedCount);

            return;
        }

        // ==========================================
        // 3) PROCESAR RESPUESTA DEL BATCH
        // ==========================================
        const results = Array.isArray(batchValidation.results) ? batchValidation.results : [];

        for (let i = 0; i < preAccepted.length; i++) {
            const localItem = preAccepted[i];
            const validation = results[i] || {
                ok: false,
                duplicate: false,
                reason: "Missing validation result"
            };

            if (!validation.ok) {
                rejectedCount++;
                rejectedList.push({
                    name: localItem.originalName,
                    reason: validation.reason || "Validation failed"
                });
                continue;
            }

            const blobUrl = URL.createObjectURL(localItem.finalFile);

            reportFiles[fieldId].push({
                file: localItem.finalFile,
                blobUrl
            });

            if (localItem.localHash) {
                existingHashes.set(localItem.localHash, localItem.originalName);
            }

            acceptedCount++;
            acceptedList.push({
                name: localItem.originalName
            });
        }

        // ==========================================
        // 4) REFRESCAR GALERÍA + MENSAJES
        // ==========================================
        rcRenderGallery(fieldId);

        const summaryMsg = `${acceptedCount} Accepted / ${rejectedCount} Rejected`;

        let toneClass = "rc-photo-status--warn";
        let toastType = "warning";

        if (acceptedCount > 0 && rejectedCount === 0) {
            toneClass = "rc-photo-status--ok";
            toastType = "success";
        } else if (acceptedCount === 0 && rejectedCount > 0) {
            toneClass = "rc-photo-status--err";
            toastType = "danger";
        }

        rcSetPhotoValidationResult(summaryMsg, acceptedList, rejectedList, toneClass);
        showMessage(summaryMsg, toastType);

        rcSchedulePhotoStatusHide(rejectedCount);

    } finally {
        rcPhotosProcessing = false;
        rcApplyFooterState();
    }
}

function rcEnsurePhotoStatusEl() {
    let $el = $("#rcPhotoStatus");
    if ($el.length) return $el;

    const $gallery = $(".rc-photo-gallery, .rc-photos-gallery, #rcPhotosGallery, .rc-gallery").first();
    if ($gallery.length) {
        $el = $('<div id="rcPhotoStatus" class="rc-photo-status d-none"></div>');
        $gallery.after($el);
        return $el;
    }

    $el = $('<div id="rcPhotoStatus" class="rc-photo-status d-none"></div>');
    $("#main-view").append($el);
    return $el;
}

function rcSetPhotosProcessing(isOn, msg) {
    rcPhotosProcessing = !!isOn;
    const $status = rcEnsurePhotoStatusEl();

    if (rcPhotosProcessing) {
        // Cancela el temporizador de la carga anterior.
        if (rcPhotoStatusHideTimer !== null) {
            clearTimeout(rcPhotoStatusHideTimer);
            rcPhotoStatusHideTimer = null;
        }

        $status
            .removeClass(
                "d-none rc-photo-status--ok " +
                "rc-photo-status--warn rc-photo-status--err"
            )
            .addClass("rc-photo-status--info")
            .text(msg || "Processing photos...");
    } else {
        // Conserva los div, IDs y saltos del resultado.
        $status.removeClass("rc-photo-status--info");
    }

    rcApplyFooterState();
}


function rcApplyFooterState() {
    const n = (reportSchema.sections || []).length;
    const last = rcCurrentStep === n - 1;

    const $prev = $("#rcPrev");
    const $next = $("#rcNext");
    const $submit = $("#rcSubmit");

    // Siempre visibles
    $prev.removeClass("d-none").show();
    $next.removeClass("d-none").show();
    $submit.removeClass("d-none").show();

    // Estado según step
    $prev.prop("disabled", rcCurrentStep <= 0);

    if (last) {
        $next.prop("disabled", true).css("visibility", "hidden");
        $submit.prop("disabled", false).css("visibility", "visible");
    } else {

        let disableNext = !!rcPhotosProcessing;
        const currentSection = (reportSchema.sections || [])[rcCurrentStep];
        if (currentSection?.id === "photos") {
            const photoField = (currentSection.fields || [])
                .find(f => f.id === "photos");
            if (photoField) {
                const err = rcValidateField(photoField, reportAnswers[photoField.id]);
                if (err) {
                    disableNext = true;
                }
            }
        }
        $next
            .prop("disabled", disableNext)
            .css("visibility", "visible");
        $submit
            .prop("disabled", true)
            .css("visibility", "hidden");
    }
}

function rcCompressImage(file, opts) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const { maxWidth = 2000, maxHeight = 2000, quality = 0.82 } = opts || {};
            let { width: w, height: h } = img;
            const ratio = Math.min(maxWidth / w, maxHeight / h, 1);
            const cw = Math.round(w * ratio), ch = Math.round(h * ratio);
            const canvas = document.createElement('canvas');
            canvas.width = cw; canvas.height = ch;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, cw, ch);
            canvas.toBlob(blob => {
                if (blob) resolve(new File([blob], file.name.replace(/\.(png|jpeg|jpg)$/i, '.jpg'), { type: 'image/jpeg' }));
                else reject(new Error('toBlob failed'));
            }, 'image/jpeg', quality);
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}


/* --- SUMMARY DICTATION------------------------------------- */
function ensureSummaryDictationUI() {
    // 1) Este es el textarea real según el esquema (EVENT SUMMARY)
    const summaryTextarea =
        document.querySelector('#fld_eventSummary') ||
        document.querySelector('[id^="fld_"][id$="eventSummary"]') ||
        document.querySelector('textarea[name="summary"], #summary, #rc-summary');

    if (!summaryTextarea) return;

    // 2) Ubicamos el label del grupo para insertar el botón
    const group = summaryTextarea.closest('.rc-group') || document.getElementById('grp_eventSummary');
    const label = group ? (group.querySelector('.rc-label, label')) : null;
    if (!label || label.dataset.dictationAttached === '1') return;

    // 3) Estilo de label con acciones + guard
    label.classList.add('rc-label--row');
    label.dataset.dictationAttached = '1';

    // 4) Botón y estado
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-sm btn-outline-primary rc-trans-btn';
    btn.innerHTML = '<i class="bi bi-mic"></i>';
    btn.setAttribute('aria-pressed', 'false');
    btn.dataset.role = 'btn-dictate';
    if (label.querySelector('[data-role="btn-dictate"]')) return;


    const status = document.createElement('span');
    status.style.marginLeft = '6px';
    status.style.fontSize = '.9rem';
    status.style.color = '#6b7280';
    status.textContent = '';

    label.appendChild(btn);
    label.appendChild(status);

    // 5) Toggle dictado
    btn.addEventListener('click', () => {
        if (!('webkitSpeechRecognition' in window)) {
            showMessage('🎤 Dictation is not supported on this device/browser. Try Chrome.', 'warning');
            return;
        }
        if (!summaryRecActive) {
            startSummaryDictation(summaryTextarea, btn, status);
        } else {
            stopSummaryDictation(btn, status);
        }
    });
}


function startSummaryDictation(textarea, btn, status) {
    try {
        summaryRec = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    } catch (e) {
        summaryRec = new window.webkitSpeechRecognition();
    }

    // Config: usa idioma del navegador del usuario (auto)
    // Si quieres forzar español: summaryRec.lang = 'es-ES';
    summaryRec.lang = navigator.language || 'en-US';
    summaryRec.interimResults = true;
    summaryRec.continuous = true;

    let interim = '';
    let finalText = textarea.value || '';

    summaryRec.onstart = () => {
        summaryRecActive = true;
        rcHideSummaryButtonsExcept('btn-dictate');        // ⟵ ocultar otros
        btn.innerHTML = '<i class="bi bi-stop-fill" aria-hidden="true"></i>';
        btn.classList.remove('btn-outline-primary');
        btn.classList.add('btn-danger');
        btn.setAttribute('aria-pressed', 'true');
        status.textContent = 'Listening…';
    };


    summaryRec.onerror = (evt) => {
        console.error('[Dictation] error:', evt);
        status.textContent = 'Dictation error';
        showMessage('🎤 Dictation error. Please try again.', 'warning', 1);
    };

    summaryRec.onresult = (evt) => {
        interim = '';
        for (let i = evt.resultIndex; i < evt.results.length; i++) {
            const res = evt.results[i];
            if (res.isFinal) {
                finalText += (finalText && !finalText.endsWith(' ') ? ' ' : '') + res[0].transcript.trim();
            } else {
                interim += res[0].transcript;
            }
        }
        // Muestra mezcla de final + interino (para feedback en vivo)
        textarea.value = (finalText + ' ' + interim).trim();
    };

    summaryRec.onend = () => {
        // onend se dispara también si el usuario deja de hablar;
        // mantenemos el texto final en el textarea
        stopSummaryDictation(btn, status, /*silent*/ true);
    };

    try {
        summaryRec.start();
    } catch (e) {
        console.error('[Dictation] start error:', e);
        showMessage('🎤 Unable to start dictation.', 'warning', 1);
    }
}

function stopSummaryDictation(btn, status, silent = false) {
    if (summaryRec) {
        try { summaryRec.stop(); } catch (e) { }
    }
    summaryRecActive = false;
    rcShowSummaryButtons();
    if (btn) {
        btn.innerHTML = '<i class="bi bi-mic"></i>';
        btn.classList.remove('btn-danger');       // quitar rojo sólido
        btn.classList.remove('btn-primary');       // quitar azul sólido
        btn.classList.add('btn-outline-primary');  // volver a azul outline
        btn.setAttribute('aria-pressed', 'false');
    }
    if (status && !silent) status.textContent = ''; // comentado temporalmente
}

/* Llama a este helper justo después de renderizar/mostrar el Report Capture */
function hookSummaryDictationWhenReportOpens() {
    // Si ya tienes un punto donde “armas” el formulario del reporte,
    // llama a ensureSummaryDictationUI() al final de ese render.
    ensureSummaryDictationUI();

    // Por si tu SPA cambia de steps/secciones dinámicamente:
    const rcSections = document.getElementById('rcSections');
    if (rcSections) {
        const obs = new MutationObserver(() => ensureSummaryDictationUI());
        obs.observe(rcSections, { childList: true, subtree: true });
    }
}



/* ===== SUMMARY RECORD & TRANSCRIBE (v158.R1) ============================ */
// Se ejecuta SOLO cuando avisemos que el Report ya quedó visible/renderizado
function onReportViewReady() {
    initVoiceUIFlow();          // decide Record vs Dictate y los dibuja
    // ensureSummaryTranslateUI(); // crea el botón Translate
}

// Suscríbete al evento custom
document.addEventListener('report-view:ready', onReportViewReady);


function ensureSummaryRecordUI() {
    const textarea =
        document.querySelector('#fld_eventSummary') ||
        document.querySelector('[id^="fld_"][id$="eventSummary"]');
    if (!textarea) return;

    const group = textarea.closest('.rc-group') || document.getElementById('grp_eventSummary');
    const label = group ? (group.querySelector('.rc-label, label')) : null;
    if (!label || label.dataset.sttAttached === '1') return;

    label.classList.add('rc-label--row');
    label.dataset.sttAttached = '1';

    // Botón Record
    const btnRec = document.createElement('button');
    btnRec.type = 'button';
    btnRec.className = 'btn btn-sm btn-outline-primary rc-trans-btn';
    btnRec.innerHTML = '<i class="bi bi-mic" aria-hidden="true"></i>'; // Rec


    btnRec.setAttribute('aria-pressed', 'false');
    btnRec.dataset.role = 'btn-record-stt';
    if (label.querySelector('[data-role="btn-record-stt"]')) return;


    // Estado
    const status = document.createElement('span');
    status.style.marginLeft = '6px';
    status.style.fontSize = '.9rem';
    status.style.color = '#6b7280';
    status.textContent = '';

    label.appendChild(btnRec);
    label.appendChild(status);
    btnRec.addEventListener('click', async () => {
        if (sttBusy) return;

        const group = textarea.closest('.rc-group');
        const label = group ? (group.querySelector('.rc-label, label')) : null;

        if (!VOICE_PREF.canRecord) {
            showMessage('Your browser cannot record audio. Using live Dictate instead.', 'info', 1);
            return;
        }

        if (!sttMediaRecorder || sttMediaRecorder.state === 'inactive') {
            rcHideSummaryButtonsExcept('btn-record-stt');   // ⟵ ocultar otros al empezar
            startRecording(btnRec, status);
        } else {
            stopRecording(btnRec, status, textarea);
        }
    });

}

async function startRecording(btn, status) {
    try {
        sttBusy = true;
        if (!sttStream) {
            sttStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        sttChunks = [];

        const mt = pickSupportedType();
        sttMediaRecorder = new MediaRecorder(sttStream, mt ? { mimeType: mt } : undefined);
        sttMime = sttMediaRecorder.mimeType || mt || 'audio/webm';
        if (sttMime.includes('mp4')) sttExt = 'm4a';
        else if (sttMime.includes('mpeg')) sttExt = 'mp3';
        else sttExt = 'webm';

        sttMediaRecorder.addEventListener('dataavailable', (e) => {
            if (e.data && e.data.size > 0) sttChunks.push(e.data);
        });

        sttMediaRecorder.addEventListener('start', () => {
            btn.innerHTML = '<i class="bi bi-stop-fill" aria-hidden="true"></i>'; // Stop & Transcribe
            btn.classList.remove('btn-outline-primary');
            btn.classList.add('btn-danger');
            btn.setAttribute('aria-pressed', 'true');
            clearTimeout(status.__fadeTO);
            status.style.opacity = 1;
            status.textContent = 'Recording…';
        }, { once: true });


        sttMediaRecorder.start();
    } catch (err) {
        console.error('[STT] start error', err);
        showMessage('🎤 Mic blocked. Enable permissions.', 'warning', 1);
    } finally {
        sttBusy = false;
    }
}


function stopRecording(btn, status, textarea) {
    if (!sttMediaRecorder) return;

    sttBusy = true;

    btn.innerHTML = '<i class="bi bi-mic" aria-hidden="true"></i>'; // Rec bi bi-mic-fill
    btn.classList.remove('btn-danger');
    btn.classList.add('btn-outline-primary'); // azul con borde
    btn.setAttribute('aria-pressed', 'false');

    status.textContent = 'Transcribing…';

    const stopped = new Promise(res => sttMediaRecorder.addEventListener('stop', res, { once: true }));
    const lastChunk = new Promise(res => sttMediaRecorder.addEventListener('dataavailable', () => res(), { once: true }));

    try { sttMediaRecorder.stop(); } catch (e) { }

    Promise.all([stopped, lastChunk]).then(() => {
        const blob = new Blob(sttChunks, { type: sttMime });
        console.log('[STT AUDIO DEBUG] Blob size:', blob.size);
        console.log('[STT AUDIO DEBUG] MIME type:', blob.type);
        console.log('[STT AUDIO DEBUG] Chunks:', sttChunks.length);
        // bloquea archivos vacíos o demasiado pequeños
        if (!blob || blob.size < 2000) {  // ~2KB
            status.textContent = 'No audio captured';
            showMessage('🎤 Audio too short. Speak 2–3 sec...', 'warning', 1);
            sttBusy = false;
            return;
        }
        uploadAudioForTranscription(blob, sttExt)
            .then(async (text) => {
                const raw = (text || '').trim();
                if (!raw) throw new Error('empty_transcription');

                status.textContent = 'Transcribed ✔';
                // ahora: traducir + pulir automáticamente
                status.textContent = 'Translating…';

                try {
                    const polished = await translateAndPolish(raw);
                    console.log('[STT DEBUG] Raw transcription:', raw);
                    console.log('[STT DEBUG] Polished translation:', polished);
                    console.log('[STT DEBUG] Polished length:', polished?.length);
                    console.log('[STT DEBUG] Textarea connected:', textarea.isConnected);
                    console.log('[STT DEBUG] Textarea ID:', textarea.id);

                    // ✅ final: inglés pulido
                    textarea.value = polished;
                    $(textarea).trigger('input'); // importantísimo para tu rcOnFieldChange/autosave

                    status.textContent = 'Done ✔';
                    showMessage('Translated & polished ✅', 'success', 1);
                } catch (e) {
                    // Si falla translate: deja al menos la transcripción para no perder trabajo
                    textarea.value = raw;
                    $(textarea).trigger('input');

                    status.textContent = 'Translate failed (kept transcription)';
                    showMessage('Translation failed — kept transcription.', 'warning', 1);
                    console.error('[STT->Translate] error:', e);
                }

                // fade out como ya lo tenías
                status.style.opacity = 1;
                clearTimeout(status.__fadeTO);
                status.__fadeTO = setTimeout(() => {
                    status.style.transition = 'opacity .45s ease';
                    status.style.opacity = 0;
                    setTimeout(() => {
                        status.textContent = '';
                        status.style.opacity = '';
                        status.style.transition = '';
                    }, 450);
                }, 3500);

                rcShowSummaryButtons();
            })
            .catch(err => {
                console.error('[STT] upload error', err);
                status.textContent = 'Transcription failed';
                showMessage('❗ Transcription failed. Try again.', 'warning', 1);
            })
            .finally(() => { sttBusy = false; });

    });
}

function pickSupportedType() {
    const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',                 // iOS/Safari suele ir por aquí
        'audio/mpeg'                 // MP3
    ];
    for (const t of candidates) {
        if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) return t;
    }
    return ''; // dejar que el browser decida
}

function uploadAudioForTranscription(blob, ext = 'webm') {
    return new Promise((resolve, reject) => {
        const fd = new FormData();
        fd.append('audio', blob, `summary_${Date.now()}.${ext}`);
        $.ajax({
            url: API_BASE + 'transcribe4000.php',
            method: 'POST',
            data: fd,
            processData: false,
            contentType: false,
            dataType: 'json',
            timeout: 120000,
            success: function (res) {
                console.log('[TRANSCRIPTION DEBUG] Server response:', JSON.stringify(res));
                if (res && res.ok && res.text) {
                    resolve(res.text);
                } else {
                    console.error('[STT] server said:', res);
                    reject(res && (res.error || res.detail) ? (res.error + ' ' + (res.detail || '')) : 'bad_response');
                }
            },
            error: function (xhr) {
                reject(xhr?.responseText || 'network_error');
            }
        });
    });
}

/* Llama este helper cuando se muestre la vista de Report */
function hookSummaryTranscribeWhenReportOpens() {
    ensureSummaryRecordUI();
    const rcSections = document.getElementById('rcSections');
    if (rcSections) {
        const obs = new MutationObserver(() => ensureSummaryRecordUI());
        obs.observe(rcSections, { childList: true, subtree: true });
    }
}

function translateAndPolish(text) {
    return new Promise((resolve, reject) => {
        const raw = String(text || '').trim();

        if (!raw) {
            resolve('');
            return;
        }

        // ✅ no intentes pegar al backend si el browser ya sabe que no hay internet
        if (!navigator.onLine) {
            reject('offline');
            return;
        }

        $.ajax({
            url: API_BASE + 'translate4000.php',
            method: 'POST',
            dataType: 'json',
            timeout: 60000,
            data: { text: raw },
            success: function (res) {
                console.log('[TRANSLATE DEBUG] Server response:', JSON.stringify(res));
                if (res && res.ok) {
                    const en = (res?.data?.english_text ?? res?.translation ?? '');
                    resolve(String(en));
                } else {
                    reject(res?.error || 'bad_translate_response');
                }
            },
            error: function (xhr, _status) {
                // si durante la llamada se cayó la red, márcalo como offline
                if (!navigator.onLine) {
                    reject('offline');
                    return;
                }
                reject(xhr?.responseText || 'translate_network_error');
            }
        });
    });
}


async function submitShiftReportAndCheckout() {
    console.warn("[submitShiftReportAndCheckout] Legacy flow disabled. Use rcSubmit() + rcAfterSubmitAction.");
    showMessage("Legacy submit disabled. Use the Report Capture submit.", "warning");
}


// ========== REIMBURSEMENTS ==========
/*function openReimb() {
    hideAllMainViews();
    $("#responseMessage").hide(); ////////////////////////////////////////
    $("#reimb-view").show();
    renderReimbForm();
}
*/

function openReimb() {
    appCloseAllViewsHard({ showMain: false });
    $("#reimb-view").show();
    renderReimbForm();
}

function closeReimb() {
    $("#reimb-view").hide();
    $("#main-view").show();
}

function reimbShortDateOnly(v) {
    const s = String(v || "").trim();
    if (!s) return "";

    // Caso: "Tue 4/14/26" o "Wed 04/15/26"
    const m = s.match(/^(?:[A-Za-z]{3}\s+)?(\d{1,2}\/\d{1,2}\/\d{2,4})$/);
    if (m) return m[1];

    return s;
}

function renderReimbForm() {
    // 0) Reset suave
    const $form = $("#reimbForm");
    if ($form[0]) $form[0].reset();


    // Limpia banners (File + Submit)
    setReimbFileStatus("");
    setReimbSubmitStatus("");


    reimbLockExpenseDate(false);
    $("#reimbDate").val("");

    // 1) Limpia errores visuales (incluye nuevos campos)
    ["reimbShift", "reimbReceipt"].forEach(id => {
        $(`#err_${id}`).hide().text('');
        $(`#grp_${id}`).removeClass('rc-invalid');
    });

    // 2) Pinta shifts (igual que antes; usa reimbShifts/allShifts)
    const $selShift = $("#reimbShift");
    $selShift.empty();
    const source = Array.isArray(reimbShifts) && reimbShifts.length ? reimbShifts
        : (Array.isArray(allShifts) && allShifts.length ? allShifts : []);
    if (!source.length) {
        $selShift.append(`<option value="">No available shifts</option>`).prop("disabled", true);
    } else {
        $selShift.prop("disabled", false).append(`<option value="">Select a shift…</option>`);
        source.forEach(s => {
            const shortDate = reimbShortDateOnly(s.shiftDate);
            const label = `${shortDate} • ${s.eventName}`;

            const $opt = $("<option>", {
                value: s.pk || "",
                text: label
            });

            $opt.attr("data-event-name", (s.eventName || "").toString());
            $opt.attr("data-long-id", (s.idShift || "").toString());

            $selShift.append($opt);
        });
    }

    // 3) Pinta Expenses Type desde backend
    const $selType = $("#expensesType");
    $selType.empty();

    const types = Array.isArray(expensesTypes) ? expensesTypes : [];

    if (!types.length) {
        $selType.append(`<option value="">No expense types available</option>`).prop("disabled", true);
    } else {
        $selType.prop("disabled", false).append(`<option value="">Select a type…</option>`);

        // Normalizador flexible (acepta string u objeto con distintas llaves)
        const norm = (t) => {
            if (typeof t === "string") return { value: t, text: t };
            if (!t || typeof t !== "object") return null;

            const pick = (obj, keys) =>
                keys.map(k => obj?.[k]).find(v => typeof v === "string" && v.trim());

            // Texto visible (prueba varias llaves comunes y luego cualquier string del objeto)
            const text =
                pick(t, ["label", "name", "type", "expenseType", "expensesType", "description", "title", "text"]) ||
                Object.values(t).find(v => typeof v === "string" && v.trim());

            // Valor (id/código… si no, usa el mismo texto)
            const value =
                pick(t, ["code", "id", "value", "key", "pk", "slug"]) || text;

            if (!text) return null;
            return { value, text };
        };

        // Evita duplicados por value
        const seen = new Set();
        types.map(norm).filter(Boolean).forEach(({ value, text }) => {
            if (value && !seen.has(String(value))) {
                $selType.append(`<option value="${String(value)}">${text}</option>`);
                seen.add(String(value));
            }
        });
    }

    // 4) Botones
    $("#reimbCancel").off("click.reimb").on("click.reimb", () => {
        resetReimbReceipt(true);  // limpia preview y campos
        // limpia también los nuevos:
        $("#reimbDate").val("");
        $("#expensesType").val("");
        if (typeof setReimbFileStatus === "function") setReimbFileStatus("");
        if (typeof setReimbSubmitStatus === "function") setReimbSubmitStatus("");
        closeReimb();
    });
    $("#reimbSubmit").off("click.reimb").on("click.reimb", submitReimb);
}



// Comprimir imágenes grandes antes de subir (JPEG)
function compressIfImage(file, maxSide = 1600, quality = 0.82) {
    return new Promise((resolve, reject) => {
        if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
            resolve(file); // PDF/otros: no comprimir
            return;
        }
        const img = new Image();
        const fr = new FileReader();
        fr.onload = () => { img.src = fr.result; };
        fr.onerror = reject;
        img.onload = () => {
            const { width, height } = img;
            const scale = Math.min(1, maxSide / Math.max(width, height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(width * scale);
            canvas.height = Math.round(height * scale);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                if (!blob) return reject(new Error('toBlob failed'));
                const baseName = (file.name || 'image').replace(/\.[^.]+$/, '');
                const out = new File([blob], baseName + '.jpg', { type: 'image/jpeg' });
                resolve(out);
            }, 'image/jpeg', quality);
        };
        img.onerror = reject;
        fr.readAsDataURL(file);
    });
}

function resetReimbSubmitButton() {
    const $btn = $("#reimbSubmit");
    $btn.prop("disabled", false);
    $btn.attr("class", "btn btn-submit-glp");
    $btn.html('<i class="bi bi-check2"></i> Submit');
}

function setReimbSubmitLoading() {
    const $btn = $("#reimbSubmit");
    $btn.prop("disabled", true);
    $btn.attr("class", "btn btn-submit-glp");
    $btn.html('<span class="spinner-border spinner-border-sm me-2"></span> Sending');
}

function buildReimbursementApprovalMenuOption() {
    try {
        if (typeof supervisorLevel === 'undefined' || Number(supervisorLevel) <= 0) return;

        const wrap = document.getElementById('menuReimbursementApprovalWrap');
        if (wrap) {
            wrap.style.display = '';
            return;
        }

        const menuList = document.querySelector('.sideMenu-list');
        if (!menuList) return;

        const li = document.createElement('li');
        li.id = 'menuReimbursementApprovalWrap';
        li.innerHTML = `
            <button id="menuReimbursementApproval" class="sideMenu-item" type="button">
                <i class="bi bi-cash-coin"></i>
                <span>Reimbursement Approval</span>
            </button>
        `;
        menuList.appendChild(li);

        const btn = document.getElementById('menuReimbursementApproval');
        if (btn) {
            btn.addEventListener('click', openReimbursementApprovalView);
        }
    } catch (err) {
        console.error('[RA] buildReimbursementApprovalMenuOption error:', err);
    }
}

function buildReimbursementApprovalMenuOption() {
    try {
        if (typeof supervisorLevel === 'undefined' || Number(supervisorLevel) <= 0) return;

        const wrap = document.getElementById('menuReimbursementApprovalWrap');
        if (wrap) {
            wrap.style.display = '';

            const oldBadge = document.getElementById('reimbursementApprovalBadge');
            if (!oldBadge) {
                const btn = document.getElementById('menuReimbursementApproval');
                if (btn) {
                    const badge = document.createElement('span');
                    badge.id = 'reimbursementApprovalBadge';
                    badge.className = 'badge-pill reimbursement-badge-pill';
                    badge.setAttribute('aria-live', 'polite');
                    badge.setAttribute('aria-atomic', 'true');
                    badge.style.display = 'none';
                    badge.textContent = '0';
                    btn.appendChild(badge);
                }
            }

            setReimbursementApprovalBadge(pendingReimbursementApprovalsNumber);
            return;
        }

        const menuList = document.querySelector('.sideMenu-list');
        if (!menuList) return;

        const li = document.createElement('li');
        li.id = 'menuReimbursementApprovalWrap';
        li.innerHTML = `
            <button id="menuReimbursementApproval" class="sideMenu-item" type="button">
                <i class="bi bi-cash-coin"></i>
                <span class="menu-text">Reimbursement Approval</span>
                <span id="reimbursementApprovalBadge"
                      class="badge-pill reimbursement-badge-pill"
                      aria-live="polite"
                      aria-atomic="true"
                      style="display:none">0</span>
            </button>
        `;
        menuList.appendChild(li);

        const btn = document.getElementById('menuReimbursementApproval');
        if (btn) {
            btn.addEventListener('click', openReimbursementApprovalView);
        }

        setReimbursementApprovalBadge(pendingReimbursementApprovalsNumber);

    } catch (err) {
        console.error('[RA] buildReimbursementApprovalMenuOption error:', err);
    }
}

function raShowStatus(message, type) {
    const el = document.getElementById('raStatusMessage');
    if (!el) return;

    el.className = 'local-status-banner';
    if (type) el.classList.add(type);

    el.textContent = message || '';
    el.style.display = 'block';
}

function raHideStatus() {
    const el = document.getElementById('raStatusMessage');
    if (!el) return;
    el.style.display = 'none';
    el.textContent = '';
    el.className = 'local-status-banner';
}

function raEscapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function raMoney(value) {
    const n = Number(value || 0);
    return '$' + n.toFixed(2);
}

function raWorkflowBadge(status) {
    if (status === 'sent_to_manager') {
        return `<span class="ra-card-workflow ra-status-sent">Sent to Manager</span>`;
    }
    return `<span class="ra-card-workflow ra-status-pending">Pending</span>`;
}

function openReimbursementApprovalView() {
    try {
        hideAllMainViews();
        $("#responseMessage").hide();
        $("#reimbursementApprovalView").show();

        $("#reimbursementApprovalListHeader").show();
        $("#reimbursementApprovalDetailHeader").hide();

        $("#reimbursementApprovalListWrap").show();
        $("#reimbursementApprovalDetailWrap").hide();

        raHideStatus();
        loadPendingReimbursementApprovals();

        if ($("#sideMenu").hasClass("open")) {
            $("#closeMenuBtn").trigger("click");
        }
    } catch (err) {
        console.error("[RA] openReimbursementApprovalView error:", err);
        if (typeof showMessage === "function") {
            showMessage("Could not open Reimbursement Approval.", "danger");
        }
    }
}

function toISODateOrNull(raw) {
    if (!raw) return null;
    // Normaliza separadores
    const s = String(raw).trim().replace(/[.\s]/g, '/');

    // YYYY-MM-DD o YYYY/MM/DD
    let m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (m) {
        const [_, y, mo, d] = m;
        return `${y.padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }

    // MM/DD/YYYY
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
        const [_, mo, d, y] = m;
        return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }

    // DD/MM/YYYY  (heurística: si primer número > 12 asumimos D/M/Y)
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
        const [_, d, mo, y] = m;
        if (parseInt(d, 10) > 12) {
            return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        }
    }

    // Si Date.parse entiende algo tipo “Jan 5 2025”
    const ts = Date.parse(s);
    if (!Number.isNaN(ts)) {
        const dt = new Date(ts);
        const y = dt.getFullYear();
        const mo = String(dt.getMonth() + 1).padStart(2, '0');
        const d = String(dt.getDate()).padStart(2, '0');
        return `${y}-${mo}-${d}`;
    }
    return null;
}


function showFieldError(id, msg) {
    $(`#grp_${id}`).addClass('rc-invalid');
    $(`#err_${id}`).text(msg).show();
}
function clearFieldError(id) {
    $(`#grp_${id}`).removeClass('rc-invalid');
    $(`#err_${id}`).hide().text('');
}


function reimbNormalizeReceiptDate(dateValue) {
    const s = String(dateValue || "").trim();
    if (!s) return "";

    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
        return d.getFullYear() + "-" +
            String(d.getMonth() + 1).padStart(2, "0") + "-" +
            String(d.getDate()).padStart(2, "0");
    }

    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) {
        let yy = String(m[3]);
        if (yy.length === 2) yy = "20" + yy;
        return `${yy}-${String(m[1]).padStart(2, "0")}-${String(m[2]).padStart(2, "0")}`;
    }

    return "";
}

function reimbCalcTotal() {
    return reimbFiles.reduce((sum, r) => {
        const n = Number(r.amount || 0);
        return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
}

function renderReimbReceiptsList() {
    const $list = $("#reimbReceiptsList");
    const $total = $("#reimbTotal");

    if (!$list.length) return;

    if (!Array.isArray(reimbFiles) || reimbFiles.length === 0) {
        $list.html(`<div class="reimb-empty-list">No receipts added yet.</div>`);
        if ($total.length) $total.val("0.00");
        return;
    }

    let html = "";

    reimbFiles.forEach((r, i) => {
        html += `
            <div class="reimb-receipt-card" data-index="${i}">
                <div class="reimb-receipt-head">
                    <strong>Receipt #${i + 1}</strong>
                    <button type="button" class="btn btn-sm btn-outline-danger reimb-remove-receipt" data-index="${i}">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>

                <div class="reimb-receipt-file">${reimbEscape(r.fileName)}</div>

                <div class="reimb-receipt-grid">
                    <div>
                        <label>DATE</label>
                        <input type="date" class="rc-input reimb-row-date" data-index="${i}" value="${reimbEscape(r.expenseDate)}">
                    </div>

                    <div>
                        <label>AMOUNT</label>
                        <input type="number" step="0.01" min="0.01" class="rc-input reimb-row-amount" data-index="${i}" value="${reimbEscape(r.amount)}">
                    </div>
                </div>

                <div class="reimb-receipt-field">
                    <label>EXPENSE TYPE</label>
                    <select class="rc-select reimb-row-type" data-index="${i}">
                        ${reimbBuildTypeOptions(r.expenseType)}
                    </select>
                </div>

                <div class="reimb-receipt-field">
                    <label>DESCRIPTION</label>
                    <textarea class="rc-textarea reimb-row-desc" data-index="${i}">${reimbEscape(r.expenseDescription)}</textarea>
                </div>
            </div>
        `;
    });

    $list.html(html);
    if ($total.length) $total.val(reimbCalcTotal().toFixed(2));
}

function reimbBuildTypeOptions(selectedValue) {
    let html = `<option value="">Select a type…</option>`;
    const types = Array.isArray(expensesTypes) ? expensesTypes : [];

    types.forEach(t => {
        let value = "";
        let text = "";

        if (typeof t === "string") {
            value = t;
            text = t;
        } else if (t && typeof t === "object") {
            text = t.label || t.name || t.type || t.expenseType || t.expensesType || t.description || t.title || t.text || "";
            value = t.code || t.id || t.value || t.key || text;
        }

        if (!text) return;

        const selected = String(value) === String(selectedValue) ? "selected" : "";
        html += `<option value="${reimbEscape(value)}" ${selected}>${reimbEscape(text)}</option>`;
    });

    return html;
}

function reimbGuessExpenseType(service) {
    const cleanService = reimbNormalizeUnknownText(service);
    if (!cleanService) return "";

    let found = "";
    const svc = cleanService.toUpperCase();

    (expensesTypes || []).forEach(t => {
        if (found) return;

        let value = "";
        let text = "";

        if (typeof t === "string") {
            value = t;
            text = t;
        } else if (t && typeof t === "object") {
            text = t.label || t.name || t.type || t.expenseType || t.expensesType || t.description || t.title || t.text || "";
            value = t.code || t.id || t.value || t.key || text;
        }

        if (svc === String(value).toUpperCase() || svc === String(text).toUpperCase()) {
            found = value;
        }
    });

    return found;
}

function reimbEscape(v) {
    return String(v ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function validateReimbForm() {
    let ok = true;

    const shiftPk = ($("#reimbShift").val() || "").trim();

    if (!shiftPk) {
        showFieldError("reimbShift", "Select a shift.");
        ok = false;
    } else {
        clearFieldError("reimbShift");
    }

    if (!Array.isArray(reimbFiles) || reimbFiles.length === 0) {
        clearFieldError("reimbReceipt");
        setReimbFileStatus("At least one receipt is required.", "err", { autoHideMs: 7000 });
        ok = false;
    } else {
        clearFieldError("reimbReceipt");
    }


    if (reimbFiles.length > reimbMaxReceiptsPerRequest) {
        showFieldError("reimbReceipt", `Maximum ${reimbMaxReceiptsPerRequest} receipt(s) allowed.`);
        ok = false;
    }

    reimbFiles.forEach((r, i) => {
        if (!r.amount || Number(r.amount) <= 0) {
            ok = false;
        }

        if (!String(r.expenseType || "").trim()) {
            ok = false;
        }

        if (!String(r.expenseDescription || "").trim()) {
            ok = false;
        }
    });

    if (!ok) {
        setReimbStatus("Please complete all receipt fields.", "warn");
    }

    const total = reimbCalcTotal();

    return {
        ok,
        shiftPk,
        total,
        receipts: reimbFiles.map(r => ({
            fileName: r.fileName || "",
            fileHash: r.fileHash || "",
            fileMime: r.fileMime || "",
            fileSize: r.fileSize || 0,
            expenseDate: r.expenseDate || "",
            expenseDescription: String(r.expenseDescription || "").trim(),
            amount: Number(r.amount || 0).toFixed(2),
            expenseType: String(r.expenseType || "").trim(),
            vendor: r.vendor || "",
            service: r.service || "",
            confidence: r.confidence || null
        }))
    };
}

async function reimbAnalyzeAndAddReceipt(file) {
    setReimbFileStatus("Reading receipt…", "info", { autoHideMs: 15000 });

    const isImg = /^image\//.test(file.type);
    const upload = isImg ? await compressIfImage(file, 1600, 0.82) : file;

    const fd = new FormData();
    fd.append("receipt", upload, upload.name || file.name || "receipt");

    $.ajax({
        url: API_BASE + "analyzeReceipt4000.php",
        method: "POST",
        data: fd,
        processData: false,
        contentType: false,
        dataType: "json",
        timeout: 60000,
        success: function (res) {
            console.log("[REIMB ANALYZE RESPONSE]", res);

            if (res?.duplicate === true) {
                setReimbFileStatus(res.detail || "Duplicate receipt.", "err", { autoHideMs: 9000 });
                return;
            }

            if (!res || res.ok !== true || !res.data) {
                setReimbFileStatus(res?.detail || res?.error || "Could not read the receipt.", "err", { autoHideMs: 12000 });
                return;
            }

            const d = res.data || {};
            const cleanVendor = reimbNormalizeUnknownText(d.vendor);
            const cleanService = reimbNormalizeUnknownText(d.service);
            const descAuto = reimbBuildDescription(cleanVendor, cleanService);
            const n = Number(d.amount || 0);

            if (res.fileHash && reimbFiles.some(r => r.fileHash === res.fileHash)) {
                setReimbFileStatus("Receipt already uploaded to this request.", "err", { autoHideMs: 9000 });
                return;
            }
            reimbFiles.push({
                file: upload,
                fileName: upload.name || file.name || "receipt",
                fileHash: res.fileHash || "",
                fileMime: res.fileMime || upload.type || "",
                fileSize: res.fileSize || upload.size || 0,
                vendor: cleanVendor,
                service: cleanService,
                expenseDescription: descAuto || "",
                amount: Number.isFinite(n) && n > 0 ? n.toFixed(2) : "",
                expenseDate: reimbNormalizeReceiptDate(d.date),
                expenseType: reimbGuessExpenseType(cleanService),
                confidence: d.confidence || null
            });

            renderReimbReceiptsList();
            clearFieldError("reimbReceipt");
            setReimbFileStatus("Receipt added ✓", "ok", { autoHideMs: 4000 });
        },
        error: function (xhr) {
            console.error("[REIMB ANALYZE ERROR]", xhr.responseText);
            const res = xhr?.responseJSON;
            setReimbFileStatus(res?.detail || res?.error || xhr.responseText || "Could not read the receipt.", "err", { autoHideMs: 12000 });
        }
    });
}

function reimbNormalizeReceiptDate(dateValue) {
    const s = String(dateValue || "").trim();
    if (!s) return "";

    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
        return d.getFullYear() + "-" +
            String(d.getMonth() + 1).padStart(2, "0") + "-" +
            String(d.getDate()).padStart(2, "0");
    }

    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) {
        const mm = String(m[1]).padStart(2, "0");
        const dd = String(m[2]).padStart(2, "0");
        let yy = String(m[3]);
        if (yy.length === 2) yy = "20" + yy;
        return `${yy}-${mm}-${dd}`;
    }

    return "";
}

function reimbCalcTotal() {
    return reimbFiles.reduce((sum, r) => {
        const n = Number(r.amount || 0);
        return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
}

function renderReimbReceiptsList() {
    const $list = $("#reimbReceiptsList");
    const $total = $("#reimbTotal");

    if (!$list.length) return;

    if (!Array.isArray(reimbFiles) || reimbFiles.length === 0) {
        $list.html(`<div class="reimb-empty-list">No receipts added yet.</div>`);
        if ($total.length) $total.val("0.00");
        return;
    }

    let html = "";

    reimbFiles.forEach((r, i) => {
        html += `
            <div class="reimb-receipt-card" data-index="${i}">
                <div class="reimb-receipt-head">
                    <strong>Receipt #${i + 1}</strong>
                    <button type="button" class="btn btn-sm btn-outline-danger reimb-remove-receipt" data-index="${i}">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>

                <div class="reimb-receipt-file">${reimbEscape(r.fileName)}</div>

                <div class="reimb-receipt-grid">
                    <div>
                        <label>DATE</label>
                        <input type="date" class="rc-input reimb-row-date" data-index="${i}" value="${reimbEscape(r.expenseDate)}">
                    </div>

                    <div>
                        <label>AMOUNT</label>
                        <input type="number" step="0.01" min="0.01" class="rc-input reimb-row-amount" data-index="${i}" value="${reimbEscape(r.amount)}">
                    </div>
                </div>

                <div class="reimb-receipt-field">
                    <label>EXPENSE TYPE</label>
                    <select class="rc-select reimb-row-type" data-index="${i}">
                        ${reimbBuildTypeOptions(r.expenseType)}
                    </select>
                </div>

                <div class="reimb-receipt-field">
                    <label>DESCRIPTION</label>
                    <textarea class="rc-textarea reimb-row-desc" data-index="${i}">${reimbEscape(r.expenseDescription)}</textarea>
                </div>
            </div>
        `;
    });

    $list.html(html);
    if ($total.length) $total.val(reimbCalcTotal().toFixed(2));
}

function reimbBuildTypeOptions(selectedValue) {
    let html = `<option value="">Select a type…</option>`;
    const types = Array.isArray(expensesTypes) ? expensesTypes : [];

    types.forEach(t => {
        let value = "";
        let text = "";

        if (typeof t === "string") {
            value = t;
            text = t;
        } else if (t && typeof t === "object") {
            text = t.label || t.name || t.type || t.expenseType || t.expensesType || t.description || t.title || t.text || "";
            value = t.code || t.id || t.value || t.key || text;
        }

        if (!text) return;

        const selected = String(value) === String(selectedValue) ? "selected" : "";
        html += `<option value="${reimbEscape(value)}" ${selected}>${reimbEscape(text)}</option>`;
    });

    return html;
}

function reimbGuessExpenseType(service) {
    const cleanService = reimbNormalizeUnknownText(service);
    if (!cleanService) return "";

    let found = "";

    const types = Array.isArray(expensesTypes) ? expensesTypes : [];

    types.forEach(t => {
        if (found) return;

        let value = "";
        let text = "";

        if (typeof t === "string") {
            value = t;
            text = t;
        } else if (t && typeof t === "object") {
            text = t.label || t.name || t.type || t.expenseType || t.expensesType || t.description || t.title || t.text || "";
            value = t.code || t.id || t.value || t.key || text;
        }

        const svc = cleanService.toUpperCase();
        if (svc === String(value).toUpperCase() || svc === String(text).toUpperCase()) {
            found = value;
        }
    });

    return found;
}

function reimbEscape(v) {
    return String(v ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function submitReimb() {
    const { ok, shiftPk, total, receipts } = validateReimbForm();

    if (!ok) return;

    const $selectedShiftOption = $("#reimbShift option:selected");
    const eventName = ($selectedShiftOption.attr("data-event-name") || "").trim();
    const longIdShift = ($selectedShiftOption.attr("data-long-id") || "").trim();

    setReimbStatus("", "muted");

    const fd = new FormData();

    fd.append("code", promoterCode || "");
    fd.append("ip", ip || "");
    fd.append("country", country || "");
    fd.append("city", city || "");

    fd.append("promoterCode", promoterCode || "");
    fd.append("promoterName", promoterName || "");
    fd.append("promoterEmail", promoterEmail || "");
    fd.append("shiftPk", shiftPk || "");
    fd.append("eventName", eventName || "");
    fd.append("longIdShift", longIdShift || "");

    fd.append("expenseAmount", total.toFixed(2));
    fd.append("receiptsMeta", JSON.stringify(receipts));

    reimbFiles.forEach((r) => {
        fd.append("receipts[]", r.file, r.file.name || "receipt");
    });

    setReimbSubmitLoading();

    $.ajax({
        url: API_BASE + "submitReimb4000.php",
        method: "POST",
        data: fd,
        processData: false,
        contentType: false,
        dataType: "json",
        success: function (resp) {
            if (!resp || resp.ok !== true) {
                setReimbStatus(resp?.detail || resp?.error || "Server error while submitting.", "err");
                return;
            }

            if (resp.emailSent === false) {
                console.warn("[REIMB] Inserted but email failed:", resp.emailError);
            }

            setReimbStatus("✔️ Reimbursement Sent", "ok");

            $("#reimbForm")[0].reset();
            reimbFiles = [];
            renderReimbReceiptsList();
            setReimbFileStatus("", "muted");
        },
        error: function (xhr) {
            const msg =
                xhr?.responseJSON?.detail ||
                xhr?.responseText?.slice?.(0, 180) ||
                `Network error (${xhr?.status || "no status"})`;

            setReimbStatus(msg, "err");
        },
        complete: function () {
            resetReimbSubmitButton();
        }
    });
}

function resetReimbReceipt(clearFields = true) {
    $("#reimbReceipt").val("");
    $("#reimbReceiptPreview").empty();
    clearFieldError("reimbReceipt");
    setReimbFileStatus("", "muted");
    reimbSetFileMode(false);
    reimbLockExpenseDate(false);

    if (clearFields) {
        $("#reimbAmount").val("");
        $("#reimbDesc").val("");
        $("#reimbDate").val("");
        $("#expensesType").val("");
        $("#reimbShift").val("");
        $("#reimbDate").val("");
        clearFieldError("expensesType");
        clearFieldError("reimbShift");
    }

    resetReimbSubmitButton();
}


function reimbNormalizeUnknownText(v) {
    let s = String(v || "").trim();

    if (!s) return "";

    // normaliza guiones raros
    s = s.replace(/\s*[—–-]\s*/g, " — ").trim();

    // elimina UNKNOWN solo o combinado
    if (/^UNKNOWN$/i.test(s)) return "";
    if (/^UNKNOWN\s+—\s+UNKNOWN$/i.test(s)) return "";

    // si una parte es UNKNOWN, deja la otra
    s = s.replace(/^UNKNOWN\s+—\s+/i, "");
    s = s.replace(/\s+—\s+UNKNOWN$/i, "");

    // elimina separadores colgando
    s = s.replace(/^\s*—\s*/g, "");
    s = s.replace(/\s*—\s*$/g, "");

    // limpia dobles espacios
    s = s.replace(/\s{2,}/g, " ").trim();

    return s;
}

function reimbBuildDescription(vendor, service) {
    const left = reimbNormalizeUnknownText(vendor);
    const right = reimbNormalizeUnknownText(service);

    const parts = [left, right].filter(Boolean);
    return parts.join(" ");
}

function reimbSetFileMode(hasFile) {
    $("#reimbAddFileBlock").toggle(!hasFile);
    $("#reimbFileActions").toggle(!!hasFile);
}

function reimbApplyExpenseTypeFromService(service) {
    const cleanService = reimbNormalizeUnknownText(service);
    const $sel = $("#expensesType");

    if (!$sel.length) return;

    if (!cleanService) {
        $sel.val("");
        return;
    }

    let matched = false;

    $sel.find("option").each(function () {
        const optVal = String($(this).val() || "").trim().toUpperCase();
        const optText = String($(this).text() || "").trim().toUpperCase();
        const svc = cleanService.toUpperCase();

        if (svc === optVal || svc === optText) {
            $sel.val($(this).val());
            matched = true;
            return false;
        }
    });

    if (!matched) {
        $sel.val("");
    }
}

function reimbPrepareForNewFile() {
    $("#reimbReceiptPreview").empty();
    $("#reimbAmount").val("");
    $("#reimbDesc").val("");
    $("#reimbDate").val("");
    $("#expensesType").val("");
    $("#reimbShift").val("");
    clearFieldError("reimbReceipt");
    clearFieldError("expensesType");
    clearFieldError("reimbShift");
    setReimbFileStatus("", "muted");
    reimbSetFileMode(true);
    reimbLockExpenseDate(false);
    $("#reimbDate").val("");
}


function rcOnAnyChange() {
    rcUpdateVisibilityAll();
    rcAutosave();
}


function rcRenderProductsDatalist() {
    const $dl = $('#' + RC_PRODUCTS_DATALIST_ID);
    if (!$dl.length) return;
    const html = rcProductsMaster
        .map(p => `<option value="${String(p).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]))}"></option>`)
        .join('');
    $dl.html(html);
}

function rcIsInProductsList(value) {
    if (!value) return false;
    const v = String(value).trim().toUpperCase();
    return rcProductsMaster.some(p => String(p).trim().toUpperCase() === v);
}

async function rcEnsureProductExists(value) {
    const name = String(value || '').trim();
    if (!name) return false;
    if (rcIsInProductsList(name)) return true;

    const ok = confirm(`"${name}" no está en el catálogo.\n¿Agregar ahora?`);
    if (!ok) return false;

    // Graba en tu back
    return new Promise((resolve) => {
        $.ajax({
            url: API_BASE + 'addProduct4000.php',
            method: 'POST',
            dataType: 'json',
            data: { productName: name },
            success: function (r) {
                if (r && r.ok) {
                    rcProductsMaster.push(name);
                    rcRenderProductsDatalist();
                    showMessage?.(`Product "${name}" added.`, 'success');
                    resolve(true);
                } else {
                    showMessage?.(r && r.error ? r.error : 'Could not add product.', 'danger');
                    resolve(false);
                }
            },
            error: function () { showMessage?.('Network error while adding product.', 'danger'); resolve(false); }
        });
    });
}


function rcRenderBrandsDatalist() {
    const $dl = $('#' + RC_BRANDS_DATALIST_ID);
    if (!$dl.length) return;
    const html = rcBrandsMaster
        .map(b => `<option value="${String(b).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]))}"></option>`)
        .join('');
    $dl.html(html);
}

function rcIsInBrandsList(value) {
    if (!value) return false;
    const v = String(value).trim().toUpperCase();
    return rcBrandsMaster.some(b => String(b).trim().toUpperCase() === v);
}

async function rcEnsureBrandExists(value) {
    const name = String(value || '').trim();
    if (!name) return false;
    if (rcIsInBrandsList(name)) return true;

    const ok = confirm(`"${name}" no está en el catálogo de marcas.\n¿Agregar ahora?`);
    if (!ok) return false;

    return new Promise((resolve) => {
        $.ajax({
            url: API_BASE + 'addBrand4000.php',
            method: 'POST',
            dataType: 'json',
            data: { brandName: name },
            success: function (r) {
                if (r && r.ok) {
                    rcBrandsMaster.push(name);
                    rcRenderBrandsDatalist();
                    showMessage?.(`Brand "${name}" added.`, 'success');
                    resolve(true);
                } else {
                    showMessage?.(r && r.error ? r.error : 'Could not add brand.', 'danger');
                    resolve(false);
                }
            },
            error: function () { showMessage?.('Network error while adding brand.', 'danger'); resolve(false); }
        });
    });
}

function rcRenderPromotedTable($container, initialRows = []) {
    const listId = RC_PRODUCTS_DATALIST_ID;
    const html = `
    <div class="rc-promoted">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <div class="fw-bold">MOST REQUESTED PRODUCTS</div>
        <button type="button" class="btn btn-sm btn-primary" id="rcAddPromotedRow">Add</button>
      </div>
      <div class="table-responsive">
        <table class="table table-sm align-middle mb-0" id="rcPromotedTable">
          <thead><tr><th style="width:80%"></th><th style="width:20%"></th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>`;
    $container.html(html);

    const $tbody = $container.find('#rcPromotedTable tbody');
    const rowTpl = (value = '') => `
    <tr>
    <td>
        <input type="text"
           class="form-control rc-product-input"
           list="${listId}"
           placeholder="Type or choose"
           value="${value}">
    </td>
    <td class="text-end">
        <button type="button"
            class="btn btn-sm btn-link rcRowDel rc-btn-trash"
            title="Remove">
            <i class="bi bi-trash-fill"></i>
        </button>
    </td>
    </tr>`;


    function addRow(v = '') { $tbody.append(rowTpl(v)); }

    if (Array.isArray(initialRows) && initialRows.length) {
        initialRows.forEach(r => addRow((r && r.product) ? r.product : ''));
    } else { addRow(''); }

    $container.off('click.rcprom')
        .on('click.rcprom', '#rcAddPromotedRow', () => addRow(''))
        .on('click.rcprom', '.rcRowDel', function () { $(this).closest('tr').remove(); if (!$tbody.children().length) addRow(''); })
        .on('blur.rcprom', '.rc-product-input', async function () {
            const val = $(this).val();
            if (!val) return;
            if (!rcIsInProductsList(val)) {
                const ok = await rcEnsureProductExists(val);
                if (!ok) { $(this).val('').focus(); }
            }
        });

    // Exponer getter para submit:
    const getPromotedRowsFn = function () {
        const rows = [];
        $tbody.find('.rc-product-input').each(function () {
            const v = String($(this).val() || '').trim();
            if (v) rows.push({ product: v });
        });
        return rows;
    };

    // 1) Dejarlo en el container 
    $container.data('getPromotedRows', getPromotedRowsFn);

    // 2) Y también en el div real .rc-promoted (para que collectPromoted lo encuentre)
    $container.find('.rc-promoted').data('getPromotedRows', getPromotedRowsFn);

    $(document).trigger('rc:promoted-rendered'); // Si re-scabn

}


function rcRenderCompetitorsTable($container, initialRows = []) {
    const listId = RC_BRANDS_DATALIST_ID;
    const html = `
    <div class="rc-competitors">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <div class="fw-bold">MENTIONED COMPETITOR BRANDS</div>
        <button type="button" class="btn btn-sm btn-primary" id="rcAddCompetitorRow">Add</button>
      </div>
      <div class="table-responsive">
        <table class="table table-sm align-middle mb-0" id="rcCompetitorsTable">
          <thead>
            <tr>
              <th style="width: 100%;"></th>
              <th style="width: 1%;" class="text-end"></th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>`;

    $container.html(html);

    // asegura datalist global existente (si está en index190.html)
    rcRenderBrandsDatalist();

    const $tbody = $container.find('#rcCompetitorsTable tbody');

    const rowTpl = (value = '') => `
    <tr>
        <td>
            <input type="text"
             class="form-control form-control-sm rc-brand-input"
             list="${listId}"
             placeholder="Type a brand..."
             value="${String(value || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]))}">
        </td>
        <td class="text-end">
            <button type="button"
                class="btn btn-sm btn-link rcDelCompetitorRow rc-btn-trash"
                title="Remove">
                <i class="bi bi-trash-fill"></i>
            </button>
        </td>
    </tr>`;

    function addRow(v = '') { $tbody.append(rowTpl(v)); }

    // init rows
    if (Array.isArray(initialRows) && initialRows.length) {
        initialRows.forEach(r => addRow(r?.brand || ''));
    } else {
        addRow('');
    }

    // Add
    $container.off('click.rcComp', '#rcAddCompetitorRow').on('click.rcComp', '#rcAddCompetitorRow', function () {
        addRow('');
    });

    // Del
    $container.off('click.rcCompDel', '.rcDelCompetitorRow').on('click.rcCompDel', '.rcDelCompetitorRow', function () {
        $(this).closest('tr').remove();
        if ($tbody.find('tr').length === 0) addRow('');
    });

    // Validate/auto-add brand (same behavior as products)
    $container.off('change.rcBrand', '.rc-brand-input').on('change.rcBrand', '.rc-brand-input', async function () {
        const v = String($(this).val() || '').trim();
        if (!v) return;
        const ok = await rcEnsureBrandExists(v);
        if (!ok) $(this).val('');
    });

    const getCompetitorRowsFn = () => {
        const rows = [];
        $tbody.find('tr').each(function () {
            const brand = String($(this).find('.rc-brand-input').val() || '').trim();
            if (brand) rows.push({ brand });
        });
        return rows;
    };

    // 1) Guardar getter en el container
    $container.data('getCompetitorRows', getCompetitorRowsFn);

    // 2) Y también en el div real .rc-competitors (para que collectCompetitors lo encuentre)
    $container.find('.rc-competitors').data('getCompetitorRows', getCompetitorRowsFn);

    // trigger
    $(document).trigger('rc:competitors-rendered');

}

async function rcMaybePolishSummaryFieldsBeforeNext() {
    if (rcSummaryPolishBusy) return false;

    const $issues = $("#fld_urgentIssues");
    const $summary = $("#fld_eventSummary");

    if (!$summary.length) return true;

    const stepOfField = $summary.closest(".rc-section").data("i");
    if (stepOfField !== rcCurrentStep) return true;

    const jobs = [];

    const fields = [
        { id: "urgentIssues", $el: $issues, label: "issues" },
        { id: "eventSummary", $el: $summary, label: "summary" }
    ];

    fields.forEach(field => {
        if (!field.$el.length) return;

        const raw = (field.$el.val() || "").trim();
        if (!raw) return;

        const cache = rcLastPolishCache[field.id] || { in: "", out: "" };

        if (raw === cache.in || raw === cache.out) return;

        jobs.push({
            id: field.id,
            $el: field.$el,
            raw
        });
    });

    if (!jobs.length) return true;

    rcSummaryPolishBusy = true;

    const $next = $("#rcNext");
    const $prev = $("#rcPrev");
    const nextHtml = $next.html();

    try {
        $next.prop("disabled", true).addClass("disabled").html('<span class="spinner-border spinner-border-sm"></span> Polishing...');
        $prev.prop("disabled", true).addClass("disabled");

        for (const job of jobs) {
            rcLastPolishCache[job.id] = rcLastPolishCache[job.id] || { in: "", out: "" };
            rcLastPolishCache[job.id].in = job.raw;

            try {
                let processedText;

                if (currentReportCtx?.reportType === "EXPRESS") {
                    processedText = await translateExpressSummary(job.raw);
                } else {
                    processedText = await translateAndPolish(job.raw);
                }

                const out = String(processedText || '').trim();

                // ✅ actualiza DOM
                job.$el.val(out);

                // ✅ actualiza estado interno INMEDIATAMENTE, sin esperar debounce
                reportAnswers[job.id] = out;
                rcAutosave();

                // ✅ refresca error visual inmediatamente
                const fdef = (reportSchema.sections || [])
                    .flatMap(sec => sec.fields || [])
                    .find(x => x.id === job.id);

                if (fdef) {
                    const err = rcValidateField(fdef, out);
                    rcShowError(job.id, err);
                } else {
                    rcShowError(job.id, "");
                }

                rcLastPolishCache[job.id].out = out;

            } catch (e) {
                console.error(`[rc polish] ${job.id} error:`, e);

                if (e === 'offline') {
                    showMessage('🚫 No internet connection. Translation is not available right now.', 'warning');
                }

                rcLastPolishCache[job.id].out = job.raw;
            }
        }

        return true;
    } catch (e) {
        console.error("[rc polish] general error:", e);
        showMessage("Could not polish the text. Continuing with original content.", "warning");
        return true;
    } finally {
        $next.prop("disabled", false).removeClass("disabled").html(nextHtml);
        $prev.prop("disabled", false).removeClass("disabled");
        rcSummaryPolishBusy = false;
    }
}

function translateExpressSummary(text) {
    return new Promise((resolve, reject) => {

        const raw = String(text || '').trim();

        if (!raw) {
            resolve('');
            return;
        }

        if (!navigator.onLine) {
            reject('offline');
            return;
        }

        $.ajax({
            url: API_BASE + 'translateExpress4000.php',
            method: 'POST',
            dataType: 'json',
            timeout: 60000,
            data: {
                text: raw
            },

            success: function (resp) {

                if (resp && resp.ok && typeof resp.translation === 'string') {
                    resolve(resp.translation.trim());
                    return;
                }

                reject(resp?.error || 'translate_failed');
            },

            error: function (xhr, status, err) {
                console.error(
                    '[translateExpressSummary]',
                    status,
                    err,
                    xhr?.responseText
                );

                reject(err || status || 'network_error');
            }
        });
    });
}

////////////////////////////////////////////////////
// ===================== LIVE SUPERVISOR (v215) =====================

// --- GLOBAL: cierre duro del menú (para usar desde cualquier función) ---
function closeMenuHard() {
    const $menu = $("#sideMenu");
    const $backdrop = $("#sideMenuBackdrop");
    const $hamburger = $("#hamburgerBtn");

    // mismo comportamiento de tu closeMenu() interno
    $menu.removeClass("open").attr({ "aria-hidden": "true", inert: "" });
    $backdrop.removeClass("show");
    $hamburger.attr("aria-expanded", "false");
}

function formatShiftDateShort(dateStr) {
    if (!dateStr) return "";

    // dateStr esperado: YYYY-MM-DD
    const [y, m, d] = dateStr.split("-").map(Number);
    if (!y || !m || !d) return dateStr;

    const dt = new Date(y, m - 1, d);

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayName = days[dt.getDay()];

    const yy = String(y).slice(-2);

    return `${dayName} ${m}/${d}/${yy}`;
}


$(document)
    .off("click.liveSup", "#menuLiveSupervisor")
    .on("click.liveSup", "#menuLiveSupervisor", function () {
        closeMenuHard();
        openLiveSupervisorView();
    });

function buildShiftListViewShell({
    sectionId,
    title,
    closeBtnId,
    closeAriaLabel,
    bodyId,
    loadingId,
    extraTopHtml = "",
    listId
}) {
    return `
    <section id="${sectionId}" aria-live="polite">
        <div class="live-header">
                
            <div class="header-close-row">
                <button id="${closeBtnId}" class="section-close-red" aria-label="${closeAriaLabel}">
                <i class="bi bi-x-circle" aria-hidden="true"></i>
                </button>
            </div>

            <div class="header-title-row">
                <h4 class="live-title">${title}</h4>
            </div>
        </div>

        ${extraTopHtml}

        <div class="rc-live-body" id="${bodyId}">
            <div class="rc-live-loading" id="${loadingId}">Loading...</div>
            <div id="${listId}"></div>
        </div>
    </section>
    `;
}


$(document)
    .off("click.liveCompact", "#menuLiveCompact")
    .on("click.liveCompact", "#menuLiveCompact", function () {
        closeMenuHard();
        openLiveCompactView();
    });

async function openLiveCompactView() {
    try {
        appCloseAllViewsHard({ showMain: false });
        $("#liveCompactView").remove();

        $(".container").append(
            buildShiftListViewShell({
                sectionId: "liveCompactView",
                title: "LIVE COMPACT VIEW",
                closeBtnId: "closeLiveCompactBtn",
                closeAriaLabel: "Close Live Compact View",
                bodyId: "liveCompactBody",
                loadingId: "liveCompactLoading",
                listId: "liveCompactList"
            })
        );

        $("#liveCompactView .live-header").replaceWith(`
        <div class="gl-section-header">
            <div class="gl-section-title">
                <span class="gl-title-primary">LIVE COMPACT</span>
                <span class="gl-title-secondary">VIEW</span>
            </div>

            <button type="button" id="closeLiveCompactBtn"
                class="gl-scheduler-close"
                aria-label="Close Live Compact View">
                <i class="bi bi-x-circle" aria-hidden="true"></i>
            </button>
        </div>
        `);


        const shiftCalcDate = getLocalYYYYMMDD();

        const resp = await $.ajax({
            url: API_BASE + "getLiveSupervisor4000.php",
            method: "GET",
            dataType: "json",
            data: { shiftCalcDate }
        });

        if (!resp || !resp.success) {
            $("#liveCompactLoading").text("Error loading shifts.");
            return;
        }

        liveSupAllShifts = resp.shifts || [];
        renderLiveCompact(liveSupAllShifts);
        $("#liveCompactLoading").hide();

    } catch (err) {
        console.error("[LiveCompact] error:", err);
        $("#liveCompactLoading").text("Error loading shifts.");
    }
}

$(document)
    .off("click.liveCompactClose", "#closeLiveCompactBtn")
    .on("click.liveCompactClose", "#closeLiveCompactBtn", function () {
        $("#liveCompactView").remove();
        $("#main-view").show();
    });

function renderLiveCompact(shifts) {
    if (!Array.isArray(shifts) || shifts.length === 0) {
        $("#liveCompactList").html(`<div class="rc-live-empty">No shifts found for today.</div>`);
        return;
    }

    let html = `<div class="lc-table">`;

    shifts.forEach((s) => {
        const inDone = !!s.checkInLocalTime;
        const outDone = !!s.checkOutLocalTime;

        const hasBreak =
            !!s.breakStartLocalTime ||
            Number(s.breaksCounter || 0) > 0 ||
            Number(s.isOnBreak || 0) === 1;

        const inClass = inDone ? "lc-action lc-in lc-done" : "lc-action lc-empty";
        const outClass = outDone ? "lc-action lc-out lc-done" : "lc-action lc-empty";
        const breakClass = hasBreak ? "lc-break lc-break-on" : "lc-break";

        const pk = escapeAttr(s.pk || "");
        const promoter = escapeHtml(s.promoterName || "");
        const eventName = escapeHtml(s.eventName || "");
        const market = escapeHtml(s.market || "");
        const location = escapeHtml(s.location1 || s.location || "");
        const fromTo = escapeHtml(s.fromTo || "");
        const shiftDate = escapeHtml(s.shiftCalcDate || s.shiftDate || "");
        const checkInTime = escapeHtml(s.checkInLocalTime || "");
        const checkOutTime = escapeHtml(s.checkOutLocalTime || "");
        const checkInPhoto = escapeAttr(s.checkInPhotoUrl || "");
        const checkOutPhoto = escapeAttr(s.checkOutPhotoUrl || "");

        html += `
            <div class="lc-row" data-pk="${pk}">
                <div class="lc-info">
                    <div class="lc-promoter">${promoter}</div>

                    <button type="button"
                        class="lc-event ls-shift-link"
                        data-pk="${pk}">
                        ${eventName}
                    </button>

                    <div class="lc-meta">
                        ${market}${location ? " - " + location : ""} - ${pk}
                    </div>

                    <div class="lc-date">
                        ${shiftDate} - ${fromTo}
                    </div>
                </div>

                <button
                    type="button"
                    class="${inClass}"
                    ${inDone ? "" : "disabled"}
                    data-photo="${checkInPhoto}"
                    data-title="CHECK IN"
                    onclick="openPhotoModalFromBtn(this)">
                    ${inDone ? `IN<br><span>${checkInTime}</span>` : "---"}
                </button>

                <div class="${breakClass}" title="Break signal">
                    ${hasBreak ? "(B)" : ""}
                </div>

                <button
                    type="button"
                    class="${outClass}"
                    ${outDone ? "" : "disabled"}
                    data-photo="${checkOutPhoto}"
                    data-title="CHECK OUT"
                    onclick="openPhotoModalFromBtn(this)">
                    ${outDone ? `OUT<br><span>${checkOutTime}</span>` : "---"}
                </button>
            </div>
        `;
    });

    html += `</div>`;

    $("#liveCompactList").html(html);
    ensurePhotoModalExists();
}

async function openLiveSupervisorView() {

    try {
        appCloseAllViewsHard({ showMain: false });
        $("#liveSupervisorView").remove();
        $(".container").append(
            buildShiftListViewShell({
                sectionId: "liveSupervisorView",
                title: "LIVE SUPERVISOR",
                closeBtnId: "closeLiveSupervisorBtn",
                closeAriaLabel: "Close Live Supervisor",
                bodyId: "liveSupBody",
                loadingId: "liveSupLoading",
                listId: "liveSupList",
                extraTopHtml: `
                    <div class="ls-filters">
                        <div class="ls-filter">
                            <select id="lsMarket" class="form-select form-select-sm">
                            <option value="">All Markets</option>
                            </select>
                        </div>
                        <div class="ls-filter">
                            <select id="lsVenue" class="form-select form-select-sm" disabled>
                            <option value="">All Venues</option>
                            </select>
                        </div>
                        <button id="lsClearFilters" class="btn btn-sm btn-outline-secondary ls-clear">Clear</button>
                    </div>
                `
            })
        );

        $("#liveSupervisorView .live-header").replaceWith(`
            <div class="gl-section-header">
                <div class="gl-section-title">
                    <span class="gl-title-primary">TODAY FULL</span>
                    <span class="gl-title-secondary">VIEW</span>
                </div>
                <button type="button" id="closeLiveSupervisorBtn" class="gl-scheduler-close" aria-label="Close">
                    <i class="bi bi-x-circle" aria-hidden="true"></i>
                </button>
            </div>
        `);

        const shiftCalcDate = getLocalYYYYMMDD();
        const resp = await $.ajax({
            url: API_BASE + "getLiveSupervisor4000.php",
            method: "GET",
            dataType: "json",
            data: { shiftCalcDate }
        });


        if (!resp || !resp.success) {
            $("#liveSupLoading").text("Error loading shifts.");
            return;
        }

        // console.log("[LiveSupervisor] resp.shifts[0] =", (resp.shifts || [])[0]);

        liveSupAllShifts = resp.shifts || [];
        loadLiveSupFiltersFromStorage();
        buildLiveSupFilterOptions(liveSupAllShifts);
        renderLiveSupervisor(applyLiveSupFilters(liveSupAllShifts));
        $("#liveSupLoading").hide();

    } catch (err) {
        console.error("[LiveSupervisor] error:", err);
        $("#liveSupLoading").text("Error loading shifts.");
    }
}

$(document)
    .off("change.lsFilters", "#lsMarket, #lsVenue")
    .on("change.lsFilters", "#lsMarket, #lsVenue", function () {

        liveSupFilters.market = $("#lsMarket").val() || "";
        liveSupFilters.venue = $("#lsVenue").val() || "";

        // cascada: si cambia market, resetea venue
        if (this.id === "lsMarket") {
            liveSupFilters.venue = "";
            $("#lsVenue").val("");
            buildLiveSupFilterOptions(liveSupAllShifts);
        }

        saveLiveSupFiltersToStorage();
        renderLiveSupervisor(applyLiveSupFilters(liveSupAllShifts));
    });

$(document)
    .off("click.lsClear", "#lsClearFilters")
    .on("click.lsClear", "#lsClearFilters", function () {
        liveSupFilters = { market: "", venue: "" };
        $("#lsMarket").val("");
        $("#lsVenue").val("").prop("disabled", true);
        saveLiveSupFiltersToStorage();
        buildLiveSupFilterOptions(liveSupAllShifts);
        renderLiveSupervisor(applyLiveSupFilters(liveSupAllShifts));
    });

function applyLiveSupFilters(arr) {
    const m = (liveSupFilters.market || "").trim();
    const v = (liveSupFilters.venue || "").trim();

    return (arr || []).filter(s => {
        if (m && (s.market || "").trim() !== m) return false;
        if (v && (s.location || "").trim() !== v) return false; // Venue = location
        return true;
    });
}

function buildLiveSupFilterOptions(all) {
    const $m = $("#lsMarket");
    const $v = $("#lsVenue");
    if (!$m.length) return;

    const markets = uniqueSorted((all || []).map(x => (x.market || "").trim()).filter(Boolean));
    fillSelect($m, markets, liveSupFilters.market);

    const base = liveSupFilters.market
        ? all.filter(x => (x.market || "").trim() === liveSupFilters.market)
        : all;

    const venues = uniqueSorted(base.map(x => (x.location || "").trim()).filter(Boolean));
    fillSelect($v, venues, liveSupFilters.venue);
    $v.prop("disabled", venues.length === 0);
}

function fillSelect($sel, options, selectedVal) {
    const current = selectedVal || "";
    const isVenue = $sel.attr("id") === "lsVenue";

    $sel.empty();
    $sel.append(`<option value="">${isVenue ? "All Venues" : "All Markets"}</option>`);

    options.forEach(opt => {
        const safe = escapeAttr(opt);
        $sel.append(`<option value="${safe}">${escapeHtml(opt)}</option>`);
    });

    $sel.val(current);
}

function uniqueSorted(arr) {
    return [...new Set(arr)].sort((a, b) => a.localeCompare(b));
}

function saveLiveSupFiltersToStorage() {
    try { localStorage.setItem("liveSupFiltersV204", JSON.stringify(liveSupFilters)); } catch (e) { }
}

function loadLiveSupFiltersFromStorage() {
    try {
        const raw = localStorage.getItem("liveSupFiltersV204");
        if (raw) liveSupFilters = { ...liveSupFilters, ...JSON.parse(raw) };
    } catch (e) { }
}


$(document)
    .off("click.liveSupClose", "#closeLiveSupervisorBtn")
    .on("click.liveSupClose", "#closeLiveSupervisorBtn", function () {
        $("#liveSupervisorView").remove();
        $("#main-view").show();   // ✅ este es el ID real en tu HTML
    });

// ===============================================================


function renderLiveSupervisor(shifts) {
    if (!shifts.length) {
        $("#liveSupList").html(`<div class="rc-live-empty">No shifts found for today.</div>`);
        return;
    }

    let html = `<div class="rc-live-grid">`;

    shifts.forEach((s) => {
        const inDone = !!(s.checkInLocalTime);
        const outDone = !!(s.checkOutLocalTime);
        const breakStarted = !!(s.breakStartLocalTime);
        const onBreak = (s.isOnBreak == 1);

        // estilos de botones:
        // - IN: verde si existe, neutral si no
        // - BREAK: azul si existe START BREAK; si está ON BREAK, lo resaltamos un poquito
        // - OUT: verde si existe, neutral si no
        const inBtnClass = inDone ? "btn btn-sm rc-btn-state rc-btn-in-done" : "btn btn-sm rc-btn-state rc-btn-empty";
        const outBtnClass = outDone ? "btn btn-sm rc-btn-state rc-btn-out-done" : "btn btn-sm rc-btn-state rc-btn-empty";
        const breakBoxClass = breakStarted ? (onBreak ? "rc-break-box rc-break-on" : "rc-break-box rc-break-done") : "rc-break-box rc-break-empty";

        const inText = inDone ? s.checkInLocalTime : "";
        const breakText = breakStarted ? s.breakStartLocalTime : "";
        const outText = outDone ? s.checkOutLocalTime : "";

        html += `
      <div class="rc-live-row" data-pk="${s.pk}">
        <div class="rc-live-info">
          <div class="rc-live-name">${escapeHtml(s.promoterName || "")}</div>
          <div class="rc-live-event">
            <button type="button"
                class="ls-shift-link"
                data-pk="${escapeAttr(s.pk || '')}">
                ${escapeHtml(s.eventName || "")}
            </button>
          </div>
          <div class="rc-live-meta">
            <span>${escapeHtml(s.market || "")}</span>
            <span class="rc-dot">•</span>
            <span>${escapeHtml(s.location || "")}</span>
          </div>
          <div class="rc-live-meta2">
            <span>${formatShiftDateShort(s.shiftCalcDate)}</span>
            <span class="rc-dot">•</span>
            <span>${escapeHtml(s.fromTo || "")}</span>
          </div>
        </div>

        <div class="rc-live-states">
          <button
            class="${inBtnClass}"
            ${inDone ? "" : "disabled"}
            data-photo="${escapeAttr(s.checkInPhotoUrl || "")}"
            data-title="CHECK IN"
            onclick="openPhotoModalFromBtn(this)"
          >
            ${inDone ? "IN<br><span class='rc-time'>" + inText + "</span>" : "IN"}
          </button>

          <div class="${breakBoxClass}">
            <div class="rc-break-label">BREAK</div>
            <div class="rc-break-time">${breakText || ""}</div>
          </div>

          <button
            class="${outBtnClass}"
            ${outDone ? "" : "disabled"}
            data-photo="${escapeAttr(s.checkOutPhotoUrl || "")}"
            data-title="CHECK OUT"
            onclick="openPhotoModalFromBtn(this)"
          >
            ${outDone ? "OUT<br><span class='rc-time'>" + outText + "</span>" : "OUT"}
          </button>
        </div>
      </div>
    `;
    });

    html += `</div>`;
    $("#liveSupList").html(html);

    ensurePhotoModalExists();
}

function lsToBool(v) {
    return String(v) === "1" || v === 1 || v === true || String(v).toLowerCase() === "true";
}

function lsToInt(v, fallback = 0) {
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? fallback : n;
}

function getLiveSupShiftByPk(pk) {
    return (liveSupAllShifts || []).find(s => String(s.pk) === String(pk)) || null;
}


function openLsSignalsModalByPk(pk) {
    const shift = getLiveSupShiftByPk(pk);
    console.table({
        pk: shift?.pk,
        faceDetectionIn: shift?.faceDetectionIn,
        environmentAnalysisIn: shift?.environmentAnalysisIn,
        faceDetectionOut: shift?.faceDetectionOut,
        environmentAnalysisOut: shift?.environmentAnalysisOut
    });

    if (!shift) {
        showMessage("Shift not found.", "warning");
        return;
    }

    lsCurrentShiftPk = String(shift.pk || "");
    document.getElementById("sfLine1").textContent = shift.eventName;

    document.getElementById("sfLine2").textContent = shift.promoterName + " (" + shift.promoterCode + ")";

    document.getElementById("sfLine3").textContent = shift.market + " * " + shift.shiftDate + " * " + shift.fromTo;

    $("#applyCheckInDistanceRestriction").prop("checked", lsToBool(shift.applyCheckInDistanceRestriction));
    $("#requirePhotoCheckIn").prop("checked", lsToBool(shift.requirePhotoCheckIn));
    $("#shiftFaceDetectionIn").prop("checked", lsToBool(shift.faceDetectionIn));
    $("#shiftEnvironmentAnalysisIn").prop("checked", lsToBool(shift.environmentAnalysisIn));

    $("#allowEarlyCheckIn").prop("checked", lsToBool(shift.allowEarlyCheckIn));
    $("#enableLateCheckInAlerts").prop("checked", lsToBool(shift.enableLateCheckInAlerts));
    $("#lateAlertsCounter").val(lsToInt(shift.lateAlertsCounter, 0));

    $("#applyCheckOutTimeRestriction").prop("checked", lsToBool(shift.applyCheckOutTimeRestriction));
    $("#requirePhotoCheckOut").prop("checked", lsToBool(shift.requirePhotoCheckOut));
    $("#shiftFaceDetectionOut").prop("checked", lsToBool(shift.faceDetectionOut));
    $("#shiftEnvironmentAnalysisOut").prop("checked", lsToBool(shift.environmentAnalysisOut));
    $("#enableCheckOutAlerts").prop("checked", lsToBool(shift.enableCheckOutAlerts));
    $("#lateCheckOutAlertsCounter").val(lsToInt(shift.lateCheckOutAlertsCounter, 0));

    $("#requireBreak").prop("checked", lsToBool(shift.requireBreak));
    $("#maxBreaksAllowed").val(lsToInt(shift.maxBreaksAllowed, 0));
    $("#breaksCounter").val(lsToInt(shift.breaksCounter, 0));

    $("#mandatoryReportBeforeCheckOut").prop("checked", lsToBool(shift.mandatoryReportBeforeCheckOut));
    // Reset SHIFT FLAGS notification and button state.
    $("#lsSignalsStatus")
        .stop(true, true)
        .hide()
        .removeClass("is-success is-error")
        .empty();

    $("#lsSignalsSubmitBtn, .ls-signals-cancel")
        .prop("disabled", false);

    const modalEl = document.getElementById("lsSignalsModal");
    const modal = new bootstrap.Modal(modalEl, { backdrop: "static", keyboard: false });
    modal.show();
}

$(document)
    .off("click.lsShiftLink", ".ls-shift-link")
    .on("click.lsShiftLink", ".ls-shift-link", function (e) {
        e.preventDefault();
        e.stopPropagation();
        const pk = $(this).data("pk");
        openLsSignalsModalByPk(pk);
    });

// SHIFT FLAGS — Cancel and return to top
$(document)
    .off("click.lsSignalsCancel", ".ls-signals-cancel")
    .on("click.lsSignalsCancel", ".ls-signals-cancel", function () {

        const modalEl = document.getElementById("lsSignalsModal");

        // Clear any previous status message.
        $("#lsSignalsStatus")
            .stop(true, true)
            .hide()
            .removeClass("is-success is-error")
            .empty();

        lsCurrentShiftPk = "";

        // The Cancel button already closes the modal via data-bs-dismiss.
        // Return to the top as soon as the modal finishes closing.
        if (modalEl) {
            $(modalEl).one("hidden.bs.modal.lsCancel", function () {
                window.scrollTo({ top: 0, behavior: "instant" });
            });
        }
    });


$(document)
    .off("click.lsSignalsSubmit", "#lsSignalsSubmitBtn")
    .on("click.lsSignalsSubmit", "#lsSignalsSubmitBtn", function () {

        //console.log("PK before ajax:", lsCurrentShiftPk);

        const payload = {
            code: promoterCode,
            ip: ip,
            country: country,
            city: city,
            pk: lsCurrentShiftPk,
            applyCheckInDistanceRestriction: $("#applyCheckInDistanceRestriction").is(":checked") ? 1 : 0,
            requirePhotoCheckIn: $("#requirePhotoCheckIn").is(":checked") ? 1 : 0,
            faceDetectionIn: $("#shiftFaceDetectionIn").is(":checked") ? 1 : 0,
            environmentAnalysisIn: $("#shiftEnvironmentAnalysisIn").is(":checked") ? 1 : 0,
            allowEarlyCheckIn: $("#allowEarlyCheckIn").is(":checked") ? 1 : 0,
            enableLateCheckInAlerts: $("#enableLateCheckInAlerts").is(":checked") ? 1 : 0,
            lateAlertsCounter: lsToInt($("#lateAlertsCounter").val(), 0),
            applyCheckOutTimeRestriction: $("#applyCheckOutTimeRestriction").is(":checked") ? 1 : 0,
            requirePhotoCheckOut: $("#requirePhotoCheckOut").is(":checked") ? 1 : 0,
            faceDetectionOut: $("#shiftFaceDetectionOut").is(":checked") ? 1 : 0,
            environmentAnalysisOut: $("#shiftEnvironmentAnalysisOut").is(":checked") ? 1 : 0,
            enableCheckOutAlerts: $("#enableCheckOutAlerts").is(":checked") ? 1 : 0,
            lateCheckOutAlertsCounter: lsToInt($("#lateCheckOutAlertsCounter").val(), 0),
            requireBreak: $("#requireBreak").is(":checked") ? 1 : 0,
            maxBreaksAllowed: lsToInt($("#maxBreaksAllowed").val(), 0),
            breaksCounter: lsToInt($("#breaksCounter").val(), 0),
            mandatoryReportBeforeCheckOut: $("#mandatoryReportBeforeCheckOut").is(":checked") ? 1 : 0,
        };

        //console.log("[lsSignals] payload before ajax:", payload);

        if (!payload.pk || Number(payload.pk) <= 0) {
            showMessage("Invalid shift PK.", "danger");
            return;
        }

        const $btn = $("#lsSignalsSubmitBtn");
        const oldHtml = $btn.html();

        $btn.prop("disabled", true)
            .html('<span class="spinner-border spinner-border-sm"></span> Saving...');

        $(".ls-signals-cancel").prop("disabled", true);



        $.ajax({
            url: API_BASE + "updateShiftSignals4000.php",
            method: "POST",
            dataType: "json",
            data: payload
        })
            .done(function (res) {

                if (!res || !res.success) {
                    const errorText = (res && res.message)
                        ? res.message
                        : "Could not update signals.";

                    $("#lsSignalsStatus")
                        .stop(true, true)
                        .removeClass("is-success")
                        .addClass("is-error")
                        .empty()
                        .append(
                            $('<i class="bi bi-x-circle-fill"></i>'),
                            document.createTextNode(" Changes Not Saved — " + errorText)
                        )
                        .fadeIn(200);

                    return;
                }

                const idx = (liveSupAllShifts || []).findIndex(s => String(s.pk) === String(payload.pk));
                if (idx >= 0) {
                    liveSupAllShifts[idx] = {
                        ...liveSupAllShifts[idx],
                        ...payload
                    };
                }
                renderLiveSupervisor(applyLiveSupFilters(liveSupAllShifts));
                const modalEl = document.getElementById("lsSignalsModal");
                const modal = bootstrap.Modal.getInstance(modalEl);
                lsCurrentShiftPk = "";

                // Lock actions while the success confirmation is displayed.
                $("#lsSignalsSubmitBtn, .ls-signals-cancel")
                    .prop("disabled", true);

                const $status = $("#lsSignalsStatus");
                $status
                    .stop(true, true)
                    .removeClass("is-error")
                    .addClass("is-success")
                    .html('<i class="bi bi-check-circle-fill"></i> Changes Saved')
                    .fadeIn(200);

                // Mostrar la confirmación durante 3 segundos.
                setTimeout(function () {
                    $status.fadeOut(300, function () {

                        // Esperar 2 segundos adicionales antes de regresar.
                        setTimeout(function () {
                            if (modal) {
                                $(modalEl).one("hidden.bs.modal", function () {
                                    window.scrollTo({ top: 0, behavior: "instant" });
                                });
                                modal.hide();
                            } else {
                                window.scrollTo({ top: 0, behavior: "instant" });
                            }
                        }, 2000);

                    });
                }, 3000);
            })

            .fail(function (xhr) {
                console.error("[lsSignals] save error:", xhr && xhr.responseText);

                $("#lsSignalsStatus")
                    .stop(true, true)
                    .removeClass("is-success")
                    .addClass("is-error")
                    .html(
                        '<i class="bi bi-x-circle-fill"></i> ' +
                        'Changes Not Saved — Connection Error'
                    )
                    .fadeIn(200);
            })

            .always(function () {
                $btn.html(oldHtml);

                // Keep both buttons disabled after a successful save,
                // until the confirmation finishes and the modal closes.
                if (lsCurrentShiftPk === "") {
                    return;
                }

                // Re-enable actions after a failed save.
                $btn.prop("disabled", false);
                $(".ls-signals-cancel").prop("disabled", false);
            });

    });

$(document)
    .off("click.menuHistory", "#menuCheckHistory")
    .on("click.menuHistory", "#menuCheckHistory", function () {
        openCheckHistoryView();
    });

async function openCheckHistoryView() {
    try {
        appCloseAllViewsHard({ showMain: false });
        $("#checkHistoryView").remove();
        $(".container").append(
            buildShiftListViewShell({
                sectionId: "checkHistoryView",
                title: "TIMEKEEPING HISTORY",
                closeBtnId: "closeHistoryBtn",
                closeAriaLabel: "Close Check History",
                bodyId: "historyBody",
                loadingId: "historyLoading",
                listId: "historyList",
                extraTopHtml: `
            <div class="live-header-actions">
                <button id="openHistoryFiltersBtn" class="btn btn-sm btn-outline-primary">
                    <i class="bi bi-funnel"></i> Filters
                </button>

                <button id="exportHistoryXlsxBtn" class="btn btn-sm btn-outline-success d-none">
                    <i class="bi bi-file-earmark-excel"></i> Export
                </button>
            </div>
        `
            })
        );

        $("#checkHistoryView .live-header").replaceWith(`
        <div class="gl-section-header">
            <div class="gl-section-title">
                <span class="gl-title-primary">TIMEKEEPING</span>
                <span class="gl-title-secondary">HISTORY</span>
            </div>
            <button type="button" id="closeHistoryBtn" class="gl-scheduler-close" aria-label="Close Timekeeping History">
                <i class="bi bi-x-circle" aria-hidden="true"></i>
            </button>
        </div>
        `);

        $("#exportHistoryXlsxBtn").addClass("d-none");
        ensureHistoryFiltersModalExists();
        seedHistoryDefaultFilters();      // hoy y 6 días atrás
        await loadHistoryPromoters();     // llena dropdown promoters para ese rango
        await fetchAndRenderHistory();    // carga historia por default
        // openHistoryFiltersModal();        // abre modal al entrar    // abre modal al entrar

    } catch (err) {
        console.error("[History] error:", err);
    }
}

$(document)
    .off("click.openHistoryFilters", "#openHistoryFiltersBtn")
    .on("click.openHistoryFilters", "#openHistoryFiltersBtn", function () {
        openHistoryFiltersModal();
    });

$(document)
    .off("click.closeHistory", "#closeHistoryBtn")
    .on("click.closeHistory", "#closeHistoryBtn", function () {
        appCloseAllViewsHard({ showMain: true });
    });

function ensureHistoryFiltersModalExists() {
    if ($("#historyFiltersModal").length) return;

    $("body").append(`
    <div class="modal fade" id="historyFiltersModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">History Filters</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>

          <div class="modal-body">
            <div class="mb-2">
              <label class="form-label">From</label>
              <input type="date" id="hfFrom" class="form-control">
            </div>

            <div class="mb-2">
              <label class="form-label">To</label>
              <input type="date" id="hfTo" class="form-control">
            </div>

            <div class="mb-2">
                <label class="form-label">Market</label>
                <select id="hfMarket" class="form-select">
                <option value="">All</option>
                </select>
            </div>

            <div class="mb-2">
                <label class="form-label">Location</label>
                <select id="hfLocation" class="form-select" disabled>
                <option value="">All</option>
                </select>
            </div>

            <div class="mb-2">
              <label class="form-label">Promoter</label>
              <select id="hfPromoter" class="form-select">
                <option value="">All</option>
              </select>
            </div>

            <div class="small text-muted" id="hfHint"></div>
          </div>

          <div class="modal-footer">
            <button id="hfClear" type="button" class="btn btn-outline-secondary">Clear</button>
            <button id="hfApply" type="button" class="btn btn-primary">Apply</button>
          </div>
        </div>
      </div>
    </div>
  `);
}

function openHistoryFiltersModal() {
    $("#hfFrom").val(historyFilters.dateFrom || "");
    $("#hfTo").val(historyFilters.dateTo || "");
    $("#hfMarket").val(historyFilters.market || "");
    $("#hfLocation").val(historyFilters.location || "");
    $("#hfPromoter").val(historyFilters.promoterCode || "");
    $("#hfHint").text("");

    const modalEl = document.getElementById("historyFiltersModal");
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

$(document)
    .off("click.openHistFilters", "#openHistoryFiltersBtn")
    .on("click.openHistFilters", "#openHistoryFiltersBtn", function () {
        openHistoryFiltersModal();
    });

$(document)
    .off("click.histClear", "#hfClear")
    .on("click.histClear", "#hfClear", async function () {
        seedHistoryDefaultFilters();

        $("#hfFrom").val(historyFilters.dateFrom);
        $("#hfTo").val(historyFilters.dateTo);
        $("#hfMarket").val("");
        $("#hfLocation").empty().append('<option value="">All</option>').prop("disabled", true);
        $("#hfPromoter").val("");
        $("#hfHint").text("");

        await loadHistoryPromoters();

        bootstrap.Modal.getOrCreateInstance(document.getElementById("historyFiltersModal")).hide();
        await fetchAndRenderHistory();
    });

$(document)
    .off("click.histApply", "#hfApply")
    .on("click.histApply", "#hfApply", async function () {
        historyFilters.dateFrom = $("#hfFrom").val() || "";
        historyFilters.dateTo = $("#hfTo").val() || "";
        historyFilters.market = $("#hfMarket").val() || "";
        historyFilters.location = $("#hfLocation").val() || "";

        historyFilters.promoterCode = $("#hfPromoter").val() || "";

        if (!historyFilters.dateFrom || !historyFilters.dateTo) {
            $("#hfHint").text("Please select From and To.");
            return;
        }
        if (historyFilters.dateFrom > historyFilters.dateTo) {
            $("#hfHint").text("From cannot be after To.");
            return;
        }

        bootstrap.Modal.getOrCreateInstance(document.getElementById("historyFiltersModal")).hide();
        await fetchAndRenderHistory();
    });

function seedHistoryDefaultFilters() {
    const today = new Date();
    const to = formatYYYYMMDD(today);
    const fromDt = new Date(today);
    fromDt.setDate(fromDt.getDate() - 6);
    historyFilters.dateFrom = formatYYYYMMDD(fromDt);
    historyFilters.dateTo = to;
    historyFilters.promoterCode = "";
    historyFilters.market = "";
    historyFilters.location = "";
}

function formatYYYYMMDD(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

async function loadHistoryPromoters() {
    try {
        if (!historyFilters.dateFrom || !historyFilters.dateTo) return;

        const resp = await $.ajax({
            url: API_BASE + "getPromotersForHistory4000.php",
            method: "GET",
            dataType: "json",
            data: { dateFrom: historyFilters.dateFrom, dateTo: historyFilters.dateTo }
        });

        historyPromoters = (resp && resp.success) ? (resp.promoters || []) : [];

        const $sel = $("#hfPromoter");
        if (!$sel.length) return;
        $sel.empty().append(`<option value="">All</option>`);

        historyPromoters.forEach(p => {
            $sel.append(`<option value="${escapeAttr(p.promoterCode || "")}">${escapeHtml(p.promoterName || "")}</option>`);
        });

    } catch (e) {
        console.error("[History] load promoters error:", e);
    }
    await loadHistoryMarketsLocations();
}

async function loadHistoryMarketsLocations() {
    try {
        const resp = await $.ajax({
            url: API_BASE + "getHistoryMarketsLocations4000.php",
            method: "GET",
            dataType: "json",
            data: {
                dateFrom: historyFilters.dateFrom,
                dateTo: historyFilters.dateTo,
                promoterCode: $("#hfPromoter").val() || historyFilters.promoterCode || ""
            }
        });

        if (!resp || !resp.success) return;

        historyML.markets = resp.markets || [];
        historyML.locationsByMarket = resp.locationsByMarket || {};

        // fill market select
        const $m = $("#hfMarket");
        const $l = $("#hfLocation");
        if (!$m.length) return;

        $m.empty().append(`<option value="">All</option>`);
        historyML.markets.forEach(mm => {
            $m.append(`<option value="${escapeAttr(mm)}">${escapeHtml(mm)}</option>`);
        });

        // restore
        $m.val(historyFilters.market || "");

        // update locations based on market
        refreshHistoryLocationsSelect();

    } catch (e) {
        console.error("[History] load markets/locations error:", e);
    }
}

function refreshHistoryLocationsSelect() {
    const market = $("#hfMarket").val() || "";
    const $l = $("#hfLocation");

    $l.empty().append(`<option value="">All</option>`);

    const locs = market ? (historyML.locationsByMarket[market] || []) : [];
    locs.forEach(ll => {
        $l.append(`<option value="${escapeAttr(ll)}">${escapeHtml(ll)}</option>`);
    });

    $l.prop("disabled", !market || locs.length === 0);

    // restore location only if matches
    if (market && historyFilters.location) {
        $l.val(historyFilters.location);
    } else {
        $l.val("");
    }
}


$(document)
    .off("change.histMarket", "#hfMarket")
    .on("change.histMarket", "#hfMarket", function () {
        historyFilters.market = $("#hfMarket").val() || "";
        historyFilters.location = "";
        $("#hfLocation").val("");
        refreshHistoryLocationsSelect();
    });

$(document)
    .off("change.histLoc", "#hfLocation")
    .on("change.histLoc", "#hfLocation", function () {
        historyFilters.location = $("#hfLocation").val() || "";
    });


async function fetchAndRenderHistory() {
    try {

        $("#exportHistoryXlsxBtn").addClass("d-none");
        $("#historyLoading").text("Loading history...");
        $("#historyList").empty();

        const resp = await $.ajax({
            url: API_BASE + "getCheckHistory4000.php",
            method: "GET",
            dataType: "json",
            data: {
                dateFrom: historyFilters.dateFrom,
                dateTo: historyFilters.dateTo,
                promoterCode: historyFilters.promoterCode,
                market: historyFilters.market,
                location: historyFilters.location
            }

        });

        if (!resp || !resp.success) {
            $("#historyLoading").text("Error loading history.");
            return;
        }
        //console.log("=================== resp.shifts ==================== ");
        //console.log(resp.shifts);
        historyAllShifts = resp.shifts || [];
        $("#historyLoading").hide();
        //console.log("[History] rendering rows:", (historyAllShifts || []).length);

        // Reutiliza el mismo renderer, pero pintando en historyList
        renderHistory(historyAllShifts);
        if ((historyAllShifts || []).length > 0) {
            $("#exportHistoryXlsxBtn").removeClass("d-none");
        } else {
            $("#exportHistoryXlsxBtn").addClass("d-none");
        }


    } catch (e) {
        console.error("[History] fetch error:", e);
        $("#historyLoading").text("Error loading history.");
    }
}


function renderHistory(shifts) {

    const $hist = $("#historyList");
    if (!$hist.length) return;

    if (!Array.isArray(shifts) || shifts.length === 0) {
        $hist.html(`<div class="rc-live-empty">No records found for selected filters.</div>`);
        return;
    }

    let html = `<div class="rc-live-grid">`;

    shifts.forEach((s) => {
        const inDone = !!(s.checkInLocalTime);
        const outDone = !!(s.checkOutLocalTime);
        const breakStarted = !!(s.breakStartLocalTime);
        const onBreak = (s.isOnBreak == 1);

        const breakBoxClass = breakStarted
            ? (onBreak ? "rc-break-box rc-break-on" : "rc-break-box rc-break-done")
            : "rc-break-box rc-break-empty";

        const inText = inDone ? s.checkInLocalTime : "";
        const breakText = breakStarted ? s.breakStartLocalTime : "";
        const outText = outDone ? s.checkOutLocalTime : "";

        html += `
      <div class="rc-live-row" data-pk="${escapeAttr(s.pk || "")}">
        <div class="rc-live-info">
          <div class="rc-live-name">${escapeHtml(s.promoterName || "")}</div>
          <div class="rc-live-event">${escapeHtml(s.eventName || "")}</div>

          <div class="rc-live-meta">
            <span>${escapeHtml(s.market || "")}</span>
            <span class="rc-dot">•</span>
            <span>${escapeHtml(s.location || "")}</span>
          </div>

          <div class="rc-live-meta2">
            <span>${formatShiftDateShort(s.shiftCalcDate)}</span>
            <span class="rc-dot">•</span>
            <span>${escapeHtml(s.fromTo || "")}</span>
          </div>
        </div>

        <div class="rc-live-states">
          <button
            class="btn btn-sm rc-btn-state ${inDone ? "rc-btn-in-done" : "rc-btn-empty"}"
            ${inDone ? "" : "disabled"}
            data-photo="${escapeAttr(s.checkInPhotoUrl || "")}"
            data-title="CHECK IN"
            onclick="openPhotoModalFromBtn(this)"
          >
            ${inDone ? "IN<br><span class='rc-time'>" + inText + "</span>" : "IN"}
          </button>

          <div class="${breakBoxClass}">
            <div class="rc-break-label">BREAK</div>
            <div class="rc-break-time">${escapeHtml(breakText || "")}</div>
          </div>

          <button
            class="btn btn-sm rc-btn-state ${outDone ? "rc-btn-out-done" : "rc-btn-empty"}"
            ${outDone ? "" : "disabled"}
            data-photo="${escapeAttr(s.checkOutPhotoUrl || "")}"
            data-title="CHECK OUT"
            onclick="openPhotoModalFromBtn(this)"
          >
            ${outDone ? "OUT<br><span class='rc-time'>" + outText + "</span>" : "OUT"}
          </button>
        </div>
      </div>
    `;
    });

    html += `</div>`;
    $hist.html(html);
    ensurePhotoModalExists();
}


// Modal reutilizable
function ensurePhotoModalExists() {
    if ($("#rcPhotoModal").length) return;

    $("body").append(`
    <div class="modal fade" id="rcPhotoModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content rc-photo-modal">
                <div class="modal-header">
                    <h5 class="modal-title" id="rcPhotoModalTitle">PHOTO</h5>
                    <button type="button" class="rc-photo-close-icon" data-bs-dismiss="modal"
                        aria-label="Close">
                        <i class="bi bi-x-circle" aria-hidden="true"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <img id="rcPhotoModalImg" class="rc-photo-img" src="" alt="Photo" />
                </div>
                <div class="modal-footer">
                    <button type="button" class="rc-photo-close-btn" data-bs-dismiss="modal">Close
                    </button>
                </div>
            </div>
        </div>
    </div>
  `);
}

// onclick directo desde el botón
window.openPhotoModalFromBtn = function (btn) {
    try {
        const photo = btn.getAttribute("data-photo") || "";
        const title = btn.getAttribute("data-title") || "Photo";
        if (!photo) return;

        $("#rcPhotoModalTitle").text(title);
        $("#rcPhotoModalImg").attr("src", photo);

        const modalEl = document.getElementById("rcPhotoModal");
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    } catch (e) {
        console.error("openPhotoModalFromBtn error:", e);
    }
};

// helpers
function getLocalYYYYMMDD() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}
function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[c]));
}


function escapeAttr(s) {
    return escapeHtml(s).replace(/`/g, "&#096;");
}

function closeLiveSupervisorViewHard() {
    $("#liveSupervisorView").remove();
}

function closeCheckHistoryViewHard() {
    $("#checkHistoryView").remove();
}

function closeLiveCompactViewHard() {
    $("#liveCompactView").remove();
}

function appCloseAllViewsHard(options = {}) {
    const showMain = options.showMain === true;

    // cerrar menú lateral SIEMPRE
    try {
        $("#sideMenu").removeClass("open").attr({ "aria-hidden": "true", inert: "" });
        $("#sideMenuBackdrop").removeClass("show");
        $("#hamburgerBtn").attr("aria-expanded", "false");
    } catch (e) { }

    // cerrar submenu de reimbursements
    try {
        $("#menuReimbursements").removeClass("is-open").attr("aria-expanded", "false");
        $("#menuReimbursementsSubmenu").prop("hidden", true);
    } catch (e) { }


    // cerrar overlays / modales especiales
    try { closeTrainingVideoPlayer(); } catch (e) { }
    try { closeContactModal(); } catch (e) { }

    // ocultar todas las vistas principales
    $("#main-view").hide();
    $("#scheduler-view").hide();
    $("#payroll-view").hide();
    $("#lastpayroll-view").hide();
    $("#reports-view").hide();
    $("#report-capture-view").hide();
    $("#reimb-view").hide();
    $("#training-videos-view").hide();
    $("#reimbursementApprovalView").hide();
    $("#myReimbursementsView").hide();
    $("#manual-hours-view").hide();

    // SYSTEM ADMIN
    try { $("#system-admin-view").hide(); } catch (e) { }
    try { $("#checkin-params-view").hide(); } catch (e) { }
    try {
        expressParamsRequestVersion++;
        $("#express-params-view").hide();
        $("#expressParamsStatus").stop(true, true).hide().removeClass("ok err warn").empty();
        $("#expressParamsFields, #btnSaveExpressParams").prop("disabled", true);
        $("#express_idExpressParameters").val("");
    } catch (e) { }
    try { $("#reimb-params-view").hide(); } catch (e) { }

    try {
        $("#checkinParamsStatus").hide().removeClass("ok err warn").html("");
    } catch (e) { }

    try {
        $("#reimbParamsStatus").hide().removeClass("ok err warn").html("");
    } catch (e) { }

    try { $("#reports-params-view").hide(); } catch (e) { }

    try {
        $("#reportsParamsStatus").hide().removeClass("ok err warn").html("");
    } catch (e) { }

    try { $("#users-admin-view").hide(); } catch (e) { }

    try {
        $("#usersStatus").hide().removeClass("ok err warn").html("");
    } catch (e) { }


    // mensajes generales
    $("#responseMessage").hide();

    // resets de My Reimbursements
    $("#myReimbursementsListHeader").show();
    $("#myReimbursementsDetailHeader").hide();
    $("#myReimbursementsListWrap").show();
    $("#myReimbursementsDetailWrap").hide();

    // resets de Reimbursement Approval
    $("#reimbursementApprovalListHeader").show();
    $("#reimbursementApprovalDetailHeader").hide();
    $("#reimbursementApprovalListWrap").show();
    $("#reimbursementApprovalDetailWrap").hide();



    // vistas dinámicas inyectadas / auxiliares
    try { closeLiveSupervisorViewHard(); } catch (e) { }
    try { closeLiveCompactViewHard(); } catch (e) { }
    try { closeCheckHistoryViewHard(); } catch (e) { }

    if (showMain) {
        $("#main-view").show();
    }
}

function hideAllMainViews() {
    appCloseAllViewsHard({ showMain: false });
}

$(document)
    .off("click.exportHistory", "#exportHistoryXlsxBtn")
    .on("click.exportHistory", "#exportHistoryXlsxBtn", function () {
        try {
            if (!Array.isArray(historyAllShifts) || historyAllShifts.length === 0) return;

            if (!window.XLSX) {
                alert("XLSX library not loaded. Add SheetJS script in index207.html.");
                return;
            }

            const rows = historyAllShifts.map(s => {
                const calc = calcWorkedAndBreakMinutes(
                    s.checkInLocalTime || "",
                    s.breakStartLocalTime || "",
                    s.breakEndLocalTime || "",
                    s.checkOutLocalTime || ""
                );

                const linkIn = s.checkInPhotoUrl || "";
                const linkOut = s.checkOutPhotoUrl || "";

                return {
                    "Shift Date": formatShiftDateShort(s.shiftCalcDate || ""),
                    "Promoter Code": s.promoterCode || "",
                    "Promoter Name": s.promoterName || "",
                    "Event": s.eventName || "",
                    "Market": s.market || "",
                    "Location": s.location || "",
                    "From/To": s.fromTo || "",

                    "Check In": s.checkInLocalTime || "",
                    "Break Start": s.breakStartLocalTime || "",
                    "Break End": s.breakEndLocalTime || "",
                    "Check Out": s.checkOutLocalTime || "",

                    "Break Minutes": calc.breakMinutes,
                    "Worked Minutes": calc.workedMinutes,
                    "CheckIn Photo": linkIn
                        ? { f: `HYPERLINK("${linkIn}","📷 CheckIn")` }
                        : "",

                    "CheckOut Photo": linkOut
                        ? { f: `HYPERLINK("${linkOut}","📷 CheckOut")` }
                        : ""
                };
            });

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "History");

            const df = (historyFilters?.dateFrom || "from");
            const dt = (historyFilters?.dateTo || "to");
            const pc = (historyFilters?.promoterCode || "ALL");
            const mk = (historyFilters?.market || "ALL");
            const lc = (historyFilters?.location || "ALL");

            const safeBaseName = `CheckHistory_${df}_to_${dt}_${pc}_${mk}_${lc}`
                .replace(/[^\w\-]+/g, "_");

            const filename = `${safeBaseName}.xlsx`;

            XLSX.writeFile(wb, filename);

        } catch (e) {
            console.error("[History] export error:", e);
            alert("Export failed: " + (e?.message || e));
        }
    });

function calcWorkedAndBreakMinutes(inStr, bsStr, beStr, outStr) {
    // parse "h:mm AM" => minutes 0..1439
    const toMin = (t) => {
        if (!t) return null;
        const m = String(t).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (!m) return null;
        let hh = parseInt(m[1], 10);
        const mm = parseInt(m[2], 10);
        const ap = m[3].toUpperCase();
        if (ap === "AM") {
            if (hh === 12) hh = 0;
        } else {
            if (hh !== 12) hh += 12;
        }
        return hh * 60 + mm;
    };

    // roll over midnight if next < prev
    const roll = (prev, next) => {
        if (prev == null || next == null) return next;
        return (next < prev) ? next + 1440 : next;
    };

    let inM = toMin(inStr);
    let bsM = toMin(bsStr);
    let beM = toMin(beStr);
    let outM = toMin(outStr);

    if (inM == null || outM == null) {
        return { breakMinutes: 0, workedMinutes: 0 };
    }

    if (bsM != null) bsM = roll(inM, bsM);
    if (beM != null) beM = roll(bsM != null ? bsM : inM, beM);
    outM = roll((beM != null ? beM : (bsM != null ? bsM : inM)), outM);

    let breakMinutes = 0;
    if (bsM != null && beM != null) {
        breakMinutes = Math.max(0, beM - bsM);
    }

    const workedMinutes = Math.max(0, (outM - inM) - breakMinutes);

    return { breakMinutes, workedMinutes };
}


function onCheckoutCancelled() {
    // No tocar reportDone aquí (ya está marcado desde el success del reporte)
    // Solo asegurar que la UI quede con el botón correcto
    try {
        if (selectedShift?.pk) selectedShift.reportDone = 1; // por si se perdió en memoria
    } catch (_) { }

    // repinta el bloque de acciones
    if (typeof renderActions === "function") renderActions();
    else if (typeof rcUpdateFooterButtons === "function") rcUpdateFooterButtons();
}

function handleCheckoutCancelUI() {
    // Asegura que el shift en memoria quede marcado (por si algo lo reseteó)
    try {
        if (selectedShift?.pk) {
            selectedShift.reportDone = 1;
            localStorage.setItem(`rc_report_done_${selectedShift.pk}`, "1");
        }
    } catch (_) { }

    // IMPORTANTE: re-render de acciones para que NO reaparezca "REPORT & CHECK OUT"
    if (typeof renderActions === "function") {
        renderActions();
    } else {
        // fallback: al menos muestra UI de acciones
        showActionUI();
    }
}


function showLiveSupMessage(text, type = "success") {
    let $host = $("#liveSupervisorStatus");

    if (!$host.length) {
        $(".live-header").after(`
            <div id="liveSupervisorStatus" class="mt-2"></div>
        `);
        $host = $("#liveSupervisorStatus");
    }

    $host.html(`
        <div class="alert alert-${type} py-2 mb-2" role="alert">
            ${text}
        </div>
    `).show();

    clearTimeout(window.__liveSupMsgTO);
    window.__liveSupMsgTO = setTimeout(() => {
        $host.fadeOut(200, function () {
            $(this).html("").show();
        });
    }, 3000);
}

function formatDisplayDateFromDate(jsDate) {
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return `${weekDays[jsDate.getDay()]} ${jsDate.getMonth() + 1}/${jsDate.getDate()}/${jsDate.getFullYear()}`;
}

function formatDisplayTimeFromDate(jsDate) {
    let hour12 = jsDate.getHours() % 12;
    if (hour12 === 0) hour12 = 12;
    const ampm = jsDate.getHours() >= 12 ? "PM" : "AM";
    return `${hour12}:${String(jsDate.getMinutes()).padStart(2, "0")}${ampm}`;
}

function formatDateToMMDDYY(dateStr) {
    if (!dateStr) return "";

    // Soporta formato YYYY-MM-DD
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;

    const yyyy = parts[0];
    const mm = parts[1];
    const dd = parts[2];

    return `${mm}/${dd}/${yyyy.slice(-2)}`;
}


function setUserAvatar(name) {
    const $avatar = $("#userAvatar");

    if (!name) {
        $avatar.text("").attr("hidden", true).hide();
        return;
    }

    const words = name
        .trim()
        .toUpperCase()
        .split(" ")
        .filter(w => w.length > 0);

    let initials = "";

    if (words.length === 1) {
        initials = words[0].substring(0, 2);
    } else if (words.length === 2) {
        initials = words[0][0] + words[1][0];
    } else {
        // 3 o más → primera + última
        initials = words[0][0] + words[words.length - 1][0];
    }

    $avatar.text(initials).removeAttr("hidden").show();
}

function logTrainingVideoOpen(video) {
    if (!video) return;

    const now = new Date();
    const openedAt =
        now.getFullYear() + "-" +
        String(now.getMonth() + 1).padStart(2, "0") + "-" +
        String(now.getDate()).padStart(2, "0") + " " +
        String(now.getHours()).padStart(2, "0") + ":" +
        String(now.getMinutes()).padStart(2, "0") + ":" +
        String(now.getSeconds()).padStart(2, "0");

    $.ajax({
        url: API_BASE + "logOpenVideo4000.php",
        method: "POST",
        dataType: "json",
        data: {
            idVideo: (video.idVideo || "").toString(),
            videoTitle: (video.title || "").toString(),
            promoterCode: (promoterCode || "").toString(),
            promoterName: (promoterName || "").toString(),
            openedAt: openedAt
        }
    }).done(function (res) {
        console.log("[TrainingVideos] open logged:", res);
    }).fail(function (xhr, status, err) {
        console.error("[TrainingVideos] log error:", status, err, xhr && xhr.responseText);
    });
}

function formatTrainingVideoLength(value) {
    if (!value) return "";

    const s = value.toString().trim();
    const parts = s.split(":");
    if (parts.length !== 3) return s;

    const hh = parseInt(parts[0], 10) || 0;
    const mm = parseInt(parts[1], 10) || 0;
    const ss = parseInt(parts[2], 10) || 0;

    if (hh > 0) {
        return `${hh}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
    }

    return `${mm}:${String(ss).padStart(2, "0")}`;
}

////////////////////////////////////////////////////
function normalizeTrainingVideoUrl(rawUrl) {
    let url = String(rawUrl || "").trim();
    if (!url) return "";

    // Si ya es absoluta, la dejamos
    if (/^https?:\/\//i.test(url)) return url;

    // Limpia prefijo viejo
    url = url.replace(/^gocheck\//i, "");
    url = url.replace(/^\/+/, "");

    // Usa el dominio actual automáticamente (.net, .cloud, localhost, etc)
    return window.location.origin + "/" + url;
}


function updateTrainingVideoToggleButton(isPlaying) {
    const $btn = $("#toggleTrainingVideoBtn");
    if (!$btn.length) return;

    if (isPlaying) {
        $btn.html('<i class="bi bi-pause-fill"></i> Pause');
    } else {
        $btn.html('<i class="bi bi-play-fill"></i> Play');
    }
}

function bindTrainingVideoNativeEvents() {
    const videoEl = document.getElementById("trainingVideoEl");
    if (!videoEl || videoEl.dataset.bound === "1") return;

    videoEl.dataset.bound = "1";

    videoEl.addEventListener("play", function () {
        updateTrainingVideoToggleButton(true);
    });

    videoEl.addEventListener("pause", function () {
        updateTrainingVideoToggleButton(false);
    });

    videoEl.addEventListener("ended", function () {
        updateTrainingVideoToggleButton(false);
    });
}

function openTrainingVideoPlayer(video) {
    if (!video || !video.videoUrl) {
        showMessage("Video URL not available", "danger");
        return;
    }

    const localUrl = normalizeTrainingVideoUrl(video.videoUrl);
    if (!localUrl) {
        showMessage("Invalid video URL", "danger");
        return;
    }

    currentTrainingVideoUrl = localUrl;
    currentTrainingVideoTitle = (video.title || "Training Video").toString();

    const videoEl = document.getElementById("trainingVideoEl");
    const sourceEl = document.getElementById("trainingVideoSource");

    if (!videoEl || !sourceEl) {
        showMessage("Video player not found", "danger");
        return;
    }

    bindTrainingVideoNativeEvents();

    // parar y limpiar lo que hubiese antes
    try {
        videoEl.pause();
    } catch (e) { }

    videoEl.removeAttribute("src");
    sourceEl.src = "";
    videoEl.load();

    // cargar nuevo video
    sourceEl.src = currentTrainingVideoUrl;
    videoEl.load();

    // MUY IMPORTANTE: NO autoplay, NO muted
    videoEl.muted = false;
    videoEl.currentTime = 0;
    videoEl.playsInline = true;
    videoEl.setAttribute("playsinline", "");
    videoEl.setAttribute("webkit-playsinline", "");

    $("#trainingPlayerTitle").text(currentTrainingVideoTitle.toUpperCase());
    logTrainingVideoOpen(video);
    $("#trainingVideoPlayerOverlay").css("display", "flex").attr("aria-hidden", "false");

    updateTrainingVideoToggleButton(false);
}

function closeTrainingVideoPlayer() {
    const videoEl = document.getElementById("trainingVideoEl");
    const sourceEl = document.getElementById("trainingVideoSource");

    if (videoEl) {
        try {
            videoEl.pause();
        } catch (e) { }

        videoEl.currentTime = 0;
        videoEl.removeAttribute("src");
        videoEl.load();
    }

    if (sourceEl) {
        sourceEl.src = "";
    }

    $("#trainingVideoPlayerOverlay").hide().attr("aria-hidden", "true");

    currentTrainingVideoUrl = "";
    currentTrainingVideoTitle = "";
    updateTrainingVideoToggleButton(false);
}

function replayTrainingVideo() {
    const videoEl = document.getElementById("trainingVideoEl");
    if (!videoEl) return;

    try {
        videoEl.pause();
        videoEl.currentTime = 0;
        videoEl.muted = false;

        const p = videoEl.play();
        if (p && typeof p.catch === "function") {
            p.catch(() => {
                updateTrainingVideoToggleButton(false);
            });
        }
    } catch (e) {
        updateTrainingVideoToggleButton(false);
    }
}

function toggleTrainingVideoPlayback() {
    const videoEl = document.getElementById("trainingVideoEl");
    if (!videoEl) return;

    if (videoEl.paused) {
        videoEl.muted = false;

        const p = videoEl.play();
        if (p && typeof p.catch === "function") {
            p.catch(() => {
                updateTrainingVideoToggleButton(false);
            });
        }
    } else {
        videoEl.pause();
    }
}

function renderTrainingVideosList() {
    const $list = $("#trainingVideosList");
    const $empty = $("#trainingVideosEmpty");

    $list.empty();

    if (!Array.isArray(trainingVideos) || !trainingVideos.length) {
        $empty.show();
        return;
    }

    $empty.hide();

    trainingVideos.forEach(video => {
        const title = (video.title || "").toString().trim();
        const length = formatTrainingVideoLength(video.videoLength);
        const safeTitle = escapeHtml(title);

        const $item = $(`
            <div class="training-item">

                <div class="training-icon-wrap">
                    <div class="training-icon">
                        <i class="bi bi-film"></i>
                    </div>
                </div>

                <div class="training-info">
                    <button type="button" class="training-title-btn">
                    <span class="training-video-name">${safeTitle}</span>
                    ${length ? `<span class="training-video-length">${escapeHtml(length)}</span>` : ''}
                    </button>
                </div>

                <button type="button" class="btn btn-primary training-open-btn">
                    View
                </button>

            </div>
        `);

        $item.find(".training-title-btn").on("click", function () {
            openTrainingVideoPlayer(video);
        });

        $item.find(".training-open-btn").on("click", function () {
            openTrainingVideoPlayer(video);
        });

        $list.append($item);
    });
}


function openTrainingVideosView() {
    appCloseAllViewsHard({ showMain: false });
    $("#training-videos-view").css("display", "flex");
    renderTrainingVideosList();
}

$(document).off("click.trainingVideos");

$(document).on("click.trainingVideos", "#menuTrainingVideos", function () {
    openTrainingVideosView();
});

$(document).on("click.trainingVideos", "#closeTrainingVideosBtn", function () {
    $("#training-videos-view").hide();
    $("#main-view").show();
});

$(document).on("click.trainingVideos", "#closeTrainingVideoPlayerBtn", function () {
    closeTrainingVideoPlayer();
});

$(document).on("click.trainingVideos", "#toggleTrainingVideoBtn", function () {
    toggleTrainingVideoPlayback();
});

$(document).on("click.trainingVideos", "#replayTrainingVideoBtn", function () {
    replayTrainingVideo();
});

$(document).on("click.trainingVideos", "#trainingVideoPlayerOverlay", function (e) {
    if (e.target.id === "trainingVideoPlayerOverlay") {
        closeTrainingVideoPlayer();
    }
});
/////////////////////////////////////////////////////////////////////////////////

$(document).on("click", "#replayTrainingVideoBtn", function () {
    replayTrainingVideo();
});

$(document).on("click", "#trainingVideoPlayerOverlay", function (e) {
    if (e.target.id === "trainingVideoPlayerOverlay") {
        closeTrainingVideoPlayer();
    }
});


window.addEventListener("beforeunload", function (e) {
    const sensitiveViewOpen =
        $("#report-capture-view").is(":visible") ||
        $("#training-videos-view").is(":visible") ||
        $("#reimb-view").is(":visible");

    if (sensitiveViewOpen) {
        e.preventDefault();
        e.returnValue = "";
    }
});


// ===== Debug quick tools =====
window.rcDebug = true;
window.rcDump = () => ({ schema: reportSchema, answers: structuredClone(reportAnswers), files: structuredClone(reportFiles) });
window.rcResetAutosave = () => {
    try {
        localStorage.removeItem(rcStorageKey(currentReportCtx?.id || ''));
        console.log('Autosave cleared');
    } catch (e) { }
};
window.rcLogFiles = () => {
    Object.entries(reportFiles).forEach(([fid, arr]) => {
        console.log(`[${fid}]`, arr?.map(x => ({ name: x.file?.name, type: x.file?.type, size: x.file?.size })));
    });
};


async function getUserIPInfo() {

    // const url = "https://ipapi.co/json/?key=XhBYXoLsaPG5jUT5YpXw8fhehHTN2vafZLfWBhkalOz4X7oOM4";

    try {
        const response = await fetch(ipapiurl);
        const data = await response.json();

        const ip = data.ip || "Unknown";
        const country = data.country_name || "Unknown";
        const city = data.city || "Unknown";

        console.log(ip + " " + country + " " + city);

        return { ip, city, country };

    } catch (e) {
        console.log("Failed to retrieve IP information: " + e.toString());

        return {
            ip: "Failed Unknown",
            city: "Failed Unknown",
            country: "Failed Unknown"
        };
    }
}

function loadPendingReimbursementApprovals() {
    $('#reimbursementApprovalList').html('');
    $('#reimbursementApprovalEmpty').hide();

    $.ajax({
        url: API_BASE + 'getPendingReimbursements4000.php',
        type: 'GET',
        dataType: 'json',
        data: {
            code: promoterCode,
            ip: ip,
            country: country,
            city: city
        },
        success: function (resp) {
            if (!resp || !resp.ok) {
                $('#reimbursementApprovalEmpty').show().text('Could not load reimbursements.');
                return;
            }

            reimbursementApprovals = Array.isArray(resp.items) ? resp.items : [];
            reimbursementApprovalExpenseTypes = Array.isArray(resp.expenseTypes) ? resp.expenseTypes : [];
            reimbursementApprovalShiftOptions = Array.isArray(resp.shiftOptions) ? resp.shiftOptions : [];
            pendingReimbursementApprovalsNumber = reimbursementApprovals.length;
            setReimbursementApprovalBadge(pendingReimbursementApprovalsNumber);
            renderPendingReimbursementApprovals();

        },
        error: function (xhr, status, err) {
            console.error('[RA] load list error:', status, err, xhr?.responseText);
            $('#reimbursementApprovalEmpty').show().text('Network error while loading reimbursements.');
        }
    });
}


function renderPendingReimbursementApprovals() {
    const list = $('#reimbursementApprovalList');
    list.html('');

    if (!reimbursementApprovals.length) {
        $('#reimbursementApprovalEmpty').show().text('No pending reimbursements found.');
        return;
    }

    $('#reimbursementApprovalEmpty').hide();

    reimbursementApprovals.forEach(function (item) {

        const status = String(item.status || 'pending').toLowerCase();

        const statusText =
            status === 'sent_to_manager' ? 'Sent to Mgr' :
                status === 'checked' ? 'Checked by Mgr' :
                    status === 'approved' ? 'Approved' :
                        status === 'rejected' ? 'Rejected' :
                            'Pending';

        const statusClass =
            status === 'sent_to_manager' ? 'ra-status-sent' :
                status === 'checked' ? 'ra-status-checked' :
                    status === 'approved' ? 'ra-status-approved' :
                        status === 'rejected' ? 'ra-status-rejected' :
                            'ra-status-pending';

        const daysPending = Number(item.daysPending || 0);
        const daysText = daysPending === 1 ? '1 day' : `${daysPending} days`;

        const submittedDate = item.submittedDate || '';
        const submittedShort = raFormatDateMDY(submittedDate);

        const cardHtml = `
            <div class="ra-pending-card" data-id="${raEscapeHtml(item.idReimbursement)}">

                <div class="ra-line1">
                    <div class="ra-name">${raEscapeHtml(item.promoterName || '')}</div>
                    <div class="ra-reimb-id">ID: ${raEscapeHtml(item.idReimbursement || '')}</div>
                </div>
                <div class="ra-line2">
                    <div class="ra-date-amount">
                        <span class="ra-date-label">Expense Date:</span>
                        <span class="ra-date-value">${raEscapeHtml(raFormatDateMDY(item.expensesDate))}</span>
                    </div>
                    <div class="ra-amount">${raMoney(item.amount)}</div>
                </div>

                <div class="ra-line3">
                    <div class="ra-expense-type">${raEscapeHtml(item.expensesType || '')}</div>
                    <div class="ra-status ${statusClass}">
                        ${raEscapeHtml(statusText)}
                    </div>
                </div>

                <div class="ra-line4">
                    <div class="ra-desc-single">${raEscapeHtml(item.description || '')}</div>
                </div>

                <div class="ra-line5">
                    <div class="ra-submitted-wrap">
                        <span class="ra-submitted-label">Submitted:</span>
                        <span class="ra-submitted-date">${raEscapeHtml(submittedShort)}</span>
                    </div>
                    <div class="ra-days">${raEscapeHtml(daysText)}</div>
                </div>

            </div>
        `;

        list.append(cardHtml);
    });
}

$(document).on('click', '.ra-pending-card', function () {
    const id = $(this).data('id');
    openReimbursementApprovalDetail(id);
});

function openReimbursementApprovalDetail(idReimbursement) {
    const found = reimbursementApprovals.find(x => String(x.idReimbursement) === String(idReimbursement));

    if (!found) {
        if (typeof showMessage === 'function') showMessage('Reimbursement not found.', 'error');
        return;
    }

    reimbursementApprovalCurrent = found;

    $("#reimbursementApprovalListHeader").hide();
    $("#reimbursementApprovalDetailHeader").show();

    $("#reimbursementApprovalListWrap").hide();
    $("#reimbursementApprovalDetailWrap").show();

    raHideStatus();

    $("#ra_idReimbursement").val(found.idReimbursement || "");
    $("#ra_promoterName").val(found.promoterName || "");
    $("#ra_expensesDate").val(formatDateToMMDDYY(found.expensesDate));
    $("#ra_amount").val(found.amount || "");
    $("#ra_description").val(found.description || "");
    $("#ra_rejectionReason").val("");

    $("#raRejectReasonWrap").hide();

    $("#ra_checkedComments").val("");
    $("#raCheckedCommentsWrap").hide();

    $("#ra_sentToManagerComments").val("");
    $("#raSentToManagerCommentsWrap").hide();

    $("#ra_sentToManagerCommentsView").val(found.sentToManagerComments || "");
    $("#raSentToManagerCommentsViewWrap").toggle(!!String(found.sentToManagerComments || "").trim());

    $("#ra_checkedCommentsView").val(found.checkedComments || "");
    $("#raCheckedCommentsViewWrap").toggle(!!String(found.checkedComments || "").trim());

    raFillExpenseTypes(found.expensesType || "");
    raFillShiftOptions(found.pk || "", found.shiftOptions || []);

    raRenderReceiptsPreview(found);

    $('#raBtnReject').toggle(!!Number(found.canReject || 0));
    $('#raBtnApprove').toggle(!!Number(found.canApprove || 0));
    $('#raBtnSendToManager').toggle(!!Number(found.canSendToManager || 0));
    $('#raBtnCheck').toggle(!!Number(found.canCheck || 0));
}


function raFillExpenseTypes(selectedValue) {
    const sel = $('#ra_expensesType');
    sel.html('');

    reimbursementApprovalExpenseTypes.forEach(function (item) {
        const value = String(item);
        const selected = String(value) === String(selectedValue) ? 'selected' : '';
        sel.append(`<option value="${raEscapeHtml(value)}" ${selected}>${raEscapeHtml(value)}</option>`);
    });
}

function reimbLockExpenseDate(lock = true) {
    const $d = $("#reimbDate");

    $d.prop("readonly", !!lock);

    if (lock) {
        $d.attr("data-locked-by-ocr", "1");
        $d.addClass("is-readonly-by-ocr");
    } else {
        $d.removeAttr("data-locked-by-ocr");
        $d.removeClass("is-readonly-by-ocr");
    }
}

function reimbSetExpenseDateFromOCR(rawDate) {
    const iso = toISODateOrNull(rawDate);

    $("#reimbDate").val(iso || "");
    reimbLockExpenseDate(!!iso);

    return iso;
}


function raFillShiftOptions(selectedPk, options) {
    const sel = $('#ra_pk');
    sel.html('');

    let foundSelected = false;
    const rows = Array.isArray(options) ? options : [];

    rows.forEach(function (item) {
        const pk = item.pk || '';
        const label = item.label || 'Assigned shift';
        const selected = String(pk) === String(selectedPk) ? 'selected' : '';
        if (selected) foundSelected = true;

        sel.append(`<option value="${raEscapeHtml(pk)}" ${selected}>
            ${raEscapeHtml(label)}
        </option>`);
    });

    if (selectedPk && !foundSelected) {
        sel.prepend(
            `<option value="${raEscapeHtml(selectedPk)}" selected>
                Assigned shift
            </option>`
        );
    }
}

function raRenderReceiptPreview(photoPath) {
    raRenderReceiptsPreview({
        receipts: photoPath ? [{
            photoPath: photoPath,
            amount: "",
            expenseType: "",
            expenseDate: "",
            expenseDescription: "",
            originalFileName: ""
        }] : []
    });
}

function raRenderReceiptsPreview(reimbursement) {
    const box = $('#reimbursementApprovalDetailWrap #ra_receiptPreview');
    box.html('');

    const receipts = Array.isArray(reimbursement?.receipts)
        ? reimbursement.receipts
        : [];

    if (!receipts.length) {
        const fallbackPhoto = String(reimbursement?.photoPath || "").trim();

        if (!fallbackPhoto) {
            box.html('<div class="text-muted">No receipt uploaded.</div>');
            return;
        }

        receipts.push({
            photoPath: fallbackPhoto,
            amount: reimbursement?.amount || "",
            expenseType: reimbursement?.expensesType || "",
            expenseDate: reimbursement?.expensesDate || "",
            expenseDescription: reimbursement?.description || "",
            originalFileName: ""
        });
    }

    let html = `
        <div class="ra-receipts-preview-list">
    `;

    receipts.forEach(function (r, idx) {
        const photoPath = String(r.photoPath || "").trim();
        const amount = r.amount !== undefined && r.amount !== null && r.amount !== ""
            ? raMoney(r.amount)
            : "";

        const date = r.expenseDate
            ? formatDateToMMDDYY(r.expenseDate)
            : "";

        const type = r.expenseType || "";
        const desc = r.expenseDescription || "";
        const fileName = r.originalFileName || "";

        html += `
            <div class="ra-receipt-card">
                <div class="ra-receipt-card-head">
                    <strong>Receipt #${idx + 1}</strong>
                    ${amount ? `<span class="ra-receipt-card-amount">${raEscapeHtml(amount)}</span>` : ""}
                </div>

                <div class="ra-receipt-card-meta">
                    ${date ? `<div><strong>Date:</strong> ${raEscapeHtml(date)}</div>` : ""}
                    ${type ? `<div><strong>Type:</strong> ${raEscapeHtml(type)}</div>` : ""}
                    ${desc ? `<div><strong>Description:</strong> ${raEscapeHtml(desc)}</div>` : ""}
                    ${fileName ? `<div><strong>File:</strong> ${raEscapeHtml(fileName)}</div>` : ""}
                </div>
        `;

        if (photoPath) {
            html += `
                <div class="ra-receipt-thumb-wrap">
                    <img src="${raEscapeHtml(photoPath)}" alt="Receipt #${idx + 1}" class="ra-receipt-thumb">
                    <button type="button"
                            class="ra-receipt-zoom-btn"
                            data-src="${raEscapeHtml(photoPath)}"
                            aria-label="Zoom receipt #${idx + 1}">
                        <i class="bi bi-zoom-in"></i>
                    </button>
                </div>
            `;
        } else {
            html += `<div class="text-muted">No receipt image available.</div>`;
        }

        html += `</div>`;
    });

    html += `</div>`;

    box.html(html);
}


$(document).on('click', '#raBtnBackToList', function () {
    reimbursementApprovalCurrent = null;

    $("#reimbursementApprovalDetailHeader").hide();
    $("#reimbursementApprovalListHeader").show();

    $("#reimbursementApprovalDetailWrap").hide();
    $("#reimbursementApprovalListWrap").show();

    raHideStatus();
});

$(document).on('click', '.ra-receipt-zoom-btn', function () {
    const src = $(this).attr('data-src') || '';
    raOpenReceiptZoom(src);
});

$(document).on('click', '#raReceiptZoomClose', function () {
    raCloseReceiptZoom();
});

$(document).on('click', '.ra-receipt-zoom-backdrop', function () {
    raCloseReceiptZoom();
});

$(document).on('keydown', function (e) {
    if (e.key === 'Escape' && $('#raReceiptZoomOverlay').is(':visible')) {
        raCloseReceiptZoom();
    }
});

$(window).off('resize.raMag').on('resize.raMag', function () {
    if ($('#raReceiptZoomOverlay').is(':visible')) {
        raSetupMagnifier();
    }
});



function raCollectPayload(actionType) {
    if (!reimbursementApprovalCurrent) return null;

    const amount = parseFloat($('#ra_amount').val() || '0');
    const expensesType = ($('#ra_expensesType').val() || '').trim();
    const description = ($('#ra_description').val() || '').trim();
    const pk = ($('#ra_pk').val() || '').trim();
    const rejectionReason = ($('#ra_rejectionReason').val() || '').trim();
    const checkedComments = ($('#ra_checkedComments').val() || '').trim();
    const sentToManagerComments = ($('#ra_sentToManagerComments').val() || '').trim();

    if (!(amount > 0)) {
        raShowStatus('Amount must be greater than zero.', 'err');
        return null;
    }

    if (!expensesType) {
        raShowStatus('Expense type is required.', 'err');
        return null;
    }

    if (!description) {
        raShowStatus('Description is required.', 'err');
        return null;
    }

    if (!pk) {
        raShowStatus('Shift assignment is required.', 'err');
        return null;
    }

    if (actionType === 'reject' && !rejectionReason) {
        $("#raRejectReasonWrap").show();
        raShowStatus('Rejection reason is required.', 'err');
        $('#ra_rejectionReason').trigger('focus');
        return null;
    }

    if (actionType === 'checked' && !checkedComments) {
        raShowStatus('Manager comments are required.', 'err');
        $('#raCheckedCommentsWrap').show();
        $('#ra_checkedComments').trigger('focus');
        return null;
    }

    if (actionType === 'send_to_manager' && !sentToManagerComments) {
        $("#raSentToManagerCommentsWrap").show();
        raShowStatus('Comments for manager are required.', 'err');
        $('#ra_sentToManagerComments').trigger('focus');
        return null;
    }

    return {
        code: promoterCode,
        ip: ip,
        country: country,
        city: city,
        idReimbursement: reimbursementApprovalCurrent.idReimbursement,
        actionType: actionType,
        amount: amount,
        expensesType: expensesType,
        description: description,
        pk: pk,
        rejectionReason: actionType === 'reject' ? rejectionReason : '',
        checkedComments: actionType === 'checked' ? checkedComments : '',
        adminCode: promoterCode || '',
        adminName: promoterName || '',
        sentToManagerComments: actionType === 'send_to_manager' ? sentToManagerComments : ''
    };
}

function myReimbStatusText(status) {
    const s = String(status || 'pending').toLowerCase();

    if (s === 'approved') return 'Approved';
    if (s === 'rejected') return 'Rejected';
    if (s === 'sent_to_manager') return 'Sent to Mgr';
    if (s === 'checked') return 'Checked by Mgr';
    return 'Pending';
}

function openMyReimbursementsView() {
    try {
        appCloseAllViewsHard({ showMain: false });
        $("#myReimbursementsView").css("display", "flex");

        $("#myReimbursementsListHeader").show();
        $("#myReimbursementsListWrap").show();
        $("#myReimbursementsDetailHeader").hide();
        $("#myReimbursementsDetailWrap").hide();

        loadMyReimbursements();
    } catch (err) {
        console.error("[MY REIMB] openMyReimbursementsView error:", err);
        showMessage?.("Could not open My Reimbursements.", "danger");
    }
}

function closeMyReimbursementsView() {
    appCloseAllViewsHard({ showMain: true });
}

function loadMyReimbursements() {
    $('#myReimbursementsList').html('');
    $('#myReimbursementsEmpty').hide().text('');

    $.ajax({
        url: API_BASE + 'getMyReimbursements4000.php',
        type: 'GET',
        dataType: 'json',
        data: {
            code: promoterCode,
            promoterCode: promoterCode,
            ip: ip,
            country: country,
            city: city
        },
        success: function (resp) {
            if (!resp || !resp.ok) {
                $('#myReimbursementsEmpty').show().text('Could not load your reimbursements.');
                return;
            }

            myReimbursements = Array.isArray(resp.items) ? resp.items : [];
            renderMyReimbursements();
        },
        error: function (xhr, status, err) {
            console.error('[MY REIMB] load list error:', status, err, xhr?.responseText);
            $('#myReimbursementsEmpty').show().text('Network error while loading your reimbursements.');
        }
    });
}

function renderMyReimbursements() {
    const list = $('#myReimbursementsList');
    list.html('');

    if (!myReimbursements.length) {
        $('#myReimbursementsEmpty').show().text('No reimbursements found.');
        return;
    }

    $('#myReimbursementsEmpty').hide();

    myReimbursements.forEach(function (item) {
        const status = String(item.status || 'pending').toLowerCase();
        const statusText = myReimbStatusText(status);

        const daysPending = Number(item.daysPending || 0);
        const daysText = daysPending === 1 ? '1 day' : `${daysPending} days`;

        const submittedShort = raFormatDateMDY(item.submittedDate || '');

        const cardHtml = `
            <div class="ra-pending-card my-reimb-card" data-id="${raEscapeHtml(item.idReimbursement)}">
                <div class="ra-line1 my-reimb-line1">
                    <div class="ra-name">${raEscapeHtml(item.promoterName || '')}</div>
                    <div class="my-reimb-id">ID: ${raEscapeHtml(item.idReimbursement || '')}</div>
                </div>

                <div class="ra-line2">
                    <div class="ra-date-amount">
                        <span class="ra-date-label">Date:</span>
                        <span class="ra-date-value">${raEscapeHtml(raFormatDateMDY(item.expensesDate))}</span>
                    </div>
                    <div class="ra-amount">${raMoney(item.amount)}</div>
                </div>

                <div class="ra-line3">
                    <div class="ra-expense-type">${raEscapeHtml(item.expensesType || '')}</div>
                    <div class="ra-status ${status === 'approved' ? 'ra-status-approved' :
                status === 'rejected' ? 'ra-status-rejected' :
                    status === 'sent_to_manager' ? 'ra-status-sent' :
                        status === 'checked' ? 'ra-status-checked' :
                            'ra-status-pending'
            }">
                        ${raEscapeHtml(statusText)}
                    </div>
                </div>

                <div class="ra-line4">
                    <div class="ra-desc-single">${raEscapeHtml(item.description || '')}</div>
                </div>

                <div class="ra-line5">
                    <div class="ra-submitted-wrap">
                        <span class="ra-submitted-label">Submitted:</span>
                        <span class="ra-submitted-date">${raEscapeHtml(submittedShort)}</span>
                    </div>
                    <div class="ra-days">${raEscapeHtml(daysText)}</div>
                </div>

            </div>
        `;

        list.append(cardHtml);
    });
}

$(document).off('click.myReimbCard', '.my-reimb-card').on('click.myReimbCard', '.my-reimb-card', function () {
    const id = $(this).data('id');
    openMyReimbursementDetail(id);
});

function myReimbPickFirst(item, keys) {
    for (const k of keys) {
        const v = (item?.[k] || "").toString().trim();
        if (v) return v;
    }
    return "";
}

function myReimbActionMeta(item) {
    const status = String(item?.status || "pending").toLowerCase();

    if (status === "approved") {
        return {
            show: true,
            cls: "approved",
            text: "Approved by: " + (myReimbPickFirst(item, ["approvedByName", "approvedBy", "approvedByAdminName", "adminName"]) || "")
        };
    }

    if (status === "checked") {
        return {
            show: true,
            cls: "checked",
            text: "Checked by: " + (myReimbPickFirst(item, ["checkedByName", "checkedBy", "checkedByManagerName", "adminName"]) || "")
        };
    }

    if (status === "rejected") {
        return {
            show: true,
            cls: "rejected",
            text: "Rejected by: " + (myReimbPickFirst(item, ["rejectedByName", "rejectedBy", "rejectedByAdminName", "adminName"]) || "")
        };
    }

    if (status === "sent_to_manager") {
        return {
            show: true,
            cls: "sent",
            text: "Sent to Manager by: " + (myReimbPickFirst(item, ["sentToManagerByName", "sentToManagerBy", "sentToManagerByAdminName", "adminName"]) || "")
        };
    }

    return { show: false, cls: "", text: "" };
}

function myReimbRenderActionLine(item) {
    const meta = myReimbActionMeta(item);
    const $card = $("#myReimbursementsDetailWrap .reimb-approval-card").first();

    let $line = $("#mr_actionLine");

    if (!$line.length) {
        $line = $('<div id="mr_actionLine" class="my-reimb-action-line"></div>');
    }

    $line
        .removeClass("my-reimb-action-line--approved my-reimb-action-line--checked my-reimb-action-line--rejected my-reimb-action-line--sent")
        .addClass(meta.cls ? `my-reimb-action-line--${meta.cls}` : "")
        .text(meta.text)
        .toggle(meta.show && !!meta.text.trim());

    if ($card.length) {
        $line.prependTo($card);
    }
}

function openMyReimbursementDetail(idReimbursement) {
    const found = myReimbursements.find(x => String(x.idReimbursement) === String(idReimbursement));
    if (!found) {
        showMessage?.('Reimbursement not found.', 'warning');
        return;
    }

    myReimbursementCurrent = found;

    $("#myReimbursementsListHeader").hide();
    $("#myReimbursementsDetailHeader").show();

    $("#myReimbursementsListWrap").hide();
    $("#myReimbursementsDetailWrap").show();

    $("#mr_idReimbursement").val(found.idReimbursement || "");
    $("#mr_promoterName").val(found.promoterName || "");
    $("#mr_expensesDate").val(formatDateToMMDDYY(found.expensesDate));
    $("#mr_amount").val(raMoney(found.amount || 0));
    $("#mr_expensesType").val(found.expensesType || "");
    $("#mr_expensesType").val(found.expensesType || "");

    const formattedShift = formatShiftLabel(found.shiftDate, found.eventName);
    $("#mr_pk").val(formattedShift || found.pk || "");

    $("#mr_description").val(found.description || "");
    $("#mr_status").val(myReimbStatusText(found.status || ""));
    myReimbRenderActionLine(found);
    $("#mr_submittedDate").val(raFormatDateMDY(found.submittedDate || ""));

    $("#mr_approvedDate").val(raFormatDateMDY(found.approvedDate || ""));
    $("#mr_rejectedDate").val(raFormatDateMDY(found.rejectedDate || ""));
    $("#mr_rejectionReason").val(found.rejectionReason || "");

    $("#mr_approvedDateWrap").toggle(!!found.approvedDate);
    $("#mr_rejectedDateWrap").toggle(!!found.rejectedDate);
    $("#mr_rejectionReasonWrap").toggle(!!(found.rejectionReason || "").trim());

    raRenderReceiptPreviewToTarget(found.photoPath || "", "#mr_receiptPreview");
}

function raRenderReceiptPreviewToTarget(photoPath, targetSelector) {
    const box = $(targetSelector);
    if (!box.length) return;

    box.html('');

    if (!photoPath) {
        box.html('<span>No receipt uploaded.</span>');
        return;
    }

    const cleanPath = String(photoPath).trim();
    const lower = cleanPath.toLowerCase();

    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(lower)) {
        box.html(`<img src="${raEscapeHtml(cleanPath)}" alt="Receipt">`);
        return;
    }

    box.html(`
        <a href="${raEscapeHtml(cleanPath)}" target="_blank" rel="noopener noreferrer">
            Open attachment
        </a>
    `);
}


$(document).on('click', '#raBtnApprove', function () {
    const payload = raCollectPayload('approve');
    if (payload) raSubmitApprovalAction(payload);
});

$(document).on('click', '#raBtnSendToManager', function () {
    const $wrap = $('#raSentToManagerCommentsWrap');
    const $txt = $('#ra_sentToManagerComments');

    if (!$wrap.is(':visible')) {
        $wrap.show();
        $('#raRejectReasonWrap').hide();
        $('#raCheckedCommentsWrap').hide();
        raShowStatus('Please enter comments for the manager.', 'warn');
        setTimeout(function () {
            $txt.trigger('focus');
        }, 50);
        return;
    }

    const payload = raCollectPayload('send_to_manager');
    if (payload) raSubmitApprovalAction(payload);
});

$(document).on('click', '#raBtnCheck', function () {
    const $wrap = $('#raCheckedCommentsWrap');
    const $txt = $('#ra_checkedComments');

    if (!$wrap.is(':visible')) {
        $wrap.show();
        $('#raRejectReasonWrap').hide();
        raShowStatus('Please enter manager comments.', 'warn');
        setTimeout(function () {
            $txt.trigger('focus');
        }, 50);
        return;
    }

    const payload = raCollectPayload('checked');
    if (payload) raSubmitApprovalAction(payload);
});


$(document).on('click', '#raBtnReject', function () {
    const $wrap = $('#raRejectReasonWrap');
    const $txt = $('#ra_rejectionReason');

    if (!$wrap.is(':visible')) {
        $wrap.show();
        raShowStatus('Please enter the rejection reason.', 'warn');
        setTimeout(function () {
            $txt.trigger('focus');
        }, 50);
        return;
    }

    const payload = raCollectPayload('reject');
    if (payload) raSubmitApprovalAction(payload);
});



function raSubmitApprovalAction(payload) {
    raShowStatus('Processing...', 'warn');

    $.ajax({
        url: API_BASE + 'updateReimbursementApproval4000.php',
        type: 'POST',
        dataType: 'json',
        data: payload,
        success: function (resp) {
            if (!resp || !resp.ok) {
                raShowStatus((resp && resp.message) ? resp.message : 'Could not update reimbursement.', 'err');
                return;
            }

            if (payload.actionType === 'approve') {
                raShowStatus('Reimbursement approved ✅', 'ok');
            } else if (payload.actionType === 'send_to_manager') {
                raShowStatus('Reimbursement sent to manager ✉️', 'ok');
            } else if (payload.actionType === 'checked') {
                raShowStatus('Reimbursement checked ✅', 'ok');
            } else if (payload.actionType === 'reject') {
                raShowStatus('Reimbursement rejected ❌', 'ok');
            }

            pendingReimbursementApprovalsNumber = Number(resp.pendingReimbursementApprovalsNumber || 0);
            setReimbursementApprovalBadge(pendingReimbursementApprovalsNumber);
            loadPendingReimbursementApprovals();


            setTimeout(function () {
                $('#reimbursementApprovalDetailWrap').hide();
                $('#reimbursementApprovalListWrap').show();
                raHideStatus();
            }, 1200);
        },
        error: function (xhr, status, err) {
            console.error('[RA] submit action error:', status, err, xhr?.responseText);
            raShowStatus('Network error while saving the reimbursement.', 'err');
        }
    });
}

function raFormatDateMDY(dateStr) {
    if (!dateStr) return '';

    const s = String(dateStr).trim();

    // Caso 1: DATE simple o datetime iniciado por YYYY-MM-DD
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s.*)?$/);
    if (m) {
        const y = m[1];
        const mo = String(parseInt(m[2], 10));
        const d = m[3];
        return `${mo}/${d}/${y}`;
    }

    // Caso 2: fallback para otros formatos raros
    const dt = new Date(s);
    if (isNaN(dt)) return s;

    const mo = dt.getMonth() + 1;
    const d = String(dt.getDate()).padStart(2, '0');
    const y = dt.getFullYear();

    return `${mo}/${d}/${y}`;
}

let raMagnifierEnabled = false;

function raIsDesktopForMagnifier() {
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches && window.innerWidth >= 992;
}

function raResetMagnifier() {
    const $mag = $('#raReceiptMagnifier');
    $mag.removeClass('is-visible');
    $mag.css({
        left: '-9999px',
        top: '-9999px',
        backgroundImage: 'none',
        backgroundPosition: 'center center',
        backgroundSize: 'auto'
    });
}

function raSetupMagnifier() {
    const $img = $('#raReceiptZoomImg');
    const $body = $('#raReceiptZoomBody');
    const $mag = $('#raReceiptMagnifier');

    $body.off('.raMag');
    raResetMagnifier();
    raMagnifierEnabled = false;

    if (!raIsDesktopForMagnifier()) {
        return;
    }

    const imgEl = $img[0];
    if (!imgEl || !imgEl.src) return;

    const applyBindings = () => {
        const naturalW = imgEl.naturalWidth || 0;
        const naturalH = imgEl.naturalHeight || 0;
        const rect = imgEl.getBoundingClientRect();

        if (!naturalW || !naturalH || !rect.width || !rect.height) return;

        const zoom = 3.2;
        const lensSize = 120;

        $mag.css({
            width: `${lensSize}px`,
            height: `${lensSize}px`,
            backgroundImage: `url("${imgEl.src}")`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: `${rect.width * zoom}px ${rect.height * zoom}px`
        });

        raMagnifierEnabled = true;

        $body.on('mouseenter.raMag', function () {
            if (!raMagnifierEnabled) return;
            $mag.addClass('is-visible');
        });

        $body.on('mouseleave.raMag', function () {
            raResetMagnifier();
        });

        $body.on('mousemove.raMag', function (e) {
            if (!raMagnifierEnabled) return;

            const r = imgEl.getBoundingClientRect();
            const x = e.clientX - r.left;
            const y = e.clientY - r.top;

            if (x < 0 || y < 0 || x > r.width || y > r.height) {
                raResetMagnifier();
                return;
            }

            const lensHalf = lensSize / 2;
            const bodyRect = this.getBoundingClientRect();

            let left = e.clientX - bodyRect.left - lensHalf;
            let top = e.clientY - bodyRect.top - lensHalf;

            const maxLeft = bodyRect.width - lensSize;
            const maxTop = bodyRect.height - lensSize;

            left = Math.max(0, Math.min(left, maxLeft));
            top = Math.max(0, Math.min(top, maxTop));

            const bgX = -(x * zoom - lensHalf);
            const bgY = -(y * zoom - lensHalf);

            $mag.addClass('is-visible').css({
                left: `${left}px`,
                top: `${top}px`,
                backgroundPosition: `${bgX}px ${bgY}px`
            });
        });
    };

    if (imgEl.complete) {
        applyBindings();
    } else {
        $img.off('load.raMag').on('load.raMag', applyBindings);
    }
}

function raOpenReceiptZoom(src) {
    if (!src) return;

    const $overlay = $('#raReceiptZoomOverlay');
    const $img = $('#raReceiptZoomImg');

    raResetMagnifier();

    $img.off('load.raMagOpen').on('load.raMagOpen', function () {
        raSetupMagnifier();
    });

    $img.attr('src', src);
    $overlay.show().attr('aria-hidden', 'false');

    $('body').css('overflow', 'hidden');
}

function raCloseReceiptZoom() {
    $('#raReceiptZoomBody').off('.raMag');
    $('#raReceiptZoomImg').off('load.raMag load.raMagOpen').attr('src', '');
    raResetMagnifier();
    $('#raReceiptZoomOverlay').hide().attr('aria-hidden', 'true');

    $('body').css('overflow', '');
}

function resetReimbursementsSubmenu() {
    $("#menuReimbursements")
        .removeClass("is-open")
        .attr("aria-expanded", "false");

    $("#menuReimbursementsSubmenu").prop("hidden", true);
}

function formatShiftLabel(shiftDate, eventName) {
    if (!shiftDate && !eventName) return "";

    let date = "";

    if (shiftDate) {
        const d = new Date(shiftDate);
        if (!isNaN(d)) {
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            const yy = String(d.getFullYear()).slice(-2);
            date = `${mm}/${dd}/${yy}`;
        } else {
            date = shiftDate; // fallback
        }
    }

    return `${date} • ${eventName || ""}`.trim();
}

function openSystemAdminView() {
    appCloseAllViewsHard({ showMain: false });

    $("#system-admin-view").show();

    window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant"
    });
}


function closeSystemAdminView() {
    appCloseAllViewsHard({ showMain: true });
}

function openCheckInParamsView() {
    appCloseAllViewsHard({ showMain: false });
    $("#checkin-params-view").show();
    loadCheckInParameters();
}

function closeCheckInParamsView() {
    appCloseAllViewsHard({ showMain: false });
    $("#system-admin-view").show();
}

function openReimbParamsView() {
    appCloseAllViewsHard({ showMain: false });
    $("#reimb-params-view").show();
    loadReimbursementParameters();
}

function closeReimbParamsView() {
    appCloseAllViewsHard({ showMain: false });
    $("#system-admin-view").show();
}


function openReportsParamsView() {
    appCloseAllViewsHard({ showMain: false });
    $("#reports-params-view").show();
    loadReportsParameters();
}

function closeReportsParamsView() {
    appCloseAllViewsHard({ showMain: false });
    $("#system-admin-view").show();
}

$(document).on("click", "#btnCheckInParams", function () {
    openCheckInParamsView();
});

$(document).on("click", "#btnReportsParams", function () {
    openReportsParamsView();
});


$(document).on("click", "#btnReimbParams", function () {
    openReimbParamsView();
});

$(document).on("click", "#closeReimbParamsBtn", function () {
    closeReimbParamsView();
    $("#hamburgerBtn").trigger("focus");
});

$(document).on("click", "#btnCancelReimbParams", function () {
    closeReimbParamsView();
});

$(document).on("click", "#closeReportsParamsBtn", function () {
    closeReportsParamsView();
    $("#hamburgerBtn").trigger("focus");
});

$(document).on("click", "#btnCancelReportsParams", function () {
    closeReportsParamsView();
});


$(document).on("click", "#btnUsersAdmin", function () {
    openUsersAdminView();
});


function showAdminStatus(targetId, msg, type) {
    const $box = $("#" + targetId);
    if (!$box.length) return;

    $box.removeClass("ok err warn").addClass(type || "ok").html(msg).stop(true, true).fadeIn(120);
}

function hideAdminStatus(targetId) {
    const $box = $("#" + targetId);
    if (!$box.length) return;
    $box.stop(true, true).fadeOut(120);
}

function setCheckInParamsForm(data) {
    $("#geoRequiredCheckIn").prop("checked", Number(data.geoRequiredCheckIn) === 1);
    $("#geoRequiredStartBreak").prop("checked", Number(data.geoRequiredStartBreak) === 1);
    $("#geoRequiredEndBreak").prop("checked", Number(data.geoRequiredEndBreak) === 1);
    $("#geoRequiredCheckOut").prop("checked", Number(data.geoRequiredCheckOut) === 1);

    $("#photoRequiredCheckIn").prop("checked", Number(data.photoRequiredCheckIn) === 1);
    $("#faceDetectionIn").prop("checked", Number(data.faceDetectionIn) === 1);
    $("#environmentAnalysisIn").prop("checked", Number(data.environmentAnalysisIn) === 1);

    $("#photoRequiredStartBreak").prop("checked", Number(data.photoRequiredStartBreak) === 1);
    $("#photoRequiredEndBreak").prop("checked", Number(data.photoRequiredEndBreak) === 1);
    $("#photoRequiredCheckOut").prop("checked", Number(data.photoRequiredCheckOut) === 1);
    $("#faceDetectionOut").prop("checked", Number(data.faceDetectionOut) === 1);
    $("#environmentAnalysisOut").prop("checked", Number(data.environmentAnalysisOut) === 1);
    $("#applyDistanceForCheckIn").prop("checked", Number(data.applyDistanceForCheckIn) === 1);
    $("#maxDistanceForCheckIn").val(data.maxDistanceForCheckIn ?? "1.0000");

    $("#applyDistanceForStartBreak").prop("checked", Number(data.applyDistanceForStartBreak) === 1);
    $("#maxDistanceForStartBreak").val(data.maxDistanceForStartBreak ?? "1.0000");

    $("#applyDistanceForEndBreak").prop("checked", Number(data.applyDistanceForEndBreak) === 1);
    $("#maxDistanceForEndBreak").val(data.maxDistanceForEndBreak ?? "1.0000");

    $("#applyDistanceForCheckOut").prop("checked", Number(data.applyDistanceForCheckOut) === 1);
    $("#maxDistanceForCheckOut").val(data.maxDistanceForCheckOut ?? "1.0000");

    $("#maxBreaks").val(data.maxBreaks ?? "1");

    $("#applyTimeBeforeCheckIn").prop("checked", Number(data.applyTimeBeforeCheckIn) === 1);
    $("#minMinutesBeforeCheckIn").val(data.minMinutesBeforeCheckIn ?? "99999");

    $("#applyTimeBeforeCheckOut").prop("checked", Number(data.applyTimeBeforeCheckOut) === 1);
    $("#minMinutesBeforeCheckOut").val(data.minMinutesBeforeCheckOut ?? "99999");

    $("#reportRequiredForCheckOut").prop("checked", Number(data.reportRequiredForCheckOut) === 1);
}

function collectCheckInParamsForm() {
    return {
        geoRequiredCheckIn: $("#geoRequiredCheckIn").is(":checked") ? 1 : 0,
        geoRequiredStartBreak: $("#geoRequiredStartBreak").is(":checked") ? 1 : 0,
        geoRequiredEndBreak: $("#geoRequiredEndBreak").is(":checked") ? 1 : 0,
        geoRequiredCheckOut: $("#geoRequiredCheckOut").is(":checked") ? 1 : 0,

        photoRequiredCheckIn: $("#photoRequiredCheckIn").is(":checked") ? 1 : 0,
        faceDetectionIn: $("#faceDetectionIn").is(":checked") ? 1 : 0,
        environmentAnalysisIn: $("#environmentAnalysisIn").is(":checked") ? 1 : 0,

        photoRequiredStartBreak: $("#photoRequiredStartBreak").is(":checked") ? 1 : 0,
        photoRequiredEndBreak: $("#photoRequiredEndBreak").is(":checked") ? 1 : 0,

        photoRequiredCheckOut: $("#photoRequiredCheckOut").is(":checked") ? 1 : 0,
        faceDetectionOut: $("#faceDetectionOut").is(":checked") ? 1 : 0,
        environmentAnalysisOut: $("#environmentAnalysisOut").is(":checked") ? 1 : 0,


        applyDistanceForCheckIn: $("#applyDistanceForCheckIn").is(":checked") ? 1 : 0,
        maxDistanceForCheckIn: $.trim($("#maxDistanceForCheckIn").val()),

        applyDistanceForStartBreak: $("#applyDistanceForStartBreak").is(":checked") ? 1 : 0,
        maxDistanceForStartBreak: $.trim($("#maxDistanceForStartBreak").val()),

        applyDistanceForEndBreak: $("#applyDistanceForEndBreak").is(":checked") ? 1 : 0,
        maxDistanceForEndBreak: $.trim($("#maxDistanceForEndBreak").val()),

        applyDistanceForCheckOut: $("#applyDistanceForCheckOut").is(":checked") ? 1 : 0,
        maxDistanceForCheckOut: $.trim($("#maxDistanceForCheckOut").val()),

        maxBreaks: $.trim($("#maxBreaks").val()),

        applyTimeBeforeCheckIn: $("#applyTimeBeforeCheckIn").is(":checked") ? 1 : 0,
        minMinutesBeforeCheckIn: $.trim($("#minMinutesBeforeCheckIn").val()),

        applyTimeBeforeCheckOut: $("#applyTimeBeforeCheckOut").is(":checked") ? 1 : 0,
        minMinutesBeforeCheckOut: $.trim($("#minMinutesBeforeCheckOut").val()),

        reportRequiredForCheckOut: $("#reportRequiredForCheckOut").is(":checked") ? 1 : 0,

        code: promoterCode,
        ip: ip,
        country: country,
        city: city

    };
}

function validateCheckInParams(payload) {
    const decFields = [
        "maxDistanceForCheckIn",
        "maxDistanceForStartBreak",
        "maxDistanceForEndBreak",
        "maxDistanceForCheckOut"
    ];

    const intFields = [
        "maxBreaks",
        "minMinutesBeforeCheckIn",
        "minMinutesBeforeCheckOut"
    ];

    for (const k of decFields) {
        const v = Number(payload[k]);
        if (!isFinite(v) || v < 0) {
            return "Please enter a valid non-negative number for " + k + ".";
        }
    }

    for (const k of intFields) {
        const v = Number(payload[k]);
        if (!Number.isInteger(v) || v < 0) {
            return "Please enter a valid non-negative integer for " + k + ".";
        }
    }

    return "";
}

function loadCheckInParameters() {
    hideAdminStatus("checkinParamsStatus");
    showAdminStatus("checkinParamsStatus", "Loading parameters...", "warn");

    $.ajax({
        url: API_BASE + "getCheckInParameters4000.php",
        type: "GET",
        dataType: "json",
        data: {
            code: promoterCode,
            ip: ip,
            country: country,
            city: city
        },
        success: function (resp) {
            if (!resp || !resp.ok || !resp.data) {
                showAdminStatus("checkinParamsStatus", (resp && resp.message) ? resp.message : "Could not load parameters.", "err");
                return;
            }
            setCheckInParamsForm(resp.data);
            hideAdminStatus("checkinParamsStatus");
        },
        error: function () {
            showAdminStatus("checkinParamsStatus", "Network error while loading parameters.", "err");
        }
    });
}

$(document).on("click", "#btnSaveCheckInParams", function () {
    const payload = collectCheckInParamsForm();
    const validation = validateCheckInParams(payload);

    if (validation) {
        showAdminStatus("checkinParamsStatus", validation, "err");
        return;
    }

    showAdminStatus("checkinParamsStatus", "Saving parameters...", "warn");

    $.ajax({
        url: API_BASE + "saveCheckInParameters4000.php",
        type: "POST",
        dataType: "json",
        data: payload,
        success: function (resp) {
            if (!resp || !resp.ok) {
                showAdminStatus("checkinParamsStatus", (resp && resp.message) ? resp.message : "Could not save parameters.", "err");
                return;
            }

            showAdminStatus("checkinParamsStatus", "Parameters saved successfully.", "ok");
        },
        error: function () {
            showAdminStatus("checkinParamsStatus", "Network error while saving parameters.", "err");
        }
    });
});


function setReimbursementParamsForm(data) {
    $("#reimbursementsModuleActive").prop("checked", Number(data.reimbursementsModuleActive) === 1);
    $("#defaulAproverCode").val(data.defaulAproverCode ?? "");
    $("#maxAmountApproval").val(data.maxAmountApproval ?? "1000000.00");
    $("#allowChangeExpenseDate").prop("checked", Number(data.allowChangeExpenseDate) === 1);
    $("#maxDaysForRequestAfterExpense").val(data.maxDaysForRequestAfterExpense ?? "15");
    $("#daysBeforeExpenseForShift").val(data.daysBeforeExpenseForShift ?? "7");
    $("#dayAfterExpenseForShift").val(data.dayAfterExpenseForShift ?? "1");
    $("#approvalRoute").val(data.approvalRoute ?? "ACC_TO_RMG");
    $("#receiptRequiredForRequest").prop("checked", Number(data.receiptRequiredForRequest) === 1);
    $("#shiftRequiredForRequest").prop("checked", Number(data.shiftRequiredForRequest) === 1);
    $("#daysForYellowCard").val(data.daysForYellowCard ?? "2");
    $("#daysForRedCard").val(data.daysForRedCard ?? "3");
}

function collectReimbursementParamsForm() {
    return {
        reimbursementsModuleActive: $("#reimbursementsModuleActive").is(":checked") ? 1 : 0,
        defaulAproverCode: $.trim($("#defaulAproverCode").val()),
        maxAmountApproval: $.trim($("#maxAmountApproval").val()),
        allowChangeExpenseDate: $("#allowChangeExpenseDate").is(":checked") ? 1 : 0,
        maxDaysForRequestAfterExpense: $.trim($("#maxDaysForRequestAfterExpense").val()),
        daysBeforeExpenseForShift: $.trim($("#daysBeforeExpenseForShift").val()),
        dayAfterExpenseForShift: $.trim($("#dayAfterExpenseForShift").val()),
        approvalRoute: $.trim($("#approvalRoute").val()),
        receiptRequiredForRequest: $("#receiptRequiredForRequest").is(":checked") ? 1 : 0,
        shiftRequiredForRequest: $("#shiftRequiredForRequest").is(":checked") ? 1 : 0,
        daysForYellowCard: $.trim($("#daysForYellowCard").val()),
        daysForRedCard: $.trim($("#daysForRedCard").val()),
        code: promoterCode,
        ip: ip,
        country: country,
        city: city
    };
}

function validateReimbursementParams(payload) {
    const decFields = [
        "maxAmountApproval"
    ];

    const intFields = [
        "maxDaysForRequestAfterExpense",
        "daysBeforeExpenseForShift",
        "dayAfterExpenseForShift",
        "daysForYellowCard",
        "daysForRedCard"
    ];

    for (const k of decFields) {
        const v = Number(payload[k]);
        if (!isFinite(v) || v < 0) {
            return "Please enter a valid non-negative number for " + k + ".";
        }
    }

    for (const k of intFields) {
        const v = Number(payload[k]);
        if (!Number.isInteger(v) || v < 0) {
            return "Please enter a valid non-negative integer for " + k + ".";
        }
    }

    if (payload.approvalRoute !== "ACC_TO_RMG" && payload.approvalRoute !== "RMG_TO_ACC") {
        return "Please select a valid approval route.";
    }

    if (payload.defaulAproverCode.length > 20) {
        return "Default approver code is too long.";
    }

    return "";
}

function loadReimbursementParameters() {
    hideAdminStatus("reimbParamsStatus");
    showAdminStatus("reimbParamsStatus", "Loading parameters...", "warn");

    $.ajax({
        url: API_BASE + "getReimbursementParameters4000.php",
        type: "GET",
        dataType: "json",
        data: {
            code: promoterCode,
            ip: ip,
            country: country,
            city: city
        },
        success: function (resp) {
            if (!resp || !resp.ok || !resp.data) {
                showAdminStatus("reimbParamsStatus", (resp && resp.message) ? resp.message : "Could not load parameters.", "err");
                return;
            }

            setReimbursementParamsForm(resp.data);
            showAdminStatus("reimbParamsStatus", "Parameters loaded.", "ok");

            setTimeout(function () {
                hideAdminStatus("reimbParamsStatus");
            }, 1200);
        },
        error: function () {
            showAdminStatus("reimbParamsStatus", "Network error while loading parameters.", "err");
        }
    });
}

$(document).on("click", "#btnSaveReimbParams", function () {
    const payload = collectReimbursementParamsForm();
    const validation = validateReimbursementParams(payload);

    if (validation) {
        showAdminStatus("reimbParamsStatus", validation, "err");
        return;
    }

    showAdminStatus("reimbParamsStatus", "Saving parameters...", "warn");

    $.ajax({
        url: API_BASE + "saveReimbursementParameters4000.php",
        type: "POST",
        dataType: "json",
        data: payload,
        success: function (resp) {
            if (!resp || !resp.ok) {
                showAdminStatus("reimbParamsStatus", (resp && resp.message) ? resp.message : "Could not save parameters.", "err");
                return;
            }

            showAdminStatus("reimbParamsStatus", "Parameters saved successfully.", "ok");
        },
        error: function () {
            showAdminStatus("reimbParamsStatus", "Network error while saving parameters.", "err");
        }
    });
});


function setReportsParamsForm(data) {
    $("#reportsModuleActive").prop("checked", Number(data.reportsModuleActive) === 1);
    $("#applyDfaRestriction").prop("checked", Number(data.applyDfaRestriction) === 1);
    $("#validatePhotosWhileUpload").prop("checked", Number(data.validatePhotosWhileUpload) === 1);
    $("#validatePhotosPostUpload").prop("checked", Number(data.validatePhotosPostUpload) === 1);
    $("#maxPhotoAllowed").val(data.maxPhotoAllowed ?? "9");
    $("#minPhotosAllowed").val(data.minPhotosAllowed ?? "1");
    $("#allowMicrophoseUseForSummary").prop("checked", Number(data.allowMicrophoseUseForSummary) === 1);
    $("#maxSecondsSummaryRecording").val(data.maxSecondsSummaryRecording ?? "20");
    $("#maxIssuesFieldLength").val(data.maxIssuesFieldLength ?? "300");
    $("#minSummaryFieldLength").val(data.minSummaryFieldLength ?? "10");
    $("#maxSummaryFieldLength").val(data.maxSummaryFieldLength ?? "2000");
}

function collectReportsParamsForm() {
    return {
        reportsModuleActive: $("#reportsModuleActive").is(":checked") ? 1 : 0,
        applyDfaRestriction: $("#applyDfaRestriction").is(":checked") ? 1 : 0,
        validatePhotosWhileUpload: $("#validatePhotosWhileUpload").is(":checked") ? 1 : 0,
        validatePhotosPostUpload: $("#validatePhotosPostUpload").is(":checked") ? 1 : 0,
        maxPhotoAllowed: $.trim($("#maxPhotoAllowed").val()),
        minPhotosAllowed: $.trim($("#minPhotosAllowed").val()),
        allowMicrophoseUseForSummary: $("#allowMicrophoseUseForSummary").is(":checked") ? 1 : 0,
        maxSecondsSummaryRecording: $.trim($("#maxSecondsSummaryRecording").val()),
        maxIssuesFieldLength: $.trim($("#maxIssuesFieldLength").val()),
        minSummaryFieldLength: $.trim($("#minSummaryFieldLength").val()),
        maxSummaryFieldLength: $.trim($("#maxSummaryFieldLength").val()),
        code: promoterCode,
        ip: ip,
        country: country,
        city: city
    };
}

function validateReportsParams(payload) {
    const intFields = [
        "maxPhotoAllowed",
        "minPhotosAllowed",
        "maxSecondsSummaryRecording",
        "maxIssuesFieldLength",
        "minSummaryFieldLength",
        "maxSummaryFieldLength"
    ];

    for (const k of intFields) {
        const v = Number(payload[k]);
        if (!Number.isInteger(v) || v < 0) {
            return "Please enter a valid non-negative integer for " + k + ".";
        }
    }

    if (Number(payload.minPhotosAllowed) > Number(payload.maxPhotoAllowed)) {
        return "Min Photos Allowed cannot be greater than Max Photos Allowed.";
    }

    if (Number(payload.minSummaryFieldLength) > Number(payload.maxSummaryFieldLength)) {
        return "Min Summary Field Length cannot be greater than Max Summary Field Length.";
    }

    return "";
}

function loadReportsParameters() {
    hideAdminStatus("reportsParamsStatus");
    showAdminStatus("reportsParamsStatus", "Loading parameters...", "warn");

    $.ajax({
        url: API_BASE + "getReportsParameters4000.php",
        type: "GET",
        dataType: "json",
        data: {
            code: promoterCode,
            ip: ip,
            country: country,
            city: city
        },
        success: function (resp) {
            if (!resp || !resp.ok || !resp.data) {
                showAdminStatus("reportsParamsStatus", (resp && resp.message) ? resp.message : "Could not load parameters.", "err");
                return;
            }

            setReportsParamsForm(resp.data);
            showAdminStatus("reportsParamsStatus", "Parameters loaded.", "ok");

            setTimeout(function () {
                hideAdminStatus("reportsParamsStatus");
            }, 1200);
        },
        error: function () {
            showAdminStatus("reportsParamsStatus", "Network error while loading parameters.", "err");
        }
    });
}

$(document).on("click", "#btnSaveReportsParams", function () {
    const payload = collectReportsParamsForm();
    const validation = validateReportsParams(payload);

    if (validation) {
        showAdminStatus("reportsParamsStatus", validation, "err");
        return;
    }

    showAdminStatus("reportsParamsStatus", "Saving parameters...", "warn");

    $.ajax({
        url: API_BASE + "saveReportsParameters4000.php",
        type: "POST",
        dataType: "json",
        data: payload,
        success: function (resp) {
            if (!resp || !resp.ok) {
                showAdminStatus("reportsParamsStatus", (resp && resp.message) ? resp.message : "Could not save parameters.", "err");
                return;
            }

            showAdminStatus("reportsParamsStatus", "Parameters saved successfully.", "ok");
        },
        error: function () {
            showAdminStatus("reportsParamsStatus", "Network error while saving parameters.", "err");
        }
    });
});

let usersAdminData = [];
let currentUserAdmin = null;

function openUsersAdminView() {
    appCloseAllViewsHard({ showMain: false });
    $("#users-admin-view").show();
    $("#usersListView").show();
    $("#usersDetailView").hide();
    currentUserAdmin = null;
    $("#usersSearchInput").val("");
    updateUsersSearchClear();
    $("#usersSearchBar").show();
    $("#usersSearchCount").text("");
    loadUsers();
}

function closeUsersAdminView() {
    appCloseAllViewsHard({ showMain: false });
    $("#system-admin-view").show();
}

function loadUsers() {
    $("#usersStatus").text("Loading...").show();

    $.ajax({
        url: API_BASE + "getUsersAdmin4000.php",
        type: "GET",
        dataType: "json",
        data: {
            code: promoterCode,
            ip: ip,
            country: country,
            city: city
        },
        success: function (resp) {
            if (!resp || !resp.ok || !Array.isArray(resp.data)) {
                $("#usersStatus").text("Error loading users").show();
                return;
            }
            usersAdminData = resp.data.slice();
            filterUsersAdminList();
            $("#usersStatus").hide();
        },
        error: function () {
            $("#usersStatus").text("Server error").show();
        }
    });
}


function filterUsersAdminList() {
    const search = String($("#usersSearchInput").val() || "")
        .trim()
        .toUpperCase();

    const allUsers = Array.isArray(usersAdminData)
        ? usersAdminData
        : [];

    const filtered = search.length < 3
        ? allUsers
        : allUsers.filter(u => {
            const code = String(u.promoterCode || "").toUpperCase();
            const name = String(u.promoterName || "").toUpperCase();

            return code.includes(search) || name.includes(search);
        });

    renderUsersList(filtered);

    $("#usersSearchCount").text(
        `${filtered.length} OF ${allUsers.length} USERS`
    );
}

$(document)
    .off("input.usersSearch", "#usersSearchInput")
    .on("input.usersSearch", "#usersSearchInput", function () {
        filterUsersAdminList();
    });

function updateUsersSearchClear() {
    const hasText = $("#usersSearchInput").val().length > 0;
    $("#usersSearchClear").prop("hidden", !hasText);
}

$(document)
    .off("input.usersClear", "#usersSearchInput")
    .on("input.usersClear", "#usersSearchInput", updateUsersSearchClear);

$(document)
    .off("click.usersClear", "#usersSearchClear")
    .on("click.usersClear", "#usersSearchClear", function () {
        $("#usersSearchInput").val("");
        updateUsersSearchClear();
        filterUsersAdminList();
        $("#usersSearchInput").trigger("focus");
    });


function renderUsersList(users) {
    const $list = $("#usersList");
    $list.empty();

    if (!Array.isArray(users) || !users.length) {
        $list.html(`<div class="admin-user-row">No users found.</div>`);
        return;
    }

    users.forEach(u => {
        $list.append(`
            <div class="admin-user-row" data-id="${escapeHtml(u.idPromoter)}">
                <div class="admin-user-row-top">
                    <div class="admin-user-code">${escapeHtml(u.promoterCode)}</div>
                    <div class="admin-user-market">${escapeHtml(u.market || "")}</div>
                </div>

                <button type="button" class="admin-user-name-btn" data-id="${escapeHtml(u.idPromoter)}">
                    ${escapeHtml(u.promoterName)}
                </button>
            </div>
        `);
    });
}

function openUserDetailById(idPromoter) {
    const found = (usersAdminData || []).find(u => String(u.idPromoter) === String(idPromoter));
    if (!found) {
        $("#usersStatus").text("User not found.").show();
        return;
    }

    currentUserAdmin = { ...found };

    $("#userDetailCode").val(found.promoterCode || "");
    $("#userDetailName").val(found.promoterName || "");
    $("#userDetailMarket").val(found.market || "");
    $("#userDetailStateCode").val(found.stateCode || "");
    $("#userDetailPhone").val(found.phone || "");
    $("#userDetailEmail").val(found.email || "");
    $("#userDetailPromoterStatus").val(found.promoterStatus || "");
    $("#userDetailSupervisorLevel").val(found.supervisorLevel ?? 0);
    $("#userDetailActive").prop("checked", Number(found.active) === 1);
    $("#userDetailBlockedForUpdate").prop("checked", Number(found.blockedForUpdate) === 1);
    $("#userDetailGeoRequiredIn").prop("checked", Number(found.geoRequiredIn) === 1);
    $("#userDetailGeoRequiredOut").prop("checked", Number(found.geoRequiredOut) === 1);
    $("#userDetailPhotoRequiredIn").prop("checked", Number(found.photoRequiredIn) === 1);
    $("#userDetailPhotoRequiredOut").prop("checked", Number(found.photoRequiredOut) === 1);
    $("#userDetailFaceDetectionIn").prop("checked", Number(found.faceDetectionIn) === 1);
    $("#userDetailFaceDetectionOut").prop("checked", Number(found.faceDetectionOut) === 1);
    $("#userDetailEnvironmentAnalysisIn").prop("checked", Number(found.environmentAnalysisIn) === 1);
    $("#userDetailEnvironmentAnalysisOut").prop("checked", Number(found.environmentAnalysisOut) === 1);
    $("#usersListView").hide();
    $("#usersSearchBar").hide();
    $("#usersSearchCount").hide();
    $("#usersDetailView").show();
    $("#usersStatus").hide();
}

function closeUserDetailView() {
    currentUserAdmin = null;

    $("#usersDetailView").hide();

    // Reset search and restore the complete users list
    $("#usersSearchInput").val("");
    updateUsersSearchClear();

    $("#usersSearchBar").show();
    $("#usersSearchCount").show();

    filterUsersAdminList();

    $("#usersListView").show();
    $("#usersStatus").hide();
}

function collectUserDetailPayload() {
    if (!currentUserAdmin) return null;

    return {
        idPromoter: currentUserAdmin.idPromoter,
        supervisorLevel: parseInt($("#userDetailSupervisorLevel").val() || "0", 10),
        active: $("#userDetailActive").is(":checked") ? 1 : 0,
        blockedForUpdate: $("#userDetailBlockedForUpdate").is(":checked") ? 1 : 0,
        geoRequiredIn: $("#userDetailGeoRequiredIn").is(":checked") ? 1 : 0,
        geoRequiredOut: $("#userDetailGeoRequiredOut").is(":checked") ? 1 : 0,
        photoRequiredIn: $("#userDetailPhotoRequiredIn").is(":checked") ? 1 : 0,
        photoRequiredOut: $("#userDetailPhotoRequiredOut").is(":checked") ? 1 : 0,
        faceDetectionIn: $("#userDetailFaceDetectionIn").is(":checked") ? 1 : 0,
        faceDetectionOut: $("#userDetailFaceDetectionOut").is(":checked") ? 1 : 0,
        environmentAnalysisIn: $("#userDetailEnvironmentAnalysisIn").is(":checked") ? 1 : 0,
        environmentAnalysisOut: $("#userDetailEnvironmentAnalysisOut").is(":checked") ? 1 : 0
    };
}

function validateUserDetailPayload(payload) {
    if (!payload) return "No user selected.";

    if (!Number.isInteger(payload.supervisorLevel) || payload.supervisorLevel < 0) {
        return "Supervisor Level must be a valid non-negative integer.";
    }

    return "";
}

$(document).on("click", "#btnUsersAdmin", function () {
    openUsersAdminView();
});

$(document).on("click", "#closeUsersAdminBtn", function () {
    closeUsersAdminView();
    $("#hamburgerBtn").trigger("focus");
});

$(document).on("click", "#btnBackUsersToAdmin", function () {
    closeUsersAdminView();
});

$(document).on("click", ".admin-user-name-btn", function () {
    openUserDetailById($(this).data("id"));
});

$(document).on("click", "#btnCancelUserDetail", function () {
    closeUserDetailView();
});

$(document).on("click", "#btnSaveUserDetail", function () {
    const payload = collectUserDetailPayload();
    const validation = validateUserDetailPayload(payload);

    if (validation) {
        $("#usersStatus").text(validation).show();
        return;
    }

    $("#usersStatus").text("Saving...").show();

    $.ajax({
        url: API_BASE + "saveUsersAdmin4000.php",
        type: "POST",
        dataType: "json",
        data: payload,
        success: function (resp) {
            if (!resp || !resp.ok) {
                $("#usersStatus").text((resp && resp.message) ? resp.message : "Error saving user").show();
                return;
            }

            const idx = usersAdminData.findIndex(u => String(u.idPromoter) === String(payload.idPromoter));
            if (idx >= 0) {
                usersAdminData[idx].supervisorLevel = payload.supervisorLevel;
                usersAdminData[idx].active = payload.active;
                usersAdminData[idx].blockedForUpdate = payload.blockedForUpdate;
                usersAdminData[idx].geoRequiredIn = payload.geoRequiredIn;
                usersAdminData[idx].geoRequiredOut = payload.geoRequiredOut;
                usersAdminData[idx].photoRequiredIn = payload.photoRequiredIn;
                usersAdminData[idx].photoRequiredOut = payload.photoRequiredOut;
                usersAdminData[idx].faceDetectionIn = payload.faceDetectionIn;
                usersAdminData[idx].faceDetectionOut = payload.faceDetectionOut;
                usersAdminData[idx].environmentAnalysisIn = payload.environmentAnalysisIn;
                usersAdminData[idx].environmentAnalysisOut = payload.environmentAnalysisOut;
            }

            $("#usersStatus").text("Saved ✔️").show();
            renderUsersList(usersAdminData);

            setTimeout(function () {
                closeUserDetailView();
                $("#usersStatus").fadeOut();
            }, 1000);
        },
        error: function () {
            $("#usersStatus").text("Server error").show();
        }
    });
});

// ================= FORGOT CODE BY EMAIL =================

function forgotCodeOpenModal() {
    $("#forgotCodeEmail").val("");
    forgotCodeSetError("");
    forgotCodeSetStatus("");
    $("#forgotCodeSendBtn")
        .prop("disabled", false)
        .html('<i class="bi bi-envelope-check"></i> Send Code');

    $("#forgotCodeModal").addClass("show").attr("aria-hidden", "false");

    setTimeout(() => {
        $("#forgotCodeEmail").trigger("focus");
    }, 100);
}

function forgotCodeCloseModal() {
    $("#forgotCodeModal").removeClass("show").attr("aria-hidden", "true");
}

function forgotCodeSetError(msg) {
    const $grp = $("#grp_forgotCodeEmail");
    const $err = $("#err_forgotCodeEmail");

    if (msg) {
        $grp.addClass("rc-invalid");
        $err.text(msg).show();
    } else {
        $grp.removeClass("rc-invalid");
        $err.text("").hide();
    }
}

function forgotCodeSetStatus(msg, tone = "info") {
    const $box = $("#forgotCodeStatus");

    if (!msg) {
        $box.hide().removeClass("forgot-code-status--ok forgot-code-status--err forgot-code-status--info").text("");
        return;
    }

    $box
        .removeClass("forgot-code-status--ok forgot-code-status--err forgot-code-status--info")
        .addClass(`forgot-code-status--${tone}`)
        .text(msg)
        .show();
}

function forgotCodeValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function forgotCodeSubmit() {
    const email = String($("#forgotCodeEmail").val() || "").trim().toLowerCase();

    forgotCodeSetError("");
    forgotCodeSetStatus("");

    if (!forgotCodeValidEmail(email)) {
        forgotCodeSetError("Enter a valid registered email.");
        $("#forgotCodeEmail").trigger("focus");
        return;
    }

    const $btn = $("#forgotCodeSendBtn");
    $btn.prop("disabled", true).html('<span class="spinner-border spinner-border-sm me-2"></span> Sending');

    $.ajax({
        url: API_BASE + "forgotCode4000.php",
        method: "POST",
        dataType: "json",
        data: {
            email: email,
            ip: ip || "",
            country: country || "",
            city: city || ""
        },
        success: function (_resp) {
            forgotCodeSetStatus("If registered, your code will be emailed shortly.", "ok");
            $("#forgotCodeEmail").val("");
            setTimeout(function () {
                forgotCodeCloseModal();
            }, 1800);
        },
        error: function (xhr, status, err) {
            console.error("[Forgot Code] error:", status, err, xhr?.responseText);
            forgotCodeSetStatus("If registered, your code will be emailed shortly.", "ok");
            $("#forgotCodeEmail").val("");
        },
        complete: function () {
            $btn.prop("disabled", false).html('<i class="bi bi-envelope-check"></i> Send Code');
        }
    });
}

function buildExpressShift() {
    const now = new Date();

    const actionStamp =
        now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, "0") +
        String(now.getDate()).padStart(2, "0") +
        String(now.getHours()).padStart(2, "0") +
        String(now.getMinutes()).padStart(2, "0") +
        String(now.getSeconds()).padStart(2, "0");

    const actionSuffix =
        lastExpressAction === "EXPRESS IN" ? "OUT" : "IN";

    return {
        pk: `EXPRESS-${promoterCode}-${actionSuffix}-${actionStamp}`,
        expressParentId: lastExpressAction === "EXPRESS IN" ? lastExpressInId : null,

        brand: "EXPRESS",
        market: "EXPRESS",
        location1: "Express Check In",
        eventName: "Express Check In / Out",
        shiftDate: formatDisplayDateFromDate(now),
        fromTo: "Open shift",
        shiftLat: 0,
        shiftLon: 0,

        applyCheckInDistanceRestriction: 0,
        applyDistanceRestrictionStartBreak: 0,
        applyDistanceRestrictionEndBreak: 0,
        applyCheckOutDistanceRestriction: 0,

        requirePhotoCheckIn: 1,
        requirePhotoStartBreak: 0,
        requirePhotoEndBreak: 0,
        requirePhotoCheckOut: 1,

        maxBreaksAllowed: 0,
        breaksCounter: 0,
        applyCheckOutTimeRestriction: 0,
        applyStartBreakTimeRestriction: 0,

        promoterEmail,
        promoterPhone
    };
}

function openToDoList() {
    appCloseAllViewsHard({ showMain: false });
    $("#todo-view").show();
    renderToDoList();
}

function closeToDoList() {
    $("#todo-view").hide();
    $("#main-view").show();
}

$(document)
    .off("click.toDoList", "#menuToDoList")
    .on("click.toDoList", "#menuToDoList", function () {
        closeMenuHard();
        openToDoList();
    });

$(document).off("click", "#closeToDoBtn").on("click", "#closeToDoBtn", function () {
    closeToDoList();
    $("#hamburgerBtn").trigger("focus");
});

function renderToDoList() {
    const $list = $("#todo-list");
    const $empty = $("#toDoEmpty");

    $list.empty();

    if (!Array.isArray(toDoList) || toDoList.length === 0) {
        $empty.show();
        return;
    }

    $empty.hide();

    $list.css({
        maxHeight: "80vh",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch"
    });

    toDoList.forEach((r) => {


        const $card = $(`
            <div class="todo-card">
                <div class="todo-card-top">
                    <div class="todo-brand">${escapeHtml(r.brand || "")}</div>
                    <div class="todo-date">${escapeHtml(r.jobDateLabel || r.jobDate || "")}</div>
                </div>

                <div class="todo-meta">
                    <div>${r.promoter}</div>
                     <span class="todo-separator"> • </span>
                    <div>${r.location1}</div>
                </div>

                <div class="todo-event">
                    <p>${escapeHtml(r.eventName || "")}</p>
                </div>
            </div>
        `);

        $list.append($card);
    });
}

function openManualHours() {

    if (Number(canAddHoursManually || 0) !== 1) {
        showMessage(
            "You are not authorized to add manual hours.",
            "danger"
        );
        return;
    }

    appCloseAllViewsHard({ showMain: false });
    $("#manualHoursWorker").val(promoterName || "");
    $("#manual-hours-view").show();
    initManualHoursVoice();
}


function closeManualHours() {

    resetManualHoursForm();

    $("#manual-hours-view").hide();
    $("#main-view").show();
}

$(document)
    .off("input.manualHoursDuration")
    .on(
        "input.manualHoursDuration",
        "#manualHoursDurationHours, #manualHoursDurationMinutes",
        function () {

            let value = parseInt(this.value, 10);

            // Si está vacío, dejarlo vacío
            if (this.value === "") return;

            // Cualquier cosa no numérica
            if (Number.isNaN(value)) {
                this.value = "";
                return;
            }

            if (this.id === "manualHoursDurationHours") {

                if (value < 0) value = 0;
                if (value > 24) value = 24;

            } else if (this.id === "manualHoursDurationMinutes") {

                if (value < 0) value = 0;
                if (value > 59) value = 59;
            }

            this.value = value;
        }
    );

function resetManualHoursForm() {

    // Worker permanece porque corresponde al usuario logueado
    $("#manualHoursWorker").val(promoterName || "");

    // Limpiar campos
    $("#manualHoursDate").val("");
    $("#manualHoursStart").val("");
    $("#manualHoursDurationHours").val("");
    $("#manualHoursDurationMinutes").val("");
    $("#manualHoursCompletedTasks").val("");

    // Limpiar mensajes / estado de voz
    $("#manualHoursMessage").hide().text("");
    $("#manualHoursMicStatus").text("").css("opacity", "");

    // Restaurar botón del micrófono
    $("#btnManualHoursMic")
        .html('<i class="bi bi-mic" aria-hidden="true"></i>')
        .removeClass("btn-danger")
        .addClass("btn-outline-primary")
        .attr("aria-pressed", "false");
}

$(document)
    .off("click.manualHoursSubmit", "#btnSubmitManualHours")
    .on("click.manualHoursSubmit", "#btnSubmitManualHours", async function () {

        const workDate = String(
            $("#manualHoursDate").val() || ""
        ).trim();

        const startTimeInput = String(
            $("#manualHoursStart").val() || ""
        ).trim();

        const durationInputHours = String(
            $("#manualHoursDurationHours").val() || ""
        ).trim();

        const durationInputMinutes = String(
            $("#manualHoursDurationMinutes").val() || ""
        ).trim();

        const completedTasks = String(
            $("#manualHoursCompletedTasks").val() || ""
        ).trim();


        // ==========================================
        // VALIDATION
        // ==========================================

        if (!workDate) {
            showMessage(
                "Please select the work date.",
                "warning",
                1
            );
            return;
        }

        if (!startTimeInput) {
            showMessage(
                "Please select the start time.",
                "warning",
                1
            );
            return;
        }

        if (
            durationInputHours === "" ||
            durationInputMinutes === ""
        ) {
            showMessage(
                "Please enter the complete duration.",
                "warning",
                1
            );
            return;
        }

        const hours = parseInt(durationInputHours, 10);
        const minutes = parseInt(durationInputMinutes, 10);

        if (
            Number.isNaN(hours) ||
            Number.isNaN(minutes) ||
            hours < 0 ||
            hours > 24 ||
            minutes < 0 ||
            minutes > 59 ||
            (hours === 0 && minutes === 0) ||
            (hours === 24 && minutes > 0)
        ) {
            showMessage(
                "Please enter a valid duration.",
                "warning",
                1
            );
            return;
        }

        if (!completedTasks) {
            showMessage(
                "Please describe the completed tasks.",
                "warning",
                1
            );
            return;
        }


        // ==========================================
        // BUILD REQUEST
        // ==========================================

        const formData = new FormData();

        formData.append(
            "promoterCode",
            promoterCode
        );

        formData.append(
            "workDate",
            workDate
        );

        formData.append(
            "startTimeInput",
            startTimeInput
        );

        formData.append(
            "durationInputHours",
            hours
        );

        formData.append(
            "durationInputMinutes",
            minutes
        );

        formData.append(
            "completedTasks",
            completedTasks
        );

        formData.append(
            "ip",
            ip || ""
        );

        formData.append(
            "country",
            country || ""
        );

        formData.append(
            "city",
            city || ""
        );


        // ==========================================
        // SUBMIT
        // ==========================================

        const $btn = $(this);

        $btn
            .prop("disabled", true)
            .text("Submitting...");

        try {

            console.log("[MANUAL HOURS] startTimeInput:", startTimeInput);
            console.log("[MANUAL HOURS] workDate:", workDate);
            console.log("[MANUAL HOURS] duration:", durationInputHours, durationInputMinutes);
            const response = await fetch(
                "php/submitManualHours4000.php",
                {
                    method: "POST",
                    body: formData
                }
            );

            const data = await response.json();

            console.log(
                "[MANUAL HOURS] submit response:",
                data
            );

            if (!data.success) {
                throw new Error(
                    data.message ||
                    "Unable to submit admin hours."
                );
            }

            const $msg = $("#manualHoursMessage");

            $msg
                .removeClass("alert-danger alert-warning alert-info")
                .addClass("alert-success")
                .text(
                    data.message ||
                    "Admin hours submitted successfully."
                )
                .show();

            clearTimeout($msg[0].__hideTimer);

            $msg[0].__hideTimer = setTimeout(() => {
                $msg.fadeOut(300, function () {
                    $(this)
                        .removeClass("alert-success")
                        .text("");
                });
            }, 3000);

            // Limpiar solamente los campos para permitir otro registro
            $("#manualHoursDate").val("");
            $("#manualHoursStart").val("");
            $("#manualHoursDurationHours").val("");
            $("#manualHoursDurationMinutes").val("");
            $("#manualHoursCompletedTasks").val("");

            // Volver arriba del formulario
            $("#manual-hours-view .section-body").scrollTop(0);


        } catch (err) {

            console.error(
                "[MANUAL HOURS] submit error:",
                err
            );

            showMessage(
                err.message ||
                "Unable to submit admin hours.",
                "danger",
                1
            );

        } finally {

            $btn
                .prop("disabled", false)
                .text("Submit");
        }
    });



function initManualHoursVoice() {

    const btn = document.getElementById("btnManualHoursMic");
    const status = document.getElementById("manualHoursMicStatus");
    const textarea = document.getElementById("manualHoursCompletedTasks");

    if (!btn || !status || !textarea) {
        console.warn("[Manual Hours Voice] UI elements not found.");
        return;
    }

    // Evitar conectar el evento más de una vez
    if (btn.dataset.voiceAttached === "1") return;

    btn.dataset.voiceAttached = "1";

    btn.addEventListener("click", async function () {

        // Si está grabando, este click significa STOP
        if (sttMediaRecorder && sttMediaRecorder.state === "recording") {
            stopManualHoursRecording(
                btn,
                status,
                textarea
            );
            return;
        }

        // No iniciar otra operación mientras STT está ocupado
        if (sttBusy) return;

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showMessage(
                "Your browser cannot record audio.",
                "info",
                1
            );
            return;
        }

        startRecording(
            btn,
            status
        );
    });
}

function stopManualHoursRecording(btn, status, textarea) {

    if (!sttMediaRecorder) return;

    sttBusy = true;

    // Volver visualmente al micrófono azul
    btn.innerHTML = '<i class="bi bi-mic" aria-hidden="true"></i>';
    btn.classList.remove("btn-danger");
    btn.classList.add("btn-outline-primary");
    btn.setAttribute("aria-pressed", "false");

    status.style.opacity = 1;
    status.textContent = "Transcribing…";

    /*
     * IMPORTANTE:
     * Para Manual Hours usamos el evento STOP como cierre definitivo.
     * Los chunks ya son alimentados por el listener dataavailable
     * instalado por startRecording().
     */
    sttMediaRecorder.addEventListener("stop", async function () {

        try {

            const blob = new Blob(
                sttChunks,
                { type: sttMime }
            );

            if (!blob || blob.size < 2000) {
                status.textContent = "No audio captured";

                showMessage(
                    "🎤 Audio too short. Speak 2–3 sec.",
                    "warning",
                    1
                );

                return;
            }

            /*
             * Reutilizamos exactamente el upload STT existente.
             * NO translateAndPolish().
             */
            const text = await uploadAudioForTranscription(
                blob,
                sttExt
            );

            const raw = String(text || "").trim();

            if (!raw) {
                throw new Error("empty_transcription");
            }

            // RAW transcription only
            textarea.value = raw;
            $(textarea).trigger("input");

            status.textContent = "Transcribed ✔";

            // Igual que Reports: desaparecer el status después
            clearTimeout(status.__fadeTO);

            status.__fadeTO = setTimeout(() => {

                status.style.transition = "opacity .45s ease";
                status.style.opacity = 0;

                setTimeout(() => {
                    status.textContent = "";
                    status.style.opacity = "";
                    status.style.transition = "";
                }, 450);

            }, 3500);

        } catch (err) {

            console.error(
                "[Manual Hours STT] transcription error:",
                err
            );

            status.textContent = "Transcription failed";

            showMessage(
                "❗ Transcription failed. Try again.",
                "warning",
                1
            );

        } finally {

            sttBusy = false;
        }

    }, { once: true });


    try {

        sttMediaRecorder.stop();

    } catch (err) {

        console.error(
            "[Manual Hours STT] stop error:",
            err
        );

        sttBusy = false;

        status.textContent = "Transcription failed";
    }
}

$(document)
    .off("click.forgotCode", "#forgotCodeBtn")
    .on("click.forgotCode", "#forgotCodeBtn", function () {
        forgotCodeOpenModal();
    });

$(document)
    .off("click.forgotCodeClose", "#forgotCodeCloseBtn, #forgotCodeCancelBtn")
    .on("click.forgotCodeClose", "#forgotCodeCloseBtn, #forgotCodeCancelBtn", function () {
        forgotCodeCloseModal();
    });

$(document)
    .off("click.forgotCodeSend", "#forgotCodeSendBtn")
    .on("click.forgotCodeSend", "#forgotCodeSendBtn", function () {
        forgotCodeSubmit();
    });

$(document)
    .off("keydown.forgotCode")
    .on("keydown.forgotCode", function (e) {
        if (!$("#forgotCodeModal").hasClass("show")) return;

        if (e.key === "Escape") {
            e.preventDefault();
            forgotCodeCloseModal();
        }

        if (e.key === "Enter") {
            const activeId = document.activeElement?.id || "";
            if (activeId === "forgotCodeEmail") {
                e.preventDefault();
                forgotCodeSubmit();
            }
        }
    });

// EXPRESS PARAMETERS ADMINISTRATION
let expressParamsRequestVersion = 0;
const expressParamsBooleanFields = ["geoRequiredIn", "geoRequiredOut", "photoRequiredIn", "photoRequiredOut", "faceDetectionIn", "faceDetectionOut", "environmentAnalysisIn", "environmentAnalysisOut", "active"];
const expressParamsNumberFields = ["minPhotosMandatoryReport", "maxPhotosMandatoryReport", "minPhotosOptionalReport", "maxPhotosOptionalReport"];

function openExpressParamsView() {
    if (Number(supervisorLevel) < 5) return;
    appCloseAllViewsHard({ showMain: false });
    $("#express-params-view").show().scrollTop(0);
    loadExpressParameters();
}

function closeExpressParamsView() {
    appCloseAllViewsHard({ showMain: false });
    $("#system-admin-view").show();
}

function setExpressParamsForm(data) {
    $("#express_idExpressParameters").val(data.idExpressParameters);
    expressParamsBooleanFields.forEach(k => $("#express_" + k).prop("checked", Number(data[k]) === 1));
    expressParamsNumberFields.forEach(k => $("#express_" + k).val(data[k]));
}

function collectExpressParamsForm() {
    const payload = { idExpressParameters: $("#express_idExpressParameters").val(), code: promoterCode, ip, country, city };
    expressParamsBooleanFields.forEach(k => { payload[k] = $("#express_" + k).is(":checked") ? 1 : 0; });
    expressParamsNumberFields.forEach(k => { payload[k] = String($("#express_" + k).val() ?? "").trim(); });
    return payload;
}

function validateExpressParams(payload) {
    if (!/^[1-9]\d*$/.test(String(payload.idExpressParameters))) return "Load the parameters before saving.";
    for (const mode of ["Mandatory", "Optional"]) {
        const min = payload["minPhotos" + mode + "Report"];
        const max = payload["maxPhotos" + mode + "Report"];
        const floor = mode === "Mandatory" ? 1 : 0;
        if (![min, max].every(v => /^\d+$/.test(String(v)) && Number(v) >= floor && Number(v) <= 32767)) {
            return mode + " report photo limits must be whole numbers between " + floor + " and 32767.";
        }
        if (Number(min) > Number(max)) return mode + " report: Min Photos cannot exceed Max Photos.";
    }
    return "";
}

function loadExpressParameters() {
    const requestVersion = ++expressParamsRequestVersion;
    $("#expressParamsFields, #btnSaveExpressParams").prop("disabled", true);
    $("#express_idExpressParameters").val("");
    showAdminStatus("expressParamsStatus", "Loading parameters...", "warn");
    $.ajax({
        url: API_BASE + "getExpressParameters4000.php", type: "GET", dataType: "json", cache: false,
        data: { code: promoterCode, ip, country, city },
        success: function (resp) {
            if (requestVersion !== expressParamsRequestVersion) return;
            if (!resp || !resp.ok || !resp.data) {
                showAdminStatus("expressParamsStatus", escapeHtml(resp?.message || "Could not load Express parameters."), "err");
                return;
            }
            setExpressParamsForm(resp.data);
            $("#expressParamsFields, #btnSaveExpressParams").prop("disabled", false);
            showAdminStatus("expressParamsStatus", "Parameters loaded.", "ok");
            setTimeout(function () {
                if (requestVersion === expressParamsRequestVersion) hideAdminStatus("expressParamsStatus");
            }, 1200);
        },
        error: function () {
            if (requestVersion === expressParamsRequestVersion) showAdminStatus("expressParamsStatus", "Error loading Express parameters. Close and reopen to retry.", "err");
        }
    });
}

function saveExpressParameters() {
    if ($("#btnSaveExpressParams").prop("disabled")) return;
    const payload = collectExpressParamsForm();
    const validation = validateExpressParams(payload);
    if (validation) { showAdminStatus("expressParamsStatus", validation, "err"); return; }
    const requestVersion = ++expressParamsRequestVersion;
    $("#expressParamsFields, #btnSaveExpressParams").prop("disabled", true);
    showAdminStatus("expressParamsStatus", "Saving parameters...", "warn");
    $.ajax({
        url: API_BASE + "saveExpressParameters4000.php", type: "POST", dataType: "json", data: payload,
        success: function (resp) {
            if (requestVersion !== expressParamsRequestVersion) return;
            showAdminStatus("expressParamsStatus", resp && resp.ok ? "Parameters saved successfully." : escapeHtml(resp?.message || "Could not save Express parameters."), resp && resp.ok ? "ok" : "err");
        },
        error: function () {
            if (requestVersion === expressParamsRequestVersion) showAdminStatus("expressParamsStatus", "Error saving Express parameters. Please try again.", "err");
        },
        complete: function () {
            if (requestVersion === expressParamsRequestVersion) $("#expressParamsFields, #btnSaveExpressParams").prop("disabled", false);
        }
    });
}

function getExpressReportPhotoLimits(photoMode) {
    const mode = String(photoMode || "NO").trim().toUpperCase();

    if (mode === "NO") {
        return { min: 0, max: 0 };
    }

    if (!["MANDATORY", "OPTIONAL"].includes(mode)) {
        throw new Error("Invalid Express photo mode.");
    }

    const suffix = mode === "MANDATORY" ? "Mandatory" : "Optional";
    const rawMin = expressParams["minPhotos" + suffix + "Report"];
    const rawMax = expressParams["maxPhotos" + suffix + "Report"];

    const min = Number(rawMin);
    const max = Number(rawMax);
    const floor = mode === "MANDATORY" ? 1 : 0;

    if (
        rawMin == null || rawMax == null ||
        String(rawMin).trim() === "" ||
        String(rawMax).trim() === "" ||
        !Number.isInteger(min) ||
        !Number.isInteger(max) ||
        min < floor ||
        max < min ||
        max > 32767
    ) {
        throw new Error("Invalid or missing Express report photo limits.");
    }

    return { min, max };
}

$(document).on("click", "#btnExpressParams", openExpressParamsView);
$(document).on("click", "#closeExpressParamsBtn, #btnCancelExpressParams", function () {
    closeExpressParamsView();
    $("#btnExpressParams").trigger("focus");
});
$(document).on("click", "#btnSaveExpressParams", saveExpressParameters);


