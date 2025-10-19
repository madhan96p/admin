document.addEventListener('DOMContentLoaded', () => {

    // --- 1. DOM ELEMENT CACHE ---
    const elements = {
        bookingIdInput: document.getElementById('bookingIdInput'),
        loadTripButton: document.getElementById('loadTripButton'),
        manualEntryButton: document.getElementById('manualEntryButton'), // New button
        loader: document.getElementById('loader'),
        tripSummary: document.getElementById('tripSummary'),
        
        // Manual entry fields
        manualEntryFields: document.getElementById('manualEntryFields'),
        manualGuestName: document.getElementById('manualGuestName'),
        manualGuestMobile: document.getElementById('manualGuestMobile'),
        manualVehicleType: document.getElementById('manualVehicleType'),
        manualVehicleNo: document.getElementById('manualVehicleNo'),
        manualStartDate: document.getElementById('manualStartDate'),
        manualEndDate: document.getElementById('manualEndDate'),
        
        // Calculation fields
        calcTotalHours: document.getElementById('calcTotalHours'),
        calcTotalKms: document.getElementById('calcTotalKms'),
        calcBillingSlabs: document.getElementById('calcBillingSlabs'),
        upiId: document.getElementById('upiId'),

        // Rate fields
        baseRate: document.getElementById('baseRate'),
        includedKms: document.getElementById('includedKms'),
        extraKmRate: document.getElementById('extraKmRate'),
        battaRate: document.getElementById('battaRate'),
        tolls: document.getElementById('tolls'),
        permits: document.getElementById('permits'),

        // Step 4 fields
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
    let currentTripData = null;
    let isManualFlow = false; // New state variable
    let currentStep = 1;

    // --- 3. STEPPER/NAVIGATION LOGIC ---
    function goToStep(stepNumber) {
        currentStep = stepNumber;
        elements.stepContents.forEach(content => {
            content.classList.toggle('active', parseInt(content.dataset.stepContent) === stepNumber);
        });
        elements.steps.forEach(step => {
            const stepNum = parseInt(step.dataset.step);
            step.classList.toggle('active', stepNum === stepNumber);
            step.classList.toggle('done', stepNum < stepNumber);
        });
        elements.prevStepBtn.style.display = (stepNumber > 1) ? 'inline-flex' : 'none';
        elements.nextStepBtn.style.display = (stepNumber < 4 && stepNumber > 1) ? 'inline-flex' : 'none'; // Modified
        elements.saveInvoiceBtn.style.display = (stepNumber === 4) ? 'inline-flex' : 'none';
        
        // Hide "Next" on step 1
        if (stepNumber === 1) {
            elements.nextStepBtn.style.display = 'none';
        }
    }

    elements.nextStepBtn.addEventListener('click', () => {
        if (currentStep < 4) goToStep(currentStep + 1);
    });

    elements.prevStepBtn.addEventListener('click', () => {
        if (currentStep > 1) goToStep(currentStep - 1);
    });

    // --- 4. CORE DATA LOGIC ---

    // NEW: Function to clear all Step 2 inputs
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
    }
    
    // MODIFIED: handleLoadTrip
    async function handleLoadTrip() {
        const bookingId = elements.bookingIdInput.value.trim();
        if (!bookingId) return alert('Please enter a Booking ID (DS_No) to load.');

        isManualFlow = false; // Set flow type
        elements.loader.style.display = 'block';
        elements.loadTripButton.disabled = true;
        elements.manualEntryButton.disabled = true;
        currentTripData = null;

        try {
            const response = await fetch(`/.netlify/functions/api?action=getDutySlipById&id=${bookingId}`);
            if (!response.ok) throw new Error(`Network response error (Status: ${response.status})`);
            
            const data = await response.json();
            if (data.error || !data.slip) throw new Error(data.error || 'Trip data not found.');

            currentTripData = data.slip;
            
            // Populate and show/hide fields
            displayTripSummary(currentTripData);
            calculateAndDisplayTotals(currentTripData);
            elements.tripSummary.style.display = 'block';
            elements.manualEntryFields.style.display = 'none';
            
            goToStep(2); // Go to next step on success

        } catch (error) {
            alert(`Error loading trip data: ${error.message}`);
        } finally {
            elements.loader.style.display = 'none';
            elements.loadTripButton.disabled = false;
            elements.manualEntryButton.disabled = false;
        }
    }

    // NEW: handleManualEntry
    function handleManualEntry() {
        const bookingId = elements.bookingIdInput.value.trim();
        if (!bookingId) return alert('Please enter a unique Booking ID (e.g., "MANUAL-101") first.');

        isManualFlow = true; // Set flow type
        currentTripData = null; // No loaded data

        // Show/hide fields
        elements.tripSummary.style.display = 'none';
        elements.manualEntryFields.style.display = 'block';
        
        clearStep2Inputs();
        goToStep(2);
    }

    function displayTripSummary(slip) {
        elements.tripSummary.innerHTML = `
            <h4>Trip Details for DS #${slip.DS_No}</h4>
            <p><strong>Guest:</strong> ${slip.Guest_Name || 'N/A'} (${slip.Guest_Mobile || 'N/A'})</p>
            <p><strong>Driver:</strong> ${slip.Driver_Name || 'N/A'} (${slip.Vehicle_No || 'N/A'})</p>
            <p><strong>Date:</strong> ${slip.Date || 'N/A'}</p>
        `;
    }

    function calculateAndDisplayTotals(slip) {
        const parseDateTime = (dateStr, timeStr) => {
            if (!dateStr || !timeStr) return null;
            const [day, month, year] = dateStr.split('/');
            return new Date(`${year}-${month}-${day}T${timeStr}`);
        };

        const startTime = parseDateTime(slip.Date_Out || slip.Date, slip.Driver_Time_Out);
        const endTime = parseDateTime(slip.Date_In || slip.Date, slip.Driver_Time_In);

        let totalHours = 0;
        if (startTime && endTime && endTime > startTime) {
            totalHours = (endTime - startTime) / (1000 * 60 * 60);
        }

        const startKm = parseFloat(slip.Driver_Km_Out) || 0;
        const endKm = parseFloat(slip.Driver_Km_In) || 0;
        const totalKms = endKm > startKm ? (endKm - startKm) : 0;
        
        const billingSlabs = totalHours > 0 ? Math.ceil(totalHours / 12) : 0;

        elements.calcTotalHours.value = totalHours.toFixed(2);
        elements.calcTotalKms.value = totalKms.toFixed(1);
        elements.calcBillingSlabs.value = billingSlabs;
        // We don't touch the UPI ID, it keeps its default
    }

    function generateShareableLink(bookingId) {
        const baseUrl = `${window.location.origin}/view-invoice.html`;
        return `${baseUrl}?id=${bookingId}`;
    }

    // MODIFIED: handleSaveInvoice
    async function handleSaveInvoice() {
        elements.saveLoader.style.display = 'block';
        elements.saveInvoiceBtn.disabled = true;

        const bookingId = elements.bookingIdInput.value;
        if (!bookingId) {
            alert('Error: Booking ID is missing. Please go back to Step 1.');
            elements.saveLoader.style.display = 'none';
            elements.saveInvoiceBtn.disabled = false;
            return;
        }

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
        
        const totalIncludedKms = billingSlabs * rates.includedKms;
        const extraKms = totalKms > totalIncludedKms ? (totalKms - totalIncludedKms) : 0;

        const packageCost = billingSlabs * rates.baseRate;
        const extraKmCost = extraKms * rates.extraKmRate;
        const battaCost = billingSlabs * rates.battaRate;
        const totalExpenses = rates.tolls + rates.permits;
        const grandTotal = packageCost + extraKmCost + battaCost + totalExpenses;

        const shareableLink = generateShareableLink(bookingId);
        
        // This object is now built dynamically
        let invoiceData = {
            Invoice_ID: `ST-${bookingId}`,
            Booking_ID: bookingId,
            Invoice_Date: new Date().toLocaleDateString('en-GB'),
            
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
            Status: "Generated",
            Shareable_Link: shareableLink,
            UPI_ID: elements.upiId.value || 'drumsjega5466-1@okhdfcbank',
        };

        // Add data from the correct source
        if (isManualFlow) {
            // Get data from manual fields
            invoiceData.Guest_Name = elements.manualGuestName.value;
            invoiceData.Guest_Mobile = elements.manualGuestMobile.value;
            invoiceData.Vehicle_Type = elements.manualVehicleType.value;
            invoiceData.Vehicle_No = elements.manualVehicleNo.value;
            invoiceData.Trip_Start_Date = elements.manualStartDate.value;
            invoiceData.Trip_End_Date = elements.manualEndDate.value;
        } else if (currentTripData) {
            // Get data from loaded trip
            invoiceData.Guest_Name = currentTripData.Guest_Name;
            invoiceData.Guest_Mobile = currentTripData.Guest_Mobile;
            invoiceData.Vehicle_Type = currentTripData.Vehicle_Type;
            invoiceData.Vehicle_No = currentTripData.Vehicle_No;
            invoiceData.Trip_Start_Date = currentTripData.Date_Out || currentTripData.Date;
            invoiceData.Trip_End_Date = currentTripData.Date_In || currentTripData.Date;
        } else {
            alert('Error: No trip data found. Please restart.');
            elements.saveLoader.style.display = 'none';
            elements.saveInvoiceBtn.disabled = false;
            return;
        }

        // Save to Google Sheet
        try {
            const response = await fetch('/.netlify/functions/api?action=saveInvoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(invoiceData)
            });
            const result = await response.json();

            if (result.success) {
                elements.generatedLink.value = shareableLink;
                elements.generatedLinkContainer.style.display = 'block';
                alert('Invoice saved successfully and link generated!');
            } else {
                throw new Error(result.error || 'Unknown error saving invoice.');
            }
        } catch (error) {
            alert(`Error saving invoice: ${error.message}`);
        } finally {
            elements.saveLoader.style.display = 'none';
            elements.saveInvoiceBtn.disabled = false;
        }
    }

    function handleCopyLink() {
        elements.generatedLink.select();
        navigator.clipboard.writeText(elements.generatedLink.value).then(() => {
            elements.copyLinkButton.textContent = 'Copied!';
            setTimeout(() => { elements.copyLinkButton.textContent = 'Copy'; }, 2000);
        });
    }

    // --- 5. EVENT LISTENERS ---
    elements.loadTripButton.addEventListener('click', handleLoadTrip);
    elements.manualEntryButton.addEventListener('click', handleManualEntry); // New
    elements.saveInvoiceBtn.addEventListener('click', handleSaveInvoice);
    elements.copyLinkButton.addEventListener('click', handleCopyLink);
    
    goToStep(1); // Initialize
});