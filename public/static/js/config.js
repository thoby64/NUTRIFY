/* =============================================
   GLOBAL CONFIGURATION
   ============================================= */

/**
 * Global configuration for the Nutrition Analytics Application
 * This file contains all environment-specific settings
 * 
 * To change settings, edit this file instead of modifying individual files
 */

// Detect environment and set backend URL
const getBackendUrl = () => {
    return window.location.origin;
};

const CONFIG = {
    // ============ BACKEND CONFIGURATION ============
    BACKEND: {
        HOST: window.location.hostname,
        PORT: window.location.port,
        PROTOCOL: window.location.protocol.replace(':', ''),
        
        // Computed properties - DO NOT EDIT
        get BASE_URL() {
            return getBackendUrl();
        },
        
        get API_URL() {
            return `${this.BASE_URL}/api/v1`;
        }
    },
    
    // ============ AUTHENTICATION CONFIGURATION ============
    AUTH: {
        TOKEN_KEY: 'token',
        USER_KEY: 'user',
        TOKEN_EXPIRY_HOURS: 24,
        
        get TOKEN_EXPIRY_MS() {
            return this.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000;
        }
    },
    
    // ============ PAGINATION CONFIGURATION ============
    PAGINATION: {
        DEFAULT_PAGE_SIZE: 25,
        MIN_PAGE_SIZE: 10,
        MAX_PAGE_SIZE: 50,
        PAGE_SIZE_OPTIONS: [10, 25, 50],
        DEBOUNCE_DELAY: 500  // milliseconds
    },
    
    // ============ CACHE CONFIGURATION ============
    CACHE: {
        ENABLED: true,
        FOOD_GROUPS_TTL: 5 * 60 * 1000,  // 5 minutes
        NUTRIENTS_TTL: 5 * 60 * 1000,    // 5 minutes
        NUTRIENT_TYPES_TTL: 10 * 60 * 1000, // 10 minutes
    },
    
    // ============ UI CONFIGURATION ============
    UI: {
        ALERT_DURATION: 4000,  // milliseconds
        ANIMATION_DURATION: 300,  // milliseconds
        MODAL_ANIMATION_DURATION: 150,  // milliseconds
    },
    
    // ============ API ENDPOINTS ============
    ENDPOINTS: {
        // Authentication
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        VERIFY: '/auth/verify',
        
        // Foods
        FOODS: '/foods',
        FOODS_SEARCH: '/foods/search',
        FOOD_DETAILS: (id) => `/foods/${id}`,
        
        // Food Groups
        FOOD_GROUPS: '/food-groups',
        
        // Nutrients
        NUTRIENTS: '/nutrients',
        NUTRIENT_TYPES: '/nutrient-types',
        FOOD_NUTRIENTS: '/food-nutrients',
        
        // Dashboard
        DASHBOARD_STATS: '/dashboard/stats',
        
        // Health
        HEALTH: '/health',
    },
    
    // ============ FEATURE FLAGS ============
    FEATURES: {
        ENABLE_CHARTS: true,
        ENABLE_SEARCH: true,
        ENABLE_FILTER: true,
        ENABLE_EXPORT: false,  // Coming soon
        ENABLE_ADVANCED_SEARCH: false,  // Coming soon
    },
    
    // ============ THEME CONFIGURATION ============
    THEME: {
        PRIMARY_COLOR: '#10b981',
        PRIMARY_DARK: '#059669',
        ACCENT_ORANGE: '#f97316',
        ACCENT_YELLOW: '#eab308',
        ACCENT_BLUE: '#3b82f6',
        ACCENT_PURPLE: '#a855f7',
    },
    
    // ============ VALIDATION ============
    VALIDATION: {
        MIN_USERNAME_LENGTH: 3,
        MIN_PASSWORD_LENGTH: 8,
        MAX_SEARCH_LENGTH: 100,
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
