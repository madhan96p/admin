document.addEventListener('DOMContentLoaded', () => {

    // --- 1. DOM ELEMENT CACHE ---
    // Store all frequently used elements in one object for easy access.
    const elements = {
        bookingIdInput: document.getElementById('bookingIdInput'),
        loadTripButton: document.getElementById('loadTripButton'),
        loader: document.getElementById('loader'),
        tripSummary: document.getElementById('tripSummary'),
        billingForm: document.getElementById('billingForm'),
        
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
        generateLinkButton: document.getElementById('generateLinkButton'),
        generatedLinkContainer: document.getElementById('generatedLinkContainer'),
        generatedLink: document.getElementById('generatedLink'),
        copyLinkButton: document.getElementById('copyLinkButton'),
    };

    // --- 2. STATE MANAGEMENT ---
    // Store the fetched trip data globally within this script's scope.
    let currentTripData = null;

    // --- 3. CORE LOGIC FUNCTIONS ---

    /**
     * Fetches trip data from the API and triggers UI updates.
     */
    async function handleLoadTrip() {
        const bookingId = elements.bookingIdInput.value.trim();
        if (!bookingId) {
            alert('Please enter a Booking ID (DS_No) to load.');
            return;
        }

        // Reset UI to loading state
        elements.loader.style.display = 'block';
        elements.tripSummary.style.display = 'none';
        elements.billingForm.style.display = 'none';
        elements.generatedLinkContainer.style.display = 'none';
        elements.loadTripButton.disabled = true;
        currentTripData = null;

        try {
            // Your existing API can be used here.
            const response = await fetch(`/.netlify/functions/api?action=getDutySlipById&id=${bookingId}`);
            if (!response.ok) {
                throw new Error(`Network response was not ok (Status: ${response.status})`);
            }
            const data = await response.json();

            if (data.error || !data.slip) {
                throw new Error(data.error || 'Trip data not found in the response.');
            }

            currentTripData = data.slip;
            displayTripSummary(currentTripData);
            calculateAndDisplayTotals(currentTripData);
            
            // Show the next steps
            elements.tripSummary.style.display = 'block';
            elements.billingForm.style.display = 'block';

        } catch (error) {
            alert(`Error loading trip data: ${error.message}`);
            console.error('Fetch error:', error);
        } finally {
            // Always clean up the UI
            elements.loader.style.display = 'none';
            elements.loadTripButton.disabled = false;
        }
    }

    /**
     * Displays a summary of the loaded trip.
     * @param {object} slip - The duty slip data object.
     */
    function displayTripSummary(slip) {
        elements.tripSummary.innerHTML = `
            <h4>Trip Details for DS #${slip.DS_No}</h4>
            <p><strong>Guest:</strong> ${slip.Guest_Name || 'N/A'}</p>
            <p><strong>Driver:</strong> ${slip.Driver_Name || 'N/A'} (${slip.Vehicle_No || 'N/A'})</p>
            <p><strong>Date:</strong> ${slip.Date || 'N/A'}</p>
        `;
    }

    /**
     * Calculates and displays totals for KMs, Hours, and Billing Slabs.
     * @param {object} slip - The duty slip data object.
     */
    function calculateAndDisplayTotals(slip) {
        // Helper to parse date and time together
        const parseDateTime = (dateStr, timeStr) => {
            if (!dateStr || !timeStr) return null;
            // Assuming date is 'dd/mm/yyyy' from your API
            const [day, month, year] = dateStr.split('/');
            return new Date(`${year}-${month}-${day}T${timeStr}`);
        };

        const startTime = parseDateTime(slip.Date_Out || slip.Date, slip.Driver_Time_Out);
        const endTime = parseDateTime(slip.Date_In || slip.Date, slip.Driver_Time_In);

        let totalHours = 0;
        if (startTime && endTime && endTime > startTime) {
            totalHours = (endTime - startTime) / (1000 * 60 * 60); // Difference in hours
        }

        const startKm = parseFloat(slip.Driver_Km_Out) || 0;
        const endKm = parseFloat(slip.Driver_Km_In) || 0;
        const totalKms = endKm > startKm ? (endKm - startKm) : 0;
        
        // The core logic: Calculate billing slabs based on 12-hour intervals
        const billingSlabs = totalHours > 0 ? Math.ceil(totalHours / 12) : 0;

        // Update the UI
        elements.calcTotalHours.textContent = `${totalHours.toFixed(2)} Hrs`;
        elements.calcTotalKms.textContent = `${totalKms.toFixed(1)} Kms`;
        elements.calcBillingSlabs.textContent = billingSlabs;
    }

    /**
     * Generates the final invoice link with all data encoded in the URL.
     */
    function handleGenerateLink() {
        if (!currentTripData) {
            alert('Please load a trip before generating a link.');
            return;
        }

        // Use URLSearchParams for safe and easy URL query string construction
        const params = new URLSearchParams();

        // Add essential trip data
        params.append('id', currentTripData.DS_No);

        // Add all manager-defined rates and expenses
        params.append('baseRate', elements.baseRate.value || '0');
        params.append('includedKms', elements.includedKms.value || '0');
        params.append('extraKmRate', elements.extraKmRate.value || '0');
        params.append('battaRate', elements.battaRate.value || '0');
        params.append('tolls', elements.tolls.value || '0');
        params.append('permits', elements.permits.value || '0');
        
        // Construct the full URL
        const baseUrl = `${window.location.origin}/view-invoice.html`;
        const finalUrl = `${baseUrl}?${params.toString()}`;

        // Display the link to the manager
        elements.generatedLink.value = finalUrl;
        elements.generatedLinkContainer.style.display = 'block';
    }

    /**
     * Copies the generated link to the clipboard.
     */
    function handleCopyLink() {
        elements.generatedLink.select();
        navigator.clipboard.writeText(elements.generatedLink.value).then(() => {
            const originalText = elements.copyLinkButton.textContent;
            elements.copyLinkButton.textContent = 'Copied!';
            setTimeout(() => {
                elements.copyLinkButton.textContent = originalText;
            }, 2000);
        }).catch(err => {
            alert('Failed to copy link.');
            console.error('Copy error:', err);
        });
    }

    // --- 4. EVENT LISTENERS ---
    elements.loadTripButton.addEventListener('click', handleLoadTrip);
    elements.generateLinkButton.addEventListener('click', handleGenerateLink);
    elements.copyLinkButton.addEventListener('click', handleCopyLink);
});