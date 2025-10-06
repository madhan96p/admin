document.addEventListener('DOMContentLoaded', () => {
    // --- 1. ELEMENT REFERENCES ---
    // Generator Form Elements
    const generatorForm = document.getElementById('salary-generator-form');
    const driverSelect = document.getElementById('driver-select');
    const payPeriodInput = document.getElementById('pay-period');
    const monthlySalaryInput = document.getElementById('monthly-salary');
    const outstationQtyInput = document.getElementById('outstation-qty');
    const outstationRateInput = document.getElementById('outstation-rate');
    const extraDutyQtyInput = document.getElementById('extraduty-qty');
    const extraDutyRateInput = document.getElementById('extraduty-rate');
    const advanceDeductionInput = document.getElementById('advance-deduction');
    const lopDaysInput = document.getElementById('lop-days');
    const totalMonthDaysInput = document.getElementById('total-month-days');
    const netPayableDisplay = document.getElementById('net-payable-display');
    const generateButton = document.getElementById('generate-slip-btn');

    // List View Elements
    const tableBody = document.getElementById('slips-table-body');
    const searchInput = document.getElementById('search-input');
    const skeletonLoader = document.getElementById('skeleton-loader');
    const emptyState = document.getElementById('empty-state');
    const errorState = document.getElementById('error-state');
    const tableContainer = document.querySelector('.table-container');

    // --- 2. STATE MANAGEMENT ---
    let state = {
        allSlips: [],
        isLoading: true,
        error: null,
        searchTerm: '',
    };
    let searchTimeout;

    // --- 3. DATA FETCHING ---
    async function loadSalarySlips() {
        state.isLoading = true;
        render(); // Show skeleton loader

        try {
            const response = await fetch('/api?action=getAllSalarySlips');
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            // Sort by date, newest first
            state.allSlips = data.slips ? data.slips.sort((a, b) => new Date(b.DateGenerated) - new Date(a.DateGenerated)) : [];
            state.error = null;
        } catch (error) {
            console.error("Failed to load salary slips:", error);
            state.error = error.message;
        } finally {
            state.isLoading = false;
            render();
        }
    }

    // --- 4. RENDERING LOGIC ---
    function render() {
        skeletonLoader.style.display = state.isLoading ? 'block' : 'none';
        errorState.style.display = state.error ? 'flex' : 'none';

        if (state.isLoading || state.error) {
            tableContainer.style.display = 'none';
            emptyState.style.display = 'none';
            return;
        }

        const filteredSlips = getFilteredSlips();
        emptyState.style.display = filteredSlips.length === 0 ? 'flex' : 'none';
        tableContainer.style.display = filteredSlips.length > 0 ? 'block' : 'none';

        if (filteredSlips.length > 0) {
            renderTable(filteredSlips);
        }
    }

    function getFilteredSlips() {
        const lowerCaseSearch = state.searchTerm.toLowerCase();
        return state.allSlips.filter(slip => {
            return !lowerCaseSearch ||
                (slip.EmployeeName || '').toLowerCase().includes(lowerCaseSearch) ||
                (slip.PayPeriod || '').toLowerCase().includes(lowerCaseSearch);
        });
    }

    function renderTable(slips) {
        const fragment = document.createDocumentFragment();
        slips.forEach(slip => {
            const row = document.createElement('tr');
            const payPeriodDate = new Date(`${slip.PayPeriod}-02`);
            const formattedPeriod = payPeriodDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

            row.innerHTML = `
                <td data-label="Pay Period"><div class="cell-primary">${formattedPeriod}</div></td>
                <td data-label="Employee"><div class="cell-primary">${slip.EmployeeName}</div><div class="cell-secondary">${slip.EmployeeID}</div></td>
                <td data-label="Net Pay"><div class="cell-primary">₹ ${parseFloat(slip.NetPayableAmount).toLocaleString('en-IN')}</div></td>
                <td data-label="Generated On"><div class="cell-secondary">${new Date(slip.DateGenerated).toLocaleDateString('en-GB')}</div></td>
                <td class="actions-cell" data-label="Actions">
                    <div class="actions-cell-content">
                        <button class="action-btn print" title="View/Print (Coming Soon)"><i class="fas fa-print"></i></button>
                    </div>
                </td>`;
            fragment.appendChild(row);
        });

        tableBody.innerHTML = '';
        tableBody.appendChild(fragment);
    }

    // --- 5. FORM & CALCULATION LOGIC ---
    function populateDriverDropdown() {
        // driverData is available globally from common.js
        if (typeof driverData !== 'undefined') {
            driverSelect.innerHTML = '<option value="">-- Select a Driver --</option>';
            for (const name in driverData) {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                driverSelect.appendChild(option);
            }
        }
    }

    function handleDriverSelection(event) {
        const selectedName = event.target.value;
        const employee = driverData[selectedName];
        if (employee) {
            // In a future update, you can add a base salary to driverData and auto-fill it
            // monthlySalaryInput.value = employee.baseSalary || '';
        } else {
            monthlySalaryInput.value = '';
        }
        calculateSalary();
    }

    function updateDaysInMonth() {
        const payPeriodValue = payPeriodInput.value;
        if (payPeriodValue) {
            const [year, month] = payPeriodValue.split('-');
            const daysInMonth = new Date(year, month, 0).getDate();
            totalMonthDaysInput.value = daysInMonth;
        } else {
            totalMonthDaysInput.value = '';
        }
        calculateSalary();
    }

    function calculateSalary() {
        const monthlySalary = parseFloat(monthlySalaryInput.value) || 0;
        const outstationQty = parseFloat(outstationQtyInput.value) || 0;
        const outstationRate = parseFloat(outstationRateInput.value) || 0;
        const extraDutyQty = parseFloat(extraDutyQtyInput.value) || 0;
        const extraDutyRate = parseFloat(extraDutyRateInput.value) || 0;
        const advanceDeduction = parseFloat(advanceDeductionInput.value) || 0;
        const lopDays = parseFloat(lopDaysInput.value) || 0;
        const totalMonthDays = parseFloat(totalMonthDaysInput.value) || 30; // Default to 30 if not set

        const outstationTotal = outstationQty * outstationRate;
        const extraDutyTotal = extraDutyQty * extraDutyRate;
        const perDaySalary = totalMonthDays > 0 ? monthlySalary / totalMonthDays : 0;
        const lopDeduction = perDaySalary * lopDays;

        const totalEarnings = monthlySalary + outstationTotal + extraDutyTotal;
        const totalDeductions = advanceDeduction + lopDeduction;
        const netPayable = totalEarnings - totalDeductions;

        netPayableDisplay.textContent = `₹ ${netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        return { totalEarnings, totalDeductions, netPayable, outstationTotal, extraDutyTotal, lopDeduction, advanceDeduction };
    }

    async function handleFormSubmit(event) {
        event.preventDefault();
        const driverName = driverSelect.value;
        if (!driverName) {
            alert('Please select a driver.');
            return;
        }

        generateButton.disabled = true;
        generateButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';

        const calcs = calculateSalary();
        const employee = driverData[driverName];

        const payload = {
            payPeriod: payPeriodInput.value,
            employeeName: driverName,
            employeeId: employee.id || 'N/A', // Assuming ID might be added to driverData later
            designation: employee.designation || 'Driver', // Assuming designation might be added
            monthlySalary: monthlySalaryInput.value,
            payableDays: (parseFloat(totalMonthDaysInput.value) || 0) - (parseFloat(lopDaysInput.value) || 0),
            outstationTotal: calcs.outstationTotal,
            extraDutyTotal: calcs.extraDutyTotal,
            totalEarnings: calcs.totalEarnings,
            advanceDeduction: calcs.advanceDeduction,
            lopDeduction: calcs.lopDeduction,
            totalDeductions: calcs.totalDeductions,
            netPayableAmount: calcs.netPayable,
            // Signatures and ShareCode would be added here if needed for this simplified version
        };

        try {
            const response = await fetch('/api?action=createSalarySlip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            
            alert('Success! Salary slip has been generated and saved.');
            generatorForm.reset();
            setDefaultPayPeriod();
            loadSalarySlips(); // Refresh the list

        } catch (error) {
            console.error('Failed to generate salary slip:', error);
            alert(`Error: Could not generate slip. ${error.message}`);
        } finally {
            generateButton.disabled = false;
            generateButton.innerHTML = '<i class="fas fa-cogs"></i> Generate & Save Slip';
        }
    }

    // --- 6. EVENT LISTENERS SETUP ---
    function setupEventListeners() {
        // Generator Form Listeners
        driverSelect.addEventListener('change', handleDriverSelection);
        payPeriodInput.addEventListener('change', updateDaysInMonth);
        generatorForm.addEventListener('input', calculateSalary);
        generatorForm.addEventListener('submit', handleFormSubmit);

        // List View Listeners
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                state.searchTerm = searchInput.value;
                render();
            }, 300);
        });
    }

    // --- 7. INITIALIZATION ---
    function init() {
        populateDriverDropdown();
        setDefaultPayPeriod(); // Set initial month and calculate days
        setupEventListeners();
        loadSalarySlips(); // Load existing slips on page load
    }

    function setDefaultPayPeriod() {
        const today = new Date();
        // Set to last month by default
        today.setMonth(today.getMonth() - 1);
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        payPeriodInput.value = `${year}-${month}`;
        updateDaysInMonth();
    }
    
    init();
});