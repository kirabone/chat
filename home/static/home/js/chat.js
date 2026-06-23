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
    var searchCache = null;

    var userCacheByProfile = {};
    var userCacheByAuth = {};

    /* Profile usernames of users I have blocked (from /relationship/blocks/) */
    var blockedByMe = {};

    var els = {};

    function initElements() {
        els.searchInput = document.getElementById("searchInput");
        els.searchResults = document.getElementById("searchResults");
        els.friendsList = document.getElementById("friendsList");
        els.requestsReceivedList = document.getElementById("requestsReceivedList");
        els.requestsSentList = document.getElementById("requestsSentList");
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

    function getCookie(name) {
        var value = "; " + document.cookie;
        var parts = value.split("; " + name + "=");
        if (parts.length === 2) {
            return parts.pop().split(";").shift();
        }
        return "";
    }

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

    function fetchJSON(url) {
        return fetch(url, { credentials: "same-origin" }).then(function (res) {
            return res.text().then(function (text) {
                if (!res.ok) {
                    throw new Error(text || ("Request failed: " + res.status));
                }
                return JSON.parse(text);
            });
        });
    }

    function fetchText(url, options) {
        options = options || {};
        options.credentials = "same-origin";
        return fetch(url, options).then(function (res) {
            return res.text().then(function (text) {
                return { ok: res.ok, status: res.status, text: text };
            });
        });
    }

    function statusLabel(status) {
        return STATUS_LABELS[status] || status;
    }

    function isValidStatus(status) {
        return VALID_STATUSES.indexOf(status) !== -1;
    }

    function actionUrl(action, profileUsername) {
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

    function cacheUser(profileUsername, authUsername, status) {
        var entry = userCacheByProfile[profileUsername];
        if (!entry) {
            entry = { profileUsername: profileUsername, authUsername: authUsername || null, status: status };
            userCacheByProfile[profileUsername] = entry;
        } else {
            entry.status = status;
            if (authUsername) {
                entry.authUsername = authUsername;
            }
        }
        if (entry.authUsername) {
            userCacheByAuth[entry.authUsername] = entry;
        }
        return entry;
    }

    function clearUserCache(profileUsername) {
        delete userCacheByProfile[profileUsername];
        Object.keys(userCacheByAuth).forEach(function (key) {
            if (userCacheByAuth[key].profileUsername === profileUsername) {
                delete userCacheByAuth[key];
            }
        });
    }

    function registerSearchResults(results) {
        results.forEach(function (item) {
            cacheUser(item.username, null, item.status);
        });
    }

    function isBlockedByMe(profileUsername) {
        return Boolean(blockedByMe[profileUsername]);
    }

    function resolveAuthUsername(authUsername, expectedStatus) {
        if (userCacheByAuth[authUsername]) {
            return Promise.resolve(userCacheByAuth[authUsername]);
        }

        return fetchJSON("/relationship/search/" + encodeURIComponent(authUsername) + "/")
            .then(function (results) {
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
                return cacheUser(match.username, authUsername, match.status);
            });
    }

    function fetchUserStatus(profileUsername) {
        return fetchJSON("/relationship/search/" + encodeURIComponent(profileUsername) + "/")
            .then(function (results) {
                registerSearchResults(results);
                var match = results.find(function (r) { return r.username === profileUsername; });
                if (!match && results.length > 0) {
                    match = results[0];
                }
                if (!match || !isValidStatus(match.status)) {
                    return null;
                }
                var cached = cacheUser(match.username, null, match.status);
                return {
                    profileUsername: cached.profileUsername,
                    authUsername: cached.authUsername,
                    status: match.status
                };
            });
    }

    function buildSearchUrl(query) {
        var trimmed = (query || "").trim();
        if (!trimmed) {
            return "/relationship/search/";
        }
        return "/relationship/search/" + encodeURIComponent(trimmed) + "/";
    }

    function isSearchVisible() {
        return !els.searchResults.classList.contains("hidden");
    }

    function refreshSearchIfVisible() {
        if (isSearchVisible()) {
            return searchUsers(els.searchInput.value);
        }
        return Promise.resolve();
    }

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

    function loadListFromAuthUsernames(container, authUsernames, expectedStatus, entityClass) {
        container.innerHTML = '<p class="loading-text">Loading...</p>';

        if (!authUsernames || authUsernames.length === 0) {
            renderList(container, [], entityClass);
            return Promise.resolve([]);
        }

        return Promise.all(
            authUsernames.map(function (authUsername) {
                return resolveAuthUsername(authUsername, expectedStatus);
            })
        ).then(function (resolved) {
            var users = resolved.filter(Boolean).map(function (user) {
                return {
                    profileUsername: user.profileUsername,
                    authUsername: user.authUsername,
                    status: expectedStatus
                };
            });
            renderList(container, users, entityClass);
            return users;
        }).catch(function () {
            container.innerHTML = '<p class="empty-text">Failed to load</p>';
            return [];
        });
    }

    function loadFriends() {
        return fetchJSON("/relationship/friends/")
            .then(function (authUsernames) {
                return loadListFromAuthUsernames(els.friendsList, authUsernames, "friend", "friendEntity");
            })
            .catch(function () {
                els.friendsList.innerHTML = '<p class="empty-text">Failed to load</p>';
            });
    }

    function loadBlockedUsers() {
        blockedByMe = {};
        return fetchJSON("/relationship/blocks/")
            .then(function (authUsernames) {
                return loadListFromAuthUsernames(els.blockedList, authUsernames, "blocked", "blockedUserEntity")
                    .then(function (users) {
                        users.forEach(function (user) {
                            blockedByMe[user.profileUsername] = true;
                        });
                    });
            })
            .catch(function () {
                els.blockedList.innerHTML = '<p class="empty-text">Failed to load</p>';
            });
    }

    function loadRequestsSent() {
        return fetchJSON("/relationship/requests/sent/")
            .then(function (authUsernames) {
                return loadListFromAuthUsernames(els.requestsSentList, authUsernames, "request_sent", "requestSentEntity");
            })
            .catch(function () {
                els.requestsSentList.innerHTML = '<p class="empty-text">Failed to load</p>';
            });
    }

    function loadRequestsReceived() {
        return fetchJSON("/relationship/requests/received/")
            .then(function (authUsernames) {
                return loadListFromAuthUsernames(els.requestsReceivedList, authUsernames, "request_received", "requestReceivedEntity");
            })
            .catch(function () {
                els.requestsReceivedList.innerHTML = '<p class="empty-text">Failed to load</p>';
            });
    }

    function refreshLists() {
        searchCache = null;
        return Promise.all([
            loadFriends(),
            loadBlockedUsers(),
            loadRequestsSent(),
            loadRequestsReceived()
        ]);
    }

    function makeButton(label, style, onClick) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn-sm" + (style === "primary" ? " btn-primary" : style === "danger" ? " btn-danger" : "");
        btn.textContent = label;
        btn.addEventListener("click", onClick);
        return btn;
    }

    /*
     * Returns action definitions valid for the given relationship state.
     * Each action: { label, style, action, type: 'api'|'openChat' }
     */
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
                relationshipAction(actionUrl(def.action, profileUsername), profileUsername);
            }));
        });
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

            cacheUser(item.username, null, item.status);

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

            var searchActions = getSearchActionsForState(item.status);
            renderActionButtons(actions, searchActions, item.username, item.status);

            row.appendChild(info);
            row.appendChild(actions);
            els.searchResults.appendChild(row);
        });

        els.searchResults.classList.remove("hidden");
    }

    function searchUsers(query) {
        var trimmed = (query || "").trim();

        if (!trimmed && searchCache) {
            renderSearchResults(searchCache);
            return Promise.resolve();
        }

        return fetchJSON(buildSearchUrl(trimmed))
            .then(function (results) {
                registerSearchResults(results);
                if (!trimmed) {
                    searchCache = results;
                }
                renderSearchResults(results);
            })
            .catch(function () {
                els.searchResults.innerHTML = '<p class="empty-text">Search failed</p>';
                els.searchResults.classList.remove("hidden");
            });
    }

    function hideMessageInput() {
        els.messageInputArea.classList.add("hidden");
    }

    function showMessageInput() {
        els.messageInputArea.classList.remove("hidden");
        els.messageInput.value = "";
        els.messageInput.focus();
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

    function loadMessages(user) {
        showChatError("");

        return fetch("/messanging/recv/" + encodeURIComponent(user.profileUsername) + "/", {
            credentials: "same-origin"
        }).then(function (res) {
            return res.text().then(function (text) {
                if (res.status === 404) {
                    throw new Error("User not found");
                }
                if (!res.ok) {
                    throw new Error(text || "Failed to load messages");
                }
                return JSON.parse(text);
            });
        }).then(function (messages) {
            els.messagesList.innerHTML = "";
            els.messagesArea.classList.toggle("has-messages", messages && messages.length > 0);

            if (!messages || messages.length === 0) {
                els.noChatSelected.classList.add("hidden");
                els.messagesList.innerHTML = '<p class="empty-chat">No messages yet</p>';
                return;
            }

            els.noChatSelected.classList.add("hidden");

            messages.forEach(function (msgObj) {
                var senderKey = Object.keys(msgObj)[0];
                var content = msgObj[senderKey];
                var bubble = document.createElement("div");
                bubble.className = senderKey === currentAuthUsername ? "myChatDiv" : "theirChatDiv";
                bubble.textContent = content;
                els.messagesList.appendChild(bubble);
            });

            els.messagesArea.scrollTop = els.messagesArea.scrollHeight;
        }).catch(function (err) {
            els.messagesList.innerHTML = "";
            els.messagesArea.classList.remove("has-messages");
            els.noChatSelected.classList.add("hidden");
            showChatError(err.message || "Failed to load messages");
        });
    }

    function selectUser(user) {
        if (!user || !user.profileUsername || !isValidStatus(user.status)) {
            return;
        }
        selectedUser = user;
        renderChatState(user);
        loadMessages(user);
    }

    function selectUserWithFreshState(profileUsername) {
        return fetchUserStatus(profileUsername).then(function (user) {
            if (user) {
                selectUser(user);
            } else {
                showChatError("Could not refresh user state");
            }
        });
    }

    function clearChat() {
        selectedUser = null;
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

    function isActionSuccess(text) {
        return text === "success" || text === "succss";
    }

    function afterRelationshipAction(profileUsername) {
        searchCache = null;
        clearUserCache(profileUsername);

        return refreshLists().then(function () {
            return refreshSearchIfVisible();
        }).then(function () {
            if (selectedUser && selectedUser.profileUsername === profileUsername) {
                return selectUserWithFreshState(profileUsername);
            }
        });
    }

    function relationshipAction(url, profileUsername) {
        showChatError("");

        return fetchText(url, { credentials: "same-origin" }).then(function (result) {
            if (result.ok && isActionSuccess(result.text)) {
                return afterRelationshipAction(profileUsername);
            }

            if (url.indexOf("/unblock/") !== -1) {
                showChatError("Unblock failed — you can only remove a block you placed");
            } else {
                showChatError("Action failed");
            }
        }).catch(function () {
            showChatError("Action failed");
        });
    }

    function sendMessage() {
        if (!selectedUser || selectedUser.status !== "friend") {
            return;
        }

        var content = els.messageInput.value.trim();
        if (!content) {
            return;
        }

        showChatError("");

        fetchText("/messanging/send/" + encodeURIComponent(selectedUser.profileUsername) + "/", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCookie("csrftoken")
            },
            body: JSON.stringify({ content: content })
        }).then(function (result) {
            if (result.status === 404) {
                showChatError("User not found");
                return;
            }
            if (result.ok && result.text === "success") {
                els.messageInput.value = "";
                loadMessages(selectedUser);
                return;
            }
            showChatError("Failed to send message");
        }).catch(function () {
            showChatError("Failed to send message");
        });
    }

    function changeUsername() {
        var newUsername = els.newUsernameInput.value.trim();
        if (!newUsername) {
            return;
        }

        fetchText("/profile/changeusername/" + encodeURIComponent(newUsername), {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "X-CSRFToken": getCookie("csrftoken")
            }
        }).then(function (result) {
            els.usernameMessage.classList.remove("hidden", "success", "error");

            if (result.ok && result.text === "success") {
                els.usernameMessage.textContent = "Username updated";
                els.usernameMessage.classList.add("success");
                els.currentUsername.textContent = newUsername;
                els.newUsernameInput.value = "";
                searchCache = null;
            } else if (result.status === 400 || result.text === "username taken") {
                els.usernameMessage.textContent = "Username taken";
                els.usernameMessage.classList.add("error");
            } else {
                els.usernameMessage.textContent = "Failed to change username";
                els.usernameMessage.classList.add("error");
            }
        }).catch(function () {
            els.usernameMessage.classList.remove("hidden");
            els.usernameMessage.textContent = "Failed to change username";
            els.usernameMessage.classList.add("error");
        });
    }

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

        var cached = userCacheByProfile[profileUsername];
        selectUser({
            profileUsername: profileUsername,
            authUsername: cached ? cached.authUsername : null,
            status: status
        });
    }

    function bindEvents() {
        els.searchInput.addEventListener("input", function () {
            searchUsers(els.searchInput.value);
        });

        els.searchInput.addEventListener("focus", function () {
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

    function init() {
        initElements();
        currentAuthUsername = els.currentUsername.dataset.authUsername || "";
        bindEvents();
        refreshLists();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
