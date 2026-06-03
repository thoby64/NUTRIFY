/**
 * Permissions Control Module
 * Handles role-based UI visibility and access control
 */

const PermissionManager = {
    /**
     * Current user role
     */
    currentRole: null,

    /**
     * Permission mapping for each role
     */
    permissions: {
        admin: {
            canManageUsers: true,
            canManageAdmins: true,
            canManageManagers: true,
            canManageNutritionists: true,
            canAccessAllData: true,
            canImportData: true,
            canManageFoods: true,
            canManageFoodGroups: true,
            canManageNutrients: true,
            canManageNutrientTypes: true,
            canCreateMealPlans: true,
            canViewAnalytics: true,
            canResetPasswords: true,
            canChangePassword: true,
            canViewDashboard: true,
            dashboardPath: 'admin/'
        },
        manager: {
            canManageUsers: false,
            canManageAdmins: false,
            canManageManagers: false,
            canManageNutritionists: true,
            canAccessAllData: true,
            canImportData: false,
            canManageFoods: false,
            canManageFoodGroups: false,
            canManageNutrients: false,
            canManageNutrientTypes: false,
            canCreateMealPlans: true,
            canViewAnalytics: true,
            canResetPasswords: false,
            canChangePassword: true,
            canViewDashboard: true,
            dashboardPath: 'manager/'
        },
        nutritionist: {
            canManageUsers: false,
            canManageAdmins: false,
            canManageManagers: false,
            canManageNutritionists: false,
            canAccessAllData: false,
            canImportData: false,
            canManageFoods: false,
            canManageFoodGroups: false,
            canManageNutrients: false,
            canManageNutrientTypes: false,
            canCreateMealPlans: true,
            canViewAnalytics: false,
            canResetPasswords: false,
            canChangePassword: true,
            canViewDashboard: true,
            dashboardPath: 'nutritionist/'
        },
        editor: {
            canManageUsers: false,
            canManageAdmins: false,
            canManageManagers: false,
            canManageNutritionists: false,
            canAccessAllData: false,
            canImportData: false,
            canManageFoods: false,
            canManageFoodGroups: false,
            canManageNutrients: false,
            canManageNutrientTypes: false,
            canCreateMealPlans: true,
            canViewAnalytics: false,
            canResetPasswords: false,
            canChangePassword: true,
            canViewDashboard: true,
            dashboardPath: 'nutritionist/'
        }
    },

    /**
     * Initialize permissions based on user role
     */
    init(userRole) {
        this.currentRole = userRole ? userRole.toLowerCase() : null;
        this.applyPermissions();
    },

    /**
     * Check if current user has specific permission
     */
    can(permission) {
        if (!this.currentRole || !this.permissions[this.currentRole]) {
            return false;
        }
        return this.permissions[this.currentRole][permission] === true;
    },

    /**
     * Check if current user can access any of the given permissions
     */
    canAny(permissions) {
        return permissions.some(permission => this.can(permission));
    },

    /**
     * Check if current user has all of the given permissions
     */
    canAll(permissions) {
        return permissions.every(permission => this.can(permission));
    },

    /**
     * Get current user's dashboard path
     */
    getDashboardPath() {
        if (!this.currentRole || !this.permissions[this.currentRole]) {
            return '/login';
        }
        return this.permissions[this.currentRole].dashboardPath;
    },

    /**
     * Apply visibility rules to UI elements
     */
    applyPermissions() {
        // Hide elements based on permissions
        this.hideRestrictedElements();
        this.disableRestrictedActions();
    },

    /**
     * Hide elements that user doesn't have permission to see
     */
    hideRestrictedElements() {
        // Hide user management sections for non-admins
        if (!this.can('canManageUsers')) {
            document.querySelectorAll('[data-permission="manage-users"]').forEach(el => {
                el.style.display = 'none';
            });
        }

        // Hide import data for non-admins
        if (!this.can('canImportData')) {
            document.querySelectorAll('[data-permission="import-data"]').forEach(el => {
                el.style.display = 'none';
            });
        }

        // Hide food management sections
        if (!this.can('canManageFoods')) {
            document.querySelectorAll('[data-permission="manage-foods"]').forEach(el => {
                el.style.display = 'none';
            });
        }

        // Hide nutrient management sections
        if (!this.can('canManageNutrients')) {
            document.querySelectorAll('[data-permission="manage-nutrients"]').forEach(el => {
                el.style.display = 'none';
            });
        }

        // Hide analytics for non-managers/admins
        if (!this.can('canViewAnalytics')) {
            document.querySelectorAll('[data-permission="view-analytics"]').forEach(el => {
                el.style.display = 'none';
            });
        }

        // Hide nutritionist management for managers
        if (!this.can('canManageNutritionists')) {
            document.querySelectorAll('[data-permission="manage-nutritionists"]').forEach(el => {
                el.style.display = 'none';
            });
        }
    },

    /**
     * Disable elements that user can't interact with
     */
    disableRestrictedActions() {
        // Disable user management buttons
        if (!this.can('canManageUsers')) {
            document.querySelectorAll('[data-action="add-user"]').forEach(el => {
                el.disabled = true;
                el.title = 'You do not have permission to add users';
            });
        }

        // Disable import buttons
        if (!this.can('canImportData')) {
            document.querySelectorAll('[data-action="import-data"]').forEach(el => {
                el.disabled = true;
                el.title = 'You do not have permission to import data';
            });
        }

        // Disable food management buttons
        if (!this.can('canManageFoods')) {
            document.querySelectorAll('[data-action="add-food"]').forEach(el => {
                el.disabled = true;
            });
            document.querySelectorAll('[data-action="edit-food"]').forEach(el => {
                el.disabled = true;
            });
            document.querySelectorAll('[data-action="delete-food"]').forEach(el => {
                el.disabled = true;
            });
        }
    },

    /**
     * Check if element should be visible to current user
     */
    shouldShowElement(element, permission) {
        if (!permission) {
            return true;
        }
        return this.can(permission);
    },

    /**
     * Get role display name
     */
    getRoleDisplayName(role) {
        const displayNames = {
            admin: 'Administrator',
            manager: 'Manager',
            nutritionist: 'Nutritionist',
            editor: 'Editor'
        };
        return displayNames[role] || role;
    },

    /**
     * Check if user has admin role
     */
    isAdmin() {
        return this.currentRole === 'admin';
    },

    /**
     * Check if user has manager role
     */
    isManager() {
        return this.currentRole === 'manager';
    },

    /**
     * Check if user has nutritionist role
     */
    isNutritionist() {
        return this.currentRole === 'nutritionist';
    },

    /**
     * Check if user has editor role
     */
    isEditor() {
        return this.currentRole === 'editor';
    },

    /**
     * Get current role
     */
    getRole() {
        return this.currentRole;
    }
};

/**
 * Helper function to show element conditionally
 */
function showIfPermitted(element, permission) {
    if (!element) return;
    if (PermissionManager.can(permission)) {
        element.style.display = '';
    } else {
        element.style.display = 'none';
    }
}

/**
 * Helper function to enable element conditionally
 */
function enableIfPermitted(element, permission) {
    if (!element) return;
    if (PermissionManager.can(permission)) {
        element.disabled = false;
    } else {
        element.disabled = true;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PermissionManager;
}
