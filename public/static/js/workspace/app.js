const WorkspaceApp = (() => {
    const NAVIGATION = {
        admin: [
            { page: 'dashboard', label: 'Overview', icon: 'fa-chart-line', description: 'Command center', href: './' },
            { page: 'foods', label: 'Foods', icon: 'fa-apple-whole', description: 'Nutrition database', href: 'foods' },
            { page: 'food-groups', label: 'Food Groups', icon: 'fa-layer-group', description: 'Food taxonomy', href: 'food-groups' },
            { page: 'nutrients', label: 'Nutrients', icon: 'fa-vial', description: 'Reference library', href: 'nutrients' },
            { page: 'nutrient-types', label: 'Nutrient Types', icon: 'fa-flask', description: 'Domain grouping', href: 'nutrient-types' },
            { page: 'meal-planning', label: 'Planning Studio', icon: 'fa-calendar-days', description: 'Modern planner', href: 'meal-planning' },
            { page: 'meal-plans', label: 'Plan Registry', icon: 'fa-folder-tree', description: 'Saved plans', href: 'meal-plans' },
            { page: 'users', label: 'Users', icon: 'fa-users-cog', description: 'Access control', href: 'users' },
            { page: 'import', label: 'Imports & Exports', icon: 'fa-file-arrow-up', description: 'Admin data tools', href: 'import' }
        ],
        manager: [
            { page: 'dashboard', label: 'Overview', icon: 'fa-chart-pie', description: 'Team summary', href: './' },
            { page: 'foods', label: 'Foods', icon: 'fa-apple-whole', description: 'Browse database', href: 'foods' },
            { page: 'food-groups', label: 'Food Groups', icon: 'fa-layer-group', description: 'Taxonomy view', href: 'food-groups' },
            { page: 'nutrients', label: 'Nutrients', icon: 'fa-vial', description: 'Reference library', href: 'nutrients' },
            { page: 'nutrient-types', label: 'Nutrient Types', icon: 'fa-flask', description: 'Category overview', href: 'nutrient-types' },
            { page: 'meal-planning', label: 'Planning Studio', icon: 'fa-calendar-days', description: 'Multi-day foundation', href: 'meal-planning' },
            { page: 'meal-plans', label: 'Plan Registry', icon: 'fa-folder-tree', description: 'Saved plans', href: 'meal-plans' },
            { page: 'nutritionists', label: 'Nutritionists', icon: 'fa-user-doctor', description: 'Team management', href: 'nutritionists' },
            { page: 'analytics', label: 'Analytics', icon: 'fa-wave-square', description: 'Team performance', href: 'analytics' }
        ],
        nutritionist: [
            { page: 'dashboard', label: 'Overview', icon: 'fa-sparkles', description: 'Daily workspace', href: './' },
            { page: 'foods', label: 'Foods', icon: 'fa-apple-whole', description: 'Find ingredients', href: 'foods' },
            { page: 'nutrients', label: 'Nutrients', icon: 'fa-vial', description: 'Reference library', href: 'nutrients' },
            { page: 'meal-planning', label: 'Planning Studio', icon: 'fa-calendar-days', description: 'Planner hub', href: 'meal-planning' },
            { page: 'meal-plans', label: 'Plan Library', icon: 'fa-folder-tree', description: 'Your plan history', href: 'meal-plans' }
        ]
    };

    const PAGE_META = {
        dashboard: {
            title: 'Workspace Overview',
            description: 'A modern, dedicated workspace for the responsibilities that belong to this role.'
        },
        profile: {
            title: 'Your Profile',
            description: 'View and update your profile information and credentials.'
        },
        foods: {
            title: 'Foods',
            description: 'Browse and search the nutrition database in a dedicated workspace.'
        },
        'food-groups': {
            title: 'Food Groups',
            description: 'See the current food taxonomy and group-level counts in its own focused page.'
        },
        nutrients: {
            title: 'Nutrients',
            description: 'Explore nutrient references, units, and food coverage without leaving the workspace.'
        },
        'nutrient-types': {
            title: 'Nutrient Types',
            description: 'Review nutrient domains and their structure in a clean, dedicated page.'
        },
        'meal-planning': {
            title: 'Planning Studio',
            description: 'Create and manage multi-day nutrition plans for clients safely and efficiently.'
        },
        'plan-workspace': {
            title: 'Plan Workspace',
            description: 'A focused editing view for one selected nutrition plan.'
        },
        'meal-plans': {
            title: 'Plan Registry',
            description: 'View, manage, and download all saved nutrition plans.'
        },
        users: {
            title: 'User Management',
            description: 'Admin-only user controls, now separated into their own page.'
        },
        'users-create': {
            title: 'Create User',
            description: 'Add a new user to the system.'
        },
        'users-edit': {
            title: 'Edit User',
            description: 'Update user information and settings.'
        },
        import: {
            title: 'Imports & Exports',
            description: 'Protect the admin data tooling with a focused page for upload, export, and reset tasks.'
        },
        nutritionists: {
            title: 'Nutritionist Team',
            description: 'Manager controls for nutritionist accounts and lifecycle management.'
        },
        'nutritionists-create': {
            title: 'Create Nutritionist',
            description: 'Add a new nutritionist to your team.'
        },
        'nutritionists-edit': {
            title: 'Edit Nutritionist',
            description: 'Update nutritionist information and settings.'
        },
        analytics: {
            title: 'Analytics',
            description: 'Manager reporting for activity, plans, meals, and operational visibility.'
        }
    };

    async function bootstrap() {
        const root = document.getElementById('workspaceRoot');
        const role = document.body.dataset.role;
        const page = document.body.dataset.page;
        const user = WorkspaceCore.ensureAuthenticated(role);
        if (!root || !role || !page || !user) return;

        renderShell(root, role, page, user);
        bindShellEvents();
        await loadPage({ role, page, user });
    }

    function renderShell(root, role, page, user) {
        const roleNav = NAVIGATION[role] || [];
        const currentMeta = PAGE_META[page] || { title: page, description: '' };
        const currentRoleLabel = WorkspaceCore.roleLabel(user.role);

        root.innerHTML = `
            <div class="workspace-shell">
                <aside class="workspace-sidebar" id="workspaceSidebar">
                    <div class="workspace-brand">
                        <div class="d-flex align-items-center gap-3">
                            <span class="workspace-brand-mark">
                                <img src="/images/logo/nutri.png" alt="Nutriqube logo" />
                            </span>
                            <div class="workspace-brand-copy">
                                <h1>Nutriqube</h1>
                                <p>${WorkspaceCore.escapeHtml(currentRoleLabel)} workspace</p>
                            </div>
                        </div>
                    </div>
                    <span class="workspace-role-badge">
                        <i class="fas fa-shield-heart"></i>
                        Dedicated ${WorkspaceCore.escapeHtml(currentRoleLabel)} area
                    </span>
                    <nav class="workspace-nav">
                        <div class="workspace-nav-label">Pages</div>
                        ${roleNav.map((item) => {
                            let href = item.href;
                            if (!href.startsWith('/')) {
                                href = item.href === './' ? `/${role}` : `/${role}/${item.href}`;
                            }
                            return `
                            <a class="workspace-nav-item ${(item.page === page || (page === 'plan-workspace' && item.page === 'meal-planning')) ? 'active' : ''}" href="${href}">
                                <i class="fas ${item.icon}"></i>
                                <span class="workspace-nav-copy">
                                    <strong>${WorkspaceCore.escapeHtml(item.label)}</strong>
                                    <span>${WorkspaceCore.escapeHtml(item.description)}</span>
                                </span>
                            </a>
                        `;
                        }).join('')}
                    </nav>
                    <div class="workspace-sidebar-foot">
                        <h2>Nutrition Planning</h2>
                        <p>Create and manage comprehensive meal plans with detailed nutrient tracking.</p>
                        <a href="meal-planning">Start Planning</a>
                    </div>
                </aside>
                <button class="workspace-sidebar-backdrop" id="workspaceSidebarBackdrop" type="button" aria-label="Close sidebar"></button>
                <main class="workspace-main">
                    <header class="workspace-topbar">
                        <div>
                            <button class="workspace-btn-secondary workspace-toggle" id="workspaceSidebarToggle" type="button" aria-expanded="false" aria-controls="workspaceSidebar">
                                <i class="fas fa-bars"></i>
                            </button>
                            <h2>${WorkspaceCore.escapeHtml(currentMeta.title)}</h2>
                            <p>${WorkspaceCore.escapeHtml(currentMeta.description)}</p>
                        </div>
                        <div class="workspace-toolbar">
                            <div class="workspace-user-dropdown" id="workspaceUserDropdown">
                                <button class="workspace-user-btn" id="workspaceUserMenuBtn" type="button">
                                    <span class="workspace-user-avatar">${WorkspaceCore.escapeHtml(WorkspaceCore.initials(user))}</span>
                                    <div>
                                        <strong>${WorkspaceCore.escapeHtml(user.full_name || user.username || 'User')}</strong>
                                        <span>${WorkspaceCore.escapeHtml(currentRoleLabel)}</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </header>
                    <section class="workspace-section">
                        <div id="workspacePageBody"></div>
                    </section>
                </main>
            </div>
        `;
    }

    function bindShellEvents() {
        // Profile dropdown menu
        const userDropdown = document.getElementById('workspaceUserDropdown');
        const userMenuBtn = document.getElementById('workspaceUserMenuBtn');
        // Create portal menu at body level to escape stacking contexts
        let userMenu = document.getElementById('workspaceUserMenu');
        if (!userMenu) {
            userMenu = document.createElement('div');
            userMenu.id = 'workspaceUserMenu';
            userMenu.className = 'workspace-user-menu';
            userMenu.innerHTML = `
                <a href="#" id="workspaceProfileLink" class="workspace-menu-item">
                    <i class="fas fa-user"></i> View & Update Profile
                </a>
                <hr class="workspace-menu-divider">
                <button id="workspaceLogoutBtn" class="workspace-menu-item workspace-menu-item-danger" type="button">
                    <i class="fas fa-right-from-bracket"></i> Logout
                </button>
            `;
            document.body.appendChild(userMenu);
        }

        const profileLink = document.getElementById('workspaceProfileLink');

        function positionUserMenu() {
            if (userMenu?.classList.contains('open')) {
                const rect = userMenuBtn.getBoundingClientRect();
                userMenu.style.top = (rect.bottom + 8) + 'px';
                userMenu.style.left = (rect.right - 220) + 'px';
                userMenu.style.right = 'auto';
            }
        }

        userMenuBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            userMenu?.classList.toggle('open');
            positionUserMenu();
        });

        // Reposition menu on scroll and resize
        window.addEventListener('scroll', positionUserMenu);
        window.addEventListener('resize', positionUserMenu);

        profileLink?.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = `/${role}/profile`;
        });

        document.getElementById('workspaceLogoutBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            WorkspaceCore.logout();
        });

        document.addEventListener('click', (e) => {
            if (!userDropdown?.contains(e.target) && !userMenu?.contains(e.target)) {
                userMenu?.classList.remove('open');
            }
        });

        // Sidebar toggle
        const sidebar = document.getElementById('workspaceSidebar');
        const toggle = document.getElementById('workspaceSidebarToggle');
        const backdrop = document.getElementById('workspaceSidebarBackdrop');

        function setSidebarOpen(isOpen) {
            sidebar?.classList.toggle('open', isOpen);
            backdrop?.classList.toggle('open', isOpen);
            toggle?.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }

        toggle?.addEventListener('click', () => {
            const nextState = !sidebar?.classList.contains('open');
            setSidebarOpen(nextState);
        });

        backdrop?.addEventListener('click', () => {
            setSidebarOpen(false);
        });

        document.querySelectorAll('.workspace-nav-item').forEach((link) => {
            link.addEventListener('click', () => {
                setSidebarOpen(false);
            });
        });
    }

    function setPageBody(html) {
        const container = document.getElementById('workspacePageBody');
        if (container) {
            container.innerHTML = html;
        }
    }

    function renderStats(cards) {
        const iconMap = {
            'Plan types': 'fas fa-layer-group',
            'Planning clients': 'fas fa-users',
            'Drafts available': 'fas fa-file-alt',
            'Food groups': 'fas fa-leaf',
            'Plan days': 'fas fa-calendar-days',
            'Meals in plan': 'fas fa-utensils',
            'Foods assigned': 'fas fa-apple-alt',
            'Final versions': 'fas fa-archive',
            'Planning Clients': 'fas fa-users',
            'Total Foods': 'fas fa-apple-alt',
            'Food Groups': 'fas fa-leaf',
            'Total Nutrients': 'fas fa-vial',
            'Data Points': 'fas fa-database'
        };
        return `
            <div class="workspace-stat-grid">
                ${cards.map((card, index) => {
                    const icon = iconMap[card.label] || 'fas fa-chart-line';
                    const colors = ['primary', 'success', 'warning', 'info'];
                    const colorClass = colors[index % colors.length];
                    return `
                    <article class="workspace-stat-card workspace-stat-card--${colorClass}">
                        <div class="workspace-stat-card__icon">
                            <i class="${icon}"></i>
                        </div>
                        <div class="workspace-stat-card__content">
                            <strong class="workspace-stat-card__value">${WorkspaceCore.escapeHtml(card.value)}</strong>
                            <span class="workspace-stat-card__label">${WorkspaceCore.escapeHtml(card.label)}</span>
                            <p class="workspace-stat-card__caption">${WorkspaceCore.escapeHtml(card.caption || '')}</p>
                        </div>
                    </article>
                `;
                }).join('')}
            </div>
        `;
    }

    async function loadPage(context) {
        const loaders = {
            dashboard: renderDashboard,
            foods: renderFoods,
            'food-groups': renderFoodGroups,
            nutrients: renderNutrients,
            'nutrient-types': renderNutrientTypes,
            import: renderImportTools,
            users: renderUsers,
            'users-create': renderUsersCreate,
            'users-edit': renderUsersEdit,
            nutritionists: renderNutritionists,
            'nutritionists-create': renderNutritionistsCreate,
            'nutritionists-edit': renderNutritionistsEdit,
            analytics: renderAnalytics,
            'meal-planning': renderPlanningStudio,
            'plan-workspace': renderPlanningStudio,
            'meal-plans': renderPlanRegistry,
            profile: renderProfile
        };

        const loader = loaders[context.page];
        if (!loader) {
            setPageBody('<div class="workspace-empty">This page is not available yet.</div>');
            return;
        }

        try {
            await loader(context);
        } catch (error) {
            console.error(error);
            WorkspaceCore.showAlert(error.message || 'Something went wrong loading this page.', 'error');
            setPageBody(`
                <div class="workspace-panel">
                    <div class="workspace-panel-body">
                        <div class="workspace-empty">
                            ${WorkspaceCore.escapeHtml(error.message || 'This page could not be loaded.')}
                        </div>
                    </div>
                </div>
            `);
        }
    }

    async function renderDashboard(context) {
        if (context.role === 'admin') {
            await renderAdminDashboard();
            return;
        }
        if (context.role === 'manager') {
            await renderManagerDashboard();
            return;
        }
        await renderNutritionistDashboard();
    }

    async function renderAdminDashboard() {
        const [foods, foodGroups, nutrients, plans, users] = await Promise.all([
            WorkspaceCore.apiJson('/api/v1/foods?limit=1'),
            WorkspaceCore.apiJson('/api/v1/food-groups?limit=1'),
            WorkspaceCore.apiJson('/api/v1/nutrients?limit=1'),
            WorkspaceCore.apiJson('/api/v1/plans'),
            WorkspaceCore.apiJson('/api/v1/admin/users?limit=5')
        ]);

        setPageBody(`
            <section class="workspace-hero">
                <div>
                    <h3>Admin operations are organized into smarter, dedicated workspaces.</h3>
                    <p>Manage nutrition data, user access, planning, and exports from clean, role-aligned pages instead of one crowded dashboard.</p>
                </div>
                <div class="workspace-grid">
                    <div class="workspace-hero-metric">
                        <span>Production focus</span>
                        <strong>Dedicated workspaces</strong>
                    </div>
                    <div class="workspace-hero-metric">
                        <span>Modern workflows</span>
                        <strong>Clean ownership boundaries</strong>
                    </div>
                </div>
            </section>
            ${renderStats([
                { label: 'Foods', value: String(foods.total || 0), caption: 'Nutrition records available' },
                { label: 'Food Groups', value: String(foodGroups.total || 0), caption: 'Taxonomy buckets' },
                { label: 'Nutrients', value: String(nutrients.total || 0), caption: 'Reference nutrients' },
                { label: 'Plan inventory', value: String(plans.total || 0), caption: 'Existing plans' },
                { label: 'Users', value: String(users.total || 0), caption: 'Accounts in the platform' }
            ])}
            <div class="workspace-grid two">
                <article class="workspace-panel">
                    <div class="workspace-panel-head">
                        <div>
                            <h3>Priority admin zones</h3>
                            <p>Use dedicated pages for tasks that previously lived inside one screen.</p>
                        </div>
                    </div>
                    <div class="workspace-panel-body workspace-card-list">
                        <a class="workspace-nav-item active" href="import"><i class="fas fa-file-arrow-up"></i><span class="workspace-nav-copy"><strong>Import center</strong><span>Upload CSV/SQL, export, and reset data.</span></span></a>
                        <a class="workspace-nav-item active" href="users"><i class="fas fa-users-cog"></i><span class="workspace-nav-copy"><strong>User controls</strong><span>Create and manage accounts safely.</span></span></a>
                        <a class="workspace-nav-item active" href="meal-planning"><i class="fas fa-calendar-days"></i><span class="workspace-nav-copy"><strong>Planning studio</strong><span>Open the dedicated multi-day planning workspace.</span></span></a>
                    </div>
                </article>
                <article class="workspace-panel">
                    <div class="workspace-panel-head">
                        <div>
                            <h3>Recent users</h3>
                            <p>A quick snapshot from the admin user registry.</p>
                        </div>
                    </div>
                    <div class="workspace-panel-body">
                        ${WorkspaceCore.renderTable([
                            { label: 'Username', key: 'username' },
                            { label: 'Role', render: (row) => `<span class="workspace-pill">${WorkspaceCore.escapeHtml(row.role)}</span>` },
                            { label: 'Status', render: (row) => `<span class="workspace-pill ${row.is_active ? '' : 'warning'}">${row.is_active ? 'Active' : 'Inactive'}</span>` },
                            { label: 'Updated', render: (row) => WorkspaceCore.escapeHtml(WorkspaceCore.formatDate(row.updated_at)) }
                        ], users.users || [], 'No users found yet.')}
                    </div>
                </article>
            </div>
        `);
    }

    async function renderManagerDashboard() {
        const [foods, foodGroups, nutrients, plans, nutritionists, analytics] = await Promise.all([
            WorkspaceCore.apiJson('/api/v1/foods?limit=1'),
            WorkspaceCore.apiJson('/api/v1/food-groups?limit=1'),
            WorkspaceCore.apiJson('/api/v1/nutrients?limit=1'),
            WorkspaceCore.apiJson('/api/v1/plans'),
            WorkspaceCore.apiJson('/api/v1/manager/nutritionists?limit=5'),
            WorkspaceCore.apiJson('/api/v1/manager/analytics')
        ]);

        setPageBody(`
            <section class="workspace-hero">
                <div>
                   <h3>Advanced Manager Dashboard Control Center</h3>
                    <p>Lead strategic planning, elevate the nutrition catalog, and empower your team through a streamlined, professional management experience.</p>
                </div>
                <div class="workspace-grid">
                    <div class="workspace-hero-metric">
                        <span>Nutritionists</span>
                        <strong>${WorkspaceCore.escapeHtml(String(nutritionists.total || 0))}</strong>
                    </div>
                    <div class="workspace-hero-metric">
                        <span>Plans created by you</span>
                        <strong>${WorkspaceCore.escapeHtml(String(analytics.total_plans_created || 0))}</strong>
                    </div>
                </div>
            </section>
            ${renderStats([
                { label: 'Foods', value: String(foods.total || 0), caption: 'Database coverage' },
                { label: 'Food Groups', value: String(foodGroups.total || 0), caption: 'Available categories' },
                { label: 'Nutrients', value: String(nutrients.total || 0), caption: 'Reference nutrients' },
                { label: 'Legacy Plans', value: String(plans.total || 0), caption: 'Current plan inventory' },
                { label: 'Meals Created', value: String(analytics.total_meals_created || 0), caption: 'Manager activity' }
            ])}
            <div class="workspace-grid two">
                <article class="workspace-panel">
                    <div class="workspace-panel-head">
                        <div>
                            <h3>Team snapshot</h3>
                            <p>Recent nutritionists under the manager domain.</p>
                        </div>
                    </div>
                    <div class="workspace-panel-body">
                        ${WorkspaceCore.renderTable([
                            { label: 'Username', key: 'username' },
                            { label: 'Name', key: 'full_name' },
                            { label: 'Status', render: (row) => `<span class="workspace-pill ${row.is_active ? '' : 'warning'}">${row.is_active ? 'Active' : 'Inactive'}</span>` },
                            { label: 'Updated', render: (row) => WorkspaceCore.escapeHtml(WorkspaceCore.formatDate(row.updated_at)) }
                        ], nutritionists.nutritionists || [], 'No nutritionists found yet.')}
                    </div>
                </article>
                <article class="workspace-panel">
                    <div class="workspace-panel-head">
                        <div>
                            <h3>Quick paths</h3>
                            <p>Use quick links below for quick access to your most-used features.</p>
                        </div>
                    </div>
                    <div class="workspace-panel-body workspace-card-list">
                        <a class="workspace-nav-item active" href="nutritionists"><i class="fas fa-user-doctor"></i><span class="workspace-nav-copy"><strong>Nutritionist team</strong><span>Create and manage nutritionist accounts.</span></span></a>
                        <a class="workspace-nav-item active" href="analytics"><i class="fas fa-wave-square"></i><span class="workspace-nav-copy"><strong>Analytics</strong><span>Review team outputs and plan activity.</span></span></a>
                        <a class="workspace-nav-item active" href="meal-planning"><i class="fas fa-calendar-days"></i><span class="workspace-nav-copy"><strong>Planning studio</strong><span>Open the planning studio.</span></span></a>
                    </div>
                </article>
            </div>
        `);
    }

    async function renderNutritionistDashboard() {
        const [foods, nutrients, clients, plans] = await Promise.all([
            WorkspaceCore.apiJson('/api/v1/foods?limit=1'),
            WorkspaceCore.apiJson('/api/v1/nutrients?limit=1'),
            WorkspaceCore.apiJson('/api/v2/planning/clients'),
            WorkspaceCore.apiJson('/api/v2/planning/plans')
        ]);

        setPageBody(`
            <section class="workspace-hero">
                <div>
                    <h3>Focused multi-day planning in a privacy-safe workspace.</h3>
                    <p>Foods, nutrients, and plan-building are organized for fast, confident recommendations while sensitive client details stay protected.</p>
                </div>
                <div class="workspace-grid">
                    <div class="workspace-hero-metric">
                        <span>Planning clients</span>
                        <strong>${WorkspaceCore.escapeHtml(String(clients.total || 0))}</strong>
                    </div>
                    <div class="workspace-hero-metric">
                        <span>Plans</span>
                        <strong>${WorkspaceCore.escapeHtml(String(plans.total || 0))}</strong>
                    </div>
                </div>
            </section>
            ${renderStats([
                { label: 'Foods', value: String(foods.total || 0), caption: 'Searchable items' },
                { label: 'Nutrients', value: String(nutrients.total || 0), caption: 'Reference metrics' },
                { label: 'Planning Clients', value: String(clients.total || 0), caption: 'Privacy-safe profiles' },
                { label: 'Plans', value: String(plans.total || 0), caption: 'Plan drafts' }
            ])}
            <div class="workspace-grid two">
                <article class="workspace-panel">
                    <div class="workspace-panel-head">
                        <div>
                            <h3>Planning Digitally</h3>
                            <p>Build plans faster with a clear workflow and intelligent access to foods, nutrients, and plan history.</p>
                        </div>
                    </div>
                    <div class="workspace-panel-body">
                        <div class="workspace-callout">
                            <strong>Dedicated planning workflow</strong>
                            Foods, nutrients, and plan history are organized into connected, purpose-built pages for a more focused planning experience.
                        </div>
                    </div>
                </article>
                <article class="workspace-panel">
                    <div class="workspace-panel-head">
                        <div>
                            <h3>Next best action</h3>
                            <p>Start with the planning studio to create privacy-safe client records and multi-day plan drafts.</p>
                        </div>
                    </div>
                    <div class="workspace-panel-body workspace-inline-actions">
                        <a class="workspace-btn" href="meal-planning">Open planning studio</a>
                        <a class="workspace-btn-secondary" href="foods">Browse foods</a>
                    </div>
                </article>
            </div>
        `);
    }

    async function renderFoods() {
        setPageBody(`
            <article class="workspace-panel">
                <div class="workspace-panel-head">
                    <div>
                        <h3>Food catalog</h3>
                        <p>Search and filter foods with a cleaner dedicated page.</p>
                    </div>
                </div>
                <div class="workspace-panel-body">
                    <div class="workspace-form-grid">
                        <div class="workspace-field">
                            <label for="foodsSearchInput">Search foods</label>
                            <input id="foodsSearchInput" type="text" placeholder="e.g. banana, oat, lentils">
                        </div>
                        <div class="workspace-field">
                            <label for="foodsGroupSelect">Food group</label>
                            <select id="foodsGroupSelect">
                                <option value="">All groups</option>
                            </select>
                        </div>
                    </div>
                    <div class="workspace-inline-actions mt-3">
                        <button class="workspace-btn" id="foodsSearchBtn" type="button">Refresh foods</button>
                    </div>
                    <div id="foodsResults" class="mt-4"></div>
                </div>
            </article>
        `);

        const searchInput = document.getElementById('foodsSearchInput');
        const groupSelect = document.getElementById('foodsGroupSelect');
        const results = document.getElementById('foodsResults');

        async function loadFoods() {
            results.innerHTML = '<div class="workspace-empty">Loading foods…</div>';
            const [groups, foods] = await Promise.all([
                WorkspaceCore.apiJson(`/api/v1/food-groups?limit=200&search=`),
                WorkspaceCore.apiJson(`/api/v1/foods?limit=150${searchInput.value.trim() ? `&search=${encodeURIComponent(searchInput.value.trim())}` : ''}${groupSelect.value ? `&food_group_id=${encodeURIComponent(groupSelect.value)}` : ''}`)
            ]);

            const currentOptions = new Set(Array.from(groupSelect.options).map((option) => option.value));
            (groups.data || []).forEach((group) => {
                if (!currentOptions.has(String(group.id))) {
                    const option = document.createElement('option');
                    option.value = String(group.id);
                    option.textContent = `${group.name} (${group.foods_count})`;
                    groupSelect.appendChild(option);
                }
            });

            results.innerHTML = `
                <div class="workspace-callout mb-3">
                    <strong>${WorkspaceCore.escapeHtml(String(foods.total || 0))} foods available</strong>
                    Browse the complete nutrition database with detailed nutrient information for each food.
                </div>
                ${WorkspaceCore.renderTable([
                    { label: 'Name', key: 'name' },
                    { label: 'Group', render: (row) => `<span class="workspace-pill">${WorkspaceCore.escapeHtml(row.food_group_name || 'Unknown')}</span>` },
                    { label: 'Code', key: 'code' },
                    { label: 'Nutrients', render: (row) => WorkspaceCore.escapeHtml(String(row.nutrients_count || 0)) },
                    { label: 'Created', render: (row) => WorkspaceCore.escapeHtml(WorkspaceCore.formatDate(row.created_at)) }
                ], foods.data || [], 'No foods match the current filters.')}
            `;
        }

        document.getElementById('foodsSearchBtn')?.addEventListener('click', loadFoods);
        groupSelect?.addEventListener('change', loadFoods);
        searchInput?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                loadFoods();
            }
        });

        await loadFoods();
    }

    async function renderFoodGroups() {
        const groups = await WorkspaceCore.apiJson('/api/v1/food-groups?limit=200');
        setPageBody(`
            <article class="workspace-panel">
                <div class="workspace-panel-head">
                    <div>
                        <h3>Food group structure</h3>
                        <p>This dedicated page keeps taxonomy review separate from planning work.</p>
                    </div>
                </div>
                <div class="workspace-panel-body">
                    ${WorkspaceCore.renderTable([
                        { label: 'Name', key: 'name' },
                        { label: 'Foods', render: (row) => `<span class="workspace-pill">${WorkspaceCore.escapeHtml(String(row.foods_count || 0))}</span>` },
                        { label: 'Description', key: 'description' }
                    ], groups.data || [], 'No food groups available.')}
                </div>
            </article>
        `);
    }

    async function renderNutrients() {
        setPageBody(`
            <article class="workspace-panel">
                <div class="workspace-panel-head">
                    <div>
                        <h3>Planner Condition Reference</h3>
                        <p>Use this live nutrient catalog to see the exact codes, names, units, and accepted aliases that work in meal-condition food filtering.</p>
                    </div>
                </div>
                <div class="workspace-panel-body">
                    <div class="workspace-callout mb-3">
                        <strong>Best practice for planner filters:</strong> use nutrient codes such as <code>ENERGY_KC</code>, <code>PROCNT</code>, <code>CHOCDF</code>, <code>FAT</code>, <code>FIBTG</code>, and <code>NA</code>. Friendly aliases still work when available.
                    </div>
                    <div class="workspace-form-grid">
                        <div class="workspace-field span-2">
                            <label for="nutrientsSearchInput">Search codes, names, units, or aliases</label>
                            <input id="nutrientsSearchInput" type="text" placeholder="e.g. ENERGY_KC, protein, iron, vitamin c, sodium">
                        </div>
                    </div>
                    <div class="workspace-inline-actions mt-3">
                        <button class="workspace-btn" id="nutrientsSearchBtn" type="button">Refresh reference</button>
                    </div>
                    <div id="nutrientsResults" class="mt-4"></div>
                </div>
            </article>
        `);

        const searchInput = document.getElementById('nutrientsSearchInput');
        const results = document.getElementById('nutrientsResults');

        async function loadNutrients() {
            results.innerHTML = '<div class="workspace-empty">Loading nutrients…</div>';
            const [nutrients, planningMeta] = await Promise.all([
                WorkspaceCore.apiJson('/api/v1/nutrients?limit=1000'),
                WorkspaceCore.apiJson('/api/v2/planning/meta'),
            ]);
            const aliasMap = planningMeta.condition_aliases || {};
            const term = searchInput.value.trim().toLowerCase();
            const rows = (nutrients.data || []).map((row) => {
                const code = row.name || '';
                const label = row.abbreviation || row.name || '';
                const aliases = aliasMap[code] || [];
                return {
                    ...row,
                    accepted_aliases: aliases,
                    planner_display_label: label,
                };
            }).filter((row) => {
                if (!term) {
                    return true;
                }
                const haystack = [
                    row.name,
                    row.abbreviation,
                    row.unit,
                    row.nutrient_type_name,
                    ...(row.accepted_aliases || []),
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                return haystack.includes(term);
            });
            results.innerHTML = `
                <div class="workspace-callout mb-3">
                    <strong>${WorkspaceCore.escapeHtml(String(rows.length || 0))} nutrients visible</strong>
                    This reference is built from live nutrient records plus the planner's accepted alias dictionary.
                </div>
                ${WorkspaceCore.renderTable([
                    { label: 'Code', key: 'name' },
                    { label: 'Name', render: (row) => WorkspaceCore.escapeHtml(row.planner_display_label || row.name || '—') },
                    { label: 'Unit', key: 'unit' },
                    { label: 'Type', render: (row) => `<span class="workspace-pill soft">${WorkspaceCore.escapeHtml(row.nutrient_type_name || 'Unknown')}</span>` },
                    { label: 'Accepted words', render: (row) => WorkspaceCore.escapeHtml((row.accepted_aliases || []).join(', ') || 'Use the nutrient code') },
                    { label: 'Foods', render: (row) => WorkspaceCore.escapeHtml(String(row.nutrients_count || 0)) }
                ], rows, 'No nutrients match the current search.')}
            `;
        }

        document.getElementById('nutrientsSearchBtn')?.addEventListener('click', loadNutrients);
        searchInput?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                loadNutrients();
            }
        });

        await loadNutrients();
    }

    async function renderNutrientTypes() {
        const nutrientTypes = await WorkspaceCore.apiJson('/api/v1/nutrient-types?limit=100');
        setPageBody(`
            <article class="workspace-panel">
                <div class="workspace-panel-head">
                    <div>
                        <h3>Nutrient type catalog</h3>
                        <p>Category-level review for the nutrient reference model.</p>
                    </div>
                </div>
                <div class="workspace-panel-body">
                    ${WorkspaceCore.renderTable([
                        { label: 'Name', key: 'name' },
                        { label: 'Category', key: 'category' },
                        { label: 'Contained Nutrients', render: (row) => `<span class="workspace-pill">${WorkspaceCore.escapeHtml(String(row.nutrients_count || 0))}</span>` }
                    ], nutrientTypes.data || [], 'No nutrient types available.')}
                </div>
            </article>
        `);
    }

    async function renderUsers() {
        setPageBody(`
            <div class="workspace-grid">
                <article class="workspace-panel">
                    <div class="workspace-panel-head">
                        <div>
                            <h3>User registry</h3>
                            <p>Manage all users in the system. Create, edit, deactivate, or delete accounts.</p>
                        </div>
                        <a href="users/create" class="workspace-btn">
                            <i class="fas fa-plus"></i> Create user
                        </a>
                    </div>
                    <div class="workspace-panel-body">
                        <div class="workspace-form-inline" style="gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
                            <div class="workspace-field" style="flex: 1; min-width: 200px; margin: 0;">
                                <label for="userSearch" style="margin-bottom: 0.5rem;">Search User</label>
                                <input type="text" id="userSearch" placeholder="Search by username, email, or name..." style="width: 100%;">
                            </div>
                            <div class="workspace-field" style="flex: 1; min-width: 150px; margin: 0;">
                                <label for="userStatus" style="margin-bottom: 0.5rem;">Status</label>
                                <select id="userStatus" style="width: 100%;">
                                    <option value="">All Users</option>
                                    <option value="active">Active Only</option>
                                    <option value="inactive">Inactive Only</option>
                                </select>
                            </div>
                            <div class="workspace-field" style="flex: 1; min-width: 150px; margin: 0;">
                                <label for="userRole" style="margin-bottom: 0.5rem;">Role</label>
                                <select id="userRole" style="width: 100%;">
                                    <option value="">All Roles</option>
                                    <option value="ADMIN">Admin</option>
                                    <option value="MANAGER">Manager</option>
                                    <option value="NUTRITIONIST">Nutritionist</option>
                                </select>
                            </div>
                        </div>
                        <div id="adminUsersResults">
                            <div class="workspace-empty">Loading users…</div>
                        </div>
                    </div>
                </article>
            </div>
        `);

        const results = document.getElementById('adminUsersResults');
        let filterTimeout;

        async function loadUsers() {
            const searchQuery = document.getElementById('userSearch')?.value?.trim() || '';
            const statusFilter = document.getElementById('userStatus')?.value || '';
            const roleFilter = document.getElementById('userRole')?.value || '';
            
            const params = new URLSearchParams();
            params.append('limit', '100');
            params.append('include_inactive', 'true');
            if (searchQuery) {
                params.append('search', searchQuery);
            }
            if (roleFilter) {
                params.append('role', roleFilter);
            }
            
            let data = await WorkspaceCore.apiJson(`/admin/users?${params.toString()}`);
            
            // Filter by status on frontend
            if (statusFilter === 'active') {
                data.users = (data.users || []).filter(user => user.is_active === true);
            } else if (statusFilter === 'inactive') {
                data.users = (data.users || []).filter(user => user.is_active === false);
            }
            
            results.innerHTML = WorkspaceCore.renderTable([
                { label: 'Username', key: 'username' },
                { label: 'Role', render: (row) => `<span class="workspace-pill">${WorkspaceCore.escapeHtml(row.role)}</span>` },
                { label: 'Email', key: 'email' },
                { label: 'Status', render: (row) => `<span class="workspace-pill ${row.is_active ? '' : 'warning'}">${row.is_active ? 'Active' : 'Inactive'}</span>` },
                {
                    label: 'Actions',
                    render: (row) => `
                        <div class="workspace-inline-actions">
                            <a href="users/${row.id}/edit" class="workspace-btn-secondary">
                                <i class="fas fa-edit"></i> Edit
                            </a>
                            <button class="workspace-btn-secondary" data-user-action="toggle" data-user-id="${row.id}" data-user-active="${row.is_active}">
                                ${row.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button class="workspace-btn-danger" data-user-action="delete" data-user-id="${row.id}">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    `
                }
            ], data.users || [], 'No users found yet.');

            results.querySelectorAll('[data-user-action="toggle"]').forEach((button) => {
                button.addEventListener('click', async () => {
                    try {
                        await WorkspaceCore.apiJson(`/admin/users/${button.dataset.userId}`, {
                            method: 'PUT',
                            body: { is_active: button.dataset.userActive !== 'true' }
                        });
                        WorkspaceCore.showAlert('User status updated.', 'success');
                        await loadUsers();
                    } catch (error) {
                        WorkspaceCore.showAlert(error.message, 'error');
                    }
                });
            });

            results.querySelectorAll('[data-user-action="delete"]').forEach((button) => {
                button.addEventListener('click', async () => {
                    await showDeleteConfirmationModal({
                        title: 'Delete User',
                        userId: button.dataset.userId,
                        endpoint: '/admin/users',
                        onSuccess: async () => {
                            WorkspaceCore.showAlert('User deleted successfully.', 'success');
                            await loadUsers();
                        }
                    });
                });
            });
        }
        
        const searchInput = document.getElementById('userSearch');
        const statusSelect = document.getElementById('userStatus');
        const roleSelect = document.getElementById('userRole');
        
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                clearTimeout(filterTimeout);
                filterTimeout = setTimeout(loadUsers, 300);
            });
        }
        
        if (statusSelect) {
            statusSelect.addEventListener('change', loadUsers);
        }
        
        if (roleSelect) {
            roleSelect.addEventListener('change', loadUsers);
        }

        await loadUsers();
    }

    // Email validation helper with debouncing
    function setupEmailValidation(emailInputId, currentEmail = null, showWarning = true) {
        const emailInput = document.getElementById(emailInputId);
        if (!emailInput) return;

        let debounceTimer;
        let errorContainer = emailInput.closest('.workspace-field');

        if (!errorContainer) {
            errorContainer = emailInput.parentElement;
        }

        emailInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            const email = emailInput.value.trim();

            // Remove existing warning
            const existingWarning = errorContainer.querySelector('.email-exists-warning');
            if (existingWarning) existingWarning.remove();

            // If email is empty or same as current, no need to check
            if (!email || email === currentEmail) {
                emailInput.classList.remove('email-error');
                return;
            }

            debounceTimer = setTimeout(async () => {
                try {
                    const response = await fetch(`${CONFIG.BACKEND.API_URL}/auth/check-email-exists`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ email }),
                    });

                    if (!response.ok) throw new Error('Failed to check email');

                    const data = await response.json();

                    if (data.exists && email !== currentEmail) {
                        // Email exists and is different from current
                        emailInput.classList.add('email-error');
                        if (showWarning) {
                            const warning = document.createElement('small');
                            warning.className = 'email-exists-warning';
                            warning.style.cssText = `
                                display: block;
                                color: #dc2626;
                                margin-top: 4px;
                                font-weight: 500;
                            `;
                            warning.innerHTML = '⚠️ This email is already registered in the system';
                            errorContainer.appendChild(warning);
                        }
                    } else {
                        // Email doesn't exist or is same as current
                        emailInput.classList.remove('email-error');
                    }
                } catch (error) {
                    console.error('Email validation error:', error);
                }
            }, 500);
        });
    }

    // Form submission helper to check for email errors
    function checkEmailValidation(emailInputId) {
        const emailInput = document.getElementById(emailInputId);
        if (!emailInput) return true;
        return !emailInput.classList.contains('email-error');
    }

    async function renderUsersCreate() {
        setPageBody(`
            <div class="workspace-grid">
                <article class="workspace-panel">
                    <div class="workspace-panel-head">
                        <div>
                            <h3>Create new user</h3>
                            <p>Add a new user account to the system. Choose an appropriate role for the account's access level.</p>
                        </div>
                    </div>
                    <div class="workspace-panel-body">
                        <form id="userCreateForm" class="workspace-form-grid" autocomplete="off">
                            <div class="workspace-field">
                                <label for="createUsername">Username <span class="workspace-required">*</span></label>
                                <input id="createUsername" name="username" type="text" placeholder="john_doe" autocomplete="off" required>
                                <small class="workspace-help-text">3-50 characters, lowercase letters, numbers, underscores</small>
                            </div>
                            <div class="workspace-field">
                                <label for="createEmail">Email <span class="workspace-required">*</span></label>
                                <input id="createEmail" name="email" type="email" placeholder="user@example.com" required>
                            </div>
                            <div class="workspace-field span-2">
                                <label for="createFullName">Full Name</label>
                                <input id="createFullName" name="full_name" type="text" placeholder="John Doe">
                            </div>
                            <div class="workspace-field">
                                <label for="createPassword">Password <span class="workspace-required">*</span></label>
                                <input id="createPassword" name="password" type="password" placeholder="••••••••" autocomplete="new-password" required>
                                <small class="workspace-help-text">Minimum 8 characters</small>
                            </div>
                            <div class="workspace-field">
                                <label for="createRole">Role <span class="workspace-required">*</span></label>
                                <select id="createRole" name="role" required>
                                    <option value="">Select a role...</option>
                                    <option value="nutritionist">Nutritionist - Can create plans and manage meal planning</option>
                                    <option value="manager">Manager - Can manage team and view analytics</option>
                                    <option value="admin">Admin - Full system access</option>
                                </select>
                            </div>
                            <div class="workspace-inline-actions span-2">
                                <button class="workspace-btn" type="submit">
                                    <i class="fas fa-user-plus"></i> Create user
                                </button>
                                <a href="/admin/users" class="workspace-btn-secondary">Cancel</a>
                            </div>
                        </form>
                    </div>
                </article>
            </div>
        `);

        const form = document.getElementById('userCreateForm');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Validate email not already in use
            if (!checkEmailValidation('createEmail')) {
                WorkspaceCore.showAlert('Please use a different email address', 'error');
                return;
            }

            const formData = new FormData(form);

            try {
                await WorkspaceCore.apiJson('/api/v1/admin/users', {
                    method: 'POST',
                    body: {
                        username: formData.get('username'),
                        email: formData.get('email'),
                        password: formData.get('password'),
                        full_name: formData.get('full_name'),
                        role: formData.get('role')
                    }
                });
                WorkspaceCore.showAlert('User created successfully!', 'success');
                setTimeout(() => window.location.href = '/admin/users', 800);
            } catch (error) {
                WorkspaceCore.showAlert(error.message, 'error');
            }
        });

        // Setup email validation for new user creation
        setupEmailValidation('createEmail', null, true);
    }

    async function renderUsersEdit() {
        const userId = document.body.dataset.resourceId;
        if (!userId) {
            setPageBody('<div class="workspace-empty">User not found.</div>');
            return;
        }

        try {
            const userResponse = await WorkspaceCore.apiJson(`/admin/users/${userId}`);
            const user = userResponse.user || userResponse;

            setPageBody(`
                <div class="workspace-grid">
                    <article class="workspace-panel">
                        <div class="workspace-panel-head">
                            <div>
                                <h3>Edit user: ${WorkspaceCore.escapeHtml(user.full_name || user.username)}</h3>
                                <p>Update user information and account settings.</p>
                            </div>
                        </div>
                        <div class="workspace-panel-body">
                            <form id="userEditForm" class="workspace-form-grid">
                                <div class="workspace-field">
                                    <label for="editUsername">Username <span class="workspace-required">*</span></label>
                                    <input id="editUsername" type="text" value="${WorkspaceCore.escapeHtml(user.username)}" required>
                                    <small class="workspace-help-text">Must be unique, 3-50 characters</small>
                                </div>
                                <div class="workspace-field">
                                    <label for="editEmail">Email <span class="workspace-required">*</span></label>
                                    <input id="editEmail" type="email" value="${WorkspaceCore.escapeHtml(user.email)}" required>
                                </div>
                                <div class="workspace-field span-2">
                                    <label for="editFullName">Full Name</label>
                                    <input id="editFullName" type="text" value="${WorkspaceCore.escapeHtml(user.full_name || '')}">
                                </div>
                                <div class="workspace-field">
                                    <label for="editRole">Role <span class="workspace-required">*</span></label>
                                    <select id="editRole" required>
                                        <option value="nutritionist" ${user.role?.toLowerCase() === 'nutritionist' ? 'selected' : ''}>Nutritionist</option>
                                        <option value="manager" ${user.role?.toLowerCase() === 'manager' ? 'selected' : ''}>Manager</option>
                                        <option value="admin" ${user.role?.toLowerCase() === 'admin' ? 'selected' : ''}>Admin</option>
                                    </select>
                                </div>
                                <div class="workspace-inline-actions span-2">
                                    <button class="workspace-btn" type="submit">
                                        <i class="fas fa-save"></i> Save changes
                                    </button>
                                    <a href="/admin/users" class="workspace-btn-secondary">Cancel</a>
                                </div>
                            </form>
                        </div>
                    </article>
                </div>
            `);

            const form = document.getElementById('userEditForm');
            form?.addEventListener('submit', async (e) => {
                e.preventDefault();

                // Validate email not already in use (only if changed)
                const newEmail = document.getElementById('editEmail').value;
                if (newEmail !== user.email && !checkEmailValidation('editEmail')) {
                    WorkspaceCore.showAlert('Please use a different email address', 'error');
                    return;
                }

                try {
                    await WorkspaceCore.apiJson(`/admin/users/${userId}`, {
                        method: 'PUT',
                        body: {
                            username: document.getElementById('editUsername').value,
                            email: document.getElementById('editEmail').value,
                            full_name: document.getElementById('editFullName').value,
                            role: document.getElementById('editRole').value
                        }
                    });
                    WorkspaceCore.showAlert('User updated successfully!', 'success');
                    setTimeout(() => window.location.href = '/admin/users', 800);
                } catch (error) {
                    WorkspaceCore.showAlert(error.message, 'error');
                }
            });

            // Setup email validation for user edit (only when changed)
            setupEmailValidation('editEmail', user.email, true);
        } catch (error) {
            setPageBody(`<div class="workspace-empty">Error loading user: ${WorkspaceCore.escapeHtml(error.message)}</div>`);
        }
    }

    async function renderNutritionists() {
        setPageBody(`
            <div class="workspace-grid">
                <article class="workspace-panel">
                    <div class="workspace-panel-head">
                        <div>
                            <h3>Nutritionist directory</h3>
                            <p>Manage your team of nutritionists. Create, edit, deactivate, or remove accounts.</p>
                        </div>
                        <a href="nutritionists/create" class="workspace-btn">
                            <i class="fas fa-plus"></i> Add nutritionist
                        </a>
                    </div>
                    <div class="workspace-panel-body">
                        <div class="workspace-form-inline" style="gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
                            <div class="workspace-field" style="flex: 1; min-width: 200px; margin: 0;">
                                <label for="nutritionistSearch" style="margin-bottom: 0.5rem;">Search Nutritionist</label>
                                <input type="text" id="nutritionistSearch" placeholder="Search by username, email, or name..." style="width: 100%;">
                            </div>
                            <div class="workspace-field" style="flex: 1; min-width: 150px; margin: 0;">
                                <label for="nutritionistStatus" style="margin-bottom: 0.5rem;">Status</label>
                                <select id="nutritionistStatus" style="width: 100%;">
                                    <option value="">All Nutritionists</option>
                                    <option value="active">Active Only</option>
                                    <option value="inactive">Inactive Only</option>
                                </select>
                            </div>
                        </div>
                        <div id="managerNutritionistsResults">
                            <div class="workspace-empty">Loading nutritionists…</div>
                        </div>
                    </div>
                </article>
            </div>
        `);

        const results = document.getElementById('managerNutritionistsResults');
        let filterTimeout;

        async function loadNutritionists() {
            const searchQuery = document.getElementById('nutritionistSearch')?.value?.trim() || '';
            const statusFilter = document.getElementById('nutritionistStatus')?.value || '';
            
            const params = new URLSearchParams();
            params.append('limit', '100');
            params.append('include_inactive', 'true');
            if (searchQuery) {
                params.append('search', searchQuery);
            }
            
            let data = await WorkspaceCore.apiJson(`/manager/nutritionists?${params.toString()}`);
            
            // Filter by status on frontend
            if (statusFilter === 'active') {
                data.nutritionists = (data.nutritionists || []).filter(nutritionist => nutritionist.is_active === true);
            } else if (statusFilter === 'inactive') {
                data.nutritionists = (data.nutritionists || []).filter(nutritionist => nutritionist.is_active === false);
            }
            
            results.innerHTML = WorkspaceCore.renderTable([
                { label: 'Username', key: 'username' },
                { label: 'Name', key: 'full_name' },
                { label: 'Email', key: 'email' },
                { label: 'Status', render: (row) => `<span class="workspace-pill ${row.is_active ? '' : 'warning'}">${row.is_active ? 'Active' : 'Inactive'}</span>` },
                {
                    label: 'Actions',
                    render: (row) => `
                        <div class="workspace-inline-actions">
                            <a href="nutritionists/${row.id}/edit" class="workspace-btn-secondary">
                                <i class="fas fa-edit"></i> Edit
                            </a>
                            <button class="workspace-btn-secondary" data-nutritionist-action="toggle" data-nutritionist-id="${row.id}" data-nutritionist-active="${row.is_active}">
                                ${row.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button class="workspace-btn-danger" data-nutritionist-action="delete" data-nutritionist-id="${row.id}">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    `
                }
            ], data.nutritionists || [], 'No nutritionists found yet.');

            results.querySelectorAll('[data-nutritionist-action="toggle"]').forEach((button) => {
                button.addEventListener('click', async () => {
                    try {
                        await WorkspaceCore.apiJson(`/manager/nutritionists/${button.dataset.nutritionistId}`, {
                            method: 'PUT',
                            body: { is_active: button.dataset.nutritionistActive !== 'true' }
                        });
                        WorkspaceCore.showAlert('Nutritionist status updated.', 'success');
                        await loadNutritionists();
                    } catch (error) {
                        WorkspaceCore.showAlert(error.message, 'error');
                    }
                });
            });

            results.querySelectorAll('[data-nutritionist-action="delete"]').forEach((button) => {
                button.addEventListener('click', async () => {
                    await showDeleteConfirmationModal({
                        title: 'Delete Nutritionist',
                        userId: button.dataset.nutritionistId,
                        endpoint: '/manager/nutritionists',
                        onSuccess: async () => {
                            WorkspaceCore.showAlert('Nutritionist deleted successfully.', 'success');
                            await loadNutritionists();
                        }
                    });
                });
            });
        }
        
        const searchInput = document.getElementById('nutritionistSearch');
        const statusSelect = document.getElementById('nutritionistStatus');
        
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                clearTimeout(filterTimeout);
                filterTimeout = setTimeout(loadNutritionists, 300);
            });
        }
        
        if (statusSelect) {
            statusSelect.addEventListener('change', loadNutritionists);
        }

        await loadNutritionists();
    }

    async function renderNutritionistsCreate() {
        setPageBody(`
            <div class="workspace-grid">
                <article class="workspace-panel">
                    <div class="workspace-panel-head">
                        <div>
                            <h3>Add new nutritionist</h3>
                            <p>Create a new nutritionist account for your team. They will be able to create and manage meal plans.</p>
                        </div>
                    </div>
                    <div class="workspace-panel-body">
                        <form id="nutritionistCreateForm" class="workspace-form-grid" autocomplete="off">
                            <div class="workspace-field">
                                <label for="createUsername">Username <span class="workspace-required">*</span></label>
                                <input id="createUsername" name="username" type="text" placeholder="jane_smith" autocomplete="off" required>
                                <small class="workspace-help-text">3-50 characters, lowercase letters, numbers, underscores</small>
                            </div>
                            <div class="workspace-field">
                                <label for="createEmail">Email <span class="workspace-required">*</span></label>
                                <input id="createEmail" name="email" type="email" placeholder="jane@example.com" required>
                            </div>
                            <div class="workspace-field span-2">
                                <label for="createFullName">Full Name</label>
                                <input id="createFullName" name="full_name" type="text" placeholder="Jane Smith">
                            </div>
                            <div class="workspace-field">
                                <label for="createPassword">Password <span class="workspace-required">*</span></label>
                                <input id="createPassword" name="password" type="password" placeholder="••••••••" autocomplete="new-password" required>
                                <small class="workspace-help-text">Minimum 8 characters</small>
                            </div>
                            <div class="workspace-inline-actions span-2">
                                <button class="workspace-btn" type="submit">
                                    <i class="fas fa-user-plus"></i> Create nutritionist
                                </button>
                                <a href="/manager/nutritionists" class="workspace-btn-secondary">Cancel</a>
                            </div>
                        </form>
                    </div>
                </article>
            </div>
        `);

        const form = document.getElementById('nutritionistCreateForm');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Validate email not already in use
            if (!checkEmailValidation('createEmail')) {
                WorkspaceCore.showAlert('Please use a different email address', 'error');
                return;
            }

            const formData = new FormData(form);

            try {
                await WorkspaceCore.apiJson('/api/v1/manager/nutritionists', {
                    method: 'POST',
                    body: {
                        username: formData.get('username'),
                        email: formData.get('email'),
                        password: formData.get('password'),
                        full_name: formData.get('full_name')
                    }
                });
                WorkspaceCore.showAlert('Nutritionist created successfully!', 'success');
                setTimeout(() => window.location.href = '/manager/nutritionists', 800);
            } catch (error) {
                WorkspaceCore.showAlert(error.message, 'error');
            }
        });

        // Setup email validation for new nutritionist creation
        setupEmailValidation('createEmail', null, true);
    }

    async function renderNutritionistsEdit() {
        const nutritionistId = document.body.dataset.resourceId;
        if (!nutritionistId) {
            setPageBody('<div class="workspace-empty">Nutritionist not found.</div>');
            return;
        }

        try {
            const nutritionistResponse = await WorkspaceCore.apiJson(`/manager/nutritionists/${nutritionistId}`);
            const nutritionist = nutritionistResponse.nutritionist || nutritionistResponse;

            setPageBody(`
                <div class="workspace-grid">
                    <article class="workspace-panel">
                        <div class="workspace-panel-head">
                            <div>
                                <h3>Edit nutritionist: ${WorkspaceCore.escapeHtml(nutritionist.full_name || nutritionist.username)}</h3>
                                <p>Update nutritionist account information and settings.</p>
                            </div>
                        </div>
                        <div class="workspace-panel-body">
                            <form id="nutritionistEditForm" class="workspace-form-grid">
                                <div class="workspace-field">
                                    <label for="editUsername">Username <span class="workspace-required">*</span></label>
                                    <input id="editUsername" type="text" value="${WorkspaceCore.escapeHtml(nutritionist.username)}" required>
                                    <small class="workspace-help-text">Must be unique, 3-50 characters</small>
                                </div>
                                <div class="workspace-field">
                                    <label for="editEmail">Email <span class="workspace-required">*</span></label>
                                    <input id="editEmail" type="email" value="${WorkspaceCore.escapeHtml(nutritionist.email)}" required>
                                </div>
                                <div class="workspace-field span-2">
                                    <label for="editFullName">Full Name</label>
                                    <input id="editFullName" type="text" value="${WorkspaceCore.escapeHtml(nutritionist.full_name || '')}">
                                </div>
                                <div class="workspace-inline-actions span-2">
                                    <button class="workspace-btn" type="submit">
                                        <i class="fas fa-save"></i> Save changes
                                    </button>
                                    <a href="/manager/nutritionists" class="workspace-btn-secondary">Cancel</a>
                                </div>
                            </form>
                        </div>
                    </article>
                </div>
            `);

            const form = document.getElementById('nutritionistEditForm');
            form?.addEventListener('submit', async (e) => {
                e.preventDefault();

                // Validate email not already in use (only if changed)
                const newEmail = document.getElementById('editEmail').value;
                if (newEmail !== nutritionist.email && !checkEmailValidation('editEmail')) {
                    WorkspaceCore.showAlert('Please use a different email address', 'error');
                    return;
                }

                try {
                    await WorkspaceCore.apiJson(`/manager/nutritionists/${nutritionistId}`, {
                        method: 'PUT',
                        body: {
                            username: document.getElementById('editUsername').value,
                            email: document.getElementById('editEmail').value,
                            full_name: document.getElementById('editFullName').value
                        }
                    });
                    WorkspaceCore.showAlert('Nutritionist updated successfully!', 'success');
                    setTimeout(() => window.location.href = '/manager/nutritionists', 800);
                } catch (error) {
                    WorkspaceCore.showAlert(error.message, 'error');
                }
            });

            // Setup email validation for nutritionist edit (only when changed)
            setupEmailValidation('editEmail', nutritionist.email, true);
        } catch (error) {
            setPageBody(`<div class="workspace-empty">Error loading nutritionist: ${WorkspaceCore.escapeHtml(error.message)}</div>`);
        }
    }

    async function renderAnalytics() {
        const [managerAnalytics, nutritionists] = await Promise.all([
            WorkspaceCore.apiJson('/manager/analytics'),
            WorkspaceCore.apiJson('/manager/nutritionists?limit=100')
        ]);

        const nutritionistAnalytics = await Promise.all(
            (nutritionists.nutritionists || []).map(async (nutritionist) => {
                try {
                    return await WorkspaceCore.apiJson(`/manager/analytics/nutritionist/${nutritionist.id}`);
                } catch (error) {
                    return null;
                }
            })
        );

        setPageBody(`
            ${renderStats([
                { label: 'Your Plans', value: String(managerAnalytics.total_plans_created || 0), caption: 'Plans directly created by manager' },
                { label: 'Your Meals', value: String(managerAnalytics.total_meals_created || 0), caption: 'Meals created in legacy planner' },
                { label: 'Foods Used', value: String(managerAnalytics.total_foods_used || 0), caption: 'Meal-food rows in plans' }
            ])}
            <article class="workspace-panel">
                <div class="workspace-panel-head">
                    <div>
                        <h3>Nutritionist analytics</h3>
                        <p>Manager-only reporting for supported nutritionist accounts.</p>
                    </div>
                </div>
                <div class="workspace-panel-body">
                    ${WorkspaceCore.renderTable([
                        { label: 'Nutritionist', render: (row) => WorkspaceCore.escapeHtml(row?.nutritionist_username || 'Unavailable') },
                        { label: 'Plans', render: (row) => WorkspaceCore.escapeHtml(String(row?.total_plans || 0)) },
                        { label: 'Meals', render: (row) => WorkspaceCore.escapeHtml(String(row?.total_meals || 0)) },
                        { label: 'Foods Used', render: (row) => WorkspaceCore.escapeHtml(String(row?.total_foods_used || 0)) },
                        { label: 'Avg Foods / Meal', render: (row) => WorkspaceCore.escapeHtml(String(row?.average_foods_per_meal || 0)) }
                    ], nutritionistAnalytics.filter(Boolean), 'No nutritionist analytics available yet.')}
                </div>
            </article>
        `);
    }

    async function renderImportTools() {
        setPageBody(`
            <div class="workspace-grid">
                <article class="workspace-panel">
                    <div class="workspace-panel-head">
                        <div>
                            <h3>Template downloads</h3>
                            <p>Preserve admin upload functionality in a dedicated page.</p>
                        </div>
                    </div>
                    <div class="workspace-panel-body workspace-inline-actions">
                        <button class="workspace-btn-secondary" data-template="macronutrients" type="button">Macronutrients CSV</button>
                        <button class="workspace-btn-secondary" data-template="amino_acids" type="button">Amino acids CSV</button>
                        <button class="workspace-btn-secondary" data-template="minerals" type="button">Minerals CSV</button>
                        <button class="workspace-btn-secondary" data-template="vitamins" type="button">Vitamins CSV</button>
                    </div>
                </article>
                <div class="workspace-grid two">
                    <article class="workspace-panel">
                        <div class="workspace-panel-head">
                            <div>
                                <h3>Upload CSV</h3>
                                <p>Import structured nutrition data.</p>
                            </div>
                        </div>
                        <div class="workspace-panel-body">
                            <form id="csvUploadForm" class="workspace-form-grid">
                                <div class="workspace-field span-2">
                                    <label for="csvUploadInput">CSV file(s)</label>
                                    <input id="csvUploadInput" type="file" accept=".csv" multiple required>
                                </div>
                                <div class="workspace-inline-actions span-2">
                                    <button class="workspace-btn" type="submit">Upload CSV files</button>
                                </div>
                            </form>
                        </div>
                    </article>
                    <article class="workspace-panel">
                        <div class="workspace-panel-head">
                            <div>
                                <h3>Upload SQL</h3>
                                <p>Import a SQL export into the nutrition dataset.</p>
                            </div>
                        </div>
                        <div class="workspace-panel-body">
                            <form id="sqlUploadForm" class="workspace-form-grid">
                                <div class="workspace-field span-2">
                                    <label for="sqlUploadInput">SQL file</label>
                                    <input id="sqlUploadInput" type="file" accept=".sql" required>
                                </div>
                                <div class="workspace-inline-actions span-2">
                                    <button class="workspace-btn" type="submit">Upload SQL</button>
                                </div>
                            </form>
                        </div>
                    </article>
                </div>
                <div class="workspace-grid two">
                    <article class="workspace-panel">
                        <div class="workspace-panel-head">
                            <div>
                                <h3>Exports</h3>
                                <p>Download current nutrition data in dedicated admin tooling.</p>
                            </div>
                        </div>
                        <div class="workspace-panel-body workspace-inline-actions">
                            <button class="workspace-btn-secondary" id="exportExcelBtn" type="button">Export Excel</button>
                            <button class="workspace-btn-secondary" id="exportSqlBtn" type="button">Export SQL</button>
                        </div>
                    </article>
                    <article class="workspace-panel">
                        <div class="workspace-panel-head">
                            <div>
                                <h3>Reset database</h3>
                                <p>Restrict destructive actions to a focused page with explicit confirmation.</p>
                            </div>
                        </div>
                        <div class="workspace-panel-body">
                            <div class="workspace-field">
                                <label for="resetConfirmInput">Type RESET to continue</label>
                                <input id="resetConfirmInput" type="text" placeholder="RESET">
                            </div>
                            <div class="workspace-inline-actions mt-3">
                                <button class="workspace-btn-danger" id="resetDatabaseBtn" type="button">Reset nutrition database</button>
                            </div>
                            <div id="resetResults" class="mt-4"></div>
                        </div>
                    </article>
                </div>
            </div>
        `);

        const templateMap = {
            amino_acids: 'food-group_amino_acid.csv',
            macronutrients: 'food-group_macronutrients.csv',
            minerals: 'food-group_minerals.csv',
            vitamins: 'food-group_vitamins.csv'
        };

        document.querySelectorAll('[data-template]').forEach((button) => {
            button.addEventListener('click', () => {
                const filename = templateMap[button.dataset.template];
                if (!filename) return;
                const link = document.createElement('a');
                link.href = `/templates/${filename}`;
                link.download = filename;
                link.click();
                WorkspaceCore.showAlert(`Downloading ${filename}`, 'info');
            });
        });

        document.getElementById('csvUploadForm')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const fileInput = document.getElementById('csvUploadInput');
            const files = fileInput?.files;
            if (!files || files.length === 0) {
                WorkspaceCore.showAlert('Please choose at least one CSV file first.', 'error');
                return;
            }

            const uploadBtn = form.querySelector('button[type="submit"]');
            const originalBtnText = uploadBtn?.textContent || 'Upload CSV Files';
            const failedFiles = [];
            const successFiles = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const progress = Math.round(((i + 1) / files.length) * 100);
                if (uploadBtn) {
                    uploadBtn.disabled = true;
                    uploadBtn.textContent = `Uploading ${i + 1}/${files.length}... ${progress}%`;
                }

                try {
                    const formData = new FormData();
                    formData.append('file', file);
                    await WorkspaceCore.apiJson('/import-csv', { method: 'POST', body: formData });
                    successFiles.push(file.name);
                } catch (error) {
                    failedFiles.push({ name: file.name, error: error.message });
                }
            }

            if (uploadBtn) {
                uploadBtn.disabled = false;
                uploadBtn.textContent = originalBtnText;
            }

            if (successFiles.length > 0) {
                WorkspaceCore.showAlert(`Imported ${successFiles.length} file(s) successfully.`, 'success');
            }
            if (failedFiles.length > 0) {
                const failList = failedFiles.map(f => `${f.name}: ${f.error}`).join('; ');
                WorkspaceCore.showAlert(`Failed to import ${failedFiles.length} file(s): ${failList}`, 'error');
            }
            if (successFiles.length > 0) {
                form?.reset();
            }
        });

        document.getElementById('sqlUploadForm')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const file = document.getElementById('sqlUploadInput')?.files?.[0];
            if (!file) {
                WorkspaceCore.showAlert('Please choose a SQL file first.', 'error');
                return;
            }
            const formData = new FormData();
            formData.append('file', file);
            try {
                await WorkspaceCore.apiJson('/import-sql', { method: 'POST', body: formData });
                WorkspaceCore.showAlert(`Imported ${file.name} successfully.`, 'success');
                form?.reset();
            } catch (error) {
                WorkspaceCore.showAlert(error.message, 'error');
            }
        });

        document.getElementById('exportExcelBtn')?.addEventListener('click', async () => {
            try {
                const response = await WorkspaceCore.apiFetch('/export-excel');
                if (!response.ok) {
                    const payload = await response.json();
                    throw new Error(payload.detail || 'Failed to export Excel');
                }
                const blob = await response.blob();
                WorkspaceCore.downloadBlob(blob, `nutrition_data_${new Date().toISOString().slice(0, 10)}.xlsx`);
                WorkspaceCore.showAlert('Excel export downloaded.', 'success');
            } catch (error) {
                WorkspaceCore.showAlert(error.message, 'error');
            }
        });

        document.getElementById('exportSqlBtn')?.addEventListener('click', async () => {
            try {
                const response = await WorkspaceCore.apiFetch('/export-sql');
                if (!response.ok) {
                    const payload = await response.json();
                    throw new Error(payload.detail || 'Failed to export SQL');
                }
                const blob = await response.blob();
                WorkspaceCore.downloadBlob(blob, `nutrition_data_${new Date().toISOString().slice(0, 10)}.sql`);
                WorkspaceCore.showAlert('SQL export downloaded.', 'success');
            } catch (error) {
                WorkspaceCore.showAlert(error.message, 'error');
            }
        });

        document.getElementById('resetDatabaseBtn')?.addEventListener('click', async () => {
            const input = document.getElementById('resetConfirmInput');
            if (input?.value !== 'RESET') {
                WorkspaceCore.showAlert('Type RESET exactly before continuing.', 'error');
                return;
            }
            if (!window.confirm('Reset all nutrition data? This cannot be undone.')) return;
            try {
                const result = await WorkspaceCore.apiJson('/reset-database', { method: 'POST' });
                document.getElementById('resetResults').innerHTML = `
                    <div class="workspace-callout">
                        <strong>${WorkspaceCore.escapeHtml(result.message || 'Reset complete')}</strong>
                        Deleted ${WorkspaceCore.escapeHtml(String(result.total_deleted || 0))} records from nutrition tables.
                    </div>
                `;
                WorkspaceCore.showAlert('Nutrition database reset completed.', 'success');
            } catch (error) {
                WorkspaceCore.showAlert(error.message, 'error');
            }
        });
    }

    async function renderProfile(context) {
        let user = context.user;
        const role = context.role;
        const isAdmin = role === 'admin';
        
        // Fetch latest user profile data from server
        try {
            const profileData = await WorkspaceCore.apiJson('/auth/profile');
            if (profileData && profileData.user) {
                user = profileData.user;
            }
        } catch (error) {
            console.warn('Could not fetch latest profile data:', error);
        }
        
        setPageBody(`
            <article class="workspace-panel">
                <div class="workspace-panel-head">
                    <div>
                        <h3>Your Profile</h3>
                        <p>Update your profile information and credentials</p>
                    </div>
                </div>
                <div class="workspace-panel-body">
                    <form id="profileForm" class="workspace-form-grid" autocomplete="off">
                        <div class="workspace-field">
                            <label for="profileUsername">Username${isAdmin ? ' <span class="workspace-required">*</span>' : ''}</label>
                            <input id="profileUsername" type="text" value="${WorkspaceCore.escapeHtml(user.username)}" ${isAdmin ? '' : 'disabled'} ${isAdmin ? 'required' : ''}>
                            <small class="workspace-help-text">${isAdmin ? 'Must be unique, 3-50 characters' : 'Username cannot be changed'}</small>
                        </div>
                        <div class="workspace-field">
                            <label for="profileEmail">Email</label>
                            <input id="profileEmail" type="email" value="${WorkspaceCore.escapeHtml(user.email)}" required>
                        </div>
                        <div class="workspace-field">
                            <label for="profileFullName">Full Name</label>
                            <input id="profileFullName" type="text" value="${WorkspaceCore.escapeHtml(user.full_name || '')}">
                        </div>
                        <div class="workspace-field">
                            <label for="profileNewPassword">New Password (Leave blank to keep current)</label>
                            <input id="profileNewPassword" type="password" placeholder="Enter new password if you want to change it" autocomplete="new-password" spellcheck="false">
                        </div>
                        <div class="workspace-field">
                            <label for="profileConfirmPassword">Confirm New Password</label>
                            <input id="profileConfirmPassword" type="password" placeholder="Confirm new password" autocomplete="new-password" spellcheck="false">
                        </div>
                        <div class="workspace-inline-actions span-2">
                            <button class="workspace-btn" type="submit">Update Profile</button>
                        </div>
                    </form>
                </div>
            </article>
        `);

        document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const profileForm = document.getElementById('profileForm');
            const username = document.getElementById('profileUsername').value;
            const email = document.getElementById('profileEmail').value;
            const fullName = document.getElementById('profileFullName').value;
            const newPassword = document.getElementById('profileNewPassword').value;
            const confirmPassword = document.getElementById('profileConfirmPassword').value;

            if (newPassword && newPassword !== confirmPassword) {
                WorkspaceCore.showAlert('Passwords do not match', 'error');
                return;
            }

            const payload = {
                email: email,
                full_name: fullName
            };

            if (isAdmin && username) {
                payload.username = username;
            }

            if (newPassword) {
                payload.password = newPassword;
                payload.confirm_password = confirmPassword;
            }

            try {
                const result = await WorkspaceCore.apiJson('/auth/profile', {
                    method: 'PUT',
                    body: payload
                });
                
                if (result.user) {
                    localStorage.setItem(CONFIG.AUTH.USER_KEY, JSON.stringify(result.user));
                }
                
                WorkspaceCore.showAlert(result.message || 'Profile updated successfully', 'success');
                setTimeout(() => {
                    window.location.href = window.location.pathname;
                }, 1000);
            } catch (error) {
                WorkspaceCore.showAlert(error.message || 'Failed to update profile', 'error');
            }
        });
    }

    async function renderPlanningStudio(context) {
        if (!window.WorkspacePlanningStudioPage?.renderPlanningStudio) {
            throw new Error('Planning studio module is not available.');
        }

        return window.WorkspacePlanningStudioPage.renderPlanningStudio({
            ...context,
            renderStats,
            setPageBody,
        });
    }

    async function renderPlanRegistry(context) {
        if (!window.WorkspacePlanRegistryPage?.renderPlanRegistry) {
            throw new Error('Plan registry module is not available.');
        }

        return window.WorkspacePlanRegistryPage.renderPlanRegistry({
            ...context,
            renderStats,
            setPageBody,
        });
    }

    async function showDeleteConfirmationModal({ title, userId, endpoint, onSuccess }) {
        try {
            // Fetch data association info
            const dataCheckEndpoint = endpoint.includes('nutritionists') 
                ? `/manager/nutritionists/${userId}/has-data`
                : `/admin/users/${userId}/has-data`;
            
            const dataInfo = await WorkspaceCore.apiJson(dataCheckEndpoint);
            
            const warningContent = dataInfo.has_data 
                ? `
                    <div class="workspace-delete-warning">
                        <div class="workspace-alert warning">
                            <i class="fas fa-exclamation-triangle"></i>
                            <div>
                                <strong>This account has associated data</strong>
                                <p>Deleting this account will permanently remove:</p>
                                <ul>
                                    ${dataInfo.plan_count ? `<li><strong>${dataInfo.plan_count}</strong> meal plan(s)</li>` : ''}
                                    ${dataInfo.meal_count ? `<li><strong>${dataInfo.meal_count}</strong> meal(s)</li>` : ''}
                                    ${dataInfo.meal_food_count ? `<li><strong>${dataInfo.meal_food_count}</strong> meal food entries</li>` : ''}
                                </ul>
                                <p style="margin-bottom: 0; color: #b42318; font-weight: 600;">This action cannot be undone.</p>
                            </div>
                        </div>
                    </div>
                `
                : '';

            const modal = document.createElement('div');
            modal.className = 'workspace-modal workspace-modal-danger';
            modal.innerHTML = `
                <div class="workspace-modal-backdrop"></div>
                <div class="workspace-modal-dialog">
                    <div class="workspace-modal-header">
                        <div>
                            <i class="fas fa-trash" style="color: #b42318; margin-right: 8px;"></i>
                            <h3 style="margin: 0; display: inline;">${WorkspaceCore.escapeHtml(title)}</h3>
                        </div>
                        <button class="workspace-modal-close" type="button">&times;</button>
                    </div>
                    <div class="workspace-modal-body">
                        ${warningContent}
                        <p>Are you absolutely sure? This action cannot be reversed.</p>
                        <p><strong>Username:</strong> ${WorkspaceCore.escapeHtml(dataInfo.username)}</p>
                        <div class="workspace-modal-actions">
                            <button class="workspace-btn-danger" id="confirmDeleteBtn" type="button">
                                <i class="fas fa-trash"></i> Yes, delete permanently
                            </button>
                            <button class="workspace-btn-secondary" id="cancelDeleteBtn" type="button">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            const closeModal = () => modal.remove();
            const confirmBtn = modal.querySelector('#confirmDeleteBtn');
            const cancelBtn = modal.querySelector('#cancelDeleteBtn');
            const backdrop = modal.querySelector('.workspace-modal-backdrop');
            const closeBtn = modal.querySelector('.workspace-modal-close');

            cancelBtn?.addEventListener('click', closeModal);
            closeBtn?.addEventListener('click', closeModal);
            backdrop?.addEventListener('click', closeModal);

            confirmBtn?.addEventListener('click', async () => {
                try {
                    confirmBtn.disabled = true;
                    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
                    
                    const response = await WorkspaceCore.apiFetch(`${endpoint}/${userId}`, { method: 'DELETE' });
                    if (!response.ok) {
                        const payload = await response.json();
                        throw new Error(payload.detail || 'Failed to delete');
                    }
                    
                    closeModal();
                    if (onSuccess) await onSuccess();
                } catch (error) {
                    confirmBtn.disabled = false;
                    confirmBtn.innerHTML = '<i class="fas fa-trash"></i> Yes, delete permanently';
                    WorkspaceCore.showAlert(error.message, 'error');
                }
            });
        } catch (error) {
            WorkspaceCore.showAlert('Error loading delete details: ' + error.message, 'error');
        }
    }

    document.addEventListener('DOMContentLoaded', bootstrap);
})();
