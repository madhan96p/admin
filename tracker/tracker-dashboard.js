document.addEventListener("DOMContentLoaded", () => {
  let allEntries = [];
  let performanceChart = null;
  let chartGrouping = "monthly";

  const formatCurrency = (num) =>
    parseFloat(num || 0).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    });

  async function loadDashboard() {
    try {
      const response = await fetch("/.netlify/functions/api?action=getFinancialData");
      const data = await response.json();
      if (data.entries) {
        allEntries = data.entries;
        updateDashboardView("7d");
      }
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    }
  }

  function updateDashboardView(range) {
    const filtered = filterByRange(allEntries, range);
    calculateMetrics(filtered);
    renderTable(filtered);
    // Note: Future update can include multi-dataset line chart for all accounts
  }

  function calculateMetrics(entries) {
    let m = { travels: 0, marketing: 0, company: 0, associates: 0, fuel: 0, jegan: 0, pragadeesh: 0, staff: 0 };

    entries.forEach(e => {
      const amt = parseFloat(e.Amount) || 0;
      const acc = e.Account;
      const sub = e.Sub_Category;

      // Business Unit Net
      if (acc === "Travels") m.travels += amt;
      if (acc === "Marketing") m.marketing += amt;
      if (acc === "Company") m.company += amt;
      if (acc === "Associates") m.associates += amt;

      // Operation Deep-Dive
      if (sub === "Fuel") m.fuel += Math.abs(amt);
      if (sub === "Jegan") m.jegan += Math.abs(amt);
      if (sub === "Pragadeesh") m.pragadeesh += Math.abs(amt);
      if (sub === "Salaries" || sub === "Advance") m.staff += Math.abs(amt);
    });

    document.getElementById("travels-profit").innerText = formatCurrency(m.travels);
    document.getElementById("marketing-profit").innerText = formatCurrency(m.marketing);
    document.getElementById("company-profit").innerText = formatCurrency(m.company);
    document.getElementById("associates-profit").innerText = formatCurrency(m.associates);
    document.getElementById("total-fuel").innerText = formatCurrency(m.fuel);
    document.getElementById("cost-jegan").innerText = formatCurrency(m.jegan);
    document.getElementById("cost-pragadeesh").innerText = formatCurrency(m.pragadeesh);
    document.getElementById("total-staff").innerText = formatCurrency(m.staff);
  }

  function renderTable(entries) {
    const body = document.getElementById("recent-transactions-body");
    body.innerHTML = entries.slice(0, 15).map(e => `
      <tr>
        <td>${e.Date}</td>
        <td class="mobile-hide"><span class="account-tag tag-${e.Account.toLowerCase()}">${e.Account}</span></td>
        <td>${e.Sub_Category}</td>
        <td class="mobile-hide"><small>${e.Reference || e.Particulars || '-'}</small></td>
        <td style="text-align: right; font-weight: bold; color: ${e.Amount < 0 ? '#b91c1c' : '#15803d'}">
          ${formatCurrency(e.Amount)}
        </td>
      </tr>
    `).join('');
  }

  function filterByRange(entries, range) {
    if (range === "all") return entries;
    const now = new Date();
    const days = parseInt(range);
    const cutoff = new Date();
    cutoff.setDate(now.getDate() - days);
    return entries.filter(e => new Date(e.Date) >= cutoff);
  }

  // UI Listeners
  document.querySelectorAll(".date-filter-group button").forEach(btn => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".date-filter-group button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      updateDashboardView(btn.dataset.range);
    });
  });

  loadDashboard();
});