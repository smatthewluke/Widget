// ===== STATE MANAGEMENT =====
const state = {
    settings: {
        // Meta
        metaPreset: 'med',

        // Durations
        imageDuration: 250,
        prophantasiaDuration: 2750,

        // Media Frame
        frameShape: 'square',
        backgroundColor: 'black',

        // Grid
        gridEnabled: false,
        gridSize: 4,
        gridThickness: 2,
        gridOpacity: 50,
        gridColor: 'white',

        // Sound
        speakFilename: false,
        beepOn: 'none'
    },

    media: {
        selectedImages: [],
        sets: [],
        batches: [],
        activeBatch: null
    },

    training: {
        isActive: false,
        currentImageIndex: 0,
        animationFrameId: null,
        lastImageTime: 0,
        lastProphantasiaTime: 0
    }
};

// ===== META PRESETS =====
const metaPresets = {
    fast: {
        imageDuration: 30,
        prophantasiaDuration: 750,
        gridSize: 5,
        gridThickness: 1,
        gridOpacity: 30
    },
    med: {
        imageDuration: 250,
        prophantasiaDuration: 2750,
        gridSize: 4,
        gridThickness: 2,
        gridOpacity: 50
    },
    slow: {
        imageDuration: 300,
        prophantasiaDuration: 4000,
        gridSize: 3,
        gridThickness: 4,
        gridOpacity: 80
    }
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    updateAllUI();
    updatePreview();
});

// ===== EVENT LISTENERS =====
function initializeEventListeners() {
    // Start Training Button
    document.getElementById('start-training-btn').addEventListener('click', startTraining);

    // Meta Control
    document.querySelectorAll('[data-meta]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const preset = e.target.dataset.meta;
            applyMetaPreset(preset);
        });
    });

    // Duration Toggles
    document.querySelectorAll('.duration-toggle').forEach(btn => {
        btn.addEventListener('click', handleToggleClick);
    });

    // Frame Toggles
    document.querySelectorAll('.frame-toggle').forEach(btn => {
        btn.addEventListener('click', handleToggleClick);
    });

    // Background Toggles
    document.querySelectorAll('.bg-toggle').forEach(btn => {
        btn.addEventListener('click', handleToggleClick);
    });

    // Grid Toggles
    document.querySelectorAll('.grid-size-toggle, .grid-thickness-toggle, .grid-opacity-toggle, .grid-color-toggle, .grid-enabled-toggle').forEach(btn => {
        btn.addEventListener('click', handleToggleClick);
    });

    // Sound Toggles
    document.querySelectorAll('.speak-toggle, .beep-toggle').forEach(btn => {
        btn.addEventListener('click', handleToggleClick);
    });

    // Manual Inputs
    document.getElementById('imageDuration-manual').addEventListener('input', (e) => {
        state.settings.imageDuration = parseInt(e.target.value) || 250;
        updatePreview();
    });

    document.getElementById('prophantasiaDuration-manual').addEventListener('input', (e) => {
        state.settings.prophantasiaDuration = parseInt(e.target.value) || 2750;
    });

    document.getElementById('gridThickness-manual').addEventListener('input', (e) => {
        state.settings.gridThickness = parseInt(e.target.value) || 2;
        updatePreview();
        updateGridOverlay();
    });

    document.getElementById('gridOpacity-manual').addEventListener('input', (e) => {
        state.settings.gridOpacity = parseInt(e.target.value) || 50;
        updatePreview();
        updateGridOverlay();
    });

    // Image Input
    document.getElementById('image-input').addEventListener('change', handleImageSelection);

    // Media Sets
    document.getElementById('create-set-btn').addEventListener('click', createMediaSet);

    // Media Batches
    document.getElementById('create-batch-btn').addEventListener('click', createMediaBatch);
    document.getElementById('active-batch-select').addEventListener('change', handleActiveBatchChange);

    // JSON Import/Export
    document.getElementById('export-json-btn').addEventListener('click', exportSettings);
    document.getElementById('import-json-btn').addEventListener('click', () => {
        document.getElementById('json-import-input').click();
    });
    document.getElementById('json-import-input').addEventListener('change', importSettings);

    // Training Screen Click (exit fullscreen)
    document.getElementById('training-screen').addEventListener('click', stopTraining);

    // Mobile Long Press (exit fullscreen)
    let longPressTimer;
    const trainingScreen = document.getElementById('training-screen');

    trainingScreen.addEventListener('touchstart', () => {
        longPressTimer = setTimeout(() => {
            stopTraining();
        }, 500); // 500ms long press
    });

    trainingScreen.addEventListener('touchend', () => {
        clearTimeout(longPressTimer);
    });

    trainingScreen.addEventListener('touchmove', () => {
        clearTimeout(longPressTimer);
    });
}

