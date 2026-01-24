// Photogrammetry 3D Viewer Engine
// High-performance canvas-based 3D point cloud and mesh renderer

class Viewer3D {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.dataset = null;
        this.points = [];
        this.projectedPoints = [];

        this.viewMode = 'points';
        this.showGrid = true;
        this.colorByElevation = true;
        this.colormapType = 'linear';
        this.verticalExaggeration = 2.0;
        this.showFullMetadata = false;

        this.showBasemap = false;
        this.showTopography = false;
        this.contextOpacity = 0.5;
        this.contextLayer = 'overlay';

        this.camera = {
            distance: 30,
            rotationX: -0.5,
            rotationY: 0.3,
            rotationZ: 0,
            centerX: 7.5,
            centerY: 7.5,
            centerZ: 1.5
        };

        this.mouse = { isDragging: false, lastX: 0, lastY: 0 };
        this.hoveredPoint = null;
        this.onHoverChange = null;

        this.colorCache = new Map();
        this.quantileRanks = null;
        this.stats = null;

        this.initCanvas();
        this.initEventListeners();
    }

    initCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        this.ctx.scale(dpr, dpr);
        this.displayWidth = rect.width;
        this.displayHeight = rect.height;
        this.render();
    }

    initEventListeners() {
        this.canvas.addEventListener('mousedown', e => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', e => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.mouse.isDragging = false);
        this.canvas.addEventListener('mouseleave', () => this.mouse.isDragging = false);
        this.canvas.addEventListener('wheel', e => this.onWheel(e), { passive: false });
        this.canvas.addEventListener('touchstart', e => this.onTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', e => this.onTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', () => this.mouse.isDragging = false);
    }

    onMouseDown(e) {
        this.mouse.isDragging = true;
        this.mouse.lastX = e.clientX;
        this.mouse.lastY = e.clientY;
    }

    onMouseMove(e) {
        if (this.mouse.isDragging) {
            const dx = e.clientX - this.mouse.lastX;
            const dy = e.clientY - this.mouse.lastY;
            this.camera.rotationY += dx * 0.005;
            this.camera.rotationX = Math.max(-Math.PI / 2.2, Math.min(0.1, this.camera.rotationX + dy * 0.005));
            this.mouse.lastX = e.clientX;
            this.mouse.lastY = e.clientY;
            this.render();
        } else {
            this.updateHover(e.offsetX, e.offsetY);
        }
    }

    onWheel(e) {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 1.08 : 0.92;
        this.camera.distance = Math.max(10, Math.min(80, this.camera.distance * factor));
        this.render();
    }

    onTouchStart(e) {
        if (e.touches.length === 1) {
            e.preventDefault();
            this.mouse.isDragging = true;
            this.mouse.lastX = e.touches[0].clientX;
            this.mouse.lastY = e.touches[0].clientY;
        }
    }

    onTouchMove(e) {
        if (e.touches.length === 1 && this.mouse.isDragging) {
            e.preventDefault();
            const dx = e.touches[0].clientX - this.mouse.lastX;
            const dy = e.touches[0].clientY - this.mouse.lastY;
            this.camera.rotationY += dx * 0.005;
            this.camera.rotationX = Math.max(-Math.PI / 2.2, Math.min(0.1, this.camera.rotationX + dy * 0.005));
            this.mouse.lastX = e.touches[0].clientX;
            this.mouse.lastY = e.touches[0].clientY;
            this.render();
        }
    }

    async loadDataset(url) {
        const response = await fetch(url);
        this.dataset = await response.json();
        this.processPoints();
        this.computeStatistics();
        this.fitBounds();
        this.render();
        return this.dataset;
    }

    processPoints() {
        this.points = this.dataset.points.map(p => ({
            x: p.x,
            y: p.y,
            z: p.z * this.verticalExaggeration,
            originalZ: p.z,
            elevation: p.elevation,
            classification: p.classification
        }));
        this.colorCache.clear();
        this.quantileRanks = null;
    }

    computeStatistics() {
        const zValues = this.points.map(p => p.originalZ);
        const sorted = [...zValues].sort((a, b) => a - b);
        const mean = zValues.reduce((s, v) => s + v, 0) / zValues.length;
        const variance = zValues.reduce((s, v) => s + (v - mean) ** 2, 0) / zValues.length;
        this.stats = {
            mean,
            stddev: Math.sqrt(variance),
            sorted,
            min: sorted[0],
            max: sorted[sorted.length - 1]
        };
    }

    updateVerticalExaggeration(value) {
        this.verticalExaggeration = value;
        this.points.forEach(p => p.z = p.originalZ * value);
        const bounds = this.dataset.metadata.bounds;
        this.camera.centerZ = ((bounds.z_min + bounds.z_max) / 2) * value;
        this.render();
    }

    project3D(x, y, z) {
        let px = x - this.camera.centerX;
        let py = y - this.camera.centerY;
        let pz = z - this.camera.centerZ;

        const cosX = Math.cos(this.camera.rotationX);
        const sinX = Math.sin(this.camera.rotationX);
        const cosY = Math.cos(this.camera.rotationY);
        const sinY = Math.sin(this.camera.rotationY);

        let ty = py * cosX - pz * sinX;
        let tz = py * sinX + pz * cosX;
        py = ty; pz = tz;

        let tx = px * cosY + pz * sinY;
        tz = -px * sinY + pz * cosY;
        px = tx; pz = tz;

        const scale = 600 / (this.camera.distance + pz);
        return {
            x: this.displayWidth / 2 + px * scale,
            y: this.displayHeight / 2 - py * scale,
            z: pz,
            scale
        };
    }

    getElevationColor(z, classification) {
        if (!this.colorByElevation) {
            const colors = { ground: '#8B7355', vegetation: '#228B22', rock: '#696969' };
            return colors[classification] || '#888888';
        }

        const key = `${z.toFixed(3)}_${this.colormapType}`;
        if (this.colorCache.has(key)) return this.colorCache.get(key);

        let t;
        const { min, max, mean, stddev, sorted } = this.stats;

        switch (this.colormapType) {
            case 'quantile':
                const rank = this.binarySearch(sorted, z);
                t = rank / sorted.length;
                break;
            case 'zeroed':
                const range = Math.max(Math.abs(max - mean), Math.abs(min - mean));
                t = range > 0 ? ((z - mean) / range + 1) / 2 : 0.5;
                break;
            case 'stddev':
                const anomaly = stddev > 0 ? (z - mean) / stddev : 0;
                t = Math.max(0, Math.min(1, (anomaly + 3) / 6));
                break;
            default:
                t = max > min ? (z - min) / (max - min) : 0.5;
        }

        t = Math.max(0, Math.min(1, t));
        const color = this.terrainGradient(t);
        this.colorCache.set(key, color);
        return color;
    }

    binarySearch(arr, val) {
        let lo = 0, hi = arr.length;
        while (lo < hi) {
            const mid = (lo + hi) >>> 1;
            if (arr[mid] < val) lo = mid + 1;
            else hi = mid;
        }
        return lo;
    }

    terrainGradient(t) {
        const stops = [
            { t: 0, r: 33, g: 150, b: 243 },
            { t: 0.25, r: 76, g: 175, b: 80 },
            { t: 0.5, r: 255, g: 235, b: 59 },
            { t: 0.75, r: 255, g: 152, b: 0 },
            { t: 1, r: 244, g: 67, b: 54 }
        ];

        let i = 0;
        while (i < stops.length - 1 && stops[i + 1].t < t) i++;
        if (i >= stops.length - 1) i = stops.length - 2;

        const s0 = stops[i], s1 = stops[i + 1];
        const f = (t - s0.t) / (s1.t - s0.t);

        const r = Math.round(s0.r + (s1.r - s0.r) * f);
        const g = Math.round(s0.g + (s1.g - s0.g) * f);
        const b = Math.round(s0.b + (s1.b - s0.b) * f);

        return `rgb(${r},${g},${b})`;
    }

    render() {
        if (!this.dataset) return;

        const ctx = this.ctx;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const dpr = window.devicePixelRatio || 1;
        ctx.scale(dpr, dpr);

        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--canvas-bg').trim();
        ctx.fillRect(0, 0, this.displayWidth, this.displayHeight);

        if (this.contextLayer === 'underlay' && (this.showBasemap || this.showTopography)) {
            this.renderContextLayer();
        }

        this.projectedPoints = this.points.map(p => ({
            ...p,
            proj: this.project3D(p.x, p.y, p.z)
        }));
        this.projectedPoints.sort((a, b) => b.proj.z - a.proj.z);

        switch (this.viewMode) {
            case 'points': this.renderPoints(); break;
            case 'mesh': this.renderMesh(); break;
            case 'heightmap': this.renderHeightmap(); break;
        }

        if (this.contextLayer === 'overlay' && (this.showBasemap || this.showTopography)) {
            this.renderContextLayer();
        }

        if (this.showGrid) this.renderGrid();
    }

    renderPoints() {
        const ctx = this.ctx;
        for (const p of this.projectedPoints) {
            const { x, y, scale } = p.proj;
            if (x < -10 || x > this.displayWidth + 10 || y < -10 || y > this.displayHeight + 10) continue;

            ctx.fillStyle = this.getElevationColor(p.originalZ, p.classification);
            ctx.beginPath();
            ctx.arc(x, y, Math.max(1.5, scale * 1.8), 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderMesh() {
        const ctx = this.ctx;
        const gridSize = 40;
        const grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));

        for (const p of this.projectedPoints) {
            const gx = Math.floor((p.x / 15) * (gridSize - 1));
            const gy = Math.floor((p.y / 15) * (gridSize - 1));
            if (gx >= 0 && gx < gridSize && gy >= 0 && gy < gridSize) {
                if (!grid[gx][gy] || p.originalZ > grid[gx][gy].originalZ) {
                    grid[gx][gy] = p;
                }
            }
        }

        const quads = [];
        for (let i = 0; i < gridSize - 1; i++) {
            for (let j = 0; j < gridSize - 1; j++) {
                const p00 = grid[i][j], p10 = grid[i + 1][j];
                const p01 = grid[i][j + 1], p11 = grid[i + 1][j + 1];
                if (p00 && p10 && p01 && p11) {
                    const avgZ = (p00.proj.z + p10.proj.z + p01.proj.z + p11.proj.z) / 4;
                    const avgElev = (p00.originalZ + p10.originalZ + p01.originalZ + p11.originalZ) / 4;
                    quads.push({ p00, p10, p01, p11, avgZ, avgElev });
                }
            }
        }

        quads.sort((a, b) => b.avgZ - a.avgZ);

        for (const q of quads) {
            ctx.fillStyle = this.getElevationColor(q.avgElev, 'ground');
            ctx.strokeStyle = this.getElevationColor(q.avgElev, 'ground');
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(q.p00.proj.x, q.p00.proj.y);
            ctx.lineTo(q.p10.proj.x, q.p10.proj.y);
            ctx.lineTo(q.p11.proj.x, q.p11.proj.y);
            ctx.lineTo(q.p01.proj.x, q.p01.proj.y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
    }

    renderHeightmap() {
        const ctx = this.ctx;
        const gridSize = 50;
        const grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));

        for (const p of this.points) {
            const gx = Math.floor((p.x / 15) * (gridSize - 1));
            const gy = Math.floor((p.y / 15) * (gridSize - 1));
            if (gx >= 0 && gx < gridSize && gy >= 0 && gy < gridSize) {
                if (!grid[gx][gy] || p.originalZ > grid[gx][gy].originalZ) {
                    grid[gx][gy] = p;
                }
            }
        }

        for (let i = 0; i < gridSize - 1; i++) {
            for (let j = 0; j < gridSize - 1; j++) {
                const p00 = grid[i][j], p10 = grid[i + 1][j];
                const p01 = grid[i][j + 1], p11 = grid[i + 1][j + 1];
                if (p00 && p10 && p01 && p11) {
                    const proj00 = this.project3D(p00.x, p00.y, p00.z);
                    const proj10 = this.project3D(p10.x, p10.y, p10.z);
                    const proj01 = this.project3D(p01.x, p01.y, p01.z);
                    const proj11 = this.project3D(p11.x, p11.y, p11.z);

                    const avgElev = (p00.originalZ + p10.originalZ + p01.originalZ + p11.originalZ) / 4;
                    ctx.fillStyle = this.getElevationColor(avgElev, 'ground');
                    ctx.beginPath();
                    ctx.moveTo(proj00.x, proj00.y);
                    ctx.lineTo(proj10.x, proj10.y);
                    ctx.lineTo(proj11.x, proj11.y);
                    ctx.lineTo(proj01.x, proj01.y);
                    ctx.closePath();
                    ctx.fill();
                }
            }
        }
    }

    renderGrid() {
        const ctx = this.ctx;
        const bounds = this.dataset.metadata.bounds;
        const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();

        ctx.strokeStyle = textColor;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.25;

        for (let x = bounds.x_min; x <= bounds.x_max; x += 1) {
            const p1 = this.project3D(x, bounds.y_min, 0);
            const p2 = this.project3D(x, bounds.y_max, 0);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }

        for (let y = bounds.y_min; y <= bounds.y_max; y += 1) {
            const p1 = this.project3D(bounds.x_min, y, 0);
            const p2 = this.project3D(bounds.x_max, y, 0);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
        ctx.fillStyle = textColor;
        ctx.font = '11px -apple-system, sans-serif';
        const labelPos = this.project3D(bounds.x_max + 0.5, bounds.y_min, 0);
        ctx.fillText('15m × 15m', labelPos.x, labelPos.y);
    }

    renderContextLayer() {
        const ctx = this.ctx;
        const bounds = this.dataset.metadata.bounds;
        ctx.globalAlpha = this.contextOpacity;

        if (this.showBasemap) {
            const corners = [
                this.project3D(bounds.x_min, bounds.y_min, 0),
                this.project3D(bounds.x_max, bounds.y_min, 0),
                this.project3D(bounds.x_max, bounds.y_max, 0),
                this.project3D(bounds.x_min, bounds.y_max, 0)
            ];
            ctx.fillStyle = '#E8E4D8';
            ctx.beginPath();
            ctx.moveTo(corners[0].x, corners[0].y);
            corners.forEach(c => ctx.lineTo(c.x, c.y));
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = '#C5C0B0';
            ctx.lineWidth = 1;
            const mid1 = this.project3D(7.5, 0, 0);
            const mid2 = this.project3D(7.5, 15, 0);
            ctx.beginPath();
            ctx.moveTo(mid1.x, mid1.y);
            ctx.lineTo(mid2.x, mid2.y);
            ctx.stroke();
        }

        if (this.showTopography) {
            ctx.strokeStyle = '#8B7355';
            ctx.lineWidth = 1;
            for (let z = 0.5; z <= 3.5; z += 0.5) {
                const contourPoints = this.points.filter(p => Math.abs(p.originalZ - z) < 0.1);
                if (contourPoints.length > 10) {
                    ctx.beginPath();
                    let started = false;
                    for (const cp of contourPoints) {
                        const proj = this.project3D(cp.x, cp.y, 0);
                        if (!started) { ctx.moveTo(proj.x, proj.y); started = true; }
                        else ctx.lineTo(proj.x, proj.y);
                    }
                    ctx.stroke();
                }
            }
        }

        ctx.globalAlpha = 1;
    }

    updateHover(mx, my) {
        if (!this.projectedPoints.length) return;

        let closest = null;
        let minDist = 15;

        for (const p of this.projectedPoints) {
            const dx = p.proj.x - mx;
            const dy = p.proj.y - my;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) {
                minDist = dist;
                closest = p;
            }
        }

        if (closest !== this.hoveredPoint) {
            this.hoveredPoint = closest;
            if (this.onHoverChange) this.onHoverChange(closest);
        }
    }

    resetView() {
        this.camera.distance = 30;
        this.camera.rotationX = -0.5;
        this.camera.rotationY = 0.3;
        this.camera.rotationZ = 0;
        this.render();
    }

    fitBounds() {
        if (!this.dataset) return;
        const bounds = this.dataset.metadata.bounds;
        this.camera.centerX = (bounds.x_min + bounds.x_max) / 2;
        this.camera.centerY = (bounds.y_min + bounds.y_max) / 2;
        this.camera.centerZ = ((bounds.z_min + bounds.z_max) / 2) * this.verticalExaggeration;
        this.camera.distance = Math.max(bounds.x_max - bounds.x_min, bounds.y_max - bounds.y_min) * 1.8;
        this.render();
    }
}

window.Viewer3D = Viewer3D;
