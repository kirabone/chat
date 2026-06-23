/**
 * ChatXII realtime transport (v0.x polling)
 *
 * v1.0 migration: replace PollingEngine internals with WebSocket
 * subscriptions while keeping RealtimeService method signatures stable.
 */
var RealtimeService = (function () {
    "use strict";

    var MESSAGE_INTERVAL_MS = 1000;
    var REQUESTS_INTERVAL_MS = 5000;
    var STATUS_INTERVAL_MS = 5000;
    var SCROLL_NEAR_BOTTOM_PX = 80;

    var handlers = {
        onMessages: null,
        onRequestsReceived: null,
        onRelationshipStatus: null,
        onPollError: null
    };

    var state = {
        pageVisible: !document.hidden,
        activeProfileUsername: null,
        activeStatus: null,
        globalTimer: null,
        messageTimer: null,
        statusTimer: null,
        inFlight: {
            messages: false,
            requests: false,
            status: false
        },
        lastMessagesKey: null,
        lastRequestsKey: null
    };

    function notifyError(context, err) {
        ChatDebug.requestFailed("POLL:" + context, context, err);
        if (handlers.onPollError) {
            handlers.onPollError(context, err);
        }
    }

    async function tickMessages() {
        if (!state.pageVisible) {
            ChatDebug.pollingSkipped("messages", "page hidden");
            return;
        }
        if (!state.activeProfileUsername) {
            ChatDebug.pollingSkipped("messages", "no active conversation");
            return;
        }
        if (state.inFlight.messages) {
            ChatDebug.pollingSkipped("messages", "previous request in flight");
            return;
        }

        ChatDebug.pollingTick("messages → " + state.activeProfileUsername);
        state.inFlight.messages = true;
        try {
            var messages = await ChatApi.fetchMessages(state.activeProfileUsername);
            var key = JSON.stringify(messages);
            if (key !== state.lastMessagesKey) {
                state.lastMessagesKey = key;
                ChatDebug.domUpdated("messages", messages.length + " message(s)");
                if (handlers.onMessages) {
                    handlers.onMessages(messages, { changed: true });
                }
            }
        } catch (err) {
            notifyError("messages", err);
        } finally {
            state.inFlight.messages = false;
        }
    }

    async function tickRequestsReceived() {
        if (!state.pageVisible) {
            ChatDebug.pollingSkipped("requests", "page hidden");
            return;
        }
        if (state.inFlight.requests) {
            ChatDebug.pollingSkipped("requests", "previous request in flight");
            return;
        }

        ChatDebug.pollingTick("requests/received");
        state.inFlight.requests = true;
        try {
            var authUsernames = await ChatApi.fetchRequestsReceived();
            var key = JSON.stringify(authUsernames.slice().sort());
            if (key !== state.lastRequestsKey) {
                state.lastRequestsKey = key;
                ChatDebug.domUpdated("requestsReceived", authUsernames.length + " request(s)");
                if (handlers.onRequestsReceived) {
                    handlers.onRequestsReceived(authUsernames, { changed: true });
                }
            } else if (handlers.onRequestsReceived) {
                handlers.onRequestsReceived(authUsernames, { changed: false });
            }
        } catch (err) {
            notifyError("requests", err);
        } finally {
            state.inFlight.requests = false;
        }
    }

    async function tickRelationshipStatus() {
        if (!state.pageVisible) {
            ChatDebug.pollingSkipped("status", "page hidden");
            return;
        }
        if (!state.activeProfileUsername) {
            ChatDebug.pollingSkipped("status", "no active conversation");
            return;
        }
        if (state.inFlight.status) {
            ChatDebug.pollingSkipped("status", "previous request in flight");
            return;
        }

        ChatDebug.pollingTick("status → " + state.activeProfileUsername);
        state.inFlight.status = true;
        try {
            var results = await ChatApi.fetchUserStatus(state.activeProfileUsername);
            var match = results.find(function (r) {
                return r.username === state.activeProfileUsername;
            });
            if (!match && results.length > 0) {
                match = results[0];
            }
            if (!match) {
                return;
            }

            var newStatus = match.status;
            var oldStatus = state.activeStatus;

            if (newStatus !== oldStatus) {
                state.activeStatus = newStatus;
                ChatDebug.domUpdated("relationshipStatus", oldStatus + " → " + newStatus);
                if (handlers.onRelationshipStatus) {
                    handlers.onRelationshipStatus({
                        profileUsername: state.activeProfileUsername,
                        oldStatus: oldStatus,
                        newStatus: newStatus,
                        changed: true
                    });
                }
            }
        } catch (err) {
            notifyError("status", err);
        } finally {
            state.inFlight.status = false;
        }
    }

    function clearConversationTimers() {
        if (state.messageTimer) {
            clearInterval(state.messageTimer);
            state.messageTimer = null;
            ChatDebug.pollingStopped("messages");
        }
        if (state.statusTimer) {
            clearInterval(state.statusTimer);
            state.statusTimer = null;
            ChatDebug.pollingStopped("status");
        }
    }

    function startConversationTimers() {
        clearConversationTimers();

        if (!state.pageVisible || !state.activeProfileUsername) {
            return;
        }

        tickMessages();
        tickRelationshipStatus();

        state.messageTimer = setInterval(tickMessages, MESSAGE_INTERVAL_MS);
        state.statusTimer = setInterval(tickRelationshipStatus, STATUS_INTERVAL_MS);
        ChatDebug.pollingStarted("messages", MESSAGE_INTERVAL_MS);
        ChatDebug.pollingStarted("status", STATUS_INTERVAL_MS);
    }

    function startGlobalTimer() {
        if (state.globalTimer) {
            return;
        }
        tickRequestsReceived();
        state.globalTimer = setInterval(tickRequestsReceived, REQUESTS_INTERVAL_MS);
        ChatDebug.pollingStarted("requests", REQUESTS_INTERVAL_MS);
    }

    function stopGlobalTimer() {
        if (state.globalTimer) {
            clearInterval(state.globalTimer);
            state.globalTimer = null;
            ChatDebug.pollingStopped("requests");
        }
    }

    function stopAll() {
        stopGlobalTimer();
        clearConversationTimers();
    }

    function resumeAll() {
        if (state.pageVisible) {
            startGlobalTimer();
            startConversationTimers();
        }
    }

    document.addEventListener("visibilitychange", function () {
        state.pageVisible = !document.hidden;
        ChatDebug.log("VISIBILITY", state.pageVisible ? "visible — resuming polls" : "hidden — stopping polls");
        if (state.pageVisible) {
            resumeAll();
        } else {
            stopAll();
        }
    });

    return {
        SCROLL_NEAR_BOTTOM_PX: SCROLL_NEAR_BOTTOM_PX,

        onMessages: function (fn) { handlers.onMessages = fn; },
        onRequestsReceived: function (fn) { handlers.onRequestsReceived = fn; },
        onRelationshipStatus: function (fn) { handlers.onRelationshipStatus = fn; },
        onPollError: function (fn) { handlers.onPollError = fn; },

        start: function () {
            ChatDebug.init("RealtimeService.start() called");
            startGlobalTimer();
        },

        setActiveConversation: function (profileUsername, status) {
            ChatDebug.init("Active conversation", { profileUsername: profileUsername, status: status });
            state.activeProfileUsername = profileUsername;
            state.activeStatus = status;
            state.lastMessagesKey = null;
            startConversationTimers();
        },

        clearActiveConversation: function () {
            ChatDebug.init("Conversation cleared");
            state.activeProfileUsername = null;
            state.activeStatus = null;
            state.lastMessagesKey = null;
            clearConversationTimers();
        },

        resetMessagesCache: function () {
            state.lastMessagesKey = null;
        },

        setMessagesCache: function (messages) {
            state.lastMessagesKey = JSON.stringify(messages);
        },

        resetRequestsCache: function () {
            state.lastRequestsKey = null;
        },

        forcePollMessages: function () {
            state.lastMessagesKey = null;
            return tickMessages();
        },

        forcePollRequests: function () {
            state.lastRequestsKey = null;
            return tickRequestsReceived();
        },

        forcePollStatus: function () {
            return tickRelationshipStatus();
        }
    };
})();
