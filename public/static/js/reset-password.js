/**
 * Reset Password Page - JavaScript
 * Handles password reset flow with token validation
 */

const form = document.getElementById('resetPasswordForm');
const tokenInput = document.getElementById('token');
const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');
const submitBtn = document.getElementById('submitBtn');
const alertDiv = document.getElementById('alert');
const loadingDiv = document.getElementById('loading');
const validTokenContainer = document.getElementById('validTokenContainer');
const invalidTokenContainer = document.getElementById('invalidTokenContainer');

// Use centralized CONFIG from config.js
const API_BASE_URL = CONFIG.BACKEND.API_URL;

/**
 * Display alert message
 */
function showAlert(message, type = 'info') {
    alertDiv.textContent = message;
    alertDiv.className = `alert ${type}`;
    alertDiv.style.display = 'block';
    
    // Auto-hide info alerts after 5 seconds
    if (type === 'info') {
        setTimeout(() => {
            alertDiv.style.display = 'none';
        }, 5000);
    }
}

/**
 * Hide alert
 */
function hideAlert() {
    alertDiv.style.display = 'none';
}

/**
 * Show loading state
 */
function setLoading(loading) {
    loadingDiv.classList.toggle('active', loading);
    submitBtn.disabled = loading;
    form.querySelectorAll('input').forEach(input => {
        input.disabled = loading;
    });
}

/**
 * Get token from URL query parameter
 */
function getTokenFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('token');
}

/**
 * Validate token format (basic client-side check)
 * We won't validate against server here, just check it exists
 */
function validateTokenFormat(token) {
    return token && token.length > 10;
}

/**
 * Update password requirements display
 */
function updatePasswordRequirements() {
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    // Check length requirement (at least 8 characters)
    const lengthOk = newPassword.length >= 8;
    updateRequirement('reqLength', lengthOk);
    
    // Check if passwords match
    const matchOk = newPassword === confirmPassword && newPassword.length > 0;
    updateRequirement('reqMatch', matchOk);
    
    // Enable submit button if all requirements met
    submitBtn.disabled = !(lengthOk && matchOk);
}

/**
 * Update requirement indicator
 */
function updateRequirement(elementId, met) {
    const element = document.getElementById(elementId);
    if (met) {
        element.className = 'requirement-icon checked';
        element.textContent = '✓';
    } else {
        element.className = 'requirement-icon unchecked';
        element.textContent = '✓';
    }
}

/**
 * Handle form submission
 */
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const token = tokenInput.value.trim();
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    // Final validation
    if (!token) {
        showAlert('Invalid token. Please use the link from your email.', 'error');
        return;
    }
    
    if (!newPassword || !confirmPassword) {
        showAlert('Please enter and confirm your new password', 'error');
        return;
    }
    
    if (newPassword.length < 8) {
        showAlert('Password must be at least 8 characters long', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showAlert('Passwords do not match', 'error');
        return;
    }
    
    setLoading(true);
    hideAlert();
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: token,
                new_password: newPassword,
                confirm_password: confirmPassword
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Success
            showAlert('Password reset successfully! Redirecting to login...', 'success');
            
            // Redirect to login after delay
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
        } else {
            // Error from server
            const errorMessage = data.detail || 'Error resetting password. Please try again.';
            
            // Check if token expired/invalid
            if (response.status === 400 && data.detail) {
                if (data.detail.includes('expired') || data.detail.includes('invalid') || data.detail.includes('used')) {
                    showInvalidToken();
                    return;
                }
            }
            
            showAlert(errorMessage, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Network error. Please check your connection and try again.', 'error');
    } finally {
        setLoading(false);
    }
});

/**
 * Show invalid token message and hide form
 */
function showInvalidToken() {
    validTokenContainer.style.display = 'none';
    invalidTokenContainer.style.display = 'block';
}

/**
 * Initialize page on load
 */
function initPage() {
    const token = getTokenFromURL();
    
    if (!token || !validateTokenFormat(token)) {
        showInvalidToken();
        return;
    }
    
    // Store token in hidden field
    tokenInput.value = token;
    
    // Add event listeners for password requirement validation
    newPasswordInput.addEventListener('input', updatePasswordRequirements);
    confirmPasswordInput.addEventListener('input', updatePasswordRequirements);
    
    // Set initial requirement indicators
    updatePasswordRequirements();
    
    console.log('Reset password page initialized');
    console.log('API Base URL:', API_BASE_URL);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initPage);

// Also run if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPage);
} else {
    initPage();
}
