const API_URL = "http://localhost:8000";
let isLoginMode = true;

// --- AUTHENTICATION ---

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const roleGroup = document.getElementById('role-group');
    const authBtn = document.getElementById('auth-btn');
    const toggleLink = document.getElementById('toggle-link');
    const errorMsg = document.getElementById('login-error');

    errorMsg.innerText = "";

    if (isLoginMode) {
        title.innerText = "AI Task System";
        subtitle.innerText = "Please sign in to continue";
        roleGroup.style.display = "none";
        authBtn.innerText = "Sign In";
        toggleLink.innerText = "Register here";
    } else {
        title.innerText = "Create Account";
        subtitle.innerText = "Fill in the details to join";
        roleGroup.style.display = "block";
        authBtn.innerText = "Register";
        toggleLink.innerText = "Login here";
    }
}

async function handleAuth() {
    isLoginMode ? await login() : await register();
}

async function register() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const role = document.getElementById('role-id').value;
    const loader = document.getElementById('loader');
    const authBtn = document.getElementById('auth-btn');

    if (!user || !pass) {
        document.getElementById('login-error').innerText = "Fields cannot be empty.";
        return;
    }

    loader.style.display = "block";
    authBtn.disabled = true;

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: user,
                password: pass,
                role_id: parseInt(role)
            })
        });

        if (response.ok) {
            alert("Registration successful! You can now login.");
            toggleAuthMode();
        } else {
            const data = await response.json();
            document.getElementById('login-error').innerText = data.detail || "Registration failed.";
        }
    } catch (err) {
        document.getElementById('login-error').innerText = "Could not connect to server.";
    } finally {
        loader.style.display = "none";
        authBtn.disabled = false;
    }
}

async function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const loader = document.getElementById('loader');
    const authBtn = document.getElementById('auth-btn');

    loader.style.display = "block";
    if (authBtn) authBtn.disabled = true;

    const formData = new URLSearchParams();
    formData.append('username', user);
    formData.append('password', pass);

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            body: formData,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('username', user);
            // Store role_id from backend for secure RBAC 
            localStorage.setItem('role_id', data.role_id);
            showDashboard();
        } else {
            document.getElementById('login-error').innerText = "Invalid credentials.";
        }
    } catch (err) {
        document.getElementById('login-error').innerText = "Error: Backend server is not running!";
    } finally {
        loader.style.display = "none";
        if (authBtn) authBtn.disabled = false;
    }
}

// --- DASHBOARD HELPERS ---

function showDashboard() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    document.getElementById('welcome-user').innerText = `Hello, ${localStorage.getItem('username')}`;

    checkAdmin();
    loadTasks();
}

function checkAdmin() {
    const roleId = parseInt(localStorage.getItem('role_id'));
    const adminPanel = document.getElementById('admin-panel');
    const userTabs = document.querySelector('.tabs');
    const searchTab = document.getElementById('search-tab');
    const tasksTab = document.getElementById('tasks-tab');

    if (roleId === 1) { // Role 1 = Admin 
        adminPanel.style.display = 'block';
        if (userTabs) userTabs.style.display = 'none';
        if (searchTab) searchTab.style.display = 'none';
        if (tasksTab) tasksTab.style.display = 'none';
        loadAnalytics(); // [cite: 32]
    } else {
        adminPanel.style.display = 'none';
        if (userTabs) userTabs.style.display = 'flex';
        showTab('search');
    }
}

// --- ANALYTICS --- 

async function loadAnalytics() {
    const token = localStorage.getItem('token');
    const msgArea = document.getElementById('admin-msg');

    try {
        const response = await fetch(`${API_URL}/analytics`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const stats = await response.json();

        msgArea.innerHTML = `
            <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                <div style="background: #334155; padding: 10px; border-radius: 5px; flex: 1; text-align: center;">
                    <small>Total Tasks</small><br><strong>${stats.total || 0}</strong>
                </div>
                <div style="background: #10b981; padding: 10px; border-radius: 5px; flex: 1; text-align: center;">
                    <small>Completed</small><br><strong>${stats.completed || 0}</strong>
                </div>
                <div style="background: #f59e0b; padding: 10px; border-radius: 5px; flex: 1; text-align: center;">
                    <small>Pending</small><br><strong>${stats.pending || 0}</strong>
                </div>
            </div>
        `;
    } catch (err) {
        console.error("Analytics fetch failed");
    }
}

// --- TASK MANAGEMENT --- 

async function loadTasks(statusFilter = "") {
    const token = localStorage.getItem('token');
    const taskList = document.getElementById('task-list');
    if (!taskList) return;

    let url = `${API_URL}/tasks/my-tasks`;
    if (statusFilter) url += `?status=${statusFilter}`;

    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const tasks = await response.json();

        if (tasks.length === 0) {
            taskList.innerHTML = "<p>No tasks found.</p>";
            return;
        }

        taskList.innerHTML = tasks.map(t => `
            <div style="background: #0f172a; padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid ${t.status === 'completed' ? '#10b981' : '#f59e0b'}">
                <strong>${t.title}</strong>
                <p style="font-size: 13px; color: #94a3b8;">${t.description}</p>
                <small>Status: ${t.status}</small>
                ${t.status !== 'completed' ? `<button onclick="completeTask(${t.id})" style="width: auto; padding: 5px 10px; font-size: 12px; background: #10b981; margin-top: 10px;">Complete</button>` : ''}
            </div>
        `).join('');
    } catch (err) {
        taskList.innerHTML = "Failed to load tasks.";
    }
}

