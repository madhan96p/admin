/**
 * ====================================================================
 * Shrish Travels - Common Duty Slip Logic (V1.0)
 * ====================================================================
 * This file contains all the shared data and functions used across
 * create-slip.js, edit-slip.js, and close-slip.js.
 *
 * It centralizes:
 * - Configuration (Driver Data)
 * - Signature Pad Management
 * - Calculation Logic (Totals for Hours & KMs)
 * - Input Validation (Mobile numbers, logical checks)
 * - Sharing functionality (WhatsApp, Link Generation)
 * ====================================================================
 */

// --- 1. CENTRALIZED CONFIGURATION & DATA ---

const driverData = {
    "AjithKumar": { mobile: "9047382896", signatureUrl: "https://admin.shrishgroup.com/assets/images/signs/Ajithkumar.jpg" },
    "Raja": { mobile: "8838750975", signatureUrl: "https://admin.shrishgroup.com/assets/images/signs/Raja.jpg" },
    "Jeganraj": { mobile: "8883451668", signatureUrl: "https://admin.shrishgroup.com/assets/images/signs/jeganraj.jpg" },
};

// --- 2. SIGNATURE PAD MANAGEMENT ---

let signaturePad;
let currentSignatureTarget;

/**
 * Initializes the global signature pad.
 * @param {string} canvasId - The ID of the canvas element.
 */
function initializeSignaturePad(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (canvas) {
        signaturePad = new SignaturePad(canvas, { backgroundColor: 'rgb(255, 255, 255)' });
    }
}

/**
 * Opens the signature modal and prepares the canvas.
 * @param {string} targetImageId - The ID of the <img> element to update upon saving.
 */
function openSignaturePad(targetImageId) {
    currentSignatureTarget = document.getElementById(targetImageId);
    const sigModal = document.getElementById("signature-modal");
    const sigCanvas = document.getElementById("signature-canvas");

    if (sigModal && sigCanvas && signaturePad) {
        sigModal.style.display = "flex";
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        sigCanvas.width = sigCanvas.offsetWidth * ratio;
        sigCanvas.height = sigCanvas.offsetHeight * ratio;
        sigCanvas.getContext("2d").scale(ratio, ratio);
        signaturePad.clear();
    }
}

/**
 * Closes the signature modal.
 */
function closeSignaturePad() {
    const sigModal = document.getElementById("signature-modal");
    if (sigModal) sigModal.style.display = "none";
}

/**
 * Clears the signature pad canvas.
 */
function clearSignature() {
    if (signaturePad) signaturePad.clear();
}

/**
 * Saves the signature from the canvas to the target image element.
 */
function saveSignature() {
    if (signaturePad && signaturePad.isEmpty()) {
        alert("Please provide a signature first.");
        return;
    }
    const dataURL = signaturePad.toDataURL("image/png");
    if (currentSignatureTarget) {
        currentSignatureTarget.src = dataURL;
        currentSignatureTarget.style.display = 'block';
        // Hide the "Tap to sign" placeholder text
        if (currentSignatureTarget.previousElementSibling) {
            currentSignatureTarget.previousElementSibling.style.display = 'none';
        }
    }
    closeSignaturePad();
}


// --- 3. CALCULATION & VALIDATION LOGIC ---

/**
 * Calculates total hours and kilometers based on driver inputs.
 * Uses the improved "hrs mins" format.
 */
function calculateTotals() {
    // Calculate Total Hours
    const timeOutVal = document.getElementById('driver-time-out').value;
    const timeInVal = document.getElementById('driver-time-in').value;
    if (timeOutVal && timeInVal) {
        const timeOut = new Date(`1970-01-01T${timeOutVal}`);
        let timeIn = new Date(`1970-01-01T${timeInVal}`);
        if (timeIn < timeOut) { // Handle overnight trips
            timeIn.setDate(timeIn.getDate() + 1);
        }
        const diffMs = timeIn - timeOut;
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffMins = Math.round((diffMs % 3600000) / 60000);
        document.getElementById('driver-total-hrs').value = `${diffHrs} hrs ${diffMins} mins`;
    } else {
        document.getElementById('driver-total-hrs').value = '';
    }

    // Calculate Total Kilometers
    const kmOut = parseFloat(document.getElementById('driver-km-out').value) || 0;
    const kmIn = parseFloat(document.getElementById('driver-km-in').value) || 0;
    if (kmIn > kmOut) {
        const totalKms = (kmIn - kmOut).toFixed(1);
        document.getElementById('driver-total-kms').value = `${totalKms} Kms`;
    } else {
        document.getElementById('driver-total-kms').value = '';
    }
}

