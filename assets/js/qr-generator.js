document.addEventListener('DOMContentLoaded', function () {

    // --- DOM Elements ---
    const elements = {
        // Steps
        steps: document.querySelectorAll('.step'),
        stepContents: document.querySelectorAll('.step-content'),
        nextStepBtn: document.getElementById('nextStepBtn'),
        prevStepBtn: document.getElementById('prevStepBtn'),
        // Step 1: Content
        qrTypeButtons: document.querySelectorAll('[data-qr-type]'),
        upiFields: document.getElementById('upi-fields'),
        linkFields: document.getElementById('link-fields'),
        upiIdInput: document.getElementById('upiId'),
        payeeNameInput: document.getElementById('payeeName'),
        amountInput: document.getElementById('amount'),
        webLinkInput: document.getElementById('webLink'),
        upiIdError: document.getElementById('upiIdError'),
        webLinkError: document.getElementById('webLinkError'),
        // Step 4: Download
        filenameInput: document.getElementById('filename'),
        downloadPngBtn: document.getElementById('downloadPngBtn'),
        downloadSvgBtn: document.getElementById('downloadSvgBtn'),
        downloadErrorContainer: document.getElementById('download-error'),
        // Design & Logo
        qrColorInput: document.getElementById('qrColor'),
        bgColorInput: document.getElementById('bgColor'),
        errorCorrectionLevelSelect: document.getElementById('errorCorrectionLevel'),
        logoInput: document.getElementById('logoInput'),
        removeLogoBtn: document.getElementById('removeLogoBtn'),
        logoSizeSlider: document.getElementById('logoSize'),
        dotsType: document.getElementById('dotsType'),
        cornerSquareType: document.getElementById('cornerSquareType'),
        cornerDotType: document.getElementById('cornerDotType'),
        gradientColor1: document.getElementById('gradientColor1'),
        gradientColor2: document.getElementById('gradientColor2'),
        gradientType: document.getElementById('gradientType'),
        // Preview & Global
        qrCodeContainer: document.getElementById('qr-code-container'),
        previewText: document.getElementById('preview-text'),
        resetBtn: document.getElementById('resetBtn'),
        currentYear: document.getElementById('currentYear'),
        liveLinkContainer: document.getElementById('live-link-container'),
        liveLinkText: document.getElementById('live-link-text'),
        copyLinkBtn: document.getElementById('copyLinkBtn'),
    };

    // --- State Management ---
    let currentStep = 1;
    let qrCode;
    let logoImage = null;

    // --- Default Options ---
    const defaultOptions = {
        qrType: 'upi',
        upiId: '',
        payeeName: '',
        amount: '',
        webLink: '',
        qrColor: '#0d1117',
        gradientColor1: '#0d1117',
        gradientColor2: '#0052cc',
        bgColor: '#ffffff',
        errorCorrectionLevel: 'H',
        // NEW DEFAULTS
        logo: 'https://admin.shrishgroup.com/assets/images/logo.webp', // Default logo
        gradientType: 'radial',      // Default gradient
        dotsType: 'classy-rounded',  // Default dot style
        // END NEW DEFAULTS
        logoSize: 0.25,
        filename: 'shrish-qr-code'
    };

    // --- QR Code Styling Instance ---
    qrCode = new QRCodeStyling({
        width: 320,
        height: 320,
        type: 'svg',
        data: 'https://shrishgroup.netlify.app/',
        image: defaultOptions.logo, // Initialize with default logo
        dotsOptions: { color: '#0d1117', type: 'rounded' },
        backgroundOptions: { color: '#ffffff' },
        qrOptions: { errorCorrectionLevel: 'H' }
    });

    /**
     * Updates the QR code preview based on current form settings.
     */
    const updateQRCode = () => {
        if (!qrCode) return;
        const activeTypeButton = document.querySelector('[data-qr-type].active');
        if (!activeTypeButton) return;

        const qrType = activeTypeButton.dataset.qrType;
        let data = 'https://shrishgroup.netlify.app/';
        let previewLabel = 'Scan Me';

        elements.liveLinkContainer.style.display = 'flex';

        if (qrType === 'upi') {
            const upiId = elements.upiIdInput.value.trim();
            const payeeName = elements.payeeNameInput.value.trim();
            const amount = elements.amountInput.value.trim();
            if (upiId) {
                let upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName || 'Payee')}`;
                if (amount && parseFloat(amount) > 0) {
                    upiUrl += `&am=${amount}`;
                }
                upiUrl += '&cu=INR';
                data = upiUrl;
            } else {
                elements.liveLinkContainer.style.display = 'none';
            }
            previewLabel = payeeName || 'Your Name Here';
        } else if (qrType === 'link') {
            const webLink = elements.webLinkInput.value.trim();
            if (webLink) {
                data = webLink;
            } else {
                elements.liveLinkContainer.style.display = 'none';
            }
            previewLabel = 'Visit Website';
        }

        elements.liveLinkText.textContent = data;

        const gradientType = elements.gradientType.value;
        let dotsColorOptions;

        if (gradientType === 'none') {
            dotsColorOptions = { color: elements.qrColorInput.value };
        } else {
            dotsColorOptions = {
                gradient: {
                    type: gradientType,
                    colorStops: [
                        { offset: 0, color: elements.gradientColor1.value },
                        { offset: 1, color: elements.gradientColor2.value }
                    ]
                }
            };
        }

        qrCode.update({
            data: data,
            dotsOptions: { ...dotsColorOptions, type: elements.dotsType.value },
            cornersSquareOptions: { type: elements.cornerSquareType.value, color: elements.qrColorInput.value },
            cornersDotOptions: { type: elements.cornerDotType.value, color: elements.qrColorInput.value },
            backgroundOptions: { color: elements.bgColorInput.value },
            qrOptions: { errorCorrectionLevel: elements.errorCorrectionLevelSelect.value },
            image: logoImage,
            imageOptions: { imageSize: parseFloat(elements.logoSizeSlider.value), margin: 5 }
        });

        elements.previewText.textContent = previewLabel;
    };

    const validateUpiId = () => {
        const upiId = elements.upiIdInput.value.trim();
        const isValid = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upiId);
        elements.upiIdError.textContent = isValid ? '' : 'Please enter a valid UPI ID (e.g., yourname@bank).';
        return isValid;
    };

    const validateWebLink = () => {
        const webLink = elements.webLinkInput.value.trim();
        try {
            new URL(webLink);
            elements.webLinkError.textContent = '';
            return true;
        } catch (_) {
            elements.webLinkError.textContent = 'Please enter a valid URL (e.g., https://example.com).';
            return false;
        }
    };

    const validateCurrentStep = () => {
        if (currentStep === 1) {
            const qrType = document.querySelector('[data-qr-type].active').dataset.qrType;
            if (qrType === 'upi') return validateUpiId();
            else if (qrType === 'link') return validateWebLink();
        }
        return true;
    };

    const checkFinalValidity = () => {
        const qrType = document.querySelector('[data-qr-type].active').dataset.qrType;
        if (qrType === 'upi') return validateUpiId();
        else if (qrType === 'link') return validateWebLink();
        return false;
    };

    const updateDownloadStepUI = () => {
        const isValid = checkFinalValidity();
        elements.downloadPngBtn.disabled = !isValid;
        elements.downloadSvgBtn.disabled = !isValid;
        elements.downloadErrorContainer.style.display = isValid ? 'none' : 'flex';
    };

    const goToStep = (stepNumber) => {
        currentStep = stepNumber;
        elements.steps.forEach(step => step.classList.toggle('active', parseInt(step.dataset.step) <= currentStep));
        elements.stepContents.forEach(content => content.classList.toggle('active', parseInt(content.dataset.stepContent) === currentStep));
        elements.prevStepBtn.style.display = currentStep > 1 ? 'inline-flex' : 'none';
        elements.nextStepBtn.style.display = currentStep < 4 ? 'inline-flex' : 'none';
        if (currentStep === 4) updateDownloadStepUI();
    };

    const resetAll = () => {
        // Reset form fields
        elements.upiIdInput.value = defaultOptions.upiId;
        elements.payeeNameInput.value = defaultOptions.payeeName;
        elements.amountInput.value = defaultOptions.amount;
        elements.webLinkInput.value = defaultOptions.webLink;
        elements.filenameInput.value = defaultOptions.filename;
        elements.qrColorInput.value = defaultOptions.qrColor;
        elements.gradientColor1.value = defaultOptions.gradientColor1;
        elements.gradientColor2.value = defaultOptions.gradientColor2;
        elements.bgColorInput.value = defaultOptions.bgColor;
        elements.errorCorrectionLevelSelect.value = defaultOptions.errorCorrectionLevel;
        elements.logoSizeSlider.value = defaultOptions.logoSize;
        
        // Set new default dropdown values
        elements.gradientType.value = defaultOptions.gradientType;
        elements.dotsType.value = defaultOptions.dotsType;

        // Handle default logo
        logoImage = defaultOptions.logo; // Set state to default logo URL
        elements.logoInput.value = '';
        elements.removeLogoBtn.style.display = 'inline-block'; // Show remove button for default logo

        // Reset QR Type buttons and fields visibility
        elements.qrTypeButtons.forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-qr-type="${defaultOptions.qrType}"]`).classList.add('active');
        elements.upiFields.style.display = 'block';
        elements.linkFields.style.display = 'none';

        goToStep(1);
        updateQRCode();
    };

    // --- Event Listeners ---

    elements.nextStepBtn.addEventListener('click', () => {
        if (validateCurrentStep() && currentStep < 4) {
            goToStep(currentStep + 1);
        }
    });

    elements.prevStepBtn.addEventListener('click', () => {
        if (currentStep > 1) goToStep(currentStep - 1);
    });

    elements.qrTypeButtons.forEach(button => {
        button.addEventListener('click', () => {
            elements.qrTypeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const type = button.dataset.qrType;
            elements.upiFields.style.display = type === 'upi' ? 'block' : 'none';
            elements.linkFields.style.display = type === 'link' ? 'block' : 'none';
            updateQRCode();
        });
    });

    const inputsToWatch = [
        elements.upiIdInput, elements.payeeNameInput, elements.amountInput,
        elements.webLinkInput, elements.qrColorInput, elements.bgColorInput,
        elements.errorCorrectionLevelSelect, elements.logoSizeSlider,
        elements.dotsType, elements.cornerSquareType, elements.cornerDotType,
        elements.gradientColor1, elements.gradientColor2, elements.gradientType
    ];
    inputsToWatch.forEach(input => {
        if (input) input.addEventListener('input', updateQRCode);
    });

    elements.upiIdInput.addEventListener('input', validateUpiId);
    elements.webLinkInput.addEventListener('input', validateWebLink);

    elements.amountInput.addEventListener('input', () => {
        if (parseFloat(elements.amountInput.value) < 0) {
            elements.amountInput.value = '';
        }
    });

    if (elements.logoInput) {
        elements.logoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                logoImage = event.target.result; // Update state with uploaded image data
                elements.removeLogoBtn.style.display = 'inline-block';
                updateQRCode();
            };
            reader.readAsDataURL(file);
        });
    }

    if (elements.removeLogoBtn) {
        elements.removeLogoBtn.addEventListener('click', () => {
            logoImage = null; // Clear the logo state
            elements.logoInput.value = '';
            elements.removeLogoBtn.style.display = 'none';
            updateQRCode();
        });
    }

    elements.downloadPngBtn.addEventListener('click', () => {
        if (checkFinalValidity()) qrCode.download({ name: elements.filenameInput.value || 'qr-code', extension: 'png' });
    });
    elements.downloadSvgBtn.addEventListener('click', () => {
        if (checkFinalValidity()) qrCode.download({ name: elements.filenameInput.value || 'qr-code', extension: 'svg' });
    });

    elements.resetBtn.addEventListener('click', resetAll);

    if (elements.copyLinkBtn) {
        elements.copyLinkBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(elements.liveLinkText.textContent).then(() => {
                const originalIcon = elements.copyLinkBtn.innerHTML;
                elements.copyLinkBtn.classList.add('copied');
                elements.copyLinkBtn.innerHTML = '<i class="fas fa-check"></i> <span>COPIED!</span>';

                setTimeout(() => {
                    elements.copyLinkBtn.classList.remove('copied');
                    elements.copyLinkBtn.innerHTML = originalIcon;
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        });
    }

    // --- Initialization ---
    if (elements.currentYear) elements.currentYear.textContent = new Date().getFullYear();
    qrCode.append(elements.qrCodeContainer);
    resetAll(); // Initialize the page with all default settings

    // Mobile Navigation Toggle
    const navToggleBtn = document.getElementById('nav-toggle-btn');
    const mobileNav = document.getElementById('mobile-nav');

    if (navToggleBtn && mobileNav) {
        navToggleBtn.addEventListener('click', () => {
            mobileNav.classList.toggle('is-open');
        });
    }
});