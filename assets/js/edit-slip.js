function initializeEditSlipPage() {
    // ADD THIS NEW HELPER FUNCTION HERE
    function formatDateForInput(dateString) {
        if (!dateString) return ''; // Return empty if no date is provided
        const date = new Date(dateString);
        // Check if the date is valid. If not, return empty.
        if (isNaN(date.getTime())) {
            return '';
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

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
        if (!slipId) {
            // On the create page, there's no ID, so we just stop.
            // On the edit page, we should show an error.
            if (window.location.pathname.includes('edit-slip.html')) {
                alert('Error: No Duty Slip ID provided.');
            }
            return;
        }

        try {
            const response = await fetch(`/api?action=getDutySlipById&id=${slipId}`);
            const data = await response.json();
            if (data.error || !data.slip) throw new Error(data.error || "Slip data not found.");

            const slip = data.slip;

            // This enhanced loop now handles all data types correctly
            for (const key in slip) {
                const inputId = key.toLowerCase().replace(/_/g, '-');
                const inputElement = document.getElementById(inputId);

                if (inputElement) {
                    // LOGIC FOR SIGNATURES
                    if (inputElement.tagName === 'IMG') {
                        const signatureData = slip[key];
                        // FIX: Accept long base64 strings OR standard http links
                        if ((signatureData && signatureData.length > 100) || (signatureData && signatureData.startsWith('http'))) {
                            inputElement.src = signatureData;
                            inputElement.style.display = 'block';
                            const placeholder = document.getElementById(inputId.replace('-link', '-sig-placeholder'));
                            if (placeholder) placeholder.style.display = 'none';
                        }
                        // LOGIC FOR DATES
                    } else if (inputElement.type === 'date') {
                        // FIX: Use our new helper function to format the date correctly
                        inputElement.value = formatDateForInput(slip[key]);
                        // LOGIC FOR ALL OTHER INPUTS
                    } else {
                        inputElement.value = slip[key] || '';
                    }
                }
            }
            // After populating, run calculations to fill in total fields
            calculateTotals();

        } catch (error) {
            alert(`Failed to load duty slip data: ${error.message}`);
        }
    }
    // ... inside initializeEditSlipPage function, after loadSlipDataForEditing ...

    // --- 5. SHARING & UTILITY FUNCTIONS ---
    function handleWhatsAppShare() {
        // Gather data from the form fields
        const bookingId = document.getElementById('booking-id').value;
        const guestName = document.getElementById('guest-name').value;
        const guestMobile = document.getElementById('guest-mobile').value;
        const vehicleType = document.getElementById('vehicle-type').value;
        const vehicleNo = document.getElementById('vehicle-no').value;
        const date = document.getElementById('date').value;
        const reportingTime = document.getElementById('reporting-time').value;
        const reportingAddress = document.getElementById('reporting-address').value;
        const driverMobile = document.getElementById('driver-mobile').value;
        const dsNo = document.getElementById('ds-no').value;

        // Ensure a driver mobile number is present
        if (!driverMobile || driverMobile.length < 10) {
            return alert('Please enter a valid 10-digit driver mobile number before sharing.');
        }

        // Construct the message
        const message = `
Booking: DS#${bookingId}
Passenger: ${guestName} (${guestMobile})
Vehicle: ${vehicleType} (${vehicleNo})
Date: ${date}
Reporting time: ${reportingTime}
Reporting address: ${reportingAddress}
Close link: https://admin.shrishgroup.com/edit-slip.html?id=${dsNo}

Regards Shrish Group
Contact +91 8883451668 / 9176500207
- Sent via Shrish Travels
        `;

        // Generate and open the WhatsApp link
        const whatsappUrl = `https://wa.me/91${driverMobile}?text=${encodeURIComponent(message.trim())}`;
        window.open(whatsappUrl, '_blank');
    }

    function handleGenerateLink() {
        const dsNo = document.getElementById('ds-no').value;
        if (!dsNo) {
            return alert('Cannot generate a link for an unsaved slip.');
        }

        const viewUrl = `${window.location.origin}/view.html?id=${dsNo}`;

        // Use the Clipboard API to copy the link
        navigator.clipboard.writeText(viewUrl).then(() => {
            alert('View link copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy link: ', err);
            alert('Failed to copy link. Please copy it manually.');
        });
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
}
