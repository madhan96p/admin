const { GoogleSpreadsheet } = require('google-spreadsheet');
const { google } = require('googleapis');

const SPREADSHEET_ID = '1eqSsdKzF71WR6KR7XFkEI8NW7ObtnxC16ZtavJeePq8';

// --- Main Handler ---
exports.handler = async function(event, context) {
    // --- 1. Authentication ---
    const auth = new google.auth.JWT({
        email: process.env.GOOGLE_CLIENT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/gmail.send'
        ],
    });

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    await doc.useServiceAccountAuth({ client_email: auth.email, private_key: auth.key });
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['duty_slips'];
    const { action } = event.queryStringParameters;
    let responseData = {};

    try {
        // --- 2. API Actions (Switch Statement) ---
        switch (action) {
            case 'getNextDutySlipId':
                const rows = await sheet.getRows();
                let nextId = 1;
                if (rows.length > 0) {
                    const lastRow = rows[rows.length - 1];
                    const lastId = parseInt(lastRow.DS_No);
                    if (!isNaN(lastId)) { nextId = lastId + 1; }
                }
                responseData = { nextId: nextId };
                break;
            
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
                const slipRows = await sheet.getRows();
                const foundRow = slipRows.find(row => String(row.DS_No) === slipId);
                if (foundRow) {
                    responseData = { slip: foundRow._rawData };
                } else { responseData = { error: `Duty Slip with ID ${slipId} not found.` };}
                break;

            case 'saveDutySlip':
                const dataToSave = JSON.parse(event.body);
                dataToSave.Timestamp = new Date().toISOString();
                const newRow = await sheet.addRow(dataToSave);
                await sendNewSlipEmail(auth, newRow);
                responseData = { success: true, message: `Duty Slip ${dataToSave.DS_No} saved.` };
                break;

            case 'updateDutySlip':
                const updatedData = JSON.parse(event.body);
                const slipToUpdateId = String(updatedData.DS_No);
                const updateRows = await sheet.getRows();
                const rowToUpdate = updateRows.find(row => String(row.DS_No) === slipToUpdateId);

                if (rowToUpdate) {
                    for (const header in updatedData) { if (updatedData[header] !== undefined) rowToUpdate[header] = updatedData[header]; }
                    await rowToUpdate.save();

                    // Decide which update email to send
                    if (updatedData.Status === 'Closed by Driver') {
                        await sendDriverClosedEmail(auth, rowToUpdate);
                    } else if (updatedData.Status === 'Closed by Client') {
                        await sendClientClosedEmail(auth, rowToUpdate);
                    } else if (updatedData.Status === 'Updated by Manager') {
                        await sendManagerUpdatedEmail(auth, rowToUpdate);
                    }
                    responseData = { success: true, message: `Duty Slip ${slipToUpdateId} updated.` };
                } else { responseData = { error: `Could not find Duty Slip ${slipToUpdateId}` }; }
                break;
            
            default:
                responseData = { error: 'Invalid action.' };
        }
        return { statusCode: 200, body: JSON.stringify(responseData) };

    } catch (error) {
        console.error('API Error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};

// --- 3. Email Sending Logic ---
async function sendEmail(auth, subject, htmlBody) {
    const gmail = google.gmail({ version: 'v1', auth });
    const email = [
        'Content-Type: text/html; charset="UTF-8"', 'MIME-Version: 1.0',
        'to: travels@shrishgroup.com', 'cc: shrishtravels1@gmail.com',
        `subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`, '', htmlBody
    ].join('\n');
    const encodedMessage = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
    await gmail.users.messages.send({ userId: 'me', requestBody: { raw: encodedMessage } });
}

// --- 4. HTML Email Templates ---

function generateActionButtons(data) {
    return `
        <div style="margin: 30px 0; padding-top: 20px; border-top: 1px solid #eee;">
            <h3 style="color: #3730A3; text-align: center; margin-bottom: 20px;">QUICK ACTIONS</h3>
            <table style="width: 100%; border-collapse: collapse; text-align: center;">
                <tr>
                    <td style="padding: 5px;"><a href="https://admin.shrishgroup.com/view.html?id=${data.DS_No}" style="background-color: #4F46E5; color: white; padding: 10px; text-decoration: none; border-radius: 8px; font-weight: bold; display: block; font-size: 14px;">View/Print</a></td>
                    <td style="padding: 5px;"><a href="https://admin.shrishgroup.com/edit-slip.html?id=${data.DS_No}" style="background-color: #111827; color: white; padding: 10px; text-decoration: none; border-radius: 8px; font-weight: bold; display: block; font-size: 14px;">Edit Slip</a></td>
                </tr>
                <tr>
                    <td style="padding: 5px;"><a href="https://wa.me/91${(data.Driver_Mobile || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Link to close trip #${data.DS_No}: https://admin.shrishgroup.com/close-slip.html?id=${data.DS_No}`)}" style="background-color: #25D366; color: white; padding: 10px; text-decoration: none; border-radius: 8px; font-weight: bold; display: block; font-size: 14px;">Share to Driver</a></td>
                    <td style="padding: 5px;"><a href="https://wa.me/91${(data.Guest_Mobile || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Dear ${data.Guest_Name}, your driver for trip #${data.DS_No} is ${data.Driver_Name} (${data.Driver_Mobile}). - Shrish Travels`)}" style="background-color: #0D9488; color: white; padding: 10px; text-decoration: none; border-radius: 8px; font-weight: bold; display: block; font-size: 14px;">Send Info to Guest</a></td>
                </tr>
                 <tr>
                    <td style="padding: 5px;" colspan="2"><a href="https://wa.me/91${(data.Guest_Mobile || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Dear ${data.Guest_Name}, Thank you for choosing Shrish Travels! Please leave us a review: https://g.page/r/CaYoGVSEfXMNEBM/review`)}" style="background-color: #be123c; color: white; padding: 10px; text-decoration: none; border-radius: 8px; font-weight: bold; display: block; font-size: 14px;">Send "Thank You" & Ask for Review</a></td>
                </tr>
            </table>
            <div style="text-align:center; margin-top: 20px;"><a href="https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit">Open Google Sheet</a></div>
        </div>`;
}

function sendNewSlipEmail(auth, data) {
    const subject = `📝 New Duty Slip Created: #${data.DS_No}`;
    const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <a href="https://www.shrishgroup.com"><img src="https://travels.shrishgroup.com/assets/images/sh1.webp" alt="Shrish Group Logo" style="display:block; margin: 0 auto 20px; max-width: 150px;"></a>
            <h2 style="color: #4F46E5; text-align: center;">New Duty Slip Created</h2>
            <p style="color: #666; text-align: center;">A new slip has been recorded for D.S. No: <strong>#${data.DS_No}</strong></p>
            <p style="color: #666; text-align: center;">Guest: <strong>${data.Guest_Name || 'N/A'}</strong> | Driver: <strong>${data.Driver_Name || 'N/A'}</strong></p>
            ${generateActionButtons(data)}
        </div>`;
    return sendEmail(auth, subject, htmlBody);
}

function sendManagerUpdatedEmail(auth, data) {
    const subject = `✏️ Duty Slip Updated by Manager: #${data.DS_No}`;
    const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <a href="https://www.shrishgroup.com"><img src="https://travels.shrishgroup.com/assets/images/sh1.webp" alt="Shrish Group Logo" style="display:block; margin: 0 auto 20px; max-width: 150px;"></a>
            <h2 style="color: #4F46E5; text-align: center;">Duty Slip #${data.DS_No} Updated</h2>
            <p style="color: #666; text-align: center;">A manager has made changes to this duty slip.</p>
            ${generateActionButtons(data)}
        </div>`;
    return sendEmail(auth, subject, htmlBody);
}

function sendDriverClosedEmail(auth, data) {
    const subject = `✅ Duty Slip Closed by Driver: #${data.DS_No}`;
    const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <a href="https://www.shrishgroup.com"><img src="https://travels.shrishgroup.com/assets/images/sh1.webp" alt="Shrish Group Logo" style="display:block; margin: 0 auto 20px; max-width: 150px;"></a>
            <h2 style="color: #0D9488; text-align: center;">Duty Slip #${data.DS_No} Closed by Driver</h2>
            <p style="color: #666; text-align: center;">The driver has submitted their closing details.</p>
            ${generateActionButtons(data)}
        </div>`;
    return sendEmail(auth, subject, htmlBody);
}

function sendClientClosedEmail(auth, data) {
    const subject = `✅ Duty Slip Confirmed by Guest: #${data.DS_No}`;
    const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <a href="https://www.shrishgroup.com"><img src="https://travels.shrishgroup.com/assets/images/sh1.webp" alt="Shrish Group Logo" style="display:block; margin: 0 auto 20px; max-width: 150px;"></a>
            <h2 style="color: #0D9488; text-align: center;">Duty Slip #${data.DS_No} Confirmed by Guest</h2>
            <p style="color: #666; text-align: center;">The guest has confirmed their trip details and signed.</p>
            ${generateActionButtons(data)}
        </div>`;
    return sendEmail(auth, subject, htmlBody);
}