// ===== TOGGLE BUTTON HANDLER =====
function handleToggleClick(e) {
    const btn = e.target;
    const setting = btn.dataset.setting;
    const value = btn.dataset.value;

    // Remove active class from siblings
    btn.parentElement.querySelectorAll('.toggle-btn').forEach(b => {
        b.classList.remove('active');
    });

    // Add active class to clicked button
    btn.classList.add('active');

    // Update state
    if (value === 'true' || value === 'false') {
        state.settings[setting] = value === 'true';
    } else if (!isNaN(value)) {
        state.settings[setting] = parseFloat(value);
    } else {
        state.settings[setting] = value;
    }

    // Update manual inputs if applicable
    const manualInput = document.getElementById(`${setting}-manual`);
    if (manualInput) {
        manualInput.value = value;
    }

    // Update UI
    updatePreview();
    updateGridOverlay();
}

// ===== META PRESET =====
function applyMetaPreset(preset) {
    state.settings.metaPreset = preset;
    const presetValues = metaPresets[preset];

    // Apply preset values
    Object.keys(presetValues).forEach(key => {
        state.settings[key] = presetValues[key];
    });

    // Update all UI elements
    updateAllUI();
    updatePreview();
    updateGridOverlay();
}

// ===== UPDATE ALL UI =====
function updateAllUI() {
    // Update meta buttons
    document.querySelectorAll('[data-meta]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.meta === state.settings.metaPreset);
    });

    // Update all toggle buttons
    Object.keys(state.settings).forEach(key => {
        const value = state.settings[key];
        const buttons = document.querySelectorAll(`[data-setting="${key}"]`);

        buttons.forEach(btn => {
            const btnValue = btn.dataset.value;
            if (btnValue === String(value) ||
                (btnValue === 'true' && value === true) ||
                (btnValue === 'false' && value === false)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Update manual inputs
        const manualInput = document.getElementById(`${key}-manual`);
        if (manualInput) {
            manualInput.value = value;
        }
    });
}

// ===== IMAGE SELECTION =====
function handleImageSelection(e) {
    const files = Array.from(e.target.files);

    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
            state.media.selectedImages.push({
                name: file.name,
                data: event.target.result
            });
            updateImageList();
            updatePreview();
        };
        reader.readAsDataURL(file);
    });
}

// ===== UPDATE IMAGE LIST =====
function updateImageList() {
    const container = document.getElementById('image-list-container');
    const count = document.getElementById('image-count');

    count.textContent = state.media.selectedImages.length;

    if (state.media.selectedImages.length === 0) {
        container.innerHTML = '<div class="empty-state">No images selected</div>';
        return;
    }

    container.innerHTML = state.media.selectedImages.map((img, index) => `
        <div class="list-item">
            <span class="list-item-name">${img.name}</span>
            <div class="list-item-actions">
                <button class="remove-btn" onclick="removeImage(${index})">Remove</button>
            </div>
        </div>
    `).join('');
}

function removeImage(index) {
    state.media.selectedImages.splice(index, 1);
    updateImageList();
    updatePreview();
}

// ===== MEDIA SETS =====
function createMediaSet() {
    const nameInput = document.getElementById('set-name-input');
    const name = nameInput.value.trim();

    if (!name) {
        alert('Please enter a set name');
        return;
    }

    if (state.media.selectedImages.length === 0) {
        alert('Please select images first');
        return;
    }

    state.media.sets.push({
        name: name,
        images: [...state.media.selectedImages]
    });

    nameInput.value = '';
    updateSetsList();
    updateBatchSetsSelect();
}

