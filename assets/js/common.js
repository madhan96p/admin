/**
 * =================================================================
 * Shrish Travels - Common JavaScript (V1.0)
 * =================================================================
 * This file contains shared utilities, API services, and UI components
 * used across the admin panel.
 *
 * Sections:
 * 1. Constants
 * 2. Utility Functions
 * 3. UI Helper Functions
 * 4. API Service
 * 5. Signature Pad Component
 * =================================================================
 */

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Constants ---
    const API_BASE_URL = '/api';

    // --- 2. Utility Functions ---

    /**
     * Gets a URL parameter by name.
     * @param {string} name The name of the parameter.
     * @returns {string|null} The value of the parameter or null if not found.
     */
    function getUrlParameter(name) {
        name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
        const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
        const results = regex.exec(location.search);
        return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, ' '));
    }

    // --- 3. UI Helper Functions ---

    /**
     * Displays a toast notification.
     * @param {string} message The message to display.
     * @param {string} type The type of toast ('success', 'error', 'info').
     */
    function showToast(message, type = 'info') {
        // Assuming you have a toast library like Toastify or a custom implementation
        console.log(`Toast (${type}): ${message}`);
        // Example with a library:
        // Toastify({ text: message, className: type, ... }).showToast();
    }

    /**
     * Shows a loading spinner and hides the main content.
     * @param {string} loaderId - The ID of the loader element.
     * @param {string} contentId - The ID of the content element to hide.
     */
    function showLoader(loaderId, contentId) {
        const loader = document.getElementById(loaderId);
        const content = document.getElementById(contentId);
        if (loader) loader.style.display = 'flex';
        if (content) content.style.display = 'none';
    }

    /**
     * Hides a loading spinner and shows the main content.
     * @param {string} loaderId - The ID of the loader element.
     * @param {string} contentId - The ID of the content element to show.
     */
    function hideLoader(loaderId, contentId) {
        const loader = document.getElementById(loaderId);
        const content = document.getElementById(contentId);
        if (loader) loader.style.display = 'none';
        if (content) content.style.display = 'block';
    }


    // --- 4. API Service ---

    /**
     * A generic fetch-based API service.
     * @param {string} endpoint - The API endpoint (e.g., '/duty-slip').
     * @param {string} method - The HTTP method ('GET', 'POST', 'PUT').
     * @param {object} [body=null] - The request body for POST/PUT requests.
     * @returns {Promise<object>} The JSON response from the API.
     */
    async function apiService(endpoint, method, body = null) {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API Service Error:', error);
            showToast(error.message, 'error');
            throw error;
        }
    }

    // --- 5. Signature Pad Component ---

    function initializeSignaturePad(canvasId, modalId, clearBtnId, saveBtnId, callback) {
        const canvas = document.getElementById(canvasId);
        const signaturePad = new SignaturePad(canvas, { backgroundColor: 'rgb(255, 255, 255)' });
        const modal = document.getElementById(modalId);

        document.getElementById(clearBtnId).addEventListener('click', () => signaturePad.clear());
        document.getElementById(saveBtnId).addEventListener('click', () => {
            if (signaturePad.isEmpty()) {
                return alert("Please provide a signature first.");
            }
            const dataURL = signaturePad.toDataURL('image/png');
            callback(dataURL);
            modal.style.display = 'none';
        });

        return {
            open: () => {
                modal.style.display = 'flex';
                const ratio = Math.max(window.devicePixelRatio || 1, 1);
                canvas.width = canvas.offsetWidth * ratio;
                canvas.height = canvas.offsetHeight * ratio;
                canvas.getContext("2d").scale(ratio, ratio);
                signaturePad.clear();
            },
            close: () => modal.style.display = 'none',
            getSignaturePad: () => signaturePad
        };
    }

    /**
     * Registers and runs the main function for a specific page.
     * Ensures that the page-specific code runs after the DOM is ready.
     * @param {Function} pageInitFunction - The function to run for the page.
     */
    function initializePage(pageInitFunction) {
        if (typeof pageInitFunction === 'function') {
            pageInitFunction();
        }
    }

    // Expose functions to the global window object to be accessible by other scripts
    window.App = {
        ...window.App,
        getUrlParameter,
        showToast,
        showLoader,
        hideLoader,
        apiService,
        initializeSignaturePad,
        initializePage,
    };
});