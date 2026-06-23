(function () {
    "use strict";

    var STATUS_LABELS = {
        friend: "Friend",
        blocked: "Blocked",
        request_sent: "Request sent",
        request_received: "Request received",
        none: "Not connected"
    };

    var VALID_STATUSES = ["friend", "blocked", "request_sent", "request_received", "none"];

    var selectedUser = null;
    var currentAuthUsername = "";

    var searchDebounceTimer = null;
    var searchRequestId = 0;
    var SEARCH_DEBOUNCE_MS = 275;

    var blockedByMe = {};
    var els = {};

    /* ── DOM init ───────────────────────────────────────────── */

    function initElements() {
        els.searchInput = document.getElementById("searchInput");
        els.searchResults = document.getElementById("searchResults");
        els.friendsList = document.getElementById("friendsList");
        els.requestsReceivedList = document.getElementById("requestsReceivedList");
        els.requestsSentList = document.getElementById("requestsSentList");
        els.requestsReceivedBadge = document.getElementById("requestsReceivedBadge");
        els.blockedList = document.getElementById("blockedList");
        els.chatHeader = document.getElementById("chatHeader");
        els.chatHeaderActions = document.getElementById("chatHeaderActions");
        els.chatHeaderNotice = document.getElementById("chatHeaderNotice");
        els.messagesArea = document.getElementById("messagesArea");
        els.messagesList = document.getElementById("messagesList");
        els.noChatSelected = document.getElementById("noChatSelected");
        els.messageInputArea = document.getElementById("messageInputArea");
        els.messageInput = document.getElementById("messageInput");
        els.sendBtn = document.getElementById("sendBtn");
        els.chatError = document.getElementById("chatError");
        els.currentUsername = document.getElementById("currentUsername");
        els.usernameForm = document.getElementById("usernameForm");
        els.newUsernameInput = document.getElementById("newUsernameInput");
        els.usernameMessage = document.getElementById("usernameMessage");
        els.peoplePanel = document.getElementById("peoplePanel");
    }

    function escapeHtml(text) {
        var div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    function statusLabel(status) {
        return STATUS_LABELS[status] || status;
    }

    function isValidStatus(status) {
        return VALID_STATUSES.indexOf(status) !== -1;
    }

    function isBlockedByMe(profileUsername) {
        return Boolean(blockedByMe[profileUsername]);
    }

    function isActionSuccess(text) {
        return text === "success" || text === "succss";
    }

    /* ── UI feedback ────────────────────────────────────────── */

    function showChatError(message) {
        if (!message) {
            els.chatError.classList.add("hidden");
            els.chatError.textContent = "";
            return;
        }
        els.chatError.textContent = message;
        els.chatError.classList.remove("hidden");
    }

    function showHeaderNotice(message) {
        if (!message) {
            els.chatHeaderNotice.classList.add("hidden");
            els.chatHeaderNotice.textContent = "";
            return;
        }
        els.chatHeaderNotice.textContent = message;
        els.chatHeaderNotice.classList.remove("hidden");
    }

    function updateRequestsReceivedBadge(count) {
        if (!els.requestsReceivedBadge) {
            return;
        }
        if (count > 0) {
            els.requestsReceivedBadge.textContent = String(count);
            els.requestsReceivedBadge.classList.remove("hidden");
        } else {
            els.requestsReceivedBadge.classList.add("hidden");
        }
    }

    /* ── User resolution (list endpoints return User.username) ─ */

    async function resolveAuthUsername(authUsername, expectedStatus) {
        try {
            var results = await ChatApi.searchUsers(authUsername);
            var match = results.find(function (r) { return r.status === expectedStatus; });
            if (!match && results.length === 1) {
                match = results[0];
            }
            if (!match && results.length > 0) {
                match = results[0];
            }
            if (!match) {
                return null;
            }
            return {
                profileUsername: match.username,
                authUsername: authUsername,
                status: match.status
            };
        } catch (err) {
            return null;
        }
    }

    async function fetchUserStatus(profileUsername) {
        try {
            var results = await ChatApi.fetchUserStatus(profileUsername);
            var match = results.find(function (r) { return r.username === profileUsername; });
            if (!match && results.length > 0) {
                match = results[0];
            }
            if (!match || !isValidStatus(match.status)) {
                return null;
            }
            return {
                profileUsername: match.username,
                authUsername: null,
                status: match.status
            };
        } catch (err) {
            return null;
        }
    }

    /* ── Search (input only, never polled) ──────────────────── */

    function hideSearchResults() {
        searchRequestId += 1;
        els.searchResults.innerHTML = "";
        els.searchResults.classList.add("hidden");
    }

    function isSearchVisible() {
        return !els.searchResults.classList.contains("hidden");
    }

    async function refreshSearchIfVisible() {
        var trimmed = (els.searchInput.value || "").trim();
        if (isSearchVisible() && trimmed) {
            await performSearch(trimmed);
        }
    }

    function searchUsers(query) {
        var trimmed = (query || "").trim();
        clearTimeout(searchDebounceTimer);

        if (!trimmed) {
            hideSearchResults();
            return;
        }

        searchDebounceTimer = setTimeout(function () {
            performSearch(trimmed);
        }, SEARCH_DEBOUNCE_MS);
    }

    async function performSearch(trimmed) {
        var requestId = ++searchRequestId;
        els.searchResults.innerHTML = "";
        els.searchResults.classList.remove("hidden");

        try {
            var results = await ChatApi.searchUsers(trimmed);
            if (requestId !== searchRequestId) {
                return;
            }
            renderSearchResults(results);
        } catch (err) {
            if (requestId !== searchRequestId) {
                return;
            }
            els.searchResults.innerHTML = '<p class="empty-text">Search failed</p>';
            els.searchResults.classList.remove("hidden");
        }
    }

    function renderSearchResults(results) {
        els.searchResults.innerHTML = "";

        if (!results || results.length === 0) {
            els.searchResults.innerHTML = '<p class="empty-text">No users found</p>';
            els.searchResults.classList.remove("hidden");
            return;
        }

        results.forEach(function (item) {
            if (!isValidStatus(item.status)) {
                return;
            }

            var row = document.createElement("div");
            row.className = "search-result-item";

            var info = document.createElement("div");
            info.className = "search-result-info";
            info.innerHTML =
                '<div class="user-card-name">' + escapeHtml(item.username) + "</div>" +
                '<span class="status-badge status-' + escapeHtml(item.status) + '">' +
                escapeHtml(statusLabel(item.status)) + "</span>";

            var actions = document.createElement("div");
            actions.className = "search-result-actions";
            renderActionButtons(actions, getSearchActionsForState(item.status), item.username, item.status);

            row.appendChild(info);
            row.appendChild(actions);
            els.searchResults.appendChild(row);
        });

        els.searchResults.classList.remove("hidden");
    }

    /* ── People lists (refreshed on actions + request poll) ─── */

    function setActiveCard(profileUsername) {
        document.querySelectorAll(".user-card").forEach(function (card) {
            card.classList.toggle("active", card.dataset.profileUsername === profileUsername);
        });
    }

    function createUserCard(user, entityClass) {
        var card = document.createElement("button");
        card.type = "button";
        card.className = "user-card " + entityClass;
        card.dataset.profileUsername = user.profileUsername;
        card.dataset.status = user.status;
        card.innerHTML =
            '<div class="user-card-name">' + escapeHtml(user.profileUsername) + "</div>" +
            '<div class="user-card-status">' + escapeHtml(statusLabel(user.status)) + "</div>";
        return card;
    }

    function renderList(container, users, entityClass, emptyText) {
        container.innerHTML = "";
        if (!users || users.length === 0) {
            container.innerHTML = '<p class="empty-text">' + escapeHtml(emptyText || "None") + "</p>";
            return;
        }
        users.forEach(function (user) {
            container.appendChild(createUserCard(user, entityClass));
        });
    }

    async function loadListFromAuthUsernames(container, authUsernames, expectedStatus, entityClass) {
        if (!authUsernames || authUsernames.length === 0) {
            renderList(container, [], entityClass);
            return [];
        }

        var resolved = await Promise.all(
            authUsernames.map(function (authUsername) {
                return resolveAuthUsername(authUsername, expectedStatus);
            })
        );

        var users = resolved.filter(Boolean).map(function (user) {
            return {
                profileUsername: user.profileUsername,
                authUsername: user.authUsername,
                status: expectedStatus
            };
        });

        renderList(container, users, entityClass);
        return users;
    }

    async function loadFriends() {
        try {
            var authUsernames = await ChatApi.fetchFriends();
            await loadListFromAuthUsernames(els.friendsList, authUsernames, "friend", "friendEntity");
        } catch (err) {
            els.friendsList.innerHTML = '<p class="empty-text">Failed to load</p>';
        }
    }

    async function loadBlockedUsers() {
        blockedByMe = {};
        try {
            var authUsernames = await ChatApi.fetchBlocks();
            var users = await loadListFromAuthUsernames(els.blockedList, authUsernames, "blocked", "blockedUserEntity");
            users.forEach(function (user) {
                blockedByMe[user.profileUsername] = true;
            });
        } catch (err) {
            els.blockedList.innerHTML = '<p class="empty-text">Failed to load</p>';
        }
    }

    async function loadRequestsSent() {
        try {
            var authUsernames = await ChatApi.fetchRequestsSent();
            await loadListFromAuthUsernames(els.requestsSentList, authUsernames, "request_sent", "requestSentEntity");
        } catch (err) {
            els.requestsSentList.innerHTML = '<p class="empty-text">Failed to load</p>';
        }
    }

    async function loadRequestsReceived() {
        try {
            var authUsernames = await ChatApi.fetchRequestsReceived();
            updateRequestsReceivedBadge(authUsernames.length);
            await loadListFromAuthUsernames(els.requestsReceivedList, authUsernames, "request_received", "requestReceivedEntity");
        } catch (err) {
            els.requestsReceivedList.innerHTML = '<p class="empty-text">Failed to load</p>';
        }
    }

    /** Refresh lists after explicit user actions (not used for friends polling). */
    async function refreshListsAfterAction(options) {
        options = options || {};
        var tasks = [];

        if (options.friends !== false) {
            tasks.push(loadFriends());
        }
        if (options.blocked !== false) {
            tasks.push(loadBlockedUsers());
        }
        if (options.requestsSent !== false) {
            tasks.push(loadRequestsSent());
        }
        if (options.requestsReceived !== false) {
            tasks.push(loadRequestsReceived());
        }

        await Promise.all(tasks);
    }

    async function refreshListsInitial() {
        els.friendsList.innerHTML = '<p class="loading-text">Loading...</p>';
        els.requestsReceivedList.innerHTML = '<p class="loading-text">Loading...</p>';
        els.requestsSentList.innerHTML = '<p class="loading-text">Loading...</p>';
        els.blockedList.innerHTML = '<p class="loading-text">Loading...</p>';
        await refreshListsAfterAction();
    }

    /* ── Relationship actions & state rendering ─────────────── */

    function makeButton(label, style, onClick) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn-sm" + (style === "primary" ? " btn-primary" : style === "danger" ? " btn-danger" : "");
        btn.textContent = label;
        btn.addEventListener("click", onClick);
        return btn;
    }

    function getActionsForState(status, profileUsername) {
        var actions = [];

        if (status === "friend") {
            actions.push({ label: "Unfriend", style: "danger", action: "unfriend", type: "api" });
            actions.push({ label: "Block", style: "danger", action: "block", type: "api" });
        } else if (status === "request_received") {
            actions.push({ label: "Accept Request", style: "primary", action: "accept", type: "api" });
            actions.push({ label: "Reject", style: "danger", action: "reject", type: "api" });
            actions.push({ label: "Block", style: "danger", action: "block", type: "api" });
        } else if (status === "request_sent") {
            actions.push({ label: "Cancel Request", style: "danger", action: "cancel", type: "api" });
            actions.push({ label: "Block", style: "danger", action: "block", type: "api" });
        } else if (status === "none") {
            actions.push({ label: "Send Friend Request", style: "primary", action: "request", type: "api" });
            actions.push({ label: "Block", style: "danger", action: "block", type: "api" });
        } else if (status === "blocked") {
            if (isBlockedByMe(profileUsername)) {
                actions.push({ label: "Unblock", style: "primary", action: "unblock", type: "api" });
            }
        }

        return actions;
    }

    function getSearchActionsForState(status) {
        if (status === "friend" || status === "blocked") {
            return [{ label: "Open Chat", style: "primary", type: "openChat" }];
        }
        return getActionsForState(status, "");
    }

    function renderActionButtons(container, actions, profileUsername, context) {
        container.innerHTML = "";
        actions.forEach(function (def) {
            if (def.type === "openChat") {
                container.appendChild(makeButton(def.label, def.style, function () {
                    selectUser({ profileUsername: profileUsername, authUsername: null, status: context });
                }));
                return;
            }
            container.appendChild(makeButton(def.label, def.style, function () {
                relationshipAction(ChatApi.actionUrl(def.action, profileUsername), profileUsername);
            }));
        });
    }

    function hideMessageInput() {
        els.messageInputArea.classList.add("hidden");
    }

    function showMessageInput() {
        els.messageInputArea.classList.remove("hidden");
    }

    function hideHeaderActions() {
        els.chatHeaderActions.classList.add("hidden");
        els.chatHeaderActions.innerHTML = "";
    }

    function renderChatState(user) {
        els.chatHeader.textContent = user.profileUsername;
        setActiveCard(user.profileUsername);
        showHeaderNotice("");
        showChatError("");

        var actions = getActionsForState(user.status, user.profileUsername);

        if (user.status === "friend") {
            showMessageInput();
            hideHeaderActions();
            if (actions.length > 0) {
                els.chatHeaderActions.classList.remove("hidden");
                renderActionButtons(els.chatHeaderActions, actions, user.profileUsername, user.status);
            }
        } else {
            hideMessageInput();
            hideHeaderActions();

            if (user.status === "blocked") {
                showHeaderNotice("Messaging unavailable because one of you has blocked the other.");
            }

            if (actions.length > 0) {
                els.chatHeaderActions.classList.remove("hidden");
                renderActionButtons(els.chatHeaderActions, actions, user.profileUsername, user.status);
            }
        }
    }

    /* ── Messages (DOM updates separated from fetch) ────────── */

    function isNearBottom(container) {
        var distance = container.scrollHeight - container.scrollTop - container.clientHeight;
        return distance <= RealtimeService.SCROLL_NEAR_BOTTOM_PX;
    }

    function renderMessages(messages, options) {
        options = options || {};
        var forceScroll = Boolean(options.forceScroll);
        var wasNearBottom = isNearBottom(els.messagesArea);

        els.messagesArea.classList.toggle("has-messages", messages && messages.length > 0);

        if (!messages || messages.length === 0) {
            els.noChatSelected.classList.add("hidden");
            els.messagesList.innerHTML = '<p class="empty-chat">No messages yet</p>';
            ChatDebug.domUpdated("messagesList", "empty");
            return;
        }

        els.noChatSelected.classList.add("hidden");
        els.messagesList.innerHTML = "";

        messages.forEach(function (msgObj) {
            var senderKey = Object.keys(msgObj)[0];
            var content = msgObj[senderKey];
            var bubble = document.createElement("div");
            bubble.className = senderKey === currentAuthUsername ? "myChatDiv" : "theirChatDiv";
            bubble.textContent = content;
            els.messagesList.appendChild(bubble);
        });

        if (forceScroll || wasNearBottom) {
            els.messagesArea.scrollTop = els.messagesArea.scrollHeight;
        }
        ChatDebug.domUpdated("messagesList", messages.length + " bubble(s)");
    }

    async function loadMessages(user, options) {
        options = options || {};
        showChatError("");

        try {
            var messages = await ChatApi.fetchMessages(user.profileUsername);
            renderMessages(messages, { forceScroll: options.forceScroll !== false });
            RealtimeService.setMessagesCache(messages);
        } catch (err) {
            els.messagesList.innerHTML = "";
            els.messagesArea.classList.remove("has-messages");
            els.noChatSelected.classList.add("hidden");
            showChatError(err.message || "Failed to load messages");
        }
    }

    /* ── Conversation selection ───────────────────────────────── */

    async function selectUser(user) {
        if (!user || !user.profileUsername || !isValidStatus(user.status)) {
            return;
        }

        selectedUser = user;
        RealtimeService.setActiveConversation(user.profileUsername, user.status);
        renderChatState(user);
        await loadMessages(user, { forceScroll: true });
    }

    async function selectUserWithFreshState(profileUsername) {
        var user = await fetchUserStatus(profileUsername);
        if (user) {
            await selectUser(user);
        } else {
            showChatError("Could not refresh user state");
        }
    }

    function clearChat() {
        selectedUser = null;
        RealtimeService.clearActiveConversation();
        els.chatHeader.textContent = "";
        els.messagesList.innerHTML = "";
        els.messagesArea.classList.remove("has-messages");
        els.noChatSelected.classList.remove("hidden");
        hideMessageInput();
        hideHeaderActions();
        showHeaderNotice("");
        showChatError("");
        setActiveCard("");
    }

    /* ── Relationship action handlers ─────────────────────────── */

    async function afterRelationshipAction(profileUsername) {
        await refreshListsAfterAction();
        await refreshSearchIfVisible();
        RealtimeService.resetRequestsCache();

        if (selectedUser && selectedUser.profileUsername === profileUsername) {
            await selectUserWithFreshState(profileUsername);
        }
    }

    async function relationshipAction(url, profileUsername) {
        showChatError("");

        try {
            var result = await ChatApi.relationshipAction(url);
            if (result.ok && isActionSuccess(result.text)) {
                await afterRelationshipAction(profileUsername);
                return;
            }

            if (url.indexOf("/unblock/") !== -1) {
                showChatError("Unblock failed — you can only remove a block you placed");
            } else {
                showChatError("Action failed");
            }
        } catch (err) {
            showChatError("Action failed");
        }
    }

    async function sendMessage() {
        if (!selectedUser || selectedUser.status !== "friend") {
            return;
        }

        var content = els.messageInput.value.trim();
        if (!content) {
            return;
        }

        showChatError("");

        try {
            var result = await ChatApi.sendMessage(selectedUser.profileUsername, content);
            if (result.status === 404) {
                showChatError("User not found");
                return;
            }
            if (result.ok && result.text === "success") {
                els.messageInput.value = "";
                var messages = await ChatApi.fetchMessages(selectedUser.profileUsername);
                RealtimeService.setMessagesCache(messages);
                renderMessages(messages, { forceScroll: true });
                return;
            }
            showChatError("Failed to send message");
        } catch (err) {
            showChatError("Failed to send message");
        }
    }

    async function changeUsername() {
        var newUsername = els.newUsernameInput.value.trim();
        if (!newUsername) {
            return;
        }

        try {
            var result = await ChatApi.changeUsername(newUsername);
            els.usernameMessage.classList.remove("hidden", "success", "error");

            if (result.ok && result.text === "success") {
                els.usernameMessage.textContent = "Username updated";
                els.usernameMessage.classList.add("success");
                els.currentUsername.textContent = newUsername;
                els.newUsernameInput.value = "";
            } else if (result.status === 400 || result.text === "username taken") {
                els.usernameMessage.textContent = "Username taken";
                els.usernameMessage.classList.add("error");
            } else {
                els.usernameMessage.textContent = "Failed to change username";
                els.usernameMessage.classList.add("error");
            }
        } catch (err) {
            els.usernameMessage.classList.remove("hidden");
            els.usernameMessage.textContent = "Failed to change username";
            els.usernameMessage.classList.add("error");
        }
    }

    /* ── Realtime handlers (v0 polling → v1 WebSocket swap here) ─ */

    function handlePolledMessages(messages) {
        if (!selectedUser) {
            return;
        }
        renderMessages(messages, { forceScroll: false });
    }

    async function handlePolledRequestsReceived(authUsernames, meta) {
        updateRequestsReceivedBadge(authUsernames.length);
        if (meta.changed) {
            await loadListFromAuthUsernames(
                els.requestsReceivedList,
                authUsernames,
                "request_received",
                "requestReceivedEntity"
            );
        }
    }

    async function handleRelationshipStatusChange(event) {
        if (!selectedUser || selectedUser.profileUsername !== event.profileUsername) {
            return;
        }

        var oldStatus = event.oldStatus;
        var newStatus = event.newStatus;

        selectedUser.status = newStatus;
        RealtimeService.setActiveConversation(event.profileUsername, newStatus);
        renderChatState(selectedUser);

        if (newStatus === "friend" || oldStatus === "friend") {
            await loadFriends();
        }
        if (newStatus === "blocked" || oldStatus === "blocked") {
            await loadBlockedUsers();
        }
        if (newStatus === "request_sent" || oldStatus === "request_sent") {
            await loadRequestsSent();
        }
        if (newStatus === "request_received" || oldStatus === "request_received") {
            await loadRequestsReceived();
        }

        await refreshSearchIfVisible();
    }

    function handlePollError(context, err) {
        ChatDebug.requestFailed("POLL-HANDLER:" + context, context, err);
    }

    function verifyDependencies() {
        var missing = [];
        if (typeof ChatDebug === "undefined") {
            missing.push("ChatDebug (debug.js)");
        }
        if (typeof ChatApi === "undefined") {
            missing.push("ChatApi (api.js)");
        }
        if (typeof RealtimeService === "undefined") {
            missing.push("RealtimeService (polling.js)");
        }
        if (missing.length) {
            throw new Error("Missing scripts: " + missing.join(", "));
        }
    }

    /* ── Events ───────────────────────────────────────────────── */

    function handlePeoplePanelClick(event) {
        var card = event.target.closest(".user-card");
        if (!card || !els.peoplePanel.contains(card)) {
            return;
        }

        var profileUsername = card.dataset.profileUsername;
        var status = card.dataset.status;

        if (!profileUsername || !isValidStatus(status)) {
            return;
        }

        selectUser({
            profileUsername: profileUsername,
            authUsername: null,
            status: status
        });
    }

    function bindEvents() {
        els.searchInput.addEventListener("input", function () {
            searchUsers(els.searchInput.value);
        });

        els.sendBtn.addEventListener("click", sendMessage);

        els.messageInput.addEventListener("keydown", function (e) {
            if (e.key === "Enter") {
                sendMessage();
            }
        });

        els.usernameForm.addEventListener("submit", function (e) {
            e.preventDefault();
            changeUsername();
        });

        els.peoplePanel.addEventListener("click", handlePeoplePanelClick);
    }

    function initRealtime() {
        RealtimeService.onMessages(handlePolledMessages);
        RealtimeService.onRequestsReceived(handlePolledRequestsReceived);
        RealtimeService.onRelationshipStatus(handleRelationshipStatusChange);
        RealtimeService.onPollError(handlePollError);
        RealtimeService.start();
    }

    async function init() {
        try {
            verifyDependencies();
            ChatDebug.init("chat.js init() starting", {
                readyState: document.readyState,
                debug: ChatDebug.enabled
            });

            initElements();
            currentAuthUsername = els.currentUsername.dataset.authUsername || "";
            ChatDebug.init("DOM elements bound", { authUsername: currentAuthUsername });

            bindEvents();
            initRealtime();
            await refreshListsInitial();

            ChatDebug.init("chat.js init() complete — polling active");
        } catch (err) {
            console.error("[ChatXII FATAL]", err);
            if (typeof ChatDebug !== "undefined") {
                ChatDebug.requestFailed("INIT", "startup", err);
            }
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