function updateSetsList() {
    const container = document.getElementById('sets-list-container');
    const count = document.getElementById('sets-count');

    count.textContent = state.media.sets.length;

    if (state.media.sets.length === 0) {
        container.innerHTML = '<div class="empty-state">No sets created</div>';
        return;
    }

    container.innerHTML = state.media.sets.map((set, index) => `
        <div class="list-item">
            <div>
                <span class="list-item-name">${set.name}</span>
                <span class="list-item-info">(${set.images.length} images)</span>
            </div>
            <div class="list-item-actions">
                <button class="select-btn" onclick="loadSet(${index})">Load</button>
                <button class="remove-btn" onclick="removeSet(${index})">Remove</button>
            </div>
        </div>
    `).join('');
}

function loadSet(index) {
    state.media.selectedImages = [...state.media.sets[index].images];
    updateImageList();
    updatePreview();
}

function removeSet(index) {
    state.media.sets.splice(index, 1);
    updateSetsList();
    updateBatchSetsSelect();
}

// ===== MEDIA BATCHES =====
function updateBatchSetsSelect() {
    const select = document.getElementById('batch-sets-select');
    select.innerHTML = state.media.sets.map((set, index) =>
        `<option value="${index}">${set.name} (${set.images.length} images)</option>`
    ).join('');
}

function createMediaBatch() {
    const nameInput = document.getElementById('batch-name-input');
    const name = nameInput.value.trim();
    const select = document.getElementById('batch-sets-select');
    const selectedIndices = Array.from(select.selectedOptions).map(opt => parseInt(opt.value));

    if (!name) {
        alert('Please enter a batch name');
        return;
    }

    if (selectedIndices.length === 0) {
        alert('Please select at least one set');
        return;
    }

    const selectedSets = selectedIndices.map(i => state.media.sets[i]);

    state.media.batches.push({
        name: name,
        sets: selectedSets
    });

    nameInput.value = '';
    updateBatchesList();
    updateActiveBatchSelect();
}

function updateBatchesList() {
    const container = document.getElementById('batches-list-container');
    const count = document.getElementById('batches-count');

    count.textContent = state.media.batches.length;

    if (state.media.batches.length === 0) {
        container.innerHTML = '<div class="empty-state">No batches created</div>';
        return;
    }

    container.innerHTML = state.media.batches.map((batch, index) => `
        <div class="list-item">
            <div>
                <span class="list-item-name">${batch.name}</span>
                <span class="list-item-info">(${batch.sets.length} sets)</span>
            </div>
            <div class="list-item-actions">
                <button class="remove-btn" onclick="removeBatch(${index})">Remove</button>
            </div>
        </div>
    `).join('');
}

function updateActiveBatchSelect() {
    const select = document.getElementById('active-batch-select');
    select.innerHTML = '<option value="">No batch selected</option>' +
        state.media.batches.map((batch, index) =>
            `<option value="${index}">${batch.name}</option>`
        ).join('');
}

function handleActiveBatchChange(e) {
    const index = e.target.value;
    if (index === '') {
        state.media.activeBatch = null;
        return;
    }

    state.media.activeBatch = parseInt(index);
}

function removeBatch(index) {
    state.media.batches.splice(index, 1);
    updateBatchesList();
    updateActiveBatchSelect();
}

// ===== GRID OVERLAY =====
function updateGridOverlay(targetId = 'grid-overlay') {
    const overlay = document.getElementById(targetId);
    const previewOverlay = document.getElementById('preview-grid-overlay');

    if (!state.settings.gridEnabled) {
        overlay.style.display = 'none';
        previewOverlay.innerHTML = '';
        return;
    }

    overlay.style.display = 'block';

    const gridSize = state.settings.gridSize;
    const thickness = state.settings.gridThickness;
    const opacity = state.settings.gridOpacity / 100;
    const color = state.settings.gridColor;

    // Create grid SVG
    const svg = createGridSVG(gridSize, thickness, opacity, color);

    overlay.innerHTML = svg;
    previewOverlay.innerHTML = svg;
}

