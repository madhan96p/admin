document.addEventListener('DOMContentLoaded', () => {
    const dsNoInput = document.getElementById('ds-no');
    const dateInput = document.getElementById('date');

    // Function to fetch the next available Duty Slip ID from our API
    async function fetchNextDutySlipId() {
        try {
            const response = await fetch('/api?action=getNextDutySlipId');
            const data = await response.json();

            if (data.nextId) {
                dsNoInput.value = data.nextId;
            } else {
                dsNoInput.value = 'Error';
                console.error('Could not fetch next ID:', data.error);
            }
        } catch (error) {
            console.error('Failed to fetch from API:', error);
            dsNoInput.value = 'Error';
        }
    }

    // Function to set the current date in YYYY-MM-DD format
    function setCurrentDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const day = String(today.getDate()).padStart(2, '0');

        dateInput.value = `${year}-${month}-${day}`;
    }

    // Run these functions when the page loads
    fetchNextDutySlipId();
    setCurrentDate();
});