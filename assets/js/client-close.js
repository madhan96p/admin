document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const form = document.getElementById('clientCloseForm');
    const saveButton = document.getElementById('save-slip-button');
    const loader = document.getElementById('loader');
    const mainContent = document.getElementById('main-content');
    const dutySlipView = document.getElementById('duty-slip-view');
    const thankYouPage = document.getElementById('thank-you-page');

    const params = new URLSearchParams(window.location.search);
    const slipId = params.get('id');

    // --- Signature Pad Setup ---
    const sigModal = document.getElementById("signature-modal");
    const sigCanvas = document.getElementById("signature-canvas");
    const signaturePad = new SignaturePad(sigCanvas);

    document.getElementById('guest-signature-box')?.addEventListener('click', () => openSignaturePad());

    // --- Data Population Function ---
    function populateField(id, value) {
        const el = document.getElementById(id);
        if (el) {
            if (el.tagName === 'IMG') {
                // Check for a valid value that isn't just a placeholder or empty data URL
                if (value && value.length > 100) { // Simple check for non-empty base64
                    el.src = value;
                    el.style.display = 'block';
                }
            } else {
                el.textContent = value || '-';
            }
        }
    }

    // --- Load Initial Data ---
    async function loadInitialData() {
        if (!slipId) {
            loader.innerHTML = '<p style="color: var(--danger-color);">Error: No Duty Slip ID provided.</p>';
            return;
        }

        try {
            await new Promise(resolve => setTimeout(resolve, 500)); // Prevent aggressive refetching
            const response = await fetch(`/api?action=getDutySlipById&id=${slipId}`);
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            const data = await response.json();

            if (data.error || !data.slip) {
                throw new Error(data.error || 'Slip data not found.');
            }

            const { slip } = data;

            // Populate all fields
            populateField('ds-id', `Duty Slip #${slip.DS_No || slipId}`);
            populateField('ds-date', `Date: ${slip.Date || new Date().toLocaleDateString('en-CA')}`);
            populateField('guest-name', slip.Guest_Name);
            populateField('guest-number', slip.Guest_Mobile);
            populateField('reporting-address', slip.Reporting_Address);
            populateField('reporting-time', slip.Reporting_Time);
            populateField('driver-name', slip.Driver_Name);
            populateField('driver-number', slip.Driver_Mobile);
            populateField('vehicle-type', slip.Vehicle_Type);
            populateField('vehicle-no', slip.Vehicle_No);
            populateField('km-out', slip.Km_Out);
            populateField('km-in', slip.Km_In);

            // Calculate customer total KMs on the fly if not stored
            const custKmOut = parseFloat(slip.Km_Out) || 0;
            const custKmIn = parseFloat(slip.Km_In) || 0;
            if (custKmIn > custKmOut) {
                populateField('total-kms', `${(custKmIn - custKmOut).toFixed(1)} Kms`);
            } else {
                populateField('total-kms', slip.Driver_Total_Kms); // Fallback to driver total if no customer data
            }

            populateField('total-hrs', slip.Driver_Total_Hrs); // Total hours is usually the same
            populateField('auth-signature-link', slip.Auth_Signature_Link);

            // Show the content
            loader.style.display = 'none';
            mainContent.style.display = 'block';
            setTimeout(() => mainContent.classList.add('loaded'), 50);

        } catch (error) {
            loader.innerHTML = `<p style="color: var(--danger-color);">Failed to load journey details. Please try refreshing the page.<br><small>${error.message}</small></p>`;
        }
    }

    // --- Form Submission (CORRECTED LOGIC) ---
    async function handleClientSave(event) {
        event.preventDefault();

        if (signaturePad.isEmpty()) {
            alert("Please provide your signature to confirm the details.");
            return;
        }

        saveButton.disabled = true;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

        // This gets the signature as a base64 data URL string
        const guestSignatureDataURL = signaturePad.toDataURL("image/png");

        try {
            // THE FIX: We no longer call 'uploadSignature'.
            // We now send the base64 data URL directly to the 'updateDutySlip' action.
            const dataToUpdate = {
                DS_No: slipId,
                Guest_Signature_Link: guestSignatureDataURL, // Send the data URL directly
                Status: 'Closed by Client'
            };

            const response = await fetch('/api?action=updateDutySlip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToUpdate)
            });
            const result = await response.json();

            if (result.success) {
                const guestName = document.getElementById('guest-name').textContent;
                document.getElementById('thank-you-greeting').textContent = `Thank You, ${guestName}!`;
                dutySlipView.style.display = 'none';
                thankYouPage.classList.add('visible');
            } else {
                throw new Error(result.error || 'An unknown error occurred.');
            }
        } catch (error) {
            alert(`Error: Could not submit details. ${error.message}`);
            saveButton.disabled = false;
            saveButton.innerHTML = '<i class="fas fa-check-circle"></i> Confirm & Close Duty Slip';
        }
    }

    form.addEventListener('submit', handleClientSave);

    // Initialize the page load
    loadInitialData();

    // --- Signature Pad Window Functions ---
    window.openSignaturePad = () => {
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
        if (signaturePad.isEmpty()) {
            alert("Please provide a signature first.");
            return;
        }
        const dataURL = signaturePad.toDataURL("image/png");
        const targetImage = document.getElementById('guest-signature-link');
        const placeholder = document.getElementById('guest-sig-placeholder');
        if (targetImage) {
            targetImage.src = dataURL;
            targetImage.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';
        }
        closeSignaturePad();
    };
});

