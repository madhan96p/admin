document.addEventListener('DOMContentLoaded', () => {

    // --- 1. CONFIGURATION & DATA ---
    const driverData = {
        "AjithKumar": { mobile: "9047382896", signatureUrl: "https://admin.shrishgroup.com/assets/images/signs/Ajithkumar.jpg" },
        "Raja": { mobile: "8838750975", signatureUrl: "https://admin.shrishgroup.com/assets/images/signs/Raja.jpg" },
        "Jeganraj": { mobile: "8883451668", signatureUrl: "https://admin.shrishgroup.com/assets/images/signs/jeganraj.jpg" },
    };

    // --- 2. ELEMENT REFERENCES ---
    const form = document.getElementById('dutySlipForm');
    const sigModal = document.getElementById("signature-modal");
    const sigCanvas = document.getElementById("signature-canvas");
    const signaturePad = new SignaturePad(sigCanvas, { backgroundColor: 'rgb(255, 255, 255)' });
    let currentSignatureTarget = null;

    // --- 3. INITIALIZATION ---
    function initializePage() {
        populateDriverDatalist();
        setupEventListeners();
        loadSlipDataForEditing();
    }

    // --- 4. SETUP FUNCTIONS ---
    function populateDriverDatalist() {
        const datalist = document.getElementById('driver-list');
        for (const driverName in driverData) {
            const option = document.createElement('option');
            option.value = driverName;
            datalist.appendChild(option);
        }
    }

    function setupEventListeners() {
        document.querySelectorAll('#save-slip-button, #mobile-save-slip-button').forEach(btn => btn.addEventListener('click', updateDutySlip));
        document.querySelectorAll('#whatsapp-button, #mobile-whatsapp-button').forEach(btn => btn.addEventListener('click', handleWhatsAppShare));
        // ... (other listeners for generate link, download, etc.)

        document.getElementById('driver-name')?.addEventListener('input', handleDriverSelection);
        document.getElementById('auth-signature-box')?.addEventListener('click', () => openSignaturePad('auth-signature-link'));
        document.getElementById('guest-signature-box')?.addEventListener('click', () => openSignaturePad('guest-signature-link'));

        const calculationInputs = ['driver-time-out', 'driver-time-in', 'driver-km-out', 'driver-km-in'];
        calculationInputs.forEach(id => document.getElementById(id)?.addEventListener('input', calculateTotals));
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
            calculateTotals();
        } catch (error) {
            alert(`Failed to load duty slip data: ${error.message}`);
        }
    }

    // --- 5. CORE HANDLERS ---
    async function updateDutySlip(event) {
        event.preventDefault();
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

        // --- THIS IS THE CRUCIAL ADDITION ---
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

    // This is the full, final version of the function
    function handleWhatsAppShare() {
        const shareOption = prompt("Who do you want to share this with?\n\n1. Share with DRIVER (to close slip)\n2. Share Info with GUEST\n3. Ask GUEST to close slip\n\nEnter 1, 2, or 3");

        // Helper to get form values cleanly
        const getValue = (id) => document.getElementById(id)?.value || 'Not specified';
        const dsNo = getValue('ds-no');

        // The static, professional link that will generate the preview card
        const contactLink = "shrishgroup.com/contact.html";

        switch (shareOption) {
            case '1': // Share with DRIVER
                const driverMobile = getValue('driver-mobile').replace(/\D/g, '');
                if (!driverMobile) return alert('Please select a driver first.');

                const driverLink = `${window.location.origin}/close-slip.html?id=${dsNo}`;
                const driverMessage = `
*New Duty Slip: #${dsNo}*

Dear ${getValue('driver-name')},
Please find the details for your next duty:

👤 *Guest:* ${getValue('guest-name')}
⏰ *Reporting Time:* ${getValue('rep-time')}
📍 *Address:* ${getValue('reporting-address')}
📋 *Routing:* ${getValue('routing')}

Please use the link below to enter closing KM and time at the end of the trip.
🔗 *Closing Link:* ${driverLink}

- Shrish Travels
${contactLink}
            `.trim();
                window.open(`https://wa.me/91${driverMobile}?text=${encodeURIComponent(driverMessage)}`, '_blank');
                break;

            case '2': // Share Info with GUEST
                const guestMobileInfo = getValue('guest-mobile').replace(/\D/g, '');
                if (!guestMobileInfo) return alert('Please enter a guest mobile number.');

                const guestInfoMessage = `
Dear ${getValue('guest-name')},

Thank you for choosing Shrish Travels. Your ride for Duty Slip #${dsNo} has been confirmed.

*Your Driver Details:*
 chauffeur: ${getValue('driver-name')}
📞 *Contact:* ${getValue('driver-mobile')}
*Vehicle:* ${getValue('vehicle-type')} (${getValue('vehicle-no')})

We wish you a pleasant and safe journey. For any questions, please visit our contact page.
- Shrish Travels
${contactLink}
            `.trim();
                window.open(`https://wa.me/91${guestMobileInfo}?text=${encodeURIComponent(guestInfoMessage)}`, '_blank');
                break;

            case '3': // Ask GUEST to close slip
                const guestMobileClose = getValue('guest-mobile').replace(/\D/g, '');
                if (!guestMobileClose) return alert('Please enter a guest mobile number.');

                const guestLink = `${window.location.origin}/client-close.html?id=${dsNo}`;
                const guestCloseMessage = `
Dear ${getValue('guest-name')},

Thank you for travelling with us. To ensure accuracy, please take a moment to confirm your trip details by filling out the closing time and signing via the secure link below.

🔗 *Confirm Your Trip:* ${guestLink}

Your feedback is valuable to us.
- Shrish Travels
${contactLink}
            `.trim();
                window.open(`https://wa.me/91${guestMobileClose}?text=${encodeURIComponent(guestCloseMessage)}`, '_blank');
                break;

            default:
                // Do nothing if the user cancels or enters an invalid option
                break;
        }
    }

    function handleGenerateLink() {
        const link = generateLink();
        navigator.clipboard.writeText(link).then(() => alert('Shareable link copied to clipboard!'));
    }

    // --- 6. UTILITY FUNCTIONS ---
    // Replace the old generateLink function
    function generateLink() {
        const dsNo = document.getElementById('ds-no').value;
        if (!dsNo) {
            alert('Please save the slip first to generate a link.');
            return null;
        }
        return `${window.location.origin}/view.html?id=${dsNo}`;
    }

    function handleDriverSelection() {
        const selectedDriver = driverData[this.value];
        const authSigImg = document.getElementById('auth-signature-link');
        const authSigPlaceholder = document.getElementById('auth-sig-placeholder');

        if (selectedDriver) {
            document.getElementById('driver-mobile').value = selectedDriver.mobile;
            if (selectedDriver.signatureUrl) {
                authSigImg.src = selectedDriver.signatureUrl;
                authSigImg.style.display = 'block';
                authSigPlaceholder.style.display = 'none';
            }
        } else {
            document.getElementById('driver-mobile').value = '';
            authSigImg.src = '';
            authSigImg.style.display = 'none';
            authSigPlaceholder.style.display = 'block';
        }
    }

    function calculateTotals() {
        const timeOutVal = document.getElementById('driver-time-out').value;
        const timeInVal = document.getElementById('driver-time-in').value;
        if (timeOutVal && timeInVal) {
            let t1 = new Date(`1970-01-01T${timeOutVal}`);
            let t2 = new Date(`1970-01-01T${timeInVal}`);
            if (t2 < t1) t2.setDate(t2.getDate() + 1);
            const diff = (t2 - t1) / 3600000;
            document.getElementById('driver-total-hrs').value = `${diff.toFixed(2)} hrs`;
        }
        const kmOut = parseFloat(document.getElementById('driver-km-out').value) || 0;
        const kmIn = parseFloat(document.getElementById('driver-km-in').value) || 0;
        if (kmIn > kmOut) {
            document.getElementById('driver-total-kms').value = `${(kmIn - kmOut).toFixed(1)} Kms`;
        }
    }

    function validateAllInputs() { /* ... Your full validation logic can be pasted here ... */ }

    // --- 7. SIGNATURE PAD LOGIC ---
    window.openSignaturePad = (targetImageId) => {
        currentSignatureTarget = document.getElementById(targetImageId);
        sigModal.style.display = "flex";
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        sigCanvas.width = sigCanvas.offsetWidth * ratio;
        sigCanvas.height = sigCanvas.offsetHeight * ratio;
        sigCanvas.getContext("2d").scale(ratio, ratio);
        signaturePad.clear();
    };
    window.closeSignaturePad = () => sigModal.style.display = "none";
    window.clearSignature = () => signaturePad.clear();
    window.saveSignature = () => {
        if (signaturePad.isEmpty()) return alert("Please provide a signature.");
        const dataURL = signaturePad.toDataURL("image/png");
        if (currentSignatureTarget) {
            currentSignatureTarget.src = dataURL;
            currentSignatureTarget.style.display = 'block';
            currentSignatureTarget.previousElementSibling.style.display = 'none';
        }
        closeSignaturePad();
    };

    // --- 8. RUN INITIALIZATION ---
    initializePage();
});