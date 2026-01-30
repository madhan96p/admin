const { GoogleSpreadsheet } = require("google-spreadsheet");
const ADMIN_URL = "https://admin.shrishgroup.com";
const FALLBACK_URL = "https://velvety-lollipop-c51872.netlify.app";
const { Resend } = require("resend");

const SPREADSHEET_ID = "1eqSsdKzF71WR6KR7XFkEI8NW7ObtnxC16ZtavJeePq8";

const formatCurrency = (num) =>
  parseFloat(num || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  });

// --- Helper Functions (Moved to top for scope and utility) ---

/**
 * Reformats a date string to dd/mm/yyyy (e.g., "11/10/2025").
 * Assumes the input is compatible with the Date constructor (e.g., ISO, YYYY-MM-DD, or MM/DD/YYYY).
 * @param {string} dateString The date to format.
 * @returns {string} The formatted date string in dd/mm/yyyy.
 */
function formatToDdmmyyyy(dateString) {
  if (!dateString) return "N/A";
  try {
    // Attempt to parse the date. If it's already a Date object, this is safe.
    // If it's a string like 'dd/mm/yyyy', the Date constructor might misinterpret it (MM/DD/YYYY).
    // A safer parsing approach is needed for robustness, but we'll stick to native for simplicity here.
    const date = new Date(dateString);

    // Basic check for invalid date
    if (isNaN(date.getTime())) {
      // If the date is invalid, attempt to re-parse it by flipping if slashes are present,
      // assuming an American-style input "MM/DD/YYYY"
      if (dateString.includes("/") && dateString.split("/").length === 3) {
        const parts = dateString.split("/");
        // This assumes input is MM/DD/YYYY for re-parsing
        dateString = `${parts[1]}/${parts[0]}/${parts[2]}`;
        const flippedDate = new Date(dateString);
        if (!isNaN(flippedDate.getTime())) {
          date = flippedDate;
        } else {
          return dateString; // Return original if still unparsable
        }
      } else {
        return dateString; // Return original if still unparsable
      }
    }

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
    const year = date.getFullYear();

    // 📅 CORRECTED FORMAT: ddmmyyyy with slashes
    return `${day}/${month}/${year}`;
  } catch (e) {
    console.error("Date formatting error:", e);
    return dateString; // Return original if parsing fails
  }
}

/**
 * Generates a rich WhatsApp message link.
 * @param {string} mobile The recipient's mobile number.
 * @param {string} message The message to be pre-filled.
 * @returns {string} The formatted WhatsApp URL.
 */
function generateWhatsappLink(mobile, message) {
  const cleanMobile = (mobile || "").replace(/\D/g, "");
  // Returns a non-functional link if the mobile number is invalid.
  if (!cleanMobile) return "#";
  return `https://wa.me/91${cleanMobile}?text=${encodeURIComponent(message.trim())}`;
}

/**
 * Generates the action buttons section for the email body with a professional design.
 * @param {object} data The data object for the current slip.
 * @returns {string} The HTML string for the action buttons.
 */
function generateActionButtons(data) {
  // 🚗 Modification 1: Ensure Vehicle_No is uppercase for the message link construction
  const vehicleNo = (data.Vehicle_No || "").toUpperCase();

  // 📅 Modification 3: Format the date for the WhatsApp message
  const formattedDate = formatToDdmmyyyy(data.Date);

  // Contact signatures for different message contexts
  // 📧 Note: Keeping email here is fine for the GUEST email signature, as the problem was in the driver message.
  const guestSignature = `\n\nFor bookings, please contact:\n📞 ‪‪+91 8883451668‬‬ / ‪‪+91 9176500207‬‬\n📧 info@shrishgroup.com\n🌐 ‪www.shrishgroup.com/contact`;
  const driverSignature = `\n\nRegards Shrish Group\nContact +91 8883451668 / 9176500207\n- Sent via Shrish Travels`;

  // 4. Modification: NEW WhatsApp Driver Message Format
  const driverMessage = `*Duty Slip: #${data.DS_No}*\n\n👤 Guest: ${data.Guest_Name}\n⏰ Time: ${data.Reporting_Time}\n📍 Address: ${data.Reporting_Address}\n\n🔗 *Tap to Complete Duty Slip:* ${ADMIN_URL}/edit-slip.html?id=${data.DS_No}\n\n- Shrish Travels Team`;

  const driverLink = generateWhatsappLink(data.Driver_Mobile, driverMessage);

  // 2. Message for the Guest with chauffeur information
  const guestInfoMessage = `Dear Sir/Madam,\nPlease find below the driver and vehicle details for your trip:\n\nDriver Name : ${data.Driver_Name} / +91 ${data.Driver_Mobile}\nVehicle : ${data.Vehicle_Type}/ *${vehicleNo}*\n\nThe driver will arrive on time at the pickup location.\nFor any assistance, feel free to contact us.\n\nThank you for choosing Shrish Travels.${guestSignature}`;
  const guestInfoLink = generateWhatsappLink(
    data.Guest_Mobile,
    guestInfoMessage,
  );

  // 3. Message asking the Guest to sign and close the trip
  const guestCloseMessage = `Dear ${data.Guest_Name},\n\nThank you for travelling with us. Please confirm your trip details by signing via the secure link below.\n\n🔗 *Confirm Your Trip:* https://admin.shrishgroup.com/client-close.html?id=${data.DS_No}${guestSignature}`;
  const guestCloseLink = generateWhatsappLink(
    data.Guest_Mobile,
    guestCloseMessage,
  );

  // 4. Thank You message with a Google Review link
  const thankYouMessage = `Dear ${data.Guest_Name},\n\nWe hope you had a pleasant journey. If you have a moment, please consider leaving us a review on Google.\n\n⭐ *Leave a Review:* https://g.page/r/CaYoGVSEfXMNEBM/review\n\nWe look forward to serving you again.\n- Shrish Travels${guestSignature}`;
  const thankYouLink = generateWhatsappLink(data.Guest_Mobile, thankYouMessage);

  return `
        <div style="margin: 40px 0 0 0; padding-top: 30px; border-top: 1px solid #e5e7eb;">
            <h3 style="color: #111827; text-align: center; margin: 0 0 25px 0; font-size: 18px; font-weight: 600; letter-spacing: 0.5px;">QUICK ACTIONS</h3>
            <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 14px;">
                <tr>
                    <td style="padding: 6px;"><a href="https://admin.shrishgroup.com/view.html?id=${data.DS_No}" style="background-color: #4338CA; color: white; padding: 14px; text-decoration: none; border-radius: 8px; font-weight: 600; display: block; letter-spacing: 0.5px;">View / Print</a></td>
                    <td style="padding: 6px;"><a href="https://admin.shrishgroup.com/edit-slip.html?id=${data.DS_No}" style="background-color: #374151; color: white; padding: 14px; text-decoration: none; border-radius: 8px; font-weight: 600; display: block; letter-spacing: 0.5px;">Edit Slip</a></td>
                </tr>
                <tr>
                    <td style="padding: 6px;"><a href="${driverLink}" style="background-color: #25D366; color: white; padding: 14px; text-decoration: none; border-radius: 8px; font-weight: 600; display: block; letter-spacing: 0.5px;">Share to Driver</a></td>
                    <td style="padding: 6px;"><a href="${guestInfoLink}" style="background-color: #0D9488; color: white; padding: 14px; text-decoration: none; border-radius: 8px; font-weight: 600; display: block; letter-spacing: 0.5px;">Share to Guest</a></td>
                </tr>
                <tr>
                    <td style="padding: 6px;"><a href="${guestCloseLink}" style="background-color: #6d28d9; color: white; padding: 14px; text-decoration: none; border-radius: 8px; font-weight: 600; display: block; letter-spacing: 0.5px;">Ask Guest to Sign</a></td>
                    <td style="padding: 6px;"><a href="${thankYouLink}" style="background-color: #be123c; color: white; padding: 14px; text-decoration: none; border-radius: 8px; font-weight: 600; display: block; letter-spacing: 0.5px;">Send Review Link</a></td>
                </tr>
            </table>
            <div style="text-align:center; margin-top: 25px; font-size: 14px;">
                <a href="https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit" style="color: #4338CA; text-decoration: none; font-weight: 500;">Open Google Sheet</a>
            </div>
        </div>`;
}

