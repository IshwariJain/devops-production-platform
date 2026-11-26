"use strict";

const $ = (id) => document.getElementById(id);

let tasks = [];
let notificationTimer;
let tasksAvailable = false;
let refreshing = false;
let mutating = false;
let healthChecking = false;

const statusLabels = {
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed"
};

async function apiRequest(path, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(path, {
            ...options,
            cache: "no-store",
            signal: controller.signal
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || `Request failed: HTTP ${response.status}`
            );
        }

        return data;

    } finally {
        clearTimeout(timeout);
    }
}

function notify(message, type = "success") {
    const notification = $("notification");

    clearTimeout(notificationTimer);

    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.hidden = false;

    notificationTimer = setTimeout(() => {
        notification.hidden = true;
    }, 5000);
}

function setHealth(id, label, state) {
    const element = $(id);

    element.textContent = label;
    element.className = `health-status ${state}`;
}

async function checkHealth() {
    if (healthChecking) return;

    healthChecking = true;

    try {
        await Promise.all([
            (async () => {
                try {
                    const data = await apiRequest("/health");

                    setHealth(
                        "app-health",
                        data.status === "UP" ? "Operational" : "Unavailable",
                        data.status === "UP" ? "up" : "down"
                    );

                } catch {
                    setHealth("app-health", "Unavailable", "down");
                }
            })(),

            (async () => {
                try {
                    const data = await apiRequest("/db-health");

                    setHealth(
                        "db-health",
                        data.database === "UP" ? "Connected" : "Unavailable",
                        data.database === "UP" ? "up" : "down"
                    );

                } catch {
                    setHealth("db-health", "Unavailable", "down");
                }
            })()
        ]);

    } finally {
        healthChecking = false;
    }
}

function updateCounters() {
    $("total-count").textContent = tasksAvailable ? tasks.length : "--";

    $("pending-count").textContent = tasksAvailable
        ? tasks.filter(task => task.status === "pending").length
        : "--";

    $("progress-count").textContent = tasksAvailable
        ? tasks.filter(task => task.status === "in_progress").length
        : "--";

    $("completed-count").textContent = tasksAvailable
        ? tasks.filter(task => task.status === "completed").length
        : "--";
}

function formatDate(value) {
    if (!value) return "Date unavailable";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? "Date unavailable"
        : date.toLocaleString();
}

function showEmptyState(message, isError = false) {
    const element = document.createElement("div");

    element.className = isError
        ? "empty-state error"
        : "empty-state";

    element.textContent = message;

    $("task-list").replaceChildren(element);
}

function createTaskCard(task) {
    const card = document.createElement("article");
    card.className = "task-card";

    const content = document.createElement("div");
    content.className = "task-content";

    const title = document.createElement("h3");
    title.className = "task-title";
    title.textContent = task.title;

    const description = document.createElement("p");
    description.className = "task-description";
    description.textContent = task.description || "No description provided.";

    const meta = document.createElement("div");
    meta.className = "task-meta";

    const status = document.createElement("span");

    const validStatus = Object.hasOwn(statusLabels, task.status)
        ? task.status
        : "unknown";

    status.className = `status-badge ${validStatus}`;
    status.textContent = statusLabels[validStatus] || "Unknown";

    const taskId = document.createElement("span");
    taskId.textContent = `#${task.id}`;

    const createdAt = document.createElement("span");
    createdAt.textContent = formatDate(task.created_at);

    meta.append(status, taskId, createdAt);
    content.append(title, description, meta);

    const deleteButton = document.createElement("button");

    deleteButton.className = "delete-btn";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.disabled = refreshing || mutating;

    deleteButton.setAttribute(
        "aria-label",
        `Delete task ${task.id}`
    );

    deleteButton.addEventListener("click", () => {
        deleteTask(task.id, task.title);
    });

    card.append(content, deleteButton);

    return card;
}

