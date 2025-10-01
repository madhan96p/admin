// This script runs immediately and blocks the page
(function() {
    // We get the stored password from the browser's session storage
    const isAuthenticated = sessionStorage.getItem('shrish-admin-auth');
    const correctPassword = 'ilaya@1234'; // IMPORTANT: Change this!

    if (isAuthenticated === 'true') {
        // If they are already authenticated in this session, do nothing.
        return;
    }

    // If not authenticated, show the password prompt
    const password = prompt("Enter the Admin Password to continue:", "");

    if (password === correctPassword) {
        // If password is correct, store this info for the session
        alert("Access Granted!");
        sessionStorage.setItem('shrish-admin-auth', 'true');
    } else {
        // If password is wrong, block access and redirect them
        alert("Incorrect Password. Access Denied.");
        window.location.href = "https://google.com"; // Redirect away
    }
})();