/**
 * Reusable function to validate a 10-digit mobile number input.
 * @param {string} inputId - The ID of the mobile number input field.
 */
function validateMobileInput(inputId) {
    const mobileInput = document.getElementById(inputId);
    const errorId = inputId + '-error';
    let errorElement = document.getElementById(errorId);

    // Create error message element if it doesn't exist
    if (!errorElement) {
        errorElement = document.createElement('span');
        errorElement.id = errorId;
        errorElement.className = 'input-validation-error';
        errorElement.style.display = 'none';
        mobileInput.parentNode.appendChild(errorElement);
    }

    mobileInput.addEventListener('input', function () {
        this.value = this.value.replace(/[^0-9]/g, '').substring(0, 10);
        if (this.value.length > 0 && this.value.length !== 10) {
            this.classList.add('input-error');
            errorElement.textContent = 'Must be exactly 10 digits.';
            errorElement.style.display = 'inline';
        } else {
            this.classList.remove('input-error');
            errorElement.style.display = 'none';
        }
    });
}

/**
 * Performs a comprehensive logical validation across all date, time, and KM fields.
 * Returns true if the form is valid, false otherwise.
 */
function validateAllInputs() {
    let isValid = true;
    const errorMessages = [];

    const fields = {
        headerDate: document.getElementById('date'),
        dateOut: document.getElementById('date-out'),
        dateIn: document.getElementById('date-in'),
        driverTimeOut: document.getElementById('driver-time-out'),
        driverTimeIn: document.getElementById('driver-time-in'),
        driverKmOut: document.getElementById('driver-km-out'),
        driverKmIn: document.getElementById('driver-km-in'),
        customerTimeOut: document.getElementById('time-out'),
        customerTimeIn: document.getElementById('time-in'),
        customerKmOut: document.getElementById('km-out'),
        customerKmIn: document.getElementById('km-in')
    };

    const clearError = (el) => el.classList.remove('input-error');
    const setError = (el, message) => {
        el.classList.add('input-error');
        isValid = false;
        if (!errorMessages.includes(message)) {
            errorMessages.push(message);
        }
    };
    
    Object.values(fields).forEach(clearError);

    const createDateTime = (dateEl, timeEl) => {
        const dateVal = dateEl.value;
        const timeVal = timeEl.value;
        return (dateVal && timeVal) ? new Date(`${dateVal}T${timeVal}`) : null;
    };

    const driverStartDateTime = createDateTime(fields.dateOut, fields.driverTimeOut);
    const driverEndDateTime = createDateTime(fields.dateIn, fields.driverTimeIn);
    const customerStartDateTime = createDateTime(fields.dateOut, fields.customerTimeOut);
    const customerEndDateTime = createDateTime(fields.dateIn, fields.customerTimeIn);

    const drKmOut = parseFloat(fields.driverKmOut.value) || 0;
    const drKmIn = parseFloat(fields.driverKmIn.value) || 0;
    const custKmOut = parseFloat(fields.customerKmOut.value) || 0;
    const custKmIn = parseFloat(fields.customerKmIn.value) || 0;

    // RULE B: Chronology
    if (driverEndDateTime && driverStartDateTime && driverEndDateTime < driverStartDateTime) {
        setError(fields.driverTimeIn, "Driver's end time cannot be before start time.");
        setError(fields.dateIn, "Driver's end time cannot be before start time.");
    }
    // RULE C: Kilometer Logic
    if (drKmIn > 0 && drKmIn < drKmOut) {
        setError(fields.driverKmIn, "Driver's Closing KM cannot be less than Opening KM.");
    }
    if (custKmIn > 0 && custKmIn < custKmOut) {
        setError(fields.customerKmIn, "Customer's Closing KM cannot be less than Opening KM.");
    }
    // RULE D: Trip Sequence Logic
    if (customerStartDateTime && driverStartDateTime && customerStartDateTime < driverStartDateTime) {
        setError(fields.customerTimeOut, "Customer trip cannot start before driver's duty.");
    }
    if (driverEndDateTime && customerEndDateTime && driverEndDateTime < customerEndDateTime) {
        setError(fields.driverTimeIn, "Driver's duty cannot end before the customer's trip.");
    }
    if (custKmOut > 0 && custKmOut < drKmOut) {
        setError(fields.customerKmOut, "Customer Opening KM cannot be less than Driver Opening KM.");
    }
    if (drKmIn > 0 && drKmIn < custKmIn) {
        setError(fields.driverKmIn, "Driver Closing KM cannot be less than Customer Closing KM.");
    }
    
    // Update UI with error messages
    const errorContainer = document.getElementById('validation-errors');
    if (errorContainer) {
        if (!isValid) {
            errorContainer.innerHTML = errorMessages.map(msg => `<li>${msg}</li>`).join('');
            errorContainer.style.display = 'block';
        } else {
            errorContainer.style.display = 'none';
        }
    }

    return isValid;
}


