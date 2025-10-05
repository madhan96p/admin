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

            // --- FIX: Directly populate fields using exact keys from the API ---
            document.getElementById('guest-name').value = slip.Guest_Name || '';
            document.getElementById('driver-name').value = slip.Driver_Name || '';
            document.getElementById('vehicle-no').value = slip.Vehicle_No || '';
            document.getElementById('driver-km-out').value = slip.Driver_Km_Out || '';
            document.getElementById('km-out').value = slip.Km_Out || '';

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
        const dataToUpdate = {
            DS_No: slipId,
            Driver_Time_In: document.getElementById('driver-time-in').value,
            Driver_Km_In: document.getElementById('driver-km-in').value,
            Time_In: document.getElementById('time-in').value,
            Km_In: document.getElementById('km-in').value,
            Guest_Signature_Link: document.getElementById('guest-signature-link').src,
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
