/**
 * Authentication Handler
 */

// Use global CONFIG from config.js
const API_BASE = CONFIG.BACKEND.API_URL;

// Show alert with modern styling
function showAlert(message, type = 'success') {
    const alertContainer = document.getElementById('alertContainer');
    const alertId = 'alert-' + Date.now();
    
    let bgColor, textColor, borderColor, iconClass;
    
    if (type === 'success') {
        bgColor = '#ecfdf5';
        textColor = '#065f46';
        borderColor = '#6ee7b7';
        iconClass = 'fa-check-circle';
    } else if (type === 'danger' || type === 'error') {
        bgColor = '#fef2f2';
        textColor = '#7f1d1d';
        borderColor = '#fca5a5';
        iconClass = 'fa-exclamation-circle';
    } else if (type === 'warning') {
        bgColor = '#fffbeb';
        textColor = '#78350f';
        borderColor = '#fcd34d';
        iconClass = 'fa-exclamation-triangle';
    } else {
        bgColor = '#eff6ff';
        textColor = '#0c2340';
        borderColor = '#93c5fd';
        iconClass = 'fa-info-circle';
    }
    
    const alertHTML = `
        <div id="${alertId}" class="modern-alert modern-alert-${type}" style="
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1050;
            max-width: 450px;
            background-color: ${bgColor};
            color: ${textColor};
            border: 1px solid ${borderColor};
            border-radius: 8px;
            padding: 16px 20px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            display: flex;
            align-items: center;
            gap: 12px;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 14px;
            font-weight: 500;
            line-height: 1.5;
            animation: slideInRight 0.3s ease-out;
        ">
            <i class="fas ${iconClass}" style="flex-shrink: 0; font-size: 18px;"></i>
            <span style="flex: 1;">${message}</span>
            <button type="button" class="alert-close" style="
                background: none;
                border: none;
                color: ${textColor};
                cursor: pointer;
                padding: 4px 8px;
                font-size: 18px;
                line-height: 1;
                opacity: 0.6;
                transition: opacity 250ms;
            " onclick="this.closest('[id^=alert-]').remove();">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    alertContainer.insertAdjacentHTML('beforeend', alertHTML);
    
    setTimeout(() => {
        const alert = document.getElementById(alertId);
        if (alert) {
            alert.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => alert.remove(), 300);
        }
    }, 4000);
}

// Handle login form submission
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loadingSpinner = document.getElementById('loadingSpinner');
    const loginBtn = document.querySelector('.btn-primary[type="submit"]') || document.querySelector('.btn-submit');
    
    // Show loading state
    if (loadingSpinner) loadingSpinner.style.display = 'flex';
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<span>Signing in...</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;"><circle cx="12" cy="12" r="10"></circle></svg>';
    }
    
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username,
                password,
            }),
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Login failed');
        }
        
        const data = await response.json();
        
        // Store token and user info in localStorage
        localStorage.setItem('authToken', data.access_token);
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Initialize permissions (if permissions.js is available)
        if (typeof PermissionManager !== 'undefined' && data.user.role) {
            PermissionManager.init(data.user.role);
        }
        
        showAlert('Login successful! Redirecting...', 'success');
        
        // Redirect to role-appropriate workspace
        setTimeout(() => {
            let redirectUrl = 'admin/'; // default
            
            if (data.user && data.user.role) {
                const role = data.user.role.toLowerCase();
                if (role === 'admin') {
                    redirectUrl = 'admin/';
                } else if (role === 'manager') {
                    redirectUrl = 'manager/';
                } else if (role === 'nutritionist' || role === 'editor') {
                    redirectUrl = 'nutritionist/';
                }
            }
            
            window.location.href = redirectUrl;
        }, 1000);
        
    } catch (error) {
        showAlert(error.message || 'Login failed. Please try again.', 'danger');
    } finally {
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<span>Sign In</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>';
        }
    }
});

// Check if user is already logged in
function checkAuth() {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token) {
        // User is already logged in
        try {
            const userObj = JSON.parse(user);
            
            // Initialize permissions
            if (typeof PermissionManager !== 'undefined' && userObj.role) {
                PermissionManager.init(userObj.role);
            }
            
            // Determine correct dashboard based on current page and user role
            const currentPage = window.location.pathname;
            const isLoginPage = /\/(login|forgot-password|reset-password)(\.html)?$/.test(currentPage);
            
            if (isLoginPage) {
                // Redirect logged-in user away from login pages
                let redirectUrl = 'admin/';
                if (userObj.role) {
                    const role = userObj.role.toLowerCase();
                    if (role === 'admin') {
                        redirectUrl = 'admin/';
                    } else if (role === 'manager') {
                        redirectUrl = 'manager/';
                    } else if (role === 'nutritionist' || role === 'editor') {
                        redirectUrl = 'nutritionist/';
                    }
                }
                window.location.href = redirectUrl;
            }
        } catch (error) {
            console.error('Error parsing user data:', error);
        }
    } else {
        // User is not logged in, redirect to login if on protected page
        const currentPage = window.location.pathname;
        const protectedPages = ['admin-dashboard', 'dashboard', 'manager-dashboard', 'nutritionist-dashboard'];
        const protectedFolders = ['/admin/', '/manager/', '/nutritionist/'];
        
        if (protectedPages.some(page => currentPage.includes(page)) || protectedFolders.some(folder => currentPage.includes(folder))) {
            window.location.href = '/login';
        }
    }
}

// Run auth check on page load
document.addEventListener('DOMContentLoaded', checkAuth);
