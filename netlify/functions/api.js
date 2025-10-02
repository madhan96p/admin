const { GoogleSpreadsheet } = require('google-spreadsheet');
const { google } = require('googleapis');
const { Readable } = require('stream');

const SPREADSHEET_ID = '1eqSsdKzF71WR6KR7XFkEI8NW7ObtnxC16ZtavJeePq8';
// --- IMPORTANT: Paste your Google Drive Folder ID here ---
const SIGNATURE_FOLDER_ID = 'YOUR_GOOGLE_DRIVE_FOLDER_ID';

exports.handler = async function (event, context) {
    // Auth setup
    const auth = new google.auth.JWT({
        email: process.env.GOOGLE_CLIENT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive',
        ],
    });

    const { action } = event.queryStringParameters;

    try {
        if (action === 'uploadSignature') {
            const { signatureData, fileName } = JSON.parse(event.body);
            if (!signatureData.startsWith('data:image/png;base64,')) {
                throw new Error('Invalid signature format.');
            }

            const base64Data = signatureData.replace(/^data:image\/png;base64,/, "");
            const fileBuffer = Buffer.from(base64Data, 'base64');

            const drive = google.drive({ version: 'v3', auth });

            const response = await drive.files.create({
                requestBody: {
                    name: fileName,
                    mimeType: 'image/png',
                    parents: [SIGNATURE_FOLDER_ID]
                },
                media: {
                    mimeType: 'image/png',
                    body: Readable.from(fileBuffer),
                },
            });

            const fileId = response.data.id;
            await drive.permissions.create({
                fileId: fileId,
                requestBody: { role: 'reader', type: 'anyone' }
            });

            const fileResult = await drive.files.get({
                fileId: fileId,
                fields: 'webViewLink'
            });

            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, url: fileResult.data.webViewLink }),
            };

        } else {
            // Handle Google Sheet actions
            const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
            await doc.useServiceAccountAuth({ client_email: auth.email, private_key: auth.key });
            await doc.loadInfo();
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
                case 'saveDutySlip':
                    const dataToSave = JSON.parse(event.body);
                    dataToSave.Timestamp = new Date().toISOString();
                    await sheet.addRow(dataToSave);
                    responseData = { success: true, message: `Duty Slip ${dataToSave.DS_No} saved.` };
                    break;

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

                case 'getDutySlipById':
                    const slipId = event.queryStringParameters.id;
                    if (!slipId) {
                        responseData = { error: 'No ID provided.' };
                        break;
                    }
                    const slipRows = await sheet.getRows();
                    const foundRow = slipRows.find(row => row.DS_No === slipId);

                    if (foundRow) {
                        // Convert the row object to a simple key-value pair object
                        const slipData = {};
                        sheet.headerValues.forEach(header => {
                            slipData[header] = foundRow[header];
                        });
                        responseData = { slip: slipData };
                    } else {
                        responseData = { error: `Duty Slip with ID ${slipId} not found.` };
                    }
                    break;

                case 'updateDutySlip':
                    const updatedData = JSON.parse(event.body);
                    const slipToUpdateId = updatedData.DS_No;

                    if (!slipToUpdateId) {
                        responseData = { error: 'No DS_No provided for update.' };
                        break;
                    }

                    const updateRows = await sheet.getRows();
                    const rowToUpdate = updateRows.find(row => row.DS_No === slipToUpdateId);

                    if (rowToUpdate) {
                        // Update each property of the row with the new data
                        for (const header of sheet.headerValues) {
                            if (updatedData.hasOwnProperty(header)) {
                                rowToUpdate[header] = updatedData[header];
                            }
                        }
                        await rowToUpdate.save(); // Save the changes back to the sheet
                        responseData = { success: true, message: `Duty Slip ${slipToUpdateId} updated successfully.` };
                    } else {
                        responseData = { error: `Could not find Duty Slip ${slipToUpdateId} to update.` };
                    }
                    break;

                default:
                    responseData = { error: 'Invalid action specified.' };
                    break;
            }
            return { statusCode: 200, body: JSON.stringify(responseData) };
        }
    } catch (error) {
        console.error('API Error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};



