/* ============================================================
   NUTRIQUBE PREMIUM - JAVASCRIPT INTERACTIONS
   ============================================================ */

document.addEventListener('DOMContentLoaded', function() {
    
    // Password visibility toggle
    const passwordToggle = document.querySelector('.password-toggle');
    const passwordInput = document.querySelector('#password');
    const iconShow = document.querySelector('.icon-show');
    const iconHide = document.querySelector('.icon-hide');
    
    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener('click', function(e) {
            e.preventDefault();
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            
            if (iconShow && iconHide) {
                if (isPassword) {
                    iconShow.style.display = 'none';
                    iconHide.style.display = 'block';
                } else {
                    iconShow.style.display = 'block';
                    iconHide.style.display = 'none';
                }
            }
        });
    }
    
    // Smooth scroll for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href !== '#' && document.querySelector(href)) {
                e.preventDefault();
                const target = document.querySelector(href);
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Mobile menu toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navbarMenu = document.querySelector('.navbar-menu');
    
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            if (navbarMenu) {
                navbarMenu.classList.toggle('active');
                this.classList.toggle('active');
            }
        });
    }
    
    // Observe elements for scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);
    
    // Observe feature cards and other animated elements
    document.querySelectorAll('.feature-card, .testimonial-card, .benefit-icon').forEach(el => {
        observer.observe(el);
    });
    
    // Form input focus effects
    const formInputs = document.querySelectorAll('.form-input');
    formInputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('focused');
        });
    });
    
    // Magnetic button effect
    const buttons = document.querySelectorAll('.btn-primary, .btn-social');
    buttons.forEach(button => {
        button.addEventListener('mousemove', function(e) {
            if (window.innerWidth > 768) {
                const rect = this.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                const moveX = (x - centerX) * 0.2;
                const moveY = (y - centerY) * 0.2;
                
                this.style.transform = `translate(${moveX}px, ${moveY}px)`;
            }
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translate(0, 0)';
        });
    });
    
    // Ripple effect on click
    document.querySelectorAll('.btn').forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');
            
            // Remove existing ripples
            const existingRipples = this.querySelectorAll('.ripple');
            existingRipples.forEach(r => r.remove());
            
            this.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 600);
        });
    });
    
    // Check form validity for better UX
    const loginForm = document.querySelector('#loginForm');
    if (loginForm) {
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const inputs = loginForm.querySelectorAll('input[required]');
        
        const updateButtonState = () => {
            const isValid = Array.from(inputs).every(input => input.value.trim() !== '');
            if (submitBtn) {
                submitBtn.disabled = !isValid;
            }
        };
        
        inputs.forEach(input => {
            input.addEventListener('input', updateButtonState);
        });
        
        updateButtonState();
    }
    
    // Scroll reveal animations
    const revealElements = document.querySelectorAll(
        '.hero-content, .hero-visual, .section-header, .feature-card, ' +
        '.benefits-list li, .testimonial-card, .pricing-card'
    );
    
    const revealOnScroll = () => {
        revealElements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const elementBottom = element.getBoundingClientRect().bottom;
            
            if (elementTop < window.innerHeight && elementBottom > 0) {
                element.classList.add('revealed');
            }
        });
    };
    
    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll(); // Initial check
    
    // Contact Modal Handler
    const contactModal = document.getElementById('contactModal');
    const contactTriggers = document.querySelectorAll('.contact-trigger');
    const contactModalClose = document.querySelector('.contact-modal-close');
    const contactModalOverlay = document.querySelector('.contact-modal-overlay');
    
    function openContactModal(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        contactModal?.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    function closeContactModal() {
        contactModal?.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
    
    // Attach click handlers to all contact triggers
    contactTriggers.forEach(trigger => {
        trigger.addEventListener('click', openContactModal);
    });
    
    // Close button
    contactModalClose?.addEventListener('click', closeContactModal);
    
    // Close on overlay click
    contactModalOverlay?.addEventListener('click', closeContactModal);
    
    // Close on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && contactModal?.classList.contains('active')) {
            closeContactModal();
        }
    });
    
    // Check if we should open modal on page load (for cross-page navigation)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('contact') === 'open') {
        openContactModal();
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
});

// Prevent layout shift with scroll
if (document.documentElement.scrollHeight > window.innerHeight) {
    document.documentElement.style.scrollPaddingTop = '0';
}

// High performance scroll handler with throttle
let scrollTimeout;
function handleScroll() {
    if (scrollTimeout) {
        return;
    }
    
    scrollTimeout = setTimeout(() => {
        scrollTimeout = null;
    }, 100);
    
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        if (navbar) {
            navbar.classList.add('scrolled');
        }
    } else {
        if (navbar) {
            navbar.classList.remove('scrolled');
        }
    }
}

window.addEventListener('scroll', handleScroll, { passive: true });

// Enhanced form submission handling
function setupFormHandling() {
    const loginForm = document.querySelector('#loginForm');
    if (!loginForm) return;
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.querySelector('#username').value;
        const password = document.querySelector('#password').value;
        const loadingSpinner = document.querySelector('#loadingSpinner');
        
        // Show loading state
        if (loadingSpinner) {
            loadingSpinner.style.display = 'flex';
        }
        
        try {
            // The actual form submission will be handled by existing auth.js
            // This is just for animation purposes
            console.log('Form submitted with username:', username);
        } catch (error) {
            console.error('Form submission error:', error);
        }
    });
}

document.addEventListener('DOMContentLoaded', setupFormHandling);

// Prefetch links for better performance
function prefetchLinks() {
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
            document.querySelectorAll('a[href^="/"]').forEach(link => {
                const href = link.getAttribute('href');
                if (href && !href.startsWith('javascript:')) {
                    const link_element = document.createElement('link');
                    link_element.rel = 'prefetch';
                    link_element.href = href;
                    document.head.appendChild(link_element);
                }
            });
        });
    }
}

window.addEventListener('load', prefetchLinks);

// Add ripple effect styles dynamically
const style = document.createElement('style');
style.textContent = `
    .btn {
        position: relative;
        overflow: hidden;
    }
    
    .ripple {
        position: absolute;
        background: rgba(255, 255, 255, 0.5);
        border-radius: 50%;
        transform: scale(0);
        animation: rippleEffect 0.6s ease-out;
        pointer-events: none;
    }
    
    @keyframes rippleEffect {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    .navbar.scrolled {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
`;
document.head.appendChild(style);

