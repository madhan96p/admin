document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('dutySlipForm');
    const saveButton = document.getElementById('save-slip-button');
    const dsNoInput = document.getElementById('ds-no');
    const dateInput = document.getElementById('date');

    // Function to fetch the next available Duty Slip ID
    async function fetchNextDutySlipId() {
        try {
            const response = await fetch('/api?action=getNextDutySlipId');
            const data = await response.json();
            if (data.nextId) {
                dsNoInput.value = data.nextId;
            }
        } catch (error) {
            console.error('Failed to fetch from API:', error);
        }
    }

    // Function to set the current date
    function setCurrentDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        dateInput.value = `${year}-${month}-${day}`;
    }

    // --- NEW CODE STARTS HERE ---
    // Function to handle the form submission
    async function handleSave(event) {
        event.preventDefault(); // Prevent default form submission
        saveButton.disabled = true;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        // 1. Get all column headers from our Google Sheet
        const headers = [
            'DS_No', 'Booking_ID', 'Date', 'Organisation', 'Guest_Name', 'Guest_Mobile',
            'Booked_By', 'Reporting_Time', 'Reporting_Address', 'Spl_Instruction',
            'Vehicle_Type', 'Vehicle_No', 'Driver_Name', 'Driver_Mobile', 'Assignment',
            'Routing', 'Date_Out', 'Date_In', 'Total_Days', 'Time_Out', 'Time_In',
            'Km_Out', 'Km_In', 'Driver_Time_Out', 'Driver_Time_In', 'Driver_Km_Out',
            'Driver_Km_In', 'Driver_Total_Hrs', 'Driver_Total_Kms',
            'Auth_Signature_Link', 'Guest_Signature_Link', 'Status'
        ];

        // 2. Create a data object with values from the form
        const formData = {};
        for (const header of headers) {
            // Convert header name to kebab-case to match input IDs (e.g., DS_No -> ds-no)
            const inputId = header.toLowerCase().replace(/_/g, '-');
            const inputElement = document.getElementById(inputId);
            if (inputElement) {
                formData[header] = inputElement.value;
            } else {
                formData[header] = ''; // Default to empty string if no input found
            }
        }

        // 3. Send the data to our backend function
        try {
            const response = await fetch('/api?action=saveDutySlip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const result = await response.json();

            if (result.success) {
                alert(result.message);
                // Redirect back to the main duty slips page
                window.location.href = '/duty-slips.html';
            } else {
                throw new Error(result.error || 'Unknown error occurred.');
            }
        } catch (error) {
            console.error("Save failed:", error);
            alert(`Error: Could not save the duty slip. ${error.message}`);
            saveButton.disabled = false;
            saveButton.innerHTML = '<i class="fas fa-save"></i> Save & Generate Link';
        }
    }

    // Add event listener to the save button
    saveButton.addEventListener('click', handleSave);
    // --- NEW CODE ENDS HERE ---

    // Run setup functions when the page loads
    fetchNextDutySlipId();
    setCurrentDate();
});