/**
 * Main Application Logic for Nutrition Analytics
 */

class NutritionApp {
    constructor() {
        this.foodGroups = [];
        this.nutrientTypes = [];
        this.currentResults = [];
        this.currentPage = 0;
        this.pageSize = 10;
        this.totalResults = 0;
        
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            // Check API health
            await NutritionAPI.healthCheck();
            console.log('✓ API is healthy');
            
            // Load initial data
            await this.loadFoodGroups();
            await this.loadNutrientTypes();
            
            // Setup event listeners
            this.setupEventListeners();
            
            console.log('✓ Application initialized');
        } catch (error) {
            console.error('Initialization error:', error);
            this.showAlert('error', 'Failed to initialize application. Please check if the API server is running.');
        }
    }

    /**
     * Load food groups and populate dropdown
     */
    async loadFoodGroups() {
        try {
            this.foodGroups = await NutritionAPI.getFoodGroups();
            const select = document.getElementById('foodGroupSelect');
            
            this.foodGroups.forEach(group => {
                const option = document.createElement('option');
                option.value = group.id;
                option.textContent = group.name;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading food groups:', error);
        }
    }

    /**
     * Load nutrient types
     */
    async loadNutrientTypes() {
        try {
            this.nutrientTypes = await NutritionAPI.getNutrientTypes();
            this.updateNutrientSelects();
        } catch (error) {
            console.error('Error loading nutrient types:', error);
        }
    }

    /**
     * Update nutrient select dropdowns
     */
    updateNutrientSelects() {
        const sortSelect = document.getElementById('sortByNutrient');
        sortSelect.innerHTML = '<option value="">-- No Sorting --</option>';
        
        this.nutrientTypes.forEach(type => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = type.name;
            
            type.nutrients.forEach(nutrient => {
                const option = document.createElement('option');
                option.value = nutrient.id;
                option.textContent = `${nutrient.name} (${nutrient.unit || 'N/A'})`;
                optgroup.appendChild(option);
            });
            
            sortSelect.appendChild(optgroup);
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Page navigation
        document.querySelectorAll('[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                this.switchPage(page);
            });
        });

        // Diet planner buttons
        document.getElementById('searchBtn').addEventListener('click', () => this.searchFoods());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetFilters());
        document.getElementById('addConditionBtn').addEventListener('click', () => this.addNutrientCondition());

        // Auto-search on input
        document.getElementById('foodSearch').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                this.searchFoods();
            }
        });

        // Pagination
        document.getElementById('prevPageBtn').addEventListener('click', (e) => {
            e.preventDefault();
            if (this.currentPage > 0) {
                this.currentPage--;
                this.displayResults();
            }
        });

        document.getElementById('nextPageBtn').addEventListener('click', (e) => {
            e.preventDefault();
            if ((this.currentPage + 1) * this.pageSize < this.totalResults) {
                this.currentPage++;
                this.displayResults();
            }
        });
    }

    /**
     * Switch between pages
     */
    switchPage(pageName) {
        // Hide all pages
        document.querySelectorAll('.page-content').forEach(page => {
            page.style.display = 'none';
        });
        
        // Show selected page
        const selectedPage = document.getElementById(pageName);
        if (selectedPage) {
            selectedPage.style.display = 'block';
            
            // Load content for specific pages
            if (pageName === 'food-database') {
                this.loadFoodDatabase();
            }
        }
    }

    /**
     * Add a nutrient condition row
     */
    addNutrientCondition() {
        const container = document.getElementById('nutrientConditions');
        const index = container.children.length;
        
        const conditionHTML = `
            <div class="card mb-3 nutrient-condition-card" data-condition-id="${index}">
                <div class="card-body">
                    <div class="row align-items-end">
                        <div class="col-md-4">
                            <label class="form-label form-label-sm">Nutrient</label>
                            <select class="form-select form-select-sm nutrient-select" data-condition-id="${index}">
                                <option value="">-- Select Nutrient --</option>
                            </select>
                        </div>
                        <div class="col-md-2">
                            <label class="form-label form-label-sm">Operator</label>
                            <select class="form-select form-select-sm operator-select" data-condition-id="${index}">
                                <option value="range">Range</option>
                                <option value="min">Min (≥)</option>
                                <option value="max">Max (≤)</option>
                                <option value="equals">Equals (=)</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label form-label-sm">Value(s)</label>
                            <div class="input-group input-group-sm">
                                <input type="number" class="form-control min-value" placeholder="Min" step="0.1">
                                <span class="input-group-text separator-dash" style="display: none;">-</span>
                                <input type="number" class="form-control max-value" placeholder="Max" step="0.1" style="display: none;">
                            </div>
                        </div>
                        <div class="col-md-2">
                            <button class="btn btn-sm btn-danger remove-condition" data-condition-id="${index}">
                                <i class="bi bi-trash"></i> Remove
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = conditionHTML;
        const conditionElement = tempDiv.querySelector('.nutrient-condition-card');
        container.appendChild(conditionElement);
        
        // Populate nutrient select
        const nutrientSelect = conditionElement.querySelector('.nutrient-select');
        this.nutrientTypes.forEach(type => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = type.name;
            
            type.nutrients.forEach(nutrient => {
                const option = document.createElement('option');
                option.value = nutrient.id;
                option.textContent = `${nutrient.name} (${nutrient.unit || 'N/A'})`;
                optgroup.appendChild(option);
            });
            
            nutrientSelect.appendChild(optgroup);
        });
        
        // Setup operator change event
        conditionElement.querySelector('.operator-select').addEventListener('change', (e) => {
            const minInput = conditionElement.querySelector('.min-value');
            const maxInput = conditionElement.querySelector('.max-value');
            const separator = conditionElement.querySelector('.separator-dash');
            
            if (e.target.value === 'range') {
                minInput.placeholder = 'Min';
                maxInput.style.display = 'block';
                separator.style.display = 'block';
            } else {
                minInput.placeholder = 'Value';
                maxInput.style.display = 'none';
                separator.style.display = 'none';
            }
        });
        
        // Setup remove button
        conditionElement.querySelector('.remove-condition').addEventListener('click', (e) => {
            e.preventDefault();
            conditionElement.remove();
        });
    }

    /**
     * Get nutrient conditions from form
     */
    getNutrientConditions() {
        const conditions = [];
        document.querySelectorAll('.nutrient-condition-card').forEach(card => {
            const nutrientId = parseInt(card.querySelector('.nutrient-select').value);
            const operator = card.querySelector('.operator-select').value;
            const minValue = parseFloat(card.querySelector('.min-value').value);
            const maxValue = parseFloat(card.querySelector('.max-value').value);
            
            if (nutrientId) {
                const condition = {
                    nutrient_id: nutrientId,
                    operator: operator,
                };
                
                if (operator === 'range') {
                    if (!isNaN(minValue)) condition.min_value = minValue;
                    if (!isNaN(maxValue)) condition.max_value = maxValue;
                } else if (operator === 'min') {
                    if (!isNaN(minValue)) condition.min_value = minValue;
                } else if (operator === 'max') {
                    if (!isNaN(minValue)) condition.max_value = minValue;
                } else if (operator === 'equals') {
                    if (!isNaN(minValue)) condition.min_value = minValue;
                }
                
                conditions.push(condition);
            }
        });
        
        return conditions;
    }

    /**
     * Search foods
     */
    async searchFoods() {
        try {
            const loadingSpinner = document.getElementById('loadingSpinner');
            loadingSpinner.style.display = 'block';
            
            const foodGroupId = document.getElementById('foodGroupSelect').value;
            const searchText = document.getElementById('foodSearch').value;
            const sortByNutrientId = document.getElementById('sortByNutrient').value;
            const nutrientConditions = this.getNutrientConditions();
            
            const searchRequest = {
                food_group_id: foodGroupId ? parseInt(foodGroupId) : null,
                search_name: searchText || null,
                nutrient_conditions: nutrientConditions.length > 0 ? nutrientConditions : null,
                sort_by_nutrient_id: sortByNutrientId ? parseInt(sortByNutrientId) : null,
                sort_order: "desc",
                limit: 1000,  // Get all results for pagination in frontend
                offset: 0,
            };
            
            const response = await NutritionAPI.searchFoods(searchRequest);
            this.currentResults = response.foods;
            this.totalResults = response.total_count;
            this.currentPage = 0;
            
            document.getElementById('resultsSection').style.display = 'block';
            document.getElementById('resultCount').textContent = this.totalResults;
            
            loadingSpinner.style.display = 'none';
            this.displayResults();
            
        } catch (error) {
            console.error('Search error:', error);
            this.showAlert('error', 'Error searching foods. Please try again.');
        }
    }

    /**
     * Display results with pagination
     */
    displayResults() {
        const start = this.currentPage * this.pageSize;
        const end = start + this.pageSize;
        const pageResults = this.currentResults.slice(start, end);
        
        const resultsContainer = document.getElementById('resultsContainer');
        resultsContainer.innerHTML = '';
        
        if (pageResults.length === 0) {
            resultsContainer.innerHTML = '<div class="alert alert-info">No foods found matching your criteria.</div>';
            document.getElementById('paginationNav').style.display = 'none';
            return;
        }
        
        pageResults.forEach(food => {
            const foodCard = this.createFoodCard(food);
            resultsContainer.appendChild(foodCard);
        });
        
        // Update pagination
        this.updatePagination();
        document.getElementById('paginationNav').style.display = 'flex';
    }

    /**
     * Create food card
     */
    createFoodCard(food) {
        const card = document.createElement('div');
        card.className = 'card mb-3 food-card';
        
        let nutrientHTML = '';
        food.nutrient_groups.forEach(group => {
            nutrientHTML += `
                <div class="mb-2">
                    <strong>${group.nutrient_type_name}:</strong>
                    <div class="small">
                        ${group.nutrients.map(n => 
                            `<span class="badge bg-info">${n.nutrient_name}: ${n.value} ${n.nutrient_unit || ''}</span>`
                        ).join(' ')}
                    </div>
                </div>
            `;
        });
        
        card.innerHTML = `
            <div class="card-body">
                <div class="row">
                    <div class="col-md-8">
                        <h5 class="card-title">${food.name}</h5>
                        <p class="card-text text-muted">
                            <small><strong>Group:</strong> ${food.food_group_name}</small>
                        </p>
                        ${nutrientHTML}
                    </div>
                    <div class="col-md-4 text-end d-flex flex-column justify-content-center">
                        <button class="btn btn-sm btn-primary view-details-btn" data-food-id="${food.id}">
                            <i class="bi bi-eye"></i> View Details
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Add event listener
        card.querySelector('.view-details-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.showFoodDetail(food.id);
        });
        
        return card;
    }

    /**
     * Show food detail modal
     */
    async showFoodDetail(foodId) {
        try {
            const food = await NutritionAPI.getFoodDetails(foodId);
            
            document.getElementById('foodDetailTitle').textContent = food.name;
            
            let detailHTML = `
                <p><strong>Food Group:</strong> ${food.food_group_name}</p>
                <hr>
            `;
            
            food.nutrient_groups.forEach(group => {
                detailHTML += `
                    <div class="mb-4">
                        <h6>${group.nutrient_type_name}</h6>
                        <table class="table table-sm table-striped">
                            <thead>
                                <tr>
                                    <th>Nutrient</th>
                                    <th>Value</th>
                                    <th>Unit</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${group.nutrients.map(n => `
                                    <tr>
                                        <td>${n.nutrient_name}</td>
                                        <td>${n.value !== null ? n.value.toFixed(2) : 'N/A'}</td>
                                        <td>${n.nutrient_unit || 'N/A'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            });
            
            document.getElementById('foodDetailContent').innerHTML = detailHTML;
            
            const modal = new bootstrap.Modal(document.getElementById('foodDetailModal'));
            modal.show();
            
        } catch (error) {
            console.error('Error loading food details:', error);
            this.showAlert('error', 'Error loading food details.');
        }
    }

    /**
     * Update pagination display
     */
    updatePagination() {
        const totalPages = Math.ceil(this.totalResults / this.pageSize);
        const currentPageDisplay = document.getElementById('currentPageDisplay');
        currentPageDisplay.innerHTML = `<span class="page-link">Page ${this.currentPage + 1} of ${totalPages}</span>`;
        
        // Update prev/next buttons
        document.getElementById('prevPageBtn').classList.toggle('disabled', this.currentPage === 0);
        document.getElementById('nextPageBtn').classList.toggle('disabled', (this.currentPage + 1) >= totalPages);
    }

    /**
     * Reset all filters
     */
    resetFilters() {
        document.getElementById('foodGroupSelect').value = '';
        document.getElementById('foodSearch').value = '';
        document.getElementById('sortByNutrient').value = '';
        document.getElementById('nutrientConditions').innerHTML = '';
        document.getElementById('resultsSection').style.display = 'none';
        this.currentResults = [];
        this.currentPage = 0;
    }

    /**
     * Load food database page
     */
    async loadFoodDatabase() {
        try {
            const content = document.getElementById('foodDatabaseContent');
            content.innerHTML = '<div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div>';
            
            const response = await NutritionAPI.listFoods(null, null, 100, 0);
            
            let html = `
                <div class="row mb-3">
                    <div class="col-md-12">
                        <p class="text-muted">Total foods in database: <strong>${response.total_count}</strong></p>
                    </div>
                </div>
            `;
            
            this.foodGroups.forEach(group => {
                const groupFoods = response.foods.filter(f => f.food_group_id === group.id);
                if (groupFoods.length > 0) {
                    html += `
                        <div class="card mb-4">
                            <div class="card-header bg-secondary text-white">
                                <h5 class="mb-0">${group.name} (${groupFoods.length} foods)</h5>
                            </div>
                            <div class="card-body">
                                <ul class="list-group">
                                    ${groupFoods.map(f => `
                                        <li class="list-group-item">
                                            <span>${f.name}</span>
                                            ${f.code ? `<span class="badge bg-secondary">${f.code}</span>` : ''}
                                        </li>
                                    `).join('')}
                                </ul>
                            </div>
                        </div>
                    `;
                }
            });
            
            content.innerHTML = html;
            
        } catch (error) {
            console.error('Error loading food database:', error);
            document.getElementById('foodDatabaseContent').innerHTML = '<div class="alert alert-danger">Error loading food database.</div>';
        }
    }

    /**
     * Show alert message
     */
    showAlert(type, message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type === 'error' ? 'danger' : 'info'} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.querySelector('main').insertBefore(alertDiv, document.querySelector('main').firstChild);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new NutritionApp();
});
