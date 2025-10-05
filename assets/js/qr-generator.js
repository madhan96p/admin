document.addEventListener('DOMContentLoaded', function () {
    // --- 1. DOM Element Cache ---
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
        // Step 2: Design
        presetButtons: document.querySelectorAll('.preset-btn'),
        dotsType: document.getElementById('dotsType'),
        cornerSquareType: document.getElementById('cornerSquareType'),
        cornerDotType: document.getElementById('cornerDotType'),
        bgColor: document.getElementById('bgColor'),
        dotsColor1: document.getElementById('dotsColor1'),
        dotsColor2: document.getElementById('dotsColor2'),
        dotsGradientType: document.getElementById('dotsGradientType'),
        cornersColor1: document.getElementById('cornersColor1'),
        cornersColor2: document.getElementById('cornersColor2'),
        cornersGradientType: document.getElementById('cornersGradientType'),
        // Step 3: Logo & Frame
        logoInput: document.getElementById('logoInput'),
        removeLogoBtn: document.getElementById('removeLogoBtn'),
        logoSizeSlider: document.getElementById('logoSize'),
        frameToggle: document.getElementById('frameToggle'),
        frameOptions: document.getElementById('frame-options'),
        frameText: document.getElementById('frameText'),
        frameColor: document.getElementById('frameColor'),
        frameTextColor: document.getElementById('frameTextColor'),
        // Step 4: Download
        errorCorrectionLevel: document.getElementById('errorCorrectionLevel'),
        filenameInput: document.getElementById('filename'),
        downloadPngBtn: document.getElementById('downloadPngBtn'),
        downloadSvgBtn: document.getElementById('downloadSvgBtn'),
        downloadErrorContainer: document.getElementById('download-error'),
        // Preview & Global
        qrCodeContainer: document.getElementById('qr-code-container'),
        liveLinkContainer: document.getElementById('live-link-container'),
        liveLinkText: document.getElementById('live-link-text'),
        copyLinkBtn: document.getElementById('copyLinkBtn'),
        resetBtn: document.getElementById('resetBtn'),
    };

    // --- 2. State Management ---
    let currentStep = 1;
    let qrCode;
    // UPDATED: Define the default logo URL
    const DEFAULT_LOGO_URL = 'https://admin.shrishgroup.com/assets/images/logo.webp';
    let logoImage = DEFAULT_LOGO_URL; // Initialize with the default logo

    // --- 3. Presets & Default Configuration ---
    const stylePresets = {
        default: {
            dotsType: 'classy-rounded',
            dotsColor1: '#0d1117', dotsColor2: '#0052cc', dotsGradientType: 'radial',
            cornersColor1: '#0d1117', cornersColor2: '#0052cc', cornersGradientType: 'none',
            bgColor: '#ffffff',
            frameToggle: false, frameText: 'SCAN ME', frameColor: '#0d1117', frameTextColor: '#ffffff'
        },
        oceanic: {
            dotsType: 'extra-rounded',
            dotsColor1: '#0284c7', dotsColor2: '#059669', dotsGradientType: 'linear',
            cornersColor1: '#0369a1', cornersColor2: '#0369a1', cornersGradientType: 'none',
            bgColor: '#ffffff',
            frameToggle: true, frameText: 'SCAN ME', frameColor: '#0369a1', frameTextColor: '#ffffff'
        },
        'mono-dark': {
            dotsType: 'square',
            dotsColor1: '#ffffff', dotsColor2: '#ffffff', dotsGradientType: 'none',
            cornersColor1: '#e5e7eb', cornersColor2: '#e5e7eb', cornersGradientType: 'none',
            bgColor: '#1f2937',
            frameToggle: true, frameText: 'SCAN HERE', frameColor: '#374151', frameTextColor: '#e5e7eb'
        },
        'soft-mint': {
            dotsType: 'dots',
            dotsColor1: '#047857', dotsColor2: '#059669', dotsGradientType: 'radial',
            cornersColor1: '#065f46', cornersColor2: '#065f46', cornersGradientType: 'none',
            bgColor: '#ecfdf5',
            frameToggle: false, frameText: 'SCAN ME', frameColor: '#065f46', frameTextColor: '#ffffff'
        }
    };

    // --- 4. Core Logic Functions ---

    /**
     * Applies a style preset to the form controls and updates the QR code.
     * @param {string} presetName - The key of the preset in the stylePresets object.
     */
    function applyPreset(presetName = 'default') {
        const preset = stylePresets[presetName];
        if (!preset) return;

        // Update form inputs with preset values
        elements.dotsType.value = preset.dotsType;
        elements.dotsColor1.value = preset.dotsColor1;
        elements.dotsColor2.value = preset.dotsColor2;
        elements.dotsGradientType.value = preset.dotsGradientType;
        elements.cornersColor1.value = preset.cornersColor1;
        elements.cornersColor2.value = preset.cornersColor2;
        elements.cornersGradientType.value = preset.cornersGradientType;
        elements.bgColor.value = preset.bgColor;
        elements.frameToggle.checked = preset.frameToggle;
        elements.frameText.value = preset.frameText;
        elements.frameColor.value = preset.frameColor;
        elements.frameTextColor.value = preset.frameTextColor;

        // Trigger updates
        updateFrame();
        updateQRCode();
    }

    /**
     * Handles the visual state of the QR code frame based on form inputs.
     * It uses CSS variables and data attributes for styling.
     */
    function updateFrame() {
        const isEnabled = elements.frameToggle.checked;
        elements.frameOptions.classList.toggle('hidden-options', !isEnabled);
        elements.qrCodeContainer.classList.toggle('frame-active', isEnabled);

        if (isEnabled) {
            const container = elements.qrCodeContainer;
            container.style.setProperty('--frame-bg-color', elements.frameColor.value);
            container.style.setProperty('--frame-text-color', elements.frameTextColor.value);
            container.setAttribute('data-frame-text', elements.frameText.value);
        }
    }

    /**
     * Generates a color/gradient object for the qr-code-styling library.
     * @returns {object}
     */
    const getColorOptions = (color1, color2, gradientType) => {
        if (gradientType === 'none') {
            return { color: color1 };
        }
        return {
            gradient: {
                type: gradientType,
                colorStops: [{ offset: 0, color: color1 }, { offset: 1, color: color2 }]
            }
        };
    };

    /**
     * The main function to update the QR code preview with all current settings.
     */
    const updateQRCode = () => {
        if (!qrCode) return;

        // 1. Get Content Data
        const qrType = document.querySelector('[data-qr-type].active').dataset.qrType;
        let data = 'https://shrishgroup.com/';
        elements.liveLinkContainer.style.display = 'none';

        if (qrType === 'upi' && elements.upiIdInput.value.trim()) {
            const upiId = elements.upiIdInput.value.trim();
            const payeeName = elements.payeeNameInput.value.trim();
            const amount = elements.amountInput.value.trim();
            let upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName || 'Payee')}`;
            if (amount && parseFloat(amount) > 0) upiUrl += `&am=${amount}`;
            upiUrl += '&cu=INR';
            data = upiUrl;
            elements.liveLinkContainer.style.display = 'flex';
        } else if (qrType === 'link' && elements.webLinkInput.value.trim()) {
            data = elements.webLinkInput.value.trim();
            elements.liveLinkContainer.style.display = 'flex';
        }
        elements.liveLinkText.textContent = data;
        
        // 2. Get Styling Options
        const dotsOptions = getColorOptions(elements.dotsColor1.value, elements.dotsColor2.value, elements.dotsGradientType.value);
        const cornersSquareOptions = getColorOptions(elements.cornersColor1.value, elements.cornersColor2.value, elements.cornersGradientType.value);

        // 3. Update QR Code instance
        qrCode.update({
            data: data,
            dotsOptions: { ...dotsOptions, type: elements.dotsType.value },
            cornersSquareOptions: { ...cornersSquareOptions, type: elements.cornerSquareType.value },
            cornersDotOptions: { type: elements.cornerDotType.value },
            backgroundOptions: { color: elements.bgColor.value },
            qrOptions: { errorCorrectionLevel: elements.errorCorrectionLevel.value },
            image: logoImage,
            imageOptions: { imageSize: parseFloat(elements.logoSizeSlider.value), margin: 5 }
        });
    };
    
    // --- 5. Navigation ---
    const goToStep = (stepNumber) => {
        currentStep = stepNumber;
        elements.steps.forEach(step => step.classList.toggle('active', parseInt(step.dataset.step) <= currentStep));
        elements.stepContents.forEach(content => content.classList.toggle('active', parseInt(content.dataset.stepContent) === currentStep));
        elements.prevStepBtn.style.display = currentStep > 1 ? 'inline-flex' : 'none';
        elements.nextStepBtn.style.display = currentStep < 4 ? 'inline-flex' : 'none';
    };


    /**
     * Resets the entire form and QR code to the default state.
     */
    function resetAll() {
        // Reset basic content fields
        elements.upiIdInput.value = '';
        elements.payeeNameInput.value = '';
        elements.amountInput.value = '';
        elements.webLinkInput.value = '';
        elements.filenameInput.value = 'shrish-qr-code';
        elements.errorCorrectionLevel.value = 'H';
        
        // UPDATED: Set default logo instead of removing
        logoImage = DEFAULT_LOGO_URL;
        elements.logoInput.value = ''; // Clear file input
        elements.removeLogoBtn.style.display = 'inline-block'; // Show remove button
        elements.logoSizeSlider.value = 0.25;

        // Reset QR Type
        elements.qrTypeButtons.forEach(btn => btn.classList.remove('active'));
        document.querySelector('[data-qr-type="upi"]').classList.add('active');
        elements.upiFields.style.display = 'block';
        elements.linkFields.style.display = 'none';

        // Apply the 'default' preset for all style options
        applyPreset('default');
        goToStep(1);
    }
    
    // --- 6. Event Listeners ---
    elements.nextStepBtn.addEventListener('click', () => { if (currentStep < 4) goToStep(currentStep + 1); });
    elements.prevStepBtn.addEventListener('click', () => { if (currentStep > 1) goToStep(currentStep - 1); });
    
    elements.presetButtons.forEach(button => {
        button.addEventListener('click', () => applyPreset(button.dataset.preset));
    });

    const inputsToWatch = [
        elements.upiIdInput, elements.payeeNameInput, elements.amountInput, elements.webLinkInput,
        elements.dotsType, elements.cornerSquareType, elements.cornerDotType,
        elements.bgColor, elements.dotsColor1, elements.dotsColor2, elements.dotsGradientType,
        elements.cornersColor1, elements.cornersColor2, elements.cornersGradientType,
        elements.logoSizeSlider, elements.errorCorrectionLevel
    ];
    inputsToWatch.forEach(input => input.addEventListener('input', updateQRCode));

    const frameInputs = [elements.frameToggle, elements.frameText, elements.frameColor, elements.frameTextColor];
    frameInputs.forEach(input => input.addEventListener('input', updateFrame));

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

    elements.logoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            logoImage = event.target.result;
            elements.removeLogoBtn.style.display = 'inline-block';
            updateQRCode();
        };
        reader.readAsDataURL(file);
    });

    elements.removeLogoBtn.addEventListener('click', () => {
        logoImage = null;
        elements.logoInput.value = '';
        elements.removeLogoBtn.style.display = 'none';
        updateQRCode();
    });

    elements.downloadPngBtn.addEventListener('click', () => qrCode.download({ name: elements.filenameInput.value || 'qr-code', extension: 'png' }));
    elements.downloadSvgBtn.addEventListener('click', () => qrCode.download({ name: elements.filenameInput.value || 'qr-code', extension: 'svg' }));
    elements.resetBtn.addEventListener('click', resetAll);

    // --- 7. Initialization ---
    qrCode = new QRCodeStyling({
        width: 300,
        height: 300,
        type: 'svg',
        data: 'https://shrishgroup.com/',
        image: null, // Image is set dynamically by resetAll -> updateQRCode
        dotsOptions: {},
        backgroundOptions: {},
        qrOptions: { errorCorrectionLevel: 'H' }
    });

    qrCode.append(elements.qrCodeContainer);
    resetAll(); // Initialize the page with default settings, including the logo
});