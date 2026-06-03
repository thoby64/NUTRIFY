/* =============================================
   LANDING PAGE JAVASCRIPT
   ============================================= */

document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeScrollAnimations();
    initializeInteractiveElements();
});

/**
 * Initialize smooth navigation between sections
 */
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.navbar-nav a[href^="#"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Don't prevent default for brand logo or other special links
            if (href === '#home' || href === '#') {
                return;
            }
            
            e.preventDefault();
            const targetElement = document.querySelector(href);
            
            if (targetElement) {
                // Close mobile menu if open
                const navbarCollapse = document.querySelector('.navbar-collapse');
                if (navbarCollapse.classList.contains('show')) {
                    const toggleButton = document.querySelector('.navbar-toggler');
                    toggleButton.click();
                }
                
                // Smooth scroll with offset for navbar
                const navbarHeight = document.querySelector('.navbar-landing').offsetHeight;
                const targetPosition = targetElement.offsetTop - navbarHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // CTA buttons smooth scroll to login
    const ctaButtons = document.querySelectorAll('a[href="/login"], a[href="login"]');
    ctaButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            // Allow normal navigation to login page
            return true;
        });
    });
}

/**
 * Initialize scroll-based animations
 */
function initializeScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Add animation classes
                entry.target.classList.add('animate-in');
                
                // Animate cards with stagger
                if (entry.target.classList.contains('feature-card') || 
                    entry.target.classList.contains('nutrition-card')) {
                    animateCardsInSection(entry.target);
                }
                
                // Stop observing after animation
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe all sections and cards
    document.querySelectorAll('section, .feature-card, .nutrition-card').forEach(el => {
        observer.observe(el);
    });
}

/**
 * Animate multiple cards with stagger effect
 */
function animateCardsInSection(cardElement) {
    const section = cardElement.closest('section');
    if (!section) return;
    
    const cards = section.querySelectorAll('.feature-card, .nutrition-card');
    const parent = cardElement.parentElement;
    
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

/**
 * Initialize interactive elements
 */
function initializeInteractiveElements() {
    // Navbar scroll effect
    handleNavbarScroll();
    
    // Button hover animations
    addButtonHoverEffects();
    
    // Feature card interactions
    addCardInteractions();
    
    // Counter animations
    animateCounters();
}

/**
 * Add navbar effects on scroll
 */
function handleNavbarScroll() {
    const navbar = document.querySelector('.navbar-landing');
    
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.style.boxShadow = '0 5px 20px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.05)';
        }
    });
}

/**
 * Add hover effects to buttons
 */
function addButtonHoverEffects() {
    const buttons = document.querySelectorAll('.btn');
    
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-3px)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
}

/**
 * Add interaction effects to cards
 */
function addCardInteractions() {
    const cards = document.querySelectorAll('.feature-card, .nutrition-card, .why-item');
    
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            // Already handled by CSS, but can add additional JS effects here
        });
        
        card.addEventListener('mouseleave', function() {
            // Clean up any additional effects
        });
    });
}

/**
 * Animate counter numbers
 */
function animateCounters() {
    const statItems = document.querySelectorAll('.stat-item h3');
    let hasAnimated = false;
    
    const observerOptions = {
        threshold: 0.7
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting && !hasAnimated) {
                hasAnimated = true;
                statItems.forEach(stat => {
                    const finalValue = stat.textContent.replace(/\D/g, '');
                    animateValue(stat, 0, parseInt(finalValue), 1500);
                });
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    const heroSection = document.querySelector('.hero');
    if (heroSection) {
        observer.observe(heroSection);
    }
}

/**
 * Animate a value from start to end
 */
function animateValue(element, start, end, duration) {
    const suffix = element.textContent.substring(element.textContent.length - 1);
    let current = start;
    const increment = (end - start) / (duration / 16);
    const startTime = Date.now();
    
    function update() {
        current += increment;
        
        if (current >= end) {
            element.textContent = end + suffix;
        } else {
            element.textContent = Math.floor(current) + suffix;
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

/**
 * Handle mobile menu closing on link click
 */
function setupMobileMenuClose() {
    const navLinks = document.querySelectorAll('.navbar-nav a:not([href="/login"]):not([href="login"])');
    const navbarToggler = document.querySelector('.navbar-toggler');
    const navbarCollapse = document.querySelector('.navbar-collapse');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (navbarCollapse.classList.contains('show')) {
                navbarToggler.click();
            }
        });
    });
}

/**
 * Add parallax effect to background shapes
 */
function addParallaxEffect() {
    const shapes = document.querySelectorAll('.shape');
    
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        
        shapes.forEach((shape, index) => {
            const yPos = scrolled * (0.5 + index * 0.1);
            shape.style.transform = `translateY(${yPos}px)`;
        });
    });
}

/**
 * Initialize on DOM ready
 */
function setupAllFeatures() {
    setupMobileMenuClose();
    addParallaxEffect();
    
    // Add loading class to sections for initial animation
    const sections = document.querySelectorAll('section');
    sections.forEach((section, index) => {
        section.style.opacity = '1';
        section.style.animation = `fadeInUp 0.6s ease ${index * 0.1}s both`;
    });
}

// Run setup when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupAllFeatures);
} else {
    setupAllFeatures();
}

/**
 * Add CSS animations dynamically
 */
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes slideInLeft {
        from {
            opacity: 0;
            transform: translateX(-30px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(30px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    .animate-in {
        animation: fadeInUp 0.6s ease forwards;
    }
`;
document.head.appendChild(style);

/**
 * Track user interactions
 */
function trackInteractions() {
    // Track button clicks
    document.querySelectorAll('.btn').forEach(button => {
        button.addEventListener('click', function() {
            console.log('Button clicked:', this.textContent);
        });
    });
    
    // Track section views
    const sectionObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const sectionId = entry.target.id;
                if (sectionId) {
                    console.log('Section viewed:', sectionId);
                }
            }
        });
    });
    
    document.querySelectorAll('section').forEach(section => {
        sectionObserver.observe(section);
    });
}

// Initialize tracking
trackInteractions();

/**
 * Utility function to check if element is in viewport
 */
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

/**
 * Performance optimization - debounce scroll handler
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Debounced scroll handler for performance
const handleScroll = debounce(function() {
    // Add any scroll-based logic here
}, 100);

window.addEventListener('scroll', handleScroll);
