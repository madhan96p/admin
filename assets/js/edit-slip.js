document.addEventListener('DOMContentLoaded', () => {

    // --- 1. CONFIGURATION & DATA ---
    const driverData = {
        "AjithKumar": { mobile: "9047382896", signatureUrl: "../assets/images/signs/Ajithkumar.jpg" },
        "Raja": { mobile: "8838750975", signatureUrl: "../assets/images/signs/Raja.png" },
        "Jeganraj": { mobile: "8883451668", signatureUrl: "../assets/images/signs/jeganraj.jpg" },
    };

    // --- 2. ELEMENT REFERENCES ---
    const form = document.getElementById('dutySlipForm');
    const saveButton = document.getElementById('save-slip-button');
    const mobileSaveButton = document.getElementById('mobile-save-slip-button');
    const dsNoInput = document.getElementById('ds-no');
    const dateInput = document.getElementById('date');
    const fabToggle = document.getElementById('fab-main-toggle');
    const fabContainer = fabToggle ? fabToggle.parentElement : null;

    // Signature Modal Elements
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

    function populateDriverDatalist() {
        const datalist = document.getElementById('driver-list');
        if (!datalist) return;
        for (const driverName in driverData) {
            const option = document.createElement('option');
            option.value = driverName;
            datalist.appendChild(option);
        }
    }

    function setupEventListeners() {
        // Attach to all action buttons
        document.querySelectorAll('#save-slip-button, #mobile-save-slip-button').forEach(btn => btn.addEventListener('click', updateDutySlip));
        document.querySelectorAll('#whatsapp-button, #mobile-whatsapp-button').forEach(btn => btn.addEventListener('click', handleWhatsAppShare));
        document.querySelectorAll('#generate-link-button, #mobile-generate-link-button').forEach(btn => btn.addEventListener('click', handleGenerateLink));
        document.querySelectorAll('#download-pdf-button, #mobile-download-pdf-button').forEach(btn => btn.addEventListener('click', () => window.print()));

        // Attach to form inputs for validation and calculation
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
        document.getElementById('driver-name')?.addEventListener('input', handleDriverSelection);

        // Signature boxes
        document.getElementById('auth-signature-box')?.addEventListener('click', () => openSignaturePad('auth-signature-image'));
        document.getElementById('guest-signature-box')?.addEventListener('click', () => openSignaturePad('guest-signature-image'));

        // FAB menu
        if (fabToggle) {
            fabToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                fabContainer.classList.toggle('active');
            });
            document.addEventListener('click', () => fabContainer.classList.remove('active'));
        }
    }
    async function loadSlipDataForEditing() {
        const params = new URLSearchParams(window.location.search);
        const slipId = params.get('id');

        if (!slipId) {
            alert('Error: No Duty Slip ID provided.');
            return;
        }

        try {
            const response = await fetch(`/api?action=getDutySlipById&id=${slipId}`);
            const data = await response.json();

            if (data.error || !data.slip) { throw new Error(data.error); }

            // Loop through the received slip data and populate the form
            // Inside loadSlipDataForEditing in edit-slip.js

            for (const key in data.slip) {
                const inputId = key.toLowerCase().replace(/_/g, '-');
                const inputElement = document.getElementById(inputId);
                if (inputElement) {
                    // --- THIS IS THE FIX ---
                    if (inputElement.tagName === 'IMG') {
                        const signatureData = data.slip[key];
                        // Check if there is actual signature data (not a placeholder URL)
                        if (signatureData && signatureData.startsWith('data:image')) {
                            inputElement.src = signatureData;
                            inputElement.style.display = 'block';
                            // Hide the "Tap to sign" placeholder
                            inputElement.previousElementSibling.style.display = 'none';
                        }
                    } else {
                        inputElement.value = data.slip[key];
                    }
                }
            }
            calculateTotals(); // Recalculate totals after loading data

        } catch (error) {
            alert(`Failed to load duty slip data: ${error.message}`);
        }
    }
    // --- 5. CORE HANDLERS ---
    async function updateDutySlip(event) {
        event.preventDefault();
        const button = event.currentTarget;
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            // --- NEW TWO-STEP SIGNATURE UPLOAD ---
            const guestSigImg = document.getElementById('guest-signature-image');
            let guestSignatureUrl = guestSigImg.src;

            // 1. Check if there's a NEW guest signature to upload
            if (guestSignatureUrl && guestSignatureUrl.startsWith('data:image/png;base64,')) {
                const fileName = `Guest_Sig_${document.getElementById('ds-no').value}.png`;

                // Call the API to upload the image
                const sigResponse = await fetch('/api?action=uploadSignature', {
                    method: 'POST',
                    body: JSON.stringify({ signatureData: guestSignatureUrl, fileName: fileName })
                });
                const sigResult = await sigResponse.json();

                if (!sigResult.success) throw new Error('Failed to upload signature.');

                // Update the URL to the new Google Drive link
                guestSignatureUrl = sigResult.url;
            }

            // 2. Gather all form data, now with the correct signature URL
            const headers = ['DS_No', 'Booking_ID', 'Date', 'Organisation', 'Guest_Name', 'Guest_Mobile', 'Booked_By', 'Reporting_Time', 'Reporting_Address', 'Spl_Instruction', 'Vehicle_Type', 'Vehicle_No', 'Driver_Name', 'Driver_Mobile', 'Assignment', 'Routing', 'Date_Out', 'Date_In', 'Total_Days', 'Time_Out', 'Time_In', 'Km_Out', 'Km_In', 'Driver_Time_Out', 'Driver_Time_In', 'Driver_Km_Out', 'Driver_Km_In', 'Driver_Total_Hrs', 'Driver_Total_Kms', 'Auth_Signature_Link', 'Guest_Signature_Link', 'Status'];
            const formData = {};
            headers.forEach(header => {
                const inputId = header.toLowerCase().replace(/_/g, '-');
                const inputElement = document.getElementById(inputId);

                if (header === 'Guest_Signature_Link') {
                    formData[header] = guestSignatureUrl;
                } else if (inputElement) {
                    formData[header] = inputElement.tagName === 'IMG' ? inputElement.src : inputElement.value;
                } else {
                    formData[header] = '';
                }
            });

            // 3. Save the complete record to Google Sheets
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

    // --- NEW & IMPROVED WHATSAPP FUNCTION ---
    function handleWhatsAppShare() {
        const shareWith = prompt("Who do you want to share this with? (Type 'driver' or 'guest')");

        if (shareWith && shareWith.toLowerCase() === 'driver') {
            const driverMobile = document.getElementById('driver-mobile').value.replace(/\D/g, '');
            if (!driverMobile) return alert('Please select a driver first.');

            const link = generateLink(true); // Generate link for the driver
            const message = `
*Duty Details*
Guest: ${document.getElementById('guest-name').value || 'NA'}
Reporting Time: ${document.getElementById('rep-time').value || 'NA'}
Address: ${document.getElementById('reporting-address').value || 'NA'}

Please fill the closing details using this link: ${link}

- Shrish Travels
            `.trim();
            window.open(`https://wa.me/91${driverMobile}?text=${encodeURIComponent(message)}`, '_blank');

        } else if (shareWith && shareWith.toLowerCase() === 'guest') {
            const guestMobile = document.getElementById('guest-mobile').value.replace(/\D/g, '');
            if (!guestMobile) return alert('Please enter a guest mobile number.');

            const message = `
Dear Guest,

Thank you for choosing Shrish Travels. Your ride has been confirmed.

Driver: ${document.getElementById('driver-name').value || 'NA'}
Contact: ${document.getElementById('driver-mobile').value || 'NA'}
Vehicle: ${document.getElementById('vehicle-type').value || 'NA'} (${document.getElementById('vehicle-no').value || 'NA'})

We wish you a pleasant journey.
- Shrish Travels
            `.trim();
            window.open(`https://wa.me/91${guestMobile}?text=${encodeURIComponent(message)}`, '_blank');
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
        const authSigImg = document.getElementById('auth-signature-image');
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