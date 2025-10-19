document.addEventListener('DOMContentLoaded', () => {

    // --- 1. GET DATA FROM URL ---
    const params = new URLSearchParams(window.location.search);
    const bookingId = params.get('id'); // This is now the ONLY param we need

    if (!bookingId) {
        document.body.innerHTML = '<h1>Error: No Booking ID provided.</h1>';
        return;
    }

    // --- 2. HELPER FUNCTIONS ---
    const formatCurrency = (num) => {
        // Convert to number, as it might come as string from GSheet
        const numberValue = parseFloat(num);
        if (isNaN(numberValue)) {
            return '₹ --.--';
        }
        return numberValue.toLocaleString('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
        });
    };

    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = text || '-'; // Use '-' as a fallback
        }
    };

    // --- 3. CORE FETCH LOGIC ---
    async function loadAndRenderInvoice() {
        try {
            // Step 1: Fetch the *saved invoice data*
            const response = await fetch(`/.netlify/functions/api?action=getInvoiceById&id=${bookingId}`);
            if (!response.ok) throw new Error('Failed to fetch invoice data.');
            
            const data = await response.json();
            if (data.error || !data.invoice) {
                throw new Error(data.error || 'Invoice data not found.');
            }

            const invoice = data.invoice; // All our data is in this object

            // Step 2: Populate the invoice HTML
            populateMeta(invoice);
            populateSummary(invoice);
            populateCharges(invoice);
            populateQrCode(invoice);

        } catch (error) {
            document.body.innerHTML = `<h1>Error loading invoice: ${error.message}</h1>`;
            console.error(error);
        }
    }
   // --- 1. ADD THIS NEW FUNCTION somewhere in the file ---

/**
 * Generates a dynamic, styled QR code
 * @param {object} invoice - The fetched invoice data object
 */
function populateQrCode(invoice) {
    // 1. Get the dynamic data
    const upiId = invoice.UPI_ID;
    const amount = parseFloat(invoice.Grand_Total).toFixed(2);
    const transactionNote = `From D.S #${invoice.Booking_ID}`; // Your new format
    const payeeName = "Shrish Travels";

    // 2. Build the UPI intent string
    const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;

    // 3. Create the QR code with your exact style requirements
    const qrCode = new QRCodeStyling({
        width: 120,  // Matches your .qr-code class max-width
        height: 120, // Matches your .qr-code class max-width
        type: "svg",
        data: upiString,
        image: "assets/images/logo.webp", // Your logo
        dotsOptions: {
            type: "classy-rounded", // Your "Classy Rounded" style
            gradient: {
                type: "radial", // Your "Radial Gradient"
                colorStops: [
                    { offset: 0, color: "#ffffff" }, // Center white
                    { offset: 1, color: "#000000" }  // Ends black
                ]
            }
        },
        backgroundOptions: {
            color: "#ffffff", // Standard white background
        },
        imageOptions: {
            crossOrigin: "anonymous",
            margin: 4,
            imageSize: 0.3
        }
    });

    // 4. Find the placeholder div and display the QR code
    const qrCanvas = document.getElementById("qr-code-canvas");
    qrCanvas.innerHTML = ''; // Clear it first
    qrCode.append(qrCanvas);

    const paymentLinkButton = document.getElementById("payment-link");
    if (paymentLinkButton) {
        paymentLinkButton.href = upiString; // Set link to the same UPI string
    }
}


    // --- 4. POPULATION FUNCTIONS ---

    function populateMeta(invoice) {
        setText('guest-name', invoice.Guest_Name);
        setText('guest-mobile', invoice.Guest_Mobile);
        setText('invoice-id', invoice.Invoice_ID);
        setText('invoice-date', invoice.Invoice_Date);
    }

    function populateSummary(invoice) {
        setText('trip-vehicle', `${invoice.Vehicle_Type} (${invoice.Vehicle_No})`);
        
        const startDate = invoice.Trip_Start_Date;
        const endDate = invoice.Trip_End_Date;
        setText('trip-dates', startDate === endDate ? startDate : `${startDate} to ${endDate}`);
        
        setText('trip-total-kms', `${invoice.Total_KMs} Kms`);
        setText('trip-total-duration', `${invoice.Total_Hours} Hrs (${invoice.Billing_Slabs} Slab/s)`);
    }

    function populateCharges(invoice) {
        const tbody = document.getElementById('charges-tbody');
        tbody.innerHTML = ''; // Clear "Loading..."
        
        let rows = '';
        const extraKms = parseFloat(invoice.Calculated_Extra_KMs || 0);
        const totalExpenses = parseFloat(invoice.Total_Expenses || 0);

        // 1. Package Cost Row
        rows += `
            <tr>
                <td>Outstation Package</td>
                <td>${invoice.Billing_Slabs} Slab/s (${invoice.Included_KMs_per_Slab} Kms/Slab)</td>
                <td>${formatCurrency(invoice.Base_Rate)} / Slab</td>
                <td>${formatCurrency(invoice.Package_Cost)}</td>
            </tr>
        `;

        // 2. Extra KMs Row
        if (extraKms > 0) {
            rows += `
                <tr>
                    <td>Extra Kilometer Charge</td>
                    <td>${invoice.Calculated_Extra_KMs} Kms</td>
                    <td>${formatCurrency(invoice.Extra_KM_Rate)} / Km</td>
                    <td>${formatCurrency(invoice.Extra_KM_Cost)}</td>
                </tr>
            `;
        }

        // 3. Driver Batta Row
        rows += `
            <tr>
                <td>Driver Batta</td>
                <td>${invoice.Billing_Slabs} Slab/s</td>
                <td>${formatCurrency(invoice.Batta_Rate)} / Slab</td>
                <td>${formatCurrency(invoice.Batta_Cost)}</td>
            </tr>
        `;

        // 4. Expenses Row
        if (totalExpenses > 0) {
            rows += `
                <tr>
                    <td>Tolls, Parking & Permits</td>
                    <td>Charged as per actuals</td>
                    <td>-</td>
                    <td>${formatCurrency(invoice.Total_Expenses)}</td>
                </tr>
            `;
        }

        tbody.innerHTML = rows;

        // 5. Populate Totals
        setText('grand-total', formatCurrency(invoice.Grand_Total));
        setText('total-due-amount', formatCurrency(invoice.Grand_Total));
        
        // This is a complex step, so we'll just use a placeholder for now
        setText('amount-in-words', `Rupees ${parseFloat(invoice.Grand_Total).toFixed(0)} Only`); 
    }

    // --- 5. EVENT LISTENERS ---
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