document.addEventListener("DOMContentLoaded", () => {
  const categoryData = {
    Common: {
      Debit: {
        "Office & Utilities": ["Office Rent", "Electricity (EB)", "Internet", "Mobile Recharge", "Maintenance", "Furniture/Office Exp", "Other"],
        "Human Resources": ["Salaries", "Advance", "Jegan", "Pragadeesh", "Other"],
        "Financial": ["Credit Card Bill", "EMI Payment", "Bank Charges", "Taxes/GST", "Other"],
        "Lifestyle & Admin": ["Food & Drinks", "General Travel", "Other"]
      }
    },
    Travels: {
      Debit: {
        "Vehicle Operations": ["Fuel", "Fastag", "Permit/Tax", "Maintenance", "Vehicle EMI", "Insurance", "Parking", "Other"],
        "Travels": ["Saradha Travels", "ATC Travels", "Bee Cabs", "Other"]
      },
      Credit: { "Client Revenue": ["Direct Revenue", "Other Income"],
        "Travels": ["Saradha Travels", "ATC Travels", "Bee Cabs", "Online Duty", "Other"]
       }
    },
    Company: {
      Debit: { "Core Operations": ["Software/SaaS", "Professional Fees", "Licensing", "Other"] },
      Credit: { "Corporate Revenue": ["Service Fees", "Consulting", "Other"] }
    },
    Associates: {
      Debit: { "Partner Payouts": ["Commission", "Shared Revenue", "Referral Fees", "Other"] },
      Credit: { "Partner Income": ["Partner Deposits", "Reimbursements", "Other"] }
    },
    Marketing: {
      Debit: {
        "Trading": ["Demat Deposit", "Exchange Transfer", "Other"],
        "Growth": ["Ad Spend", "Graphic Design", "Social Media", "Other"]
      },
      Credit: { "Trading Returns": ["Demat Withdrawal", "Profit Payout", "Dividends", "Other"] }
    }
  };

  const allAccounts = ["Company", "Travels", "Associates", "Marketing"];

  // Elements
  const flowButtons = document.querySelectorAll(".btn-flow");
  const flowInput = document.getElementById("flow");
  const step1 = document.getElementById("step-1");
  const entryForm = document.getElementById("entry-form");
  const accountSelect = document.getElementById("account");
  const categorySelect = document.getElementById("category");
  const subCategorySelect = document.getElementById("sub-category");

  // Step 1: Picking Flow (Debit/Credit/Transfer)
  flowButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      flowInput.value = btn.dataset.flow;
      step1.style.display = "none";
      entryForm.style.display = "block";
      updateDropdowns();
    });
  });

  // Step 2: Back button to return to Flow Picker
  document.getElementById("btn-back-step")?.addEventListener("click", () => {
    entryForm.style.display = "none";
    step1.style.display = "block";
  });

  function updateDropdowns() {
    const flow = flowInput.value;
    const account = accountSelect.value;
    if (!flow || !account) return;

    categorySelect.innerHTML = '<option value="">-- Select Category --</option>';
    subCategorySelect.innerHTML = '<option value="">-- Select Sub-Category --</option>';

    if (flow === "Transfer") {
      categorySelect.add(new Option("Internal Transfer", "Internal Transfer"));
      categorySelect.value = "Internal Transfer";
      allAccounts.forEach(acc => {
        if (acc !== account) subCategorySelect.add(new Option(`To ${acc} Account`, acc));
      });
      subCategorySelect.add(new Option("To Personal/Drawings", "Personal Draw"));
    } else {
      const accountSpecific = categoryData[account]?.[flow] || {};
      const common = (flow === "Debit") ? categoryData.Common.Debit : {};
      const merged = { ...common, ...accountSpecific };
      Object.keys(merged).forEach(cat => categorySelect.add(new Option(cat, cat)));
    }
  }

  categorySelect.addEventListener("change", () => {
    const flow = flowInput.value;
    const account = accountSelect.value;
    const category = categorySelect.value;
    if (flow === "Transfer") return;

    subCategorySelect.innerHTML = '<option value="">-- Select Sub-Category --</option>';
    const accountSpecific = categoryData[account]?.[flow] || {};
    const common = (flow === "Debit") ? categoryData.Common.Debit : {};
    const merged = { ...common, ...accountSpecific };

    if (merged[category]) {
      merged[category].forEach(sub => subCategorySelect.add(new Option(sub, sub)));
    }
  });

  accountSelect.addEventListener("change", updateDropdowns);

  // Form Submit
  entryForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    let amount = parseFloat(document.getElementById("amount").value);
    const flow = flowInput.value;

    if ((flow === "Debit" || flow === "Transfer") && amount > 0) amount *= -1;

    const data = {
      Date: document.getElementById("date").value,
      Flow: flow,
      Account: accountSelect.value,
      Category: categorySelect.value,
      Sub_Category: subCategorySelect.value,
      Amount: amount,
      Payment_Method: document.getElementById("payment-method").value,
      Reference: document.getElementById("reference").value,
      Particulars: document.getElementById("particulars").value,
      Timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch("/.netlify/functions/api?action=saveFinancialEntry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        alert("Saved!");
        window.location.href = "index.html";
      }
    } catch (err) {
      alert("Error saving: " + err.message);
    }
  });
});