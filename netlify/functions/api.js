const { GoogleSpreadsheet } = require('google-spreadsheet');

const SPREADSHEET_ID = '1eqSsdKzF71WR6KR7XFkEI8NW7ObtnxC16ZtavJeePq8'; 

exports.handler = async function(event, context) {
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