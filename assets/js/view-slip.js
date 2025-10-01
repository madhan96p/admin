document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const slipId = params.get('id');

    if (!slipId) {
        document.body.innerHTML = '<h1>Error: No Duty Slip ID provided.</h1>';
        return;
    }

    async function fetchAndDisplaySlip() {
        try {
            const response = await fetch(`/api?action=getDutySlipById&id=${slipId}`);
            const data = await response.json();

            if (data.error || !data.slip) {
                throw new Error(data.error || 'Duty slip not found.');
            }

            const slip = data.slip;

            // Helper function to set text content
            const setText = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.textContent = value || '';
            };

            // Helper function to set image source
            const setImg = (id, src) => {
                const el = document.getElementById(id);
                if (el && src) el.src = src;
            };

            // Populate all the fields in the print layout
            setText('print-ds-no', slip.DS_No);
            setText('print-date', slip.Date);
            setText('print-org', slip.Organisation);
            setText('print-guest-name', slip.Guest_Name);
            // ... and so on for all your other 'print-' fields

            // Example for signatures
            setImg('print-auth-signature-image', slip.Auth_Signature_Link);
            setImg('print-guest-signature-image', slip.Guest_Signature_Link);

            // Set the page title
            document.title = `Duty Slip #${slip.DS_No} | Shrish Admin`;

        } catch (error) {
            console.error('Failed to display slip:', error);
            document.body.innerHTML = `<h1>Error: ${error.message}</h1>`;
        }
    }

    fetchAndDisplaySlip();
});