function renderTasks() {
    if (!tasksAvailable) {
        showEmptyState(
            "Task data unavailable. Refresh the dashboard to retry.",
            true
        );
        return;
    }

    const search = $("task-search").value.trim().toLowerCase();
    const filter = $("status-filter").value;

    const filteredTasks = tasks.filter(task => {
        const searchableText =
            `${task.title} ${task.description || ""}`.toLowerCase();

        const matchesSearch = searchableText.includes(search);

        const matchesStatus =
            filter === "all" || task.status === filter;

        return matchesSearch && matchesStatus;
    });

    if (filteredTasks.length === 0) {
        showEmptyState(
            tasks.length === 0
                ? "No tasks yet. Create your first task."
                : "No tasks match your search or filter."
        );
        return;
    }

    const fragment = document.createDocumentFragment();

    [...filteredTasks].reverse().forEach(task => {
        fragment.appendChild(createTaskCard(task));
    });

    $("task-list").replaceChildren(fragment);
}

async function loadTasks() {
    try {
        const data = await apiRequest("/tasks");

        if (!Array.isArray(data)) {
            throw new Error("Invalid task response");
        }

        tasks = data;
        tasksAvailable = true;

        updateCounters();
        renderTasks();

        $("last-updated").textContent =
            `Tasks refreshed: ${new Date().toLocaleTimeString()}`;

        return true;

    } catch {
        tasks = [];
        tasksAvailable = false;

        updateCounters();
        renderTasks();

        $("last-updated").textContent = "Task refresh failed";

        return false;
    }
}

function updateControls() {
    const busy = refreshing || mutating;

    $("create-btn").disabled = busy;
    $("refresh-btn").disabled = busy;

    document.querySelectorAll(".delete-btn").forEach(button => {
        button.disabled = busy;
    });
}

async function createTask(event) {
    event.preventDefault();

    if (refreshing || mutating) return;

    const title = $("task-title").value.trim();

    if (!title || title.length > 200) {
        notify("Task title must contain 1-200 characters.", "error");
        return;
    }

    const payload = {
        title,
        description: $("task-description").value.trim(),
        status: $("task-status").value
    };

    mutating = true;
    updateControls();

    $("create-btn").textContent = "Creating...";

    try {
        await apiRequest("/tasks", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        $("task-form").reset();
        $("task-search").value = "";
        $("status-filter").value = "all";

        const loaded = await loadTasks();

        notify(
            loaded
                ? "Task created successfully."
                : "Task created, but dashboard refresh failed.",
            loaded ? "success" : "error"
        );

    } catch (error) {
        notify(
            `Creation not confirmed: ${error.message}. Refresh before retrying.`,
            "error"
        );

    } finally {
        mutating = false;
        $("create-btn").textContent = "+ Create Task";
        updateControls();
    }
}

async function deleteTask(id, title) {
    if (refreshing || mutating) return;

    if (!window.confirm(`Delete task "${title}"?`)) {
        return;
    }

    mutating = true;
    updateControls();

    try {
        await apiRequest(`/tasks/${encodeURIComponent(id)}`, {
            method: "DELETE"
        });

        const loaded = await loadTasks();

        notify(
            loaded
                ? "Task deleted successfully."
                : "Task deleted, but dashboard refresh failed.",
            loaded ? "success" : "error"
        );

    } catch (error) {
        notify(
            `Deletion not confirmed: ${error.message}. Refresh before retrying.`,
            "error"
        );

    } finally {
        mutating = false;
        updateControls();
    }
}

async function refreshDashboard(showNotification = false) {
    if (refreshing || mutating) return;

    refreshing = true;
    updateControls();

    $("refresh-btn").textContent = "Refreshing...";

    try {
        const [, loaded] = await Promise.all([
            checkHealth(),
            loadTasks()
        ]);

        if (showNotification) {
            notify(
                loaded
                    ? "Dashboard refreshed."
                    : "Unable to refresh task data.",
                loaded ? "success" : "error"
            );
        }

    } finally {
        refreshing = false;
        $("refresh-btn").textContent = "↻ Refresh Dashboard";
        updateControls();
    }
}

$("task-form").addEventListener("submit", createTask);

$("task-search").addEventListener("input", renderTasks);

$("status-filter").addEventListener("change", renderTasks);

$("refresh-btn").addEventListener("click", () => {
    refreshDashboard(true);
});

refreshDashboard();

setInterval(checkHealth, 30000);
