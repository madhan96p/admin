document.addEventListener('DOMContentLoaded', () => {
    // --- 1. ELEMENT REFERENCES ---
    const tableBody = document.getElementById('slips-table-body');
    const searchInput = document.getElementById('search-input');
    const tabsContainer = document.querySelector('.tabs');
    const createButton = document.getElementById('create-new-slip-btn');
    
    // Modal elements
    const quickViewModal = document.getElementById('quick-view-modal');
    const modalBody = document.getElementById('modal-body');
    const modalEditLink = document.getElementById('modal-edit-link');

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
    const state = {
        allSlips: [],
        activeFilter: 'All',
        searchTerm: '',
        isLoading: true,
        error: null,
    };
    let searchTimeout;

    // --- 3. DATA FETCHING ---
    async function loadDutySlips() {
        try {
            state.isLoading = true;
            render(); // Show skeleton loader immediately
            
            const response = await fetch('/api?action=getAllDutySlips');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            
            if (data.error) throw new Error(data.error);

            state.allSlips = data.slips ? data.slips.sort((a, b) => b.DS_No - a.DS_No) : []; // Sort descending
            state.isLoading = false;
        } catch (error) {
            console.error("Failed to load duty slips:", error);
            state.error = error.message;
            state.isLoading = false;
        } finally {
            render(); // Render final state (table, empty, or error)
        }
    }

    // --- 4. RENDERING LOGIC ---
    function render() {
        updateStatCards();
        
        // Hide all state containers initially
        tableContainer.style.display = 'none';
        skeletonLoader.style.display = 'none';
        emptyState.style.display = 'none';
        errorState.style.display = 'none';

        if (state.isLoading) {
            skeletonLoader.style.display = 'block';
            return;
        }

        if (state.error) {
            errorState.style.display = 'block';
            return;
        }
        
        const filteredSlips = getFilteredSlips();

        if (filteredSlips.length === 0) {
            emptyState.style.display = 'block';
        } else {
            tableContainer.style.display = 'block';
            renderTable(filteredSlips);
        }
    }

    function getFilteredSlips() {
        const lowerCaseSearch = state.searchTerm.toLowerCase();
        
        return state.allSlips.filter(slip => {
            // Filter by active tab
            const status = slip.Status || 'New';
            let matchesFilter = false;
            if (state.activeFilter === 'All') {
                matchesFilter = true;
            } else if (state.activeFilter === 'Needs Action') {
                matchesFilter = ['New', 'Updated by Manager'].includes(status);
            } else {
                matchesFilter = status === state.activeFilter;
            }

            if (!matchesFilter) return false;

            // Filter by search term
            if (lowerCaseSearch) {
                const matchesSearch = (slip.DS_No || '').toLowerCase().includes(lowerCaseSearch) ||
                                      (slip.Guest_Name || '').toLowerCase().includes(lowerCaseSearch);
                return matchesSearch;
            }
            
            return true;
        });
    }
    
    function renderTable(slips) {
        tableBody.innerHTML = ''; // Clear previous results
        const fragment = document.createDocumentFragment(); // Use a fragment for performance

        slips.forEach(slip => {
            const status = slip.Status || 'New';
            const statusClass = status.toLowerCase().replace(/ /g, '-');
            const row = document.createElement('tr');
            row.className = `status-${statusClass}`; 
            
            row.innerHTML = `
                <td data-label="Status"><span class="status-badge status-${statusClass}">${status}</span></td>
                <td data-label="D.S. No"><div class="cell-primary">#${slip.DS_No}</div></td>
                <td data-label="Guest & Date"><div class="cell-primary">${slip.Guest_Name || 'N/A'}</div><div class="cell-secondary">${slip.Date || 'N/A'}</div></td>
                <td data-label="Driver & Vehicle"><div class="cell-primary">${slip.Driver_Name || 'N/A'}</div><div class="cell-secondary">${slip.Vehicle_No || 'N/A'}</div></td>
                <td class="actions-cell" data-label="Actions">
                    <div class="signature-thumbnail" data-id="${slip.DS_No}" </div>
                    <button class="action-btn quick-view-btn" data-id="${slip.DS_No}" title="Quick View" aria-label="Quick View"><i class="fas fa-eye"></i></button>
                    <div class="quick-actions-menu">
                        <button class="action-btn kebab-btn" title="More Actions" aria-label="More Actions"><i class="fas fa-ellipsis-v"></i></button>
                        <div class="dropdown-menu">
                            <a href="/edit-slip.html?id=${slip.DS_No}" class="dropdown-item"><i class="fas fa-edit"></i> Edit Full Slip</a>
                            <a href="/view.html?id=${slip.DS_No}" target="_blank" class="dropdown-item"><i class="fas fa-print"></i> View/Print</a>
                        </div>
                </td>`;
            fragment.appendChild(row);
        });
        tableBody.appendChild(fragment);
    }
    
    function updateStatCards() {
        const total = state.allSlips.length;
        const newSlips = state.allSlips.filter(s => (s.Status || 'New') === 'New').length;
        const pending = state.allSlips.filter(s => s.Status === 'Closed by Driver').length;
        const completed = state.allSlips.filter(s => s.Status === 'Closed by Client').length;

        statTotal.textContent = total;
        statNew.textContent = newSlips;
        statPending.textContent = pending;
        statCompleted.textContent = completed;
    }

    // --- 5. EVENT HANDLERS & MODAL LOGIC ---
    function setupEventListeners() {
        createButton.addEventListener('click', () => { window.location.href = '/create-duty-slip.html'; });

        tabsContainer.addEventListener('click', e => {
            if (e.target.matches('.tab-btn')) {
                state.activeFilter = e.target.dataset.filter;
                document.querySelector('.tab-btn.active').classList.remove('active');
                e.target.classList.add('active');
                render();
            }
        });
        
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                state.searchTerm = searchInput.value;
                render();
            }, 300); // Debounce input
        });

        document.body.addEventListener('click', e => {
            if (!e.target.closest('.quick-actions-menu')) {
                document.querySelectorAll('.quick-actions-menu.active').forEach(menu => menu.classList.remove('active'));
            }
        }, true);
        
        quickViewModal.addEventListener('click', e => {
            if (e.target.matches('.modal-overlay, .modal-close-btn, .modal-close-btn *')) {
                closeQuickViewModal();
            }
        });
    }
    
        
    function openQuickViewModal(slip) {
        if (!slip) return;
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
    }
    
    function closeQuickViewModal() {
        quickViewModal.classList.remove('visible');
    }

    // --- 6. INITIALIZE ---
    function init() {
        setupEventListeners();
        loadDutySlips();
    }
    
    init();
});