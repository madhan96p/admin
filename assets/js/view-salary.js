document.addEventListener("DOMContentLoaded", () => {
  // --- 1. ELEMENT REFERENCES ---
  const slipContainer = document.querySelector(".salary-slip-print");

  // Dynamic view containers
  const signaturePendingView = document.getElementById(
    "signature-pending-view",
  );
  const signatureCompleteView = document.getElementById(
    "signature-complete-view",
  );

  // Interactive elements
  const employeeSignatureBox = document.getElementById(
    "employee-signature-box",
  );
  const employeeNotesInput = document.getElementById("employee-notes");
  const finalizeSlipBtn = document.getElementById("finalize-slip-btn");
  const employeeSignatureImage = document.getElementById(
    "employee-signature-image",
  );

  // --- 2. INITIALIZATION ---
  async function init() {
    const params = new URLSearchParams(window.location.search);
    const slipId = params.get("id");

    if (!slipId) {
      document.body.innerHTML = `<h1>Error: No Salary Slip ID Provided.</h1>`;
      return;
    }

    // Initialize the signature pad from common.js
    initializeSignaturePad("signature-canvas");
    await fetchAndDisplaySlip(slipId);
  }

  // --- 3. DATA FETCHING & DISPLAY ---
  async function fetchAndDisplaySlip(slipId) {
    try {
      const response = await fetch(
        `/api?action=getSalarySlipById&id=${slipId}`,
      );
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const slip = data.slip;
      populateSlipDetails(slip);
      setupInteractiveElements(slip);
    } catch (error) {
      console.error("Failed to display slip:", error);
      slipContainer.innerHTML = `<h1>Error loading slip: ${error.message}</h1>`;
    }
  }

  // --- 4. HELPER FUNCTIONS ---

  /**
   * Fills all the placeholder spans and images with data from the slip object.
   */
  /**
   * Fills all the placeholder spans and images with data from the slip object.
   */
  function populateSlipDetails(slip) {
    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value || "";
    };

    const formatCurrency = (num, round = false) => {
      const options = {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: round ? 0 : 2, // Set to 0 if rounding
        maximumFractionDigits: round ? 0 : 2, // Set to 0 if rounding
      };
      // We use Math.round on the number *before* formatting
      const numberToFormat = round
        ? Math.round(parseFloat(num || 0))
        : parseFloat(num || 0);
      return numberToFormat.toLocaleString("en-IN", options);
    };

    // --- Get All Numeric Values ---
    const monthlySalary = parseFloat(slip.MonthlySalary || 0);
    const outstationTotal = parseFloat(slip.OutstationTotal || 0);
    const outstationQty = parseFloat(slip.OutstationQty || 0);
    const extraDutyTotal = parseFloat(slip.ExtraDutyTotal || 0);
    const extraDutyQty = parseFloat(slip.ExtraDutyQty || 0);
    const lopDeduction = parseFloat(slip.LOPDeduction || 0);
    const lopDays = parseFloat(slip.LOPDays || 0);
    const advanceDeduction = parseFloat(slip.AdvanceDeduction || 0);
    const totalEarnings = parseFloat(slip.TotalEarnings || 0);
    const totalDeductions = parseFloat(slip.TotalDeductions || 0);
    const netPayable = parseFloat(slip.NetPayableAmount || 0);

    // --- Calculate Rates for Context ---
    // We use default rates from the form if Qty is 0, otherwise calculate
    const outstationRate =
      outstationQty > 0 ? outstationTotal / outstationQty : 300;
    const extraDutyRate =
      extraDutyQty > 0 ? extraDutyTotal / extraDutyQty : 100;

    // --- Populate Header and Employee Info ---
    const payPeriodDate = new Date(`${slip.PayPeriod}-02`);
    setText(
      "print-pay-period",
      payPeriodDate.toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      }),
    );
    if (slip.DateGenerated) {
      setText(
        "print-generated-date",
        new Date(slip.DateGenerated).toLocaleDateString("en-GB"),
      );
    }
    setText("print-employee-name", slip.EmployeeName);
    setText("print-employee-id", slip.EmployeeID);
    setText("print-designation", slip.Designation);
    setText("print-payable-days", slip.PayableDays);

    // --- Populate Earnings Table ---
    setText("print-monthly-salary", formatCurrency(monthlySalary));
    setText("print-outstation-total", formatCurrency(outstationTotal));
    setText("print-extraduty-total", formatCurrency(extraDutyTotal));
    setText("print-total-earnings", formatCurrency(totalEarnings));

    // --- Populate Earnings Context ---
    setText("print-monthly-salary-context", `(For ${slip.PayableDays} Days)`);
    setText(
      "print-outstation-context",
      `(${outstationQty} Qty @ ${formatCurrency(outstationRate)})`,
    );
    setText(
      "print-extraduty-context",
      `(${extraDutyQty} Qty @ ${formatCurrency(extraDutyRate)})`,
    );

    // --- Populate Deductions Table ---
    setText("print-lop-deduction", formatCurrency(lopDeduction));
    setText("print-advance-deduction", formatCurrency(advanceDeduction));
    setText("print-total-deductions", formatCurrency(totalDeductions));

    // --- Populate Deductions Context ---
    setText("print-lop-context", `(${lopDays} Days)`);
    // No context needed for advance, but you could add one:
    // setText('print-advance-context', '(As requested)');

    // --- Populate Net Pay ---
    // Pass 'true' to formatCurrency to activate rounding
    setText("print-net-payable", formatCurrency(netPayable, true));

    // Use the same Math.round for the words
    setText(
      "print-net-payable-words",
      `(In Words: ${numberToWords(Math.round(netPayable))} Rupees Only)`,
    );

    // --- Populate Signatures ---
    const authSigImg = document.getElementById("print-auth-signature-image");
    if (authSigImg && slip.AuthSignature) authSigImg.src = slip.AuthSignature;

    const finalEmployeeSigImg = document.getElementById(
      "print-employee-signature-image",
    );
    if (finalEmployeeSigImg && slip.EmployeeSignature)
      finalEmployeeSigImg.src = slip.EmployeeSignature;

    // --- Populate NEW Notes Section ---
    const notesSection = document.getElementById("notes-section");
    const approvalNotesDisplay = document.getElementById(
      "approval-notes-display",
    );
    const employeeNotesDisplay = document.getElementById(
      "employee-notes-display",
    );
    let notesExist = false;

    if (slip.ApprovalNotes) {
      setText("print-approval-notes", slip.ApprovalNotes);
      approvalNotesDisplay.style.display = "block";
      notesExist = true;
    }
    if (slip.ENotes) {
      setText("print-employee-notes", slip.ENotes);
      employeeNotesDisplay.style.display = "block";
      notesExist = true;
    }

    if (notesExist) {
      notesSection.style.display = "block";
    }
  }

  /**
   * Sets up the interactive parts of the page based on the slip's status.
   */
  function setupInteractiveElements(slip) {
    // Check if the employee has already signed.
    if (slip.EmployeeSignature && slip.Status === "Finalized") {
      // Slip is already complete, show the finalized view
      signaturePendingView.style.display = "none";
      signatureCompleteView.style.display = "block";
    } else {
      // Slip is awaiting employee signature
      signaturePendingView.style.display = "block";
      signatureCompleteView.style.display = "none";

      // Attach event listeners for signing
      if (employeeSignatureBox) {
        employeeSignatureBox.addEventListener("click", () =>
          openSignaturePad("employee-signature-image"),
        );
      }
      if (finalizeSlipBtn) {
        finalizeSlipBtn.addEventListener("click", () =>
          handleFinalizeSubmit(slip),
        );
      }
    }
  }

  /**
   * Handles the final submission by the employee.
   */
  async function handleFinalizeSubmit(slip) {
    if (
      !employeeSignatureImage.src ||
      !employeeSignatureImage.src.startsWith("data:image")
    ) {
      return alert("Please provide your signature before confirming.");
    }

    finalizeSlipBtn.disabled = true;
    finalizeSlipBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Finalizing...';

    const payload = {
      slipId: `${slip.EmployeeID}-${slip.PayPeriod}`, // Use the unique ID
      Status: "Finalized",
      EmployeeSignature: employeeSignatureImage.src,
      ENotes: employeeNotesInput.value,
    };

    try {
      const response = await fetch("/api?action=updateSalarySlip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      // Success! Update the UI to show the completed state.
      alert("Thank you! Your salary slip has been finalized.");
      signaturePendingView.style.display = "none";
      signatureCompleteView.style.display = "block";
    } catch (error) {
      console.error("Failed to finalize slip:", error);
      alert(`Error: Could not finalize slip. ${error.message}`);
      finalizeSlipBtn.disabled = false;
      finalizeSlipBtn.innerHTML =
        '<i class="fas fa-check-circle"></i> Confirm & Accept Salary Slip';
    }
  }

  /**
   * Converts a number to its word representation (for the final amount).
   * Sourced from the original salary_slip.js file.
   */
  function numberToWords(num) {
    if (num === 0) return "Zero";
    const a = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];
    const b = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];
    const n = ("000000000" + num)
      .substr(-9)
      .match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return "";
    let str = "";
    str +=
      n[1] != 0
        ? (a[Number(n[1])] || b[n[1][0]] + " " + a[n[1][1]]) + " Crore "
        : "";
    str +=
      n[2] != 0
        ? (a[Number(n[2])] || b[n[2][0]] + " " + a[n[2][1]]) + " Lakh "
        : "";
    str +=
      n[3] != 0
        ? (a[Number(n[3])] || b[n[3][0]] + " " + a[n[3][1]]) + " Thousand "
        : "";
    str += n[4] != 0 ? a[Number(n[4])] + " Hundred " : "";
    str +=
      n[5] != 0
        ? (str !== "" ? "and " : "") +
          (a[Number(n[5])] || b[n[5][0]] + " " + a[n[5][1]])
        : "";
    return str.trim();
  }

  // --- 5. INITIALIZE THE PAGE ---
  init();
});
