document.addEventListener('DOMContentLoaded', () => {
    // --- 1. ELEMENT REFERENCES ---
    const findBtn = document.getElementById('find-slip-btn');
    const resultsContainer = document.getElementById('results-container');
    const dsNoInput = document.getElementById('search-ds-no');
    const guestInput = document.getElementById('search-guest');
    const dateInput = document.getElementById('search-date');
    let allSlips = []; // Master list of slips

    // --- 2. INITIAL DATA LOAD ---
    async function loadAllSlips() {
        try {
            const response = await fetch('/api?action=getAllDutySlips');
            const data = await response.json();
            if (data.slips) {
                allSlips = data.slips;
            }
        } catch (error) {
            console.error("Failed to pre-load slips:", error);
        }
    }

    // --- 3. EVENT LISTENERS ---
    findBtn.addEventListener('click', handleSearch);

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

    // Event delegation for dynamically created buttons
    // In manager-hub.js, replace the existing resultsContainer event listener

    resultsContainer.addEventListener('click', (e) => {
        const actionTarget = e.target.closest('.action-link');
        const cardTarget = e.target.closest('.slip-card');

        if (actionTarget) { // If a specific action button was clicked
            e.preventDefault(); // Prevent card click from also firing
            if (actionTarget.classList.contains('copy-btn')) {
                navigator.clipboard.writeText(window.location.origin + actionTarget.dataset.link)
                    .then(() => alert('Link copied!'));
            } else if (actionTarget.classList.contains('whatsapp-btn')) {
                const slipData = allSlips.find(s => s['DS_No'] === actionTarget.dataset.id);
                handleQuickShare(actionTarget.dataset.type, slipData);
            } else if (actionTarget.hasAttribute('href')) {
                // Handle regular links like Edit
                window.location.href = actionTarget.href;
            }
        } else if (cardTarget) { // If anywhere else on the card was clicked
            const slipId = cardTarget.dataset.id;
            window.open(`/view.html?id=${slipId}`, '_blank');
        }
    });

    // In manager-hub.js, replace the placeholder function with this
    function handleQuickShare(shareType, slipData) {
        const dsNo = slipData['DS_No'];
        const contactInfo = `\nFor assistance:\n📞 +91 8883451668\n📧 travels@shrishgroup.com\n🌐 shrishgroup.com/contact`;
        let mobile = '';
        let message = '';

        // Helper to conditionally add a line to the message if the data exists
        const addDetail = (label, value) => {
            return value && value !== 'Not specified' ? `\n${label}: ${value}` : '';
        };

        switch (shareType) {
            case 'driver':
                mobile = slipData['Driver_Mobile']?.replace(/\D/g, '');
                if (!mobile) return alert('Driver mobile not found.');

                const driverLink = `${window.location.origin}/close-slip.html?id=${dsNo}`;
                message = `
*New Duty Slip: #${dsNo}*

👤 Passenger: ${slipData['Guest_Name']} (${slipData['Guest_Mobile']})
🚗 Vehicle: ${slipData['Vehicle_Type']} (${slipData['Vehicle_No']})
🗓️ Date: ${slipData['Date']}`
                    + addDetail('⏰ Reporting time', slipData['Reporting_Time'])
                    + addDetail('📍 Reporting address', slipData['Reporting_Address'])
                    + addDetail('➡️ Drop address', slipData['Routing'])
                    + addDetail('📝 Remarks', slipData['Spl_Instruction'])
                    + `\n\n🔗 *Close link:* ${driverLink}\n\nRegards\n- Shrish Travels`;

                break;

            case 'guest-info':
                mobile = slipData['Guest_Mobile']?.replace(/\D/g, '');
                if (!mobile) return alert('Guest mobile not found.');

                message = `
Dear ${slipData['Guest_Name']},

Your ride with Shrish Travels is confirmed.

*Your Chauffeur Details:*
👤 Name: ${slipData['Driver_Name']}
📞 Contact: ${slipData['Driver_Mobile']}
🚗 Vehicle: ${slipData['Vehicle_Type']} (${slipData['Vehicle_No']})

The driver will arrive on time at the pickup location. Thank you for choosing us.
${contactInfo}
            `.trim();
                break;

            case 'guest-close':
                mobile = slipData['Guest_Mobile']?.replace(/\D/g, '');
                if (!mobile) return alert('Guest mobile not found.');

                const guestLink = `${window.location.origin}/client-close.html?id=${dsNo}`;
                message = `
Dear ${slipData['Guest_Name']},

Thank you for travelling with Shrish Travels. To ensure accuracy, please take a moment to confirm your trip details and sign via the secure link below.

🔗 *Confirm Your Trip:* ${guestLink}

Your feedback is valuable to us.
${contactInfo}
            `.trim();
                break;

            // In manager-hub.js, replace the 'thank-you' case

            case 'thank-you':
                mobile = slipData['Guest_Mobile']?.replace(/\D/g, '');
                if (!mobile) return alert('Guest mobile not found.');

                // --- THIS IS THE FIX ---
                // Using the Google Review link instead of the view link
                const reviewLink = "https://g.page/r/CaYoGVSEfXMNEBM/review";
                message = `
Dear ${slipData['Guest_Name']},

We hope you had a pleasant journey. Thank you again for choosing Shrish Travels!

Your feedback is very important to us. If you have a moment, please consider leaving us a review on Google. It helps other travelers find us.

⭐ *Leave a Review:* ${reviewLink}

We look forward to serving you again.
${contactInfo}
    `.trim();
                break;
        }

        if (mobile && message) {
            window.open(`https://wa.me/91${mobile}?text=${encodeURIComponent(message.trim())}`, '_blank');
        }
    }

    // --- 5. INITIALIZE ---
    loadAllSlips();
});