/**
 * ====================================================================
 * Shrish Travels - Add Financial Entry Logic
 * ====================================================================
 */
document.addEventListener("DOMContentLoaded", () => {
  // --- 1. THE "BRAIN": Category Definitions ---
  // This object controls all your dropdowns.
  const categoryData = {
    Company: {
      Debit: {
        "Vehicle Expense": [
          "Fuel",
          "Fastag",
          "Permit/Tax",
          "Maintenance",
          "Vehicle EMI",
          "Insurance",
          "Parking",
        ],
        Operations: ["Driver Salary", "Driver Batta", "Staff Salary"],
        Admin: [
          "Office Rent",
          "Phone/Internet",
          "Bank Charges",
          "Marketing",
          "Software",
          "Other",
        ],
      },
      Credit: {
        "Client Revenue": ["Duty Slip Payment", "Corporate Contract", "Other"],
        "Other Income": ["Commission", "Vehicle Sale", "Other"],
      },
    },
    Personal: {
      Debit: {
        "Family Expense": [
          "Groceries",
          "Food (Outside)",
          "Utilities (EB, Gas)",
          "Medical",
        ],
        "Personal Expense": [
          "Rent",
          "EMI",
          "Credit Card Bill",
          "Shopping",
          "Entertainment",
          "Other",
        ],
        Investments: ["Mutual Fund", "Stock", "Other"],
      },
      Credit: {
        "Personal Income": ["Salary (Drawing)", "Other"],
      },
    },
  };

  // --- 2. Get All Page Elements ---
  const step1 = document.getElementById("step-1");
  const step2 = document.getElementById("step-2");

  const btnDebit = document.getElementById("btn-debit");
  const btnCredit = document.getElementById("btn-credit");
  const btnBack = document.getElementById("btn-back");
  const btnSubmit = document.getElementById("btn-submit");

  const formTitle = document.getElementById("form-title");
  const form = document.getElementById("step-2");

  // Form Fields
  const flowInput = document.getElementById("flow");
  const dateInput = document.getElementById("date");
  const amountInput = document.getElementById("amount");
  const accountSelect = document.getElementById("account");
  const categorySelect = document.getElementById("category");
  const subCategorySelect = document.getElementById("sub-category");
  const paymentMethodSelect = document.getElementById("payment-method");
  const particularsInput = document.getElementById("particulars");

  // --- 3. Setup Initial State ---
  dateInput.valueAsDate = new Date(); // Set today's date
  categorySelect.disabled = true;
  subCategorySelect.disabled = true;

  // --- 4. Event Listeners ---

  btnDebit.addEventListener("click", () => showForm("Debit"));
  btnCredit.addEventListener("click", () => showForm("Credit"));
  btnBack.addEventListener("click", showStep1);

  accountSelect.addEventListener("change", updateCategoryDropdown);
  categorySelect.addEventListener("change", updateSubCategoryDropdown);

  form.addEventListener("submit", handleFormSubmit);

  // --- 5. Core Functions ---

  function showForm(flow) {
    flowInput.value = flow;
    formTitle.textContent = `New ${flow} Transaction`;
    step1.style.display = "none";
    step2.style.display = "block";
    updateCategoryDropdown(); // Trigger dropdown update
  }

  function showStep1() {
    step2.style.display = "none";
    step1.style.display = "block";
    form.reset();
    dateInput.valueAsDate = new Date(); // Reset date
  }

  function updateCategoryDropdown() {
    const account = accountSelect.value;
    const flow = flowInput.value;

    // Clear previous options
    categorySelect.innerHTML =
      '<option value="">-- Select Category --</option>';
    subCategorySelect.innerHTML =
      '<option value="">-- Select Category First --</option>';

    if (!account || !flow) {
      categorySelect.disabled = true;
      subCategorySelect.disabled = true;
      return;
    }

    // Find the correct categories
    const categories = categoryData[account]?.[flow];
    if (!categories) {
      categorySelect.disabled = true;
      subCategorySelect.disabled = true;
      return;
    }

    // Add new options
    for (const categoryName of Object.keys(categories)) {
      const option = document.createElement("option");
      option.value = categoryName;
      option.textContent = categoryName;
      categorySelect.appendChild(option);
    }

    categorySelect.disabled = false;
    subCategorySelect.disabled = true;
  }

  function updateSubCategoryDropdown() {
    const account = accountSelect.value;
    const flow = flowInput.value;
    const category = categorySelect.value;

    // Clear previous options
    subCategorySelect.innerHTML =
      '<option value="">-- Select Sub-Category --</option>';

    if (!account || !flow || !category) {
      subCategorySelect.disabled = true;
      return;
    }

    // Find the correct sub-categories
    const subCategories = categoryData[account]?.[flow]?.[category];
    if (!subCategories) {
      subCategorySelect.disabled = true;
      return;
    }

    // Add new options
    for (const subCategoryName of subCategories) {
      const option = document.createElement("option");
      option.value = subCategoryName;
      option.textContent = subCategoryName;
      subCategorySelect.appendChild(option);
    }

    subCategorySelect.disabled = false;
  }

  async function handleFormSubmit(event) {
    event.preventDefault(); // Stop the form from reloading the page

    // Show loading state
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    // 1. Get all values
    const flow = flowInput.value;
    let amount = parseFloat(amountInput.value);

    // 2. *** IMPORTANT: Debit/Credit Logic ***
    // If it's a "Debit", make the number negative for the database.
    if (flow === "Debit" && amount > 0) {
      amount = amount * -1;
    }

    // 3. Build the data object
    const transactionData = {
      Date: dateInput.value,
      Flow: flow,
      Account: accountSelect.value,
      Category: categorySelect.value,
      Sub_Category: subCategorySelect.value,
      Amount: amount,
      Payment_Method: paymentMethodSelect.value,
      Particulars: particularsInput.value,
    };

    // 4. Send to API
    try {
      const response = await fetch(
        "/.netlify/functions/api?action=saveFinancialEntry",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(transactionData),
        },
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || "Failed to save transaction");
      }

      // 5. Success!
      alert(`Success! Transaction ${result.newId} saved.`);
      window.location.href = "index.html"; // Go back to the dashboard
    } catch (error) {
      console.error("Submission Error:", error);
      alert(`Error: ${error.message}`);
      // Restore button
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<i class="fas fa-save"></i> Save Transaction';
    }
  }
});
