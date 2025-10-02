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

            // Inside api.js, replace the 'getAllDutySlips' case with this

            case 'getAllDutySlips':
                const allRows = await sheet.getRows();
                const slips = allRows.map(row => {
                    // Now returning ALL columns from the sheet for maximum flexibility
                    return {
                        Timestamp: row.Timestamp,
                        DS_No: row.DS_No,
                        Booking_ID: row.Booking_ID,
                        Date: row.Date,
                        Organisation: row.Organisation,
                        Guest_Name: row.Guest_Name,
                        Guest_Mobile: row.Guest_Mobile,
                        Booked_By: row.Booked_By,
                        Reporting_Time: row.Reporting_Time,
                        Reporting_Address: row.Reporting_Address,
                        Spl_Instruction: row.Spl_Instruction,
                        Vehicle_Type: row.Vehicle_Type,
                        Vehicle_No: row.Vehicle_No,
                        Driver_Name: row.Driver_Name,
                        Driver_Mobile: row.Driver_Mobile,
                        Assignment: row.Assignment,
                        Routing: row.Routing,
                        Date_Out: row.Date_Out,
                        Date_In: row.Date_In,
                        Total_Days: row.Total_Days,
                        Time_Out: row.Time_Out,
                        Time_In: row.Time_In,
                        Km_Out: row.Km_Out,
                        Km_In: row.Km_In,
                        Driver_Time_Out: row.Driver_Time_Out,
                        Driver_Time_In: row.Driver_Time_In,
                        Driver_Km_Out: row.Driver_Km_Out,
                        Driver_Km_In: row.Driver_Km_In,
                        Driver_Total_Hrs: row.Driver_Total_Hrs,
                        Driver_Total_Kms: row.Driver_Total_Kms,
                        Auth_Signature_Link: row.Auth_Signature_Link,
                        Guest_Signature_Link: row.Guest_Signature_Link,
                        Status: row.Status
                    };
                });
                responseData = { slips: slips };
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
                const slipToUpdateId = String(updatedData.DS_No);
                if (!slipToUpdateId) { responseData = { error: 'No DS_No provided for update.' }; break; }

                const updateRows = await sheet.getRows();
                const rowToUpdate = updateRows.find(row => String(row.DS_No) === slipToUpdateId);

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

