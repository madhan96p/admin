// assets/js/salary-form.js - FINAL VERSION
document.addEventListener("DOMContentLoaded", () => {
  // assets/js/salary-form.js - FINAL VERSION
  // --- 1. STATE & ELEMENTS ---
  const state = { slipData: null, isEditMode: false, slipId: null };

  const form = document.getElementById("salary-form");
  const formTitle = document.getElementById("form-title");
  const driverSelect = document.getElementById("driver-select");
  const payPeriodInput = document.getElementById("pay-period");
  const employeeIdInput = document.getElementById("employee-id");
  const designationInput = document.getElementById("designation");
  const monthlySalaryInput = document.getElementById("monthly-salary");
  const outstationQtyInput = document.getElementById("outstation-qty");
  const extraDutyQtyInput = document.getElementById("extraduty-qty");
  const totalMonthDaysInput = document.getElementById("total-month-days");
  const lopDaysInput = document.getElementById("lop-days");
  const advanceDeductionInput = document.getElementById("advance-deduction");
  const netPayableDisplay = document.getElementById("net-payable-display");
  const approvalNotesSection = document.getElementById(
    "approval-notes-section",
  );
  const approvalNotesInput = document.getElementById("approval-notes");

  const founderSignatureSection = document.getElementById(
    "founder-signature-section",
  );
  const authSignatureImage = document.getElementById("auth-signature-image");
  const authSigPlaceholder = document.getElementById("auth-sig-placeholder");
  const actionsContainer = document.getElementById("actions-container");

  // --- 2. INITIALIZATION ---
  function init() {
    const params = new URLSearchParams(window.location.search);
    state.slipId = params.get("id");
    state.isEditMode = !!state.slipId;

    initializeSignaturePad("signature-canvas");
    populateDriverDropdown();
    setupEventListeners();

    if (state.isEditMode) {
      loadSlipForEditing(); // ✅ FIX: This function is now fully implemented
    } else {
      initializeCreateMode();
    }
  }

  // --- 3. UI RENDERING & MODE SETUP ---
  function initializeCreateMode() {
    formTitle.textContent = "Create New Salary Slip";
    setDefaultPayPeriod();
    renderUIForState();
  }

  async function loadSlipForEditing() {
    try {
      const response = await fetch(
        `/api?action=getSalarySlipById&id=${state.slipId}`,
      );
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      state.slipData = data.slip;
      populateForm();
      renderUIForState();
    } catch (error) {
      console.error(error);
      form.innerHTML = `<div class="error-state"><h3><i class="fas fa-exclamation-triangle"></i> Error Loading Slip</h3><p>${error.message}</p></div>`;
    }
  }

  function renderUIForState() {
    const status = state.slipData
      ? state.slipData.Status || "Pending Approval"
      : "Pending Approval";

    if (state.isEditMode) {
      formTitle.textContent = `Reviewing Slip: ${state.slipData.EmployeeName} (${state.slipData.PayPeriod})`;
      driverSelect.disabled = true;
      payPeriodInput.disabled = true;
    }

    founderSignatureSection.style.display =
      status === "Pending Approval" ? "block" : "none";

    if (status === "Approved" || status === "Finalized") {
      form.querySelectorAll("input, select").forEach((el) => {
        if (el.id !== "driver-select" && el.id !== "pay-period")
          el.readOnly = true;
      });
    }

    renderActionButtons(status);
  }

  function renderActionButtons(status) {
    let buttonsHtml = "";
    if (!state.isEditMode) {
      buttonsHtml = `<button type="button" id="create-btn" class="btn-primary"><i class="fas fa-paper-plane"></i> Save & Submit for Approval</button>`;
    } else {
      switch (status) {
        case "Pending Approval":
          buttonsHtml = `
                        <div class="form-actions-group">
                            <button type="button" id="update-btn" class="btn-secondary"><i class="fas fa-save"></i> Update Details</button>
                            <button type="button" id="override-approve-btn" class="btn-secondary"><i class="fas fa-user-shield"></i> Approve on Behalf</button>
                            <button type="button" id="approve-btn" class="btn-primary"><i class="fas fa-check-double"></i> Founder Approve & Sign</button>
                        </div>
                    `;
          break;
        case "Approved":
        case "Finalized":
          buttonsHtml = `<p class="form-locked-message"><i class="fas fa-lock"></i> This slip has been approved and is now locked.</p>`;
          break;
      }
    }
    actionsContainer.innerHTML = buttonsHtml;
  }

  // --- 4. FORM LOGIC & DATA POPULATION ---
  function populateForm() {
    const slip = state.slipData;
    driverSelect.value = slip.EmployeeName;
    payPeriodInput.value = slip.PayPeriod;
    updateDaysInMonth();
    handleDriverSelection();
    monthlySalaryInput.value = slip.MonthlySalary;
    advanceDeductionInput.value = slip.AdvanceDeduction;
    lopDaysInput.value = slip.LOPDays || 0;
    outstationQtyInput.value = slip.OutstationQty || 0;
    extraDutyQtyInput.value = slip.ExtraDutyQty || 0;

    if (slip.AuthSignature) {
      authSignatureImage.src = slip.AuthSignature;
      authSignatureImage.style.display = "block";
      authSigPlaceholder.style.display = "none";
    }
    calculateSalary();
  }

  function populateDriverDropdown() {
    if (typeof driverData === "undefined") return;
    driverSelect.innerHTML = '<option value="">-- Select Employee --</option>';
    for (const name in driverData) {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      driverSelect.appendChild(option);
    }
  }

  function handleDriverSelection() {
    const selectedName = driverSelect.value;
    const employee = driverData[selectedName];
    if (employee) {
      employeeIdInput.value = employee.id || "";
      designationInput.value = employee.designation || "";
      monthlySalaryInput.value = employee.monthlySalary || "";
    } else {
      // Clear fields if no driver is selected
      ["employee-id", "designation", "monthly-salary"].forEach(
        (id) => (document.getElementById(id).value = ""),
      );
    }
    calculateSalary();
  }

  function updateDaysInMonth() {
    const payPeriodValue = payPeriodInput.value;
    if (payPeriodValue) {
      const [year, month] = payPeriodValue.split("-");
      totalMonthDaysInput.value = new Date(year, month, 0).getDate();
    } else {
      totalMonthDaysInput.value = "";
    }
    calculateSalary();
  }

  function calculateSalary() {
    const monthlySalary = parseFloat(monthlySalaryInput.value) || 0;
    const outstationQty = parseFloat(outstationQtyInput.value) || 0;
    const outstationRate =
      parseFloat(document.getElementById("outstation-rate").value) || 0;
    const extraDutyQty =
      parseFloat(document.getElementById("extraduty-qty").value) || 0;
    const extraDutyRate =
      parseFloat(document.getElementById("extraduty-rate").value) || 0;
    const advanceDeduction = parseFloat(advanceDeductionInput.value) || 0;
    const lopDays = parseFloat(lopDaysInput.value) || 0;
    const totalMonthDays = parseFloat(totalMonthDaysInput.value) || 30;

    const outstationTotal = outstationQty * outstationRate;
    const extraDutyTotal = extraDutyQty * extraDutyRate;
    const perDaySalary =
      totalMonthDays > 0 ? monthlySalary / totalMonthDays : 0;
    const lopDeduction = perDaySalary * lopDays;

    const totalEarnings = monthlySalary + outstationTotal + extraDutyTotal;
    const totalDeductions = advanceDeduction + lopDeduction;
    const netPayable = totalEarnings - totalDeductions;

    netPayableDisplay.textContent = `₹ ${netPayable.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return {
      totalEarnings,
      totalDeductions,
      netPayable,
      outstationTotal,
      extraDutyTotal,
      lopDeduction,
      advanceDeduction,
    };
  }

  // --- 5. EVENT HANDLERS & API SUBMISSION ---
  function setupEventListeners() {
    driverSelect.addEventListener("change", handleDriverSelection);
    payPeriodInput.addEventListener("change", updateDaysInMonth);
    form.addEventListener("input", (e) => {
      if (e.target.type === "number" || e.target.type === "month")
        calculateSalary();
    });

    actionsContainer.addEventListener("click", (e) => {
      const target = e.target.closest("button");
      if (!target) return;

      switch (target.id) {
        case "create-btn":
          handleFormAction("create");
          break;
        case "update-btn":
          handleFormAction("update");
          break;
        case "approve-btn":
          if (authSignatureImage.src.includes("data:image")) {
            handleFormAction("approve");
          } else {
            alert("Founder signature is required to approve.");
          }
          break;
        case "override-approve-btn":
          approvalNotesSection.style.display = "block";
          const note = prompt(
            "Please enter the reason for overriding (e.g., Verbal approval from Founder):",
          );
          if (note && note.trim() !== "") {
            approvalNotesInput.value = note;
            handleFormAction("override");
          }
          break;
      }
    });

    const authSignatureBox = document.getElementById("auth-signature-box");
    if (authSignatureBox) {
      authSignatureBox.addEventListener("click", () =>
        openSignaturePad("auth-signature-image"),
      );
    }
  }

  async function handleFormAction(actionType) {
    const button = actionsContainer.querySelector(`#${actionType}-btn`);
    if (button) {
      button.disabled = true;
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    }

    const calcs = calculateSalary();
    const employee = driverData[driverSelect.value];
    let payload = {
      PayPeriod: payPeriodInput.value,
      EmployeeName: driverSelect.value,
      EmployeeID: employeeIdInput.value,
      Designation: designationInput.value,
      MonthlySalary: monthlySalaryInput.value,
      PayableDays:
        parseFloat(totalMonthDaysInput.value || 0) -
        parseFloat(lopDaysInput.value || 0),
      OutstationTotal: calcs.outstationTotal,
      ExtraDutyTotal: calcs.extraDutyTotal,
      TotalEarnings: calcs.totalEarnings,
      AdvanceDeduction: calcs.advanceDeduction,
      LOPDeduction: calcs.lopDeduction,
      TotalDeductions: calcs.totalDeductions,
      NetPayableAmount: calcs.netPayable,
      LOPDays: lopDaysInput.value,
      OutstationQty: outstationQtyInput.value,
      ExtraDutyQty: extraDutyQtyInput.value,
    };
    let apiAction = "";

    switch (actionType) {
      case "create":
        apiAction = "createSalarySlip";
        payload.Status = "Pending Approval";
        break;
      case "update":
        apiAction = "updateSalarySlip";
        payload.slipId = state.slipId;
        break;
      case "approve":
        apiAction = "updateSalarySlip";
        payload.slipId = state.slipId;
        payload.Status = "Approved";
        payload.AuthSignature = authSignatureImage.src;
        break;
      case "override":
        apiAction = "updateSalarySlip";
        payload.slipId = state.slipId;
        payload.Status = "Approved";
        payload.ApprovalNotes = approvalNotesInput.value;
        break;

        const employee = driverData[driverSelect.value];
        if (employee && employee.mobile) {
          payload.EmployeeMobile = employee.mobile;
        }
    }

    try {
      const response = await fetch(`/api?action=${apiAction}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      alert(`Success! ${result.message}`);
      window.location.href = "salary-slips.html";
    } catch (error) {
      console.error(`Failed to ${actionType} slip:`, error);
      alert(`Error: ${error.message}`);
      if (button) button.disabled = false;
      renderActionButtons(
        state.slipData ? state.slipData.Status : "Pending Approval",
      ); // Restore buttons
    }
  }

  function setDefaultPayPeriod() {
    const today = new Date();
    today.setMonth(today.getMonth() - 1);
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    payPeriodInput.value = `${year}-${month}`;
    updateDaysInMonth();
  }
  // --- 6. INITIALIZATION ---
  init();
});
