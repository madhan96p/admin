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

            if (data.error || !data.slip) { throw new Error(data.error || 'Duty slip not found.'); }

            const slip = data.slip;

            // Helper to set text content for <span>
            const setText = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.textContent = value || '';
            };

            // Helper to set value for <textarea>
            const setValue = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.value = value || '';
            };

            // Helper to set image source
            const setImg = (id, src) => {
                const el = document.getElementById(id);
                if (el && src && !src.endsWith('/')) el.src = src;
            };

            // Populate Header
            setText('print-ds-no', slip.DS_No);
            setText('print-date', slip.Date);

            // Populate Body (Left)
            setText('print-organisation', slip.Organisation);
            setText('print-guest-name', slip.Guest_Name);
            setText('print-guest-mobile', slip.Guest_Mobile);
            setText('print-booked-by', slip.Booked_By);
            setText('print-rep-time', slip.Reporting_Time);
            setValue('print-reporting-address', slip.Reporting_Address);
            setValue('print-spl-ins', slip.Spl_Instruction);

            // Populate Body (Right)
            setText('print-booking-id', slip.Booking_ID);
            setText('print-vehicle-type', slip.Vehicle_Type);
            setText('print-vehicle-no', slip.Vehicle_No);
            setText('print-driver-name', slip.Driver_Name);
            setText('print-driver-mobile', slip.Driver_Mobile);
            setValue('print-assignment', slip.Assignment);

            // Populate Usage Table
            setText('print-date-out', slip.Date_Out);
            setText('print-date-in', slip.Date_In);
            setText('print-total-days', slip.Total_Days);
            setText('print-driver-time-out', slip.Driver_Time_Out);
            setText('print-driver-time-in', slip.Driver_Time_In);
            setText('print-driver-total-hrs', slip.Driver_Total_Hrs);
            setText('print-driver-km-out', slip.Driver_Km_Out);
            setText('print-driver-km-in', slip.Driver_Km_In);
            setText('print-driver-total-kms', slip.Driver_Total_Kms);

            // Populate Customer Usage Box
            setText('print-time-out', slip.Time_Out);
            setText('print-time-in', slip.Time_In);
            setText('print-km-out', slip.Km_Out);
            setText('print-km-in', slip.Km_In);

            // Populate Footer
            setText('print-routing', slip.Routing);
            setImg('print-auth-signature-image', slip.Auth_Signature_Link);
            setImg('print-guest-signature-image', slip.Guest_Signature_Link);

            document.title = `Duty Slip #${slip.DS_No} | Shrish Admin`;

        } catch (error) {
            console.error('Failed to display slip:', error);
            document.body.innerHTML = `<h1>Error loading slip: ${error.message}</h1>`;
        }
    }

    fetchAndDisplaySlip();
});