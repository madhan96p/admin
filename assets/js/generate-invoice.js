document.addEventListener("DOMContentLoaded", () => {
  // --- 1. DOM ELEMENT CACHE ---
  const elements = {
    bookingIdInput: document.getElementById("bookingIdInput"),
    loadTripButton: document.getElementById("loadTripButton"),
    manualEntryButton: document.getElementById("manualEntryButton"),
    loader: document.getElementById("loader"),
    tripSummary: document.getElementById("tripSummary"),

    manualEntryFields: document.getElementById("manualEntryFields"),
    manualGuestName: document.getElementById("manualGuestName"),
    manualGuestMobile: document.getElementById("manualGuestMobile"),
    manualVehicleType: document.getElementById("manualVehicleType"),
    manualVehicleNo: document.getElementById("manualVehicleNo"),
    manualStartDate: document.getElementById("manualStartDate"),
    manualEndDate: document.getElementById("manualEndDate"),

    calcTotalHours: document.getElementById("calcTotalHours"),
    calcTotalKms: document.getElementById("calcTotalKms"),
    calcBillingSlabs: document.getElementById("calcBillingSlabs"),
    upiId: document.getElementById("upiId"),

    timeOutContext: document.getElementById("time-out-context"),
    timeInContext: document.getElementById("time-in-context"),
    totalHrsContext: document.getElementById("total-hrs-context"),

    // Rate fields & their labels
    baseRateLabel: document.querySelector('label[for="baseRate"]'),
    includedKmsLabel: document.querySelector('label[for="includedKms"]'),
    extraKmRateLabel: document.querySelector('label[for="extraKmRate"]'),
    battaRateLabel: document.querySelector('label[for="battaRate"]'),
    baseRate: document.getElementById("baseRate"),
    includedKms: document.getElementById("includedKms"),
    extraKmRate: document.getElementById("extraKmRate"),
    battaRate: document.getElementById("battaRate"),
    tolls: document.getElementById("tolls"),
    permits: document.getElementById("permits"),

    // Rate Context Spans
    baseRateSlabs: document.getElementById("baseRateSlabs"),
    baseRateValue: document.getElementById("baseRateValue"),
    baseRateTotal: document.getElementById("baseRateTotal"),
    includedKmsSlabs: document.getElementById("includedKmsSlabs"),
    includedKmsValue: document.getElementById("includedKmsValue"),
    includedKmsTotal: document.getElementById("includedKmsTotal"),
    extraKmCalcResult: document.getElementById("extraKmCalcResult"),
    extraKmRateValue: document.getElementById("extraKmRateValue"),
    extraKmCostTotal: document.getElementById("extraKmCostTotal"),
    battaRateSlabs: document.getElementById("battaRateSlabs"),
    battaRateValue: document.getElementById("battaRateValue"),
    battaRateTotal: document.getElementById("battaRateTotal"),

    // Running Total Display
    runningTotalDisplay: document.getElementById("runningTotalDisplay"),
    runningGrandTotal: document.getElementById("runningGrandTotal"),

    // Step 4 fields
    finalInvoiceSummary: document.getElementById("finalInvoiceSummary"),
    generatedLinkContainer: document.getElementById("generatedLinkContainer"),
    generatedLink: document.getElementById("generatedLink"),
    copyLinkButton: document.getElementById("copyLinkButton"),
    saveLoader: document.getElementById("save-loader"),

    // Stepper UI
    steps: document.querySelectorAll(".step"),
    stepContents: document.querySelectorAll(".step-content"),
    prevStepBtn: document.getElementById("prevStepBtn"),
    nextStepBtn: document.getElementById("nextStepBtn"),
    saveInvoiceBtn: document.getElementById("saveInvoiceBtn"),
  };

  // --- 2. STATE MANAGEMENT ---
  let currentTripData = null;
  let isManualFlow = false;
  let currentStep = 1;
  let currentCalculations = {};
  let allTariffs = null; // To cache tariffs
  let activeTariff = null; // The specific tariff for the loaded trip
  let tripCategory = null; // 'Local' or 'Outstation'

  // --- 3. STEPPER/NAVIGATION LOGIC ---
  function goToStep(stepNumber) {
    currentStep = stepNumber;
    elements.stepContents.forEach((content) => {
      content.classList.toggle(
        "active",
        parseInt(content.dataset.stepContent) === stepNumber,
      );
    });
    elements.steps.forEach((step) => {
      const stepNum = parseInt(step.dataset.step);
      step.classList.toggle("active", stepNum === stepNumber);
      step.classList.toggle("done", stepNum < stepNumber);
    });
    if (stepNumber === 3) updateRateContext();
    if (stepNumber === 4) calculateAndShowSummary();
    elements.prevStepBtn.style.display =
      stepNumber > 1 ? "inline-flex" : "none";
    elements.nextStepBtn.style.display =
      stepNumber > 1 && stepNumber < 4 ? "inline-flex" : "none";
    elements.saveInvoiceBtn.style.display =
      stepNumber === 4 ? "inline-flex" : "none";
    if (stepNumber === 1) elements.nextStepBtn.style.display = "none";
  }

  elements.nextStepBtn.addEventListener("click", () => {
    if (currentStep < 4) goToStep(currentStep + 1);
  });
  elements.prevStepBtn.addEventListener("click", () => {
    if (currentStep > 1) goToStep(currentStep - 1);
  });

  // --- 4. CORE DATA LOGIC & CALCULATIONS ---

  async function fetchTariffs() {
    try {
      const response = await fetch(
        "/.netlify/functions/api?action=getTariff",
      );
      if (!response.ok) throw new Error("Failed to load tariffs from server.");
      allTariffs = await response.json();
      console.log("Tariffs loaded successfully.", allTariffs);
    } catch (error) {
      alert(`CRITICAL ERROR: Could not load billing tariffs. ${error.message}`);
    }
  }

  function applyTariffAndDefaults(slip) {
    if (!allTariffs) {
      alert("Tariffs are not loaded. Cannot apply rates.");
      return;
    }

    tripCategory = slip.Trip_Category;
    const vehicleType = slip.Vehicle_Type;

    if (!tripCategory || !vehicleType) {
        alert("Trip Category or Vehicle Type is missing from the duty slip. Cannot determine tariff.");
        return;
    }

    let tariffData;
    if (tripCategory.toLowerCase() === 'local') {
        tariffData = allTariffs.local.find(t => t.Name.toLowerCase() === vehicleType.toLowerCase());
    } else if (tripCategory.toLowerCase() === 'outstation') {
        tariffData = allTariffs.outstation.find(t => t.Name.toLowerCase() === vehicleType.toLowerCase());
    }

    if (tariffData) {
        activeTariff = tariffData;
        console.log("Active Tariff:", activeTariff);
        // Populate Step 3 fields and make them readonly
        setRateFields(true); // isReadOnly = true

        if (tripCategory.toLowerCase() === 'local') {
            elements.baseRate.value = activeTariff.Base_Fare || 0;
            elements.includedKms.value = activeTariff.Base_Km || 0;
            elements.extraKmRate.value = activeTariff.Extra_Km_Rate || 0;
            elements.battaRate.value = "0"; // Batta might not be standard in local, or needs a field.
        } else { // Outstation
            elements.baseRate.value = activeTariff.Rate_Per_Km || 0;
            elements.includedKms.value = activeTariff.Min_Km_Per_Day || 0;
            elements.extraKmRate.value = activeTariff.Rate_Per_Km || 0; // Extra KM rate is same as per KM rate
            elements.battaRate.value = activeTariff.Driver_Bata || 0;
        }

    } else {
        alert(`Tariff not found for Vehicle: "${vehicleType}" and Category: "${tripCategory}". Please enter rates manually.`);
        activeTariff = null;
        setRateFields(false); // Make fields editable
    }
    updateRateContext(); // Refresh calculations with new tariff
  }
  
  function setRateFields(isReadOnly) {
      const fields = [elements.baseRate, elements.includedKms, elements.extraKmRate, elements.battaRate];
      fields.forEach(field => {
          if (isReadOnly) {
              field.setAttribute('readonly', true);
              field.style.backgroundColor = '#f1f1f1';
          } else {
              field.removeAttribute('readonly');
              field.style.backgroundColor = '#fff';
              field.value = '';
          }
      });
  }


  function parseHoursFromString(timeString) {
    if (!timeString) return 0;
    let totalHours = 0;
    const hrsMatch = timeString.match(/(\d+(\.\d+)?) hrs/);
    const minsMatch = timeString.match(/(\d+) mins/);
    if (hrsMatch) {
      totalHours += parseFloat(hrsMatch[1]);
    }
    if (minsMatch) {
      totalHours += parseFloat(minsMatch[1]) / 60;
    }
    if (totalHours === 0 && !hrsMatch && !minsMatch) {
      const fallbackParse = parseFloat(timeString);
      if (!isNaN(fallbackParse)) return fallbackParse;
    }
    return totalHours;
  }
  
  function calculateDays(start, end) {
      if (!start || !end) return 1;
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (isNaN(startDate) || isNaN(endDate)) return 1;
      const diffTime = Math.abs(endDate - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays === 0 ? 1 : diffDays;
  }

  function updateBillingSlabs() {
    const totalHours = parseFloat(elements.calcTotalHours.value) || 0;
    const billingSlabs = totalHours > 0 ? Math.ceil(totalHours / 12) : 0;
    elements.calcBillingSlabs.value = billingSlabs;
    updateRateContext();
  }
  
  function updateRateContext() {
    if (!activeTariff && !isManualFlow) {
        elements.runningTotalDisplay.style.display = "none";
        return;
    }

    const totalKms = parseFloat(elements.calcTotalKms.value) || 0;
    const tolls = parseFloat(elements.tolls.value) || 0;
    const permits = parseFloat(elements.permits.value) || 0;
    let packageCost, extraKmCost, battaCost, grandTotal;

    if (tripCategory && tripCategory.toLowerCase() === 'outstation') {
        const totalDays = parseInt(currentTripData.Total_Days) || calculateDays(currentTripData.Date_Out, currentTripData.Date_In);
        const ratePerKm = parseFloat(elements.baseRate.value) || 0;
        const minKmPerDay = parseFloat(elements.includedKms.value) || 0;
        const driverBata = parseFloat(elements.battaRate.value) || 0;
        
        const minChargeableKms = totalDays * minKmPerDay;
        const finalChargeableKms = Math.max(totalKms, minChargeableKms);
        
        packageCost = finalChargeableKms * ratePerKm;
        extraKmCost = 0; // Included in package cost for outstation
        battaCost = totalDays * driverBata;

        // Update Labels & Context for Outstation
        elements.baseRateLabel.innerHTML = `Rate per KM (₹) <span class="calc-context">(${finalChargeableKms.toFixed(1)} KMs * ${formatCurrency(ratePerKm)} = ${formatCurrency(packageCost)})</span>`;
        elements.includedKmsLabel.innerHTML = `Min KMs / Day <span class="calc-context">(${totalDays} Days * ${minKmPerDay} KMs = ${minChargeableKms} KMs)</span>`;
        elements.extraKmRateLabel.innerHTML = `Extra KM Rate (₹) <span class="calc-context">(Included in Rate per KM)</span>`;
        elements.battaRateLabel.innerHTML = `Driver Batta / Day (₹) <span class="calc-context">(${totalDays} Days * ${formatCurrency(driverBata)} = ${formatCurrency(battaCost)})</span>`;

    } else { // Local or Manual
        const billingSlabs = parseInt(elements.calcBillingSlabs.value) || 0;
        const baseRate = parseFloat(elements.baseRate.value) || 0;
        const includedKms = parseFloat(elements.includedKms.value) || 0;
        const extraKmRate = parseFloat(elements.extraKmRate.value) || 0;
        const battaRate = parseFloat(elements.battaRate.value) || 0;

        const totalIncludedKms = billingSlabs * includedKms;
        const extraKms = totalKms > totalIncludedKms ? totalKms - totalIncludedKms : 0;
        
        packageCost = billingSlabs * baseRate;
        extraKmCost = extraKms * extraKmRate;
        battaCost = billingSlabs * battaRate;

        // Update Labels & Context for Local
        elements.baseRateLabel.innerHTML = `Base Rate per Slab (₹) <span class="calc-context">(${billingSlabs} Slabs * ${formatCurrency(baseRate)} = ${formatCurrency(packageCost)})</span>`;
        elements.includedKmsLabel.innerHTML = `Included KMs per Slab <span class="calc-context">(${billingSlabs} Slabs * ${includedKms} KMs = ${totalIncludedKms} KMs)</span>`;
        elements.extraKmRateLabel.innerHTML = `Extra KM Rate (₹) <span class="calc-context">(${extraKms.toFixed(1)} KMs * ${formatCurrency(extraKmRate)} = ${formatCurrency(extraKmCost)})</span>`;
        elements.battaRateLabel.innerHTML = `Driver Batta per Slab (₹) <span class="calc-context">(${billingSlabs} Slabs * ${formatCurrency(battaRate)} = ${formatCurrency(battaCost)})</span>`;
    }

    const totalExpenses = tolls + permits;
    grandTotal = packageCost + extraKmCost + battaCost + totalExpenses;
    elements.runningGrandTotal.textContent = formatCurrency(grandTotal);
    elements.runningTotalDisplay.style.display = "block";
  }

  function clearStep2Inputs() {
    // Clear all fields
    Object.values(elements).forEach(el => {
        if(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            if(el.type !== 'button' && el.type !== 'submit' && el.id !== 'upiId') {
                 el.value = '';
            }
        }
    });
    elements.timeOutContext.textContent = "--";
    elements.timeInContext.textContent = "--";
    elements.totalHrsContext.textContent = "--";
    updateRateContext();
    elements.runningTotalDisplay.style.display = "none";
  }

  async function handleLoadTrip() {
    const bookingId = elements.bookingIdInput.value.trim();
    if (!bookingId) return alert("Please enter a Booking ID (DS_No) to load.");

    isManualFlow = false;
    elements.loader.style.display = "block";
    elements.loadTripButton.disabled = true;
    elements.manualEntryButton.disabled = true;
    currentTripData = null;

    try {
      const response = await fetch(
        `/.netlify/functions/api?action=getDutySlipById&id=${bookingId}`,
      );
      if (!response.ok)
        throw new Error(`Network response error (Status: ${response.status})`);
      const data = await response.json();
      if (data.error || !data.slip)
        throw new Error(data.error || "Trip data not found.");

      currentTripData = data.slip;
      
      displayTripSummary(currentTripData);
      calculateAndDisplayTotals(currentTripData);
      applyTariffAndDefaults(currentTripData); // NEW: Apply tariff
      
      elements.tripSummary.style.display = "block";
      elements.manualEntryFields.style.display = "none";

      goToStep(2);
      elements.nextStepBtn.style.display = "inline-flex"; // Show next button
    } catch (error) {
      alert(`Error loading trip data: ${error.message}`);
    } finally {
      elements.loader.style.display = "none";
      elements.loadTripButton.disabled = false;
      elements.manualEntryButton.disabled = false;
    }
  }

  function handleManualEntry() {
    isManualFlow = true;
    currentTripData = null;
    activeTariff = null;
    tripCategory = 'manual'; // Set category for logic branching

    if (!elements.bookingIdInput.value.trim()) {
      const timestamp = Date.now().toString().slice(-6);
      elements.bookingIdInput.value = `MANUAL-${timestamp}`;
    }

    elements.tripSummary.style.display = "none";
    elements.manualEntryFields.style.display = "block";
    clearStep2Inputs();
    setRateFields(false); // Make rate fields editable for manual entry

    goToStep(2);
    elements.nextStepBtn.style.display = "inline-flex";
  }

  function formatDate(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  function displayTripSummary(slip) {
    elements.tripSummary.innerHTML = `
            <h4>Trip Details for DS #${slip.DS_No}</h4>
            <p><strong>Guest:</strong> ${slip.Guest_Name || "N/A"} (${slip.Guest_Mobile || "N/A"})</p>
            <p><strong>Driver:</strong> ${slip.Driver_Name || "N/A"} (${slip.Vehicle_No || "N/A"})</p>
            <p><strong>Date:</strong> ${formatDate(slip.Date)}</p>
            <p><strong>Category:</strong> ${slip.Trip_Category || "N/A"}</p>`;
  }

  function calculateAndDisplayTotals(slip) {
    let totalHours = parseHoursFromString(slip.Driver_Total_Hrs);
    const startKm = parseFloat(slip.Driver_Km_Out) || 0;
    const endKm = parseFloat(slip.Driver_Km_In) || 0;
    const totalKms = endKm > startKm ? endKm - startKm : 0;

    elements.calcTotalHours.value = totalHours.toFixed(2);
    elements.calcTotalKms.value = totalKms.toFixed(1);

    elements.timeOutContext.textContent = slip.Driver_Time_Out || "--";
    elements.timeInContext.textContent = slip.Driver_Time_In || "--";
    elements.totalHrsContext.textContent = slip.Driver_Total_Hrs || "0 hrs";

    updateBillingSlabs();
  }

  function calculateAndShowSummary() {
    // This function logic is now simpler because updateRateContext does the heavy lifting.
    // We just need to gather the final numbers.
    // The actual calculation logic is now centralized in `updateRateContext`.
    // We will build the summary based on the trip category.

    const tolls = parseFloat(elements.tolls.value) || 0;
    const permits = parseFloat(elements.permits.value) || 0;
    const totalExpenses = tolls + permits;
    let summaryHtml = `<h4 class="section-divider">Final Invoice Summary</h4>`;
    
    let finalPackageCost, finalExtraKmCost, finalBattaCost, finalGrandTotal;

    if (tripCategory && tripCategory.toLowerCase() === 'outstation') {
        const totalDays = parseInt(currentTripData.Total_Days) || calculateDays(currentTripData.Date_Out, currentTripData.Date_In);
        const ratePerKm = parseFloat(elements.baseRate.value) || 0;
        const minKmPerDay = parseFloat(elements.includedKms.value) || 0;
        const driverBata = parseFloat(elements.battaRate.value) || 0;
        const totalKms = parseFloat(elements.calcTotalKms.value) || 0;

        const minChargeableKms = totalDays * minKmPerDay;
        const finalChargeableKms = Math.max(totalKms, minChargeableKms);
        
        finalPackageCost = finalChargeableKms * ratePerKm;
        finalExtraKmCost = 0;
        finalBattaCost = totalDays * driverBata;

        summaryHtml += `
            <div class="summary-grid">
                <div class="summary-item">
                    <span>Package Cost (${finalChargeableKms.toFixed(1)} KMs @ ${formatCurrency(ratePerKm)})</span>
                    <strong>${formatCurrency(finalPackageCost)}</strong>
                </div>
                <div class="summary-item">
                    <span>Driver Batta (${totalDays} Days @ ${formatCurrency(driverBata)})</span>
                    <strong>${formatCurrency(finalBattaCost)}</strong>
                </div>
                 <div class="summary-item">
                    <span>Tolls & Permits</span>
                    <strong>${formatCurrency(totalExpenses)}</strong>
                </div>
            </div>`;

    } else { // Local or Manual
        const billingSlabs = parseInt(elements.calcBillingSlabs.value) || 0;
        const baseRate = parseFloat(elements.baseRate.value) || 0;
        const includedKms = parseFloat(elements.includedKms.value) || 0;
        const extraKmRate = parseFloat(elements.extraKmRate.value) || 0;
        const battaRate = parseFloat(elements.battaRate.value) || 0;
        const totalKms = parseFloat(elements.calcTotalKms.value) || 0;

        const totalIncludedKms = billingSlabs * includedKms;
        const extraKms = totalKms > totalIncludedKms ? totalKms - totalIncludedKms : 0;
        
        finalPackageCost = billingSlabs * baseRate;
        finalExtraKmCost = extraKms * extraKmRate;
        finalBattaCost = billingSlabs * battaRate;

        summaryHtml += `
            <div class="summary-grid">
                <div class="summary-item">
                    <span>Package Cost (${billingSlabs} Slabs @ ${formatCurrency(baseRate)})</span>
                    <strong>${formatCurrency(finalPackageCost)}</strong>
                </div>
                <div class="summary-item">
                    <span>Extra KMs (${extraKms.toFixed(1)} KMs @ ${formatCurrency(extraKmRate)})</span>
                    <strong>${formatCurrency(finalExtraKmCost)}</strong>
                </div>
                <div class="summary-item">
                    <span>Driver Batta (${billingSlabs} Slabs @ ${formatCurrency(battaRate)})</span>
                    <strong>${formatCurrency(finalBattaCost)}</strong>
                </div>
                <div class="summary-item">
                    <span>Tolls & Permits</span>
                    <strong>${formatCurrency(totalExpenses)}</strong>
                </div>
            </div>`;
    }

    finalGrandTotal = finalPackageCost + finalExtraKmCost + finalBattaCost + totalExpenses;
    
    summaryHtml += `
        <div class="summary-item total">
            <span>Grand Total</span>
            <strong>${formatCurrency(finalGrandTotal)}</strong>
        </div>`;

    elements.finalInvoiceSummary.innerHTML = summaryHtml;
    
    // Store for saving
    currentCalculations = {
        totalHours: parseFloat(elements.calcTotalHours.value) || 0,
        totalKms: parseFloat(elements.calcTotalKms.value) || 0,
        billingSlabs: parseInt(elements.calcBillingSlabs.value) || 0,
        packageCost: finalPackageCost,
        extraKmCost: finalExtraKmCost,
        battaCost: finalBattaCost,
        totalExpenses: totalExpenses,
        grandTotal: finalGrandTotal,
        rates: {
            baseRate: parseFloat(elements.baseRate.value) || 0,
            includedKms: parseFloat(elements.includedKms.value) || 0,
            extraKmRate: parseFloat(elements.extraKmRate.value) || 0,
            battaRate: parseFloat(elements.battaRate.value) || 0,
            tolls: parseFloat(elements.tolls.value) || 0,
            permits: parseFloat(elements.permits.value) || 0,
        }
    };
  }

  function generateShareableLink(bookingId) {
    const baseUrl = `${window.location.origin}/view-invoice.html`;
    return `${baseUrl}?id=${bookingId}`;
  }

  async function handleSaveInvoice() {
    elements.saveLoader.style.display = "block";
    elements.saveInvoiceBtn.disabled = true;

    const bookingId = elements.bookingIdInput.value.trim();
    if (!bookingId) {
      alert("Error: Booking ID is missing. Please go back to Step 1.");
      elements.saveLoader.style.display = "none";
      elements.saveInvoiceBtn.disabled = false;
      return;
    }

    calculateAndShowSummary();
    const {
      grandTotal,
      rates
    } = currentCalculations;

    if (!rates || grandTotal === undefined) {
      alert("Error: Calculation data is missing. Please review Steps 2 & 3.");
      elements.saveLoader.style.display = "none";
      elements.saveInvoiceBtn.disabled = false;
      return;
    }

    let invoiceData = {
      ...currentCalculations,
      Invoice_ID: `ST-${bookingId}`,
      Booking_ID: bookingId,
      Invoice_Date: new Date().toLocaleDateString("en-GB"),
      Last_Updated: new Date().toLocaleString("en-GB", { hour12: false }),
      Invoice_Note: document.getElementById("invoiceNote").value.trim(),
      Status: "Generated",
      UPI_ID: elements.upiId.value.trim() || "drumsjega5466-1@okhdfcbank",
      Trip_Category: tripCategory,
    };
    
    // Flatten rates into top-level properties for sheets
    invoiceData.Base_Rate = invoiceData.rates.baseRate;
    invoiceData.Included_KMs_per_Slab = invoiceData.rates.includedKms;
    invoiceData.Extra_KM_Rate = invoiceData.rates.extraKmRate;
    invoiceData.Batta_Rate = invoiceData.rates.battaRate;
    invoiceData.Total_Tolls = invoiceData.rates.tolls;
    invoiceData.Total_Permits = invoiceData.rates.permits;
    delete invoiceData.rates;


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
      invoiceData.Vehicle_No = currentTripData.Vehicle_No;
      invoiceData.Trip_Start_Date = currentTripData.Date_Out || currentTripData.Date;
      invoiceData.Trip_End_Date = currentTripData.Date_In || currentTripData.Date;
    } else {
      alert("Error: Critical trip data is missing. Cannot save.");
      elements.saveLoader.style.display = "none";
      elements.saveInvoiceBtn.disabled = false;
      return;
    }

    try {
      const response = await fetch(
        "/.netlify/functions/api?action=saveInvoice",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(invoiceData),
        },
      );
      const result = await response.json();

      if (result.success && result.shareableLink) {
        const link = result.shareableLink;
        elements.generatedLink.value = link;
        elements.generatedLinkContainer.style.display = "block";
        elements.generatedLinkContainer.scrollIntoView({ behavior: "smooth" });

        document.getElementById("whatsappShareBtn").onclick = () => {
            const isShieldEnabled = document.getElementById("useNegotiationShield").checked;
            const shieldNote = "_Note: This is a system-calculated digital invoice based on actual GPS/KMs recorded. No manual adjustments allowed._";
            const manualNote = "_Note: This invoice includes the custom rates/adjustments as per our discussion._";
            const selectedNote = isShieldEnabled ? shieldNote : manualNote;
            const message = `🚗 *Shrish Travels | Digital Invoice*\n\nHello *${invoiceData.Guest_Name}*,
Thank you for choosing us! Your trip details (DS #${invoiceData.Booking_ID}) have been finalized.

📅 *Date:* ${invoiceData.Invoice_Date}
💰 *Total Amount:* ${formatCurrency(invoiceData.Grand_Total)}
🔗 *View & Pay:* ${link}

${selectedNote}

Please complete the payment via the link or UPI to close your trip. We hope you enjoyed the ride!`;
            const whatsappUrl = `https://wa.me/91${invoiceData.Guest_Mobile}?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, "_blank");
        };

        document.getElementById("copyLinkBtn").onclick = () => {
          navigator.clipboard.writeText(link);
          const btn = document.getElementById("copyLinkBtn");
          btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
          setTimeout(() => {
            btn.innerHTML = '<i class="fas fa-copy"></i> Copy Link';
          }, 2000);
        };

        alert("Invoice saved successfully!");
      } else {
        throw new Error(
          result.error || "Backend did not return a shareable link.",
        );
      }
    } catch (error) {
      alert(`Error saving invoice: ${error.message}`);
      console.error("Save Invoice Error:", error);
    } finally {
      elements.saveLoader.style.display = "none";
      elements.saveInvoiceBtn.disabled = false;
    }
  }
  
  function formatCurrency(amount) {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  }

  // --- 5. EVENT LISTENERS ---
  elements.loadTripButton.addEventListener("click", handleLoadTrip);
  elements.manualEntryButton.addEventListener("click", handleManualEntry);
  elements.manualStartDate.addEventListener("change", () => {
    const startDate = elements.manualStartDate.value;
    if (startDate) {
      elements.manualEndDate.min = startDate;
      if (elements.manualEndDate.value && elements.manualEndDate.value < startDate) {
        elements.manualEndDate.value = "";
      }
    }
  });

  elements.saveInvoiceBtn.addEventListener("click", handleSaveInvoice);
  
  const rateInputs = [elements.calcTotalHours, elements.calcBillingSlabs, elements.calcTotalKms, elements.baseRate, elements.includedKms, elements.extraKmRate, elements.battaRate, elements.tolls, elements.permits];
  rateInputs.forEach(input => {
      input.addEventListener('input', updateRateContext);
  });
  elements.calcTotalHours.addEventListener('input', updateBillingSlabs);


  // --- 6. INITIALIZATION ---
  goToStep(1); // Start the wizard at Step 1
  fetchTariffs(); // Fetch tariffs on page load
});