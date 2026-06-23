/**
 * Temporary ChatXII request-lifecycle debugger (v0.x audit).
 * Enable:  window location has ?debug=1  OR  localStorage.chatxii_debug = "1"
 * Disable: localStorage.removeItem("chatxii_debug")
 */
var ChatDebug = (function () {
    "use strict";

    function isEnabled() {
        try {
            if (localStorage.getItem("chatxii_debug") === "0") {
                return false;
            }
            if (localStorage.getItem("chatxii_debug") === "1") {
                return true;
            }
        } catch (e) { /* ignore */ }
        if (/(?:\?|&)debug=0(?:&|$)/.test(window.location.search)) {
            return false;
        }
        /* v0.x audit: enabled by default. Disable: localStorage.chatxii_debug = "0" */
        return true;
    }

    var enabled = isEnabled();

    function stamp() {
        return new Date().toISOString().substr(11, 12);
    }

    function log(category, message, detail) {
        if (!enabled) {
            return;
        }
        if (detail !== undefined) {
            console.log("[ChatXII " + stamp() + " " + category + "]", message, detail);
        } else {
            console.log("[ChatXII " + stamp() + " " + category + "]", message);
        }
    }

    return {
        enabled: enabled,
        log: log,
        requestSent: function (method, url) {
            log("REQUEST", method + " " + url);
        },
        responseReceived: function (method, url, status, preview) {
            log("RESPONSE", method + " " + url + " → " + status, preview);
        },
        requestFailed: function (method, url, err) {
            log("FAILED", method + " " + url, err && err.message ? err.message : err);
        },
        pollingStarted: function (name, intervalMs) {
            log("POLL", "started " + name + " every " + intervalMs + "ms");
        },
        pollingStopped: function (name) {
            log("POLL", "stopped " + name);
        },
        pollingTick: function (name) {
            log("POLL", "tick " + name);
        },
        pollingSkipped: function (name, reason) {
            log("POLL", "skipped " + name + ": " + reason);
        },
        domUpdated: function (component, detail) {
            log("DOM", component, detail);
        },
        init: function (message, detail) {
            log("INIT", message, detail);
        }
    };
})();
