document.addEventListener('DOMContentLoaded', () => {
    const createButton = document.querySelector('.page-title-bar .btn-primary');
    const tableBody = document.getElementById('slips-table-body');
    const loadingIndicator = document.getElementById('loading-indicator');

    // --- NEW: Get references to filter inputs ---
    const searchGuestInput = document.getElementById('search-guest');
    const searchDsNoInput = document.getElementById('search-ds-no');
    const rowLimitSelect = document.getElementById('row-limit');

    let allSlips = []; // This will store the master list of all slips

    // --- Event Listeners ---
    if (createButton) {
        createButton.addEventListener('click', () => {
            window.location.href = '/create-duty-slip.html';
        });
    }

    tableBody.addEventListener('click', (event) => {
        if (event.target.classList.contains('edit-btn')) {
            window.location.href = `/edit-slip.html?id=${event.target.dataset.id}`;
        } else if (event.target.classList.contains('view-btn')) {
            window.open(`/view.html?id=${event.target.dataset.id}`, '_blank');
        }
    });

    // --- NEW: Add event listeners for the filter controls ---
    searchGuestInput.addEventListener('input', renderTable);
    searchDsNoInput.addEventListener('input', renderTable);
    rowLimitSelect.addEventListener('change', renderTable);

    // --- Data Loading Function ---
    async function loadDutySlips() {
        try {
            const response = await fetch('/api?action=getAllDutySlips');
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            loadingIndicator.style.display = 'none';

            if (data.slips && data.slips.length > 0) {
                allSlips = data.slips.reverse(); // Store the master list, newest first
                renderTable(); // Render the table for the first time
            } else {
                tableBody.innerHTML = `<td colspan="6" style="text-align: center;">No duty slips found.</td>`;
            }

        } catch (error) {
            console.error("Failed to load duty slips:", error);
            loadingIndicator.innerHTML = '<p style="color: red;">Error loading data.</p>';
        }
    }

    // --- NEW: Function to render the table based on filters ---
    function renderTable() {
        const guestFilter = searchGuestInput.value.toLowerCase();
        const dsNoFilter = searchDsNoInput.value.toLowerCase();
        const rowLimit = parseInt(rowLimitSelect.value) || allSlips.length;

        // 1. Filter the master list
        let filteredSlips = allSlips.filter(slip => {
            const guestMatch = slip.Guest_Name.toLowerCase().includes(guestFilter);
            const dsNoMatch = slip.DS_No.toLowerCase().includes(dsNoFilter);
            return guestMatch && dsNoMatch;
        });

        // 2. Apply the row limit
        const limitedSlips = filteredSlips.slice(0, rowLimit);

        // 3. Build the HTML
        tableBody.innerHTML = ''; // Clear the table
        if (limitedSlips.length > 0) {
            limitedSlips.forEach(slip => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${slip.DS_No}</td>
                    <td>${slip.Date}</td>
                    <td>${slip.Guest_Name}</td>
                    <td>${slip.Driver_Name}</td>
                    <td>${slip.Routing}</td>
                    <td>
                        <button class="action-button-sm view-btn" data-id="${slip.DS_No}">View</button>
                        <button class="action-button-sm edit-btn" data-id="${slip.DS_No}">Edit</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = `<td colspan="6" style="text-align: center;">No results match your search.</td>`;
        }
    }

    // Load the initial data
    loadDutySlips();
});