/**
 * Generates a standard, professional footer for all emails.
 * @returns {string} The HTML string for the email footer.
 */
function generateEmailFooter() {
  return `
        <div style="text-align: center; padding: 30px 20px; font-size: 12px; color: #6b7280; line-height: 1.5;">
            <p style="margin: 0 0 5px 0;">Shrish Group | Shrish Travels</p>
            <p style="margin: 0;">For assistance, contact <a href="mailto:travels@shrishgroup.com" style="color: #4338CA; text-decoration: none;">travels@shrishgroup.com</a> or call +91 8883451668</p>
            <p style="color: #9ca3af; font-size: 11px; margin: 20px 0 0 0;">
                Developer: <a href="https://pragadeeshfolio.netlify.app/" style="color: #6b7280; text-decoration: none;">P S</a> | <a href="tel:+918903558066" style="color: #6b7280; text-decoration: none;">Contact</a>
            </p>
        </div>
    `;
}

/**
 * Generates the main HTML structure for a professional-looking email.
 * @param {string} title The title of the email.
 * @param {string} contentHtml The main content HTML specific to the email type.
 * @returns {string} The full HTML email body.
 */
function generateEmailBase(title, contentHtml) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <title>${title}</title>
    <link rel="icon" type="image/x-icon" href="assets/images/favicon/favicon.ico">

</head>
    <body style="margin: 0; padding: 0; font-family: 'Inter', Arial, sans-serif; background-color: #f0f2f5;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f0f2f5;">
            <tr>
                <td align="center" style="padding: 20px;">
                    <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%;">
                        <tr>
                            <td align="center" style="padding: 20px 0;">
                                <a href="https://www.shrishgroup.com">
                                    <img src="https://admin.shrishgroup.com/assets/images/w-logo.webp" alt="Shrish Group Logo" style="display:block; max-width: 150px; background-color: #ffffff; padding: 10px; border-radius: 100px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                                </a>
                            </td>
                        </tr>
                        <tr>
                            <td style="background-color: #ffffff; padding: 40px 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                                ${contentHtml}
                            </td>
                        </tr>
                        <tr>
                            <td align="center">
                                ${generateEmailFooter()}
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>`;
}

/**
 * Generates a more unique, non-guessable public ID to minimize collision risk.
 * Not cryptographically secure, but sufficient for a unique, non-guessable URL.
 * @returns {string} A ~13-character random ID (e.g., "k1m92babc123xyz").
 */
function generatePublicId() {
  const timePart = Date.now().toString(36).slice(-6); // Last 6 chars of timestamp in base36
  const randomPart = Math.random().toString(36).substring(2, 9); // 7 random base36 chars
  return `${timePart}${randomPart}`;
}

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail(subject, htmlBody) {
  try {
    await resend.emails.send({
      from: "Shrish Travels <travels@shrishgroup.com>",
      to: ["travels@shrishgroup.com"],
      cc: ["shrishtravels1@gmail.com"],
      subject: subject,
      html: htmlBody,
    });
    console.log("Email sent successfully via Resend.");
  } catch (error) {
    console.error("Error sending email with Resend:", error);
    throw error;
  }
}

function sendNewSlipEmail(data) {
  const subject = `📝 New Duty Slip Created: #${data.DS_No} for ${data.Guest_Name || "N/A"}`;
  const content = `
        <h2 style="color: #111827; text-align: center; margin-top: 0; margin-bottom: 10px; font-size: 24px; font-weight: 700;">New Duty Slip Created</h2>
        <p style="color: #4b5563; text-align: center; font-size: 20px; margin-top: 0; margin-bottom: 30px;">D.S. No: <strong>#${data.DS_No}</strong></p>
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; margin-top: 20px; text-align: left; font-size: 16px; line-height: 1.6;">
            <p style="margin: 0 0 12px 0;"><strong>Guest:</strong> ${data.Guest_Name || "N/A"} (+91${data.Guest_Mobile || "N/A"})</p>
            <p style="margin: 0 0 12px 0;"><strong>Reporting Time:</strong> ${data.Reporting_Time || "N/A"}</p>
            <p style="margin: 0;"><strong>Reporting Address:</strong> ${data.Reporting_Address || "N/A"}</p>
            <div style="height: 1px; background-color: #e5e7eb; margin: 20px 0;"></div>
            <p style="margin: 0 0 12px 0;"><strong>Driver:</strong> ${data.Driver_Name || "N/A"} (+91${data.Driver_Mobile || "N/A"})</p>
            <p style="margin: 0;"><strong>Vehicle:</strong> ${data.Vehicle_Type || "N/A"} (${(data.Vehicle_No || "N/A").toUpperCase()})</p>
        </div>
        ${generateActionButtons(data)}
    `;
  const htmlBody = generateEmailBase(subject, content);
  return sendEmail(subject, htmlBody);
}

