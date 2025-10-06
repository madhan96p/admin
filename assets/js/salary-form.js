document.addEventListener('DOMContentLoaded', () => {
    // --- 1. STATE MANAGEMENT & ELEMENT REFERENCES ---
    const state = {
        slipData: null,
        isEditMode: false,
        slipId: null,
        status: 'Pending Approval', // Default for new slips
    };

    // Form Elements
    const form = document.getElementById('salary-form');
    const formTitle = document.getElementById('form-title');
    const driverSelect = document.getElementById('driver-select');
    const payPeriodInput = document.getElementById('pay-period');
    const employeeIdInput = document.getElementById('employee-id');
    const designationInput = document.getElementById('designation');
    const monthlySalaryInput = document.getElementById('monthly-salary');
    const outstationQtyInput = document.getElementById('outstation-qty');
    const totalMonthDaysInput = document.getElementById('total-month-days');
    const lopDaysInput = document.getElementById('lop-days');
    const advanceDeductionInput = document.getElementById('advance-deduction');
    const netPayableDisplay = document.getElementById('net-payable-display');
    const approvalNotesSection = document.getElementById('approval-notes-section');
    const approvalNotesInput = document.getElementById('approval-notes');
    
    // Dynamic Sections
    const founderSignatureSection = document.getElementById('founder-signature-section');
    const actionsContainer = document.getElementById('actions-container');

    // --- 2. INITIALIZATION ---
    function init() {
        const params = new URLSearchParams(window.location.search);
        state.slipId = params.get('id');
        state.isEditMode = !!state.slipId;

        // Integrates with the signature pad logic from common.js
        initializeSignaturePad('signature-canvas'); 
        
        populateDriverDropdown();
        setupEventListeners();

        if (state.isEditMode) {
            // We'll need a new API action to get a single salary slip
            // For now, this structure is ready.
            // loadSlipForEditing(); 
            alert("Editing mode is not yet connected to the API.");
            renderUIForState();
        } else {
            initializeCreateMode();
        }
    }

    // --- 3. MODE-SPECIFIC & UI RENDERING ---
    function initializeCreateMode() {
        formTitle.textContent = 'Create New Salary Slip';
        setDefaultPayPeriod();
        renderUIForState();
    }

    // This function will be the engine for our dynamic UI
    function renderUIForState() {
        // Lock key fields in edit mode to prevent changing the record's identity
        if (state.isEditMode) {
            driverSelect.disabled = true;
            payPeriodInput.disabled = true;
        }

        // Show founder signature box only when awaiting approval
        if (state.status === 'Pending Approval') {
            founderSignatureSection.style.display = 'block';
        } else {
            founderSignatureSection.style.display = 'none';
        }
        
        renderActionButtons();
    }

    function renderActionButtons() {
        let buttonsHtml = '';
        switch (state.status) {
            case 'Pending Approval':
                if (state.isEditMode) {
                    // Founder's view
                    buttonsHtml = `
                        <button type="button" id="approve-btn" class="btn-primary"><i class="fas fa-check"></i> Approve with Signature</button>
                        <button type="button" id="update-btn" class="btn-secondary"><i class="fas fa-save"></i> Update Details</button>
                    `;
                } else {
                    // Manager's create view
                    buttonsHtml = `
                        <button type="submit" id="submit-approval-btn" class="btn-primary"><i class="fas fa-paper-plane"></i> Save & Submit for Approval</button>
                    `;
                }
                break;
            case 'Approved':
            case 'Finalized':
                // No actions needed on a locked slip in this form
                actionsContainer.innerHTML = '<p>This slip is locked and cannot be edited further.</p>';
                break;
        }
        actionsContainer.innerHTML = buttonsHtml;
    }


    // --- 4. FORM LOGIC & CALCULATIONS ---
    function populateDriverDropdown() {
        if (typeof driverData === 'undefined') return;
        driverSelect.innerHTML = '<option value="">-- Select Employee --</option>';
        for (const name in driverData) {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            driverSelect.appendChild(option);
        }
    }

    function handleDriverSelection() {
        const selectedName = driverSelect.value;
        const employee = driverData[selectedName];
        if (employee) {
            employeeIdInput.value = employee.id || '';
            designationInput.value = employee.designation || '';
            monthlySalaryInput.value = employee.monthlySalary || '';
        } else {
            // Clear fields if no driver is selected
            ['employee-id', 'designation', 'monthly-salary'].forEach(id => document.getElementById(id).value = '');
        }
        calculateSalary();
    }

    function updateDaysInMonth() {
        const payPeriodValue = payPeriodInput.value;
        if (payPeriodValue) {
            const [year, month] = payPeriodValue.split('-');
            totalMonthDaysInput.value = new Date(year, month, 0).getDate();
        } else {
            totalMonthDaysInput.value = '';
        }
        calculateSalary();
    }
    
    function calculateSalary() {
        const monthlySalary = parseFloat(monthlySalaryInput.value) || 0;
        const outstationQty = parseFloat(outstationQtyInput.value) || 0;
        const outstationRate = parseFloat(document.getElementById('outstation-rate').value) || 0;
        const extraDutyQty = parseFloat(document.getElementById('extraduty-qty').value) || 0;
        const extraDutyRate = parseFloat(document.getElementById('extraduty-rate').value) || 0;
        const advanceDeduction = parseFloat(advanceDeductionInput.value) || 0;
        const lopDays = parseFloat(lopDaysInput.value) || 0;
        const totalMonthDays = parseFloat(totalMonthDaysInput.value) || 30;

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

    // --- 5. EVENT HANDLERS & API CALLS ---
    function setupEventListeners() {
        driverSelect.addEventListener('change', handleDriverSelection);
        payPeriodInput.addEventListener('change', updateDaysInMonth);
        // Recalculate salary on any relevant form input
        form.addEventListener('input', (e) => {
            if (e.target.type === 'number' || e.target.type === 'month') {
                calculateSalary();
            }
        });
        
        // Use event delegation for the dynamic action buttons
        actionsContainer.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target) return;

            if (target.id === 'submit-approval-btn') {
                handleFormSubmit('create');
            }
            // Add other button handlers here later (e.g., for update, approve)
        });
    }

    async function handleFormSubmit(actionType) {
        const driverName = driverSelect.value;
        if (!driverName) {
            alert('Please select an employee.');
            return;
        }

        const button = actionsContainer.querySelector('button');
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        
        const calcs = calculateSalary();
        const employee = driverData[driverName];
        
        // This payload matches our Google Sheet columns
        const payload = {
            payPeriod: payPeriodInput.value,
            employeeName: driverName,
            employeeId: employeeIdInput.value,
            designation: designationInput.value,
            monthlySalary: monthlySalaryInput.value,
            payableDays: (parseFloat(totalMonthDaysInput.value) || 0) - (parseFloat(lopDaysInput.value) || 0),
            outstationTotal: calcs.outstationTotal,
            extraDutyTotal: calcs.extraDutyTotal,
            totalEarnings: calcs.totalEarnings,
            advanceDeduction: calcs.advanceDeduction,
            lopDeduction: calcs.lopDeduction,
            totalDeductions: calcs.totalDeductions,
            netPayableAmount: calcs.netPayable,
            Status: 'Pending Approval', // Set initial status
            // ... signatures and notes will be added in the 'update' action
        };

        let apiAction = '';
        if (actionType === 'create') {
            apiAction = 'createSalarySlip';
        } 
        // We will add an 'updateSalarySlip' action later for editing
        
        try {
            const response = await fetch(`/api?action=${apiAction}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            
            alert('Success! Salary slip has been submitted for approval.');
            window.location.href = 'salary-slips.html'; // Redirect back to the dashboard

        } catch (error) {
            console.error('Failed to process slip:', error);
            alert(`Error: ${error.message}`);
            button.disabled = false;
            // Restore button text based on action
            button.innerHTML = '<i class="fas fa-paper-plane"></i> Save & Submit for Approval';
        }
    }

    function setDefaultPayPeriod() {
        const today = new Date();
        // Default to the previous month for salary generation
        today.setMonth(today.getMonth() - 1);
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        payPeriodInput.value = `${year}-${month}`;
        updateDaysInMonth();
    }
    
    // --- 6. INITIALIZE ---
    init();
});