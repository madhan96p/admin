document.addEventListener('DOMContentLoaded', () => {
    // --- 1. ELEMENT REFERENCES ---
    const findBtn = document.getElementById('find-slip-btn');
    const resultsContainer = document.getElementById('results-container');
    const dsNoInput = document.getElementById('search-ds-no');
    const guestInput = document.getElementById('search-guest');
    const dateInput = document.getElementById('search-date');
    let allSlips = [];

    // --- 2. INITIAL DATA LOAD ---
    async function loadAllSlips() {
        try {
            const response = await fetch('/api?action=getAllDutySlips');
            const data = await response.json();
            if (data.slips) {
                allSlips = data.slips.reverse();
            }
        } catch (error) {
            console.error("Failed to pre-load slips:", error);
            resultsContainer.innerHTML = `<div class="no-results-card"><p>Error loading slip data. Please refresh the page.</p></div>`;
        }
    }

    // --- 3. EVENT LISTENERS ---
    findBtn.addEventListener('click', handleSearch);

    // Allow pressing Enter in search fields to trigger the search
    [dsNoInput, guestInput, dateInput].forEach(input => {
        input.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                findBtn.click();
            }
        });
    });

    // Event delegation for dynamically created action buttons
    resultsContainer.addEventListener('click', (e) => {
        const target = e.target.closest('.action-link');
        if (!target) return;

        const slipId = target.dataset.id;
        const slipData = allSlips.find(s => s.DS_No === slipId);
        if (!slipData) return alert('Could not find data for this slip.');

        // Handle specific button actions
        if (target.matches('[data-action="share-driver"]')) {
            shareWithDriver(slipData);
        } else if (target.matches('[data-action="ask-guest"]')) {
            askGuestToClose(slipData);
        }
        // NOTE: View/Edit are standard links and will work automatically.
    });


    // --- 4. CORE FUNCTIONS ---
    function handleSearch() {
        resultsContainer.innerHTML = `<div class="loader"></div>`; // Show loader immediately

        setTimeout(() => { // Use timeout to allow loader to render before filtering
            const dsNoQuery = dsNoInput.value.trim().toLowerCase();
            const guestQuery = guestInput.value.trim().toLowerCase();
            const dateQuery = dateInput.value;

            const results = allSlips.filter(slip => {
                const dsNoMatch = dsNoQuery ? (slip['DS_No'] || '').toLowerCase().includes(dsNoQuery) : true;
                const guestMatch = guestQuery ? (slip['Guest_Name'] || '').toLowerCase().includes(guestQuery) : true;
                const dateMatch = dateQuery ? (slip['Date'] === dateQuery) : true;
                return dsNoMatch && guestMatch && dateMatch;
            });

            displayResults(results);
        }, 100); // 100ms delay
    }

    function displayResults(slips) {
        resultsContainer.innerHTML = ''; // Clear loader/previous results

        if (!slips || slips.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results-card">
                    <i class="fas fa-search"></i>
                    <p>No duty slips found. Please try a different search.</p>
                </div>
            `;
            return;
        }

        slips.forEach(slip => {
            const statusClass = (slip.Status || 'New').toLowerCase().replace(/ /g, '-');
            const slipCardHTML = `
                <div class="slip-card">
                    <div class="slip-card-header">
                        <h3>Duty Slip #${slip.DS_No}</h3>
                        <span class="status-badge status-${statusClass}">${slip.Status || 'New'}</span>
                    </div>
                    <div class="slip-card-body">
                        <div class="info-item">
                            <i class="fas fa-user"></i>
                            <div class="info-item-content">
                                <p><strong>${slip.Guest_Name || 'N/A'}</strong>Guest</p>
                            </div>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-id-card"></i>
                            <div class="info-item-content">
                                <p><strong>${slip.Driver_Name || 'N/A'}</strong>Driver</p>
                            </div>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-calendar-alt"></i>
                            <div class="info-item-content">
                                <p><strong>${slip.Date || 'N/A'}</strong>Date</p>
                            </div>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-car"></i>
                            <div class="info-item-content">
                                <p><strong>${slip.Vehicle_No || 'N/A'}</strong>Vehicle</p>
                            </div>
                        </div>
                    </div>
                    <div class="slip-card-actions">
                        <a href="/view.html?id=${slip.DS_No}" target="_blank" class="action-link"><i class="fas fa-eye"></i> View/Print</a>
                        <a href="/edit-slip.html?id=${slip.DS_No}" class="action-link"><i class="fas fa-edit"></i> Edit Full Slip</a>
                        <button class="action-link" data-id="${slip.DS_No}" data-action="share-driver"><i class="fab fa-whatsapp"></i> Share to Driver</button>
                        <button class="action-link" data-id="${slip.DS_No}" data-action="ask-guest"><i class="fas fa-signature"></i> Ask Guest to Sign</button>
                    </div>
                </div>
            `;
            resultsContainer.innerHTML += slipCardHTML;
        });
    }

    // --- 5. WHATSAPP MESSAGE FUNCTIONS (Unchanged from your file) ---
    function shareWithDriver(slip) {
        const mobile = slip.Driver_Mobile?.replace(/\D/g, '');
        if (!mobile) return alert('Driver mobile not found.');
        const link = `${window.location.origin}/close-slip.html?id=${slip.DS_No}`;
        const message = `*Duty Slip: #${slip.DS_No}*\n\n👤 Guest: ${slip.Guest_Name}\n⏰ Time: ${slip.Reporting_Time}\n📍 Address: ${slip.Reporting_Address}\n\n🔗 *Close Link:* ${link}\n\n- Shrish Travels`;
        window.open(`https://wa.me/91${mobile}?text=${encodeURIComponent(message.trim())}`, '_blank');
    }

    function askGuestToClose(slip) {
        const mobile = slip.Guest_Mobile?.replace(/\D/g, '');
        if (!mobile) return alert('Guest mobile not found.');
        const link = `${window.location.origin}/client-close.html?id=${slip.DS_No}`;
        const message = `Dear ${slip.Guest_Name},\n\nThank you for travelling with us. Please confirm your trip details by signing via the secure link below.\n\n🔗 *Confirm Your Trip:* ${link}\n\n- Shrish Travels`;
        window.open(`https://wa.me/91${mobile}?text=${encodeURIComponent(message.trim())}`, '_blank');
    }

    // --- 6. INITIALIZE ---
    loadAllSlips();
});