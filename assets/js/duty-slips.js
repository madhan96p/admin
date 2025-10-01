document.addEventListener('DOMContentLoaded', () => {
    const createButton = document.querySelector('.page-title-bar .btn-primary');
    const tableBody = document.getElementById('slips-table-body');
    const loadingIndicator = document.getElementById('loading-indicator');

    // Navigate to the creation page when the button is clicked
    if (createButton) {
        createButton.addEventListener('click', () => {
            window.location.href = '/create-duty-slip.html';
        });
    }

    // Function to fetch all duty slips from the API
    async function loadDutySlips() {
        try {
            const response = await fetch('/api?action=getAllDutySlips');
            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            // Clear the loading message
            loadingIndicator.style.display = 'none';
            tableBody.innerHTML = ''; // Clear existing rows

            if (data.slips && data.slips.length > 0) {
                // Reverse the array to show newest slips first
                data.slips.reverse().forEach(slip => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${slip.DS_No}</td>
                        <td>${slip.Date}</td>
                        <td>${slip.Guest_Name}</td>
                        <td>${slip.Driver_Name}</td>
                        <td>${slip.Routing}</td>
                        <td>
                            <button class="action-button-sm">View</button>
                            <button class="action-button-sm">Edit</button>
                        </td>
                    `;
                    tableBody.appendChild(row);
                });
            } else {
                // Show a message if there are no slips
                const row = document.createElement('tr');
                row.innerHTML = `<td colspan="6" style="text-align: center;">No duty slips found.</td>`;
                tableBody.appendChild(row);
            }

        } catch (error) {
            console.error("Failed to load duty slips:", error);
            loadingIndicator.innerHTML = '<p style="color: red;">Error loading data.</p>';
        }
    }

    // Load the slips as soon as the page is ready
    loadDutySlips();
});