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
            if (data.slips) { allSlips = data.slips.reverse(); }
        } catch (error) { console.error("Failed to pre-load slips:", error); }
    }

    // --- 3. EVENT LISTENERS ---
    findBtn.addEventListener('click', handleSearch);

    // Event delegation for all dynamically created buttons
    resultsContainer.addEventListener('click', (e) => {
        const target = e.target.closest('.action-link');
        if (!target) return;

        // This prevents the card's main click event from firing
        e.preventDefault();
        e.stopPropagation();

        const slipId = target.dataset.id;
        const slipData = allSlips.find(s => s.DS_No === slipId);

        if (target.classList.contains('copy-btn')) {
            navigator.clipboard.writeText(window.location.origin + target.dataset.link)
                .then(() => alert('Link copied!'));
        }
        else if (target.classList.contains('whatsapp-btn')) {
            if (!slipData) return alert('Slip data not found.');
            const shareType = target.dataset.type;

            // Call the specific share function based on the button's data-type
            switch (shareType) {
                case 'driver': shareWithDriver(slipData); break;
                case 'guest-info': shareInfoWithGuest(slipData); break;
                case 'guest-close': askGuestToClose(slipData); break;
                case 'thank-you': sendThankYouToGuest(slipData); break;
            }
        }
        else if (target.hasAttribute('href')) {
            // For View and Edit buttons, which are regular links
            window.open(target.href, '_blank');
        }
    });

    // --- 4. CORE FUNCTIONS ---
    // --- 4. CORE FUNCTIONS ---
    function handleSearch() {
        const dsNoQuery = dsNoInput.value.trim().toLowerCase();
        const guestQuery = guestInput.value.trim().toLowerCase();
        const dateQuery = dateInput.value;

        let results = allSlips.filter(slip => {
            const dsNoMatch = dsNoQuery ? (slip['DS_No'] || '').toLowerCase().includes(dsNoQuery) : true;
            const guestMatch = guestQuery ? (slip['Guest Name'] || '').toLowerCase().includes(guestQuery) : true;
            const dateMatch = dateQuery ? (slip['Date'] === dateQuery) : true;
            return dsNoMatch && guestMatch && dateMatch;
        });

        displayResults(results, dsNoQuery);
    }

    function displayResults(slips, searchedId) {
        resultsContainer.innerHTML = ''; // Clear previous results

        if (slips.length === 0) {
            // Your new "No Result" workflow
            let message = 'No duty slips found matching your criteria.';
            let buttonHtml = `<a href="/create-duty-slip.html" class="btn-primary" style="margin-top: 1rem;">Create New Slip</a>`;
            if (searchedId) {
                message = `No result found for D.S. No: ${searchedId}.`;
                buttonHtml = `<a href="/create-duty-slip.html?ds_no=${searchedId}" class="btn-primary" style="margin-top: 1rem;">Create Slip #${searchedId}</a>`;
            }
            resultsContainer.innerHTML = `<div class="content-card no-results">${message}${buttonHtml}</div>`;
            return;
        }

        slips.forEach(slip => {
            const slipCard = document.createElement('div');
            slipCard.className = 'content-card slip-card';
            slipCard.dataset.id = slip['DS_No'];
            slipCard.innerHTML = `
    <div class="slip-details-grid">
        <div class="slip-info">
            <h3>DS #${slip['DS_No']}</h3>
            <p><strong>Date:</strong> ${slip['Date']}</p>
            <p><strong>Guest:</strong> ${slip['Guest_Name'] || 'N/A'} (${slip['Guest_Mobile'] || 'N/A'})</p>
            <p><strong>Driver:</strong> ${slip['Driver_Name'] || 'N/A'} | <strong>Vehicle:</strong> ${slip['Vehicle_No'] || 'N/A'}</p>
            <p><strong>Timestamp:</strong> ${new Date(slip['Timestamp']).toLocaleString()}</p>
        </div>
        <div class="slip-status">
            <p>Guest Signature:</p>
            <div class="signature-icon">
                <img src="${slip['Guest_Signature_Link'] || ''}" alt="Guest Signature">
            </div>
        </div>
    </div>
    <div class="slip-actions">
        <a href="/view.html?id=${slip['DS_No']}" target="_blank" class="action-link"><i class="fas fa-print"></i> View/Print</a>
        <a href="/edit-slip.html?id=${slip['DS_No']}" class="action-link"><i class="fas fa-edit"></i> Edit Full Slip</a>
        <button class="action-link copy-btn" data-link="/view.html?id=${slip['DS_No']}"><i class="fas fa-copy"></i> Copy View Link</button>
        <button class="action-link whatsapp-btn" data-type="driver" data-id="${slip['DS_No']}"><i class="fab fa-whatsapp"></i> Share to Driver</button>
        <button class="action-link whatsapp-btn" data-type="guest-close" data-id="${slip['DS_No']}"><i class="fas fa-signature"></i> Ask Guest to Close</button>
        <button class="action-link whatsapp-btn" data-type="guest-info" data-id="${slip['DS_No']}"><i class="fas fa-info-circle"></i> Send Info to Guest</button>
        <button class="action-link whatsapp-btn" data-type="thank-you" data-id="${slip['DS_No']}"><i class="fas fa-gift"></i> Send Thank You</button>
    </div>
`;
            resultsContainer.appendChild(slipCard);
        });
    }

    // --- 5. FINAL WHATSAPP MESSAGE FUNCTIONS ---
    const contactInfo = `\nFor assistance:\n📞 +91 8883451668\n📧 travels@shrishgroup.com\n🌐 https://shrishgroup.com/contact`;
    const addDetail = (label, value) => (value ? `\n${label}: ${value}` : '');

    function shareWithDriver(slip) {
        const mobile = slip.Driver_Mobile?.replace(/\D/g, '');
        if (!mobile) return alert('Driver mobile not found.');
        const link = `${window.location.origin}/close-slip.html?id=${slip.DS_No}`;
        const message = `*Duty Slip: #${slip.DS_No}*\n\n👤 Guest: ${slip.Guest_Name}\n⏰ Time: ${slip.Reporting_Time}\n📍 Address: ${slip.Reporting_Address}\n\n🔗 *Close Link:* ${link}\n\n- Shrish Travels`;
        window.open(`https://wa.me/91${mobile}?text=${encodeURIComponent(message.trim())}`, '_blank');
    }

    function shareInfoWithGuest(slip) {
        const mobile = slip.Guest_Mobile?.replace(/\D/g, '');
        if (!mobile) return alert('Guest mobile not found.');
        const message = `Dear ${slip.Guest_Name},\n\nYour ride with Shrish Travels is confirmed.\n\n*Your Chauffeur Details:*\n👤 Name: ${slip.Driver_Name}\n📞 Contact: ${slip.Driver_Mobile}\n🚗 Vehicle: ${slip.Vehicle_Type} (${slip.Vehicle_No})\n\nThank you for choosing us.${contactInfo}`;
        window.open(`https://wa.me/91${mobile}?text=${encodeURIComponent(message.trim())}`, '_blank');
    }

    function askGuestToClose(slip) {
        const mobile = slip.Guest_Mobile?.replace(/\D/g, '');
        if (!mobile) return alert('Guest mobile not found.');
        const link = `${window.location.origin}/client-close.html?id=${slip.DS_No}`;
        const message = `Dear ${slip.Guest_Name},\n\nThank you for travelling with us. Please confirm your trip details by signing via the secure link below.\n\n🔗 *Confirm Your Trip:* ${link}\n\n- Shrish Travels${contactInfo}`;
        window.open(`https://wa.me/91${mobile}?text=${encodeURIComponent(message.trim())}`, '_blank');
    }

    function sendThankYouToGuest(slip) {
        const mobile = slip.Guest_Mobile?.replace(/\D/g, '');
        if (!mobile) return alert('Guest mobile not found.');
        const reviewLink = "https://g.page/r/CaYoGVSEfXMNEBM/review";
        const message = `Dear ${slip.Guest_Name},\n\nWe hope you had a pleasant journey. If you have a moment, please consider leaving us a review on Google.\n\n⭐ *Leave a Review:* ${reviewLink}\n\nWe look forward to serving you again.\n- Shrish Travels${contactInfo}`;
        window.open(`https://wa.me/91${mobile}?text=${encodeURIComponent(message.trim())}`, '_blank');
    }

    // --- 6. INITIALIZE ---
    loadAllSlips();
});

