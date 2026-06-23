/**
 * ChatXII API transport layer (v0.x)
 *
 * All HTTP communication with Django endpoints lives here.
 * In v1.0, add a WebSocket transport alongside these REST helpers;
 * UI code should consume RealtimeService, not call fetch directly.
 */
var ChatApi = (function () {
    "use strict";

    async function fetchJSON(url, method) {
        method = method || "GET";
        ChatDebug.requestSent(method, url);
        try {
            var res = await fetch(url, { credentials: "same-origin", method: method });
            var text = await res.text();
            ChatDebug.responseReceived(method, url, res.status, text.slice(0, 120));
            if (!res.ok) {
                throw new Error(text || ("Request failed: " + res.status));
            }
            return JSON.parse(text);
        } catch (err) {
            ChatDebug.requestFailed(method, url, err);
            throw err;
        }
    }

    async function fetchText(url, options) {
        options = options || {};
        options.credentials = "same-origin";
        var method = options.method || "GET";
        ChatDebug.requestSent(method, url);
        try {
            var res = await fetch(url, options);
            var text = await res.text();
            ChatDebug.responseReceived(method, url, res.status, text.slice(0, 120));
            return { ok: res.ok, status: res.status, text: text };
        } catch (err) {
            ChatDebug.requestFailed(method, url, err);
            throw err;
        }
    }

    function getCookie(name) {
        var value = "; " + document.cookie;
        var parts = value.split("; " + name + "=");
        if (parts.length === 2) {
            return parts.pop().split(";").shift();
        }
        return "";
    }

    return {
        fetchJSON: fetchJSON,
        fetchText: fetchText,
        getCookie: getCookie,

        fetchFriends: function () {
            return fetchJSON("/relationship/friends/");
        },
        fetchBlocks: function () {
            return fetchJSON("/relationship/blocks/");
        },
        fetchRequestsSent: function () {
            return fetchJSON("/relationship/requests/sent/");
        },
        fetchRequestsReceived: function () {
            return fetchJSON("/relationship/requests/received/");
        },

        searchUsers: function (query) {
            return fetchJSON("/relationship/search/" + encodeURIComponent(query) + "/");
        },

        fetchUserStatus: function (profileUsername) {
            return fetchJSON("/relationship/search/" + encodeURIComponent(profileUsername) + "/");
        },

        fetchMessages: async function (profileUsername) {
            var url = "/messanging/recv/" + encodeURIComponent(profileUsername) + "/";
            ChatDebug.requestSent("GET", url);
            try {
                var res = await fetch(url, { credentials: "same-origin" });
                var text = await res.text();
                ChatDebug.responseReceived("GET", url, res.status, text.slice(0, 120));
                if (res.status === 404) {
                    throw new Error("User not found");
                }
                if (!res.ok) {
                    throw new Error(text || "Failed to load messages");
                }
                return JSON.parse(text);
            } catch (err) {
                ChatDebug.requestFailed("GET", url, err);
                throw err;
            }
        },

        sendMessage: function (profileUsername, content) {
            return fetchText("/messanging/send/" + encodeURIComponent(profileUsername) + "/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCookie("csrftoken")
                },
                body: JSON.stringify({ content: content })
            });
        },

        relationshipAction: function (url) {
            return fetchText(url, { credentials: "same-origin" });
        },

        changeUsername: function (username) {
            return fetchText("/profile/changeusername/" + encodeURIComponent(username), {
                method: "POST",
                headers: {
                    "X-CSRFToken": getCookie("csrftoken")
                }
            });
        },

        actionUrl: function (action, profileUsername) {
            var p = encodeURIComponent(profileUsername);
            var urls = {
                unfriend: "/relationship/unfriend/" + p + "/",
                block: "/relationship/block/" + p + "/",
                unblock: "/relationship/unblock/" + p + "/",
                request: "/relationship/request/" + p + "/",
                cancel: "/relationship/request/cancel/" + p + "/",
                accept: "/relationship/request/accept/" + p + "/",
                reject: "/relationship/request/reject/" + p + "/"
            };
            return urls[action];
        }
    };
})();
