document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('clientCloseForm');
    const saveButton = document.getElementById('save-slip-button');
    const params = new URLSearchParams(window.location.search);
    const slipId = params.get('id');

    // --- Signature Pad Setup ---
    const sigModal = document.getElementById("signature-modal");
    const sigCanvas = document.getElementById("signature-canvas");
    const signaturePad = new SignaturePad(sigCanvas);
    let currentSignatureTarget = null;
    document.getElementById('guest-signature-box')?.addEventListener('click', () => openSignaturePad('guest-signature-link'));

    async function loadInitialData() {
        if (!slipId) {
            alert('Error: No Duty Slip ID provided.');
            return;
        }
        try {
            const response = await fetch(`/api?action=getDutySlipById&id=${slipId}`);
            const data = await response.json();
            if (data.error || !data.slip) throw new Error('Slip not found.');

            // Populate the read-only fields
            document.getElementById('guest-name').value = data.slip.Guest_Name || '';
            document.getElementById('driver-name').value = data.slip.Driver_Name || '';
            document.getElementById('vehicle-no').value = data.slip.Vehicle_No || '';
        } catch (error) {
            alert(`Failed to load slip data: ${error.message}`);
        }
    }

    async function handleClientSave(event) {
        event.preventDefault();
        saveButton.disabled = true;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

        const guestSignatureImg = document.getElementById('guest-signature-link');
        let guestSignatureData = guestSignatureImg.src;

        try {
            // If there's a new signature, upload it to Drive first
            if (guestSignatureData && guestSignatureData.startsWith('data:image')) {
                const sigResponse = await fetch('/api?action=uploadSignature', {
                    method: 'POST',
                    body: JSON.stringify({ signatureData: guestSignatureData, fileName: `Guest_Sig_${slipId}.png` })
                });
                const sigResult = await sigResponse.json();
                if (!sigResult.success) throw new Error('Failed to upload signature.');
                guestSignatureData = sigResult.url; // Use the new Drive URL
            }

            // Prepare only the data the guest is allowed to update
            const dataToUpdate = {
                DS_No: slipId,
                Time_In: document.getElementById('time-in').value,
                Km_In: document.getElementById('km-in').value,
                Guest_Signature_Link: guestSignatureData
            };

            const response = await fetch('/api?action=updateDutySlip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToUpdate)
            });
            const result = await response.json();

            if (result.success) {
                alert('Thank you! Your trip details have been submitted successfully.');
                document.body.innerHTML = '<h1>Submission successful. You can now close this page.</h1>';
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            alert(`Error: Could not submit details. ${error.message}`);
            saveButton.disabled = false;
            saveButton.innerHTML = '<i class="fas fa-check"></i> Confirm & Close Duty Slip';
        }
    }

    form.addEventListener('submit', handleClientSave);
    loadInitialData();

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
});