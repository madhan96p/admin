/**
 * ====================================================================
 * Shrish Travels - Common Logic (V3.0 - Fully Integrated)
 * ====================================================================
 * This file contains all shared logic for the entire admin panel.
 *
 * - Component Loading (Sidebar, Header, Footer)
 * - Global Event Handling (Logout, Active Links)
 * - Duty Slip Form Logic (Calculations, Validation, Sharing, etc.)
 * ====================================================================
 */

// --- 1. DUTY SLIP FORM - SHARED DATA & FUNCTIONS ---

const driverData = {
    "AjithKumar": { mobile: "9047382896", signatureUrl: "https://admin.shrishgroup.com/assets/images/signs/Ajithkumar.jpg" },
    "Raja": { mobile: "8838750975", signatureUrl: "https://admin.shrishgroup.com/assets/images/signs/Raja.jpg" },
    "Jeganraj": { mobile: "8883451668", signatureUrl: "https://admin.shrishgroup.com/assets/images/signs/jeganraj.jpg" },
};

let signaturePad;
let currentSignatureTarget;

function initializeSignaturePad(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (canvas) {
        signaturePad = new SignaturePad(canvas, { backgroundColor: 'rgb(255, 255, 255)' });
    }
}

function openSignaturePad(targetImageId) {
    currentSignatureTarget = document.getElementById(targetImageId);
    const sigModal = document.getElementById("signature-modal");
    const sigCanvas = document.getElementById("signature-canvas");
    if (sigModal && sigCanvas && signaturePad) {
        sigModal.style.display = "flex";
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        sigCanvas.width = sigCanvas.offsetWidth * ratio;
        sigCanvas.height = sigCanvas.offsetHeight * ratio;
        sigCanvas.getContext("2d").scale(ratio, ratio);
        signaturePad.clear();
    }
}

function closeSignaturePad() {
    document.getElementById("signature-modal").style.display = "none";
}

function clearSignature() {
    if (signaturePad) signaturePad.clear();
}

function saveSignature() {
    if (signaturePad && signaturePad.isEmpty()) {
        return alert("Please provide a signature first.");
    }
    const dataURL = signaturePad.toDataURL("image/png");
    if (currentSignatureTarget) {
        currentSignatureTarget.src = dataURL;
        currentSignatureTarget.style.display = 'block';
        if (currentSignatureTarget.previousElementSibling) {
            currentSignatureTarget.previousElementSibling.style.display = 'none';
        }
    }
    closeSignaturePad();
}

function calculateTotals() {
    const dateOutVal = document.getElementById('date-out').value;
    const dateInVal = document.getElementById('date-in').value;
    if (dateOutVal && dateInVal) {
        const dateOut = new Date(dateOutVal);
        const dateIn = new Date(dateInVal);
        if (dateIn >= dateOut) {
            const diffTime = Math.abs(dateIn - dateOut);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            document.getElementById('total-days').value = diffDays;
        } else {
            document.getElementById('total-days').value = '';
        }
    } else {
        document.getElementById('total-days').value = '';
    }

    const timeOutVal = document.getElementById('driver-time-out').value;
    const timeInVal = document.getElementById('driver-time-in').value;
    if (timeOutVal && timeInVal) {
        const timeOut = new Date(`1970-01-01T${timeOutVal}`);
        let timeIn = new Date(`1970-01-01T${timeInVal}`);
        if (timeIn < timeOut) timeIn.setDate(timeIn.getDate() + 1);
        const diffMs = timeIn - timeOut;
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffMins = Math.round((diffMs % 3600000) / 60000);
        document.getElementById('driver-total-hrs').value = `${diffHrs} hrs ${diffMins} mins`;
    } else {
        document.getElementById('driver-total-hrs').value = '';
    }

    const kmOut = parseFloat(document.getElementById('driver-km-out').value) || 0;
    const kmIn = parseFloat(document.getElementById('driver-km-in').value) || 0;
    if (kmIn > kmOut) {
        document.getElementById('driver-total-kms').value = `${(kmIn - kmOut).toFixed(1)} Kms`;
    } else {
        document.getElementById('driver-total-kms').value = '';
    }
}

function validateMobileInput(inputId) {
    const mobileInput = document.getElementById(inputId);
    if (!mobileInput) return;
    mobileInput.addEventListener('input', function () {
        this.value = this.value.replace(/[^0-9]/g, '').substring(0, 10);
    });
}