function createGridSVG(gridSize, thickness, opacity, color) {
    const lines = [];

    // Vertical lines
    for (let i = 1; i < gridSize; i++) {
        const x = (i / gridSize) * 100;
        lines.push(`<line x1="${x}%" y1="0%" x2="${x}%" y2="100%" stroke="${color}" stroke-width="${thickness}" opacity="${opacity}" />`);
    }

    // Horizontal lines
    for (let i = 1; i < gridSize; i++) {
        const y = (i / gridSize) * 100;
        lines.push(`<line x1="0%" y1="${y}%" x2="100%" y2="${y}%" stroke="${color}" stroke-width="${thickness}" opacity="${opacity}" />`);
    }

    return `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">${lines.join('')}</svg>`;
}

// ===== PREVIEW =====
function updatePreview() {
    const previewImage = document.getElementById('preview-image');

    if (state.media.selectedImages.length > 0) {
        previewImage.src = state.media.selectedImages[0].data;
        previewImage.classList.add('visible');
    } else {
        previewImage.classList.remove('visible');
    }

    updateGridOverlay('preview-grid-overlay');
}

// ===== TRAINING =====
function startTraining() {
    // Check if images are loaded
    let imagesToUse = [];

    if (state.media.activeBatch !== null) {
        // Use active batch
        const batch = state.media.batches[state.media.activeBatch];
        batch.sets.forEach(set => {
            imagesToUse = imagesToUse.concat(set.images);
        });
    } else if (state.media.selectedImages.length > 0) {
        // Use selected images
        imagesToUse = state.media.selectedImages;
    } else {
        alert('Please select images or choose a batch first');
        return;
    }

    state.training.imagesToUse = imagesToUse;
    state.training.isActive = true;
    state.training.currentImageIndex = 0;
    state.training.lastImageTime = 0;
    state.training.lastProphantasiaTime = 0;

    // Hide settings, show training screen
    document.getElementById('settings-panel').classList.remove('visible');
    document.getElementById('settings-panel').classList.add('hidden');
    document.getElementById('training-screen').classList.remove('hidden');
    document.getElementById('training-screen').classList.add('visible');

    // Update media frame styling
    const mediaFrame = document.getElementById('media-frame');
    mediaFrame.className = '';
    mediaFrame.classList.add(state.settings.frameShape);
    mediaFrame.classList.add(`bg-${state.settings.backgroundColor}`);

    // Update grid overlay
    updateGridOverlay('grid-overlay');

    // Enter fullscreen
    enterFullscreen();

    // Start animation loop
    state.training.startTime = performance.now();
    state.training.showingImage = true;
    animationLoop(performance.now());
}

function stopTraining() {
    state.training.isActive = false;

    if (state.training.animationFrameId) {
        cancelAnimationFrame(state.training.animationFrameId);
    }

    // Show settings, hide training screen
    document.getElementById('settings-panel').classList.remove('hidden');
    document.getElementById('settings-panel').classList.add('visible');
    document.getElementById('training-screen').classList.remove('visible');
    document.getElementById('training-screen').classList.add('hidden');

    // Exit fullscreen
    exitFullscreen();

    // Stop any ongoing speech
    window.speechSynthesis.cancel();
}

// ===== ANIMATION LOOP =====
function animationLoop(timestamp) {
    if (!state.training.isActive) return;

    const trainingImage = document.getElementById('training-image');
    const elapsed = timestamp - state.training.startTime;
    const cycleDuration = state.settings.imageDuration + state.settings.prophantasiaDuration;
    const cyclePosition = elapsed % cycleDuration;

    // Determine if we should show image or prophantasia (blank)
    if (cyclePosition < state.settings.imageDuration) {
        // Show image phase
        if (!state.training.showingImage) {
            state.training.showingImage = true;
            showCurrentImage();
        }
    } else {
        // Prophantasia phase (blank)
        if (state.training.showingImage) {
            state.training.showingImage = false;
            hideImage();

            // Move to next image
            state.training.currentImageIndex = (state.training.currentImageIndex + 1) % state.training.imagesToUse.length;
        }

        // Handle beeps during prophantasia phase
        const prophantasiaElapsed = cyclePosition - state.settings.imageDuration;
        handleBeeps(prophantasiaElapsed);
    }

    state.training.animationFrameId = requestAnimationFrame(animationLoop);
}