function sendManagerUpdatedEmail(data) {
  const subject = `✏️ Duty Slip Updated: #${data.DS_No} for ${data.Guest_Name || "N/A"}`;
  const content = `
        <h2 style="color: #111827; text-align: center; margin-top: 0; margin-bottom: 10px; font-size: 24px; font-weight: 700;">Duty Slip Updated</h2>
        <p style="color: #4b5563; text-align: center; font-size: 16px; margin-top: 0; margin-bottom: 30px;">A manager has updated Duty Slip <strong>#${data.DS_No}</strong>. Please review the details.</p>
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; margin-top: 20px; text-align: left; font-size: 16px; line-height: 1.6;">
            <p style="margin: 0 0 12px 0;"><strong>Guest:</strong> ${data.Guest_Name || "N/A"}</p>
            <p style="margin: 0 0 12px 0;"><strong>Driver:</strong> ${data.Driver_Name || "N/A"}</p>
            <p style="margin: 0;"><strong>Status:</strong> <span style="font-weight: 600; color: #4338CA;">${data.Status || "N/A"}</span></p>
        </div>
        ${generateActionButtons(data)}
    `;
  const htmlBody = generateEmailBase(subject, content);
  return sendEmail(subject, htmlBody);
}

function sendDriverClosedEmail(data) {
  const subject = `✅ Driver Closed Trip: #${data.DS_No} | Ready for Review`;
  const content = `
        <h2 style="color: #059669; text-align: center; margin-top: 0; margin-bottom: 10px; font-size: 24px; font-weight: 700;">Trip Closed by Driver</h2>
        <p style="color: #4b5563; text-align: center; font-size: 16px; margin-top: 0; margin-bottom: 30px;">The driver has submitted closing details for trip <strong>#${data.DS_No}</strong>. Please verify.</p>
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; margin-top: 20px; text-align: left; font-size: 16px; line-height: 1.6;">
            <p style="margin: 0 0 12px 0;"><strong>Driver Total KMs:</strong> ${data.Driver_Total_Kms || "N/A"}</p>
            <p style="margin: 0;"><strong>Driver Total Hours:</strong> ${data.Driver_Total_Hrs || "N/A"}</p>
        </div>
        ${generateActionButtons(data)}
    `;
  const htmlBody = generateEmailBase(subject, content);
  return sendEmail(subject, htmlBody);
}

function sendClientClosedEmail(data) {
  const subject = `✍️ Guest Confirmed Trip: #${data.DS_No} | Finalized`;
  const content = `
        <h2 style="color: #059669; text-align: center; margin-top: 0; margin-bottom: 10px; font-size: 24px; font-weight: 700;">Trip Confirmed by Guest</h2>
        <p style="color: #4b5563; text-align: center; font-size: 16px; margin-top: 0; margin-bottom: 30px;">The guest has signed and finalized trip <strong>#${data.DS_No}</strong>.</p>
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; margin-top: 20px; text-align: center;">
            <p style="font-size: 16px; margin: 0 0 10px 0; color: #111827;"><strong>Guest Signature:</strong></p>
            <img src="${data.Guest_Signature_Link || "https://placehold.co/200x80/e5e7eb/4b5563?text=No+Signature"}" alt="Guest Signature" style="max-width: 200px; height: auto; border: 1px solid #ccc; border-radius: 4px;"/>
        </div>
        ${generateActionButtons(data)}
    `;
  const htmlBody = generateEmailBase(subject, content);
  return sendEmail(subject, htmlBody);
}

function generateSalaryActionButtons(data) {
  // Generate the unique slip ID
  const slipId = `${data.EmployeeID}-${data.PayPeriod}`;

  // 1. WhatsApp message for the Founder
  const founderReviewLink = `https://admin.shrishgroup.com/salary-form.html?id=${slipId}`;
  const founderMessage = `New Salary Slip for ${data.EmployeeName} (${data.PayPeriod}) is ready for review and approval.\n\nPlease approve here:\n${founderReviewLink}\n\n- Sent via Shrish Admin`;
  const founderWhatsappLink = generateWhatsappLink(
    "9176500207",
    founderMessage,
  );

  // 2. Direct link for the manager to approve
  const managerReviewLink = `https://admin.shrishgroup.com/salary-form.html?id=${slipId}`;

  return `
        <div style="margin: 40px 0 0 0; padding-top: 30px; border-top: 1px solid #e5e7eb;">
            <h3 style="color: #111827; text-align: center; margin: 0 0 25px 0; font-size: 18px;">QUICK ACTIONS</h3>
            <table style="width: 100%; border-collapse: collapse; text-align: center;">
                <tr>
                    <td style="padding: 6px;"><a href="${managerReviewLink}" style="background-color: #4338CA; color: white; padding: 14px; text-decoration: none; border-radius: 8px; font-weight: 600; display: block;">Review & Approve</a></td>
                    <td style="padding: 6px;"><a href="${founderWhatsappLink}" style="background-color: #25D366; color: white; padding: 14px; text-decoration: none; border-radius: 8px; font-weight: 600; display: block;">Share to Founder</a></td>
                </tr>
            </table>
        </div>`;
}

