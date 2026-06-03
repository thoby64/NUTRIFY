window.WorkspacePlanRegistryPage = (() => {
    function escape(value) {
        return WorkspaceCore.escapeHtml(value);
    }

    function getPlanningPageHref(planId) {
        return `plan-workspace?plan=${planId}`;
    }

    function positiveInteger(value) {
        const id = Number(value);
        return Number.isInteger(id) && id > 0 ? id : null;
    }

    function requirePlanId(value) {
        const id = positiveInteger(value);
        if (!id) {
            WorkspaceCore.showAlert('Plan identifier is missing. Refresh the registry and try again.', 'error');
        }
        return id;
    }

    function renderPlanTable(plans) {
        return WorkspaceCore.renderTable([
            { label: 'Title', key: 'title' },
            { label: 'Type', render: (row) => `<span class="workspace-pill soft">${escape(row.plan_type)}</span>` },
            { label: 'Client', render: (row) => escape(row.client_display_label || 'Anonymous') },
            { label: 'Days', render: (row) => escape(String(row.days_count || 0)) },
            { label: 'Versions', render: (row) => escape(String((row.versions || []).length)) },
            { label: 'Status', render: (row) => `<span class="workspace-pill ${row.status === 'finalized' ? '' : 'warning'}">${escape(row.status)}</span>` },
            {
                label: 'Actions',
                render: (row) => `
                    <div class="workspace-inline-actions">
                        <a class="workspace-btn-secondary" href="${getPlanningPageHref(row.id)}">Open</a>
                        <button class="workspace-btn-secondary planning-preview-report" type="button" data-plan-id="${row.id}">Preview</button>
                        <button class="workspace-btn" type="button" data-download-plan-id="${row.id}">Download</button>
                    </div>
                `,
            },
        ], plans, 'No plans created yet.');
    }

    async function renderPlanRegistry(context) {
        const role = context.role;
        const sections = [];

        // Build filter UI based on role
        let filterHtml = '';
        const dateFilterHtml = `
            <div class="workspace-field" style="flex: 1; min-width: 150px; margin: 0;">
                <label for="planDateFrom" style="margin-bottom: 0.5rem;">From Date</label>
                <input type="date" id="planDateFrom" style="width: 100%;">
            </div>
            <div class="workspace-field" style="flex: 1; min-width: 150px; margin: 0;">
                <label for="planDateTo" style="margin-bottom: 0.5rem;">To Date</label>
                <input type="date" id="planDateTo" style="width: 100%;">
            </div>
        `;
        
        if (role !== 'nutritionist') {
            filterHtml = `
                <div class="workspace-form-inline" style="gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
                    <div class="workspace-field" style="flex: 1; min-width: 200px; margin: 0;">
                        <label for="planFilterType" style="margin-bottom: 0.5rem;">Filter Plans</label>
                        <select id="planFilterType" style="width: 100%;">
                            <option value="">All Plans</option>
                            <option value="own">My Plans</option>
                            <option value="nutritionists">Nutritionist Plans</option>
                        </select>
                    </div>
                    <div class="workspace-field" style="flex: 1; min-width: 200px; margin: 0;">
                        <label for="planSearchUser" style="margin-bottom: 0.5rem;">Search User</label>
                        <input type="text" id="planSearchUser" placeholder="Search by username or email..." style="width: 100%;">
                    </div>
                    <div class="workspace-field" style="flex: 1; min-width: 200px; margin: 0;">
                        <label for="planSearchTitle" style="margin-bottom: 0.5rem;">Search Plan Title</label>
                        <input type="text" id="planSearchTitle" placeholder="Search by title..." style="width: 100%;">
                    </div>
                    ${dateFilterHtml}
                </div>
            `;
        } else {
            filterHtml = `
                <div class="workspace-form-inline" style="gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
                    <div class="workspace-field" style="flex: 1; min-width: 200px; margin: 0;">
                        <label for="planSearchTitle" style="margin-bottom: 0.5rem;">Search Plan Title</label>
                        <input type="text" id="planSearchTitle" placeholder="Search by title..." style="width: 100%;">
                    </div>
                    ${dateFilterHtml}
                </div>
            `;
        }

        // Fetch plans with default filters
        const v2Plans = await WorkspaceCore.apiJson('/api/v2/planning/plans');
        const planCount = String(v2Plans.total || 0);
        const finalizedCount = String((v2Plans.data || []).filter((plan) => plan.status === 'finalized').length);

        sections.push(`
            <section class="workspace-hero">
                <div>
                    <h3>Plan Registry</h3>
                    <p>Browse active drafts and finalized versions, then preview or download the saved plan report when needed.</p>
                </div>
                ${context.renderStats([
                    { label: 'Plans', value: planCount, caption: 'Multi-day planner records' },
                    { label: 'Finalized', value: finalizedCount, caption: 'Immutable versions available' },
                    { label: 'Role scope', value: role === 'nutritionist' ? 'Personal' : 'Team', caption: 'Filtered by access rights' },
                ])}
            </section>
            <article class="workspace-panel">
                <div class="workspace-panel-head">
                    <div>
                        <h3>Plan Registry</h3>
                        <p>Open the plan studio for edits or download a polished PDF report directly from this page.</p>
                    </div>
                </div>
                <div class="workspace-panel-body">
                    ${filterHtml}
                    <div id="planTableContainer">
                        ${renderPlanTable(v2Plans.data || [])}
                    </div>
                </div>
            </article>
            <article class="workspace-panel">
                <div class="workspace-panel-head">
                    <div>
                        <h3>Report preview</h3>
                        <p>Preview a saved plan before downloading it for handoff or documentation.</p>
                    </div>
                </div>
                <div class="workspace-panel-body">
                    <div id="planningReportPreview" class="planning-report-preview">
                        <div class="workspace-empty">Choose Preview on a plan above to load the report here.</div>
                    </div>
                </div>
            </article>
        `);

        context.setPageBody(sections.join(''));
        bindRegistryEvents(context);
        bindFilterEvents(context);
    }

    async function bindFilterEvents(context) {
        const filterType = document.getElementById('planFilterType');
        const searchUser = document.getElementById('planSearchUser');
        const searchTitle = document.getElementById('planSearchTitle');
        const dateFrom = document.getElementById('planDateFrom');
        const dateTo = document.getElementById('planDateTo');
        let filterTimeout;

        const loadPlans = async () => {
            const params = new URLSearchParams();
            
            if (filterType?.value) {
                params.append('filter_type', filterType.value);
            }
            
            if (searchUser?.value.trim()) {
                params.append('search_user', searchUser.value.trim());
            }
            
            if (searchTitle?.value.trim()) {
                params.append('search', searchTitle.value.trim());
            }
            
            if (dateFrom?.value) {
                params.append('date_from', dateFrom.value);
            }
            
            if (dateTo?.value) {
                params.append('date_to', dateTo.value);
            }

            try {
                const url = `/api/v2/planning/plans?${params.toString()}`;
                const v2Plans = await WorkspaceCore.apiJson(url);
                const tableContainer = document.getElementById('planTableContainer');
                if (tableContainer) {
                    tableContainer.innerHTML = renderPlanTable(v2Plans.data || []);
                    bindRegistryEvents(context);
                }
            } catch (error) {
                WorkspaceCore.showAlert(error.message, 'error');
            }
        };

        if (filterType) {
            filterType.addEventListener('change', loadPlans);
        }

        if (searchUser) {
            searchUser.addEventListener('input', () => {
                clearTimeout(filterTimeout);
                filterTimeout = setTimeout(loadPlans, 500);
            });
        }

        if (searchTitle) {
            searchTitle.addEventListener('input', () => {
                clearTimeout(filterTimeout);
                filterTimeout = setTimeout(loadPlans, 500);
            });
        }
        
        if (dateFrom) {
            dateFrom.addEventListener('change', loadPlans);
        }
        
        if (dateTo) {
            dateTo.addEventListener('change', loadPlans);
        }
    }

    function bindRegistryEvents(context) {
        document.querySelectorAll('[data-download-plan-id]').forEach((button) => {
            button.addEventListener('click', async () => {
                const planId = requirePlanId(button.dataset.downloadPlanId);
                if (!planId) return;
                try {
                    const report = await WorkspaceCore.apiJson(`/api/v2/planning/plans/${planId}/report`);
                    await WorkspacePlanningReport.downloadReport(report);
                    WorkspaceCore.showAlert('Plan report downloaded as PDF.', 'success');
                } catch (error) {
                    WorkspaceCore.showAlert(error.message, 'error');
                }
            });
        });

        document.querySelectorAll('.planning-preview-report').forEach((button) => {
            button.addEventListener('click', async () => {
                const planId = requirePlanId(button.dataset.planId);
                if (!planId) return;
                const preview = document.getElementById('planningReportPreview');
                if (!preview) return;

                preview.innerHTML = '<div class="workspace-empty">Loading report preview...</div>';

                try {
                    const report = await WorkspaceCore.apiJson(`/api/v2/planning/plans/${planId}/report`);
                    preview.innerHTML = `
                        <div class="planning-preview-head">
                            <div>
                                <h4>${escape(report.title || 'Nutrition Plan')}</h4>
                                <p>${escape(report.client_display_label || 'Anonymous planning reference')}</p>
                            </div>
                            <div class="workspace-inline-actions">
                                <a class="workspace-btn-secondary" href="${getPlanningPageHref(planId)}">Open in studio</a>
                                <button class="workspace-btn" type="button" id="planningInlineDownloadBtn">Download</button>
                            </div>
                        </div>
                        ${WorkspacePlanningReport.renderHighlights(report.summary?.highlights || [], 'No totals available.')}
                        <div class="planning-preview-scroll">
                            <iframe id="planningReportFrame" title="Plan report preview"></iframe>
                        </div>
                    `;

                    const frame = document.getElementById('planningReportFrame');
                    if (frame) {
                        frame.srcdoc = WorkspacePlanningReport.buildPlanReportHtml(report);
                    }

                    document.getElementById('planningInlineDownloadBtn')?.addEventListener('click', () => {
                        WorkspacePlanningReport.downloadReport(report).catch((error) => {
                            WorkspaceCore.showAlert(error.message, 'error');
                        });
                    });
                } catch (error) {
                    preview.innerHTML = '<div class="workspace-empty">Preview failed to load.</div>';
                    WorkspaceCore.showAlert(error.message, 'error');
                }
            });
        });
    }

    return {
        renderPlanRegistry,
    };
})();
