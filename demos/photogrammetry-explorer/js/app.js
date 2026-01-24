// Photogrammetry Explorer Application Controller

class PhotogrammetryApp {
    constructor() {
        // UI Elements
        this.canvas = document.getElementById('viewer-canvas');
        this.themeToggle = document.getElementById('theme-toggle');
        this.datasetSelect = document.getElementById('dataset-select');
        this.pointReadout = document.getElementById('point-readout');
        this.readoutContent = document.getElementById('readout-content');

        // Initialize viewer
        this.viewer = new Viewer3D(this.canvas);
        this.viewer.onHoverChange = (point) => this.handleHover(point);

        // Bind UI controls
        this.initTheme();
        this.initTabs();
        this.initViewControls();
        this.initDisplayControls();
        this.initColormapControls();
        this.initSliders();
        this.initContextControls();
        this.initViewModeControls();

        // Load initial dataset
        this.loadDataset('rolling-hill-melbourne');
    }

    // Theme management
    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);

        this.themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            this.setTheme(newTheme);
        });
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);

        const icon = this.themeToggle.querySelector('.theme-icon');
        if (icon) {
            icon.textContent = theme === 'dark' ? '☀️' : '🌙';
        }

        // Re-render viewer to update colors
        if (this.viewer) {
            this.viewer.render();
        }
    }

    // Tab navigation
    initTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabPanes = document.querySelectorAll('.tab-pane');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.dataset.tab;

                // Update button states
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update pane visibility
                tabPanes.forEach(pane => {
                    if (pane.id === `${targetTab}-tab`) {
                        pane.classList.add('active');
                    } else {
                        pane.classList.remove('active');
                    }
                });

                // Re-render viewer if switching to explorer tab
                if (targetTab === 'explorer') {
                    setTimeout(() => this.viewer.render(), 100);
                }
            });
        });
    }

    // View mode controls
    initViewModeControls() {
        const viewModeBtns = document.querySelectorAll('[data-mode]');

        viewModeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;

                // Update button states
                viewModeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update viewer
                this.viewer.viewMode = mode;
                this.viewer.render();
            });
        });
    }

    // Display controls
    initDisplayControls() {
        const showGrid = document.getElementById('show-grid');
        const colorByElevation = document.getElementById('color-by-elevation');

        showGrid.addEventListener('change', (e) => {
            this.viewer.showGrid = e.target.checked;
            this.viewer.render();
        });

        colorByElevation.addEventListener('change', (e) => {
            this.viewer.colorByElevation = e.target.checked;
            this.viewer.render();
        });
    }

    // Colormap controls
    initColormapControls() {
        const colormapBtns = document.querySelectorAll('[data-colormap]');

        colormapBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const colormap = btn.dataset.colormap;

                // Update button states
                colormapBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update viewer
                this.viewer.colormapType = colormap;
                this.viewer.render();
            });
        });
    }

    // Sliders
    initSliders() {
        const verticalExag = document.getElementById('vertical-exaggeration');
        const verticalExagValue = document.getElementById('vertical-exag-value');

        verticalExag.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            verticalExagValue.textContent = `${value.toFixed(1)}x`;
            this.viewer.updateVerticalExaggeration(value);
        });

        const contextOpacity = document.getElementById('context-opacity');
        const contextOpacityValue = document.getElementById('context-opacity-value');

        contextOpacity.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            contextOpacityValue.textContent = `${value}%`;
            this.viewer.contextOpacity = value / 100;
            this.viewer.render();
        });
    }

    // Context layer controls
    initContextControls() {
        const showBasemap = document.getElementById('show-basemap');
        const showTopography = document.getElementById('show-topography');
        const layerBtns = document.querySelectorAll('[data-layer]');
        const showFullMetadata = document.getElementById('show-full-metadata');

        showBasemap.addEventListener('change', (e) => {
            this.viewer.showBasemap = e.target.checked;
            this.viewer.render();
        });

        showTopography.addEventListener('change', (e) => {
            this.viewer.showTopography = e.target.checked;
            this.viewer.render();
        });

        layerBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const layer = btn.dataset.layer;

                // Update button states
                layerBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update viewer
                this.viewer.contextLayer = layer;
                this.viewer.render();
            });
        });

        showFullMetadata.addEventListener('change', (e) => {
            this.viewer.showFullMetadata = e.target.checked;
        });
    }

    // View controls
    initViewControls() {
        const resetView = document.getElementById('reset-view');
        const fitBounds = document.getElementById('fit-bounds');

        resetView.addEventListener('click', () => {
            this.viewer.resetView();
        });

        fitBounds.addEventListener('click', () => {
            this.viewer.fitBounds();
        });
    }

    // Dataset loading
    async loadDataset(datasetId) {
        try {
            const dataset = await this.viewer.loadDataset(`data/${datasetId}.json`);
            this.updateLegend(dataset);
            this.updateColorScale(dataset);
        } catch (error) {
            console.error('Failed to load dataset:', error);
            alert('Failed to load dataset. Please check the console for details.');
        }
    }

    // Update legend with dataset info
    updateLegend(dataset) {
        const meta = dataset.metadata;
        const bounds = meta.bounds;

        document.getElementById('area-value').textContent = `15m × 15m`;
        document.getElementById('points-value').textContent = meta.processing.point_count_decimated.toLocaleString();
        document.getElementById('elevation-value').textContent = `${bounds.z_min}m to ${bounds.z_max.toFixed(1)}m`;
        document.getElementById('coord-value').textContent = meta.coordinate_system.type;
        document.getElementById('units-value').textContent = meta.coordinate_system.units;
    }

    // Update color scale
    updateColorScale(dataset) {
        const bounds = dataset.metadata.bounds;
        document.getElementById('scale-min').textContent = `${bounds.z_min}m`;
        document.getElementById('scale-max').textContent = `${bounds.z_max.toFixed(1)}m`;
    }

    // Handle point hover
    handleHover(point) {
        if (!point) {
            this.pointReadout.classList.add('hidden');
            return;
        }

        this.pointReadout.classList.remove('hidden');

        let content = `
            <div class="readout-item">
                <span class="readout-label">X:</span> ${point.x.toFixed(2)}m
            </div>
            <div class="readout-item">
                <span class="readout-label">Y:</span> ${point.y.toFixed(2)}m
            </div>
            <div class="readout-item">
                <span class="readout-label">Z:</span> ${point.originalZ.toFixed(2)}m
            </div>
            <div class="readout-item">
                <span class="readout-label">Elevation:</span> ${point.elevation.toFixed(2)}m
            </div>
        `;

        if (this.viewer.showFullMetadata) {
            content += `
                <div class="readout-item">
                    <span class="readout-label">Classification:</span> ${point.classification}
                </div>
                <div class="readout-item">
                    <span class="readout-label">Dataset:</span> Rolling Hill - Melbourne
                </div>
                <div class="readout-item">
                    <span class="readout-label">Coord System:</span> Local
                </div>
            `;
        }

        this.readoutContent.innerHTML = content;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new PhotogrammetryApp();
});