function validateAllInputs() {
    let isValid = true;
    const fields = {
        dateOut: document.getElementById('date-out'),
        dateIn: document.getElementById('date-in'),
        driverTimeOut: document.getElementById('driver-time-out'),
        driverTimeIn: document.getElementById('driver-time-in'),
        driverKmOut: document.getElementById('driver-km-out'),
        driverKmIn: document.getElementById('driver-km-in'),
        customerTimeOut: document.getElementById('time-out'),
        customerTimeIn: document.getElementById('time-in'),
        customerKmOut: document.getElementById('km-out'),
        customerKmIn: document.getElementById('km-in')
    };

    const setError = (el, message) => {
        if (el) {
            el.classList.remove('input-error');
            void el.offsetWidth;
            el.classList.add('input-error');
            isValid = false;
        }
    };

    Object.values(fields).forEach(el => el ? el.classList.remove('input-error') : null);

    const createDateTime = (d, t) => (d.value && t.value) ? new Date(`${d.value}T${t.value}`) : null;
    const driverStart = createDateTime(fields.dateOut, fields.driverTimeOut);
    const driverEnd = createDateTime(fields.dateIn, fields.driverTimeIn);
    const customerStart = createDateTime(fields.dateOut, fields.customerTimeOut);
    const customerEnd = createDateTime(fields.dateIn, fields.customerTimeIn);
    const drKmOut = parseFloat(fields.driverKmOut.value) || 0;
    const drKmIn = parseFloat(fields.driverKmIn.value) || 0;
    const custKmOut = parseFloat(fields.customerKmOut.value) || 0;
    const custKmIn = parseFloat(fields.customerKmIn.value) || 0;

    if (driverEnd && driverStart && driverEnd < driverStart) setError(fields.driverTimeIn);
    if (drKmIn > 0 && drKmIn < drKmOut) setError(fields.driverKmIn);
    if (custKmIn > 0 && custKmIn < custKmOut) setError(fields.customerKmIn);
    if (customerStart && driverStart && customerStart < driverStart) setError(fields.customerTimeOut);
    if (customerEnd && driverEnd && customerEnd > driverEnd) setError(fields.customerTimeIn);
    if (custKmOut > 0 && custKmOut < drKmOut) setError(fields.customerKmOut);
    if (custKmIn > 0 && custKmIn > drKmIn) setError(fields.customerKmIn);

    return isValid;
}

function handleDriverSelection() {
    const selected = driverData[this.value];
    if (selected) {
        document.getElementById('driver-mobile').value = selected.mobile;
        const img = document.getElementById('auth-signature-link');
        img.src = selected.signatureUrl;
        img.style.display = 'block';
        document.getElementById('auth-sig-placeholder').style.display = 'none';
    }
}

// --- 2. GLOBAL COMPONENT & EVENT MANAGEMENT ---

async function loadComponents() {
    const components = [
        { id: 'admin-sidebar', path: '/components/_sidebar.html' },
        { id: 'admin-header', path: '/components/_header.html' },
        { id: 'admin-footer', path: '/components/_footer.html' }
    ];

    for (const { id, path } of components) {
        const element = document.getElementById(id);
        if (element) {
            try {
                const response = await fetch(path);
                if (response.ok) element.innerHTML = await response.text();
            } catch (error) { console.error(`Error loading ${path}:`, error); }
        }
    }
}

function setActiveNavLink() {
    const currentPath = window.location.pathname;
    document.querySelectorAll('.sidebar-nav .nav-links a').forEach(link => {
        if (link.pathname === currentPath) {
            link.classList.add('active');
        }
    });
}

function setupGlobalEventListeners() {
    const header = document.getElementById('admin-header');
    if (header) {
        header.addEventListener('click', (event) => {
            if (event.target.classList.contains('logout-btn')) {
                sessionStorage.removeItem('shrish-admin-auth');
                window.location.href = '/login.html'; // Assuming you have a login page
            }
        });
    }
    
    const sidebarToggle = document.getElementById('sidebar-toggle-btn');
    const sidebar = document.getElementById('admin-sidebar');
    const layout = document.querySelector('.admin-layout');

    if (sidebarToggle && sidebar && layout) {
        sidebarToggle.addEventListener('click', () => {
            layout.classList.toggle('sidebar-collapsed');
        });
    }

    const fabContainer = document.querySelector('.action-buttons-container');
    const fabToggle = document.getElementById('fab-main-toggle');

    if (fabContainer && fabToggle) {
        fabToggle.addEventListener('click', () => {
            // This toggles the 'is-open' class on the container
            fabContainer.classList.toggle('is-open');
        });
    }
}

// --- 3. DOMCONTENTLOADED ---
// This is the main entry point for all pages.
document.addEventListener('DOMContentLoaded', async () => {
    await loadComponents();
    setActiveNavLink();
    setupGlobalEventListeners();

    // ** THE FIX **
    // After all common components are loaded, check if page-specific logic exists and run it.
    if (typeof initializeEditSlipPage === 'function') {
        initializeEditSlipPage();
    }
    if (typeof initializeCreateSlipPage === 'function') { // You should do this for create-slip.js too!
        initializeCreateSlipPage();
    }
});