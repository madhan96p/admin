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
                if(value) {
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
            // Adding a small delay to prevent aggressive refetching if server is slow
            await new Promise(resolve => setTimeout(resolve, 500));

            const response = await fetch(`/api?action=getDutySlipById&id=${slipId}`);
            if (!response.ok) {
                 throw new Error(`Server responded with status: ${response.status}`);
            }
            const data = await response.json();
            
            if (data.error || !data.slip) {
                throw new Error(data.error || 'Slip data not found.');
            }

            const { slip } = data;

            // Populate Header
            populateField('ds-id', `Duty Slip #${slip.DS_No || slipId}`);
            populateField('ds-date', `Date: ${slip.Trip_Date || new Date().toLocaleDateString('en-CA')}`);

            // Populate Guest Details
            populateField('guest-name', slip.Guest_Name);
            populateField('guest-number', slip.Guest_Number);
            populateField('reporting-address', slip.Reporting_Address);
            populateField('reporting-time', slip.Reporting_Time);

            // Populate Driver & Vehicle Details
            populateField('driver-name', slip.Driver_Name);
            populateField('driver-number', slip.Driver_Number);
            populateField('vehicle-type', slip.Vehicle_Type);
            populateField('vehicle-no', slip.Vehicle_No);
            
            // Populate Journey Summary
            populateField('km-out', slip.Km_Out);
            populateField('km-in', slip.Km_In);
            populateField('total-kms', slip.Total_Kms);
            populateField('total-hrs', slip.Total_Hrs);

            // Populate Signatures
            populateField('auth-signature-link', slip.Auth_Signature_Link);
            
            // Show the content
            loader.style.display = 'none';
            mainContent.style.display = 'block';
            setTimeout(() => mainContent.classList.add('loaded'), 50);

        } catch (error) {
            loader.innerHTML = `<p style="color: var(--danger-color);">Failed to load journey details. Please try refreshing the page.<br><small>${error.message}</small></p>`;
        }
    }

    // --- Form Submission ---
    async function handleClientSave(event) {
        event.preventDefault();

        if (signaturePad.isEmpty()) {
            alert("Please provide your signature to confirm the details.");
            return;
        }

        saveButton.disabled = true;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        
        const guestSignatureData = signaturePad.toDataURL("image/png");

        try {
            // 1. Upload the new signature to Drive
            const sigResponse = await fetch('/api?action=uploadSignature', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    signatureData: guestSignatureData, 
                    fileName: `Guest_Sig_${slipId}.png` 
                })
            });
            const sigResult = await sigResponse.json();
            if (!sigResult.success || !sigResult.url) {
                throw new Error('Failed to upload signature.');
            }
            
            // 2. Prepare data and update the duty slip in Google Sheet
            const dataToUpdate = {
                DS_No: slipId,
                Guest_Signature_Link: sigResult.url,
                Status: 'Closed by Client'
            };

            const response = await fetch('/api?action=updateDutySlip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToUpdate)
            });
            const result = await response.json();

            if (result.success) {
                // Show Thank You Page
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
