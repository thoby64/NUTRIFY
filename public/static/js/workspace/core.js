const WorkspaceCore = (() => {
    const DASHBOARD_PATHS = {
        admin: 'admin/',
        manager: 'manager/',
        nutritionist: 'nutritionist/'
    };

    function getToken() {
        return localStorage.getItem(CONFIG.AUTH.TOKEN_KEY) || localStorage.getItem('authToken');
    }

    function getUser() {
        const raw = localStorage.getItem(CONFIG.AUTH.USER_KEY);
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch (error) {
            console.error('Failed to parse stored user', error);
            return null;
        }
    }

    function getDashboardPathForRole(role) {
        return DASHBOARD_PATHS[(role || '').toLowerCase()] || 'login';
    }

    function redirectToLogin() {
        window.location.href = '/login';
    }

    function ensureAuthenticated(expectedRole) {
        const token = getToken();
        const user = getUser();

        if (!token || !user) {
            redirectToLogin();
            return null;
        }

        const actualRole = (user.role || '').toLowerCase();
        const allowedRoles = expectedRole && expectedRole.toLowerCase() === 'nutritionist'
            ? ['nutritionist']
            : [expectedRole?.toLowerCase()];

        if (expectedRole && !allowedRoles.includes(actualRole)) {
            window.location.href = `/${getDashboardPathForRole(actualRole)}`;
            return null;
        }

        return user;
    }

    function buildUrl(endpoint) {
        if (!endpoint) return CONFIG.BACKEND.API_URL;
        if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
            return endpoint;
        }
        if (endpoint.startsWith('/api/')) {
            return `${CONFIG.BACKEND.BASE_URL}${endpoint}`;
        }
        return `${CONFIG.BACKEND.API_URL}${endpoint}`;
    }

    async function apiFetch(endpoint, options = {}) {
        const headers = new Headers(options.headers || {});
        const token = getToken();

        if (token && !headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${token}`);
        }

        let body = options.body;
        if (body && !(body instanceof FormData) && typeof body === 'object' && !headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
            body = JSON.stringify(body);
        }

        const response = await fetch(buildUrl(endpoint), {
            ...options,
            headers,
            body
        });

        if (response.status === 401) {
            localStorage.removeItem(CONFIG.AUTH.TOKEN_KEY);
            localStorage.removeItem('authToken');
            localStorage.removeItem(CONFIG.AUTH.USER_KEY);
            redirectToLogin();
            throw new Error('Your session expired. Please sign in again.');
        }

        return response;
    }

    async function apiJson(endpoint, options = {}) {
        const response = await apiFetch(endpoint, options);
        const contentType = response.headers.get('content-type') || '';

        if (response.status === 204) {
            return null;
        }

        const payload = contentType.includes('application/json')
            ? await response.json()
            : await response.text();

        if (!response.ok) {
            let detail;
            if (typeof payload === 'string') {
                detail = payload;
            } else if (payload?.detail) {
                detail = typeof payload.detail === 'string'
                    ? payload.detail
                    : JSON.stringify(payload.detail, null, 2);
            } else if (payload?.message) {
                detail = typeof payload.message === 'string'
                    ? payload.message
                    : JSON.stringify(payload.message, null, 2);
            } else if (typeof payload === 'object') {
                detail = JSON.stringify(payload, null, 2);
            } else {
                detail = 'Request failed';
            }
            throw new Error(detail);
        }

        return payload;
    }

    function downloadBlob(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    }

    function showAlert(message, type = 'success', options = {}) {
        let stack = document.getElementById('workspaceAlertStack');
        if (!stack) {
            stack = document.createElement('div');
            stack.id = 'workspaceAlertStack';
            stack.className = 'workspace-alert-stack';
            document.body.appendChild(stack);
        }

        const alert = document.createElement('div');
        alert.className = `workspace-alert ${type}`;
        const copy = document.createElement('div');
        copy.className = 'workspace-alert-copy';
        copy.textContent = message;
        alert.appendChild(copy);

        if (options.actionLabel && options.actionHref) {
            const action = document.createElement('a');
            action.className = 'workspace-alert-action';
            action.href = options.actionHref;
            action.textContent = options.actionLabel;
            alert.appendChild(action);
        }
        stack.appendChild(alert);

        setTimeout(() => {
            alert.remove();
        }, CONFIG.UI.ALERT_DURATION);
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatDate(value, options = {}) {
        if (!value) return '—';
        try {
            return new Date(value).toLocaleString(undefined, options);
        } catch (error) {
            return String(value);
        }
    }

    function roleLabel(role) {
        const map = {
            admin: 'Administrator',
            manager: 'Manager',
            nutritionist: 'Nutritionist'
        };
        return map[(role || '').toLowerCase()] || role || 'User';
    }

    function initials(user) {
        const source = user?.full_name || user?.username || 'NA';
        return source
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join('') || 'NA';
    }

    function renderTable(columns, rows, emptyText = 'No records found yet.') {
        if (!rows || rows.length === 0) {
            return `<div class="workspace-empty">${escapeHtml(emptyText)}</div>`;
        }

        const head = columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('');
        const body = rows.map((row) => `
            <tr>
                ${columns.map((column) => {
                    if (column.render) {
                        return `<td>${column.render(row)}</td>`;
                    }
                    return `<td>${escapeHtml(row[column.key] ?? '—')}</td>`;
                }).join('')}
            </tr>
        `).join('');

        return `
            <div class="workspace-table-wrap">
                <table class="workspace-table">
                    <thead>
                        <tr>${head}</tr>
                    </thead>
                    <tbody>${body}</tbody>
                </table>
            </div>
        `;
    }

    function logout() {
        localStorage.removeItem(CONFIG.AUTH.TOKEN_KEY);
        localStorage.removeItem('authToken');
        localStorage.removeItem(CONFIG.AUTH.USER_KEY);
        window.location.href = '/login';
    }

    return {
        apiFetch,
        apiJson,
        buildUrl,
        downloadBlob,
        ensureAuthenticated,
        escapeHtml,
        formatDate,
        getDashboardPathForRole,
        getToken,
        getUser,
        initials,
        logout,
        renderTable,
        roleLabel,
        showAlert
    };
})();
