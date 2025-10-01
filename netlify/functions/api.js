const { GoogleSpreadsheet } = require('google-spreadsheet');

const SPREADSHEET_ID = '1eqSsdKzF71WR6KR7XFkEI8NW7ObtnxC16ZtavJeePq8';

exports.handler = async function (event, context) {
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    const creds = {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };

    try {
        await doc.useServiceAccountAuth(creds);
        await doc.loadInfo();

        const { action } = event.queryStringParameters;
        const sheet = doc.sheetsByTitle['duty_slips'];

        let responseData = {};

        switch (action) {
            case 'getNextDutySlipId':
                const rows = await sheet.getRows();
                let nextId = 1001;
                if (rows.length > 0) {
                    const lastRow = rows[rows.length - 1];
                    const lastId = parseInt(lastRow.DS_No);
                    if (!isNaN(lastId)) {
                        nextId = lastId + 1;
                    }
                }
                responseData = { nextId: nextId };
                break;

            // --- NEW CODE STARTS HERE ---
            case 'saveDutySlip':
                const dataToSave = JSON.parse(event.body);
                dataToSave.Timestamp = new Date().toISOString(); // Add a server-side timestamp
                await sheet.addRow(dataToSave);
                responseData = {
                    success: true,
                    message: `Duty Slip ${dataToSave.DS_No} saved successfully.`
                };
                break;
            // --- NEW CODE ENDS HERE ---
            // Add this new case inside the switch (action) block in api.js

            case 'getAllDutySlips':
                const allRows = await sheet.getRows();
                // We map the rows to a simpler array of objects
                const slips = allRows.map(row => {
                    return {
                        DS_No: row.DS_No,
                        Date: row.Date,
                        Guest_Name: row.Guest_Name,
                        Driver_Name: row.Driver_Name,
                        Routing: row.Routing,
                    };
                });
                responseData = { slips: slips };
                break;
                
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