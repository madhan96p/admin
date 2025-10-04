const { GoogleSpreadsheet } = require('google-spreadsheet');
const { Resend } = require('resend');

const SPREADSHEET_ID = '1eqSsdKzF71WR6KR7XFkEI8NW7ObtnxC16ZtavJeePq8';

// --- Main Handler ---
exports.handler = async function(event, context) {
    // --- 1. Authentication for Google Sheets ---
    const sheetAuth = {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    await doc.useServiceAccountAuth(sheetAuth);
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
                    return {
                        Timestamp: row.Timestamp, DS_No: row.DS_No, Booking_ID: row.Booking_ID, Date: row.Date, Organisation: row.Organisation,
                        Guest_Name: row.Guest_Name, Guest_Mobile: row.Guest_Mobile, Booked_By: row.Booked_By, Reporting_Time: row.Reporting_Time,
                        Reporting_Address: row.Reporting_Address, Spl_Instruction: row.Spl_Instruction, Vehicle_Type: row.Vehicle_Type,
                        Vehicle_No: row.Vehicle_No, Driver_Name: row.Driver_Name, Driver_Mobile: row.Driver_Mobile, Assignment: row.Assignment,
                        Routing: row.Routing, Date_Out: row.Date_Out, Date_In: row.Date_In, Total_Days: row.Total_Days, Time_Out: row.Time_Out,
                        Time_In: row.Time_In, Km_Out: row.Km_Out, Km_In: row.Km_In, Driver_Time_Out: row.Driver_Time_Out, Driver_Time_In: row.Driver_Time_In,
                        Driver_Km_Out: row.Driver_Km_Out, Driver_Km_In: row.Driver_Km_In, Driver_Total_Hrs: row.Driver_Total_Hrs,
                        Driver_Total_Kms: row.Driver_Total_Kms, Auth_Signature_Link: row.Auth_Signature_Link,
                        Guest_Signature_Link: row.Guest_Signature_Link, Status: row.Status
                    };
                });
                responseData = { slips: slips };
                break;
            
            case 'getDutySlipById':
                const slipId = event.queryStringParameters.id;
                const slipRows = await sheet.getRows();
                const foundRow = slipRows.find(row => String(row.DS_No) === slipId);
                if (foundRow) { responseData = { slip: foundRow._rawData }; } 
                else { responseData = { error: `Duty Slip with ID ${slipId} not found.` };}
                break;

            case 'saveDutySlip':
                const dataToSave = JSON.parse(event.body);
                dataToSave.Timestamp = new Date().toISOString();
                const newRow = await sheet.addRow(dataToSave);
                await sendNewSlipEmail(newRow); // Auth removed
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

                    if (updatedData.Status === 'Closed by Driver') { await sendDriverClosedEmail(rowToUpdate); } 
                    else if (updatedData.Status === 'Closed by Client') { await sendClientClosedEmail(rowToUpdate); } 
                    else if (updatedData.Status === 'Updated by Manager') { await sendManagerUpdatedEmail(rowToUpdate); }
                    
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

// --- 3. Email Sending Logic (NEW with Resend) ---
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail(subject, htmlBody) {
    try {
        await resend.emails.send({
            from: 'Shrish Travels <travels@shrishgroup.com>',
            to: ['travels@shrishgroup.com'],
            cc: ['shrishtravels1@gmail.com'],
            subject: subject,
            html: htmlBody,
        });
        console.log('Email sent successfully via Resend.');
    } catch (error) {
        console.error('Error sending email with Resend:', error);
        throw error;
    }
}

// --- 4. HTML Email Templates (NEW & IMPROVED) ---

// Helper function to generate rich WhatsApp message links
function generateWhatsappLink(mobile, message) {
    const cleanMobile = (mobile || '').replace(/\D/g, '');
    if (!cleanMobile) return '#'; // Return a dead link if no number is available
    return `https://wa.me/91${cleanMobile}?text=${encodeURIComponent(message.trim())}`;
}

