window.WorkspacePlanningReport = (() => {
    function escape(value) {
        return WorkspaceCore.escapeHtml(value);
    }

    function formatValue(item) {
        const value = Number(item?.value || 0);
        const unit = item?.unit ? ` ${item.unit}` : '';
        return `${value.toFixed(1)}${unit}`;
    }

    function renderHighlights(highlights, emptyText = 'No nutrient totals yet.') {
        if (!highlights || highlights.length === 0) {
            return `<div class="workspace-empty">${escape(emptyText)}</div>`;
        }

        return `
            <div class="planning-highlight-grid">
                ${highlights.map((item) => `
                    <div class="planning-highlight">
                        <span>${escape(item.label || item.code)}</span>
                        <strong>${escape(formatValue(item))}</strong>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function buildPlanReportHtml(report) {
        const days = report.days || [];

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${escape(report.title || 'Nutrition Plan')}</title>
                <style>
                    html, body { margin: 0; padding: 0; background: #f6f8f6; }
                    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #2c3e50; }

                    .sheet {
                        width: 100%;
                        max-width: 1040px;
                        margin: 24px auto;
                        background: #ffffff;
                        padding: 32px;
                        box-sizing: border-box;
                        border-radius: 14px;
                        box-shadow: 0 18px 40px rgba(17,33,24,0.08);
                    }

                    .hero {
                        padding: 24px 28px;
                        border-radius: 12px;
                        background: linear-gradient(135deg, #f4fbf6 0%, #eef7f0 100%);
                        border-left: 6px solid #16a34a;
                        margin: 0 0 26px 0;
                        color: #153f26;
                    }

                    h1, h2, h3 { margin: 0; }
                    h1 { font-size: 28px; line-height: 1.1; color: #153f26; font-weight: 700; }
                    h1 + p { margin: 10px 0 0; color: #4b5563; font-size: 13px; }
                    h2 { font-size: 18px; margin: 22px 0 14px 0; color: #1f2937; border-bottom: 1px solid #dbe6e0; padding-bottom: 10px; }
                    h3 { font-size: 15px; margin: 10px 0 6px 0; color: #1f2937; }

                    .meta { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 14px; }
                    .meta-card { background: #ffffff; border: 1px solid #dbe6e0; border-radius: 10px; padding: 14px 16px; }
                    .meta-card span { display: block; font-size: 11px; text-transform: uppercase; color: #4b5563; margin-bottom: 6px; font-weight: 600; }
                    .meta-card strong { display: block; font-size: 15px; color: #0f172a; }

                    .section { margin-top: 20px; }
                    .summary { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin-top: 16px; }
                    .summary-card { border-radius: 10px; border: 1px solid #dbe6e0; background: #fbfcfb; padding: 14px 12px; text-align: center; }
                    .summary-card span { display: block; color: #4b5563; font-size: 11px; text-transform: uppercase; margin-bottom: 8px; font-weight: 600; }
                    .summary-card strong { display: block; font-size: 16px; color: #147d4c; font-weight: 700; }

                    .day-card { border: 1px solid #dbe6e0; border-radius: 12px; padding: 20px; background: #ffffff; margin-top: 24px; }
                    .meal-card { margin-top: 18px; border-radius: 12px; background: #f7fbf6; padding: 16px; border-left: 5px solid #16a34a; }
                    .meal-head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }

                    .food-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                    .food-table th, .food-table td { text-align: left; padding: 10px 8px; border-bottom: 1px solid #dbe6e0; vertical-align: top; font-size: 13px; }
                    .food-table th { font-size: 11px; text-transform: uppercase; color: #334155; background: #f4f7f4; font-weight: 700; }
                    .food-table th:nth-child(1), .food-table td:nth-child(1) { width: 30%; }
                    .food-table th:nth-child(2), .food-table td:nth-child(2) { width: 15%; }
                    .food-table th:nth-child(n+3), .food-table td:nth-child(n+3) { width: 13%; }
                    .food-table tr { page-break-inside: avoid; }

                    .pill { display: inline-block; padding: 6px 10px; border-radius: 7px; background: #d1fae5; color: #065f46; font-size: 12px; font-weight: 700; }
                    .notes { margin-top: 8px; color: #4b5563; font-size: 13px; }

                    @media screen and (max-width: 1000px) {
                        .meta { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                        .summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                        .sheet { margin: 16px; padding: 20px; }
                    }

                    @media screen and (max-width: 640px) {
                        .meta, .summary { grid-template-columns: 1fr; }
                        .meal-head { flex-direction: column; }
                        .food-table { display: block; overflow-x: auto; }
                        .food-table th, .food-table td { white-space: nowrap; }
                    }

                    @media print {
                        html, body { margin: 0; padding: 0; }
                        .sheet { width: 100%; max-width: 100%; margin: 0; padding: 0 8mm 8mm 8mm; border-radius: 0; box-shadow: none; box-sizing: border-box; overflow: hidden; }
                        .hero { margin: 0; padding: 10px 8mm; border-radius: 0; }
                        .food-table { display: table; overflow: hidden; width: 100%; table-layout: fixed; }
                        .food-table th, .food-table td { word-break: break-word; overflow-wrap: break-word; padding: 8px 6px; }
                        .meta { grid-template-columns: repeat(4, minmax(0, 1fr)); margin: 0; }
                        .meta > div { padding: 8px; margin: 0; }
                        .summary { grid-template-columns: repeat(5, minmax(0, 1fr)); margin: 0; }
                        .summary > div { padding: 8px; margin: 0; }
                        .meal-card { margin: 0; padding: 0 8mm; }
                    }
                </style>
            </head>
            <body>
                <div class="sheet">
                    <div class="hero">
                        <h1>${escape(report.title || 'Nutrition Plan')}</h1>
                        <p>${escape(report.client_display_label || 'Anonymous planning reference')} ${report.client_code ? `(${escape(report.client_code)})` : ''}</p>
                        <div class="meta">
                            <div class="meta-card">
                                <span>Status</span>
                                <strong>${escape(report.status || 'draft')}</strong>
                            </div>
                            <div class="meta-card">
                                <span>Plan type</span>
                                <strong>${escape(report.plan_type || 'multi_day')}</strong>
                            </div>
                            <div class="meta-card">
                                <span>Start date</span>
                                <strong>${escape(report.start_date || 'Not set')}</strong>
                            </div>
                            <div class="meta-card">
                                <span>Days</span>
                                <strong>${escape(String(report.days_count || days.length || 0))}</strong>
                            </div>
                        </div>
                    </div>
                    <div class="section">
                        <h2>Plan Summary</h2>
                        <div class="summary">
                            ${(report.summary?.highlights || []).map((item) => `
                                <div class="summary-card">
                                    <span>${escape(item.label || item.code)}</span>
                                    <strong>${escape(formatValue(item))}</strong>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="grid section">
                        ${days.map((day) => `
                            <div class="day-card">
                                <div class="meal-head">
                                    <div>
                                        <h2>Day ${escape(String(day.day_index))}: ${escape(day.day_name || '')}</h2>
                                        <div class="notes">${escape(day.actual_date || 'No date assigned')}</div>
                                    </div>
                                    <span class="pill">${escape(String(day.summary?.foods_count || 0))} foods</span>
                                </div>
                                <div class="summary">
                                    ${(day.summary?.highlights || []).map((item) => `
                                        <div class="summary-card">
                                            <span>${escape(item.label || item.code)}</span>
                                            <strong>${escape(formatValue(item))}</strong>
                                        </div>
                                    `).join('')}
                                </div>
                                ${(day.meals || []).map((meal) => `
                                    <div class="meal-card">
                                        <div class="meal-head">
                                            <div>
                                                <h3>${escape(meal.meal_name || 'Meal')}</h3>
                                                <div class="notes">${escape(meal.meal_time || meal.meal_type || 'Schedule not set')}</div>
                                            </div>
                                            <span class="pill">${escape(String(meal.summary?.foods_count || 0))} foods</span>
                                        </div>
                                        ${(meal.instructions || meal.target_notes) ? `
                                            <div class="notes">
                                                ${meal.instructions ? `<div><strong>Instructions:</strong> ${escape(meal.instructions)}</div>` : ''}
                                                ${meal.target_notes ? `<div><strong>Target notes:</strong> ${escape(meal.target_notes)}</div>` : ''}
                                            </div>
                                        ` : ''}
                                        <table class="food-table">
                                            <thead>
                                                <tr>
                                                    <th>Food</th>
                                                    <th>Portion</th>
                                                    <th>Energy</th>
                                                    <th>Protein</th>
                                                    <th>Carbs</th>
                                                    <th>Fat</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${(meal.foods || []).map((food) => `
                                                    <tr>
                                                        <td>
                                                            <strong>${escape(food.food_name || '')}</strong>
                                                            <div class="notes">${escape(food.food_group_name || '')}</div>
                                                        </td>
                                                        <td>${escape(String(food.portion_grams || 0))} g${food.portion_description ? `<div class="notes">${escape(food.portion_description)}</div>` : ''}</td>
                                                        <td>${escape(formatValue({ value: food.calculated_nutrients?.ENERGY_KC || 0, unit: 'kcal' }))}</td>
                                                        <td>${escape(formatValue({ value: food.calculated_nutrients?.PROCNT || 0, unit: 'g' }))}</td>
                                                        <td>${escape(formatValue({ value: food.calculated_nutrients?.CHOCDF || 0, unit: 'g' }))}</td>
                                                        <td>${escape(formatValue({ value: food.calculated_nutrients?.FAT || 0, unit: 'g' }))}</td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                `).join('')}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    async function downloadReport(report) {
        const slug = (report.title || 'nutrition-plan')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'nutrition-plan';

        // Use server-side PDF generation endpoint with MPDF
        const planId = report.plan_id || report.id;
        if (!planId) {
            throw new Error('Plan ID not found in report data');
        }

        try {
            const response = await WorkspaceCore.apiFetch(`/api/v2/planning/plans/${planId}/report-pdf`, {
                headers: {
                    Accept: 'application/pdf',
                },
            });
            if (!response.ok) {
                const contentType = response.headers.get('content-type') || '';
                const payload = contentType.includes('application/json') ? await response.json() : await response.text();
                const detail = typeof payload === 'string'
                    ? payload
                    : (payload?.detail || payload?.message || response.statusText);
                throw new Error(`PDF generation failed: ${detail}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${slug}-nutrition-plan.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('PDF download failed:', error);
            throw new Error('Failed to download PDF: ' + error.message);
        }
    }

    return {
        buildPlanReportHtml,
        downloadReport,
        formatValue,
        renderHighlights,
    };
})();
