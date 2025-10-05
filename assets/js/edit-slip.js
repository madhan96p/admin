App.initializePage(function initializeEditSlipPage() {
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

        // Assuming these functions are defined elsewhere or should be in common.js
        const inputsToWatch = [
            'driver-time-out', 'driver-time-in', 'driver-km-out', 'driver-km-in', 'date', 'date-out', 'date-in', 'time-out', 'time-in', 'km-out', 'km-in'
        ];
        // inputsToWatch.forEach(id => {
        //     const el = document.getElementById(id);
        //     if (el) {
        //         el.addEventListener('input', calculateTotals);
        //         el.addEventListener('input', validateAllInputs);
        //     }
        // });
        // validateMobileInput('guest-mobile');
        // validateMobileInput('driver-mobile');

        const signaturePadManager = App.initializeSignaturePad(
            'signature-canvas',
            'signature-modal',
            'clear-signature-btn',
            'save-signature-btn',
            (dataURL) => {
                const targetImg = document.getElementById(window.currentSignatureTargetId);
                if (targetImg) {
                    targetImg.src = dataURL;
                    targetImg.style.display = 'block';
                }
            }
        );

        document.getElementById('driver-name')?.addEventListener('input', handleDriverSelection);
        document.getElementById('auth-signature-box')?.addEventListener('click', () => { window.currentSignatureTargetId = 'auth-signature-link'; signaturePadManager.open(); });
        document.getElementById('guest-signature-box')?.addEventListener('click', () => { window.currentSignatureTargetId = 'guest-signature-link'; signaturePadManager.open(); });
        document.getElementById('cancel-signature-btn')?.addEventListener('click', () => signaturePadManager.close());
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
                    App.showToast("Please save the duty slip first to generate a PDF.", "info");
                }
            });
        });
    }

    async function loadSlipDataForEditing() {
        const slipId = App.getUrlParameter('id');
        if (!slipId) {
            if (window.location.pathname.includes('edit-slip.html')) {
                App.showToast('Error: No Duty Slip ID provided.', 'error');
            }
            return;
        }

        try {
            const slip = await App.apiService(`/duty-slip/${slipId}`, 'GET');

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
            // calculateTotals();

        } catch (error) {
            App.showToast(`Failed to load duty slip data: ${error.message}`, 'error');
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
            return App.showToast('Please enter a valid 10-digit driver mobile number before sharing.', 'error');
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
            return App.showToast('Cannot generate a link for an unsaved slip.', 'info');
        }

        const viewUrl = `${window.location.origin}/view.html?id=${dsNo}`;

        // Use the Clipboard API to copy the link
        navigator.clipboard.writeText(viewUrl).then(() => {
            App.showToast('View link copied to clipboard!', 'success');
        }).catch(err => {
            console.error('Failed to copy link: ', err);
            App.showToast('Failed to copy link. Please copy it manually.', 'error');
        });
    }

    // --- 3. CORE UPDATE HANDLER ---
    async function updateDutySlip(event) {
        event.preventDefault();

        // Assuming validateAllInputs() is defined elsewhere
        // if (!validateAllInputs()) {
        //     App.showToast('Please fix the validation errors before saving.', 'error');
        //     return;
        // }

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
            const slipId = formData['DS_No'];
            const result = await App.apiService(`/duty-slip/${slipId}`, 'PUT', formData);

            if (result.success) {
                App.showToast(result.message, 'success');
                window.location.href = '/duty-slips.html';
            } else {
                throw new Error(result.error || 'Unknown error during update.');
            }
        } catch (error) {
            console.error("Update failed:", error);
            App.showToast(`Error: Could not update the duty slip. ${error.message}`, 'error');
        } finally {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-save"></i> Update Duty Slip';
        }
    }

    // --- 4. RUN INITIALIZATION ---
    initializePage();
});