// Generates the action buttons for the email body
function generateActionButtons(data) {
    const contactInfo = `\nFor assistance:\n📞 +91 8883451668\n📧 travels@shrishgroup.com\n🌐 https://shrishgroup.com/contact`;

    // 1. Message for Driver
    const driverMessage = `*Duty Slip: #${data.DS_No}*\n\n👤 Guest: ${data.Guest_Name}\n⏰ Time: ${data.Reporting_Time}\n📍 Address: ${data.Reporting_Address}\n\n🔗 *Close Link:* https://admin.shrishgroup.com/close-slip.html?id=${data.DS_No}\n\n- Shrish Travels`;
    const driverLink = generateWhatsappLink(data.Driver_Mobile, driverMessage);

    // 2. Message with Chauffeur Info for Guest
    const guestInfoMessage = `Dear ${data.Guest_Name},\n\nYour ride with Shrish Travels is confirmed.\n\n*Your Chauffeur Details:*\n👤 Name: ${data.Driver_Name}\n📞 Contact: ${data.Driver_Mobile}\n🚗 Vehicle: ${data.Vehicle_Type} (${data.Vehicle_No})\n\nThank you for choosing us.${contactInfo}`;
    const guestInfoLink = generateWhatsappLink(data.Guest_Mobile, guestInfoMessage);
    
    // 3. Message asking Guest to sign/close
    const guestCloseMessage = `Dear ${data.Guest_Name},\n\nThank you for travelling with us. Please confirm your trip details by signing via the secure link below.\n\n🔗 *Confirm Your Trip:* https://admin.shrishgroup.com/client-close.html?id=${data.DS_No}\n\n- Shrish Travels${contactInfo}`;
    const guestCloseLink = generateWhatsappLink(data.Guest_Mobile, guestCloseMessage);

    // 4. Thank You & Review Message
    const thankYouMessage = `Dear ${data.Guest_Name},\n\nWe hope you had a pleasant journey. If you have a moment, please consider leaving us a review on Google.\n\n⭐ *Leave a Review:* https://g.page/r/CaYoGVSEfXMNEBM/review\n\nWe look forward to serving you again.\n- Shrish Travels${contactInfo}`;
    const thankYouLink = generateWhatsappLink(data.Guest_Mobile, thankYouMessage);

    return `
        <div style="margin: 30px 0; padding-top: 20px; border-top: 1px solid #eee;">
            <h3 style="color: #3730A3; text-align: center; margin-bottom: 20px;">QUICK ACTIONS</h3>
            <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 14px;">
                <tr>
                    <td style="padding: 5px;"><a href="https://admin.shrishgroup.com/view.html?id=${data.DS_No}" style="background-color: #4F46E5; color: white; padding: 12px; text-decoration: none; border-radius: 8px; font-weight: bold; display: block;">View/Print</a></td>
                    <td style="padding: 5px;"><a href="https://admin.shrishgroup.com/edit-slip.html?id=${data.DS_No}" style="background-color: #111827; color: white; padding: 12px; text-decoration: none; border-radius: 8px; font-weight: bold; display: block;">Edit Slip</a></td>
                </tr>
                <tr>
                    <td style="padding: 5px;"><a href="${driverLink}" style="background-color: #25D366; color: white; padding: 12px; text-decoration: none; border-radius: 8px; font-weight: bold; display: block;">Share Close Link to Driver</a></td>
                    <td style="padding: 5px;"><a href="${guestInfoLink}" style="background-color: #0D9488; color: white; padding: 12px; text-decoration: none; border-radius: 8px; font-weight: bold; display: block;">Send Chauffeur Info to Guest</a></td>
                </tr>
                 <tr>
                    <td style="padding: 5px;"><a href="${guestCloseLink}" style="background-color: #6d28d9; color: white; padding: 12px; text-decoration: none; border-radius: 8px; font-weight: bold; display: block;">Ask Guest to Sign/Close</a></td>
                    <td style="padding: 5px;"><a href="${thankYouLink}" style="background-color: #be123c; color: white; padding: 12px; text-decoration: none; border-radius: 8px; font-weight: bold; display: block;">Send Thank You & Review Link</a></td>
                </tr>
            </table>
            <div style="text-align:center; margin-top: 20px;"><a href="https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit">Open Google Sheet</a></div>
        </div>`;
}

// Generates a standard, professional footer for all emails
function generateEmailFooter() {
    return `
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
            <p>Shrish Group | Shrish Travels</p>
            <p>For assistance, contact <a href="mailto:travels@shrishgroup.com">travels@shrishgroup.com</a> or call +91 8883451668</p>
        </div>
    `;
}