function showCurrentImage() {
    const trainingImage = document.getElementById('training-image');
    const currentImage = state.training.imagesToUse[state.training.currentImageIndex];

    trainingImage.src = currentImage.data;
    trainingImage.classList.add('visible');

    // Speak filename if enabled
    if (state.settings.speakFilename) {
        speakFilename(currentImage.name);
    }
}

function hideImage() {
    const trainingImage = document.getElementById('training-image');
    trainingImage.classList.remove('visible');
}

// ===== BEEP HANDLING =====
let lastBeepTime = 0;

function handleBeeps(prophantasiaElapsed) {
    if (state.settings.beepOn === 'none') return;

    const duration = state.settings.prophantasiaDuration;
    let beepCount = 0;

    switch (state.settings.beepOn) {
        case 'seconds':
            beepCount = 1;
            break;
        case 'thirds':
            beepCount = 2;
            break;
        case 'fourths':
            beepCount = 3;
            break;
    }

    if (beepCount === 0) return;

    const interval = duration / (beepCount + 1);

    for (let i = 1; i <= beepCount; i++) {
        const beepTime = interval * i;
        if (prophantasiaElapsed >= beepTime && prophantasiaElapsed < beepTime + 50) {
            if (performance.now() - lastBeepTime > 100) {
                playBeep();
                lastBeepTime = performance.now();
            }
        }
    }
}

function playBeep() {
    const audio = document.getElementById('beep-audio');
    audio.currentTime = 0;
    audio.play().catch(e => console.log('Beep playback failed:', e));
}

// ===== SPEAK FILENAME =====
function speakFilename(filename) {
    // Remove file extension
    let cleanName = filename.replace(/\.[^/.]+$/, '');

    // Replace hyphens and underscores with spaces
    cleanName = cleanName.replace(/[-_]/g, ' ');

    // Speak the cleaned filename
    const msg = new SpeechSynthesisUtterance(cleanName);
    window.speechSynthesis.cancel(); // Cancel any ongoing speech
    window.speechSynthesis.speak(msg);
}

// ===== FULLSCREEN =====
function enterFullscreen() {
    const elem = document.getElementById('training-screen');

    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
    }
}

function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }
}

// ===== JSON IMPORT/EXPORT =====
function exportSettings() {
    const dataToExport = {
        settings: state.settings,
        media: {
            sets: state.media.sets,
            batches: state.media.batches
        },
        version: '1.3',
        exportDate: new Date().toISOString()
    };

    const json = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `prophantasia-settings-${Date.now()}.json`;
    a.click();

    URL.revokeObjectURL(url);
}

function importSettings(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const imported = JSON.parse(event.target.result);

            // Import settings
            if (imported.settings) {
                state.settings = { ...state.settings, ...imported.settings };
            }

            // Import media sets
            if (imported.media && imported.media.sets) {
                state.media.sets = imported.media.sets;
            }

            // Import media batches
            if (imported.media && imported.media.batches) {
                state.media.batches = imported.media.batches;
            }

            // Update UI
            updateAllUI();
            updatePreview();
            updateSetsList();
            updateBatchesList();
            updateBatchSetsSelect();
            updateActiveBatchSelect();
            updateGridOverlay();

            alert('Settings imported successfully!');
        } catch (error) {
            alert('Error importing settings: ' + error.message);
        }
    };
    reader.readAsText(file);

    // Reset file input
    e.target.value = '';
}

// ===== GLOBAL FUNCTIONS (for onclick handlers) =====
window.removeImage = removeImage;
window.loadSet = loadSet;
window.removeSet = removeSet;
window.removeBatch = removeBatch;
