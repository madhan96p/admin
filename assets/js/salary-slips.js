document.addEventListener("DOMContentLoaded", () => {
  // --- 1. ELEMENT REFERENCES ---
  const tableBody = document.getElementById("slips-table-body");
  const searchInput = document.getElementById("search-input");
  const retryButton = document.getElementById("retry-fetch-btn");

  // State management containers from salary-slips.html
  const resultsContainer = document.getElementById("results-container");
  const skeletonLoader = document.getElementById("skeleton-loader");
  const emptyState = document.getElementById("empty-state");
  const errorState = document.getElementById("error-state");
  const tableContainer = document.querySelector(".table-container");

  // --- 2. STATE MANAGEMENT ---
  let state = {
    allSlips: [],
    isLoading: true,
    error: null,
    searchTerm: "",
  };
  let searchTimeout;

  // --- 3. DATA FETCHING ---
  async function loadSalarySlips() {
    state.isLoading = true;
    render(); // Show skeleton loader

    try {
      // Fetch data from the API endpoint we created
      const response = await fetch("/api?action=getAllSalarySlips");
      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // Sort by date, newest first, for a logical display order
      state.allSlips = data.slips
        ? data.slips.sort(
            (a, b) => new Date(b.DateGenerated) - new Date(a.DateGenerated),
          )
        : [];
      state.error = null;
    } catch (error) {
      console.error("Failed to load salary slips:", error);
      state.error = error.message;
    } finally {
      state.isLoading = false;
      render(); // Render the final state (table, empty, or error)
    }
  }

  // --- 4. RENDERING LOGIC ---
  function render() {
    // Toggle visibility of the main state containers
    skeletonLoader.style.display = state.isLoading ? "block" : "none";
    errorState.style.display = state.error ? "flex" : "none";

    if (state.isLoading || state.error) {
      tableContainer.style.display = "none";
      emptyState.style.display = "none";
      return;
    }

    const filteredSlips = getFilteredSlips();
    emptyState.style.display = filteredSlips.length === 0 ? "flex" : "none";
    tableContainer.style.display = filteredSlips.length > 0 ? "block" : "none";

    if (filteredSlips.length > 0) {
      renderTable(filteredSlips);
    }
  }

  function getFilteredSlips() {
    const lowerCaseSearch = state.searchTerm.toLowerCase();
    return state.allSlips.filter((slip) => {
      // Search by Employee Name or Pay Period (e.g., "2025-10")
      return (
        !lowerCaseSearch ||
        (slip.EmployeeName || "").toLowerCase().includes(lowerCaseSearch) ||
        (slip.PayPeriod || "").toLowerCase().includes(lowerCaseSearch)
      );
    });
  }

  function renderTable(slips) {
    const fragment = document.createDocumentFragment();
    slips.forEach((slip) => {
      const row = document.createElement("tr");
      const status = slip.Status || "Pending Approval";
      const statusClass = status.toLowerCase().replace(/ /g, "-");

      // Format Pay Period from "YYYY-MM" to "Month YYYY"
      const payPeriodDate = new Date(`${slip.PayPeriod}-02`); // Use day 02 to avoid timezone issues
      const formattedPeriod = payPeriodDate.toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      });

      // Format Net Pay as Indian Rupee currency
      const formattedNetPay = formatCurrency(slip.NetPayableAmount);

      // Calculate and Format Gross Pay
      const grossPay = parseFloat(slip.TotalEarnings || 0);
      const formattedGrossPay = formatCurrency(grossPay);

      // Format Total Deductions
      const formattedTotalDeductions = formatCurrency(slip.TotalDeductions);

      // Create deduction breakdown for tooltip
      const formattedAdvance = formatCurrency(slip.AdvanceDeduction);
      const formattedLOP = formatCurrency(slip.LOPDeduction);
      const deductionTooltip = `Advance: ${formattedAdvance} | LOP: ${formattedLOP}`;

      row.innerHTML = `
                <td data-label="Status"><span class="status-badge status-${statusClass}">${status}</span></td>
                <td data-label="Pay Period"><div class="cell-primary">${formattedPeriod}</div></td>
                <td data-label="Employee"><div class="cell-primary">${slip.EmployeeName}</div><div class="cell-secondary">${slip.EmployeeID}</div></td>
                <td data-label="Gross Pay"><div class="cell-primary">${formattedGrossPay}</div></td>
                <td data-label="Net Pay"><div class="cell-primary">${formattedNetPay}</div><div class="cell-secondary" title="${deductionTooltip}">Deductions: ${formattedTotalDeductions}</div></td>
                <td data-label="Generated On"><div class="cell-secondary">${new Date(slip.DateGenerated).toLocaleDateString("en-GB")}</div></td>
                <td class="actions-cell" data-label="Actions">
                    <div class="actions-cell-content">
                        ${generateActionButtons(slip)}
                    </div>
                </td>`;
      fragment.appendChild(row);
    });

    tableBody.innerHTML = ""; // Clear previous content
    tableBody.appendChild(fragment);
  }

  /**
   * Generates the correct action buttons based on the slip's status.
   * This is the core of the workflow logic on the dashboard.
   */
  function generateActionButtons(slip) {
    const status = slip.Status || "Pending Approval";
    const slipId = `${slip.EmployeeID}-${slip.PayPeriod}`;
    let actionsHtml = "";

    switch (status) {
      case "Pending Approval":
        actionsHtml = `<a href="salary-form.html?id=${slipId}" class="action-btn edit" title="Edit & Approve"><i class="fas fa-pencil-alt"></i></a>`;
        break;
      case "Approved":
        actionsHtml = `
                    <a href="view-salary.html?id=${slipId}" target="_blank" class="action-btn print" title="View Slip"><i class="fas fa-eye"></i></a>
                    <button class="action-btn share share-btn" data-slip-id="${slipId}" data-employee-name="${slip.EmployeeName}" title="Share with Employee"><i class="fab fa-whatsapp"></i></button>`;
        break;
      case "Finalized":
        actionsHtml = `<a href="view-salary.html?id=${slipId}" target="_blank" class="action-btn view-final" title="View Final Slip"><i class="fas fa-check-circle"></i></a>`;
        break;
    }
    return actionsHtml;
  }

  function handleShareWithEmployee(button) {
    const employeeName = button.dataset.employeeName;
    const slipId = button.dataset.slipId;

    // Find the employee's mobile number from the global driverData object
    const employee = Object.values(driverData).find(
      (d) => d.id === slipId.split("-")[0],
    );
    if (!employee || !employee.mobile) {
      return alert(
        `Could not find mobile number for ${employeeName} in common.js`,
      );
    }

    const mobile = employee.mobile;
    const viewLink = `${window.location.origin}/view-salary.html?id=${slipId}`;
    const message = `Dear ${employeeName},\n\nYour salary slip is ready for viewing. Please review and finalize it using the secure link below.\n\nLink: ${viewLink}\n\n- Shrish Travels`;

    window.open(
      `https://wa.me/91${mobile}?text=${encodeURIComponent(message.trim())}`,
      "_blank",
    );
  }

  // --- 5. EVENT LISTENERS ---
  function setupEventListeners() {
    // Debounced search input
    searchInput.addEventListener("input", () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        state.searchTerm = searchInput.value;
        render();
      }, 300);
    });

    // Retry button for network errors
    retryButton.addEventListener("click", loadSalarySlips);
    tableBody.addEventListener("click", (e) => {
      const shareButton = e.target.closest(".share-btn");
      if (shareButton) {
        handleShareWithEmployee(shareButton);
      }
    });
  }

  // --- 6. INITIALIZATION ---
  function init() {
    setupEventListeners();
    loadSalarySlips();
  }

  init();
});
