// This is a Netlify Serverless Function
exports.handler = async function(event, context) {
    // Get the type of request (e.g., 'getDutySlip', 'saveSalarySlip') from the URL
    const { action, id } = event.queryStringParameters;

    console.log(`Received action: ${action} with ID: ${id}`);

    // Here, we will add the logic later.
    // Example:
    // if (action === 'getNextDutySlipId') {
    //     // Connect to Google Sheets and get the next ID
    // }

    // This is the response we send back to the website
    return {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Origin": "*", // Allow requests from our website
        },
        body: JSON.stringify({ 
            message: `Action '${action}' received successfully. Logic not yet implemented.` 
        }),
    };
};