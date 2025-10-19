document.addEventListener('DOMContentLoaded', () => {

    // --- 1. GET DATA FROM URL ---
    // URLSearchParams is the modern way to read query parameters from the URL.
    const params = new URLSearchParams(window.location.search);
    
    // Get the Booking ID
    const bookingId = params.get('id');

    // Get all the rates and expenses set by the manager
    const rates = {
        baseRate: parseFloat(params.get('baseRate') || 0),
        includedKms: parseFloat(params.get('includedKms') || 0),
        extraKmRate: parseFloat(params.get('extraKmRate') || 0),
        battaRate: parseFloat(params.get('battaRate') || 0),
        tolls: parseFloat(params.get('tolls') || 0),
        permits: parseFloat(params.get('permits') || 0),
    };

    if (!bookingId) {
        document.body.innerHTML = '<h1>Error: No Booking ID provided.</h1>';
        return;
    }

    // --- 2. HELPER FUNCTIONS ---

    // Formats a number as Indian Rupees (e.g., ₹ 1,200.00)
    const formatCurrency = (num) => {
        return num.toLocaleString('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
        });
    };

    // Helper to securely set text content
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = text;
        }
    };

    // --- 3. CORE CALCULATION & FETCH LOGIC ---

    async function loadAndRenderInvoice() {
        try {
            // Step 1: Fetch the raw trip data
            const response = await fetch(`/.netlify/functions/api?action=getDutySlipById&id=${bookingId}`);
            if (!response.ok) throw new Error('Failed to fetch trip data.');
            
            const data = await response.json();
            if (data.error || !data.slip) throw new Error(data.error || 'Trip data not found.');

            const slip = data.slip;

            // Step 2: Perform all calculations
            const calculations = calculateTotals(slip, rates);

            // Step 3: Populate the invoice HTML
            populateMeta(slip);
            populateSummary(slip, calculations);
            populateCharges(rates, calculations);

        } catch (error) {
            document.body.innerHTML = `<h1>Error loading invoice: ${error.message}</h1>`;
            console.error(error);
        }
    }

    /**
     * Performs all financial calculations
     * @param {object} slip - The raw trip data
     * @param {object} rates - The manager-defined rates
     * @returns {object} - An object with all calculated totals
     */
    function calculateTotals(slip, rates) {
        // --- Core Trip Stats ---
        const parseDateTime = (dateStr, timeStr) => {
            if (!dateStr || !timeStr) return null;
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
        
        // --- Billing Logic ---
        const billingSlabs = totalHours > 0 ? Math.ceil(totalHours / 12) : 0;
        const totalIncludedKms = billingSlabs * rates.includedKms;
        const extraKms = totalKms > totalIncludedKms ? (totalKms - totalIncludedKms) : 0;

        // --- Final Costs ---
        const packageCost = billingSlabs * rates.baseRate;
        const extraKmCost = extraKms * rates.extraKmRate;
        const battaCost = billingSlabs * rates.battaRate;
        const totalExpenses = rates.tolls + rates.permits;

        const grandTotal = packageCost + extraKmCost + battaCost + totalExpenses;

        return {
            totalHours,
            totalKms,
            billingSlabs,
            extraKms,
            packageCost,
            extraKmCost,
            battaCost,
            totalExpenses,
            grandTotal,
        };
    }

    // --- 4. POPULATION FUNCTIONS ---

    /**
     * Populates the "Bill To" and "Invoice Details" section
     */
    function populateMeta(slip) {
        setText('guest-name', slip.Guest_Name || 'N/A');
        setText('guest-mobile', slip.Guest_Mobile || 'N/A');
        setText('invoice-id', `ST-${slip.DS_No}`);
        setText('invoice-date', new Date().toLocaleDateString('en-GB')); // e.g., 19/10/2025
    }

    /**
     * Populates the "Trip Summary" table
     */
    function populateSummary(slip, calculations) {
        setText('trip-vehicle', `${slip.Vehicle_Type || 'N/A'} (${slip.Vehicle_No || 'N/A'})`);
        
        const startDate = slip.Date_Out || slip.Date;
        const endDate = slip.Date_In || slip.Date;
        setText('trip-dates', startDate === endDate ? startDate : `${startDate} to ${endDate}`);
        
        setText('trip-total-kms', `${calculations.totalKms.toFixed(1)} Kms`);
        setText('trip-total-duration', `${calculations.totalHours.toFixed(2)} Hrs (${calculations.billingSlabs} Slab/s)`);
    }

    /**
     * Populates the "Itemized Charges" table
     */
    function populateCharges(rates, calculations) {
        const tbody = document.getElementById('charges-tbody');
        tbody.innerHTML = ''; // Clear "Loading..."
        
        let rows = '';

        // 1. Package Cost Row
        rows += `
            <tr>
                <td>Outstation Package</td>
                <td>${calculations.billingSlabs} Slab/s (${rates.includedKms} Kms/Slab)</td>
                <td>${formatCurrency(rates.baseRate)} / Slab</td>
                <td>${formatCurrency(calculations.packageCost)}</td>
            </tr>
        `;

        // 2. Extra KMs Row (only if there are extra KMs)
        if (calculations.extraKms > 0) {
            rows += `
                <tr>
                    <td>Extra Kilometer Charge</td>
                    <td>${calculations.extraKms.toFixed(1)} Kms</td>
                    <td>${formatCurrency(rates.extraKmRate)} / Km</td>
                    <td>${formatCurrency(calculations.extraKmCost)}</td>
                </tr>
            `;
        }

        // 3. Driver Batta Row
        rows += `
            <tr>
                <td>Driver Batta</td>
                <td>${calculations.billingSlabs} Slab/s</td>
                <td>${formatCurrency(rates.battaRate)} / Slab</td>
                <td>${formatCurrency(calculations.battaCost)}</td>
            </tr>
        `;

        // 4. Expenses Row (only if there are expenses)
        if (calculations.totalExpenses > 0) {
            rows += `
                <tr>
                    <td>Tolls, Parking & Permits</td>
                    <td>Charged as per actuals</td>
                    <td>-</td>
                    <td>${formatCurrency(calculations.totalExpenses)}</td>
                </tr>
            `;
        }

        tbody.innerHTML = rows;

        // 5. Populate Totals
        setText('grand-total', formatCurrency(calculations.grandTotal));
        setText('total-due-amount', formatCurrency(calculations.grandTotal));
        
        // This is a complex step, so we'll just use a placeholder for now
        // A full library would be needed for a perfect conversion.
        setText('amount-in-words', `Rupees ${calculations.grandTotal.toFixed(0)} Only`); 
    }

    // --- 5. EVENT LISTENERS ---

    // Add click listener for the "Copy UPI" button
    const copyUpiBtn = document.getElementById('copy-upi-btn');
    const upiIdInput = document.getElementById('upi-id-input');
    if (copyUpiBtn && upiIdInput) {
        copyUpiBtn.addEventListener('click', () => {
            upiIdInput.select();
            navigator.clipboard.writeText(upiIdInput.value).then(() => {
                const originalText = copyUpiBtn.textContent;
                copyUpiBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyUpiBtn.textContent = originalText;
                }, 2000);
            }).catch(err => {
                alert('Failed to copy UPI ID.');
            });
        });
    }

    // --- 6. INITIALIZE ---
    loadAndRenderInvoice();
});