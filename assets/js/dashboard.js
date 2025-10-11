// Add this new function to dashboard.js

async function fetchSalarySlipsData() {
    try {
        const response = await fetch('/.netlify/functions/api?action=getAllSalarySlips');
        if (!response.ok) throw new Error('Network response was not ok.');
        const data = await response.json();
        return data.slips || [];
    } catch (error) {
        console.error('Error fetching salary slips:', error);
        return [];
    }
}

function displaySalaryStats(slips) {
    // Assuming 'Finalized' means the process is complete.
    // 'Pending Finalization' means the status is anything other than Finalized (e.g., Draft, Approved).
    const pendingSlips = slips.filter(slip => 
        slip.Status !== 'Finalized' 
    ).length;

    document.getElementById('stat-salary-pending').innerText = pendingSlips;
}

// Update the main initialization function in dashboard.js

async function initializeDashboard() {
    // ... existing loading message ...

    const allSlips = await fetchDutySlipsData();
    filterAndDisplayUpcomingTrips(allSlips);
    displayCriticalStats(allSlips);

    // NEW: Fetch and display salary stats
    const allSalarySlips = await fetchSalarySlipsData();
    displaySalaryStats(allSalarySlips);
}
// Function to fetch data from the Netlify API
async function fetchDutySlipsData() {
    try {
        const response = await fetch('/.netlify/functions/api?action=getAllDutySlips');
        if (!response.ok) throw new Error('Network response was not ok.');
        const data = await response.json();
        return data.slips || [];
    } catch (error) {
        console.error('Error fetching duty slips:', error);
        document.getElementById('upcoming-trips-list').innerHTML = 
            '<p class="error-text"><i class="fas fa-exclamation-triangle"></i> Failed to load trip data. Please retry later.</p>';
        return [];
    }
}

// Function to get the date object from the GSheet date string
function parseGSheetDate(dateString) {
    if (!dateString) return null;
    // GSheet date formats can be ambiguous (e.g., '6-Aug-2025' or '9/4/2025'). 
    // This is a robust attempt, but format consistency is key.
    const date = new Date(dateString);
    // Check if the date parsing was successful and not just today's date (which happens for invalid dates)
    if (isNaN(date)) return null; 
    return date;
}

function filterAndDisplayUpcomingTrips(slips) {
    const listContainer = document.getElementById('upcoming-trips-list');
    listContainer.innerHTML = ''; // Clear loading message

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextSevenDays = new Date(today);
    nextSevenDays.setDate(today.getDate() + 7);

    const upcomingSlips = slips
        .filter(slip => {
            const slipDate = parseGSheetDate(slip.Date);
            // 1. Must have a valid Date
            if (!slipDate) return false; 

            // 2. Date must be today or in the future, up to 7 days from now
            return slipDate >= today && slipDate <= nextSevenDays;
        })
        .sort((a, b) => parseGSheetDate(a.Date) - parseGSheetDate(b.Date)); // Sort chronologically

    if (upcomingSlips.length === 0) {
        listContainer.innerHTML = '<p class="text-muted" style="text-align:center;"><i class="fas fa-calendar-check"></i> No scheduled trips in the next 7 days.</p>';
        return;
    }

    const tripListHTML = upcomingSlips.map(slip => {
        const slipDate = parseGSheetDate(slip.Date);
        const dateString = slipDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        
        return `
            <div class="trip-item">
                <div class="trip-date">
                    <span class="day-of-month">${dateString.split(' ')[1]}</span>
                    <span class="month">${dateString.split(' ')[0]}</span>
                </div>
                <div class="trip-details">
                    <p class="guest-name"><strong>${slip.Guest_Name || 'N/A'}</strong> <span class="ds-no">#${slip.DS_No}</span></p>
                    <p class="time-address">
                        <i class="fas fa-clock"></i> ${slip.Reporting_Time || 'N/A'} | 
                        <i class="fas fa-map-marker-alt"></i> ${slip.Reporting_Address.substring(0, 50) + (slip.Reporting_Address.length > 50 ? '...' : '') || 'N/A'}
                    </p>
                    <p class="driver-info">
                        <i class="fas fa-car"></i> ${slip.Driver_Name || 'N/A'} (${slip.Vehicle_No || 'N/A'})
                    </p>
                </div>
                <a href="/edit-slip.html?id=${slip.DS_No}" class="btn-sm btn-primary-outline">Update</a>
            </div>
        `;
    }).join('');

    listContainer.innerHTML = `<div class="trip-list">${tripListHTML}</div>`;
}

// Function to calculate and display the critical stats
function displayCriticalStats(slips) {
    // Assuming 'Needs Action' means: Status is not 'Closed by Client' and not 'Closed by Driver'
    // and Date is today or in the past (i.e., should have been closed)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const needsActionCount = slips.filter(slip => {
        const slipDate = parseGSheetDate(slip.Date);
        const isClosed = (slip.Status === 'Closed by Client' || slip.Status === 'Closed by Driver');
        
        // This logic counts slips that are due and not closed, or are for today/future and need attention.
        // For simplicity, let's count all slips that are NOT CLOSED.
        return !isClosed && slipDate && slipDate <= today; // Trip date is today or in the past AND not closed
    }).length;

    // A placeholder for total completed trips (last 30 days)
    const completedCount = slips.filter(slip => {
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        const slipDate = parseGSheetDate(slip.Date);

        return slip.Status === 'Closed by Client' && slipDate && slipDate >= thirtyDaysAgo;
    }).length;

    document.getElementById('stat-ds-needs-action').innerText = needsActionCount;
    document.getElementById('stat-total-completed').innerText = completedCount;
    // Salary Pending Finalization stat will be handled by a separate API call later if needed
}

// Initialization function for the Dashboard
async function initializeDashboard() {
    // Show a loading state until data is fetched
    document.getElementById('upcoming-trips-list').innerHTML = 
        '<p class="text-muted" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Loading data...</p>';

    const allSlips = await fetchDutySlipsData();
    filterAndDisplayUpcomingTrips(allSlips);
    displayCriticalStats(allSlips);

    // Initialise the salary pending count (Placeholder for now)
    document.getElementById('stat-salary-pending').innerText = '0';
}

// Wait for common.js to load components, then run dashboard initialization
document.addEventListener('DOMContentLoaded', () => {
    // We run the dashboard initializer after all common components are loaded.
    // Assuming common.js will have a final event listener for 'DOMContentLoaded'
    // We'll rely on our common.js structure to ensure initialization order.
    setTimeout(initializeDashboard, 100); // Small delay to ensure common.js is complete
});