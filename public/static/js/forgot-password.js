/**
 * Forgot Password Page - JavaScript
 * Handles password reset request via email
 */

const form = document.getElementById('forgotPasswordForm');
const emailInput = document.getElementById('email');
const submitBtn = document.getElementById('submitBtn');
const alertDiv = document.getElementById('alert');
const loadingDiv = document.getElementById('loading');

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
    emailInput.disabled = loading;
}

/**
 * Handle form submission
 */
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    
    // Validate email
    if (!email) {
        showAlert('Please enter your email address', 'error');
        return;
    }
    
    if (!isValidEmail(email)) {
        showAlert('Please enter a valid email address', 'error');
        return;
    }
    
    setLoading(true);
    hideAlert();
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Success - show message and reset form
            showAlert(
                'If an account with this email exists, a password reset link has been sent. Please check your email.',
                'success'
            );
            form.reset();
            emailInput.focus();
            
            // Optional: Redirect after delay for better UX
            setTimeout(() => {
                // You could redirect here or keep user on page
                // window.location.href = 'login.html';
            }, 3000);
        } else {
            // Even on "error", show generic message for security
            showAlert(
                'If an account with this email exists, a password reset link has been sent. Please check your email.',
                'info'
            );
            form.reset();
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert(
            'Unable to process request. Please try again later. If the problem persists, contact support.',
            'error'
        );
    } finally {
        setLoading(false);
    }
});

/**
 * Simple email validation
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Clear alert when user starts typing
 */
emailInput.addEventListener('focus', hideAlert);

// Log page load for debugging
console.log('Forgot password page loaded');
console.log('API Base URL:', API_BASE_URL);
