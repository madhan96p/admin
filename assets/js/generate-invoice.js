document.addEventListener('DOMContentLoaded', () => {

    // --- 1. DOM ELEMENT CACHE ---
    const elements = {
        bookingIdInput: document.getElementById('bookingIdInput'),
        loadTripButton: document.getElementById('loadTripButton'),
        loader: document.getElementById('loader'),
        tripSummary: document.getElementById('tripSummary'),
        
        // Calculation display fields
        calcTotalHours: document.getElementById('calcTotalHours'),
        calcTotalKms: document.getElementById('calcTotalKms'),
        calcBillingSlabs: document.getElementById('calcBillingSlabs'),

        // Rate & expense input fields
        baseRate: document.getElementById('baseRate'),
        includedKms: document.getElementById('includedKms'),
        extraKmRate: document.getElementById('extraKmRate'),
        battaRate: document.getElementById('battaRate'),
        tolls: document.getElementById('tolls'),
        permits: document.getElementById('permits'),

        // Link generation fields
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
    let currentCalculations = {};
    let currentStep = 1;

    // --- 3. STEPPER/NAVIGATION LOGIC ---

    function goToStep(stepNumber) {
        currentStep = stepNumber;

        // Update step content
        elements.stepContents.forEach(content => {
            content.classList.toggle('active', parseInt(content.dataset.stepContent) === stepNumber);
        });

        // Update step indicators
        elements.steps.forEach(step => {
            const stepNum = parseInt(step.dataset.step);
            step.classList.toggle('active', stepNum === stepNumber);
            step.classList.toggle('done', stepNum < stepNumber);
        });

        // Update navigation buttons
        elements.prevStepBtn.style.display = (stepNumber > 1) ? 'inline-flex' : 'none';
        elements.nextStepBtn.style.display = (stepNumber < 4) ? 'inline-flex' : 'none';
        elements.saveInvoiceBtn.style.display = (stepNumber === 4) ? 'inline-flex' : 'none';

        // Disable "Next" on step 1 until trip is loaded
        if (stepNumber === 1) {
            elements.nextStepBtn.style.display = 'none';
        }
    }

    elements.nextStepBtn.addEventListener('click', () => {
        if (currentStep < 4) {
            goToStep(currentStep + 1);
        }
    });

    elements.prevStepBtn.addEventListener('click', () => {
        if (currentStep > 1) {
            goToStep(currentStep - 1);
        }
    });

    // --- 4. CORE DATA LOGIC ---

    async function handleLoadTrip() {
        const bookingId = elements.bookingIdInput.value.trim();
        if (!bookingId) return alert('Please enter a Booking ID (DS_No) to load.');

        elements.loader.style.display = 'block';
        elements.loadTripButton.disabled = true;
        currentTripData = null;

        try {
            const response = await fetch(`/.netlify/functions/api?action=getDutySlipById&id=${bookingId}`);
            if (!response.ok) throw new Error(`Network response error (Status: ${response.status})`);
            
            const data = await response.json();
            if (data.error || !data.slip) throw new Error(data.error || 'Trip data not found.');

            currentTripData = data.slip;
            displayTripSummary(currentTripData);
            calculateAndDisplayTotals(currentTripData);
            
            elements.nextStepBtn.style.display = 'inline-flex'; // Show "Next" button

        } catch (error) {
            alert(`Error loading trip data: ${error.message}`);
        } finally {
            elements.loader.style.display = 'none';
            elements.loadTripButton.disabled = false;
        }
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

        // Save calculations for later
        currentCalculations = { totalHours, totalKms, billingSlabs };

        // Update the UI
        elements.calcTotalHours.textContent = `${totalHours.toFixed(2)} Hrs`;
        elements.calcTotalKms.textContent = `${totalKms.toFixed(1)} Kms`;
        elements.calcBillingSlabs.textContent = `${billingSlabs} Slab/s`;
    }

    function generateShareableLink() {
        const params = new URLSearchParams();
        params.append('id', currentTripData.DS_No);
        params.append('baseRate', elements.baseRate.value || '0');
        params.append('includedKms', elements.includedKms.value || '0');
        params.append('extraKmRate', elements.extraKmRate.value || '0');
        params.append('battaRate', elements.battaRate.value || '0');
        params.append('tolls', elements.tolls.value || '0');
        params.append('permits', elements.permits.value || '0');
        
        const baseUrl = `${window.location.origin}/view-invoice.html`;
        return `${baseUrl}?${params.toString()}`;
    }

    async function handleSaveInvoice() {
        if (!currentTripData) return alert('Trip data is missing. Please go back.');

        elements.saveLoader.style.display = 'block';
        elements.saveInvoiceBtn.disabled = true;

        // --- 1. Get all rates ---
        const rates = {
            baseRate: parseFloat(elements.baseRate.value || 0),
            includedKms: parseFloat(elements.includedKms.value || 0),
            extraKmRate: parseFloat(elements.extraKmRate.value || 0),
            battaRate: parseFloat(elements.battaRate.value || 0),
            tolls: parseFloat(elements.tolls.value || 0),
            permits: parseFloat(elements.permits.value || 0),
        };

        // --- 2. Recalculate final costs ---
        const { totalHours, totalKms, billingSlabs } = currentCalculations;
        const totalIncludedKms = billingSlabs * rates.includedKms;
        const extraKms = totalKms > totalIncludedKms ? (totalKms - totalIncludedKms) : 0;

        const packageCost = billingSlabs * rates.baseRate;
        const extraKmCost = extraKms * rates.extraKmRate;
        const battaCost = billingSlabs * rates.battaRate;
        const totalExpenses = rates.tolls + rates.permits;
        const grandTotal = packageCost + extraKmCost + battaCost + totalExpenses;

        // --- 3. Generate Shareable Link ---
        const shareableLink = generateShareableLink();
        
        // --- 4. Prepare data for Google Sheet ---
        const invoiceData = {
            Invoice_ID: `ST-${currentTripData.DS_No}`,
            Booking_ID: currentTripData.DS_No,
            Invoice_Date: new Date().toLocaleDateString('en-GB'), // dd/mm/yyyy
            Guest_Name: currentTripData.Guest_Name,
            Total_KMs: totalKms.toFixed(1),
            Total_Hours: totalHours.toFixed(2),
            Billing_Slabs: billingSlabs,
            Base_Rate: rates.baseRate,
            Extra_KM_Rate: rates.extraKmRate,
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
        };

        // --- 5. Send to API ---
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
    elements.saveInvoiceBtn.addEventListener('click', handleSaveInvoice);
    elements.copyLinkButton.addEventListener('click', handleCopyLink);
    
    // Initialize the first step
    goToStep(1);
});