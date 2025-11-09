document.addEventListener('DOMContentLoaded', () => {

    // --- 1. DOM ELEMENT CACHE ---
    const elements = {
        bookingIdInput: document.getElementById('bookingIdInput'),
        loadTripButton: document.getElementById('loadTripButton'),
        manualEntryButton: document.getElementById('manualEntryButton'),
        loader: document.getElementById('loader'),
        tripSummary: document.getElementById('tripSummary'),

        manualEntryFields: document.getElementById('manualEntryFields'),
        manualGuestName: document.getElementById('manualGuestName'),
        manualGuestMobile: document.getElementById('manualGuestMobile'),
        manualVehicleType: document.getElementById('manualVehicleType'),
        manualVehicleNo: document.getElementById('manualVehicleNo'),
        manualStartDate: document.getElementById('manualStartDate'),
        manualEndDate: document.getElementById('manualEndDate'),

        calcTotalHours: document.getElementById('calcTotalHours'),
        calcTotalKms: document.getElementById('calcTotalKms'),
        calcBillingSlabs: document.getElementById('calcBillingSlabs'),
        upiId: document.getElementById('upiId'),

        timeOutContext: document.getElementById('time-out-context'),
        timeInContext: document.getElementById('time-in-context'),
        totalHrsContext: document.getElementById('total-hrs-context'),

        // Rate fields
        baseRate: document.getElementById('baseRate'),
        includedKms: document.getElementById('includedKms'),
        extraKmRate: document.getElementById('extraKmRate'),
        battaRate: document.getElementById('battaRate'),
        tolls: document.getElementById('tolls'),
        permits: document.getElementById('permits'),

        // Rate Context Spans
        baseRateSlabs: document.getElementById('baseRateSlabs'),
        baseRateValue: document.getElementById('baseRateValue'),
        baseRateTotal: document.getElementById('baseRateTotal'),
        includedKmsSlabs: document.getElementById('includedKmsSlabs'),
        includedKmsValue: document.getElementById('includedKmsValue'),
        includedKmsTotal: document.getElementById('includedKmsTotal'),
        extraKmCalcResult: document.getElementById('extraKmCalcResult'), // Renamed from extraKmResult for clarity
        extraKmRateValue: document.getElementById('extraKmRateValue'),
        extraKmCostTotal: document.getElementById('extraKmCostTotal'),
        battaRateSlabs: document.getElementById('battaRateSlabs'),
        battaRateValue: document.getElementById('battaRateValue'),
        battaRateTotal: document.getElementById('battaRateTotal'),

        // Running Total Display
        runningTotalDisplay: document.getElementById('runningTotalDisplay'),
        runningGrandTotal: document.getElementById('runningGrandTotal'),

        // Step 4 fields
        finalInvoiceSummary: document.getElementById('finalInvoiceSummary'),
        generatedLinkContainer: document.getElementById('generatedLinkContainer'),
        generatedLink: document.getElementById('generatedLink'),
        copyLinkButton: document.getElementById('copyLinkButton'),
        saveLoader: document.getElementById('save-loader'),

        // Stepper UI
        steps: document.querySelectorAll('.step'),
        stepContents: document.querySelectorAll('.step-content'),
        prevStepBtn: document.getElementById('prevStepBtn'),
        nextStepBtn: document.getElementById('nextStepBtn'),
        saveInvoiceBtn: document.getElementById('saveInvoiceBtn'),
    };

    // --- 2. STATE MANAGEMENT ---
    let currentTripData = null; // Holds data loaded from API
    let isManualFlow = false;   // Flag for manual entry mode
    let currentStep = 1;        // Tracks the current wizard step
    let currentCalculations = {}; // Holds final calculated values for saving

    // --- 3. STEPPER/NAVIGATION LOGIC ---
    function goToStep(stepNumber) {
        currentStep = stepNumber;
        // Show/hide step content
        elements.stepContents.forEach(content => {
            content.classList.toggle('active', parseInt(content.dataset.stepContent) === stepNumber);
        });
        // Update stepper indicators (active/done)
        elements.steps.forEach(step => {
            const stepNum = parseInt(step.dataset.step);
            step.classList.toggle('active', stepNum === stepNumber);
            step.classList.toggle('done', stepNum < stepNumber);
        });

        // Update context hints or final summary when entering relevant steps
        if (stepNumber === 3) { updateRateContext(); }
        if (stepNumber === 4) { calculateAndShowSummary(); }

        // Show/hide navigation buttons
        elements.prevStepBtn.style.display = (stepNumber > 1) ? 'inline-flex' : 'none';
        // Show Next only if not on step 1 or 4
        elements.nextStepBtn.style.display = (stepNumber > 1 && stepNumber < 4) ? 'inline-flex' : 'none';
        elements.saveInvoiceBtn.style.display = (stepNumber === 4) ? 'inline-flex' : 'none';

        // Ensure Next is hidden on step 1 initially
        if (stepNumber === 1) { elements.nextStepBtn.style.display = 'none'; }
    }

    // Event listeners for Next/Previous buttons
    elements.nextStepBtn.addEventListener('click', () => { if (currentStep < 4) goToStep(currentStep + 1); });
    elements.prevStepBtn.addEventListener('click', () => { if (currentStep > 1) goToStep(currentStep - 1); });

    // --- 4. CORE DATA LOGIC & CALCULATIONS ---

    /**
     * Parses a time string like "20 hrs 45 mins" or "8.83 hrs" into decimal hours.
     */
    function parseHoursFromString(timeString) {
        if (!timeString) return 0;
        let totalHours = 0;
        const hrsMatch = timeString.match(/(\d+(\.\d+)?) hrs/);
        const minsMatch = timeString.match(/(\d+) mins/);
        if (hrsMatch) { totalHours += parseFloat(hrsMatch[1]); }
        if (minsMatch) { totalHours += parseFloat(minsMatch[1]) / 60; }
        // Fallback for simple decimal strings
        if (totalHours === 0 && !hrsMatch && !minsMatch) {
             const fallbackParse = parseFloat(timeString);
             if (!isNaN(fallbackParse)) return fallbackParse;
        }
        return totalHours;
    }

    /**
     * Updates the Billing Slabs input based on the Total Hours input.
     * Also triggers the update of Step 3 context hints.
     */
    function updateBillingSlabs() {
        const totalHours = parseFloat(elements.calcTotalHours.value) || 0;
        const billingSlabs = totalHours > 0 ? Math.ceil(totalHours / 12) : 0;
        elements.calcBillingSlabs.value = billingSlabs;
        updateRateContext(); // Update Step 3 hints whenever slabs change
    }

    /**
     * Updates the calculation context hints under the labels in Step 3
     * and calculates/displays the running Grand Total.
     */
    function updateRateContext() {
        // Read current values from inputs
        const billingSlabs = parseInt(elements.calcBillingSlabs.value) || 0;
        const totalKms = parseFloat(elements.calcTotalKms.value) || 0;
        const baseRate = parseFloat(elements.baseRate.value) || 0;
        const includedKms = parseFloat(elements.includedKms.value) || 0;
        const extraKmRate = parseFloat(elements.extraKmRate.value) || 0;
        const battaRate = parseFloat(elements.battaRate.value) || 0;
        const tolls = parseFloat(elements.tolls.value) || 0;
        const permits = parseFloat(elements.permits.value) || 0;

        // --- Update Context Spans ---
        // Base Rate
        elements.baseRateSlabs.textContent = billingSlabs;
        elements.baseRateValue.textContent = baseRate.toFixed(2);
        const baseRateTotal = billingSlabs * baseRate;
        elements.baseRateTotal.textContent = baseRateTotal.toFixed(2);

        // Included KMs
        const totalIncludedKms = billingSlabs * includedKms;
        elements.includedKmsSlabs.textContent = billingSlabs;
        elements.includedKmsValue.textContent = includedKms;
        elements.includedKmsTotal.textContent = totalIncludedKms.toFixed(1);

        // Extra KM Rate (Cost Calculation)
        const extraKms = totalKms > totalIncludedKms ? (totalKms - totalIncludedKms) : 0;
        const extraKmCost = extraKms * extraKmRate;
        elements.extraKmCalcResult.textContent = extraKms.toFixed(1);
        elements.extraKmRateValue.textContent = extraKmRate.toFixed(2);
        elements.extraKmCostTotal.textContent = extraKmCost.toFixed(2);

        // Batta Rate
        elements.battaRateSlabs.textContent = billingSlabs;
        elements.battaRateValue.textContent = battaRate.toFixed(2);
        const battaRateTotal = billingSlabs * battaRate;
        elements.battaRateTotal.textContent = battaRateTotal.toFixed(2);

        // --- Calculate and Display Running Grand Total ---
        const totalExpenses = tolls + permits;
        const grandTotal = baseRateTotal + extraKmCost + battaRateTotal + totalExpenses;
        elements.runningGrandTotal.textContent = `₹ ${grandTotal.toFixed(2)}`;
        elements.runningTotalDisplay.style.display = 'block'; // Make sure it's visible
    }

    /**
     * Clears all potentially pre-filled or calculated fields in Step 2.
     */
    function clearStep2Inputs() {
        elements.calcTotalHours.value = '';
        elements.calcTotalKms.value = '';
        elements.calcBillingSlabs.value = '';
        elements.manualGuestName.value = '';
        elements.manualGuestMobile.value = '';
        elements.manualVehicleType.value = '';
        elements.manualVehicleNo.value = '';
        elements.manualStartDate.value = '';
        elements.manualEndDate.value = '';
        elements.timeOutContext.textContent = '--';
        elements.timeInContext.textContent = '--';
        elements.totalHrsContext.textContent = '--';
        // Also reset Step 3 context and running total
        updateRateContext();
        elements.runningTotalDisplay.style.display = 'none'; // Hide total initially
    }

    /**
     * Fetches trip data from API based on Booking ID.
     */
    async function handleLoadTrip() {
        const bookingId = elements.bookingIdInput.value.trim();
        if (!bookingId) return alert('Please enter a Booking ID (DS_No) to load.');

        isManualFlow = false; // Set mode to auto-load
        elements.loader.style.display = 'block';
        elements.loadTripButton.disabled = true;
        elements.manualEntryButton.disabled = true;
        currentTripData = null; // Clear previous data

        try {
            const response = await fetch(`/.netlify/functions/api?action=getDutySlipById&id=${bookingId}`);
            if (!response.ok) throw new Error(`Network response error (Status: ${response.status})`);
            const data = await response.json();
            if (data.error || !data.slip) throw new Error(data.error || 'Trip data not found.');

            currentTripData = data.slip; // Store loaded data

            // Populate Step 2 fields
            displayTripSummary(currentTripData);
            calculateAndDisplayTotals(currentTripData);
            elements.tripSummary.style.display = 'block'; // Show summary box
            elements.manualEntryFields.style.display = 'none'; // Hide manual fields

            goToStep(2); // Proceed to Step 2

        } catch (error) {
            alert(`Error loading trip data: ${error.message}`);
        } finally {
            elements.loader.style.display = 'none';
            elements.loadTripButton.disabled = false;
            elements.manualEntryButton.disabled = false;
        }
    }

    /**
     * Sets up the form for manual data entry.
     */
    function handleManualEntry() {
        // const bookingId = elements.bookingIdInput.value.trim();
        // if (!bookingId) return alert('Please enter a unique Booking ID (e.g., "MANUAL-101") first.');
        // ^^^ REMOVED THIS VALIDATION BLOCK

        isManualFlow = true; // Set mode to manual
        currentTripData = null; // No loaded data

        if (!elements.bookingIdInput.value.trim()) {
            const timestamp = Date.now().toString().slice(-6); 
            elements.bookingIdInput.value = `MANUAL-${timestamp}`;
        }

        // Configure Step 2 for manual input
        elements.tripSummary.style.display = 'none'; // Hide summary box
        elements.manualEntryFields.style.display = 'block'; // Show manual fields
        clearStep2Inputs(); // Clear any previous auto-filled data

        goToStep(2); // Proceed to Step 2
    }

    /**
     * Populates the trip summary box in Step 2 (for auto-load flow).
     */
    function displayTripSummary(slip) {
        elements.tripSummary.innerHTML = `
            <h4>Trip Details for DS #${slip.DS_No}</h4>
            <p><strong>Guest:</strong> ${slip.Guest_Name || 'N/A'} (${slip.Guest_Mobile || 'N/A'})</p>
            <p><strong>Driver:</strong> ${slip.Driver_Name || 'N/A'} (${slip.Vehicle_No || 'N/A'})</p>
            <p><strong>Date:</strong> ${slip.Date || 'N/A'}</p>
        `;
    }

    /**
     * Calculates totals from loaded trip data and populates Step 2 inputs/context.
     */
    function calculateAndDisplayTotals(slip) {
        let totalHours = parseHoursFromString(slip.Driver_Total_Hrs);
        const startKm = parseFloat(slip.Driver_Km_Out) || 0;
        const endKm = parseFloat(slip.Driver_Km_In) || 0;
        const totalKms = endKm > startKm ? (endKm - startKm) : 0;

        // Populate editable fields
        elements.calcTotalHours.value = totalHours.toFixed(2);
        elements.calcTotalKms.value = totalKms.toFixed(1);

        // Populate context under Total Hours label
        elements.timeOutContext.textContent = slip.Driver_Time_Out || '--';
        elements.timeInContext.textContent = slip.Driver_Time_In || '--';
        elements.totalHrsContext.textContent = slip.Driver_Total_Hrs || '0 hrs';

        updateBillingSlabs(); // Auto-calculate slabs and update Step 3 context
    }

    /**
     * Calculates the final summary based on current form values for Step 4 display.
     * Stores these calculations in `currentCalculations`.
     */
    function calculateAndShowSummary() {
        // Read all potentially edited values from Steps 2 & 3
        const rates = {
            baseRate: parseFloat(elements.baseRate.value || 0),
            includedKms: parseFloat(elements.includedKms.value || 0),
            extraKmRate: parseFloat(elements.extraKmRate.value || 0),
            battaRate: parseFloat(elements.battaRate.value || 0),
            tolls: parseFloat(elements.tolls.value || 0),
            permits: parseFloat(elements.permits.value || 0),
        };
        const totalHours = parseFloat(elements.calcTotalHours.value) || 0;
        const totalKms = parseFloat(elements.calcTotalKms.value) || 0;
        const billingSlabs = parseInt(elements.calcBillingSlabs.value) || 0;

        // Perform final calculations
        const totalIncludedKms = billingSlabs * rates.includedKms;
        const extraKms = totalKms > totalIncludedKms ? (totalKms - totalIncludedKms) : 0;
        const packageCost = billingSlabs * rates.baseRate;
        const extraKmCost = extraKms * rates.extraKmRate;
        const battaCost = billingSlabs * rates.battaRate;
        const totalExpenses = rates.tolls + rates.permits;
        const grandTotal = packageCost + extraKmCost + battaCost + totalExpenses;

        // Store these final values for use in handleSaveInvoice
        currentCalculations = {
            totalHours, totalKms, billingSlabs, extraKms,
            packageCost, extraKmCost, battaCost, totalExpenses, grandTotal,
            rates // Include the rates object itself
        };

        // Generate and display the HTML summary in Step 4
        const summaryHtml = `
            <h4 class="section-divider">Final Invoice Summary</h4>
            <div class="summary-grid">
                <div class="summary-item">
                    <span>Package Cost (${billingSlabs} Slabs @ ₹${rates.baseRate.toFixed(2)})</span>
                    <strong>₹${packageCost.toFixed(2)}</strong>
                </div>
                <div class="summary-item">
                    <span>Extra KMs (${extraKms.toFixed(1)} KMs @ ₹${rates.extraKmRate.toFixed(2)})</span>
                    <strong>₹${extraKmCost.toFixed(2)}</strong>
                </div>
                <div class="summary-item">
                    <span>Driver Batta (${billingSlabs} Slabs @ ₹${rates.battaRate.toFixed(2)})</span>
                    <strong>₹${battaCost.toFixed(2)}</strong>
                </div>
                <div class="summary-item">
                    <span>Tolls & Permits</span>
                    <strong>₹${totalExpenses.toFixed(2)}</strong>
                </div>
                <div class="summary-item total">
                    <span>Grand Total</span>
                    <strong>₹${grandTotal.toFixed(2)}</strong>
                </div>
            </div>
        `;
        elements.finalInvoiceSummary.innerHTML = summaryHtml;
    }

    /**
     * Generates the simple shareable link (view-invoice.html?id=...).
     */
    function generateShareableLink(bookingId) {
        const baseUrl = `${window.location.origin}/view-invoice.html`;
        return `${baseUrl}?id=${bookingId}`;
    }

    /**
     * Saves the final invoice data (using `currentCalculations`) to the Google Sheet via API.
     */
    async function handleSaveInvoice() {
        elements.saveLoader.style.display = 'block';
        elements.saveInvoiceBtn.disabled = true;

        const bookingId = elements.bookingIdInput.value.trim();
        if (!bookingId) {
            alert('Error: Booking ID is missing. Please go back to Step 1.');
            elements.saveLoader.style.display = 'none';
            elements.saveInvoiceBtn.disabled = false;
            return;
        }

        // Ensure calculations are up-to-date before saving
        calculateAndShowSummary();
        const {
            totalHours, totalKms, billingSlabs, extraKms,
            packageCost, extraKmCost, battaCost, totalExpenses, grandTotal,
            rates // Get rates from the stored calculations
        } = currentCalculations;

        // Basic validation
        if (!rates || grandTotal === undefined) {
            alert('Error: Calculation data is missing. Please review Steps 2 & 3.');
            elements.saveLoader.style.display = 'none';
            elements.saveInvoiceBtn.disabled = false;
            return;
        }

        const shareableLink = generateShareableLink(bookingId);

        // Prepare the data payload for the API
        let invoiceData = {
            Invoice_ID: `ST-${bookingId}`,
            Booking_ID: bookingId,
            Invoice_Date: new Date().toLocaleDateString('en-GB'), 
            Last_Updated: new Date().toLocaleString('en-GB', { hour12: false }), // e.g., "03/11/2025, 01:28:15"
            Invoice_Note: document.getElementById('invoiceNote').value.trim(), // Get the new note
            Total_KMs: totalKms.toFixed(1),
            Total_Hours: totalHours.toFixed(2),
            Billing_Slabs: billingSlabs,
            Base_Rate: rates.baseRate,
            Included_KMs_per_Slab: rates.includedKms,
            Extra_KM_Rate: rates.extraKmRate,
            Calculated_Extra_KMs: extraKms.toFixed(1),
            Batta_Rate: rates.battaRate,
            Total_Tolls: rates.tolls,
            Total_Permits: rates.permits,
            Package_Cost: packageCost,
            Extra_KM_Cost: extraKmCost,
            Batta_Cost: battaCost,
            Total_Expenses: totalExpenses,
            Grand_Total: grandTotal,
            Status: "Generated", // Default status
            // Shareable_Link: shareableLink,
            UPI_ID: elements.upiId.value.trim() || 'drumsjega5466-1@okhdfcbank', // Use default if empty
        };

        // Add guest/trip details based on flow (manual or auto-load)
        if (isManualFlow) {
            invoiceData.Guest_Name = elements.manualGuestName.value.trim();
            invoiceData.Guest_Mobile = elements.manualGuestMobile.value.trim();
            invoiceData.Vehicle_Type = elements.manualVehicleType.value.trim();
            invoiceData.Vehicle_No = elements.manualVehicleNo.value.trim().toUpperCase();
            invoiceData.Trip_Start_Date = elements.manualStartDate.value.trim();
            invoiceData.Trip_End_Date = elements.manualEndDate.value.trim();
        } else if (currentTripData) {
            invoiceData.Guest_Name = currentTripData.Guest_Name;
            invoiceData.Guest_Mobile = currentTripData.Guest_Mobile;
            invoiceData.Vehicle_Type = currentTripData.Vehicle_Type;
            invoiceData.Vehicle_No = currentTripData.Vehicle_No; // Already uppercase from API
            invoiceData.Trip_Start_Date = currentTripData.Date_Out || currentTripData.Date;
            invoiceData.Trip_End_Date = currentTripData.Date_In || currentTripData.Date;
        } else {
            // This case should ideally not happen if validation is correct
            alert('Error: Critical trip data is missing. Cannot save.');
            elements.saveLoader.style.display = 'none';
            elements.saveInvoiceBtn.disabled = false;
            return;
        }

        // Send data to the backend API
        try {
            const response = await fetch('/.netlify/functions/api?action=saveInvoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(invoiceData)
            });
            const result = await response.json();

            if (result.success && result.shareableLink) { // Check for the link from the backend
                elements.generatedLink.value = result.shareableLink; // Use the NEW secure link
                elements.generatedLinkContainer.style.display = 'block'; // Show link field
                alert('Invoice saved successfully and link generated!');
            } else {
                throw new Error(result.error || 'Backend did not return a shareable link.');
            }
        } catch (error) {
            alert(`Error saving invoice: ${error.message}`);
            console.error("Save Invoice Error:", error);
        } finally {
            elements.saveLoader.style.display = 'none';
            elements.saveInvoiceBtn.disabled = false;
        }
    }

    /**
     * Copies the generated shareable link to the clipboard.
     */
    function handleCopyLink() {
        elements.generatedLink.select();
        try {
            navigator.clipboard.writeText(elements.generatedLink.value);
            elements.copyLinkButton.textContent = 'Copied!';
            setTimeout(() => { elements.copyLinkButton.textContent = 'Copy'; }, 2000);
        } catch (err) {
            alert('Failed to copy link.');
            console.error("Copy Link Error:", err);
        }
    }

    // --- 5. EVENT LISTENERS ---
    // Step 1 Buttons
    elements.loadTripButton.addEventListener('click', handleLoadTrip);
    elements.manualEntryButton.addEventListener('click', handleManualEntry);

    // Step 4 Buttons
    elements.saveInvoiceBtn.addEventListener('click', handleSaveInvoice);
    elements.copyLinkButton.addEventListener('click', handleCopyLink);

    // Auto-update listeners for calculations and context hints
    elements.calcTotalHours.addEventListener('input', updateBillingSlabs); // Triggers slab update -> triggers context update
    elements.calcBillingSlabs.addEventListener('input', updateRateContext);
    elements.calcTotalKms.addEventListener('input', updateRateContext);
    elements.baseRate.addEventListener('input', updateRateContext);
    elements.includedKms.addEventListener('input', updateRateContext);
    elements.extraKmRate.addEventListener('input', updateRateContext);
    elements.battaRate.addEventListener('input', updateRateContext);
    elements.tolls.addEventListener('input', updateRateContext);
    elements.permits.addEventListener('input', updateRateContext);

    // --- 6. INITIALIZATION ---
    goToStep(1); // Start the wizard at Step 1
});