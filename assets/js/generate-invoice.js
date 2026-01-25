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
    invoiceNote: document.getElementById("invoiceNote"),

    timeOutContext: document.getElementById("time-out-context"),
    timeInContext: document.getElementById("time-in-context"),
    totalHrsContext: document.getElementById("total-hrs-context"),

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

    runningTotalDisplay: document.getElementById("runningTotalDisplay"),
    runningGrandTotal: document.getElementById("runningGrandTotal"),

    finalInvoiceSummary: document.getElementById("finalInvoiceSummary"),
    generatedLinkContainer: document.getElementById("generatedLinkContainer"),
    generatedLink: document.getElementById("generatedLink"),
    copyLinkButton: document.getElementById("copyLinkButton"),
    saveLoader: document.getElementById("save-loader"),

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
  let allTariffs = null;
  let activeTariff = null;
  let tripCategory = null;

  // --- 3. HELPER FUNCTIONS ---
  
  function parseDdmmyyyy(dateString) {
      if (!dateString || typeof dateString !== 'string') return null;
      
      // Trim whitespace and handle potential date-time values from sheets
      const trimmedDateString = dateString.split(' ')[0].trim();

      const parts = trimmedDateString.split('/');
      if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10);
          const year = parseInt(parts[2], 10);
          
          // Strict validation for DD/MM/YYYY format
          if (day > 0 && day <= 31 && month > 0 && month <= 12 && year > 1990) {
              const date = new Date(year, month - 1, day);
              // Final check to ensure date is valid and wasn't rolled over by constructor (e.g., 31/04/2024)
              if (date && date.getFullYear() === year && date.getMonth() === month - 1) {
                  return date;
              }
          }
      }
      
      // Fallback for other formats like YYYY-MM-DD or native JS formats
      const directDate = new Date(trimmedDateString);
      if (!isNaN(directDate.getTime())) {
          return directDate;
      }
      
      console.warn(`Could not parse date: "${dateString}"`);
      return null;
  }
  
  function calculateDays(start, end) {
      if (!start) return 1;
      const startDate = parseDdmmyyyy(start);
      const endDate = end ? parseDdmmyyyy(end) : startDate;
      if (!startDate || !endDate) return 1;
      const diffTime = Math.abs(endDate - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays === 0 ? 1 : diffDays + 1;
  }
  
  function formatCurrency(amount) {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);
  }

  // --- 4. STATE & UI RESET ---
  function resetStateForNewOperation() {
      // Reset logical state
      currentTripData = null;
      activeTariff = null;
      tripCategory = null;
      currentCalculations = {};
      isManualFlow = false; 

      // Reset UI inputs in Step 2 & 3
      const fieldsToClear = [
          elements.manualGuestName, elements.manualGuestMobile, elements.manualVehicleType,
          elements.manualVehicleNo, elements.manualStartDate, elements.manualEndDate,
          elements.calcTotalHours, elements.calcTotalKms, elements.calcBillingSlabs,
          elements.invoiceNote, elements.tolls, elements.permits
      ];
      fieldsToClear.forEach(field => field.value = '');
      
      // Reset context hints
      elements.timeOutContext.textContent = "--";
      elements.timeInContext.textContent = "--";
      elements.totalHrsContext.textContent = "--";
      
      // Reset UI visibility and styles
      elements.tripSummary.style.display = "none";
      elements.manualEntryFields.style.display = "none";
      elements.runningTotalDisplay.style.display = "none";
      elements.generatedLinkContainer.style.display = "none";
      
      setRateFields(false); // Unlock and clear rate fields
  }

  // --- 5. STEPPER/NAVIGATION LOGIC ---
  function goToStep(stepNumber) {
    currentStep = stepNumber;
    elements.stepContents.forEach((content) => {
      content.classList.toggle("active", parseInt(content.dataset.stepContent) === stepNumber);
    });
    elements.steps.forEach((step) => {
      const stepNum = parseInt(step.dataset.step);
      step.classList.toggle("active", stepNum === stepNumber);
      step.classList.toggle("done", stepNum < stepNumber);
    });
    if (stepNumber === 3) updateRateContext();
    if (stepNumber === 4) calculateAndShowSummary();
    elements.prevStepBtn.style.display = stepNumber > 1 ? "inline-flex" : "none";
    elements.nextStepBtn.style.display = stepNumber > 1 && stepNumber < 4 ? "inline-flex" : "none";
    elements.saveInvoiceBtn.style.display = stepNumber === 4 ? "inline-flex" : "none";
    if (stepNumber === 1) elements.nextStepBtn.style.display = "none";
  }

  elements.nextStepBtn.addEventListener("click", () => {
    if (currentStep < 4) goToStep(currentStep + 1);
  });
  elements.prevStepBtn.addEventListener("click", () => {
    if (currentStep > 1) goToStep(currentStep - 1);
  });

  // --- 6. CORE DATA LOGIC & CALCULATIONS ---

  async function fetchTariffs() {
    try {
      const response = await fetch("/.netlify/functions/api?action=getTariff");
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
        alert("Trip Category or Vehicle Type is missing. Cannot determine tariff.");
        return;
    }
    const vehicleTypeLower = vehicleType.toLowerCase().trim();
    let tariffData;
    if (tripCategory.toLowerCase().trim() === 'local') {
        tariffData = allTariffs.local.find(t => t.Name && t.Name.toLowerCase().trim() === vehicleTypeLower);
    } else if (tripCategory.toLowerCase().trim() === 'outstation') {
        tariffData = allTariffs.outstation.find(t => t.Name && t.Name.toLowerCase().trim() === vehicleTypeLower);
    }
    if (tariffData) {
        activeTariff = tariffData;
        setRateFields(true);
        if (tripCategory.toLowerCase().trim() === 'local') {
            elements.baseRate.value = activeTariff.Base_Fare || 0;
            elements.includedKms.value = activeTariff.Base_Km || 0;
            elements.extraKmRate.value = activeTariff.Extra_Km_Rate || 0;
            elements.battaRate.value = activeTariff.Batta || 0;
        } else {
            elements.baseRate.value = activeTariff.Rate_Per_Km || 0;
            elements.includedKms.value = activeTariff.Min_Km_Per_Day || 0;
            elements.extraKmRate.value = activeTariff.Rate_Per_Km || 0;
            elements.battaRate.value = activeTariff.Driver_Bata || 0;
        }
    } else {
        alert(`Tariff not found for Vehicle: "${vehicleType}" and Category: "${tripCategory}". Please enter rates manually.`);
        activeTariff = null;
        setRateFields(false);
    }
    updateRateContext();
  }
  
  function setRateFields(isReadOnly) {
      const fields = [elements.baseRate, elements.includedKms, elements.extraKmRate, elements.battaRate];
      fields.forEach(field => {
          field.readOnly = isReadOnly;
          field.style.backgroundColor = isReadOnly ? '#f1f1f1' : '#fff';
          if (!isReadOnly) field.value = '';
      });
  }

  function parseHoursFromString(timeString) {
    if (!timeString) return 0;
    let totalHours = 0;
    const hrsMatch = timeString.match(/(\d+(\.\d+)?) hrs/);
    const minsMatch = timeString.match(/(\d+) mins/);
    if (hrsMatch) totalHours += parseFloat(hrsMatch[1]);
    if (minsMatch) totalHours += parseFloat(minsMatch[1]) / 60;
    if (totalHours === 0 && !hrsMatch && !minsMatch) {
      const fallbackParse = parseFloat(timeString);
      if (!isNaN(fallbackParse)) return fallbackParse;
    }
    return totalHours;
  }

  function updateBillingSlabs() {
    const totalHours = parseFloat(elements.calcTotalHours.value) || 0;
    const gracePeriod = 0.25; // 15-minute grace period
    let billingSlabs = 0;
    if (totalHours > 0) {
        billingSlabs = Math.ceil((totalHours - gracePeriod) / 12);
        if (billingSlabs <= 0) {
            billingSlabs = 1;
        }
    }
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
    const category = isManualFlow ? 'local' : (tripCategory || '').toLowerCase().trim();

    if (category === 'outstation') {
        const totalDays = parseInt((currentTripData || {}).Total_Days, 10) || calculateDays((currentTripData || {}).Date_Out, (currentTripData || {}).Date_In);
        const ratePerKm = parseFloat(elements.baseRate.value) || 0;
        const minKmPerDay = parseFloat(elements.includedKms.value) || 0;
        const driverBata = parseFloat(elements.battaRate.value) || 0;
        const minChargeableKms = totalDays * minKmPerDay;
        const finalChargeableKms = Math.max(totalKms, minChargeableKms);
        packageCost = finalChargeableKms * ratePerKm;
        extraKmCost = 0; 
        battaCost = totalDays * driverBata;
        elements.baseRateLabel.innerHTML = `Rate per KM (₹) <span class="calc-context">(${finalChargeableKms.toFixed(1)} KMs * ${formatCurrency(ratePerKm)} = ${formatCurrency(packageCost)})</span>`;
        elements.includedKmsLabel.innerHTML = `Min KMs / Day <span class="calc-context">(${totalDays} Days * ${minKmPerDay} KMs = ${minChargeableKms} KMs)</span>`;
        elements.extraKmRateLabel.innerHTML = `Extra KM Rate (₹) <span class="calc-context">(Included in Rate per KM)</span>`;
        elements.battaRateLabel.innerHTML = `Driver Batta / Day (₹) <span class="calc-context">(${totalDays} Days * ${formatCurrency(driverBata)} = ${formatCurrency(battaCost)})</span>`;
    } else {
        const billingSlabs = parseInt(elements.calcBillingSlabs.value) || 0;
        const baseRate = parseFloat(elements.baseRate.value) || 0;
        const includedKms = parseFloat(elements.includedKms.value) || 0;
        const extraKmRate = parseFloat(elements.extraKmRate.value) || 0;
        const driverAllowance = parseFloat(elements.battaRate.value) || 0;
        const totalIncludedKms = billingSlabs * includedKms;
        const extraKms = totalKms > totalIncludedKms ? totalKms - totalIncludedKms : 0;
        packageCost = billingSlabs * baseRate;
        extraKmCost = extraKms * extraKmRate;
        battaCost = billingSlabs * driverAllowance;
        elements.baseRateLabel.innerHTML = `Base Rate per Slab (₹) <span class="calc-context">(${billingSlabs} Slabs * ${formatCurrency(baseRate)} = ${formatCurrency(packageCost)})</span>`;
        elements.includedKmsLabel.innerHTML = `Included KMs per Slab <span class="calc-context">(${billingSlabs} Slabs * ${includedKms} KMs = ${totalIncludedKms} KMs)</span>`;
        elements.extraKmRateLabel.innerHTML = `Extra KM Rate (₹) <span class="calc-context">(${extraKms.toFixed(1)} KMs * ${formatCurrency(extraKmRate)} = ${formatCurrency(extraKmCost)})</span>`;
        elements.battaRateLabel.innerHTML = `Driver Allowance per Slab (₹) <span class="calc-context">(${billingSlabs} Slabs * ${formatCurrency(driverAllowance)} = ${formatCurrency(battaCost)})</span>`;
    }
    const totalExpenses = tolls + permits;
    grandTotal = packageCost + extraKmCost + battaCost + totalExpenses;
    elements.runningGrandTotal.textContent = formatCurrency(grandTotal);
    elements.runningTotalDisplay.style.display = "block";
  }

  async function getDutySlip(id) {
    const response = await fetch(`/.netlify/functions/api?action=getDutySlipById&id=${id}`);
    if (!response.ok) throw new Error('Could not re-fetch trip data from server.');
    const data = await response.json();
    if (data.error || !data.slip) throw new Error(data.error || 'Trip data not found on re-fetch.');
    return data.slip;
  }
  
  async function handleLoadTrip() {
    const bookingId = elements.bookingIdInput.value.trim();
    if (!bookingId) return alert("Please enter a Booking ID (DS_No) to load.");
    resetStateForNewOperation();
    isManualFlow = false;
    elements.loader.style.display = "block";
    elements.loadTripButton.disabled = true;
    elements.manualEntryButton.disabled = true;
    try {
      currentTripData = await getDutySlip(bookingId);
      displayTripSummary(currentTripData);
      calculateAndDisplayTotals(currentTripData);
      applyTariffAndDefaults(currentTripData);
      elements.tripSummary.style.display = "block";
      goToStep(2);
      elements.nextStepBtn.style.display = "inline-flex";
    } catch (error) {
      alert(`Error loading trip data: ${error.message}`);
      goToStep(1); // Go back to step 1 on failure
    } finally {
      elements.loader.style.display = "none";
      elements.loadTripButton.disabled = false;
      elements.manualEntryButton.disabled = false;
    }
  }

  function handleManualEntry() {
    resetStateForNewOperation();
    isManualFlow = true;
    tripCategory = 'local';
    if (!elements.bookingIdInput.value.trim()) {
      const timestamp = Date.now().toString().slice(-6);
      elements.bookingIdInput.value = `MANUAL-${timestamp}`;
    }
    elements.manualEntryFields.style.display = "block";
    setRateFields(false);
    goToStep(2);
    elements.nextStepBtn.style.display = "inline-flex";
  }

  function formatDate(dateString) {
    const date = parseDdmmyyyy(dateString);
    if (!date) return "N/A";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  function displayTripSummary(slip) {
    elements.tripSummary.innerHTML = `<h4>Trip Details for DS #${slip.DS_No}</h4><p><strong>Guest:</strong> ${slip.Guest_Name || "N/A"} (${slip.Guest_Mobile || "N/A"})</p><p><strong>Driver:</strong> ${slip.Driver_Name || "N/A"} (${slip.Vehicle_No || "N/A"})</p><p><strong>Date:</strong> ${formatDate(slip.Date)}</p><p><strong>Category:</strong> ${slip.Trip_Category || "N/A"}</p>`;
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
    const tolls = parseFloat(elements.tolls.value) || 0;
    const permits = parseFloat(elements.permits.value) || 0;
    const totalExpenses = tolls + permits;
    let summaryHtml = `<h4 class="section-divider">Final Invoice Summary</h4>`;
    let finalPackageCost, finalExtraKmCost, finalBattaCost, finalGrandTotal;
    const category = isManualFlow ? 'local' : (tripCategory || '').toLowerCase().trim();

    if (category === 'outstation') {
        const totalDays = parseInt((currentTripData || {}).Total_Days, 10) || calculateDays((currentTripData || {}).Date_Out, (currentTripData || {}).Date_In);
        const ratePerKm = parseFloat(elements.baseRate.value) || 0;
        const minKmPerDay = parseFloat(elements.includedKms.value) || 0;
        const driverBata = parseFloat(elements.battaRate.value) || 0;
        const totalKms = parseFloat(elements.calcTotalKms.value) || 0;
        const minChargeableKms = totalDays * minKmPerDay;
        const finalChargeableKms = Math.max(totalKms, minChargeableKms);
        finalPackageCost = finalChargeableKms * ratePerKm;
        finalExtraKmCost = 0;
        finalBattaCost = totalDays * driverBata;
        summaryHtml += `<div class="summary-grid"><div class="summary-item"><span>Package Cost (${finalChargeableKms.toFixed(1)} KMs @ ${formatCurrency(ratePerKm)})</span><strong>${formatCurrency(finalPackageCost)}</strong></div><div class="summary-item"><span>Driver Batta (${totalDays} Days @ ${formatCurrency(driverBata)})</span><strong>${formatCurrency(finalBattaCost)}</strong></div><div class="summary-item"><span>Tolls & Permits</span><strong>${formatCurrency(totalExpenses)}</strong></div></div>`;
    } else {
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
        summaryHtml += `<div class="summary-grid"><div class="summary-item"><span>Package Cost (${billingSlabs} Slabs @ ${formatCurrency(baseRate)})</span><strong>${formatCurrency(finalPackageCost)}</strong></div><div class="summary-item"><span>Extra KMs (${extraKms.toFixed(1)} KMs @ ${formatCurrency(extraKmRate)})</span><strong>${formatCurrency(finalExtraKmCost)}</strong></div><div class="summary-item"><span>Driver Batta (${billingSlabs} Slabs @ ${formatCurrency(battaRate)})</span><strong>${formatCurrency(finalBattaCost)}</strong></div><div class="summary-item"><span>Tolls & Permits</span><strong>${formatCurrency(totalExpenses)}</strong></div></div>`;
    }
    finalGrandTotal = finalPackageCost + finalExtraKmCost + finalBattaCost + totalExpenses;
    summaryHtml += `<div class="summary-item total"><span>Grand Total</span><strong>${formatCurrency(finalGrandTotal)}</strong></div>`;
    elements.finalInvoiceSummary.innerHTML = summaryHtml;
    currentCalculations = {
        totalHours: parseFloat(elements.calcTotalHours.value) || 0,
        totalKms: parseFloat(elements.calcTotalKms.value) || 0,
        billingSlabs: parseInt(elements.calcBillingSlabs.value) || 0,
        packageCost: finalPackageCost, extraKmCost: finalExtraKmCost, battaCost: finalBattaCost,
        totalExpenses: totalExpenses, grandTotal: finalGrandTotal,
        rates: { baseRate: parseFloat(elements.baseRate.value) || 0, includedKms: parseFloat(elements.includedKms.value) || 0, extraKmRate: parseFloat(elements.extraKmRate.value) || 0, battaRate: parseFloat(elements.battaRate.value) || 0, tolls: parseFloat(elements.tolls.value) || 0, permits: parseFloat(elements.permits.value) || 0, }
    };
  }

  async function handleSaveInvoice() {
    elements.saveLoader.style.display = "block";
    elements.saveInvoiceBtn.disabled = true;
    const bookingId = elements.bookingIdInput.value.trim();
    if (!bookingId) {
      alert("Error: Booking ID is missing.");
      elements.saveLoader.style.display = "none";
      elements.saveInvoiceBtn.disabled = false;
      return;
    }
    try {
        if (!isManualFlow) {
            console.log("Re-fetching trip data before saving...");
            currentTripData = await getDutySlip(bookingId);
        }
        calculateAndShowSummary();
        const { grandTotal, rates } = currentCalculations;
        if (!rates || grandTotal === undefined) {
          throw new Error("Calculation data missing.");
        }
        let invoiceData = {
          ...currentCalculations,
          Invoice_ID: `ST-${bookingId}`, Booking_ID: bookingId,
          Invoice_Date: new Date().toLocaleDateString("en-GB"),
          Last_Updated: new Date().toLocaleString("en-GB", { hour12: false }),
          Invoice_Note: elements.invoiceNote.value.trim(), Status: "Generated",
          UPI_ID: elements.upiId.value.trim() || "drumsjega5466-1@okhdfcbank",
          Trip_Category: isManualFlow ? "Manual" : tripCategory,
        };
        invoiceData = { ...invoiceData, ...invoiceData.rates };
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
            throw new Error("Critical trip data is missing.");
        }

        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('The request timed out. Please check the Google Sheet to confirm if the data was saved.')), 15000));
        const fetchPromise = fetch("/.netlify/functions/api?action=saveInvoice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(invoiceData),
        });

        const response = await Promise.race([fetchPromise, timeoutPromise]);
        const result = await response.json();

        if (result.success && result.shareableLink) {
            const link = result.shareableLink;
            elements.generatedLink.value = link;
            elements.generatedLinkContainer.style.display = "block";
            elements.generatedLinkContainer.scrollIntoView({ behavior: "smooth" });
            document.getElementById("whatsappShareBtn").onclick = () => { /* ... whatsapp logic ... */ };
            document.getElementById("copyLinkBtn").onclick = () => { /* ... copy logic ... */ };
            alert("Invoice saved successfully!");
        } else {
            throw new Error(result.error || "Backend did not return a shareable link.");
        }
    } catch (error) {
      alert(`Error saving invoice: ${error.message}`);
      console.error("Save Invoice Error:", error);
    } finally {
      elements.saveLoader.style.display = "none";
      elements.saveInvoiceBtn.disabled = false;
    }
  }
  
  // --- 7. EVENT LISTENERS ---
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

  // --- 8. INITIALIZATION ---
  goToStep(1);
  fetchTariffs();
});