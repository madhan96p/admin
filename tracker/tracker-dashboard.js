/**
 * ====================================================================
 * Shrish Travels - Financial Dashboard Logic
 * ====================================================================
 * This script fetches, processes, and displays all financial data
 * for the dashboard page (tracker/index.html).
 */

// Wait for the entire page to load before running any script
document.addEventListener('DOMContentLoaded', () => {
    
    // Get references to our chart elements
    const companyChartCtx = document.getElementById('company-chart')?.getContext('2d');
    const personalChartCtx = document.getElementById('personal-chart')?.getContext('2d');
    
    // Get references to our summary card elements
    const companyProfitEl = document.getElementById('company-profit');
    const companyIncomeEl = document.getElementById('company-income');
    const companyExpenseEl = document.getElementById('company-expense');
    const personalExpenseEl = document.getElementById('personal-expense');
    
    // Get a reference to the recent transactions table body
    const transactionsTableBody = document.getElementById('recent-transactions-body');

    // Store chart instances so we can destroy them before redrawing
    let companyChartInstance = null;
    let personalChartInstance = null;
    
    // --- 1. Main Function to Fetch and Process Data ---
    
    async function loadDashboardData() {
        try {
            // Show loading state in the table
            transactionsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Loading data...</td></tr>';
            
            // Call our new API endpoint
            const response = await fetch('/.netlify/functions/api?action=getFinancialData');
            if (!response.ok) {
                throw new Error(`API Error: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            const entries = data.entries || [];
            
            // If no data, show a message
            if (entries.length === 0) {
                transactionsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No transactions found.</td></tr>';
                return;
            }
            
            // --- 2. Process Data and Calculate Totals ---
            
            let companyIncome = 0;
            let companyExpense = 0;
            let personalExpense = 0;
            
            const companyExpenseCategories = {}; // { "Fuel": 1500, "Rent": 5000 }
            const personalExpenseCategories = {}; // { "Groceries": 3000 }

            for (const entry of entries) {
                const amount = parseFloat(entry.Amount) || 0;
                
                if (entry.Account === 'Company') {
                    if (entry.Flow === 'Credit') {
                        companyIncome += amount;
                    } else if (entry.Flow === 'Debit') {
                        companyExpense += amount; // Amount is already negative
                        
                        // Add to category totals
                        const category = entry.Category || 'Uncategorized';
                        companyExpenseCategories[category] = (companyExpenseCategories[category] || 0) + Math.abs(amount);
                    }
                } else if (entry.Account === 'Personal' && entry.Flow === 'Debit') {
                    personalExpense += amount; // Amount is already negative
                    
                    // Add to category totals
                    const category = entry.Category || 'Uncategorized';
                    personalExpenseCategories[category] = (personalExpenseCategories[category] || 0) + Math.abs(amount);
                }
            }
            
            const companyProfit = companyIncome + companyExpense; // (e.g., 50000 + (-30000) = 20000)

            // --- 3. Update Summary Cards ---
            
            // Helper function to format numbers as Indian Rupees
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
            
            // --- 4. Populate Recent Transactions Table ---
            
            transactionsTableBody.innerHTML = ''; // Clear the loading message
            const recentEntries = entries.slice(0, 10); // Get just the first 10
            
            for (const entry of recentEntries) {
                const row = document.createElement('tr');
                
                // Format amount with color
                const amount = parseFloat(entry.Amount) || 0;
                const amountColor = amount < 0 ? 'red' : 'green';
                
                row.innerHTML = `
                    <td>${entry.Date || 'N/A'}</td>
                    <td>${entry.Account || 'N/A'}</td>
                    <td>${entry.Category || 'N/A'}</td>
                    <td>${entry.Particulars || 'N/A'}</td>
                    <td style="text-align: right; color: ${amountColor}; font-weight: 500;">
                        ${formatCurrency(amount)}
                    </td>
                `;
                transactionsTableBody.appendChild(row);
            }

            // --- 5. Render Charts ---
            
            // Create Company Expense Chart
            if (companyChartCtx) {
                renderDonutChart(companyChartCtx, 'company', companyExpenseCategories);
            }
            
            // Create Personal Expense Chart
            if (personalChartCtx) {
                renderDonutChart(personalChartCtx, 'personal', personalExpenseCategories);
            }
            
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            transactionsTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">Error: ${error.message}</td></tr>`;
        }
    }
    
    // --- 6. Helper Function to Create Charts ---
    
    function renderDonutChart(ctx, chartType, categoryData) {
        // Destroy the old chart if it exists, to prevent flickering
        if (chartType === 'company' && companyChartInstance) {
            companyChartInstance.destroy();
        } else if (chartType === 'personal' && personalChartInstance) {
            personalChartInstance.destroy();
        }

        const labels = Object.keys(categoryData);
        const data = Object.values(categoryData);

        // Chart.js configuration
        const chartConfig = {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Expenses',
                    data: data,
                    backgroundColor: [ // Add more colors if you have more categories
                        '#4f46e5', '#ef4444', '#f59e0b', '#10b981',
                        '#3b82f6', '#6366f1', '#ec4899', '#8b5cf6'
                    ],
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                let value = context.raw || 0;
                                return `${label}: ${formatCurrency(value)}`;
                            }
                        }
                    }
                }
            }
        };

        // Create the new chart
        if (chartType === 'company') {
            companyChartInstance = new Chart(ctx, chartConfig);
        } else if (chartType === 'personal') {
            personalChartInstance = new Chart(ctx, chartConfig);
        }
    }
    
    // --- 7. Initial Load ---
    loadDashboardData();
    
});