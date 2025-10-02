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

        // Inside api.js, replace your entire switch block with this

        switch (action) {
            case 'getNextDutySlipId':
                const rows = await sheet.getRows();
                let nextId = 1001;
                if (rows.length > 0) {
                    const lastRow = rows[rows.length - 1];
                    const lastId = parseInt(lastRow.DS_No);
                    if (!isNaN(lastId)) { nextId = lastId + 1; }
                }
                responseData = { nextId: nextId };
                break;

            case 'getAllDutySlips':
                const allRows = await sheet.getRows();
                responseData = { slips: allRows.map(row => ({ DS_No: row.DS_No, Date: row.Date, Guest_Name: row.Guest_Name, Driver_Name: row.Driver_Name, Routing: row.Routing })) };
                break;

            case 'getDutySlipById':
                const slipId = event.queryStringParameters.id;
                if (!slipId) { responseData = { error: 'No ID provided.' }; break; }
                const slipRows = await sheet.getRows();
                const foundRow = slipRows.find(row => row.DS_No === slipId);
                if (foundRow) {
                    const slipData = {};
                    sheet.headerValues.forEach(header => { slipData[header] = foundRow[header]; });
                    responseData = { slip: slipData };
                } else {
                    responseData = { error: `Duty Slip with ID ${slipId} not found.` };
                }
                break;

            case 'saveDutySlip':
                const dataToSave = JSON.parse(event.body);
                dataToSave.Timestamp = new Date().toISOString();
                await sheet.addRow(dataToSave);
                responseData = { success: true, message: `Duty Slip ${dataToSave.DS_No} saved.` };
                break;

            // --- THIS CASE WAS MISSING ---
            case 'updateDutySlip':
                const updatedData = JSON.parse(event.body);
                const slipToUpdateId = updatedData.DS_No;
                if (!slipToUpdateId) { responseData = { error: 'No DS_No provided for update.' }; break; }

                const updateRows = await sheet.getRows();
                const rowToUpdate = updateRows.find(row => row.DS_No === slipToUpdateId);

                if (rowToUpdate) {
                    for (const header of sheet.headerValues) {
                        if (updatedData.hasOwnProperty(header)) {
                            rowToUpdate[header] = updatedData[header];
                        }
                    }
                    await rowToUpdate.save();
                    responseData = { success: true, message: `Duty Slip ${slipToUpdateId} updated.` };
                } else {
                    responseData = { error: `Could not find Duty Slip ${slipToUpdateId} to update.` };
                }
                break;
            // --- END OF MISSING CASE ---

            default:
                responseData = { error: 'Invalid action specified.' };
                break;
        }

        return { statusCode: 200, body: JSON.stringify(responseData) };

    } catch (error) {
        console.error('API Error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};

