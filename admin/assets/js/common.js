document.addEventListener("DOMContentLoaded", function() {
    // Function to fetch and load an HTML component
    const loadComponent = (selector, url) => {
        fetch(url)
            .then(response => response.ok ? response.text() : Promise.reject('File not found.'))
            .then(data => {
                const element = document.querySelector(selector);
                if (element) element.innerHTML = data;
            })
            .catch(error => console.error(`Error loading component from ${url}:`, error));
    };

    // Load all the common components for the admin panel
    loadComponent('#admin-sidebar', '/components/_sidebar.html');
    loadComponent('#admin-header', '/components/_header.html');
    loadComponent('#admin-footer', '/components/_footer.html');
});