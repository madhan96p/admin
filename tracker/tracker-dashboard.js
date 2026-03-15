/**
 * Financial Dashboard Controller
 * Handles data fetching, filtering by date range, and DOM injection.
 */

document.addEventListener("DOMContentLoaded", () => {
  // --- State Management ---
  let allEntries = []; // Stores the master list from API
  let chartInstance = null;
  let currentChartGroup = "monthly";
  
  // --- Utilities ---
  
  /**
   * Formats numbers into Indian Rupee currency format.
   * @param {number} num - The value to format.
   */
  const formatCurrency = (num) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(num || 0);

  // --- Core Functions ---

  /**
   * Fetches data from the Netlify Function API.
   */
  async function loadDashboard() {
    const tableBody = document.getElementById("recent-transactions-body");
    
    try {
      // Show a loading state in the table
      if (tableBody) tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center">Loading data...</td></tr>';

      const response = await fetch("/.netlify/functions/api?action=getFinancialData");
      
      if (!response.ok) throw new Error(` HTTP error! status: ${response.status}`);
      
      const data = await response.json();

      if (data && data.entries) {
        allEntries = data.entries;
        // Fetch the currently active range directly from the DOM
        const activeRangeBtn = document.querySelector(".date-filter-group button.active");
        updateDashboardView(activeRangeBtn ? activeRangeBtn.getAttribute("data-range") : "30d"); 
      } else {
        throw new Error("Invalid data format received");
      }
    } catch (err) {
      console.error("Dashboard Load Failed:", err);
      if (tableBody) tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red">Error: ${err.message}</td></tr>`;
    }
  }

  /**
   * Orchestrates the filtering and rendering process.
   * @param {string} range - Days to look back (e.g., "7", "30", "all")
   */
  function updateDashboardView(range) {
    const filtered = filterByRange(allEntries, range);
    
    // Update UI Components
    calculateMetrics(filtered);
    renderTable(filtered);
    renderChart(filtered, currentChartGroup);
  }

  /**
   * Filters entries based on the 'Date' field.
   */
  function filterByRange(entries, range) {
    if (range === "all") return entries;

    const days = parseInt(range);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    cutoff.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

    return entries.filter(e => {
      const entryDate = new Date(e.Date);
      return entryDate >= cutoff;
    });
  }

  /**
   * Calculates sums for Business Units and Operational categories.
   */
  function calculateMetrics(entries) {
    const m = { 
        travels: 0, marketing: 0, company: 0, associates: 0, 
        fuel: 0, jegan: 0, pragadeesh: 0, staff: 0 
    };

    entries.forEach(e => {
      const amt = parseFloat(e.Amount) || 0;
      const acc = e.Account;
      const sub = e.Sub_Category;

      // Logic for Business Unit Totals
      if (acc === "Travels") m.travels += amt;
      if (acc === "Marketing") m.marketing += amt;
      if (acc === "Company") m.company += amt;
      if (acc === "Associates") m.associates += amt;

      // Logic for Operational Deep-Dive (Absolute values for costs)
      if (sub === "Fuel") m.fuel += Math.abs(amt);
      if (sub === "Jegan") m.jegan += Math.abs(amt);
      if (sub === "Pragadeesh") m.pragadeesh += Math.abs(amt);
      if (sub === "Salaries" || sub === "Advance") m.staff += Math.abs(amt);
    });

    // Helper to safely update text content
    const setTxt = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = formatCurrency(val);
    };

    setTxt("travels-profit", m.travels);
    setTxt("marketing-profit", m.marketing);
    setTxt("company-profit", m.company);
    setTxt("associates-profit", m.associates);
    setTxt("total-fuel", m.fuel);
    setTxt("cost-jegan", m.jegan);
    setTxt("cost-pragadeesh", m.pragadeesh);
    setTxt("total-staff", m.staff);
  }

  /**
   * Renders the transaction list into the HTML table.
   */
  function renderTable(entries) {
    const body = document.getElementById("recent-transactions-body");
    if (!body) return;

    if (entries.length === 0) {
        body.innerHTML = '<tr><td colspan="5" style="text-align:center">No data found for this period.</td></tr>';
        return;
    }

    body.innerHTML = entries.slice(0, 15).map(e => {
      const isNegative = parseFloat(e.Amount) < 0;
      return `
        <tr>
          <td>${e.Date}</td>
          <td class="mobile-hide"><span class="account-tag tag-${(e.Account || '').toLowerCase()}">${e.Account}</span></td>
          <td>${e.Sub_Category}</td>
          <td class="mobile-hide"><small>${e.Reference || e.Particulars || '-'}</small></td>
          <td style="text-align: right; font-weight: bold; color: ${isNegative ? '#b91c1c' : '#15803d'}">
            ${formatCurrency(e.Amount)}
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Groups data and renders the Chart.js performance chart
   */
  function renderChart(entries, grouping) {
    const canvas = document.getElementById("main-performance-chart");
    if (!canvas) return;
    
    if (chartInstance) {
      chartInstance.destroy(); // Clear old chart to prevent overlap bugs
    }

    const aggregatedData = {};

    entries.forEach(e => {
      const amt = parseFloat(e.Amount) || 0;
      const date = new Date(e.Date);
      if (isNaN(date.getTime())) return; // Skip invalid dates

      let sortKey, displayLabel;
      
      // Determine bucketing strategy
      if (grouping === 'daily') {
        sortKey = date.toISOString().split('T')[0]; // Outputs YYYY-MM-DD for clean sorting
        displayLabel = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      } else if (grouping === 'monthly') {
        sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        displayLabel = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      } else if (grouping === 'yearly') {
        sortKey = date.getFullYear().toString();
        displayLabel = sortKey;
      }

      // Initialize bucket
      if (!aggregatedData[sortKey]) {
        aggregatedData[sortKey] = { label: displayLabel, income: 0, expense: 0, transfer: 0 };
      }

      // Calculate separation based on actual Flow rather than just amount polarity
      const flow = e.Flow;
      if (flow === "Credit") {
        aggregatedData[sortKey].income += amt;
      } else if (flow === "Debit") {
        aggregatedData[sortKey].expense += Math.abs(amt); // Debits are negative, chart uses positive bars
      } else if (flow === "Transfer") {
        aggregatedData[sortKey].transfer += amt;
      }
    });

    // Sort dates chronologically before rendering
    const sortedKeys = Object.keys(aggregatedData).sort();
    const labels = sortedKeys.map(k => aggregatedData[k].label);
    const incomeData = sortedKeys.map(k => aggregatedData[k].income);
    const expenseData = sortedKeys.map(k => aggregatedData[k].expense);
    const transferData = sortedKeys.map(k => aggregatedData[k].transfer);

    chartInstance = new Chart(canvas.getContext("2d"), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { 
            label: 'Revenue (Credits)', 
            data: incomeData, 
            backgroundColor: 'rgba(16, 185, 129, 0.85)', 
            hoverBackgroundColor: '#10b981',
            borderRadius: 4, 
            maxBarThickness: 35
          },
          { 
            label: 'Expenses (Debits)', 
            data: expenseData, 
            backgroundColor: 'rgba(239, 68, 68, 0.85)', 
            hoverBackgroundColor: '#ef4444',
            borderRadius: 4, 
            maxBarThickness: 35
          },
          { 
            label: 'Net Transfers', 
            data: transferData, 
            backgroundColor: 'rgba(59, 130, 246, 0.85)', 
            hoverBackgroundColor: '#3b82f6',
            borderRadius: 4, 
            maxBarThickness: 35
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        layout: {
          padding: 10
        },
        scales: {
          x: {
            grid: { display: false, drawBorder: false },
            ticks: { font: { family: "'Inter', sans-serif" } }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: '#e5e7eb',
              borderDash: [5, 5],
              drawBorder: false
            },
            ticks: {
              font: { family: "'Inter', sans-serif" },
              callback: value => '₹' + value.toLocaleString('en-IN')
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 20,
              font: { family: "'Inter', sans-serif", size: 12 }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(17, 24, 39, 0.9)',
            titleFont: { family: "'Inter', sans-serif", size: 13 },
            bodyFont: { family: "'Inter', sans-serif", size: 13 },
            padding: 12,
            usePointStyle: true,
            boxPadding: 6,
            callbacks: { 
              label: context => context.dataset.label + ': ' + formatCurrency(context.parsed.y) 
            }
          }
        }
      }
    });
  }

  // --- Event Listeners ---

  document.querySelectorAll(".date-filter-group button").forEach(btn => {
    btn.addEventListener("click", () => {
      // Toggle active class
      document.querySelectorAll(".date-filter-group button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      // Update data view based on data-range attribute
      updateDashboardView(btn.getAttribute("data-range"));
    });
  });

  document.querySelectorAll(".chart-toggle-group button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".chart-toggle-group button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentChartGroup = btn.getAttribute("data-group");
      const activeRange = document.querySelector(".date-filter-group button.active").getAttribute("data-range");
      updateDashboardView(activeRange);
    });
  });

  // Initialize
  loadDashboard();
});