// --- 4. SHARING & UTILITY FUNCTIONS ---

/**
 * Handles auto-filling driver mobile and signature when a name is selected.
 */
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

/**
 * Handles the multi-option WhatsApp sharing logic.
 */
function handleWhatsAppShare() {
    const shareOption = prompt("Who do you want to share this with?\n\n1. Share with DRIVER (to close slip)\n2. Share Info with GUEST\n3. Ask GUEST to close slip\n\nEnter 1, 2, or 3");

    const getValue = (id) => document.getElementById(id)?.value || 'Not specified';
    const dsNo = getValue('ds-no');
    const contactLink = "shrishgroup.com/contact.html";

    switch (shareOption) {
        case '1': // Share with DRIVER
            const driverMobile = getValue('driver-mobile').replace(/\D/g, '');
            if (!driverMobile) return alert('Please select a driver first.');
            const driverLink = `${window.location.origin}/close-slip.html?id=${dsNo}`;
            const driverMessage = `*New Duty Slip: #${dsNo}*\n\nDear ${getValue('driver-name')},\nPlease find the details for your next duty:\n\nGuest: ${getValue('guest-name')}\nReporting Time: ${getValue('rep-time')}\nAddress: ${getValue('reporting-address')}\nRouting: ${getValue('routing')}\n\nPlease use the link below to enter closing KM and time at the end of the trip.\nClosing Link: ${driverLink}\n\n- Shrish Travels\n${contactLink}`.trim();
            window.open(`https://wa.me/91${driverMobile}?text=${encodeURIComponent(driverMessage)}`, '_blank');
            break;

        case '2': // Share Info with GUEST
            const guestMobileInfo = getValue('guest-mobile').replace(/\D/g, '');
            if (!guestMobileInfo) return alert('Please enter a guest mobile number.');
            const guestInfoMessage = `Dear ${getValue('guest-name')},\n\nThank you for choosing Shrish Travels. Your ride for Duty Slip #${dsNo} has been confirmed.\n\n*Your Driver Details:*\nDriver: ${getValue('driver-name')}\nContact: ${getValue('driver-mobile')}\nVehicle: ${getValue('vehicle-type')} (${getValue('vehicle-no')})\n\nWe wish you a pleasant and safe journey. For any questions, please visit our contact page.\n- Shrish Travels\n${contactLink}`.trim();
            window.open(`https://wa.me/91${guestMobileInfo}?text=${encodeURIComponent(guestInfoMessage)}`, '_blank');
            break;

        case '3': // Ask GUEST to close slip
            const guestMobileClose = getValue('guest-mobile').replace(/\D/g, '');
            if (!guestMobileClose) return alert('Please enter a guest mobile number.');
            const guestLink = `${window.location.origin}/client-close.html?id=${dsNo}`;
            const guestCloseMessage = `Dear ${getValue('guest-name')},\n\nThank you for travelling with us. To ensure accuracy, please take a moment to confirm your trip details by filling out the closing time and signing via the secure link below.\n\nConfirm Your Trip: ${guestLink}\n\nYour feedback is valuable to us.\n- Shrish Travels\n${contactLink}`.trim();
            window.open(`https://wa.me/91${guestMobileClose}?text=${encodeURIComponent(guestCloseMessage)}`, '_blank');
            break;
    }
}

/**
 * Generates and copies a shareable view link for the current slip.
 */
function handleGenerateLink() {
    const dsNo = document.getElementById('ds-no').value;
    if (!dsNo) {
        alert('Please save the slip first to generate a link.');
        return;
    }
    const link = `${window.location.origin}/view.html?id=${dsNo}`;
    navigator.clipboard.writeText(link).then(() => alert('Shareable view link copied to clipboard!'));
}
