document.addEventListener('DOMContentLoaded', () => {
    // Find the "Create New Duty Slip" button on the main page
    const createButton = document.querySelector('.page-title-bar .btn-primary');

    if (createButton) {
        // Add a click event to navigate to the creation form
        createButton.addEventListener('click', () => {
            window.location.href = '/create-duty-slip.html';
        });
    }

    console.log("Duty Slips management page is ready.");
    // We are keeping the test function here for now, but it's not the main focus.
    // It's good to confirm the connection is still working.
    fetch('/api?action=getNextDutySlipId')
        .then(res => res.json())
        .then(data => console.log(`Connection test successful. Next ID: ${data.nextId}`))
        .catch(err => console.error("Connection test failed.", err));
});