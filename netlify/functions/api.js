const { GoogleSpreadsheet } = require('google-spreadsheet');

// The ID of your Google Sheet (from the URL)
const SPREADSHEET_ID = '1eqSsdKzF71WR6KR7XFkEI8NW7ObtnxC16ZtavJeePq8'; 

exports.handler = async function(event, context) {
    // Initialize the Google Sheet document
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);

    // Get the secret credentials from Netlify's environment variables
    const creds = {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Fix formatting
    };

    try {
        // Authenticate with Google
        await doc.useServiceAccountAuth(creds);
        await doc.loadInfo(); // loads document properties and worksheets

        // Get the action from the URL (e.g., ?action=getNextDutySlipId)
        const { action } = event.queryStringParameters;

        let responseData = {};

        // Handle different actions
        switch (action) {
            case 'getNextDutySlipId':
                const sheet = doc.sheetsByTitle['duty_slips'];
                const rows = await sheet.getRows();
                let nextId = 1001; // Starting ID if the sheet is empty
                if (rows.length > 0) {
                    const lastRow = rows[rows.length - 1];
                    const lastId = parseInt(lastRow.DS_No);
                    if (!isNaN(lastId)) {
                        nextId = lastId + 1;
                    }
                }
                responseData = { nextId: nextId };
                break;

            // We will add more cases here later (e.g., 'saveDutySlip')
            default:
                responseData = { error: 'Invalid action specified.' };
                break;
        }

        return {
            statusCode: 200,
            body: JSON.stringify(responseData),
        };

    } catch (error) {
        console.error('Error with Google Sheet:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Could not connect to the database.' }),
        };
    }
};