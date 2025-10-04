document.addEventListener('DOMContentLoaded', () => {

    // --- 1. ELEMENT REFERENCES ---
    const form = document.getElementById('dutySlipForm');
    const saveButton = document.getElementById('save-slip-button');
    const mobileSaveButton = document.getElementById('mobile-save-slip-button');
    const dsNoInput = document.getElementById('ds-no');
    const dateInput = document.getElementById('date');

    // --- 2. INITIALIZATION ---
    function initializePage() {
        fetchNextDutySlipId();
        setCurrentDate();
        populateDriverDatalist();
        setupEventListeners();
        initializeSignaturePad('signature-canvas'); // From common.js
    }

    // --- 3. PAGE-SPECIFIC SETUP ---
    async function fetchNextDutySlipId() {
        try {
            const response = await fetch('/api?action=getNextDutySlipId');
            const data = await response.json();
            if (data.nextId) {
                dsNoInput.value = data.nextId;
                document.getElementById('booking-id').value = data.nextId;
            }
        } catch (error) { console.error('Failed to fetch next Duty Slip ID:', error); }
    }

    function setCurrentDate() {
        const today = new Date();
        dateInput.value = today.toISOString().split('T')[0];
    }

    function populateDriverDatalist() {
        const datalist = document.getElementById('driver-list');
        if (!datalist) return;
        Object.keys(driverData).forEach(driverName => {
            const option = document.createElement('option');
            option.value = driverName;
            datalist.appendChild(option);
        });
    }

    function setupEventListeners() {
        // Save buttons
        document.querySelectorAll('#save-slip-button, #mobile-save-slip-button').forEach(btn => btn.addEventListener('click', handleSave));
        
        // Buttons that use common functions
        document.querySelectorAll('#whatsapp-button, #mobile-whatsapp-button').forEach(btn => btn.addEventListener('click', handleWhatsAppShare));
        document.querySelectorAll('#generate-link-button, #mobile-generate-link-button').forEach(btn => btn.addEventListener('click', handleGenerateLink));
        
        // Calculation and Validation listeners
        const inputsToWatch = [
            'driver-time-out', 'driver-time-in', 'driver-km-out', 'driver-km-in', 'date', 'date-out', 'date-in', 'time-out', 'time-in', 'km-out', 'km-in'
        ];
        inputsToWatch.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', calculateTotals);
                el.addEventListener('input', validateAllInputs);
            }
        });
        
        // Mobile validation from common.js
        validateMobileInput('guest-mobile');
        validateMobileInput('driver-mobile');
        
        // Other common listeners
        document.getElementById('driver-name')?.addEventListener('input', handleDriverSelection);
        document.getElementById('auth-signature-box')?.addEventListener('click', () => openSignaturePad('auth-signature-link'));
        document.getElementById('guest-signature-box')?.addEventListener('click', () => openSignaturePad('guest-signature-link'));
    }

    // --- 4. CORE SAVE HANDLER ---
    async function handleSave(event) {
        event.preventDefault();

        // Prevent saving if validation fails
        if (!validateAllInputs()) {
            alert('Please fix the validation errors before saving.');
            return;
        }

        const button = event.currentTarget;
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        const headers = ['DS_No', 'Booking_ID', 'Date', 'Organisation', 'Guest_Name', 'Guest_Mobile', 'Booked_By', 'Reporting_Time', 'Reporting_Address', 'Spl_Instruction', 'Vehicle_Type', 'Vehicle_No', 'Driver_Name', 'Driver_Mobile', 'Assignment', 'Routing', 'Date_Out', 'Date_In', 'Total_Days', 'Time_Out', 'Time_In', 'Km_Out', 'Km_In', 'Driver_Time_Out', 'Driver_Time_In', 'Driver_Km_Out', 'Driver_Km_In', 'Driver_Total_Hrs', 'Driver_Total_Kms', 'Auth_Signature_Link', 'Guest_Signature_Link', 'Status'];
        const formData = {};
        headers.forEach(header => {
            const inputId = header.toLowerCase().replace(/_/g, '-');
            const inputElement = document.getElementById(inputId);
            if (inputElement) {
                formData[header] = inputElement.tagName === 'IMG' ? inputElement.src : inputElement.value;
            } else {
                formData[header] = '';
            }
        });

        formData['Status'] = 'New'; // Set initial status

        try {
            const response = await fetch('/api?action=saveDutySlip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const result = await response.json();

            if (result.success) {
                alert(result.message);
                window.location.href = '/duty-slips.html';
            } else {
                throw new Error(result.error || 'Unknown error during save.');
            }
        } catch (error) {
            console.error("Save failed:", error);
            alert(`Error: Could not save the duty slip. ${error.message}`);
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-save"></i> Save & Generate Link';
        }
    }

    // --- 5. RUN INITIALIZATION ---
    initializePage();
});
