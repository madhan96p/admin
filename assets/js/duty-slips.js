document.addEventListener('DOMContentLoaded', () => {
    console.log("Duty Slips page loaded. Attempting to fetch next ID...");

    // This function calls our backend API
    async function getNextDutySlipId() {
        try {
            // We call the clean URL we set up in netlify.toml
            const response = await fetch('/api?action=getNextDutySlipId');

            if (!response.ok) {
                throw new Error(`Server responded with an error: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            console.log(`✅ Success! Next available Duty Slip ID is: ${data.nextId}`);
            // Later, we will display this on the page instead of the console.

        } catch (error) {
            console.error("❌ Error fetching next Duty Slip ID:", error);
            alert("Could not connect to the database. Please check the console (F12) for errors. Make sure your Netlify environment variables are set correctly.");
        }
    }

    // Run the function as soon as the page loads
    getNextDutySlipId();
});