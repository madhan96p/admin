/**
 * ====================================================================
 * Shrish Travels - Close Duty Slip (Driver Version) - V5.0
 * ====================================================================
 * This script handles the driver-facing page for closing a duty slip.
 *
 * --- KEY FEATURES ---
 * 1. Fetches and displays ALL data for the given slip ID by default.
 * 2. Makes most fields read-only to prevent accidental edits by the driver.
 * 3. Allows the driver to edit only their closing details (Time In, KM In, etc.).
 * 4. Integrates with common.js for signature pad and calculations.
 * 5. On save, it updates the slip with the driver's closing info and sets
 * the status to "Closed by Driver".
 * ====================================================================
 */
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. INITIALIZATION ---

    function initializePage() {
        const slipId = new URLSearchParams(window.location.search).get('id');

        // Stop execution if no ID is present in the URL
        if (!slipId) {
            alert('CRITICAL ERROR: No Duty Slip ID was provided in the URL.');
            document.body.innerHTML = '<h1>Error: Missing Duty Slip ID.</h1>';
            return;
        }

        loadAndDisplaySlipData(slipId);
        setupEventListeners(slipId);

        // Initialize signature pad from common.js
        if (typeof initializeSignaturePad === 'function') {
            initializeSignaturePad('signature-canvas');
        }
    }

    // --- 2. DATA LOADING AND DISPLAY ---

    /**
     * Fetches slip data from the API and calls the function to populate the form.
     * @param {string} slipId The duty slip ID.
     */
    async function loadAndDisplaySlipData(slipId) {
        try {
            const response = await fetch(`/api?action=getDutySlipById&id=${slipId}`);
            const data = await response.json();

            if (data.error || !data.slip) {
                throw new Error(data.error || 'The requested duty slip could not be found.');
            }

            // Call the function to fill the form with the fetched data
            populateFormWithAllData(data.slip);

        } catch (error) {
            console.error('Failed to load duty slip:', error);
            alert(`Error: ${error.message}`);
            document.body.innerHTML = `<h1>Error loading slip data.</h1><p>${error.message}</p>`;
        }
    }

    /**
     * Populates the entire form with data from the fetched slip object.
     * This function iterates through all keys and fills corresponding fields.
     * @param {object} slip The slip data object from the API.
     */
    function populateFormWithAllData(slip) {
        // Loop through every piece of data in the slip object
        for (const key in slip) {
            // Convert API key (e.g., Guest_Name) to HTML ID (e.g., guest-name)
            const inputId = key.toLowerCase().replace(/_/g, '-');
            const element = document.getElementById(inputId);

            if (element) {
                // Handle IMG tags for signatures
                if (element.tagName === 'IMG') {
                    const signatureData = slip[key];
                    // Check if the signature data is a valid base64 string
                    if (signatureData && signatureData.startsWith('data:image')) {
                        element.src = signatureData;
                        element.style.display = 'block';
                        // Hide the placeholder text (e.g., "Click to Sign")
                        const placeholder = document.getElementById(inputId.replace('-link', '-sig-placeholder'));
                        if (placeholder) placeholder.style.display = 'none';
                    }
                } else {
                    // For all other elements (INPUT, TEXTAREA), set their value
                    element.value = slip[key] || '';
                }
            }
        }

        // After populating, run calculations to show existing totals
        if (typeof calculateTotals === 'function') {
            calculateTotals();
        }
    }


    // --- 3. EVENT LISTENERS AND INTERACTIVITY ---

    /**
     * Sets up event listeners for the page's interactive elements.
     * @param {string} slipId The current duty slip ID.
     */
    function setupEventListeners(slipId) {
        // Attach the save function to the main button
        document.getElementById('save-slip-button')?.addEventListener('click', (event) => {
            handleDriverClose(event, slipId);
        });

        // Add listeners to input fields that should trigger real-time calculations
        const inputsToWatch = ['driver-time-in', 'driver-km-in', 'time-in', 'km-in'];
        inputsToWatch.forEach(id => {
            const element = document.getElementById(id);
            if (element && typeof calculateTotals === 'function') {
                element.addEventListener('input', calculateTotals);
            }
        });

        // Enable the signature pad functionality from common.js
        document.getElementById('guest-signature-box')?.addEventListener('click', () => {
            if (typeof openSignaturePad === 'function') {
                openSignaturePad('guest-signature-link');
            }
        });
    }


    // --- 4. FORM SUBMISSION LOGIC ---

    /**
     * Gathers ONLY the fields a driver is allowed to edit.
     * This prevents accidental overwriting of other important data.
     * @param {string} slipId The duty slip ID.
     * @returns {object} A data object ready to be sent to the API.
     */
    function getDriverUpdateData(slipId) {
        const guestSigImg = document.getElementById('guest-signature-link');
        const guestSignatureData = (guestSigImg && guestSigImg.src.startsWith('data:image')) ? guestSigImg.src : '';

        return {
            DS_No: slipId,
            Driver_Time_In: document.getElementById('driver-time-in').value,
            Driver_Km_In: document.getElementById('driver-km-in').value,
            Time_In: document.getElementById('time-in').value,
            Km_In: document.getElementById('km-in').value,
            Driver_Total_Hrs: document.getElementById('driver-total-hrs').value,
            Driver_Total_Kms: document.getElementById('driver-total-kms').value,
            Guest_Signature_Link: guestSignatureData,
            Status: 'Closed by Driver' // This is the most important status update
        };
    }

    /**
     * Handles the final save action for the driver.
     * @param {Event} event The button click event.
     * @param {string} slipId The duty slip ID.
     */
    async function handleDriverClose(event, slipId) {
        event.preventDefault();
        const button = event.currentTarget;
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

        const dataToUpdate = getDriverUpdateData(slipId);

        try {
            const response = await fetch('/api?action=updateDutySlip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToUpdate)
            });
            const result = await response.json();

            if (result.success) {
                alert('Trip details submitted successfully!');
                // Replace the page content with a success message
                document.body.innerHTML = '<h1 style="text-align: center; padding: 40px; font-family: sans-serif; color: #28a745;">Submission Successful!</h1><p style="text-align: center; font-family: sans-serif;">You can now close this page.</p>';
            } else {
                throw new Error(result.error || 'An unknown error occurred during the update.');
            }
        } catch (error) {
            console.error("Update failed:", error);
            alert(`Error: Could not submit the slip. ${error.message}`);
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-save"></i> Submit Closing Details';
        }
    }

    // --- 5. RUN INITIALIZATION ---
    initializePage();
});
