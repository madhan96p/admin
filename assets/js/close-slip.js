document.addEventListener('DOMContentLoaded', () => {

    // --- 1. INITIALIZATION ---
    function initializePage() {
        setupEventListeners();
        loadSlipData();
        initializeSignaturePad('signature-canvas'); // From common.js
    }

    // --- 2. PAGE-SPECIFIC SETUP ---
    function setupEventListeners() {
        document.getElementById('save-slip-button')?.addEventListener('click', handleDriverClose);

        // Use common functions for calculations and signature
        const inputsToWatch = ['driver-time-in', 'driver-km-in', 'time-in', 'km-in'];
        inputsToWatch.forEach(id => {
            document.getElementById(id)?.addEventListener('input', calculateTotals);
        });

        document.getElementById('guest-signature-box')?.addEventListener('click', () => openSignaturePad('guest-signature-link'));
    }

    async function loadSlipData() {
        const slipId = new URLSearchParams(window.location.search).get('id');
        if (!slipId) return alert('Error: No Duty Slip ID provided.');

        try {
            const response = await fetch(`/api?action=getDutySlipById&id=${slipId}`);
            const data = await response.json();
            if (data.error || !data.slip) throw new Error(data.error);

            const slip = data.slip; // Get the slip object

            // Populate all form fields from the slip data
            for (const key in slip) {
                const inputId = key.toLowerCase().replace(/_/g, '-');
                const inputElement = document.getElementById(inputId);
                if (inputElement) {
                    if (inputElement.tagName === 'IMG') {
                        const signatureData = slip[key];
                        if (signatureData && !signatureData.endsWith('/') && signatureData.length > 100) {
                            inputElement.src = signatureData;
                            inputElement.style.display = 'block';
                            const placeholder = document.getElementById(inputId.replace('-link', '-placeholder'));
                            if (placeholder) placeholder.style.display = 'none';
                        }
                    } else {
                        inputElement.value = slip[key] || '';
                    }
                }
            }

            calculateTotals(); // From common.js

        } catch (error) {
            alert(`Failed to load duty slip data: ${error.message}`);
        }
    }

    // --- 3. CORE DRIVER CLOSE HANDLER ---
    async function handleDriverClose(event) {
        event.preventDefault();
        const button = event.currentTarget;
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        const slipId = new URLSearchParams(window.location.search).get('id');

        // Only send the fields a driver can change
        const guestSigImg = document.getElementById('guest-signature-link');
        const dataToUpdate = {
            DS_No: slipId,
            Driver_Time_In: document.getElementById('driver-time-in').value,
            Driver_Km_In: document.getElementById('driver-km-in').value,
            Time_In: document.getElementById('time-in').value,
            Km_In: document.getElementById('km-in').value,
            Guest_Signature_Link: guestSigImg && guestSigImg.src ? guestSigImg.src : '',
            Status: 'Closed by Driver'
        };

        try {
            const response = await fetch('/api?action=updateDutySlip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToUpdate)
            });
            const result = await response.json();

            if (result.success) {
                alert('Trip details updated successfully!');
                document.body.innerHTML = '<h1>Submission successful. You can now close this page.</h1>';
            } else {
                throw new Error(result.error || 'Unknown error during update.');
            }
        } catch (error) {
            console.error("Update failed:", error);
            alert(`Error: Could not update the duty slip. ${error.message}`);
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-save"></i> Update Duty Slip';
        }
    }

    // --- 4. RUN INITIALIZATION ---
    initializePage();
});
