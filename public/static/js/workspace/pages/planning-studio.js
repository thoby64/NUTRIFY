window.WorkspacePlanningStudioPage = (() => {
    const state = {
        activeDayId: null,
        mealSearches: {},
    };

    function escape(value) {
        return WorkspaceCore.escapeHtml(value);
    }

    function numberOrNull(value) {
        const normalized = String(value ?? '').trim();
        return normalized === '' ? null : Number(normalized);
    }

    function positiveInteger(value) {
        const id = Number(value);
        return Number.isInteger(id) && id > 0 ? id : null;
    }

    function requirePlanningId(value, label) {
        const id = positiveInteger(value);
        if (!id) {
            WorkspaceCore.showAlert(`${label} identifier is missing. Refresh the workspace and try again.`, 'error');
        }
        return id;
    }

    function getPlanningNutrientCatalog(meta) {
        const catalog = meta?.nutrient_catalog?.length ? meta.nutrient_catalog : meta?.key_nutrients || [];
        const seen = new Set();
        return catalog.filter((item) => {
            const code = String(item?.code || '').trim().toUpperCase();
            if (!code || seen.has(code)) {
                return false;
            }
            seen.add(code);
            return true;
        });
    }

    function getConditionOperatorOptions() {
        return [
            { value: '>=', label: 'Minimum', help: 'Food must be at or above this value' },
            { value: '<=', label: 'Maximum', help: 'Food must be at or below this value' },
            { value: '=', label: 'Exactly', help: 'Food should match this exact value' },
            { value: '>', label: 'More Than', help: 'Food must be greater than this value' },
            { value: '<', label: 'Less Than', help: 'Food must be less than this value' },
            { value: 'range', label: 'Range', help: 'Food must stay between two values' },
        ];
    }

    function getOperatorLabel(operator) {
        return getConditionOperatorOptions().find((item) => item.value === operator)?.label || operator;
    }

    function parseStructuredConditionsValue(value) {
        if (!value) {
            return [];
        }
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }

    function serializeStructuredCondition(condition) {
        const nutrientCode = String(condition?.nutrient_code || '').trim().toUpperCase();
        const unit = String(condition?.unit || '').trim();
        if (!nutrientCode) {
            return '';
        }
        if (condition.operator === 'range') {
            return `${nutrientCode} ${condition.min_value}-${condition.max_value}${unit}`;
        }
        return `${nutrientCode} ${condition.operator} ${condition.value}${unit}`;
    }

    function renderStructuredConditionChips(conditions) {
        if (!conditions.length) {
            return '<div class="workspace-empty">No structured conditions added yet.</div>';
        }
        return `
            <div class="planning-condition-chip-list">
                ${conditions.map((condition, index) => `
                    <div class="planning-condition-chip">
                        <div>
                            <strong>${escape(condition.nutrient_code)}</strong>
                            <span>${escape(getOperatorLabel(condition.operator))}: ${
                                condition.operator === 'range'
                                    ? `${escape(String(condition.min_value))} - ${escape(String(condition.max_value))}`
                                    : escape(String(condition.value))
                            } ${escape(condition.unit || '')}</span>
                        </div>
                        <button class="workspace-btn-danger planning-remove-condition" type="button" data-condition-index="${index}">Remove</button>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function renderConditionOperatorButtons(selectedOperator = '>=') {
        return `
            <div class="planning-operator-grid">
                ${getConditionOperatorOptions().map((option) => `
                    <button
                        class="planning-operator-btn ${option.value === selectedOperator ? 'active' : ''}"
                        type="button"
                        data-operator-value="${escape(option.value)}"
                        title="${escape(option.help)}"
                    >
                        <strong>${escape(option.label)}</strong>
                        <span>${escape(option.help)}</span>
                    </button>
                `).join('')}
            </div>
        `;
    }

    function parseCustomNutrientLines(text) {
        return String(text || '')
            .split(/\n|,/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
                const match = line.match(/^([A-Za-z0-9_ ]+)\s*[:=]\s*([0-9]+(?:\.[0-9]+)?)\s*([A-Za-zμ%]*)\s*(.*)$/);
                if (!match) {
                    throw new Error(`Invalid nutrient entry: "${line}". Use CODE=VALUE unit`);
                }
                return {
                    nutrient_code: match[1].trim().toUpperCase(),
                    value: Number(match[2]),
                    unit: match[3] || null,
                    label: match[4] ? match[4].trim() : null,
                };
            });
    }

    function getSelectedPlanId() {
        const value = new URLSearchParams(window.location.search).get('plan');
        return positiveInteger(value);
    }

    function getMealSearchStorageKey() {
        const planId = getSelectedPlanId() || 'studio';
        const role = document.body?.dataset?.role || 'workspace';
        return `nutriqube-planning-meal-searches:${role}:${planId}`;
    }

    function loadMealSearches() {
        try {
            const stored = window.sessionStorage?.getItem(getMealSearchStorageKey());
            state.mealSearches = stored ? JSON.parse(stored) || {} : {};
        } catch (error) {
            state.mealSearches = {};
        }
    }

    function persistMealSearches() {
        try {
            window.sessionStorage?.setItem(getMealSearchStorageKey(), JSON.stringify(state.mealSearches || {}));
        } catch (error) {
            // Session storage is only a convenience for in-progress food searches.
        }
    }

    function getMealSearchState(mealId) {
        return state.mealSearches?.[String(mealId)] || null;
    }

    function setMealSearchState(mealId, updates) {
        if (!mealId) return null;
        const key = String(mealId);
        state.mealSearches[key] = {
            ...(state.mealSearches[key] || {}),
            ...updates,
        };
        persistMealSearches();
        return state.mealSearches[key];
    }

    function clearMealSearchResults(mealId) {
        const current = getMealSearchState(mealId);
        if (!current) return;
        setMealSearchState(mealId, { result: null });
    }

    function isFocusedPlanPage(context) {
        return context?.page === 'plan-workspace';
    }

    function getFocusedPlanHref(planId) {
        return `plan-workspace?plan=${planId}`;
    }

    function openFocusedPlan(planId) {
        window.location.href = getFocusedPlanHref(planId);
    }

    function getNutrientReferenceHref() {
        return 'nutrients';
    }

    function promptCloneOptions(defaultTitle) {
        const title = window.prompt('Title for the cloned plan', `${defaultTitle} Copy`);
        if (!title) {
            return null;
        }

        const includeFoods = window.confirm(
            'Include foods and portions in the cloned plan?\n\nChoose OK for a full duplicate, or Cancel for structure-only reuse.'
        );
        const startDate = window.prompt(
            'Optional new start date for the clone (YYYY-MM-DD).\nLeave blank to keep the source dates.',
            ''
        );

        return {
            title,
            include_foods: includeFoods,
            start_date: String(startDate || '').trim() || null,
        };
    }

    function setSelectedPlanId(planId) {
        const url = new URL(window.location.href);
        if (planId) {
            url.searchParams.set('plan', String(planId));
        } else {
            url.searchParams.delete('plan');
        }
        window.history.replaceState({}, '', url.toString());
    }

    function renderClientProfile(profile) {
        const entries = [
            ['Age group', profile?.age_group],
            ['Sex', profile?.sex],
            ['Goal', profile?.goal_summary],
            ['Clinical summary', profile?.clinical_summary],
            ['Dietary pattern', profile?.dietary_pattern],
            ['Allergies', profile?.allergies],
            ['Exclusions', profile?.exclusions],
            ['Preferences', profile?.preferences],
            ['Culture notes', profile?.cultural_notes],
            ['Planning notes', profile?.planning_notes],
        ].filter(([, value]) => value);

        if (entries.length === 0) {
            return '';
        }

        return `
            <div class="planning-profile-card">
                <h4>Planning-safe client profile</h4>
                <div class="planning-profile-grid">
                    ${entries.map(([label, value]) => `
                        <div class="planning-profile-item">
                            <span>${escape(label)}</span>
                            <strong>${escape(value)}</strong>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function renderSummary(summary, emptyText) {
        return WorkspacePlanningReport.renderHighlights(summary?.highlights || [], emptyText);
    }

    function renderValidation(validation, title) {
        if (!validation) {
            return '';
        }

        const checks = validation.checks || [];
        const toneClass = validation.overall_status === 'blocked'
            ? 'warning'
            : validation.overall_status === 'warning'
                ? 'soft'
                : '';

        return `
            <div class="planning-validation-card">
                <div class="planning-subsection-head">
                    <h5>${escape(title)}</h5>
                    <span class="workspace-pill ${toneClass}">
                        ${escape(validation.overall_status || 'ok')}
                    </span>
                </div>
                <div class="planning-validation-kpis">
                    <div class="planning-validation-kpi">
                        <span>Blockers</span>
                        <strong>${escape(String(validation.blockers_count || 0))}</strong>
                    </div>
                    <div class="planning-validation-kpi">
                        <span>Warnings</span>
                        <strong>${escape(String(validation.warnings_count || 0))}</strong>
                    </div>
                    <div class="planning-validation-kpi">
                        <span>Info</span>
                        <strong>${escape(String(validation.info_count || 0))}</strong>
                    </div>
                </div>
                ${checks.length > 0 ? `
                    <div class="planning-validation-list">
                        ${checks.slice(0, 8).map((check) => `
                            <div class="planning-validation-item ${check.severity === 'blocker' ? 'blocker' : check.severity === 'warning' ? 'warning' : 'info'}">
                                <strong>${escape(check.title || check.nutrient_code || check.kind || 'Check')}</strong>
                                <p>${escape(check.message || 'Validation note')}</p>
                            </div>
                        `).join('')}
                    </div>
                ` : '<div class="workspace-empty">No validation findings at this scope.</div>'}
            </div>
        `;
    }

    function renderSuggestionResults(result) {
        const suggestions = result?.data || [];
        if (suggestions.length === 0) {
            return '<div class="workspace-empty">No acceptable substitutions were found for this item yet.</div>';
        }

        return `
            <div class="planning-search-meta">
                <span class="workspace-pill soft">${escape(String(result?.rule_context?.rules_count || 0))} effective rules</span>
                <span class="workspace-pill soft">${escape(String(result?.rule_context?.targets_count || 0))} effective targets</span>
            </div>
            <div class="planning-suggestion-stack">
                ${suggestions.map((item) => `
                    <div class="planning-suggestion-card">
                        <div class="planning-search-card-head">
                            <div>
                                <h5>${escape(item.name || 'Food')}</h5>
                                <p>${escape(item.food_group_name || 'Food item')}</p>
                            </div>
                            <div class="workspace-inline-actions">
                                <span class="workspace-pill soft">${escape(String(item.similarity_score || 0))}% match</span>
                                ${item.same_group ? '<span class="workspace-pill">same group</span>' : ''}
                                ${item.same_exchange ? '<span class="workspace-pill soft">same exchange</span>' : ''}
                            </div>
                        </div>
                        ${renderSummary(item.summary, 'No nutrient snapshot available.')}
                        ${item.target_preview?.length ? `
                            <div class="planning-target-preview">
                                ${item.target_preview.map((target) => `
                                    <div class="planning-target-preview-item">
                                        <span>${escape(target.nutrient_code)}</span>
                                        <strong>${escape(String(target.value ?? 0))} ${escape(target.unit || '')}</strong>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                        <div class="planning-suggestion-note">${escape(item.similarity_summary || 'Alternative available.')}</div>
                        ${item.compatibility?.warnings?.length ? `
                            <div class="planning-search-warning">
                                ${item.compatibility.warnings.map((warning) => `
                                    <p><strong>${escape(warning.title || 'Rule warning')}:</strong> ${escape((warning.matched_keywords || []).join(', '))}</p>
                                `).join('')}
                            </div>
                        ` : ''}
                        <div class="workspace-inline-actions">
                            <button class="workspace-btn planning-apply-suggestion" type="button" data-meal-food-id="${result.current_food.id}" data-food-id="${item.id}">
                                Replace with this food
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function renderPlanList(plans, selectedPlanId, context) {
        return WorkspaceCore.renderTable([
            { label: 'Title', key: 'title' },
            { label: 'Type', render: (row) => `<span class="workspace-pill soft">${escape(row.plan_type)}</span>` },
            { label: 'Client', render: (row) => escape(row.client_display_label || 'Anonymous') },
            { label: 'Days', render: (row) => escape(String(row.days_count || 0)) },
            { label: 'Status', render: (row) => `<span class="workspace-pill ${row.status === 'finalized' ? '' : 'warning'}">${escape(row.status)}</span>` },
            {
                label: 'Action',
                render: (row) => `
                    <a class="workspace-btn-secondary" href="${getFocusedPlanHref(row.id)}">
                        ${row.id === selectedPlanId && isFocusedPlanPage(context) ? 'Open now' : 'Open workspace'}
                    </a>
                    <button class="workspace-btn-secondary planning-clone-plan" type="button" data-plan-id="${row.id}" data-plan-title="${escape(row.title || 'Plan')}">
                        Clone
                    </button>
                `,
            },
        ], plans, 'No plans created yet.');
    }

    function renderFoodGroupsOptions(foodGroups) {
        return (foodGroups || []).map((group) => `<option value="${group.id}">${escape(group.name)}</option>`).join('');
    }

    function renderRuleSeverityOptions(meta, selectedValue) {
        return (meta?.rule_severities || []).map((severity) => `
            <option value="${escape(severity)}" ${severity === selectedValue ? 'selected' : ''}>${escape(severity)}</option>
        `).join('');
    }

    function renderRuleStack(rules, meta) {
        const validRules = (rules || []).filter((rule) => positiveInteger(rule?.id));
        if (validRules.length === 0) {
            return '<div class="workspace-empty">No structured rules added yet.</div>';
        }

        return `
            <div class="planning-rule-stack">
                ${validRules.map((rule) => `
                    <form class="planning-rule-card planning-rule-update-form" data-rule-id="${positiveInteger(rule.id)}">
                        <div class="planning-card-toolbar">
                            <div>
                                <h5>${escape(rule.title || 'Rule')}</h5>
                                <p>${escape(rule.scope || 'scope')} rule</p>
                            </div>
                            <div class="workspace-inline-actions">
                                <span class="workspace-pill ${rule.severity === 'hard' ? 'warning' : 'soft'}">${escape(rule.severity || 'soft')}</span>
                                <button class="workspace-btn-danger planning-delete-rule" type="button" data-rule-id="${positiveInteger(rule.id)}">Remove</button>
                            </div>
                        </div>
                        <div class="planning-inline-grid three">
                            <div class="workspace-field">
                                <label>Rule type</label>
                                <input name="rule_type" type="text" value="${escape(rule.rule_type || '')}" list="planningRuleTypes" required>
                            </div>
                            <div class="workspace-field">
                                <label>Severity</label>
                                <select name="severity">${renderRuleSeverityOptions(meta, rule.severity || 'soft')}</select>
                            </div>
                            <div class="workspace-field planning-switch">
                                <label>
                                    <input name="is_active" type="checkbox" ${rule.is_active ? 'checked' : ''}>
                                    Active
                                </label>
                            </div>
                        </div>
                        <div class="planning-inline-grid two">
                            <div class="workspace-field">
                                <label>Title</label>
                                <input name="title" type="text" value="${escape(rule.title || '')}" required>
                            </div>
                            <div class="workspace-field">
                                <label>Details</label>
                                <input name="details" type="text" value="${escape(rule.details || '')}" placeholder="Restriction details, preference notes, or instruction">
                            </div>
                        </div>
                        <div class="workspace-inline-actions">
                            <button class="workspace-btn-secondary" type="submit">Save rule</button>
                        </div>
                    </form>
                `).join('')}
            </div>
        `;
    }

    function renderTargetStack(targets) {
        const validTargets = (targets || []).filter((target) => positiveInteger(target?.id));
        if (validTargets.length === 0) {
            return '<div class="workspace-empty">No nutrient targets added yet.</div>';
        }

        return `
            <div class="planning-target-stack">
                ${validTargets.map((target) => `
                    <form class="planning-target-card planning-target-update-form" data-target-id="${positiveInteger(target.id)}">
                        <div class="planning-card-toolbar">
                            <div>
                                <h5>${escape(target.nutrient_code || 'Target')}</h5>
                                <p>${escape(target.unit || 'unit not set')}</p>
                            </div>
                            <button class="workspace-btn-danger planning-delete-target" type="button" data-target-id="${positiveInteger(target.id)}">Remove</button>
                        </div>
                        <div class="planning-inline-grid five">
                            <div class="workspace-field">
                                <label>Nutrient code</label>
                                <input name="nutrient_code" type="text" value="${escape(target.nutrient_code || '')}" list="planningNutrientCodes" required>
                            </div>
                            <div class="workspace-field">
                                <label>Unit</label>
                                <input name="unit" type="text" value="${escape(target.unit || '')}" placeholder="g or kcal">
                            </div>
                            <div class="workspace-field">
                                <label>Min</label>
                                <input name="min_value" type="number" step="0.1" value="${target.min_value ?? ''}">
                            </div>
                            <div class="workspace-field">
                                <label>Target</label>
                                <input name="target_value" type="number" step="0.1" value="${target.target_value ?? ''}">
                            </div>
                            <div class="workspace-field">
                                <label>Max</label>
                                <input name="max_value" type="number" step="0.1" value="${target.max_value ?? ''}">
                            </div>
                        </div>
                        <div class="workspace-inline-actions">
                            <button class="workspace-btn-secondary" type="submit">Save target</button>
                        </div>
                    </form>
                `).join('')}
            </div>
        `;
    }

    function renderScopeBuilder(title, description, endpointBase, rules, nutrientTargets, meta) {
        return `
            <div class="planning-scope-builder">
                <div class="planning-subsection-head">
                    <h5>${escape(title)}</h5>
                    <p>${escape(description)}</p>
                </div>
                <div class="planning-inline-grid two">
                    <div class="planning-scope-column">
                        <h6>Structured rules</h6>
                        ${renderRuleStack(rules, meta)}
                        <form class="planning-rule-create-form" data-rules-endpoint="${escape(endpointBase)}/rules">
                            <div class="planning-inline-grid three">
                                <div class="workspace-field">
                                    <label>Rule type</label>
                                    <input name="rule_type" type="text" list="planningRuleTypes" placeholder="clinical, allergy, timing" required>
                                </div>
                                <div class="workspace-field">
                                    <label>Severity</label>
                                    <select name="severity">${renderRuleSeverityOptions(meta, 'soft')}</select>
                                </div>
                                <div class="workspace-field planning-switch">
                                    <label>
                                        <input name="is_active" type="checkbox" checked>
                                        Active
                                    </label>
                                </div>
                            </div>
                            <div class="planning-inline-grid two">
                                <div class="workspace-field">
                                    <label>Title</label>
                                    <input name="title" type="text" placeholder="Low sodium, no lactose, post-workout meal" required>
                                </div>
                                <div class="workspace-field">
                                    <label>Details</label>
                                    <input name="details" type="text" placeholder="Explain how the rule should affect food selection">
                                </div>
                            </div>
                            <div class="workspace-inline-actions">
                                <button class="workspace-btn" type="submit">Add rule</button>
                            </div>
                        </form>
                    </div>
                    <div class="planning-scope-column">
                        <h6>Nutrient targets</h6>
                        ${renderTargetStack(nutrientTargets)}
                        <form class="planning-target-create-form" data-targets-endpoint="${escape(endpointBase)}/targets">
                            <div class="planning-inline-grid five">
                                <div class="workspace-field">
                                    <label>Nutrient code</label>
                                    <input name="nutrient_code" type="text" list="planningNutrientCodes" placeholder="ENERGY_KC" required>
                                </div>
                                <div class="workspace-field">
                                    <label>Unit</label>
                                    <input name="unit" type="text" placeholder="kcal or g">
                                </div>
                                <div class="workspace-field">
                                    <label>Min</label>
                                    <input name="min_value" type="number" step="0.1">
                                </div>
                                <div class="workspace-field">
                                    <label>Target</label>
                                    <input name="target_value" type="number" step="0.1">
                                </div>
                                <div class="workspace-field">
                                    <label>Max</label>
                                    <input name="max_value" type="number" step="0.1">
                                </div>
                            </div>
                            <div class="workspace-inline-actions">
                                <button class="workspace-btn" type="submit">Add target</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
    }

    function renderMealFoods(meal) {
        if (!meal.foods || meal.foods.length === 0) {
            return `<div class="workspace-empty">No foods added to this meal yet.</div>`;
        }

        return `
            <div class="planning-food-list">
                ${meal.foods.map((food) => `
                    <form class="planning-food-card planning-food-update-form" data-meal-food-id="${food.id}">
                        <div class="planning-food-card-head">
                            <div>
                                <h5>${escape(food.food_name || 'Food')}</h5>
                                <p>${escape(food.food_group_name || 'Food item')}</p>
                            </div>
                            <div class="workspace-inline-actions">
                                <button class="workspace-btn-secondary planning-fetch-suggestions" type="button" data-meal-food-id="${food.id}">
                                    Find swaps
                                </button>
                                <button class="workspace-btn-danger planning-delete-meal-food" type="button" data-meal-food-id="${food.id}">
                                    Remove
                                </button>
                            </div>
                        </div>
                        <div class="planning-inline-grid four">
                            <div class="workspace-field">
                                <label>Grams</label>
                                <input name="portion_grams" type="number" min="1" step="0.1" value="${escape(String(food.portion_grams || 100))}">
                            </div>
                            <div class="workspace-field">
                                <label>Portion note</label>
                                <input name="portion_description" type="text" value="${escape(food.portion_description || '')}" placeholder="1 cup cooked">
                            </div>
                            <div class="workspace-field">
                                <label>Measure</label>
                                <input name="household_measure" type="text" value="${escape(food.household_measure || '')}" placeholder="Cup">
                            </div>
                            <div class="workspace-field">
                                <label>Prep state</label>
                                <input name="preparation_state" type="text" value="${escape(food.preparation_state || '')}" placeholder="Cooked">
                            </div>
                        </div>
                        <div class="planning-inline-grid two">
                            <div class="workspace-field">
                                <label>Unit label</label>
                                <input name="unit_label" type="text" value="${escape(food.unit_label || '')}" placeholder="Serving">
                            </div>
                            <div class="workspace-field">
                                <label>Notes</label>
                                <input name="notes" type="text" value="${escape(food.notes || '')}" placeholder="Substitution or prep note">
                            </div>
                        </div>
                        ${renderSummary({ highlights: [
                            { label: 'Energy', value: food.calculated_nutrients?.ENERGY_KC || 0, unit: 'kcal' },
                            { label: 'Protein', value: food.calculated_nutrients?.PROCNT || 0, unit: 'g' },
                            { label: 'Carbohydrates', value: food.calculated_nutrients?.CHOCDF || 0, unit: 'g' },
                            { label: 'Fat', value: food.calculated_nutrients?.FAT || 0, unit: 'g' },
                            { label: 'Fiber', value: food.calculated_nutrients?.FIBTG || 0, unit: 'g' },
                        ]}, 'No nutrient totals yet.')}
                        <div id="planningSuggestions-${food.id}" class="planning-suggestions-slot"></div>
                        <div class="workspace-inline-actions">
                            <button class="workspace-btn" type="submit">Save portion</button>
                        </div>
                    </form>
                `).join('')}
            </div>
        `;
    }

    function renderMealCard(meal, foodGroups, meta) {
        return `
            <article class="planning-meal-card">
                <form class="planning-meal-form" data-meal-id="${meal.id}">
                    <div class="planning-card-toolbar">
                        <div>
                            <h4>${escape(meal.meal_name || 'Meal')}</h4>
                            <p>${escape(meal.meal_time || meal.meal_type || 'Schedule not set')}</p>
                        </div>
                        <div class="workspace-inline-actions">
                            <button class="workspace-btn-danger planning-delete-meal" type="button" data-meal-id="${meal.id}">Delete meal</button>
                        </div>
                    </div>
                    <div class="planning-inline-grid three">
                        <div class="workspace-field">
                            <label>Meal name</label>
                            <input name="meal_name" type="text" value="${escape(meal.meal_name || '')}" required>
                        </div>
                        <div class="workspace-field">
                            <label>Meal type</label>
                            <input name="meal_type" type="text" value="${escape(meal.meal_type || '')}" placeholder="breakfast, snack">
                        </div>
                        <div class="workspace-field">
                            <label>Meal time</label>
                            <input name="meal_time" type="text" value="${escape(meal.meal_time || '')}" placeholder="07:00">
                        </div>
                    </div>
                    <div class="planning-inline-grid two">
                        <div class="workspace-field">
                            <label>Instructions</label>
                            <textarea name="instructions" placeholder="Preparation directions or sequencing notes">${escape(meal.instructions || '')}</textarea>
                        </div>
                        <div class="workspace-field">
                            <label>Target notes</label>
                            <textarea name="target_notes" placeholder="How this meal should behave clinically or nutritionally">${escape(meal.target_notes || '')}</textarea>
                        </div>
                    </div>
                    ${renderSummary(meal.summary, 'No nutrient totals yet for this meal.')}
                    ${renderValidation(meal.validation, 'Meal validation')}
                    <div class="workspace-inline-actions">
                        <button class="workspace-btn" type="submit">Save meal</button>
                    </div>
                </form>
                <div class="planning-subsection">
                    ${renderScopeBuilder(
                        'Meal rules and targets',
                        'Use this when only this meal has a strict clinical rule or nutrient range.',
                        `/api/v2/planning/meals/${meal.id}`,
                        meal.rules || [],
                        meal.nutrient_targets || [],
                        meta,
                    )}
                </div>
                <div class="planning-subsection">
                    <div class="planning-subsection-head">
                        <h5>Foods in this meal</h5>
                        <span class="workspace-pill">${escape(String(meal.summary?.foods_count || 0))} foods</span>
                    </div>
                    ${renderMealFoods(meal)}
                </div>
                <div class="planning-subsection">
                    <div class="planning-subsection-head">
                        <h5>Add food</h5>
                        <p>Filter the food table through nutrient conditions and assign a working portion immediately. Build conditions with a nutritionist-friendly workflow instead of typing operators manually.</p>
                    </div>
                    <form class="planning-food-search-form planning-food-discovery-form" data-meal-id="${meal.id}">
                        <div class="planning-food-search-hero">
                            <div class="planning-search-spotlight">
                                <div class="planning-search-spotlight-icon" aria-hidden="true">F</div>
                                <div>
                                    <h6>Build a nutrient-first shortlist</h6>
                                    <p>Use nutrient codes, ranges, and clinical targets to surface foods that fit the meal you are planning.</p>
                                </div>
                            </div>
                            <div class="planning-food-search-tips">
                                <div class="planning-food-tip">
                                    <strong>Best for precise planning</strong>
                                    <span>Use nutrient codes like ENERGY_KC, PROCNT, FAT, CHOCDF, FIBTG, and NA.</span>
                                </div>
                                <div class="planning-food-tip">
                                    <strong>Built for idea generation</strong>
                                    <span>Switch between strict matching and broad exploration while you compose the meal.</span>
                                </div>
                            </div>
                        </div>
                        <div class="planning-food-search-grid single">
                            <div class="planning-search-card planning-search-card-emphasis">
                                <div class="workspace-field">
                                    <label>Match mode</label>
                                    <div class="planning-match-mode">
                                        <label class="planning-match-option">
                                            <input name="condition_mode" type="radio" value="all" checked>
                                            <span class="planning-match-option-copy">
                                                <strong>Match all conditions</strong>
                                                <small>Strict filtering when one food must satisfy every condition you set.</small>
                                            </span>
                                        </label>
                                        <label class="planning-match-option">
                                            <input name="condition_mode" type="radio" value="any">
                                            <span class="planning-match-option-copy">
                                                <strong>Match any condition</strong>
                                                <small>Broader exploration when you plan to combine several foods in the same meal.</small>
                                            </span>
                                        </label>
                                    </div>
                                </div>
                                <div class="planning-match-note">
                                    <strong>Planner tip</strong>
                                    <span>Use <strong>Match all</strong> for clinical precision. Use <strong>Match any</strong> when you are collecting options before deciding the final combination.</span>
                                </div>
                            </div>
                        </div>
                        <div class="planning-condition-builder">
                            <input type="hidden" name="structured_conditions" value="[]">
                            <input type="hidden" name="selected_operator" value=">=">
                            <div class="planning-subsection-head">
                                <h6>Structured meal conditions</h6>
                                <p>Add one condition at a time using codes, clear labels, and friendly operator cards.</p>
                            </div>
                            <div class="planning-inline-grid four">
                                <div class="workspace-field">
                                    <label>Nutrient code</label>
                                    <input name="condition_nutrient_code" type="text" list="planningNutrientCodes" placeholder="ENERGY_KC">
                                </div>
                                <div class="workspace-field">
                                    <label>Primary value</label>
                                    <input name="condition_value" type="number" step="0.1" placeholder="180">
                                </div>
                                <div class="workspace-field planning-condition-range-field hidden">
                                    <label>Maximum value</label>
                                    <input name="condition_max_value" type="number" step="0.1" placeholder="240">
                                </div>
                                <div class="workspace-field">
                                    <label>Unit</label>
                                    <input name="condition_unit" type="text" placeholder="kcal, g, mg">
                                </div>
                            </div>
                            <div class="workspace-field">
                                <label>Condition type</label>
                                ${renderConditionOperatorButtons('>=')}
                            </div>
                            <div class="workspace-inline-actions">
                                <button class="workspace-btn-secondary planning-add-condition" type="button">Add condition</button>
                                <button class="workspace-btn-secondary planning-clear-conditions" type="button">Clear conditions</button>
                            </div>
                            <div class="planning-structured-conditions-slot">
                                <div class="workspace-empty">No structured conditions added yet.</div>
                            </div>
                            <div class="workspace-field">
                                <label>Advanced manual condition text</label>
                                <input name="conditions" type="text" placeholder="Optional: ENERGY_KC >= 180, PROCNT >= 24, NA <= 300mg">
                                <small class="planning-field-note">Best results: use nutrient codes like ENERGY_KC, PROCNT, CHOCDF, FAT, FIBTG, and NA. Friendly aliases still work when available.</small>
                            </div>
                        </div>
                        <div class="planning-inline-grid three">
                            <div class="workspace-field">
                                <label>Food group</label>
                                <select name="food_group_id">
                                    <option value="">All groups</option>
                                    ${renderFoodGroupsOptions(foodGroups)}
                                </select>
                            </div>
                            <div class="workspace-field">
                                <label>&nbsp;</label>
                                <button class="workspace-btn" type="submit">Search</button>
                            </div>
                            <div class="workspace-field">
                                <label>&nbsp;</label>
                                <button class="workspace-btn-secondary planning-finish-food-search" type="button" data-meal-id="${meal.id}">Finish adding foods</button>
                            </div>
                        </div>
                    </form>
                    <div id="planningSearchResults-${meal.id}" class="planning-search-results"></div>
                </div>
                <div class="planning-subsection">
                    <div class="planning-subsection-head">
                        <h5>Add custom recipe or composite item</h5>
                        <p>Use this when the meal contains a prepared recipe, smoothie, blend, or custom exchange item.</p>
                    </div>
                    <form class="planning-custom-food-form" data-meal-id="${meal.id}">
                        <div class="planning-inline-grid three">
                            <div class="workspace-field">
                                <label>Item name</label>
                                <input name="food_name" type="text" placeholder="High-protein smoothie" required>
                            </div>
                            <div class="workspace-field">
                                <label>Category</label>
                                <input name="food_group_name" type="text" placeholder="Custom recipe">
                            </div>
                            <div class="workspace-field">
                                <label>Portion grams</label>
                                <input name="portion_grams" type="number" min="1" step="0.1" value="100" required>
                            </div>
                        </div>
                        <div class="planning-inline-grid two">
                            <div class="workspace-field">
                                <label>Portion note</label>
                                <input name="portion_description" type="text" placeholder="1 large shaker">
                            </div>
                            <div class="workspace-field">
                                <label>Notes</label>
                                <input name="notes" type="text" placeholder="Recipe-specific preparation note">
                            </div>
                        </div>
                        <div class="planning-inline-grid two">
                            <div class="workspace-field">
                                <label>Unit label</label>
                                <input name="unit_label" type="text" placeholder="Serving or kg/oz/lb">
                            </div>
                            <div class="workspace-field">
                                <label>Measure</label>
                                <input name="household_measure" type="text" placeholder="Bottle, scoop, shaker">
                            </div>
                        </div>
                        <div class="workspace-field">
                            <label>Nutrients per 100g</label>
                            <textarea name="nutrients_per_100g" placeholder="ENERGY_KC=180 kcal&#10;PROCNT=24 g&#10;CHOCDF=12 g&#10;FAT=4 g&#10;FIBTG=3 g" required></textarea>
                        </div>
                        <div class="workspace-inline-actions">
                            <button class="workspace-btn-secondary" type="submit">Add custom item</button>
                        </div>
                    </form>
                </div>
            </article>
        `;
    }

    function renderDayTabs(plan) {
        return `
            <div class="planning-day-strip">
                ${(plan.days || []).map((day) => `
                    <button class="planning-day-tab ${day.id === state.activeDayId ? 'active' : ''}" type="button" data-day-id="${day.id}">
                        <span>Day ${escape(String(day.day_index))}</span>
                        <strong>${escape(day.day_name || '')}</strong>
                        <small>${escape(day.actual_date || 'No date')}</small>
                    </button>
                `).join('')}
            </div>
        `;
    }

    function renderDayWorkspace(day, foodGroups, meta) {
        if (!day) {
            return `<div class="workspace-empty">Select a day to begin building meals.</div>`;
        }

        return `
            <div class="planning-day-workspace">
                <form id="planningDayForm" class="planning-day-form" data-day-id="${day.id}">
                    <div class="planning-card-toolbar">
                        <div>
                            <h4>Day ${escape(String(day.day_index))}: ${escape(day.day_name || '')}</h4>
                            <p>${escape(day.actual_date || 'No date assigned yet')}</p>
                        </div>
                        <div class="workspace-inline-actions">
                            <button class="workspace-btn-secondary" id="planningDuplicateDayBtn" type="button" data-day-id="${day.id}">Duplicate day</button>
                            <button class="workspace-btn-danger" id="planningDeleteDayBtn" type="button" data-day-id="${day.id}">Delete day</button>
                        </div>
                    </div>
                    <div class="planning-inline-grid three">
                        <div class="workspace-field">
                            <label>Day name</label>
                            <input name="day_name" type="text" value="${escape(day.day_name || '')}" required>
                        </div>
                        <div class="workspace-field">
                            <label>Date</label>
                            <input name="actual_date" type="date" value="${escape(day.actual_date || '')}">
                        </div>
                        <div class="workspace-field">
                            <label>Template group</label>
                            <input name="template_group" type="text" value="${escape(day.template_group || '')}" placeholder="Weekday / weekend / training day">
                        </div>
                    </div>
                    <div class="workspace-field">
                        <label>Day notes</label>
                        <textarea name="notes" placeholder="How this day differs from the others">${escape(day.notes || '')}</textarea>
                    </div>
                    ${renderSummary(day.summary, 'No nutrient totals yet for this day.')}
                    ${renderValidation(day.validation, 'Day validation')}
                    <div class="workspace-inline-actions">
                        <button class="workspace-btn" type="submit">Save day</button>
                    </div>
                </form>
                <article class="planning-add-meal-card">
                    ${renderScopeBuilder(
                        'Day rules and targets',
                        'Set day-level restrictions such as fasting structure, training-day energy, or hydration goals.',
                        `/api/v2/planning/days/${day.id}`,
                        day.rules || [],
                        day.nutrient_targets || [],
                        meta,
                    )}
                </article>
                <article class="planning-add-meal-card">
                    <div class="planning-subsection-head">
                        <h5>Add a meal</h5>
                        <p>Build the daily structure the same way a nutritionist plans in practice.</p>
                    </div>
                    <form id="planningAddMealForm" data-day-id="${day.id}">
                        <div class="planning-inline-grid three">
                            <div class="workspace-field">
                                <label>Meal name</label>
                                <input name="meal_name" type="text" placeholder="Breakfast" required>
                            </div>
                            <div class="workspace-field">
                                <label>Meal type</label>
                                <input name="meal_type" type="text" placeholder="breakfast, snack">
                            </div>
                            <div class="workspace-field">
                                <label>Meal time</label>
                                <input name="meal_time" type="text" placeholder="07:00">
                            </div>
                        </div>
                        <div class="planning-inline-grid two">
                            <div class="workspace-field">
                                <label>Instructions</label>
                                <textarea name="instructions" placeholder="Preparation or serving instructions"></textarea>
                            </div>
                            <div class="workspace-field">
                                <label>Target notes</label>
                                <textarea name="target_notes" placeholder="Why this meal exists in the day"></textarea>
                            </div>
                        </div>
                        <div class="workspace-inline-actions">
                            <button class="workspace-btn" type="submit">Add meal</button>
                        </div>
                    </form>
                </article>
                <div class="planning-meal-stack">
                    ${(day.meals || []).length > 0
                        ? day.meals.map((meal) => renderMealCard(meal, foodGroups, meta)).join('')
                        : '<div class="workspace-empty">This day has no meals yet. Add the first meal above.</div>'}
                </div>
            </div>
        `;
    }

    function renderPlannerEditor(plan, meta, foodGroups, context) {
        const versions = plan.versions || [];
        const activeDay = (plan.days || []).find((day) => day.id === state.activeDayId) || plan.days?.[0];
        const focused = isFocusedPlanPage(context);

        return `
            <article class="workspace-panel planning-editor">
                <div class="workspace-panel-head">
                    <div>
                        <h3>${escape(plan.title)}</h3>
                        <p>${escape(plan.client_display_label || 'Anonymous planning reference')} ${plan.client_code ? `(${escape(plan.client_code)})` : ''}</p>
                    </div>
                    <div class="workspace-inline-actions">
                        ${focused ? '<a class="workspace-btn-secondary" href="meal-planning">Back to studio</a>' : ''}
                        <button class="workspace-btn-secondary" id="planningRefreshBtn" type="button">Refresh</button>
                        <button class="workspace-btn-secondary" id="planningCloneCurrentBtn" type="button">Clone plan</button>
                        <button class="workspace-btn-secondary" id="planningAddDayBtn" type="button">Add day</button>
                        <button class="workspace-btn" id="planningFinalizeBtn" type="button">Finalize version</button>
                    </div>
                </div>
                <div class="workspace-panel-body">
                    ${renderSummary(plan.summary, 'No nutrient totals yet for this plan.')}
                    <div class="planning-kpi-row">
                        <div class="planning-kpi">
                            <span>Status</span>
                            <strong>${escape(plan.status)}</strong>
                        </div>
                        <div class="planning-kpi">
                            <span>Plan type</span>
                            <strong>${escape(plan.plan_type)}</strong>
                        </div>
                        <div class="planning-kpi">
                            <span>Days</span>
                            <strong>${escape(String(plan.days_count || 0))}</strong>
                        </div>
                        <div class="planning-kpi">
                            <span>Versions</span>
                            <strong>${escape(String(versions.length))}</strong>
                        </div>
                    </div>
                    ${renderValidation(plan.effective_validation || plan.validation, 'Plan validation')}
                    <div class="workspace-grid two">
                        <form id="planningPlanSettingsForm" class="planning-day-form" data-plan-id="${plan.id}">
                            <div class="planning-subsection-head">
                                <h5>Plan settings</h5>
                                <p>Update the planning frame without leaving the active draft.</p>
                            </div>
                            <div class="planning-inline-grid three">
                                <div class="workspace-field">
                                    <label>Title</label>
                                    <input name="title" type="text" value="${escape(plan.title || '')}" required>
                                </div>
                                <div class="workspace-field">
                                    <label>Start date</label>
                                    <input name="start_date" type="date" value="${escape(plan.start_date || '')}">
                                </div>
                                <div class="workspace-field">
                                    <label>Cycle length</label>
                                    <input name="cycle_length" type="number" min="1" max="90" value="${plan.cycle_length ?? ''}">
                                </div>
                            </div>
                            <div class="workspace-field">
                                <label>Plan notes</label>
                                <textarea name="notes" placeholder="High-level planning strategy and rationale">${escape(plan.notes || '')}</textarea>
                            </div>
                            <div class="workspace-inline-actions">
                                <button class="workspace-btn" type="submit">Save plan settings</button>
                            </div>
                        </form>
                        <article class="planning-add-meal-card">
                            ${renderScopeBuilder(
                                'Plan-wide rules and targets',
                                'Capture the global clinical logic that should guide every day and meal in this plan.',
                                `/api/v2/planning/plans/${plan.id}`,
                                plan.rules || [],
                                plan.nutrient_targets || [],
                                meta,
                            )}
                        </article>
                    </div>
                    ${renderClientProfile(plan.client_profile)}
                    <div class="planning-callout">
                        <strong>Planner behavior</strong>
                        Edits after finalization reopen the draft automatically while keeping the earlier finalized version snapshot intact.
                    </div>
                    ${renderDayTabs(plan)}
                    ${renderDayWorkspace(activeDay, foodGroups, meta)}
                </div>
            </article>
        `;
    }

    async function fetchPlannerData(selectedPlanId, options = {}) {
        const focused = Boolean(options.focused);

        if (focused) {
            const [meta, foodGroups, selectedPlan] = await Promise.all([
                WorkspaceCore.apiJson('/api/v2/planning/meta'),
                WorkspaceCore.apiJson('/api/v1/food-groups?limit=250'),
                selectedPlanId ? WorkspaceCore.apiJson(`/api/v2/planning/plans/${selectedPlanId}`) : Promise.resolve(null),
            ]);

            return {
                meta,
                clients: { data: [], total: 0 },
                plans: { data: [], total: 0 },
                foodGroups: foodGroups?.data || [],
                selectedPlan,
            };
        }

        const responses = await Promise.all([
            WorkspaceCore.apiJson('/api/v2/planning/meta'),
            WorkspaceCore.apiJson('/api/v2/planning/clients'),
            WorkspaceCore.apiJson('/api/v2/planning/plans'),
            WorkspaceCore.apiJson('/api/v1/food-groups?limit=250'),
            selectedPlanId ? WorkspaceCore.apiJson(`/api/v2/planning/plans/${selectedPlanId}`) : Promise.resolve(null),
        ]);

        return {
            meta: responses[0],
            clients: responses[1],
            plans: responses[2],
            foodGroups: responses[3]?.data || [],
            selectedPlan: responses[4],
        };
    }

    async function renderPlanningStudio(context) {
        loadMealSearches();
        const selectedPlanId = getSelectedPlanId();
        const focused = isFocusedPlanPage(context);
        const { meta, clients, plans, foodGroups, selectedPlan } = await fetchPlannerData(selectedPlanId, { focused });

        if (selectedPlan?.days?.length) {
            const dayStillVisible = selectedPlan.days.some((day) => day.id === state.activeDayId);
            if (!dayStillVisible) {
                state.activeDayId = selectedPlan.days[0].id;
            }
        } else {
            state.activeDayId = null;
        }

        const heroCards = selectedPlan ? [
            { label: 'Plan days', value: String(selectedPlan.days_count || 0), caption: selectedPlan.plan_type },
            { label: 'Meals in plan', value: String(selectedPlan.summary?.meal_count || 0), caption: 'All days combined' },
            { label: 'Foods assigned', value: String(selectedPlan.summary?.foods_count || 0), caption: 'Snapshot items' },
            { label: 'Final versions', value: String((selectedPlan.versions || []).length), caption: 'Immutable checkpoints' },
        ] : [
            { label: 'Plan types', value: String((meta.plan_types || []).length), caption: 'Dated, cycle, template' },
            { label: 'Planning clients', value: String(clients.total || 0), caption: 'Privacy-safe references' },
            { label: 'Drafts available', value: String(plans.total || 0), caption: 'Ready for editing' },
            { label: 'Food groups', value: String(foodGroups.length || 0), caption: 'Available in search' },
        ];

        if (focused) {
            context.setPageBody(`
                <datalist id="planningNutrientCodes">
                    ${getPlanningNutrientCatalog(meta).map((item) => `<option value="${escape(item.code)}">${escape(item.label || item.code)}${item.unit ? ` (${escape(item.unit)})` : ''}</option>`).join('')}
                </datalist>
                <datalist id="planningRuleTypes">
                    ${(meta.rule_types || []).map((ruleType) => `<option value="${escape(ruleType)}"></option>`).join('')}
                </datalist>
                <section class="workspace-hero">
                    <div>
                        <h3>Focused Plan Workspace</h3>
                        <p>Work on one plan at a time so all attention stays on the selected client-safe planning record, its days, meals, foods, and versions.</p>
                    </div>
                    ${context.renderStats(heroCards)}
                </section>
                ${selectedPlan ? renderPlannerEditor(selectedPlan, meta, foodGroups, context) : `
                    <article class="workspace-panel">
                        <div class="workspace-panel-head">
                            <div>
                                <h3>No plan selected</h3>
                                <p>Open a draft from the planning studio or plan registry to load its dedicated workspace.</p>
                            </div>
                            <div class="workspace-inline-actions">
                                <a class="workspace-btn-secondary" href="meal-planning">Back to studio</a>
                            </div>
                        </div>
                        <div class="workspace-panel-body">
                            <div class="workspace-empty">This page needs a plan id in the URL, for example plan-workspace?plan=1.</div>
                        </div>
                    </article>
                `}
            `);

            bindPlanningEvents(context, foodGroups);
            return;
        }

        context.setPageBody(`
            <datalist id="planningNutrientCodes">
                ${getPlanningNutrientCatalog(meta).map((item) => `<option value="${escape(item.code)}">${escape(item.label || item.code)}${item.unit ? ` (${escape(item.unit)})` : ''}</option>`).join('')}
            </datalist>
            <datalist id="planningRuleTypes">
                ${(meta.rule_types || []).map((ruleType) => `<option value="${escape(ruleType)}"></option>`).join('')}
            </datalist>
            <section class="workspace-hero">
                <div>
                    <h3>Planning Studio</h3>
                    <p>Build multi-day nutrition plans the way real nutritionists work: client-safe context first, then days, then meals, then foods, with live totals and versioned finalization.</p>
                </div>
                ${context.renderStats(heroCards)}
            </section>
            <div class="workspace-grid two">
                <article class="workspace-panel">
                    <div class="workspace-panel-head">
                        <div>
                            <h3>Create privacy-safe client</h3>
                            <p>Only planning-safe reference data is shown in the editor.</p>
                        </div>
                    </div>
                    <div class="workspace-panel-body">
                        <form id="planningClientForm" class="workspace-form-grid">
                            <div class="workspace-field">
                                <label>Client code</label>
                                <input name="client_code" type="text" placeholder="CL-204" required>
                            </div>
                            <div class="workspace-field">
                                <label>Display label</label>
                                <input name="display_label" type="text" placeholder="Sports client A" required>
                            </div>
                            <div class="workspace-field">
                                <label>Age group</label>
                                <input name="age_group" type="text" placeholder="Adult">
                            </div>
                            <div class="workspace-field">
                                <label>Sex</label>
                                <select name="sex">
                                    <option value="">Not set</option>
                                    <option value="female">Female</option>
                                    <option value="male">Male</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div class="workspace-field span-2">
                                <label>Clinical summary</label>
                                <textarea name="clinical_summary" placeholder="Planning-safe restrictions, diagnoses, or context"></textarea>
                            </div>
                            <div class="workspace-field">
                                <label>Dietary pattern</label>
                                <input name="dietary_pattern" type="text" placeholder="Vegetarian, low sodium, diabetic">
                            </div>
                            <div class="workspace-field">
                                <label>Preferences</label>
                                <input name="preferences" type="text" placeholder="Likes, dislikes, culture notes">
                            </div>
                            <div class="workspace-inline-actions span-2">
                                <button class="workspace-btn" type="submit">Create planning client</button>
                            </div>
                        </form>
                    </div>
                </article>
                <article class="workspace-panel">
                    <div class="workspace-panel-head">
                        <div>
                            <h3>Create multi-day plan</h3>
                            <p>Generate the calendar structure first, then fill each day realistically.</p>
                        </div>
                    </div>
                    <div class="workspace-panel-body">
                        <form id="planningPlanForm" class="workspace-form-grid">
                            <div class="workspace-field">
                                <label>Plan title</label>
                                <input name="title" type="text" placeholder="7-Day Muscle Gain Phase" required>
                            </div>
                            <div class="workspace-field">
                                <label>Plan type</label>
                                <select name="plan_type">
                                    ${(meta.plan_types || []).map((planType) => `<option value="${escape(planType.value)}">${escape(planType.label)}</option>`).join('')}
                                </select>
                            </div>
                            <div class="workspace-field">
                                <label>Client</label>
                                <select name="client_id">
                                    <option value="">Anonymous / template</option>
                                    ${(clients.data || []).map((client) => `<option value="${client.id}">${escape(client.display_label)} (${escape(client.client_code)})</option>`).join('')}
                                </select>
                            </div>
                            <div class="workspace-field">
                                <label>Start date</label>
                                <input name="start_date" type="date">
                            </div>
                            <div class="workspace-field">
                                <label>Days count</label>
                                <input name="days_count" type="number" min="1" max="90" value="7">
                            </div>
                            <div class="workspace-field">
                                <label>Cycle length</label>
                                <input name="cycle_length" type="number" min="1" max="90" placeholder="Optional">
                            </div>
                            <div class="workspace-field span-2">
                                <label>Notes</label>
                                <textarea name="notes" placeholder="Planning strategy, cadence, reminders"></textarea>
                            </div>
                            <div class="workspace-field span-2 planning-switch">
                                <label>
                                    <input name="use_default_meal_template" type="checkbox" checked>
                                    Start with a standard meal schedule
                                </label>
                            </div>
                            <div class="workspace-inline-actions span-2">
                                <button class="workspace-btn" type="submit">Create plan draft</button>
                            </div>
                        </form>
                    </div>
                </article>
            </div>
            <div class="workspace-grid two">
                <article class="workspace-panel">
                    <div class="workspace-panel-head">
                        <div>
                            <h3>Planning clients</h3>
                            <p>Privacy-safe references available to the planner.</p>
                        </div>
                    </div>
                    <div class="workspace-panel-body">
                        ${WorkspaceCore.renderTable([
                            { label: 'Code', key: 'client_code' },
                            { label: 'Display label', key: 'display_label' },
                            { label: 'Assigned', render: (row) => escape(row.assigned_nutritionist_name || 'Unassigned') },
                            { label: 'Pattern', render: (row) => escape(row.profile?.dietary_pattern || '—') },
                        ], clients.data || [], 'No planning clients created yet.')}
                    </div>
                </article>
                <article class="workspace-panel">
                    <div class="workspace-panel-head">
                        <div>
                            <h3>Plan drafts and versions</h3>
                            <p>Open a plan below to continue building days, meals, and foods.</p>
                        </div>
                        <div class="workspace-inline-actions">
                            ${selectedPlan ? '<button class="workspace-btn-secondary" id="planningClearSelectionBtn" type="button">Clear selection</button>' : ''}
                        </div>
                    </div>
                    <div class="workspace-panel-body">
                        ${renderPlanList(plans.data || [], selectedPlan?.id || null, context)}
                    </div>
                </article>
            </div>
            ${selectedPlan ? renderPlannerEditor(selectedPlan, meta, foodGroups, context) : `
                <article class="workspace-panel">
                    <div class="workspace-panel-body">
                        <div class="workspace-empty">Open one of the drafts above to start editing days, meals, and foods.</div>
                    </div>
                </article>
            `}
        `);

        bindPlanningEvents(context, foodGroups);
    }

    function clearMealSearchContainer(mealId) {
        const resultsContainer = document.getElementById(`planningSearchResults-${mealId}`);
        if (resultsContainer) {
            resultsContainer.innerHTML = '';
        }
    }

    function collectMealSearchFormState(form, overrides = {}) {
        const mealId = positiveInteger(form?.dataset?.mealId);
        if (!mealId) return null;
        const formData = new FormData(form);
        const current = getMealSearchState(mealId) || {};
        return setMealSearchState(mealId, {
            structuredConditions: parseStructuredConditionsValue(form.querySelector('input[name="structured_conditions"]')?.value),
            selectedOperator: String(form.querySelector('input[name="selected_operator"]')?.value || '>=').trim(),
            manualConditions: String(formData.get('conditions') || '').trim(),
            conditionMode: String(formData.get('condition_mode') || 'all').trim(),
            foodGroupId: String(formData.get('food_group_id') || '').trim(),
            result: Object.prototype.hasOwnProperty.call(overrides, 'result') ? overrides.result : current.result || null,
        });
    }

    function hydrateMealSearchForm(form) {
        const mealId = positiveInteger(form?.dataset?.mealId);
        const saved = mealId ? getMealSearchState(mealId) : null;
        if (!saved) return;

        const hiddenConditions = form.querySelector('input[name="structured_conditions"]');
        const selectedOperator = form.querySelector('input[name="selected_operator"]');
        const manualConditions = form.querySelector('input[name="conditions"]');
        const foodGroup = form.querySelector('select[name="food_group_id"]');

        if (hiddenConditions) {
            hiddenConditions.value = JSON.stringify(saved.structuredConditions || []);
        }
        if (selectedOperator) {
            selectedOperator.value = saved.selectedOperator || '>=';
        }
        if (manualConditions) {
            manualConditions.value = saved.manualConditions || '';
        }
        if (foodGroup) {
            foodGroup.value = saved.foodGroupId || '';
        }
        if (saved.conditionMode) {
            const modeInput = Array.from(form.querySelectorAll('input[name="condition_mode"]'))
                .find((input) => input.value === saved.conditionMode);
            if (modeInput) {
                modeInput.checked = true;
            }
        }
    }

    function markMealSearchChanged(form) {
        const mealId = positiveInteger(form?.dataset?.mealId);
        if (!mealId) return;
        collectMealSearchFormState(form, { result: null });
        clearMealSearchContainer(mealId);
    }

    function refreshStructuredConditionBuilder(form, options = {}) {
        const slot = form.querySelector('.planning-structured-conditions-slot');
        const hiddenInput = form.querySelector('input[name="structured_conditions"]');
        if (!slot || !hiddenInput) {
            return;
        }
        const conditions = parseStructuredConditionsValue(hiddenInput.value);
        slot.innerHTML = renderStructuredConditionChips(conditions);

        slot.querySelectorAll('.planning-remove-condition').forEach((button) => {
            button.addEventListener('click', () => {
                const nextConditions = parseStructuredConditionsValue(hiddenInput.value);
                nextConditions.splice(Number(button.dataset.conditionIndex), 1);
                hiddenInput.value = JSON.stringify(nextConditions);
                refreshStructuredConditionBuilder(form);
                if (options.persistChanges !== false) {
                    markMealSearchChanged(form);
                }
            });
        });
    }

    function bindConditionBuilder(form) {
        const hiddenConditions = form.querySelector('input[name="structured_conditions"]');
        const selectedOperatorInput = form.querySelector('input[name="selected_operator"]');
        const nutrientCodeInput = form.querySelector('input[name="condition_nutrient_code"]');
        const valueInput = form.querySelector('input[name="condition_value"]');
        const maxValueInput = form.querySelector('input[name="condition_max_value"]');
        const unitInput = form.querySelector('input[name="condition_unit"]');
        const rangeField = form.querySelector('.planning-condition-range-field');

        hydrateMealSearchForm(form);

        function syncOperatorUi(selectedOperator) {
            selectedOperatorInput.value = selectedOperator;
            form.querySelectorAll('.planning-operator-btn').forEach((button) => {
                button.classList.toggle('active', button.dataset.operatorValue === selectedOperator);
            });
            rangeField?.classList.toggle('hidden', selectedOperator !== 'range');
        }

        form.querySelectorAll('.planning-operator-btn').forEach((button) => {
            button.addEventListener('click', () => {
                syncOperatorUi(button.dataset.operatorValue || '>=');
                collectMealSearchFormState(form);
            });
        });

        form.querySelector('.planning-add-condition')?.addEventListener('click', () => {
            const nutrientCode = String(nutrientCodeInput?.value || '').trim().toUpperCase();
            const operator = String(selectedOperatorInput?.value || '>=').trim();
            const primaryValue = String(valueInput?.value || '').trim();
            const secondaryValue = String(maxValueInput?.value || '').trim();
            const unit = String(unitInput?.value || '').trim();

            if (!nutrientCode || !primaryValue || (operator === 'range' && !secondaryValue)) {
                WorkspaceCore.showAlert('Add a nutrient code and the required value fields before saving a condition.', 'error');
                return;
            }

            const conditions = parseStructuredConditionsValue(hiddenConditions?.value);
            conditions.push(
                operator === 'range'
                    ? {
                        nutrient_code: nutrientCode,
                        operator,
                        min_value: Number(primaryValue),
                        max_value: Number(secondaryValue),
                        unit,
                    }
                    : {
                        nutrient_code: nutrientCode,
                        operator,
                        value: Number(primaryValue),
                        unit,
                    }
            );
            hiddenConditions.value = JSON.stringify(conditions);
            nutrientCodeInput.value = '';
            valueInput.value = '';
            if (maxValueInput) {
                maxValueInput.value = '';
            }
            if (unitInput) {
                unitInput.value = '';
            }
            syncOperatorUi('>=');
            refreshStructuredConditionBuilder(form);
            markMealSearchChanged(form);
        });

        form.querySelector('.planning-clear-conditions')?.addEventListener('click', () => {
            hiddenConditions.value = '[]';
            refreshStructuredConditionBuilder(form);
            markMealSearchChanged(form);
        });

        syncOperatorUi(selectedOperatorInput?.value || '>=');
        refreshStructuredConditionBuilder(form, { persistChanges: false });

        form.querySelector('input[name="conditions"]')?.addEventListener('input', () => markMealSearchChanged(form));
        form.querySelector('select[name="food_group_id"]')?.addEventListener('change', () => markMealSearchChanged(form));
        form.querySelectorAll('input[name="condition_mode"]').forEach((input) => {
            input.addEventListener('change', () => markMealSearchChanged(form));
        });
    }

    function buildCombinedConditionString(form) {
        const hiddenConditions = form.querySelector('input[name="structured_conditions"]');
        const manualConditions = String(form.querySelector('input[name="conditions"]')?.value || '').trim();
        const structuredConditions = parseStructuredConditionsValue(hiddenConditions?.value).map(serializeStructuredCondition).filter(Boolean);
        return [...structuredConditions, ...(manualConditions ? [manualConditions] : [])].join(', ');
    }

    function renderFoodSearchResults(mealId, result, context) {
        const resultsContainer = document.getElementById(`planningSearchResults-${mealId}`);
        if (!resultsContainer || !result) return;

        const foods = result.data || [];
        if (foods.length === 0) {
            resultsContainer.innerHTML = '<div class="workspace-empty">No foods matched this search.</div>';
            return;
        }

        resultsContainer.innerHTML = `
            <div class="planning-search-stack">
                ${result.applied_conditions?.length ? `
                    <div class="planning-search-meta">
                        <span class="workspace-pill ${result.condition_mode === 'any' ? 'warning' : 'soft'}">${escape(result.condition_mode === 'any' ? 'match any condition' : 'match all conditions')}</span>
                        ${result.applied_conditions.map((condition) => `
                            <span class="workspace-pill soft">${escape(condition.nutrient_code)} ${escape(condition.operator)} ${escape(condition.value)} ${escape(condition.unit || '')}</span>
                        `).join('')}
                    </div>
                ` : ''}
                ${result.rule_context ? `
                    <div class="planning-search-meta">
                        <span class="workspace-pill soft">${escape(String(result.rule_context.rules_count || 0))} effective rules</span>
                        <span class="workspace-pill soft">${escape(String(result.rule_context.targets_count || 0))} effective targets</span>
                        ${result.excluded_count ? `<span class="workspace-pill warning">${escape(String(result.excluded_count))} foods hidden by hard rules</span>` : ''}
                    </div>
                ` : ''}
                ${foods.map((food) => `
                    <form class="planning-search-card planning-add-food-form" data-meal-id="${mealId}" data-food-id="${food.id}">
                        <div class="planning-search-card-head">
                            <div>
                                <h5>${escape(food.name || '')}</h5>
                                <p>${escape(food.food_group_name || 'Food item')}</p>
                            </div>
                            <div class="workspace-inline-actions">
                                <span class="workspace-pill soft">${escape(food.code || 'No code')}</span>
                                ${food.compatibility?.warnings?.length ? '<span class="workspace-pill warning">rule warning</span>' : ''}
                            </div>
                        </div>
                        ${renderSummary(food.summary, 'No nutrient snapshot available.')}
                        ${food.target_preview?.length ? `
                            <div class="planning-target-preview">
                                ${food.target_preview.map((item) => `
                                    <div class="planning-target-preview-item">
                                        <span>${escape(item.nutrient_code)}</span>
                                        <strong>${escape(String(item.value ?? 0))} ${escape(item.unit || '')}</strong>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                        ${food.compatibility?.warnings?.length ? `
                            <div class="planning-search-warning">
                                ${food.compatibility.warnings.map((warning) => `
                                    <p><strong>${escape(warning.title || 'Rule warning')}:</strong> ${escape((warning.matched_keywords || []).join(', '))}</p>
                                `).join('')}
                            </div>
                        ` : ''}
                        <div class="planning-inline-grid four">
                            <div class="workspace-field">
                                <label>Grams</label>
                                <input name="portion_grams" type="number" min="1" step="0.1" value="100" placeholder="100">
                            </div>
                            <div class="workspace-field">
                                <label>Portion note</label>
                                <input name="portion_description" type="text" placeholder="1 cup">
                            </div>
                            <div class="workspace-field">
                                <label>Measure</label>
                                <input name="household_measure" type="text" placeholder="Cup">
                            </div>
                            <div class="workspace-field">
                                <label>Prep state</label>
                                <input name="preparation_state" type="text" placeholder="Cooked">
                            </div>
                        </div>
                        <div class="planning-inline-grid two">
                            <div class="workspace-field">
                                <label>Unit label</label>
                                <input name="unit_label" type="text" placeholder="Serving or kg/oz/lb">
                            </div>
                            <div class="workspace-field">
                                <label>Notes</label>
                                <input name="notes" type="text" placeholder="Swap, prep, timing note">
                            </div>
                        </div>
                        <div class="workspace-inline-actions">
                            <button class="workspace-btn" type="submit">Add to meal</button>
                        </div>
                    </form>
                `).join('')}
            </div>
        `;

        resultsContainer.querySelectorAll('.planning-add-food-form').forEach((addForm) => {
            addForm.addEventListener('submit', async (submitEvent) => {
                submitEvent.preventDefault();
                const foodId = requirePlanningId(addForm.dataset.foodId, 'Food');
                if (!foodId) return;
                const addFormData = new FormData(addForm);
                try {
                    await WorkspaceCore.apiJson(`/api/v2/planning/meals/${mealId}/foods`, {
                        method: 'POST',
                        body: {
                            food_id: foodId,
                            portion_grams: Number(addFormData.get('portion_grams')),
                            portion_description: addFormData.get('portion_description') || null,
                            household_measure: addFormData.get('household_measure') || null,
                            unit_label: addFormData.get('unit_label') || null,
                            preparation_state: addFormData.get('preparation_state') || null,
                            notes: addFormData.get('notes') || null,
                        },
                    });
                    setMealSearchState(mealId, { result });
                    WorkspaceCore.showAlert('Food added to meal. Search conditions and matching foods are still available.', 'success');
                    await renderPlanningStudio(context);
                } catch (error) {
                    WorkspaceCore.showAlert(error.message, 'error');
                }
            });
        });
    }

    function bindPlanningEvents(context, foodGroups) {
        document.getElementById('planningClientForm')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);

            try {
                await WorkspaceCore.apiJson('/api/v2/planning/clients', {
                    method: 'POST',
                    body: {
                        client_code: formData.get('client_code'),
                        display_label: formData.get('display_label'),
                        profile: {
                            age_group: formData.get('age_group'),
                            sex: formData.get('sex'),
                            clinical_summary: formData.get('clinical_summary'),
                            dietary_pattern: formData.get('dietary_pattern'),
                            preferences: formData.get('preferences'),
                        },
                    },
                });
                WorkspaceCore.showAlert('Planning client created.', 'success');
                await renderPlanningStudio(context);
            } catch (error) {
                WorkspaceCore.showAlert(error.message, 'error');
            }
        });

        document.getElementById('planningPlanForm')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);

            try {
                const plan = await WorkspaceCore.apiJson('/api/v2/planning/plans', {
                    method: 'POST',
                    body: {
                        title: formData.get('title'),
                        client_id: formData.get('client_id') ? Number(formData.get('client_id')) : null,
                        plan_type: formData.get('plan_type'),
                        start_date: formData.get('start_date') || null,
                        days_count: Number(formData.get('days_count') || 1),
                        cycle_length: formData.get('cycle_length') ? Number(formData.get('cycle_length')) : null,
                        notes: formData.get('notes') || null,
                        use_default_meal_template: formData.get('use_default_meal_template') === 'on',
                    },
                });
                WorkspaceCore.showAlert('Plan draft created.', 'success');
                openFocusedPlan(plan.id);
            } catch (error) {
                WorkspaceCore.showAlert(error.message, 'error');
            }
        });

        document.querySelectorAll('.planning-clone-plan').forEach((button) => {
            button.addEventListener('click', async () => {
                const sourcePlanId = requirePlanningId(button.dataset.planId, 'Plan');
                if (!sourcePlanId) return;
                const baseTitle = button.dataset.planTitle || 'Plan';
                const cloneOptions = promptCloneOptions(baseTitle);
                if (!cloneOptions) return;
                try {
                    const cloned = await WorkspaceCore.apiJson(`/api/v2/planning/plans/${sourcePlanId}/clone`, {
                        method: 'POST',
                        body: cloneOptions,
                    });
                    WorkspaceCore.showAlert('Plan cloned with its structure and clinical logic.', 'success');
                    openFocusedPlan(cloned.id);
                } catch (error) {
                    WorkspaceCore.showAlert(error.message, 'error');
                }
            });
        });

        document.getElementById('planningClearSelectionBtn')?.addEventListener('click', async () => {
            setSelectedPlanId(null);
            state.activeDayId = null;
            await renderPlanningStudio(context);
        });

        document.querySelectorAll('.planning-day-tab').forEach((button) => {
            button.addEventListener('click', async () => {
                state.activeDayId = requirePlanningId(button.dataset.dayId, 'Day');
                if (!state.activeDayId) return;
                await renderPlanningStudio(context);
            });
        });

        document.getElementById('planningRefreshBtn')?.addEventListener('click', async () => {
            await renderPlanningStudio(context);
        });

        document.getElementById('planningCloneCurrentBtn')?.addEventListener('click', async () => {
            const planId = getSelectedPlanId();
            if (!planId) return;
            const baseTitle = document.querySelector('.planning-editor h3')?.textContent || 'Plan';
            const cloneOptions = promptCloneOptions(baseTitle);
            if (!cloneOptions) return;
            try {
                const cloned = await WorkspaceCore.apiJson(`/api/v2/planning/plans/${planId}/clone`, {
                    method: 'POST',
                    body: cloneOptions,
                });
                WorkspaceCore.showAlert('Plan cloned and opened in its focused workspace.', 'success');
                openFocusedPlan(cloned.id);
            } catch (error) {
                WorkspaceCore.showAlert(error.message, 'error');
            }
        });

        document.getElementById('planningPlanSettingsForm')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const planId = requirePlanningId(event.currentTarget.dataset.planId, 'Plan');
            if (!planId) return;
            const formData = new FormData(event.currentTarget);
            try {
                await WorkspaceCore.apiJson(`/api/v2/planning/plans/${planId}`, {
                    method: 'PATCH',
                    body: {
                        title: formData.get('title'),
                        start_date: formData.get('start_date') || null,
                        cycle_length: numberOrNull(formData.get('cycle_length')),
                        notes: formData.get('notes') || null,
                    },
                });
                WorkspaceCore.showAlert('Plan settings updated.', 'success');
                await renderPlanningStudio(context);
            } catch (error) {
                WorkspaceCore.showAlert(error.message, 'error');
            }
        });

        document.getElementById('planningAddDayBtn')?.addEventListener('click', async () => {
            const planId = getSelectedPlanId();
            if (!planId) return;
            try {
                await WorkspaceCore.apiJson(`/api/v2/planning/plans/${planId}/days`, {
                    method: 'POST',
                    body: {},
                });
                WorkspaceCore.showAlert('Day added to plan.', 'success');
                await renderPlanningStudio(context);
            } catch (error) {
                WorkspaceCore.showAlert(error.message, 'error');
            }
        });

        document.getElementById('planningFinalizeBtn')?.addEventListener('click', async () => {
            const planId = getSelectedPlanId();
            if (!planId) return;
            try {
                const result = await WorkspaceCore.apiJson(`/api/v2/planning/plans/${planId}/versions/finalize`, {
                    method: 'POST',
                });
                WorkspaceCore.showAlert(`Plan finalized as version ${result.version_number}.`, 'success');
                await renderPlanningStudio(context);
            } catch (error) {
                WorkspaceCore.showAlert(error.message, 'error');
            }
        });

        document.querySelectorAll('.planning-rule-create-form').forEach((form) => {
            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                const formData = new FormData(form);
                try {
                    await WorkspaceCore.apiJson(form.dataset.rulesEndpoint, {
                        method: 'POST',
                        body: {
                            rule_type: formData.get('rule_type'),
                            severity: formData.get('severity'),
                            title: formData.get('title'),
                            details: formData.get('details') || null,
                            is_active: formData.get('is_active') === 'on',
                        },
                    });
                    WorkspaceCore.showAlert('Rule added.', 'success');
                    await renderPlanningStudio(context);
                } catch (error) {
                    WorkspaceCore.showAlert(error.message, 'error');
                }
            });
        });

        document.querySelectorAll('.planning-rule-update-form').forEach((form) => {
            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                const ruleId = requirePlanningId(form.dataset.ruleId, 'Rule');
                if (!ruleId) return;
                const formData = new FormData(form);
                try {
                    await WorkspaceCore.apiJson(`/api/v2/planning/rules/${ruleId}`, {
                        method: 'PATCH',
                        body: {
                            rule_type: formData.get('rule_type'),
                            severity: formData.get('severity'),
                            title: formData.get('title'),
                            details: formData.get('details') || null,
                            is_active: formData.get('is_active') === 'on',
                        },
                    });
                    WorkspaceCore.showAlert('Rule updated.', 'success');
                    await renderPlanningStudio(context);
                } catch (error) {
                    WorkspaceCore.showAlert(error.message, 'error');
                }
            });
        });

        document.querySelectorAll('.planning-delete-rule').forEach((button) => {
            button.addEventListener('click', async () => {
                const ruleId = requirePlanningId(button.dataset.ruleId, 'Rule');
                if (!ruleId) return;
                try {
                    await WorkspaceCore.apiJson(`/api/v2/planning/rules/${ruleId}`, {
                        method: 'DELETE',
                    });
                    WorkspaceCore.showAlert('Rule deleted.', 'success');
                    await renderPlanningStudio(context);
                } catch (error) {
                    WorkspaceCore.showAlert(error.message, 'error');
                }
            });
        });

        document.querySelectorAll('.planning-target-create-form').forEach((form) => {
            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                const formData = new FormData(form);
                try {
                    await WorkspaceCore.apiJson(form.dataset.targetsEndpoint, {
                        method: 'POST',
                        body: {
                            nutrient_code: formData.get('nutrient_code'),
                            unit: formData.get('unit') || null,
                            min_value: numberOrNull(formData.get('min_value')),
                            target_value: numberOrNull(formData.get('target_value')),
                            max_value: numberOrNull(formData.get('max_value')),
                        },
                    });
                    WorkspaceCore.showAlert('Nutrient target added.', 'success');
                    await renderPlanningStudio(context);
                } catch (error) {
                    WorkspaceCore.showAlert(error.message, 'error');
                }
            });
        });

        document.querySelectorAll('.planning-target-update-form').forEach((form) => {
            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                const targetId = requirePlanningId(form.dataset.targetId, 'Target');
                if (!targetId) return;
                const formData = new FormData(form);
                try {
                    await WorkspaceCore.apiJson(`/api/v2/planning/targets/${targetId}`, {
                        method: 'PATCH',
                        body: {
                            nutrient_code: formData.get('nutrient_code'),
                            unit: formData.get('unit') || null,
                            min_value: numberOrNull(formData.get('min_value')),
                            target_value: numberOrNull(formData.get('target_value')),
                            max_value: numberOrNull(formData.get('max_value')),
                        },
                    });
                    WorkspaceCore.showAlert('Nutrient target updated.', 'success');
                    await renderPlanningStudio(context);
                } catch (error) {
                    WorkspaceCore.showAlert(error.message, 'error');
                }
            });
        });

        document.querySelectorAll('.planning-delete-target').forEach((button) => {
            button.addEventListener('click', async () => {
                const targetId = requirePlanningId(button.dataset.targetId, 'Target');
                if (!targetId) return;
                try {
                    await WorkspaceCore.apiJson(`/api/v2/planning/targets/${targetId}`, {
                        method: 'DELETE',
                    });
                    WorkspaceCore.showAlert('Nutrient target deleted.', 'success');
                    await renderPlanningStudio(context);
                } catch (error) {
                    WorkspaceCore.showAlert(error.message, 'error');
                }
            });
        });

        document.getElementById('planningDayForm')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const dayId = requirePlanningId(event.currentTarget.dataset.dayId, 'Day');
            if (!dayId) return;
            const formData = new FormData(event.currentTarget);
            try {
                await WorkspaceCore.apiJson(`/api/v2/planning/days/${dayId}`, {
                    method: 'PATCH',
                    body: {
                        day_name: formData.get('day_name'),
                        actual_date: formData.get('actual_date') || null,
                        template_group: formData.get('template_group') || null,
                        notes: formData.get('notes') || null,
                    },
                });
                WorkspaceCore.showAlert('Day updated.', 'success');
                await renderPlanningStudio(context);
            } catch (error) {
                WorkspaceCore.showAlert(error.message, 'error');
            }
        });

        document.getElementById('planningDuplicateDayBtn')?.addEventListener('click', async (event) => {
            const dayId = requirePlanningId(event.currentTarget.dataset.dayId, 'Day');
            if (!dayId) return;
            try {
                await WorkspaceCore.apiJson(`/api/v2/planning/days/${dayId}/duplicate`, {
                    method: 'POST',
                    body: {},
                });
                WorkspaceCore.showAlert('Day duplicated.', 'success');
                await renderPlanningStudio(context);
            } catch (error) {
                WorkspaceCore.showAlert(error.message, 'error');
            }
        });

        document.getElementById('planningDeleteDayBtn')?.addEventListener('click', async (event) => {
            if (!window.confirm('Delete this day and all of its meals?')) {
                return;
            }
            const dayId = requirePlanningId(event.currentTarget.dataset.dayId, 'Day');
            if (!dayId) return;
            try {
                await WorkspaceCore.apiJson(`/api/v2/planning/days/${dayId}`, {
                    method: 'DELETE',
                });
                WorkspaceCore.showAlert('Day deleted.', 'success');
                state.activeDayId = null;
                await renderPlanningStudio(context);
            } catch (error) {
                WorkspaceCore.showAlert(error.message, 'error');
            }
        });

        document.getElementById('planningAddMealForm')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const dayId = requirePlanningId(event.currentTarget.dataset.dayId, 'Day');
            if (!dayId) return;
            const formData = new FormData(event.currentTarget);
            try {
                await WorkspaceCore.apiJson(`/api/v2/planning/days/${dayId}/meals`, {
                    method: 'POST',
                    body: {
                        meal_name: formData.get('meal_name'),
                        meal_type: formData.get('meal_type') || null,
                        meal_time: formData.get('meal_time') || null,
                        instructions: formData.get('instructions') || null,
                        target_notes: formData.get('target_notes') || null,
                    },
                });
                WorkspaceCore.showAlert('Meal added.', 'success');
                await renderPlanningStudio(context);
            } catch (error) {
                WorkspaceCore.showAlert(error.message, 'error');
            }
        });

        document.querySelectorAll('.planning-meal-form').forEach((form) => {
            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                const mealId = requirePlanningId(form.dataset.mealId, 'Meal');
                if (!mealId) return;
                const formData = new FormData(form);
                try {
                    await WorkspaceCore.apiJson(`/api/v2/planning/meals/${mealId}`, {
                        method: 'PATCH',
                        body: {
                            meal_name: formData.get('meal_name'),
                            meal_type: formData.get('meal_type') || null,
                            meal_time: formData.get('meal_time') || null,
                            instructions: formData.get('instructions') || null,
                            target_notes: formData.get('target_notes') || null,
                        },
                    });
                    WorkspaceCore.showAlert('Meal updated.', 'success');
                    await renderPlanningStudio(context);
                } catch (error) {
                    WorkspaceCore.showAlert(error.message, 'error');
                }
            });
        });

        document.querySelectorAll('.planning-delete-meal').forEach((button) => {
            button.addEventListener('click', async () => {
                if (!window.confirm('Delete this meal and all of its foods?')) {
                    return;
                }
                const mealId = requirePlanningId(button.dataset.mealId, 'Meal');
                if (!mealId) return;
                try {
                    await WorkspaceCore.apiJson(`/api/v2/planning/meals/${mealId}`, {
                        method: 'DELETE',
                    });
                    WorkspaceCore.showAlert('Meal deleted.', 'success');
                    await renderPlanningStudio(context);
                } catch (error) {
                    WorkspaceCore.showAlert(error.message, 'error');
                }
            });
        });

        document.querySelectorAll('.planning-food-update-form').forEach((form) => {
            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                const mealFoodId = requirePlanningId(form.dataset.mealFoodId, 'Meal food');
                if (!mealFoodId) return;
                const formData = new FormData(form);
                try {
                    await WorkspaceCore.apiJson(`/api/v2/planning/meal-foods/${mealFoodId}`, {
                        method: 'PATCH',
                        body: {
                            portion_grams: Number(formData.get('portion_grams')),
                            portion_description: formData.get('portion_description') || null,
                            household_measure: formData.get('household_measure') || null,
                            unit_label: formData.get('unit_label') || null,
                            preparation_state: formData.get('preparation_state') || null,
                            notes: formData.get('notes') || null,
                        },
                    });
                    WorkspaceCore.showAlert('Food portion updated.', 'success');
                    await renderPlanningStudio(context);
                } catch (error) {
                    WorkspaceCore.showAlert(error.message, 'error');
                }
            });
        });

        document.querySelectorAll('.planning-delete-meal-food').forEach((button) => {
            button.addEventListener('click', async () => {
                const mealFoodId = requirePlanningId(button.dataset.mealFoodId, 'Meal food');
                if (!mealFoodId) return;
                try {
                    await WorkspaceCore.apiJson(`/api/v2/planning/meal-foods/${mealFoodId}`, {
                        method: 'DELETE',
                    });
                    WorkspaceCore.showAlert('Food removed from meal.', 'success');
                    await renderPlanningStudio(context);
                } catch (error) {
                    WorkspaceCore.showAlert(error.message, 'error');
                }
            });
        });

        document.querySelectorAll('.planning-fetch-suggestions').forEach((button) => {
            button.addEventListener('click', async () => {
                const mealFoodId = requirePlanningId(button.dataset.mealFoodId, 'Meal food');
                if (!mealFoodId) return;
                const slot = document.getElementById(`planningSuggestions-${mealFoodId}`);
                if (!slot) return;

                slot.innerHTML = '<div class="workspace-empty">Finding substitutions...</div>';

                try {
                    const result = await WorkspaceCore.apiJson(`/api/v2/planning/meal-foods/${mealFoodId}/suggestions`);
                    slot.innerHTML = renderSuggestionResults(result);

                    slot.querySelectorAll('.planning-apply-suggestion').forEach((replaceButton) => {
                        replaceButton.addEventListener('click', async () => {
                            const replacementFoodId = requirePlanningId(replaceButton.dataset.foodId, 'Replacement food');
                            if (!replacementFoodId) return;
                            try {
                                await WorkspaceCore.apiJson(`/api/v2/planning/meal-foods/${mealFoodId}/replace`, {
                                    method: 'POST',
                                    body: {
                                        food_id: replacementFoodId,
                                        replacement_reason: 'Applied smart substitution suggestion',
                                    },
                                });
                                WorkspaceCore.showAlert('Food replaced with suggested substitute.', 'success');
                                await renderPlanningStudio(context);
                            } catch (error) {
                                WorkspaceCore.showAlert(error.message, 'error');
                            }
                        });
                    });
                } catch (error) {
                    slot.innerHTML = '<div class="workspace-empty">Substitution suggestions could not be loaded.</div>';
                    WorkspaceCore.showAlert(error.message, 'error');
                }
            });
        });

        document.querySelectorAll('.planning-food-search-form').forEach((form) => {
            bindConditionBuilder(form);
            const mealIdForSearch = positiveInteger(form.dataset.mealId);
            const savedSearch = mealIdForSearch ? getMealSearchState(mealIdForSearch) : null;
            if (mealIdForSearch && savedSearch?.result) {
                renderFoodSearchResults(mealIdForSearch, savedSearch.result, context);
            }
            form.querySelector('.planning-finish-food-search')?.addEventListener('click', () => {
                const mealId = requirePlanningId(form.dataset.mealId, 'Meal');
                if (!mealId) return;
                collectMealSearchFormState(form, { result: null });
                clearMealSearchContainer(mealId);
                WorkspaceCore.showAlert('Food search list closed. Meal conditions are still saved for this meal.', 'success');
            });
            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                const mealId = requirePlanningId(form.dataset.mealId, 'Meal');
                if (!mealId) return;
                const formData = new FormData(form);
                const groupId = formData.get('food_group_id');
                const conditionMode = String(formData.get('condition_mode') || 'all').trim();
                const conditions = buildCombinedConditionString(form);
                const resultsContainer = document.getElementById(`planningSearchResults-${mealId}`);
                if (!resultsContainer) return;

                if (!conditions) {
                    resultsContainer.innerHTML = '<div class="workspace-empty">Add at least one nutrient condition before searching foods.</div>';
                    return;
                }

                resultsContainer.innerHTML = '<div class="workspace-empty">Searching foods...</div>';

                try {
                    const query = new URLSearchParams({ limit: '8', meal_id: String(mealId) });
                    if (conditions) {
                        query.set('conditions', conditions);
                        query.set('condition_mode', conditionMode);
                    }
                    if (groupId) {
                        query.set('food_group_id', String(groupId));
                    }
                    const result = await WorkspaceCore.apiJson(`/api/v2/planning/catalog/foods?${query.toString()}`);
                    collectMealSearchFormState(form, { result });
                    renderFoodSearchResults(mealId, result, context);
                } catch (error) {
                    const isUnknownNutrient = String(error.message || '').toLowerCase().includes('unknown nutrient');
                    if (isUnknownNutrient) {
                        resultsContainer.innerHTML = `
                            <div class="planning-search-warning">
                                <p><strong>Condition not recognized.</strong> ${escape(error.message)}</p>
                                <p>Open the nutrient reference to see accepted planner codes, names, units, and aliases from the live database.</p>
                                <div class="workspace-inline-actions">
                                    <a class="workspace-btn-secondary" href="${getNutrientReferenceHref()}">Open nutrient reference</a>
                                </div>
                            </div>
                        `;
                        WorkspaceCore.showAlert(
                            error.message,
                            'error',
                            {
                                actionLabel: 'Open nutrient reference',
                                actionHref: getNutrientReferenceHref(),
                            },
                        );
                        return;
                    }

                    resultsContainer.innerHTML = '<div class="workspace-empty">Search failed. Try again.</div>';
                    WorkspaceCore.showAlert(error.message, 'error');
                }
            });
        });

        document.querySelectorAll('.planning-custom-food-form').forEach((form) => {
            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                const mealId = requirePlanningId(form.dataset.mealId, 'Meal');
                if (!mealId) return;
                const formData = new FormData(form);
                try {
                    await WorkspaceCore.apiJson(`/api/v2/planning/meals/${mealId}/custom-foods`, {
                        method: 'POST',
                        body: {
                            food_name: formData.get('food_name'),
                            food_group_name: formData.get('food_group_name') || 'Custom recipe',
                            portion_grams: Number(formData.get('portion_grams') || 0),
                            portion_description: formData.get('portion_description') || null,
                            household_measure: formData.get('household_measure') || null,
                            unit_label: formData.get('unit_label') || null,
                            notes: formData.get('notes') || null,
                            nutrients_per_100g: parseCustomNutrientLines(formData.get('nutrients_per_100g')),
                        },
                    });
                    WorkspaceCore.showAlert('Custom recipe/composite item added.', 'success');
                    await renderPlanningStudio(context);
                } catch (error) {
                    WorkspaceCore.showAlert(error.message, 'error');
                }
            });
        });
    }

    return {
        renderPlanningStudio,
    };
})();
