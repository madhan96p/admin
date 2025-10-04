document.addEventListener('DOMContentLoaded', () => {

    function initializePage() {
        fetchNextDutySlipId();
        setCurrentDate();
        populateDriverDatalist();
        setupEventListeners();
        initializeSignaturePad('signature-canvas');
    }

    async function fetchNextDutySlipId() {
        try {
            const response = await fetch('/api?action=getNextDutySlipId');
            const data = await response.json();
            if (data.nextId) {
                document.getElementById('ds-no').value = data.nextId;
                document.getElementById('booking-id').value = data.nextId;
            }
        } catch (error) { console.error('Failed to fetch next ID:', error); }
    }

    function setCurrentDate() {
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
    }

    function populateDriverDatalist() {
        const datalist = document.getElementById('driver-list');
        Object.keys(driverData).forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            datalist.appendChild(option);
        });
    }

    function setupEventListeners() {
        document.querySelectorAll('#save-slip-button, #mobile-save-slip-button').forEach(btn => btn.addEventListener('click', handleSave));
        
        document.querySelectorAll('#download-pdf-button, #mobile-download-pdf-button').forEach(btn => {
            btn.addEventListener('click', () => {
                const dsNo = document.getElementById('ds-no').value;
                if (dsNo) {
                    const printWindow = window.open(`${window.location.origin}/view.html?id=${dsNo}`, '_blank');
                    printWindow.onload = () => printWindow.print();
                } else {
                    alert("Please save the slip first to generate a PDF.");
                }
            });
        });
        
        const inputsToWatch = ['driver-time-out', 'driver-time-in', 'driver-km-out', 'driver-km-in', 'date-out', 'date-in'];
        inputsToWatch.forEach(id => document.getElementById(id)?.addEventListener('input', calculateTotals));
        
        document.querySelectorAll('input, textarea').forEach(el => el.addEventListener('input', validateAllInputs));
        
        validateMobileInput('guest-mobile');
        validateMobileInput('driver-mobile');
        
        document.getElementById('driver-name')?.addEventListener('input', handleDriverSelection);
        document.getElementById('auth-signature-box')?.addEventListener('click', () => openSignaturePad('auth-signature-link'));
        document.getElementById('guest-signature-box')?.addEventListener('click', () => openSignaturePad('guest-signature-link'));

        document.getElementById('rep-time')?.addEventListener('change', (e) => {
            if (e.target.value) {
                const [h, m] = e.target.value.split(':');
                const date = new Date();
                date.setHours(parseInt(h), parseInt(m) + 50);
                document.getElementById('driver-time-out').value = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
            }
        });
    }

    async function handleSave(event) {
        event.preventDefault();
        if (!validateAllInputs()) {
            return alert('Please fix the validation errors (marked in red) before saving.');
        }

        const button = event.currentTarget;
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        const headers = ['DS_No', 'Booking_ID', 'Date', 'Organisation', 'Guest_Name', 'Guest_Mobile', 'Booked_By', 'Reporting_Time', 'Reporting_Address', 'Spl_Instruction', 'Vehicle_Type', 'Vehicle_No', 'Driver_Name', 'Driver_Mobile', 'Assignment', 'Routing', 'Date_Out', 'Date_In', 'Total_Days', 'Time_Out', 'Time_In', 'Km_Out', 'Km_In', 'Driver_Time_Out', 'Driver_Time_In', 'Driver_Km_Out', 'Driver_Km_In', 'Driver_Total_Hrs', 'Driver_Total_Kms', 'Auth_Signature_Link', 'Guest_Signature_Link', 'Status'];
        const formData = {};
        headers.forEach(h => {
            const id = h.toLowerCase().replace(/_/g, '-');
            const el = document.getElementById(id);
            if (el) formData[h] = el.tagName === 'IMG' ? el.src : el.value;
        });
        formData['Status'] = 'New';

        try {
            const response = await fetch('/api?action=saveDutySlip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const result = await response.json();
            if (result.success) {
                alert(result.message);
                window.location.href = '/duty-slips.html';
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            alert(`Save failed: ${error.message}`);
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-save"></i> Save & Generate Link';
        }
    }

    initializePage();
});
