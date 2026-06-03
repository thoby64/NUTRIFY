<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Reset Password - Nutriqube Enterprise Nutrition Analytics">
    <title>Forgot Password - Nutriqube</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Geist:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="/static/css/premium-login.css">
</head>
<body class="login-page">
    <div class="login-layout">
        <!-- Left Side - Branding -->
        <div class="login-branding" style="background-image: url('/images/landing/image3.jpg');">
            <div class="branding-container">
                <a href="/" class="branding-logo">
                    <img src="/images/logo/nutri.png" alt="Nutriqube logo" />
                    <span>Nutriqube</span>
                </a>
                
                <div class="branding-bottom-content">
                    <h3>Support When You Need It</h3>
                    <p>Need access? <a href="/?contact=open">Contact our team</a></p>
                </div>
            </div>
            <div class="branding-background">
                <div class="gradient-orb gradient-orb-1"></div>
                <div class="gradient-orb gradient-orb-2"></div>
            </div>
        </div>

        <!-- Right Side - Password Recovery Form -->
        <div class="login-form-container">
            <div class="form-header-logo">
                <div class="form-logo">
                    <img src="/images/logo/nutri.png" alt="Nutriqube logo" />
                </div>
                <span class="form-brand-name">Nutriqube</span>
            </div>
            
            <div class="form-wrapper">
                <div class="form-header">
                    <h2>Reset Your Password</h2>
                    <p>Enter your email address and we'll send you instructions to reset your password.</p>
                </div>

                <form id="forgotPasswordForm" class="login-form">
                    <div class="form-group">
                        <label for="email" class="form-label">
                            <span>Email Address</span>
                        </label>
                        <div class="form-input-wrapper">
                            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z"></path>
                                <polyline points="22,6 12,13 2,6"></polyline>
                            </svg>
                            <input 
                                type="email" 
                                id="email" 
                                class="form-input" 
                                placeholder="Enter your email address"
                                required
                                autocomplete="email"
                            >
                        </div>
                    </div>

                    <button type="submit" class="btn btn-primary btn-submit" style="width: 100%; margin-top: 8px;">
                        <span>Send Reset Link</span>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M5 12h14M12 5l7 7-7 7"></path>
                        </svg>
                    </button>

                    <div id="alertContainer"></div>
                </form>

                <div class="form-back-link">
                    <p>Remember your password? <a href="/login">Back to sign in</a></p>
                </div>

                <!-- Mobile Support Section -->
                <div class="mobile-branding-bottom">
                    <h3>Support When You Need It</h3>
                    <p>Need access? <a href="/?contact=open">Contact our team</a></p>
                </div>
            </div>
        </div>
    </div>

    <!-- Loading Spinner -->
    <div id="loadingSpinner" class="loading-spinner">
        <div class="spinner-content">
            <div class="spinner"></div>
            <p>Processing your request...</p>
        </div>
    </div>

    <script src="/static/js/config.js?v=8.0&t=<?php echo time(); ?>"></script>
    <script src="/static/js/auth.js?v=8.0&t=<?php echo time(); ?>"></script>
    <script src="/static/js/premium.js?v=8.0&t=<?php echo time(); ?>"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const form = document.getElementById('forgotPasswordForm');
            
            if (!form) {
                return;
            }
            
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const email = document.getElementById('email').value.trim();
                const submitBtn = document.querySelector('.btn-submit');
                const originalText = submitBtn.innerHTML;

                if (!email) {
                    showAlert('Please enter your email address', 'danger');
                    return;
                }
                
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<span>Sending link...</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 2s linear infinite;"><circle cx="12" cy="12" r="10"></circle></svg>';
                }

                try {
                    const requestBody = { email };
                    
                    const response = await fetch(`${API_BASE}/auth/forgot-password`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(requestBody),
                    });

                    const data = await response.json();

                    if (response.status === 200 && data.email_sent) {
                        // Success: Email exists and was sent
                        showAlert('✓ Reset link sent! Check your email for password reset instructions.', 'success');
                        
                        setTimeout(() => {
                            window.location.href = '/login';
                        }, 3000);
                    } else if (response.status === 404) {
                        // Email doesn't exist
                        showAlert('✗ Email not found. Please check and try again.', 'danger');
                    } else if (response.status === 500) {
                        // Server error
                        showAlert('✗ Unable to send reset link. Please try again later.', 'danger');
                    } else {
                        // Other error
                        showAlert('✗ An error occurred. Please try again.', 'danger');
                    }
                } catch (error) {
                    showAlert('✗ Unable to send reset link. Please check your email and try again.', 'danger');
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = originalText;
                    }
                }
            });
        });
    </script>
</body>
</html>