async function completeTask(taskId) {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/tasks/${taskId}/status?new_status=completed`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            loadTasks();
        }
    } catch (err) {
        alert("Update failed.");
    }
}

// --- ADMIN FUNCTIONS ---

async function assignTask() {
    const title = document.getElementById('task-title').value;
    const desc = document.getElementById('task-desc').value;
    const userId = document.getElementById('task-user-id').value;
    const token = localStorage.getItem('token');

    if (!title || !userId) return;

    try {
        const response = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: title,
                description: desc,
                assigned_to: parseInt(userId)
            })
        });

        if (response.ok) {
            alert("Task assigned successfully!");
            document.getElementById('task-title').value = '';
            document.getElementById('task-desc').value = '';
            loadAnalytics(); // Refresh admin stats [cite: 32]
        }
    } catch (err) {
        alert("Failed to assign task.");
    }
}

async function uploadFile(event) {
    // STOP THE REFRESH IMMEDIATELY 
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const fileInput = document.getElementById('file-input');
    const msg = document.getElementById('admin-msg');
    const token = localStorage.getItem('token');

    if (!fileInput.files.length) {
        msg.innerText = "Please select a file.";
        return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    msg.innerText = "Uploading...";

    try {
        const response = await fetch(`${API_URL}/documents/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            // Use console.log first to test if the alert is what triggers the refresh
            console.log("Success:", result.message);
            msg.innerText = "Upload Successful!";
            alert("Upload Successful!");
            loadAnalytics(); // [cite: 32]
        } else {
            msg.innerText = "Upload failed: " + (result.detail || "Error");
            alert("Upload failed: " + (result.detail || "Error"));
        }
    } catch (err) {
        msg.innerText = "Connection error.";
        alert("Connection error.");
    }

    // RETURN FALSE to double-ensure no refresh happens
    return false;
}

// --- UTILS ---

async function fetchUserList() {
    const token = localStorage.getItem('token');
    const display = document.getElementById('user-directory-list');
    display.innerHTML = "Fetching users...";

    try {
        const response = await fetch(`${API_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const allUsers = await response.json();
        const standardUsers = allUsers.filter(u => u.role_id === 2);

        display.innerHTML = standardUsers.map(u => `
            <div style="margin-bottom: 8px; padding: 10px; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <span style="color: #8b5cf6; font-weight: bold;">ID: ${u.id}</span> 
                    <span style="color: #fff; margin-left: 15px; font-size: 1.1em;">👤 ${u.username}</span>
                </div>
                <button onclick="copyId(${u.id})" style="width: auto; background: #334155; padding: 4px 8px; font-size: 11px;">Copy ID</button>
            </div>
        `).join('');
    } catch (err) {
        display.innerHTML = "Error loading users.";
    }
}

function copyId(id) {
    document.getElementById('task-user-id').value = id;
    alert(`User ID ${id} copied!`);
}

async function fetchAllTasks() {
    const token = localStorage.getItem('token');
    const display = document.getElementById('global-task-list');

    try {
        const response = await fetch(`${API_URL}/admin/all-tasks`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const tasks = await response.json();

        display.innerHTML = tasks.map(t => `
            <div style="padding: 8px; border-bottom: 1px solid #334155; display: flex; justify-content: space-between;">
                <span><strong>ID ${t.assigned_to}:</strong> ${t.title}</span>
                <span style="color: ${t.status === 'completed' ? '#10b981' : '#f59e0b'}">${t.status.toUpperCase()}</span>
            </div>
        `).join('');
    } catch (err) {
        display.innerHTML = "Error loading task tracker.";
    }
}

async function performSearch() {
    const queryInput = document.getElementById('search-query');
    const resultsDiv = document.getElementById('search-results');
    const token = localStorage.getItem('token');

    if (!queryInput.value) return;
    resultsDiv.innerHTML = "Searching Knowledge Base...";

    try {
        const response = await fetch(`${API_URL}/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query: queryInput.value })
        });

        const results = await response.json();
        if (Array.isArray(results) && results.length > 0) {
            resultsDiv.innerHTML = results.map(r => `
                <div style="color: white; padding: 12px; margin-bottom: 8px; border-left: 4px solid #3b82f6; background: #0f172a; border-radius: 4px;">
                    ${r}
                </div>
            `).join('');
        } else {
            resultsDiv.innerHTML = "No relevant info found.";
        }
    } catch (err) {
        resultsDiv.innerHTML = "Search failed.";
    }
}

function showTab(tabName) {
    document.getElementById('search-tab').style.display = tabName === 'search' ? 'block' : 'none';
    document.getElementById('tasks-tab').style.display = tabName === 'tasks' ? 'block' : 'none';
}

function logout() {
    localStorage.clear();
    location.reload();
}

// Auto-login on page load if token exists in localStorage
window.addEventListener('DOMContentLoaded', (event) => {
    if (localStorage.getItem('token')) {
        showDashboard();
    }
});