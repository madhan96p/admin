/**
 * ====================================================================
 * Shrish Travels - Financial Dashboard Logic (v2.0 with Filters)
 * ====================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Get All Page Elements ---
    
    // Charts
    const companyChartCtx = document.getElementById('company-chart')?.getContext('2d');
    const personalChartCtx = document.getElementById('personal-chart')?.getContext('2d');
    const companyBarChartCtx = document.getElementById('company-bar-chart')?.getContext('2d');
    
    // Summary Cards
    const companyProfitEl = document.getElementById('company-profit');
    const companyIncomeEl = document.getElementById('company-income');
    const companyExpenseEl = document.getElementById('company-expense');
    const personalExpenseEl = document.getElementById('personal-expense');
    
    // Table
    const transactionsTableBody = document.getElementById('recent-transactions-body');

    // --- 2. Global Variables ---
    
    let allEntries = []; // This will store ALL data from the API
    
    // Chart instances (to destroy before redrawing)
    let companyBarChartInstance = null;
    let companyChartInstance = null;
    let personalChartInstance = null;
    let barChartType = 'bar'; // 'bar' or 'line'
    let barChartGrouping = 'monthly'; // 'daily', 'monthly', or 'yearly'
    
    // --- 3. Main Function to Fetch Data (Runs Once) ---
    
    async function loadDashboardData() {
        try {
            transactionsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Loading data...</td></tr>';
            
            const response = await fetch('/.netlify/functions/api?action=getFinancialData');
            if (!response.ok) {
                throw new Error(`API Error: ${response.statusText}`);
            }
            
            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }

            allEntries = data.entries || []; // Store ALL entries globally
            
            if (allEntries.length === 0) {
                transactionsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No transactions found.</td></tr>';
                return;
            }
            
            // --- CALL OUR NEW UPDATE FUNCTION ---
            // This will show the default '1W' (7d) view
            updateDashboardView('7d'); 
            
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            transactionsTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">Error: ${error.message}</td></tr>`;
        }
    }

    // --- 4. Main Function to Filter and Update Dashboard ---
    
    function updateDashboardView(range = '7d') { // Default to '7d' (1 Week)
        
        // --- 4.1. Filter Entries by Date ---
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of today for accurate comparison
        let filteredEntries = [];

        if (range === 'all') {
            filteredEntries = allEntries;
        } else if (range === '1d') {
            filteredEntries = allEntries.filter(entry => {
                const entryDate = new Date(entry.Date);
                entryDate.setHours(0, 0, 0, 0);
                return entryDate.getTime() === today.getTime();
            });
        } else {
            // Handle 7d, 30d, 365d
            const days = parseInt(range.replace('d', ''));
            const cutoffDate = new Date(today);
            cutoffDate.setDate(today.getDate() - (days - 1)); // -1 to include today

            filteredEntries = allEntries.filter(entry => {
                const entryDate = new Date(entry.Date);
                return entryDate >= cutoffDate;
            });
        }
        
        // --- 4.2. Process Data and Calculate Totals ---
        let companyIncome = 0;
        let companyExpense = 0;
        let personalExpense = 0;
        const companyExpenseCategories = {};
        const personalExpenseCategories = {};

        for (const entry of filteredEntries) { // Use filteredEntries
            const amount = parseFloat(entry.Amount) || 0;
            if (entry.Account === 'Company') {
                if (entry.Flow === 'Credit') {
                    companyIncome += amount;
                } else if (entry.Flow === 'Debit') {
                    companyExpense += amount;
                    const category = entry.Category || 'Uncategorized';
                    companyExpenseCategories[category] = (companyExpenseCategories[category] || 0) + Math.abs(amount);
                }
            } else if (entry.Account === 'Personal' && entry.Flow === 'Debit') {
                personalExpense += amount;
                const category = entry.Category || 'Uncategorized';
                personalExpenseCategories[category] = (personalExpenseCategories[category] || 0) + Math.abs(amount);
            }
        }
        const companyProfit = companyIncome + companyExpense;

        const monthlyData = {}; // This is now 'groupedData'
        
        // Loop through filtered entries, reverse for chronological order
        for (const entry of filteredEntries.slice().reverse()) {
            if (entry.Account !== 'Company') continue;
            
            const date = new Date(entry.Date);
            let groupKey = '';

            // --- NEW GROUPING LOGIC ---
            switch (barChartGrouping) {
                case 'daily':
                    // Group by 'YYYY-MM-DD'
                    groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    break;
                case 'yearly':
                    // Group by 'YYYY'
                    groupKey = `${date.getFullYear()}`;
                    break;
                case 'monthly':
                default:
                    // Group by 'YYYY-MM'
                    groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            }
            // --- END NEW GROUPING LOGIC ---

            if (!monthlyData[groupKey]) {
                monthlyData[groupKey] = { income: 0, expense: 0 };
            }
            
            const amount = parseFloat(entry.Amount) || 0;
            if (entry.Flow === 'Credit') {
                monthlyData[groupKey].income += amount;
            } else if (entry.Flow === 'Debit') {
                monthlyData[groupKey].expense += Math.abs(amount);
            }
        }
        // --- 4.4. Update Summary Cards ---
        const formatCurrency = (num) => {
            return num.toLocaleString('en-IN', {
                style: 'currency',
                currency: 'INR',
                minimumFractionDigits: 2,
            });
        };
        companyProfitEl.textContent = formatCurrency(companyProfit);
        companyIncomeEl.textContent = formatCurrency(companyIncome);
        companyExpenseEl.textContent = formatCurrency(Math.abs(companyExpense));
        personalExpenseEl.textContent = formatCurrency(Math.abs(personalExpense));
        
        // --- 4.5. Populate Recent Transactions Table ---
        transactionsTableBody.innerHTML = ''; // Clear the table
        const recentEntries = filteredEntries.slice(0, 10); // Show top 10 of the filtered list

        if (recentEntries.length === 0) {
            transactionsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No transactions found for this period.</td></tr>';
        } else {
            for (const entry of recentEntries) {
                const row = document.createElement('tr');
                const amount = parseFloat(entry.Amount) || 0;
                const amountColor = amount < 0 ? 'red' : 'green';
                row.innerHTML = `
                    <td>${entry.Date || 'N/A'}</td>
                    <td class="mobile-hide">${entry.Account || 'N/A'}</td>
                    <td>${entry.Category || 'N/A'}</td>
                    <td class="mobile-hide">${entry.Particulars || 'N/A'}</td>
                    <td style="text-align: right; color: ${amountColor}; font-weight: 500;">
                        ${formatCurrency(amount)}
                    </td>
                `;
                transactionsTableBody.appendChild(row);
            }
        }

        // --- 4.6. Render All Charts ---
        if (companyBarChartCtx) {
            renderBarChart(companyBarChartCtx, monthlyData);
        }
        if (companyChartCtx) {
            renderDonutChart(companyChartCtx, 'company', companyExpenseCategories);
        }
        if (personalChartCtx) {
            renderDonutChart(personalChartCtx, 'personal', personalExpenseCategories);
        }
    }

    // --- 5. Helper Functions to Create Charts ---
    
    // Helper to format currency for chart tooltips
    const formatChartCurrency = (num) => {
        return num.toLocaleString('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
        });
    };

    function renderDonutChart(ctx, chartType, categoryData) {
        // Destroy the old chart if it exists, to prevent flickering
        if (chartType === 'company' && companyChartInstance) {
            companyChartInstance.destroy();
        } else if (chartType === 'personal' && personalChartInstance) {
            personalChartInstance.destroy();
        }

        const labels = Object.keys(categoryData);
        const data = Object.values(categoryData);

        const chartConfig = {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Expenses',
                    data: data,
                    backgroundColor: [
                        '#4f46e5', '#ef4444', '#f59e0b', '#10b981',
                        '#3b82f6', '#6366f1', '#ec4899', '#8b5cf6'
                    ],
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                let value = context.raw || 0;
                                return `${label}: ${formatChartCurrency(value)}`;
                            }
                        }
                    }
                }
            }
        };

        if (chartType === 'company') {
            companyChartInstance = new Chart(ctx, chartConfig);
        } else if (chartType === 'personal') {
            personalChartInstance = new Chart(ctx, chartConfig);
        }
    }
    
    function renderBarChart(ctx, monthlyData) {
        
        if (companyBarChartInstance) {
            companyBarChartInstance.destroy();
        }

        const labels = Object.keys(groupedData).map(groupKey => {
            // --- NEW: Dynamic Label Formatting ---
            const parts = groupKey.split('-');
            let date;
            if (barChartGrouping === 'daily') {
                date = new Date(parts[0], parts[1] - 1, parts[2]);
                return date.toLocaleString('default', { day: 'numeric', month: 'short' }); // "10 Oct"
            } else if (barChartGrouping === 'monthly') {
                date = new Date(parts[0], parts[1] - 1);
                return date.toLocaleString('default', { month: 'short', year: 'numeric' }); // "Oct 2025"
            } else { // yearly
                return groupKey; // "2025"
            }
            // --- END: Dynamic Label Formatting ---
        });

        const incomeData = Object.values(monthlyData).map(data => data.income);
        const expenseData = Object.values(monthlyData).map(data => data.expense);
        
        companyBarChartInstance = new Chart(ctx, { 
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Income',
                        data: incomeData,
                        backgroundColor: '#10b981', // Green
                        borderColor: '#059669',
                        borderWidth: 1
                    },
                    {
                        label: 'Expense',
                        data: expenseData,
                        backgroundColor: '#ef4444', // Red
                        borderColor: '#b91c1c',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return formatChartCurrency(value);
                            }
                        }
                    }
                },
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                let value = context.raw || 0;
                                return `${label}: ${formatChartCurrency(value)}`;
                            }
                        }
                    }
                }
            }
        });
    }

    // --- 6. Event Listeners for Date Filters ---
    
    document.querySelectorAll('.date-filter-group button').forEach(button => {
        button.addEventListener('click', (e) => {
            const range = e.target.dataset.range;
            
            // Update active button
            document.querySelectorAll('.date-filter-group button').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            
            // Re-render the dashboard with the new range
            updateDashboardView(range);
        });
    });

    // Type Toggle (Bar/Line)
    document.querySelectorAll('#bar-chart-type button').forEach(button => {
        button.addEventListener('click', (e) => {
            const currentButton = e.target.closest('button');
            barChartType = currentButton.dataset.type; // Set global state
            
            // Update active class
            document.querySelectorAll('#bar-chart-type button').forEach(btn => btn.classList.remove('active'));
            currentButton.classList.add('active');
            
            // Re-render dashboard
            updateDashboardView(document.querySelector('.date-filter-group button.active').dataset.range);
        });
    });

    // Grouping Toggle (Daily/Monthly/Yearly)
    document.querySelectorAll('#bar-chart-grouping button').forEach(button => {
        button.addEventListener('click', (e) => {
            barChartGrouping = e.target.dataset.group; // Set global state
            
            // Update active class
            document.querySelectorAll('#bar-chart-grouping button').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            
            // Re-render dashboard
            updateDashboardView(document.querySelector('.date-filter-group button.active').dataset.range);
        });
    });

    // --- 7. Initial Load ---
    loadDashboardData();
    
});