// Improved Email Template for New Slips
function sendNewSlipEmail(data) {
    const subject = `📝 New Duty Slip Created: #${data.DS_No} for ${data.Guest_Name || 'N/A'}`;
    const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <a href="https://www.shrishgroup.com"><img src="https://travels.shrishgroup.com/assets/images/sh1.webp" alt="Shrish Group Logo" style="display:block; margin: 0 auto 20px; max-width: 150px;"></a>
            <h2 style="color: #4F46E5; text-align: center;">New Duty Slip Created</h2>
            <p style="color: #333; text-align: center; font-size: 18px;">D.S. No: <strong>#${data.DS_No}</strong></p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin-top: 20px; text-align: left;">
                <p><strong>Guest:</strong> ${data.Guest_Name || 'N/A'} (${data.Guest_Mobile || 'N/A'})</p>
                <p><strong>Reporting Time:</strong> ${data.Reporting_Time || 'N/A'}</p>
                <p><strong>Reporting Address:</strong> ${data.Reporting_Address || 'N/A'}</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 10px 0;">
                <p><strong>Driver:</strong> ${data.Driver_Name || 'N/A'} (${data.Driver_Mobile || 'N/A'})</p>
                <p><strong>Vehicle:</strong> ${data.Vehicle_Type || 'N/A'} (${data.Vehicle_No || 'N/A'})</p>
            </div>
            ${generateActionButtons(data)}
            ${generateEmailFooter()}
        </div>`;
    return sendEmail(subject, htmlBody);
}

// Improved Email Template for Manager Updates
function sendManagerUpdatedEmail(data) {
    const subject = `✏️ Duty Slip Updated: #${data.DS_No} for ${data.Guest_Name || 'N/A'}`;
    const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <a href="https://www.shrishgroup.com"><img src="https://travels.shrishgroup.com/assets/images/sh1.webp" alt="Shrish Group Logo" style="display:block; margin: 0 auto 20px; max-width: 150px;"></a>
            <h2 style="color: #4F46E5; text-align: center;">Duty Slip #${data.DS_No} Updated</h2>
            <p style="color: #666; text-align: center;">A manager has made changes to this duty slip. Please review the latest details.</p>
             <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin-top: 20px; text-align: left;">
                <p><strong>Guest:</strong> ${data.Guest_Name || 'N/A'}</p>
                <p><strong>Driver:</strong> ${data.Driver_Name || 'N/A'}</p>
                <p><strong>Status:</strong> ${data.Status || 'N/A'}</p>
            </div>
            ${generateActionButtons(data)}
            ${generateEmailFooter()}
        </div>`;
    return sendEmail(subject, htmlBody);
}

// Improved Email Template for Driver Closing Slip
function sendDriverClosedEmail(data) {
    const subject = `✅ Driver Closed Trip: #${data.DS_No} | Ready for Review`;
    const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <a href="https://www.shrishgroup.com"><img src="https://travels.shrishgroup.com/assets/images/sh1.webp" alt="Shrish Group Logo" style="display:block; margin: 0 auto 20px; max-width: 150px;"></a>
            <h2 style="color: #0D9488; text-align: center;">Trip Closed by Driver</h2>
            <p style="color: #333; text-align: center; font-size: 18px;">D.S. No: <strong>#${data.DS_No}</strong></p>
            <p style="color: #666; text-align: center;">The driver has submitted their closing details. Please verify and take further action.</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin-top: 20px; text-align: left;">
                <p><strong>Driver Total KMs:</strong> ${data.Driver_Total_Kms || 'N/A'}</p>
                <p><strong>Driver Total Hours:</strong> ${data.Driver_Total_Hrs || 'N/A'}</p>
            </div>
            ${generateActionButtons(data)}
            ${generateEmailFooter()}
        </div>`;
    return sendEmail(subject, htmlBody);
}

// Improved Email Template for Guest Closing Slip
function sendClientClosedEmail(data) {
    const subject = `✍️ Guest Confirmed Trip: #${data.DS_No} | Finalized`;
    const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <a href="https://www.shrishgroup.com"><img src="https://travels.shrishgroup.com/assets/images/sh1.webp" alt="Shrish Group Logo" style="display:block; margin: 0 auto 20px; max-width: 150px;"></a>
            <h2 style="color: #0D9488; text-align: center;">Trip Confirmed by Guest</h2>
            <p style="color: #333; text-align: center; font-size: 18px;">D.S. No: <strong>#${data.DS_No}</strong></p>
            <p style="color: #666; text-align: center;">The guest has confirmed their trip details and provided their signature. This slip is finalized.</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin-top: 20px; text-align: center;">
                <p><strong>Guest Signature:</strong></p>
                <img src="${data.Guest_Signature_Link || ''}" alt="Guest Signature" style="max-width: 200px; height: auto; border: 1px solid #ccc;"/>
            </div>
            ${generateActionButtons(data)}
            ${generateEmailFooter()}
        </div>`;
    return sendEmail(subject, htmlBody);
}