function sendNewSalarySlipEmail(data) {
  const subject = `💰 New Salary Slip Created for ${data.EmployeeName} (${data.PayPeriod})`;

  const content = `
        <h2 style="color: #111827; text-align: center; margin-top: 0; font-size: 24px;">New Salary Slip Created</h2>
        <p style="color: #4b5563; text-align: center; font-size: 16px; margin: 0 0 30px 0;">A new salary slip for <strong>${data.EmployeeName}</strong> is awaiting approval.</p>
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; font-size: 16px;">
            <p style="margin: 0 0 12px 0;"><strong>Pay Period:</strong> ${data.PayPeriod}</p>
            <p style="margin: 0 0 12px 0;"><strong>Gross Earnings:</strong> ${formatCurrency(data.TotalEarnings)}</p>
            <p style="margin: 0 0 12px 0;"><strong>Total Deductions:</strong> ${formatCurrency(data.TotalDeductions)}</p>
            <div style="height: 1px; background-color: #e5e7eb; margin: 20px 0;"></div>
            <p style="margin: 0; font-size: 18px; font-weight: 700;"><strong>Net Payable: ${formatCurrency(data.NetPayableAmount)}</strong></p>
        </div>
        ${generateSalaryActionButtons(data)}
    `;
  const htmlBody = generateEmailBase(subject, content);
  return sendEmail(subject, htmlBody); // Your existing sendEmail function will handle the rest
}

/**
 * Sends an email to the employee after the manager has approved their salary slip.
 */
function sendManagerApprovalConfirmationEmail(data) {
  const subject = `✅ Approved: Salary Slip for ${data.EmployeeName} (${data.PayPeriod})`;
  const slipId = `${data.EmployeeID}-${data.PayPeriod}`;

  // 1. Create the secure link for the employee to view their slip
  const employeeViewLink = `https://admin.shrishgroup.com/view-salary.html?id=${slipId}`;

  // 2. Create the pre-filled WhatsApp message for the employee
  const employeeMessage = `Dear ${data.EmployeeName},\n\nYour salary slip is ready for viewing. Please review and finalize it using the secure link below.\n\nLink: ${employeeViewLink}\n\n- Shrish Travels`;
  const employeeWhatsappLink = generateWhatsappLink(
    data.EmployeeMobile,
    employeeMessage,
  );

  const content = `
        <h2 style="color: #16a34a; text-align: center; margin-top: 0; font-size: 24px;">Slip Approved!</h2>
        <p style="color: #4b5563; text-align: center; font-size: 16px; margin: 0 0 30px 0;">
            You have successfully approved the salary slip for <strong>${data.EmployeeName}</strong>.
        </p>
        <p style="color: #4b5563; text-align: center; font-size: 16px; margin: 0 0 30px 0;">
            The next step is to share the slip with the employee for their final signature.
        </p>
        <div style="text-align: center; margin: 40px 0;">
             <a href="${employeeWhatsappLink}" style="background-color: #25D366; color: white; padding: 16px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                <i class="fab fa-whatsapp"></i> Share Slip with Employee
             </a>
        </div>
        <p style="color: #6b7280; text-align: center; font-size: 14px;">Clicking the button will open WhatsApp with a pre-filled message and link.</p>
    `;
  const htmlBody = generateEmailBase(subject, content);
  return sendEmail(subject, htmlBody);
}

/**
 * Sends a final confirmation email to the manager after an employee signs.
 */
function sendFinalConfirmationEmail(data) {
  const subject = `✅ Salary Slip Finalized by ${data.EmployeeName} for ${data.PayPeriod}`;
  const slipId = `${data.EmployeeID}-${data.PayPeriod}`;
  const finalViewLink = `https://admin.shrishgroup.com/view-salary.html?id=${slipId}`;

  // Check if the employee added a note
  const employeeNoteHtml = data.ENotes
    ? `
        <div style="background-color: #FEFCE8; border: 1px solid #FDE047; padding: 20px; border-radius: 8px; margin-top: 20px; text-align: left; font-size: 16px;">
            <p style="margin: 0 0 10px 0; font-weight: 700; color: #854D0E;"><strong>Note from ${data.EmployeeName}:</strong></p>
            <p style="margin: 0; color: #854D0E;"><em>"${data.ENotes}"</em></p>
        </div>`
    : '<p style="text-align:center; color:#6b7280;">No notes were added by the employee.</p>';

  const content = `
        <h2 style="color: #16a34a; text-align: center; margin-top: 0; font-size: 24px;">Process Complete!</h2>
        <p style="color: #4b5563; text-align: center; font-size: 16px; margin: 0 0 30px 0;">
            <strong>${data.EmployeeName}</strong> has signed and finalized their salary slip for <strong>${data.PayPeriod}</strong>.
        </p>
        ${employeeNoteHtml}
        <div style="text-align: center; margin: 40px 0 0 0;">
             <a href="${finalViewLink}" style="background-color: #374151; color: white; padding: 16px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">View Finalized Slip</a>
        </div>
    `;
  const htmlBody = generateEmailBase(subject, content);
  return sendEmail(subject, htmlBody);
}

