<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Sign in to Nutriqube - Enterprise Nutrition Analytics">
    <title>Sign In - Nutriqube</title>
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

        <!-- Right Side - Login Form -->
        <div class="login-form-container">
            <div class="form-header-logo">
                <div class="form-logo">
                    <img src="/images/logo/nutri.png" alt="Nutriqube logo" />
                </div>
                <span class="form-brand-name">Nutriqube</span>
            </div>
            
            <div class="form-wrapper">
                <div class="form-header">
                    <h2>Sign In to Your Account</h2>
                    <p>Enter your credentials to continue to your nutrition workspace.</p>
                </div>

                <form id="loginForm" class="login-form">
                    <div class="form-group">
                        <label for="username" class="form-label">
                            <span>Username</span>
                        </label>
                        <div class="form-input-wrapper">
                            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            <input 
                                type="text" 
                                id="username" 
                                class="form-input" 
                                placeholder="Enter your username"
                                required
                                autocomplete="username"
                            >
                        </div>
                    </div>

                    <div class="form-group">
                        <div class="form-label-row">
                            <label for="password" class="form-label">
                                <span>Password</span>
                            </label>
                            <a href="/forgot-password" class="forgot-password-link">Forgot password?</a>
                        </div>
                        <div class="form-input-wrapper">
                            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                            <input 
                                type="password" 
                                id="password" 
                                class="form-input" 
                                placeholder="Enter your password"
                                required
                                autocomplete="current-password"
                            >
                            <button type="button" class="password-toggle" aria-label="Toggle password visibility">
                                <svg class="icon-show" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                                <svg class="icon-hide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: none;">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                    <line x1="1" y1="1" x2="23" y2="23"></line>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div class="form-group remember-me">
                        <input type="checkbox" id="remember" class="form-checkbox">
                        <label for="remember">Keep me signed in</label>
                    </div>

                    <button type="submit" class="btn btn-primary btn-submit">
                        <span>Sign In</span>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M5 12h14M12 5l7 7-7 7"></path>
                        </svg>
                    </button>
                </form>

                <!-- Mobile Support Section -->
                <div class="mobile-branding-bottom">
                    <h3>Support When You Need It</h3>
                    <p>Need access? <a href="/?contact=open">Contact our team</a></p>
                </div>
            </div>
        </div>
    </div>

    <!-- Loading Spinner -->
    <div id="loadingSpinner" class="loading-overlay" style="display: none;">
        <div class="spinner">
            <div class="spinner-ring"></div>
            <div class="spinner-text">Signing in...</div>
        </div>
    </div>

    <!-- Alert Container -->
    <div id="alertContainer"></div>

    <script src="/static/js/config.js?v=8.0"></script>
    <script src="/static/js/auth.js?v=7.0"></script>
    <script src="/static/js/premium.js"></script>
</body>
</html>
