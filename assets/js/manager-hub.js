document.addEventListener('DOMContentLoaded', () => {
    // --- 1. ELEMENT REFERENCES ---
    const resultsContainer = document.getElementById('results-container');
    const dsNoInput = document.getElementById('search-ds-no');
    const guestInput = document.getElementById('search-guest');
    const dateInput = document.getElementById('search-date');
    let allSlips = [];
    let searchTimeout;

    // --- 2. INITIAL DATA LOAD ---
    async function loadAllSlips() {
        try {
            const response = await fetch('/api?action=getAllDutySlips');
            const data = await response.json();
            if (data.slips) {
                allSlips = data.slips.reverse();
                // Initially display the 5 most recent slips with animation
                displayResults(allSlips.slice(0, 5));
            }
        } catch (error) {
            console.error("Failed to pre-load slips:", error);
            resultsContainer.innerHTML = `<div class="no-results-card fade-in"><p>Error loading slip data. Please refresh the page.</p></div>`;
        }
    }

    // --- 3. CORE FUNCTIONS ---
    const handleSearch = () => {
        const dsNoQuery = dsNoInput.value.trim().toLowerCase();
        const guestQuery = guestInput.value.trim().toLowerCase();
        const dateQuery = dateInput.value;

        const results = allSlips.filter(slip => {
            const dsNoMatch = dsNoQuery ? (slip['DS_No'] || '').toLowerCase().includes(dsNoQuery) : true;
            const guestMatch = guestQuery ? (slip['Guest_Name'] || '').toLowerCase().includes(guestQuery) : true;
            const slipDateFormatted = slip['Date'] ? new Date(slip['Date']).toISOString().split('T')[0] : '';
            const dateMatch = dateQuery ? (slipDateFormatted === dateQuery) : true;
            return dsNoMatch && guestMatch && dateMatch;
        });
        displayResults(results);
    };

    const displayResults = (slips) => {
        resultsContainer.classList.add('fading-out');

        setTimeout(() => {
            resultsContainer.innerHTML = '';
            resultsContainer.classList.remove('fading-out');

            if (!slips || slips.length === 0) {
                const searchedId = dsNoInput.value.trim();
                let message = 'No duty slips found. Please try a different search.';
                let buttonHtml = `<a href="/create-duty-slip.html" class="btn-primary" style="margin-top: 1rem;">Create New Slip</a>`;
                if (searchedId && !guestInput.value && !dateInput.value) {
                    message = `No result found for D.S. No: <strong>${searchedId}</strong>.`;
                    buttonHtml = `<a href="/create-duty-slip.html?ds_no=${searchedId}" class="btn-primary" style="margin-top: 1rem;">Create Slip #${searchedId}</a>`;
                }
                resultsContainer.innerHTML = `<div class="no-results-card fade-in"><i class="fas fa-search"></i><p>${message}</p>${buttonHtml}</div>`;
                return;
            }

            slips.forEach((slip, index) => {
                const statusClass = (slip.Status || 'New').toLowerCase().replace(/ /g, '-');
                const cardStatusClass = `slip-card--${statusClass}`;
                const signatureIcon = slip.Guest_Signature_Link ? `<img src="${slip.Guest_Signature_Link}" alt="Guest Signature">` : `<i class="fas fa-signature"></i>`;

                const card = document.createElement('div');
                card.className = `slip-card ${cardStatusClass} is-loading`;
                card.style.setProperty('--delay-index', index);

                card.innerHTML = `
                    <div class="slip-card-header">
                        <h3>Duty Slip #${slip.DS_No}</h3>
                        <div class="header-right">
                            <span class="status-badge status-${statusClass}">${slip.Status || 'New'}</span>
                            <div class="signature-thumbnail" data-signature-url="${slip.Guest_Signature_Link || ''}" title="View Guest Signature">
                                ${signatureIcon}
                            </div>
                        </div>
                    </div>
                    <div class="slip-card-body">
                        <div class="info-item"><i class="fas fa-user"></i><div class="info-item-content"><p><strong>${slip.Guest_Name || 'N/A'}</strong>Guest</p></div></div>
                        <div class="info-item"><i class="fas fa-id-card"></i><div class="info-item-content"><p><strong>${slip.Driver_Name || 'N/A'}</strong>Driver</p></div></div>
                        <div class="info-item"><i class="fas fa-calendar-alt"></i><div class="info-item-content"><p><strong>${slip.Date || 'N/A'}</strong>Date</p></div></div>
                        <div class="info-item"><i class="fas fa-car"></i><div class="info-item-content"><p><strong>${slip.Vehicle_No || 'N/A'}</strong>Vehicle</p></div></div>
                    </div>
                    <div class="slip-card-actions">
                        <a href="/view.html?id=${slip.DS_No}" target="_blank" class="action-link"><i class="fas fa-print"></i> View/Print</a>
                        <a href="/edit-slip.html?id=${slip.DS_No}" target="_blank" class="action-link"><i class="fas fa-edit"></i> Edit Full Slip</a>
                        <button class="action-link copy-btn" data-link="/view.html?id=${slip.DS_No}"><i class="fas fa-copy"></i> Copy View Link</button>
                        <button class="action-link whatsapp-btn" data-type="driver" data-id="${slip.DS_No}"><i class="fab fa-whatsapp"></i> Share to Driver</button>
                        <button class="action-link whatsapp-btn" data-type="guest-close" data-id="${slip.DS_No}"><i class="fas fa-signature"></i> Ask Guest to Close</button>
                        <button class="action-link whatsapp-btn" data-type="guest-info" data-id="${slip.DS_No}"><i class="fas fa-info-circle"></i> Send Info to Guest</button>
                        <button class="action-link whatsapp-btn" data-type="thank-you" data-id="${slip.DS_No}"><i class="fas fa-gift"></i> Send Thank You</button>
                    </div>`;
                
                resultsContainer.appendChild(card);
                setTimeout(() => card.classList.remove('is-loading'), 50);
            });
        }, 300);
    };

    // --- 4. MODAL & INTERACTIVITY FUNCTIONS ---
    function openImageModal(imageUrl) {
        if (!imageUrl) {
            alert('No signature available for this slip.');
            return;
        }
        const modal = document.getElementById('image-modal');
        const modalImage = document.getElementById('modal-img');
        const downloadBtn = document.getElementById('modal-download-btn');
        const copyBtn = document.getElementById('modal-copy-btn');

        modalImage.src = imageUrl;
        downloadBtn.href = imageUrl;
        copyBtn.dataset.link = imageUrl;
        modal.classList.add('visible');
    }

    function closeImageModal() {
        document.getElementById('image-modal').classList.remove('visible');
    }

    // --- 5. YOUR ORIGINAL WHATSAPP FUNCTIONS ---
    const contactInfo = `\nFor assistance:\n📞 +91 8883451668\n📧 travels@shrishgroup.com\n🌐 https://shrishgroup.com/contact`;

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

    // --- 6. EVENT LISTENERS ---
    document.getElementById('find-slip-btn').addEventListener('click', (e) => { e.preventDefault(); handleSearch(); });

    [dsNoInput, guestInput, dateInput].forEach(input => {
        input.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            resultsContainer.innerHTML = `<div class="loader"></div>`;
            searchTimeout = setTimeout(handleSearch, 400);
        });
    });

    resultsContainer.addEventListener('click', (e) => {
        const target = e.target.closest('.action-link, .signature-thumbnail');
        if (!target) return;

        if (target.classList.contains('signature-thumbnail')) {
            openImageModal(target.dataset.signatureUrl);
            return;
        }
        
        e.preventDefault(); // Prevent default only for action links now
        const slipId = target.dataset.id;
        
        if (target.classList.contains('copy-btn')) {
            navigator.clipboard.writeText(window.location.origin + target.dataset.link).then(() => alert('Link copied!'));
        } else if (target.classList.contains('whatsapp-btn')) {
            const slipData = allSlips.find(s => s.DS_No === slipId);
            if (!slipData) return alert('Slip data not found.');
            const shareType = target.dataset.type;
            switch (shareType) {
                case 'driver': shareWithDriver(slipData); break;
                case 'guest-info': shareInfoWithGuest(slipData); break;
                case 'guest-close': askGuestToClose(slipData); break;
                case 'thank-you': sendThankYouToGuest(slipData); break;
            }
        }
    });

    document.getElementById('modal-close-btn')?.addEventListener('click', closeImageModal);
    document.getElementById('modal-overlay')?.addEventListener('click', closeImageModal);
    document.getElementById('modal-copy-btn')?.addEventListener('click', (e) => {
        navigator.clipboard.writeText(e.currentTarget.dataset.link).then(() => alert('Image link copied!'));
    });

    // --- 7. INITIALIZE ---
    loadAllSlips();
});