// --- Main Handler ---
exports.handler = async function (event, context) {
  // --- 1. Authentication for Google Sheets ---
  const sheetAuth = {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  };

  const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
  await doc.useServiceAccountAuth(sheetAuth);
  await doc.loadInfo();
  const sheet = doc.sheetsByTitle["duty_slips"];
  const salarySheet = doc.sheetsByTitle["salary_slips"];
  const financialsSheet = doc.sheetsByTitle["Financials"];
  const { action } = event.queryStringParameters;
  let responseData = {};

  try {
    // --- 2. API Actions (Switch Statement) ---
    switch (action) {
      case "getNextDutySlipId":
        const rows = await sheet.getRows();
        let nextId = 1;
        if (rows.length > 0) {
          const lastRow = rows[rows.length - 1];
          const lastId = parseInt(lastRow.DS_No);
          if (!isNaN(lastId)) {
            nextId = lastId + 1;
          }
        }
        responseData = { nextId: nextId };
        break;

      case "getAllDutySlips":
        const allRows = await sheet.getRows();
        const headers = sheet.headerValues;
        const slips = allRows.map((row) => {
          const slipObject = {};
          headers.forEach((header) => {
            slipObject[header] = row[header];
          });
          // 📅 Modification 4: Format date when fetching (for display in admin panel)
          if (slipObject.Date) {
            slipObject.Date = formatToDdmmyyyy(slipObject.Date);
          }
          return slipObject;
        });
        responseData = { slips: slips };
        break;

      case "getDutySlipById":
        const slipId = event.queryStringParameters.id;
        const slipRows = await sheet.getRows();
        const foundRow = slipRows.find((row) => String(row.DS_No) === slipId);

        if (foundRow) {
          const slipHeaders = sheet.headerValues; // Get all column headers
          const slipObject = {};
          slipHeaders.forEach((header) => {
            slipObject[header] = foundRow[header]; // Use the named property from the row
          });
          // 📅 Modification 4: Format date when fetching (for display in form)
          if (slipObject.Date) {
            slipObject.Date = formatToDdmmyyyy(slipObject.Date);
          }
          responseData = { slip: slipObject };
        } else {
          responseData = { error: `Duty Slip with ID ${slipId} not found.` };
        }
        break;

      case "saveDutySlip":
        const dataToSave = JSON.parse(event.body);
        dataToSave.Timestamp = new Date().toISOString();
        // 🚗 Modification 1a: Convert Vehicle_No to uppercase before saving
        if (
          dataToSave.Vehicle_No &&
          typeof dataToSave.Vehicle_No === "string"
        ) {
          dataToSave.Vehicle_No = dataToSave.Vehicle_No.toUpperCase();
        }
        const newRow = await sheet.addRow(dataToSave);
        await sendNewSlipEmail(newRow); // Auth removed
        responseData = {
          success: true,
          message: `Duty Slip ${dataToSave.DS_No} saved.`,
        };
        break;

      case "updateDutySlip":
        const updatedData = JSON.parse(event.body);
        const slipToUpdateId = String(updatedData.DS_No);
        // 🚗 Modification 1b: Convert Vehicle_No to uppercase before updating
        if (
          updatedData.Vehicle_No &&
          typeof updatedData.Vehicle_No === "string"
        ) {
          updatedData.Vehicle_No = updatedData.Vehicle_No.toUpperCase();
        }
        const updateRows = await sheet.getRows();
        const rowToUpdate = updateRows.find(
          (row) => String(row.DS_No) === slipToUpdateId,
        );

        if (rowToUpdate) {
          for (const header in updatedData) {
            if (updatedData[header] !== undefined)
              rowToUpdate[header] = updatedData[header];
          }
          await rowToUpdate.save();

          if (updatedData.Status === "Closed by Driver") {
            await sendDriverClosedEmail(rowToUpdate);
          } else if (updatedData.Status === "Closed by Client") {
            await sendClientClosedEmail(rowToUpdate);
          } else if (updatedData.Status === "Updated by Manager") {
            await sendManagerUpdatedEmail(rowToUpdate);
          }

          responseData = {
            success: true,
            message: `Duty Slip ${slipToUpdateId} updated.`,
          };
        } else {
          responseData = {
            error: `Could not find Duty Slip ${slipToUpdateId}`,
          };
        }
        break;

      case "createSalarySlip":
        const salaryData = JSON.parse(event.body);
        salaryData.DateGenerated = new Date().toISOString();
        await salarySheet.addRow(salaryData);
        await sendNewSalarySlipEmail(salaryData);

        responseData = {
          success: true,
          message: `Salary slip for ${salaryData.EmployeeName} created.`,
        };
        break;

      case "getAllSalarySlips":
        const salaryRows = await salarySheet.getRows();
        const salaryHeaders = salarySheet.headerValues;
        const numericHeaders = [
          "monthlysalary",
          "payabledays",
          "outstationqty",
          "outstationtotal",
          "extradutyqty",
          "extradutytotal",
          "totalearnings",
          "advancededuction",
          "lopdays",
          "lopdeduction",
          "totaldeductions",
          "netpayableamount",
        ];
        const allSalarySlips = salaryRows.map((row) => {
          const slipObject = {};
          salaryHeaders.forEach((header) => {
            let value = row[header];
            if (
              numericHeaders.includes(header.toLowerCase()) &&
              typeof value === "string"
            ) {
              value = value.replace(/,/g, "");
            }
            slipObject[header] = value;
          });
          return slipObject;
        });
        responseData = { slips: allSalarySlips };
        break;

      case "getSalarySlipById": {
        const salarySlipId = event.queryStringParameters.id;
        if (!salarySlipId)
          return {
            statusCode: 400,
            body: JSON.stringify({ error: "Slip ID is required." }),
          };

        const slipIdParts = salarySlipId.split("-");
        const employeeId = slipIdParts.shift();
        const payPeriod = slipIdParts.join("-");
        const allSlips = await salarySheet.getRows();

        // This logic finds the correct headers and trims whitespace
        const headers = salarySheet.headerValues;
        const employeeIdHeader = headers.find(
          (h) => h.toLowerCase() === "employeeid",
        );
        const payPeriodHeader = headers.find(
          (h) => h.toLowerCase() === "payperiod",
        );

        if (!employeeIdHeader || !payPeriodHeader) {
          throw new Error(
            "Could not find EmployeeID or PayPeriod columns in the Google Sheet.",
          );
        }

        const foundSlipRow = allSlips.find(
          (row) =>
            row[employeeIdHeader] &&
            row[employeeIdHeader].trim() === employeeId.trim() &&
            row[payPeriodHeader] &&
            row[payPeriodHeader].trim() === payPeriod.trim(),
        );

        if (foundSlipRow) {
          const slipObject = {};
          const numericHeaders = [
            "monthlysalary",
            "payabledays",
            "outstationqty",
            "outstationtotal",
            "extradutyqty",
            "extradutytotal",
            "totalearnings",
            "advancededuction",
            "lopdays",
            "lopdeduction",
            "totaldeductions",
            "netpayableamount",
          ];
          headers.forEach((header) => {
            let value = foundSlipRow[header];
            if (
              numericHeaders.includes(header.toLowerCase()) &&
              typeof value === "string"
            ) {
              value = value.replace(/,/g, "");
            }
            slipObject[header] = value;
          });
          responseData = { slip: slipObject };
        } else {
          responseData = {
            error: `Salary Slip with ID ${salarySlipId} not found.`,
          };
        }
        break;
      }

      case "updateSalarySlip": {
        const updatedSlipData = JSON.parse(event.body);
        const salarySlipToUpdateId = updatedSlipData.slipId;
        if (!salarySlipToUpdateId)
          return {
            statusCode: 400,
            body: JSON.stringify({
              error: "Slip ID is required for an update.",
            }),
          };

        const slipIdParts = salarySlipToUpdateId.split("-");
        const empIdToUpdate = slipIdParts.shift();
        const periodToUpdate = slipIdParts.join("-");
        const slipsToSearch = await salarySheet.getRows();

        const headers = salarySheet.headerValues;
        const employeeIdHeader = headers.find(
          (h) => h.toLowerCase() === "employeeid",
        );
        const payPeriodHeader = headers.find(
          (h) => h.toLowerCase() === "payperiod",
        );

        if (!employeeIdHeader || !payPeriodHeader) {
          throw new Error(
            "Could not find EmployeeID or PayPeriod columns in the Google Sheet.",
          );
        }

        const salaryRowToUpdate = slipsToSearch.find(
          (row) =>
            row[employeeIdHeader] &&
            row[employeeIdHeader].trim() === empIdToUpdate.trim() &&
            row[payPeriodHeader] &&
            row[payPeriodHeader].trim() === periodToUpdate.trim(),
        );

        if (salaryRowToUpdate) {
          for (const header in updatedSlipData) {
            const correctHeader = headers.find(
              (h) => h.toLowerCase() === header.toLowerCase(),
            );
            if (correctHeader && updatedSlipData[header] !== undefined) {
              salaryRowToUpdate[correctHeader] = updatedSlipData[header];
            }
          }
          await salaryRowToUpdate.save();

          if (updatedSlipData.Status === "Approved") {
            await sendManagerApprovalConfirmationEmail(salaryRowToUpdate); // Notify employee to sign
          } else if (updatedSlipData.Status === "Finalized") {
            await sendFinalConfirmationEmail(salaryRowToUpdate); // Notify manager of completion
          }
          responseData = {
            success: true,
            message: `Salary Slip ${salarySlipToUpdateId} updated.`,
          };
        } else {
          responseData = {
            error: `Could not find Salary Slip ${salarySlipToUpdateId} to update.`,
          };
        }
        break;
      }

      case "checkInvoiceExists": {
        const { bookingId } = event.queryStringParameters;
        const invoiceSheet = doc.sheetsByTitle["invoices"];
        if (!invoiceSheet) {
          throw new Error('"invoices" sheet not found in Google Spreadsheet.');
        }
        await invoiceSheet.loadHeaderRow();
        const invoiceRows = await invoiceSheet.getRows();
        const bookingIdHeader = "Booking_ID";
        const foundRow = invoiceRows.find(
          (row) => String(row[bookingIdHeader]) === String(bookingId)
        );
        responseData = { exists: !!foundRow };
        break;
      }

      case "saveInvoice": {
        const invoiceData = JSON.parse(event.body);
        const invoiceSheet = doc.sheetsByTitle["invoices"];
        if (!invoiceSheet) {
          throw new Error('"invoices" sheet not found in Google Spreadsheet.');
        }

        // Load headers and all rows to check for existing data
        await invoiceSheet.loadHeaderRow();
        const invoiceRows = await invoiceSheet.getRows();

        // Find the exact header names from your sheet (case-sensitive)
        const bookingIdHeader = "Booking_ID";
        const publicIdHeader = "Public_ID";
        const shareableLinkHeader = "Shareable_Link";

        const bookingIdToFind = String(invoiceData[bookingIdHeader]);
        const foundRow = invoiceRows.find(
          (row) => String(row[bookingIdHeader]) === bookingIdToFind,
        );

        let publicId;
        let shareableLink;

        if (foundRow) {
          // --- 1. IF YES (Overwrite) ---
          // Get the existing Public_ID
          publicId = foundRow[publicIdHeader];

          // Construct the shareable link
          shareableLink = `https://admin.shrishgroup.com/view-invoice.html?id=${publicId}`;

          // Add the link to the data we're saving
          invoiceData[shareableLinkHeader] = shareableLink;

          // Update all data in the found row
          for (const header in invoiceData) {
            if (invoiceSheet.headerValues.includes(header)) {
              foundRow[header] = invoiceData[header];
            }
          }
          await foundRow.save(); // Save the updated row
        } else {
          // --- 2. IF NO (New Invoice) ---
          let isUnique = false;
          do {
            // Generate a new 6-character Public_ID
            publicId = generatePublicId();
            // Perform the collision check
            isUnique = !invoiceRows.some(
              (row) => row[publicIdHeader] === publicId,
            );
          } while (!isUnique); // Loop until a unique ID is found

          // Construct the shareable link
          shareableLink = `https://admin.shrishgroup.com/view-invoice.html?id=${publicId}`;

          // Add the new IDs to the data before saving
          invoiceData[publicIdHeader] = publicId;
          invoiceData[shareableLinkHeader] = shareableLink;

          // Add the new row to the sheet
          await invoiceSheet.addRow(invoiceData);
        }

        // --- 3. Finally (Return) ---
        // Return the success message AND the new link for the frontend
        responseData = {
          success: true,
          shareableLink: shareableLink,
          message: `Invoice ${invoiceData.Invoice_ID} saved.`,
        };
        break;
      }

      case "getInvoiceByPublicId": {
        // RENAMED ACTION
        const publicId = event.queryStringParameters.pid; // RENAMED PARAM
        if (!publicId) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: "Public ID is required." }),
          };
        }

        const invoiceSheet = doc.sheetsByTitle["invoices"];
        if (!invoiceSheet) {
          throw new Error('"invoices" sheet not found in Google Spreadsheet.');
        }

        await invoiceSheet.loadHeaderRow();
        const invoiceHeaders = invoiceSheet.headerValues;
        const invoiceRows = await invoiceSheet.getRows();

        // Find the header name for Public_ID
        const publicIdHeader = "Public_ID";

        // Find the row by Public_ID
        const foundRow = invoiceRows.find(
          (row) => String(row[publicIdHeader]) === String(publicId),
        );

        if (foundRow) {
          const invoiceObject = {};
          invoiceHeaders.forEach((header) => {
            invoiceObject[header] = foundRow[header];
          });
          responseData = { invoice: invoiceObject };
        } else {
          responseData = { error: `Invoice with ID ${publicId} not found.` };
        }
        break;
      }

      case "getReviewById": {
        const reviewId = event.queryStringParameters.id;
        if (!reviewId) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: "Review ID is required." }),
          };
        }

        const reviewSheet = doc.sheetsByTitle["g_reviews"];
        if (!reviewSheet) {
          throw new Error('"g_reviews" sheet not found in Google Spreadsheet.');
        }

        await reviewSheet.loadHeaderRow(); // Ensure headers are loaded
        const reviewHeaders = reviewSheet.headerValues;
        const reviewRows = await reviewSheet.getRows();

        // Find the row by review_id
        const foundRow = reviewRows.find(
          (row) => String(row.review_id) === String(reviewId),
        );

        if (foundRow) {
          const reviewObject = {};
          reviewHeaders.forEach((header) => {
            reviewObject[header] = foundRow[header];
          });
          responseData = { review: reviewObject };
        } else {
          responseData = { error: `Review with ID ${reviewId} not found.` };
        }
        break;
      }

      case "getFeedbackDetails": {
        const reviewId = event.queryStringParameters.id;
        if (!reviewId) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: "Review ID is required." }),
          };
        }

        // 1. Get the Review
        const reviewSheet = doc.sheetsByTitle["g_reviews"];
        if (!reviewSheet) throw new Error('"g_reviews" sheet not found.');

        const reviewRows = await reviewSheet.getRows();
        const foundReview = reviewRows.find(
          (row) => String(row.review_id) === String(reviewId),
        );
        if (!foundReview) {
          return {
            statusCode: 404,
            body: JSON.stringify({ error: "Review not found." }),
          };
        }

        const reviewData = {};
        reviewSheet.headerValues.forEach((h) => {
          reviewData[h] = foundReview[h];
        });

        // 2. Get the matching Duty Slip
        let slipData = null;
        const dsNo = reviewData.ds_no;
        if (dsNo) {
          const dutySheet = doc.sheetsByTitle["duty_slips"];
          if (!dutySheet) throw new Error('"duty_slips" sheet not found.');

          const slipRows = await dutySheet.getRows();
          const foundSlip = slipRows.find(
            (row) => String(row.DS_No) === String(dsNo),
          );

          if (foundSlip) {
            slipData = {};
            dutySheet.headerValues.forEach((h) => {
              slipData[h] = foundSlip[h];
            });
          }
        }

        // 3. Combine and return
        responseData = {
          review: reviewData,
          slip: slipData, // Will be null if slip not found or no ds_no
        };
        break;
      }

      case "logNewReview": {
        const formData = JSON.parse(event.body);

        const reviewSheet = doc.sheetsByTitle["g_reviews"];
        if (!reviewSheet) {
          throw new Error('"g_reviews" sheet not found in Google Spreadsheet.');
        }

        // Auto-increment logic
        const reviewRows = await reviewSheet.getRows();
        let nextId = 1;
        if (reviewRows.length > 0) {
          const lastRow = reviewRows[reviewRows.length - 1];
          const lastId = parseInt(lastRow.review_id);
          if (!isNaN(lastId)) {
            nextId = lastId + 1;
          }
        }

        const dataToSave = {
          review_id: nextId,
          ds_no: formData.ds_no,
          reviewer_name: formData.reviewer_name,
          rating: formData.rating,
          comment: formData.comment,
          follow_up_sent: "No", // Default value
        };

        await reviewSheet.addRow(dataToSave);

        responseData = { success: true, message: `Review #${nextId} saved.` };
        break;
      }

      case "getAllReviews": {
        const reviewSheet = doc.sheetsByTitle["g_reviews"];
        if (!reviewSheet) {
          throw new Error('"g_reviews" sheet not found in Google Spreadsheet.');
        }

        await reviewSheet.loadHeaderRow();
        const reviewHeaders = reviewSheet.headerValues;
        const reviewRows = await reviewSheet.getRows();

        // Sort by review_id descending (newest first)
        const reviews = reviewRows
          .map((row) => {
            const reviewObject = {};
            reviewHeaders.forEach((header) => {
              reviewObject[header] = row[header];
            });
            return reviewObject;
          })
          .sort(
            (a, b) =>
              (parseInt(b.review_id, 10) || 0) -
              (parseInt(a.review_id, 10) || 0),
          );

        responseData = { reviews: reviews };
        break;
      }

      case "getFinancialData":
        if (!financialsSheet) {
          throw new Error(
            '"Financials" sheet not found in Google Spreadsheet.',
          );
        }
        const financialRows = await financialsSheet.getRows();
        const financialHeaders = financialsSheet.headerValues;

        // Get all entries
        const allEntries = financialRows.map((row) => {
          const entry = {};
          financialHeaders.forEach((header) => {
            // Clean up the Amount for calculations
            if (header === "Amount" && typeof row[header] === "string") {
              entry[header] =
                parseFloat(row[header].replace(/[^0-9.-]+/g, "")) || 0;
            } else {
              entry[header] = row[header];
            }
          });
          return entry;
        });

        // Sort by Date descending (newest first)
        allEntries.sort((a, b) => new Date(b.Date) - new Date(a.Date));

        responseData = { entries: allEntries };
        break;

      case "saveFinancialEntry":
        if (!financialsSheet) {
          throw new Error(
            '"Financials" sheet not found in Google Spreadsheet.',
          );
        }
        const data = JSON.parse(event.body);

        // 1. Generate new Entry_ID
        const AllRows = await financialsSheet.getRows();
        let NextId = 1001; // Start at 1001
        if (AllRows.length > 0) {
          const lastRow = AllRows[AllRows.length - 1];

          // --- FIX: Safely check if Entry_ID exists and is a string ---
          if (lastRow.Entry_ID && typeof lastRow.Entry_ID === "string") {
            const idParts = lastRow.Entry_ID.split("-");

            // Check if split was successful (e.g., 'FIN-1001')
            if (idParts.length === 2) {
              const lastId = parseInt(idParts[1]);
              if (!isNaN(lastId)) {
                NextId = lastId + 1;
              }
            }
          }
          // If Entry_ID is missing or malformed, it will safely use 1001
        }
        const newEntryId = `FIN-${NextId}`;

        // 2. Add server-side data
        data.Entry_ID = newEntryId;
        data.Timestamp = new Date().toISOString();

        // 3. Save to Google Sheet
        await financialsSheet.addRow(data);

        responseData = { success: true, newId: newEntryId };
        break;

      case "submitBooking": {
        const data = JSON.parse(event.body);
        // Connect to 'bookings' sheet (Create if missing)
        let bookingSheet = doc.sheetsByTitle["bookings"];
        if (!bookingSheet)
          bookingSheet = await doc.addSheet({ title: "bookings" });

        const now = new Date();
        const day = String(now.getDate()).padStart(2, "0");
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const randomStr = Math.random()
          .toString(36)
          .substring(2, 6)
          .toUpperCase();
        const bookingID = `ST-${day}${month}-${randomStr}`;

        await bookingSheet.addRow({
          Booking_ID: bookingID,
          Timestamp: now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
          Customer_Name: data.Customer_Name || "Web User",
          Mobile_Number: data.Mobile_Number || "Pending",
          Email: data.Email || "N/A",
          Journey_Type: data.Journey_Type || "One Way",
          Pickup_City: data.Pickup_City || "Unknown",
          Drop_City: data.Drop_City || "Unknown",
          Travel_Date: data.Travel_Date || "N/A",
          Status: "New Inquiry",
        });
        responseData = {
          success: true,
          message: "Booking Saved",
          id: bookingID,
        };
        break;
      }

      case "submitLead": {
        const data = JSON.parse(event.body);
        let bookingSheet = doc.sheetsByTitle["bookings"];
        if (!bookingSheet)
          bookingSheet = await doc.addSheet({ title: "bookings" });

        const now = new Date();
        const day = String(now.getDate()).padStart(2, "0");
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const randomStr = Math.random()
          .toString(36)
          .substring(2, 6)
          .toUpperCase();
        const bookingID = `WA-${day}${month}-${randomStr}`;

        await bookingSheet.addRow({
          Booking_ID: bookingID,
          Timestamp: now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
          Pickup_City: data.pickup || "Unknown",
          Drop_City: data.drop || "Unknown",
          Travel_Date: data.date || "N/A",
          Mobile_Number: data.mobile || "Pending",
          Journey_Type: data.type || "One Way",
          Status: "WhatsApp Estimate",
        });
        responseData = { success: true, message: "Lead Saved" };
        break;
      }

      case "getTariff": {
        const localSheet = doc.sheetsByTitle["tariff_local"];
        const outstationSheet = doc.sheetsByTitle["tariff_outstation"];

        const cleanRow = (row) => {
          const obj = {};
          // Use headerValues to map data cleanly
          if (row._sheet && row._sheet.headerValues) {
            row._sheet.headerValues.forEach((h) => (obj[h] = row[h]));
          }
          return obj;
        };

        const localRows = localSheet ? await localSheet.getRows() : [];
        const outstationRows = outstationSheet
          ? await outstationSheet.getRows()
          : [];

        responseData = {
          local: localRows.map(cleanRow),
          outstation: outstationRows.map(cleanRow),
        };
        break;
      }

      case "getRoutes": {
        const routeSheet = doc.sheetsByTitle["routes"];
        if (!routeSheet) {
          responseData = [];
        } else {
          const rows = await routeSheet.getRows();
          const cleanRow = (row) => {
            const obj = {};
            if (row._sheet && row._sheet.headerValues) {
              row._sheet.headerValues.forEach((h) => (obj[h] = row[h]));
            }
            return obj;
          };
          responseData = rows.map(cleanRow);
        }
        break;
      }

      case "getBookings": {
        // Connect to 'bookings' sheet
        let bookingSheet = doc.sheetsByTitle["bookings"];
        if (!bookingSheet) {
          responseData = { bookings: [] };
        } else {
          const rows = await bookingSheet.getRows();
          const cleanRow = (row) => {
            const obj = {};
            if (row._sheet && row._sheet.headerValues) {
              row._sheet.headerValues.forEach((h) => (obj[h] = row[h]));
            }
            return obj;
          };
          // Return newest first
          responseData = { bookings: rows.map(cleanRow).reverse() };
        }
        break;
      }

      case "saveRoute": {
        const routeData = JSON.parse(event.body);
        const sheet = doc.sheetsByTitle["routes"];
        if (!sheet) throw new Error("Routes sheet not found");

        // Check if route exists (Update) or is new (Create)
        const rows = await sheet.getRows();
        const existingRow = rows.find(
          (r) => r.Route_Slug === routeData.Route_Slug,
        );

        if (existingRow) {
          // Update existing
          for (const key in routeData) {
            if (sheet.headerValues.includes(key)) {
              existingRow[key] = routeData[key];
            }
          }
          await existingRow.save();
        } else {
          // Create new
          await sheet.addRow(routeData);
        }

        responseData = { success: true, message: "Route saved successfully." };
        break;
      }
      case "submitCareer": {
        const data = JSON.parse(event.body);
        // Connect to 'travels_careers' sheet
        let careerSheet = doc.sheetsByTitle["travels_careers"];
        if (!careerSheet)
          careerSheet = await doc.addSheet({ title: "travels_careers" });

        const now = new Date();

        await careerSheet.addRow({
          Timestamp: now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
          Status: "New",
          Full_Name: data.name,
          Phone_Number: data.phone,
          Email_Address: data.email || "N/A",
          City_Area: data.city,
          Experience: data.experience,
          Application_Type: data.type, // Job or Attach
          License_Type: data.license,
          Vehicle_Details: data.vehicle || "N/A",
        });

        responseData = { success: true, message: "Application Saved" };
        break;
      }

      default:
        responseData = { error: "Invalid action." };
    }
    return { statusCode: 200, body: JSON.stringify(responseData) };
  } catch (error) {
    console.error("API Error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
