document.addEventListener('DOMContentLoaded', () => {
    // --- 1. ELEMENT REFERENCES ---
    const tableBody = document.getElementById('slips-table-body');
    const searchInput = document.getElementById('search-input');
    const tabsContainer = document.querySelector('.tabs');
    const createButton = document.getElementById('create-new-slip-btn');
    const retryButton = document.getElementById('retry-fetch-btn');

    // Modal elements
    const quickViewModal = document.getElementById('quick-view-modal');
    const modalBody = document.getElementById('modal-body');
    const modalEditLink = document.getElementById('modal-edit-link');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    // State management elements
    const resultsContainer = document.getElementById('results-container');
    const skeletonLoader = document.getElementById('skeleton-loader');
    const emptyState = document.getElementById('empty-state');
    const errorState = document.getElementById('error-state');
    const tableContainer = document.querySelector('.table-container');

    // Stat card count elements
    const statTotal = document.getElementById('stat-total-count');
    const statNew = document.getElementById('stat-new-count');
    const statPending = document.getElementById('stat-pending-count');
    const statCompleted = document.getElementById('stat-completed-count');

    // --- 2. STATE MANAGEMENT ---
    let state = {
        allSlips: [],
        activeFilter: 'All',
        searchTerm: '',
        isLoading: true,
        error: null,
    };
    let searchTimeout;
    let lastFocusedElement; // For accessibility

    // --- 3. DATA FETCHING ---
    async function loadDutySlips() {
        state.isLoading = true;
        render(); // Show skeleton loader

        try {
            const response = await fetch('/api?action=getAllDutySlips');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            state.allSlips = data.slips ? data.slips.sort((a, b) => b.DS_No - a.DS_No) : [];
            state.error = null;
        } catch (error) {
            console.error("Failed to load duty slips:", error);
            state.error = error.message;
        } finally {
            state.isLoading = false;
            render(); // Render final state
        }
    }

    // --- 4. RENDERING LOGIC ---
    function render() {
        // Show/hide main state containers
        skeletonLoader.style.display = state.isLoading ? 'block' : 'none';
        errorState.style.display = state.error ? 'block' : 'none';
        resultsContainer.setAttribute('aria-busy', state.isLoading);

        // Don't proceed to render table if loading or error
        if (state.isLoading || state.error) {
            tableContainer.style.display = 'none';
            emptyState.style.display = 'none';
            return;
        }

        updateStatCards();
        const filteredSlips = getFilteredSlips();

        emptyState.style.display = filteredSlips.length === 0 ? 'block' : 'none';
        tableContainer.style.display = filteredSlips.length > 0 ? 'block' : 'none';

        if (filteredSlips.length > 0) {
            renderTable(filteredSlips);
        }
    }

    function getFilteredSlips() {
        const lowerCaseSearch = state.searchTerm.toLowerCase();
        return state.allSlips.filter(slip => {
            const status = slip.Status || 'New';
            let matchesFilter = state.activeFilter === 'All' ||
                (state.activeFilter === 'Needs Action' && ['New', 'Updated by Manager'].includes(status)) ||
                status === state.activeFilter;

            if (!matchesFilter) return false;

            return !lowerCaseSearch ||
                (slip.DS_No || '').toString().toLowerCase().includes(lowerCaseSearch) ||
                (slip.Guest_Name || '').toLowerCase().includes(lowerCaseSearch);
        });
    }

    function renderTable(slips) {
        const fragment = document.createDocumentFragment();

        slips.forEach((slip, index) => {
            const status = slip.Status || 'New';
            const statusClass = status.toLowerCase().replace(/ /g, '-');
            const row = document.createElement('tr');
            row.className = `status-${statusClass} is-entering`; // Add class for animation
            row.style.setProperty('--delay-index', index); // Set custom property for stagger

            row.innerHTML = `
                <td data-label="Status"><span class="status-badge status-${statusClass}">${status}</span></td>
                <td data-label="D.S. No"><div class="cell-primary">#${slip.DS_No}</div></td>
                <td data-label="Guest & Date"><div class="cell-primary">${slip.Guest_Name || 'N/A'}</div><div class="cell-secondary">${slip.Date || 'N/A'}</div></td>
                <td data-label="Driver & Vehicle"><div class="cell-primary">${slip.Driver_Name || 'N/A'}</div><div class="cell-secondary">${slip.Vehicle_No || 'N/A'}</div></td>
                <td class="actions-cell" data-label="Actions">
                    <button class="action-btn quick-view-btn" data-id="${slip.DS_No}" title="Quick View" aria-label="Quick View for slip #${slip.DS_No}"><i class="fas fa-eye"></i></button>
                    <div class="quick-actions-menu">
                        <button class="action-btn kebab-btn" title="More Actions" aria-label="More actions for slip #${slip.DS_No}"><i class="fas fa-ellipsis-v"></i></button>
                        <div class="dropdown-menu">
                            <a href="/edit-slip.html?id=${slip.DS_No}" class="dropdown-item"><i class="fas fa-edit"></i> Edit Full Slip</a>
                            <a href="/view.html?id=${slip.DS_No}" target="_blank" class="dropdown-item"><i class="fas fa-print"></i> View/Print</a>
                        </div>
                    </div>
                </td>`;
            fragment.appendChild(row);
        });
        
        tableBody.innerHTML = ''; // Clear previous results
        tableBody.appendChild(fragment);

        // Trigger the animation by removing the class after a short delay
        requestAnimationFrame(() => {
            tableBody.querySelectorAll('.is-entering').forEach(row => {
                row.classList.remove('is-entering');
            });
        });
    }
    
    function updateStatCards() {
        statTotal.textContent = state.allSlips.length;
        statNew.textContent = state.allSlips.filter(s => (s.Status || 'New') === 'New').length;
        statPending.textContent = state.allSlips.filter(s => s.Status === 'Closed by Driver').length;
        statCompleted.textContent = state.allSlips.filter(s => s.Status === 'Closed by Client').length;
    }

    // --- 5. EVENT HANDLERS & MODAL LOGIC ---
    function setupEventListeners() {
        createButton.addEventListener('click', () => { window.location.href = '/create-duty-slip.html'; });
        retryButton.addEventListener('click', loadDutySlips);

        tabsContainer.addEventListener('click', e => {
            if (e.target.matches('.tab-btn') && !e.target.classList.contains('active')) {
                document.querySelector('.tab-btn.active').classList.remove('active');
                e.target.classList.add('active');
                state.activeFilter = e.target.dataset.filter;
                render();
            }
        });
        
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                state.searchTerm = searchInput.value;
                render();
            }, 300); // Debounce
        });

        // Use event delegation for actions inside the table body
        tableBody.addEventListener('click', e => {
            const quickViewBtn = e.target.closest('.quick-view-btn');
            const kebabBtn = e.target.closest('.kebab-btn');

            if (quickViewBtn) {
                const slipId = quickViewBtn.dataset.id;
                const slip = state.allSlips.find(s => s.DS_No == slipId);
                openQuickViewModal(slip, quickViewBtn);
            }
            if (kebabBtn) {
                const menu = kebabBtn.closest('.quick-actions-menu');
                // Close other menus before opening a new one
                document.querySelectorAll('.quick-actions-menu.active').forEach(m => {
                    if (m !== menu) m.classList.remove('active');
                });
                menu.classList.toggle('active');
            }
        });

        // Global click to close dropdowns
        document.addEventListener('click', e => {
            if (!e.target.closest('.quick-actions-menu')) {
                document.querySelectorAll('.quick-actions-menu.active').forEach(menu => menu.classList.remove('active'));
            }
        });
        
        // Modal closing events
        quickViewModal.addEventListener('click', e => {
            if (e.target === quickViewModal || e.target.matches('.modal-overlay')) {
                closeQuickViewModal();
            }
        });
        modalCloseBtn.addEventListener('click', closeQuickViewModal);
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && quickViewModal.classList.contains('visible')) {
                closeQuickViewModal();
            }
        });
    }
        
    function openQuickViewModal(slip, triggerElement) {
        if (!slip) return;
        lastFocusedElement = triggerElement; // Store what to focus on close

        modalBody.innerHTML = `
            <h4>Guest: ${slip.Guest_Name || 'N/A'} (#${slip.DS_No})</h4>
            <p><strong>Driver:</strong> ${slip.Driver_Name || 'N/A'} | <strong>Vehicle:</strong> ${slip.Vehicle_No || 'N/A'}</p>
            <p><strong>Reporting:</strong> ${slip.Reporting_Time || 'N/A'} at ${slip.Reporting_Address || 'N/A'}</p>
            <hr>
            <p><strong>Shed Time:</strong> ${slip.Driver_Time_Out || 'N/A'} - ${slip.Driver_Time_In || 'N/A'}</p>
            <p><strong>Shed KMs:</strong> ${slip.Driver_Km_Out || 'N/A'} - ${slip.Driver_Km_In || 'N/A'}</p>
            <p><strong>Total Usage:</strong> ${slip.Driver_Total_Hrs || 'N/A'}, ${slip.Driver_Total_Kms || 'N/A'}</p>
        `;
        modalEditLink.href = `/edit-slip.html?id=${slip.DS_No}`;
        quickViewModal.classList.add('visible');
        modalEditLink.focus(); // Accessibility: Move focus into the modal
    }
    
    function closeQuickViewModal() {
        quickViewModal.classList.remove('visible');
        if (lastFocusedElement) {
            lastFocusedElement.focus(); // Accessibility: Return focus to the trigger
        }
    }

    // --- 6. INITIALIZE ---
    function init() {
        setupEventListeners();
        loadDutySlips();
    }
    
    init();
});