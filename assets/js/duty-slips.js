document.addEventListener('DOMContentLoaded', () => {
    // --- 1. ELEMENT REFERENCES ---
    const resultsContainer = document.getElementById('slips-table-body');
    const searchInput = document.getElementById('search-input');
    const loadingIndicator = document.getElementById('loading-indicator');
    const statCardsContainer = document.querySelector('.stat-cards-container');
    const tabsContainer = document.querySelector('.tabs');
    const createButton = document.getElementById('create-new-slip-btn');

    // Modal elements
    const quickViewModal = document.getElementById('quick-view-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalOverlay = quickViewModal.querySelector('.modal-overlay');
    const modalBody = document.getElementById('modal-body');
    const modalEditLink = document.getElementById('modal-edit-link');

    // --- 2. STATE MANAGEMENT ---
    let state = {
        allSlips: [],
        activeFilter: 'All',
        searchTerm: '',
    };
    let searchTimeout;

    // --- 3. INITIALIZATION ---
    async function init() {
        setupEventListeners();
        await loadDutySlips();
    }

    // --- 4. DATA FETCHING ---
    async function loadDutySlips() {
        try {
            loadingIndicator.style.display = 'block';
            const response = await fetch('/api?action=getAllDutySlips');
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            state.allSlips = data.slips ? data.slips.reverse() : [];
            render();
        } catch (error) {
            console.error("Failed to load duty slips:", error);
            loadingIndicator.innerHTML = '<p style="color: red;">Error loading data.</p>';
        }
    }

    // --- 5. RENDERING LOGIC ---
    function render() {
        loadingIndicator.style.display = 'none';
        
        // A. Update Stat Cards
        updateStatCards();

        // B. Filter the data based on current state
        let filteredSlips = state.allSlips;
        const lowerCaseSearch = state.searchTerm.toLowerCase();

        // Filter by active tab/stat card
        if (state.activeFilter !== 'All') {
            filteredSlips = filteredSlips.filter(slip => {
                const status = slip.Status || 'New';
                if (state.activeFilter === 'Needs Action') return ['New', 'Updated by Manager'].includes(status);
                if (state.activeFilter === 'Pending') return status === 'Closed by Driver';
                if (state.activeFilter === 'Completed') return status === 'Closed by Client';
                return status === state.activeFilter; // For individual stat card clicks like "New"
            });
        }

        // Filter by search term
        if (lowerCaseSearch) {
            filteredSlips = filteredSlips.filter(slip =>
                (slip['DS_No'] || '').toLowerCase().includes(lowerCaseSearch) ||
                (slip['Guest_Name'] || '').toLowerCase().includes(lowerCaseSearch)
            );
        }

        // C. Render the table rows with animation
        resultsContainer.classList.add('fading-out');
        setTimeout(() => {
            resultsContainer.innerHTML = '';
            resultsContainer.classList.remove('fading-out');

            if (filteredSlips.length === 0) {
                resultsContainer.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem;">No slips match your current filters.</td></tr>`;
                return;
            }

            filteredSlips.forEach((slip, index) => {
                const status = slip.Status || 'New';
                const statusClass = status.toLowerCase().replace(/ /g, '-');
                const signatureIcon = slip.Guest_Signature_Link ? `<img src="${slip.Guest_Signature_Link}" alt="Sig">` : `<i class="fas fa-signature"></i>`;

                const row = document.createElement('tr');
                row.className = 'is-loading';
                row.style.setProperty('--delay-index', index);
                
                row.innerHTML = `
                    <td data-label="Status"><span class="status-badge status-${statusClass}">${status}</span></td>
                    <td data-label="D.S. No">#${slip.DS_No}</td>
                    <td data-label="Guest & Date">
                        <div class="cell-primary">${slip.Guest_Name || 'N/A'}</div>
                        <div class="cell-secondary">${slip.Date || 'N/A'}</div>
                    </td>
                    <td data-label="Driver & Vehicle">
                        <div class="cell-primary">${slip.Driver_Name || 'N/A'}</div>
                        <div class="cell-secondary">${slip.Vehicle_No || 'N/A'}</div>
                    </td>
                    <td class="actions-cell">
                        <div class="signature-thumbnail" data-id="${slip.DS_No}" title="View Guest Signature">${signatureIcon}</div>
                        <button class="action-btn quick-view-btn" data-id="${slip.DS_No}" title="Quick View"><i class="fas fa-eye"></i></button>
                        <div class="quick-actions-menu">
                            <button class="action-btn kebab-btn" title="More Actions"><i class="fas fa-ellipsis-v"></i></button>
                            <div class="dropdown-menu">
                                <a href="/edit-slip.html?id=${slip.DS_No}" class="dropdown-item"><i class="fas fa-edit"></i> Edit Full Slip</a>
                                <a href="/view.html?id=${slip.DS_No}" target="_blank" class="dropdown-item"><i class="fas fa-print"></i> View/Print</a>
                                <div class="dropdown-divider"></div>
                                <button class="dropdown-item" data-action="share-driver" data-id="${slip.DS_No}"><i class="fab fa-whatsapp"></i> Share to Driver</button>
                                <button class="dropdown-item" data-action="ask-guest" data-id="${slip.DS_No}"><i class="fas fa-signature"></i> Ask Guest to Sign</button>
                                <button class="dropdown-item" data-action="copy-link" data-id="${slip.DS_No}"><i class="fas fa-copy"></i> Copy Link</button>
                            </div>
                        </div>
                    </td>
                `;
                resultsContainer.appendChild(row);
                setTimeout(() => row.classList.remove('is-loading'), 50);
            });
        }, 300);
    }
    
    function updateStatCards() {
        document.getElementById('stat-total-count').textContent = state.allSlips.length;
        document.getElementById('stat-new-count').textContent = state.allSlips.filter(s => (s.Status || 'New') === 'New').length;
        document.getElementById('stat-pending-count').textContent = state.allSlips.filter(s => s.Status === 'Closed by Driver').length;
        document.getElementById('stat-completed-count').textContent = state.allSlips.filter(s => s.Status === 'Closed by Client').length;
    }

    // --- 6. EVENT HANDLERS ---
    function setupEventListeners() {
        createButton.addEventListener('click', () => { window.location.href = '/create-duty-slip.html'; });

        // Filters (Tabs, Stat Cards, Search)
        const handleFilterClick = (filter) => {
            state.activeFilter = filter;
            document.querySelectorAll('.stat-card, .tab-btn').forEach(el => el.classList.remove('active'));
            document.querySelectorAll(`[data-filter="${filter}"]`).forEach(el => el.classList.add('active'));
            render();
        };

        tabsContainer.addEventListener('click', e => {
            if (e.target.matches('.tab-btn')) handleFilterClick(e.target.dataset.filter);
        });
        statCardsContainer.addEventListener('click', e => {
            const card = e.target.closest('.stat-card');
            if (card) handleFilterClick(card.dataset.filter);
        });

        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                state.searchTerm = searchInput.value;
                render();
            }, 300);
        });

        // Event Delegation for dynamic row actions
        resultsContainer.addEventListener('click', e => {
            const target = e.target;
            const slipId = target.closest('tr')?.querySelector('[data-id]')?.dataset.id;
            const slipData = state.allSlips.find(s => s.DS_No === slipId);

            // Kebab menu toggle
            if (target.closest('.kebab-btn')) {
                target.closest('.quick-actions-menu').classList.toggle('active');
            }
            // Quick View Button
            else if (target.closest('.quick-view-btn')) {
                openQuickViewModal(slipData);
            }
            // Signature Thumbnail
            else if (target.closest('.signature-thumbnail')) {
                openImageModal(slipData?.Guest_Signature_Link); // Assuming openImageModal is in common.js
            }
            // Dropdown menu actions
            else if (target.matches('.dropdown-item')) {
                handleQuickAction(target.dataset.action, slipData);
            }
        });

        // Close dropdown when clicking elsewhere
        document.body.addEventListener('click', e => {
            if (!e.target.closest('.quick-actions-menu')) {
                document.querySelectorAll('.quick-actions-menu.active').forEach(menu => menu.classList.remove('active'));
            }
        }, true);
        
        // Modal events
        modalCloseBtn.addEventListener('click', closeQuickViewModal);
        modalOverlay.addEventListener('click', closeQuickViewModal);
    }
    
    function handleQuickAction(action, slip) {
        if (!slip) return;
        switch (action) {
            case 'share-driver': shareWithDriver(slip); break;
            case 'ask-guest': askGuestToClose(slip); break;
            case 'copy-link': 
                navigator.clipboard.writeText(`${window.location.origin}/view.html?id=${slip.DS_No}`)
                    .then(() => alert('View link copied!'));
                break;
        }
    }

    // --- 7. MODAL LOGIC ---
    function openQuickViewModal(slip) {
        if (!slip) return;
        modalBody.innerHTML = `
            <h4>Guest: ${slip.Guest_Name} (#${slip.DS_No})</h4>
            <p><strong>Driver:</strong> ${slip.Driver_Name} | <strong>Vehicle:</strong> ${slip.Vehicle_No}</p>
            <p><strong>Reporting:</strong> ${slip.Reporting_Time} at ${slip.Reporting_Address}</p>
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

    // --- 8. WHATSAPP/HELPER FUNCTIONS (assumed to be in common.js or here) ---
    // Make sure these functions exist and are accessible
    const shareWithDriver = (slip) => { console.log('Sharing with driver...', slip); /* Add your logic */ };
    const askGuestToClose = (slip) => { console.log('Asking guest to close...', slip); /* Add your logic */ };
    const openImageModal = (url) => { alert(`Opening image modal for: ${url}`); /* This should be in common.js */ };


    // --- 9. INITIALIZE THE PAGE ---
    init();
});