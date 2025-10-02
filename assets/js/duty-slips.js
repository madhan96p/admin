document.addEventListener('DOMContentLoaded', () => {
    const createButton = document.querySelector('.page-title-bar .btn-primary');
    const tableBody = document.getElementById('slips-table-body');
    const loadingIndicator = document.getElementById('loading-indicator');

    // --- CHANGE 1: ADD HANDLER FOR VIEW BUTTON ---
    tableBody.addEventListener('click', (event) => {
        if (event.target.classList.contains('edit-btn')) {
            const slipId = event.target.dataset.id;
            window.location.href = `/edit-slip.html?id=${slipId}`;
        } else if (event.target.classList.contains('view-btn')) { // ADD THIS PART
            const slipId = event.target.dataset.id;
            window.open(`/view.html?id=${slipId}`, '_blank'); // Open in a new tab
        }
    });

    if (createButton) {
        createButton.addEventListener('click', () => {
            window.location.href = '/create-duty-slip.html';
        });
    }

    async function loadDutySlips() {
        try {
            const response = await fetch('/api?action=getAllDutySlips');
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            loadingIndicator.style.display = 'none';
            tableBody.innerHTML = ''; 

            if (data.slips && data.slips.length > 0) {
                data.slips.reverse().forEach(slip => {
                    const row = document.createElement('tr');
                    // --- CHANGE 2: UPDATE THE VIEW BUTTON HTML ---
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
                tableBody.innerHTML = `<td colspan="6" style="text-align: center;">No duty slips found.</td>`;
            }
        } catch (error) {
            console.error("Failed to load duty slips:", error);
            loadingIndicator.innerHTML = '<p style="color: red;">Error loading data.</p>';
        }
    }
    
    loadDutySlips();
});