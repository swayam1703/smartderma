document.addEventListener('DOMContentLoaded', function () {
    // Elements
    const heroUploadBtn = document.getElementById('heroUploadBtn');
    const fileInput = document.getElementById('fileInput');
    const heroImage = document.querySelector('.hero-image');
    const imagePlaceholder = document.querySelector('.image-placeholder');
    const output = document.getElementById('output');
    const uploadArea = document.getElementById('uploadArea');

    let isDragging = false;
    let isProcessing = false;

    // ConfigS
    const TEST_MODE = false;
    const BACKEND_URL = 'http://13.202.193.193:8000/predict/';

    // Initialize
    initializeEvents();

    // Events
    function initializeEvents() {
        heroUploadBtn.addEventListener('click', handleUploadClick);
        fileInput.addEventListener('change', handleFileChange);
    }

    function handleUploadClick() {
        if (isProcessing) return;
        fileInput.value = ''; // reset input
        // fileInput.click();    // open file picker
    }

    async function handleFileChange(e) {
        if (isProcessing) return;
        const file = e.target.files[0];

        if (!file || !file.type.startsWith('image/')) {
            alert('Please select a valid image file (JPEG, PNG)');
            return;
        }

        isProcessing = true;
        showLoadingState(file);

        try {
            const result = await processImage(file);
            handleSuccess(result);
        } catch (error) {
            handleError(error);
        } finally {
            isProcessing = false;
        }
    }

    function showLoadingState(file) {
        output.textContent = '';
        output.style.color = '';

        const reader = new FileReader();
        reader.onload = function (e) {
            imagePlaceholder.style.display = 'none';
            let preview = heroImage.querySelector('.preview-image');

            if (!preview) {
                preview = document.createElement('img');
                preview.className = 'preview-image';
                heroImage.appendChild(preview);
            }

            preview.src = e.target.result;
            localStorage.setItem('uploadedImage', e.target.result);
        };
        reader.readAsDataURL(file);

        const spinner = document.createElement('div');
        spinner.className = 'spinner visible';
        heroImage.appendChild(spinner);

        output.textContent = 'Analyzing your image...';
    }

    async function processImage(file) {
        if (TEST_MODE) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            return generateDummyResponse(file.name);
        } else {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(BACKEND_URL, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error(`Server responded with ${response.status}`);
            return await response.json();
        }
    }

    function handleSuccess(result) {
        const spinner = heroImage.querySelector('.spinner');
        if (spinner) spinner.remove();

        localStorage.setItem('analysisResults', JSON.stringify(result));
        output.textContent = 'Analysis complete! Redirecting...';
        output.style.color = '#3ab757';

        setTimeout(() => {
            window.location.href = 'output.html';
        }, 1000);
    }

    function handleError(error) {
        console.error('Error:', error);
        const spinner = heroImage.querySelector('.spinner');
        if (spinner) spinner.remove();

        output.textContent = 'Error: ' + error.message;
        output.style.color = '#e74c3c';
    }

    function generateDummyResponse(filename) {
        const conditions = ["Eczema", "Contact Dermatitis", "Psoriasis", "Acne", "Rosacea"];
        const mainCondition = conditions[Math.floor(Math.random() * conditions.length)];
        const confidence = (Math.random() * 0.5 + 0.5).toFixed(2); // 0.5 - 1.0

        return {
            prediction: mainCondition,
            confidence: parseFloat(confidence),
            alternative_diagnoses: [
                {
                    condition: conditions.find(c => c !== mainCondition),
                    confidence: (Math.random() * 0.3).toFixed(2)
                }
            ],
            recommendations: [
                "Keep the area clean and dry",
                "Use fragrance-free moisturizer",
                "Consult a dermatologist if condition worsens"
            ],
            image_metadata: {
                filename: filename,
                upload_date: new Date().toISOString()
            }
        };
    }

    // 3D Hover Effect
    heroImage.addEventListener('mousemove', function (e) {
        const xAxis = (window.innerWidth / 2 - e.pageX) / 25;
        const yAxis = (window.innerHeight / 2 - e.pageY) / 25;
        heroImage.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg) scale(1.05)`;
    });

    heroImage.addEventListener('mouseleave', function () {
        heroImage.style.transform = 'rotateY(0deg) rotateX(0deg) scale(1)';
    });

    
    // Drag & Drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!isDragging) {
            uploadArea.classList.add('drag-over');
            isDragging = true;
        }
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
        isDragging = false;
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        isDragging = false;

        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            const event = new Event('change');
            fileInput.dispatchEvent(event);
        }
    });

    uploadArea.addEventListener('click', (e) => {
        if (e.target.closest('#heroUploadBtn')) return;
        fileInput.click();
    });
});

