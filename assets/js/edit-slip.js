document.addEventListener('DOMContentLoaded', () => {

    // --- 1. INITIALIZATION ---
    function initializePage() {
        populateDriverDatalist();
        setupEventListeners();
        loadSlipDataForEditing();
        initializeSignaturePad('signature-canvas'); // From common.js
    }

    // --- 2. PAGE-SPECIFIC SETUP ---
    function populateDriverDatalist() {
        const datalist = document.getElementById('driver-list');
        Object.keys(driverData).forEach(driverName => {
            const option = document.createElement('option');
            option.value = driverName;
            datalist.appendChild(option);
        });
    }

    function setupEventListeners() {
        document.querySelectorAll('#save-slip-button, #mobile-save-slip-button').forEach(btn => btn.addEventListener('click', updateDutySlip));
        document.querySelectorAll('#whatsapp-button, #mobile-whatsapp-button').forEach(btn => btn.addEventListener('click', handleWhatsAppShare));
        document.querySelectorAll('#generate-link-button, #mobile-generate-link-button').forEach(btn => btn.addEventListener('click', handleGenerateLink));

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

        validateMobileInput('guest-mobile');
        validateMobileInput('driver-mobile');

        document.getElementById('driver-name')?.addEventListener('input', handleDriverSelection);
        document.getElementById('auth-signature-box')?.addEventListener('click', () => openSignaturePad('auth-signature-link'));
        document.getElementById('guest-signature-box')?.addEventListener('click', () => openSignaturePad('guest-signature-link'));
        // NEW LOGIC: PDF Download Button
        const pdfButtons = document.querySelectorAll('#download-pdf-button, #mobile-download-pdf-button');
        pdfButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const dsNo = document.getElementById('ds-no').value;
                if (dsNo) {
                    // Open the view page in a new tab
                    const viewUrl = `${window.location.origin}/view.html?id=${dsNo}`;
                    const printWindow = window.open(viewUrl, '_blank');

                    // Once the new window loads, trigger its print function
                    printWindow.onload = function () {
                        printWindow.print();
                    };
                } else {
                    alert("Please save the duty slip first to generate a PDF.");
                }
            });
        });
    }

    async function loadSlipDataForEditing() {
        const slipId = new URLSearchParams(window.location.search).get('id');
        if (!slipId) return alert('Error: No Duty Slip ID provided.');

        try {
            const response = await fetch(`/api?action=getDutySlipById&id=${slipId}`);
            const data = await response.json();
            if (data.error || !data.slip) throw new Error(data.error);

            for (const key in data.slip) {
                const inputId = key.toLowerCase().replace(/_/g, '-');
                const inputElement = document.getElementById(inputId);
                if (inputElement) {
                    if (inputElement.tagName === 'IMG') {
                        const signatureData = data.slip[key];
                        if (signatureData && !signatureData.endsWith('/')) {
                            inputElement.src = signatureData;
                            inputElement.style.display = 'block';
                            if (inputElement.previousElementSibling) {
                                inputElement.previousElementSibling.style.display = 'none';
                            }
                        }
                    } else {
                        inputElement.value = data.slip[key];
                    }
                }
            }
            calculateTotals(); // From common.js
            validateAllInputs(); // From common.js
        } catch (error) {
            alert(`Failed to load duty slip data: ${error.message}`);
        }
    }

    // --- 3. CORE UPDATE HANDLER ---
    async function updateDutySlip(event) {
        event.preventDefault();

        if (!validateAllInputs()) {
            alert('Please fix the validation errors before saving.');
            return;
        }

        const button = event.currentTarget;
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

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

        formData['Status'] = 'Updated by Manager';

        try {
            const response = await fetch('/api?action=updateDutySlip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const result = await response.json();

            if (result.success) {
                alert(result.message);
                window.location.href = '/duty-slips.html';
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
