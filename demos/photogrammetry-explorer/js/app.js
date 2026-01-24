// Photogrammetry Explorer Application Controller

class PhotogrammetryApp {
    constructor() {
        this.canvas = document.getElementById('viewer-canvas');
        this.themeToggle = document.getElementById('theme-toggle');
        this.datasetSelect = document.getElementById('dataset-select');
        this.pointReadout = document.getElementById('point-readout');
        this.readoutContent = document.getElementById('readout-content');

        this.datasets = {
            'rolling-hill-melbourne': 'data/rolling-hill-melbourne.json'
        };

        this.viewer = new Viewer3D(this.canvas);
        this.viewer.onHoverChange = (point) => this.handleHover(point);

        this.initTheme();
        this.initTabs();
        this.initViewModeControls();
        this.initDisplayControls();
        this.initColormapControls();
        this.initSliders();
        this.initContextControls();
        this.initViewControls();
        this.initDatasetControls();

        this.loadDataset('rolling-hill-melbourne');
    }

    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);
        this.themeToggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            this.setTheme(current === 'dark' ? 'light' : 'dark');
        });
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        const icon = this.themeToggle.querySelector('.theme-icon');
        if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
        if (this.viewer) this.viewer.render();
    }

    initTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabPanes = document.querySelectorAll('.tab-pane');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.tab;
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                tabPanes.forEach(pane => {
                    pane.classList.toggle('active', pane.id === `${target}-tab`);
                });
                if (target === 'explorer') {
                    setTimeout(() => this.viewer.render(), 50);
                }
            });
        });
    }

    initViewModeControls() {
        const btns = document.querySelectorAll('[data-mode]');
        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                btns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.viewer.viewMode = btn.dataset.mode;
                this.viewer.render();
            });
        });
    }

    initDisplayControls() {
        const showGrid = document.getElementById('show-grid');
        const colorByElevation = document.getElementById('color-by-elevation');

        showGrid.addEventListener('change', (e) => {
            this.viewer.showGrid = e.target.checked;
            this.viewer.render();
        });

        colorByElevation.addEventListener('change', (e) => {
            this.viewer.colorByElevation = e.target.checked;
            this.viewer.colorCache.clear();
            this.viewer.render();
        });
    }

    initColormapControls() {
        const radios = document.querySelectorAll('input[name="colormap"]');
        radios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.viewer.colormapType = e.target.value;
                    this.viewer.colorCache.clear();
                    this.viewer.render();
                }
            });
        });
    }

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
                layerBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.viewer.contextLayer = btn.dataset.layer;
                this.viewer.render();
            });
        });

        showFullMetadata.addEventListener('change', (e) => {
            this.viewer.showFullMetadata = e.target.checked;
            if (this.viewer.hoveredPoint) {
                this.handleHover(this.viewer.hoveredPoint);
            }
        });
    }

    initViewControls() {
        document.getElementById('reset-view').addEventListener('click', () => {
            this.viewer.resetView();
        });

        document.getElementById('fit-bounds').addEventListener('click', () => {
            this.viewer.fitBounds();
        });
    }

    initDatasetControls() {
        this.datasetSelect.addEventListener('change', (e) => {
            this.loadDataset(e.target.value);
        });
    }

    async loadDataset(datasetId) {
        const url = this.datasets[datasetId];
        if (!url) return;

        try {
            const dataset = await this.viewer.loadDataset(url);
            this.updateLegend(dataset);
            this.updateColorScale(dataset);
        } catch (error) {
            console.error('Failed to load dataset:', error);
        }
    }

    updateLegend(dataset) {
        const meta = dataset.metadata;
        const bounds = meta.bounds;

        document.getElementById('area-value').textContent = '15m × 15m';
        document.getElementById('points-value').textContent = meta.processing.point_count_decimated.toLocaleString();
        document.getElementById('elevation-value').textContent =
            `${bounds.z_min.toFixed(1)}m – ${bounds.z_max.toFixed(1)}m`;
        document.getElementById('coord-value').textContent = meta.coordinate_system.type;
        document.getElementById('units-value').textContent = meta.coordinate_system.units;
    }

    updateColorScale(dataset) {
        const bounds = dataset.metadata.bounds;
        document.getElementById('scale-min').textContent = `${bounds.z_min.toFixed(1)}m`;
        document.getElementById('scale-max').textContent = `${bounds.z_max.toFixed(1)}m`;
    }

    handleHover(point) {
        if (!point) {
            this.pointReadout.classList.add('hidden');
            return;
        }

        this.pointReadout.classList.remove('hidden');

        let content = `
            <div class="readout-item"><span class="readout-label">X:</span> ${point.x.toFixed(3)}m</div>
            <div class="readout-item"><span class="readout-label">Y:</span> ${point.y.toFixed(3)}m</div>
            <div class="readout-item"><span class="readout-label">Z:</span> ${point.originalZ.toFixed(3)}m</div>
            <div class="readout-item"><span class="readout-label">Elevation:</span> ${point.elevation.toFixed(3)}m</div>
        `;

        if (this.viewer.showFullMetadata) {
            content += `
                <div class="readout-item"><span class="readout-label">Classification:</span> ${point.classification}</div>
                <div class="readout-item"><span class="readout-label">Dataset:</span> Rolling Hill Melbourne</div>
                <div class="readout-item"><span class="readout-label">Coord System:</span> Local</div>
                <div class="readout-item"><span class="readout-label">Units:</span> meters</div>
            `;
        }

        this.readoutContent.innerHTML = content;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new PhotogrammetryApp();
});
