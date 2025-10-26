document.addEventListener('DOMContentLoaded', () => {
    // --- 1. ELEMENT REFERENCES ---
    const tableBody = document.getElementById('slips-table-body');
    const searchInput = document.getElementById('search-input');
    const tabsContainer = document.querySelector('.tabs');
    const createButton = document.getElementById('create-new-slip-btn');
    const retryButton = document.getElementById('retry-fetch-btn');

    const logReviewBtn = document.getElementById('log-review-btn');
    const logReviewModal = document.getElementById('log-review-modal');
    const reviewModalCloseBtn = document.getElementById('review-modal-close-btn');
    const logReviewForm = document.getElementById('log-review-form');
    const reviewSubmitBtn = document.getElementById('review-submit-btn');
    const reviewDsNo = document.getElementById('review-ds-no');
    const reviewName = document.getElementById('review-name');
    const reviewRating = document.getElementById('review-rating');
    const reviewComment = document.getElementById('review-comment');
    const reviewGuestNameDisplay = document.getElementById('review-guest-name-display'); // <-- ADD THIS

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
            row.className = `status-${statusClass} is-entering`;
            row.style.setProperty('--delay-index', index);

            // --- ADD THESE TWO LINES ---
            row.setAttribute('data-ds-no', slip.DS_No);
            row.setAttribute('data-status', status);
            // -------------------------

            // **IMPORTANT**: Wrap the content of the actions cell in a div
            // for better flexbox control on mobile.
            // Replace the existing row.innerHTML with this:
            row.innerHTML = `
            <td data-label="Status"><span class="status-badge status-${statusClass}">${status}</span></td>
            <td data-label="D.S. No"><div class="cell-primary">#${slip.DS_No}</div></td>
            <td data-label="Guest & Date"><div class="cell-primary">${slip.Guest_Name || 'N/A'}</div><div class="cell-secondary">${slip.Date || 'N/A'}</div></td>
            <td data-label="Driver & Vehicle"><div class="cell-primary">${slip.Driver_Name || 'N/A'}</div><div class="cell-secondary">${slip.Vehicle_No || 'N/A'}</div></td>
            <td class="actions-cell" data-label="Actions">
                <div class="actions-cell-content">
                    <a href="/edit-slip.html?id=${slip.DS_No}" class="action-btn edit" title="Edit Full Slip" aria-label="Edit full slip for #${slip.DS_No}">
                        <i class="fas fa-pencil-alt"></i>
                    </a>
                    <a href="/view.html?id=${slip.DS_No}" target="_blank" class="action-btn print" title="View/Print" aria-label="View or Print slip #${slip.DS_No}">
                        <i class="fas fa-print"></i>
                    </a>
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
        logReviewBtn.addEventListener('click', openLogReviewModal);
        reviewModalCloseBtn.addEventListener('click', closeLogReviewModal);
        logReviewModal.addEventListener('click', e => {
            if (e.target === logReviewModal || e.target.matches('.modal-overlay')) {
                closeLogReviewModal();
            }
        });
        logReviewForm.addEventListener('submit', handleLogReviewSubmit);
        reviewDsNo.addEventListener('blur', fetchGuestNameForReview);
        tableBody.addEventListener('click', e => {
            const quickViewBtn = e.target.closest('.quick-view-btn');
            if (quickViewBtn) {
                const slipId = quickViewBtn.dataset.id;
                const slip = state.allSlips.find(s => s.DS_No == slipId);
                openQuickViewModal(slip, quickViewBtn);
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

    function openLogReviewModal() {
        logReviewForm.reset(); // Clear the form
        reviewGuestNameDisplay.innerHTML = ''; // <-- ADD THIS
        reviewGuestNameDisplay.className = 'guest-name-display'; // <-- ADD THIS
        logReviewModal.classList.add('visible');
        reviewDsNo.focus(); // Focus the first field
    }

    function closeLogReviewModal() {
        logReviewModal.classList.remove('visible');
    }

    async function handleLogReviewSubmit(event) {
        event.preventDefault();
        
        // Show spinner and disable button
        reviewSubmitBtn.disabled = true;
        reviewSubmitBtn.classList.add('is-loading');

        const formData = {
            ds_no: reviewDsNo.value.trim(),
            reviewer_name: reviewName.value.trim(),
            rating: reviewRating.value,
            comment: reviewComment.value.trim()
        };

        try {
            const response = await fetch('/api?action=logNewReview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();
            
            if (response.ok && result.success) {
                alert(result.message);
                closeLogReviewModal();
            } else {
                throw new Error(result.error || 'Failed to save review.');
            }

        } catch (error) {
            console.error('Failed to submit review:', error);
            alert(`Error: ${error.message}`);
        } finally {
            // Hide spinner and re-enable button
            reviewSubmitBtn.disabled = false;
            reviewSubmitBtn.classList.remove('is-loading');
        }
    }
    
    async function fetchGuestNameForReview() {
        const dsNo = reviewDsNo.value.trim();

        if (!dsNo) {
            reviewGuestNameDisplay.innerHTML = '';
            reviewGuestNameDisplay.className = 'guest-name-display';
            return;
        }

        reviewGuestNameDisplay.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Fetching guest name...';
        reviewGuestNameDisplay.className = 'guest-name-display is-loading';

        try {
            const response = await fetch(`/api?action=getDutySlipById&id=${dsNo}`);
            const result = await response.json();

            if (response.ok && result.slip) {
                reviewGuestNameDisplay.innerHTML = `✅ Guest: <strong>${result.slip.Guest_Name}</strong>`;
                reviewGuestNameDisplay.className = 'guest-name-display is-success';
            } else {
                throw new Error(result.error || 'Slip not found.');
            }
        } catch (error) {
            reviewGuestNameDisplay.innerHTML = `❌ ${error.message}`;
            reviewGuestNameDisplay.className = 'guest-name-display is-error';
        }
    }
    
    // --- 6. INITIALIZE ---
    function init() {
        setupEventListeners();
        loadDutySlips();
    }

    init();
});