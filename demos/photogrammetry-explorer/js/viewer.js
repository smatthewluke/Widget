// Photogrammetry 3D Viewer Engine

class Viewer3D {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Dataset
        this.dataset = null;
        this.points = [];
        this.triangles = [];

        // View settings
        this.viewMode = 'points'; // points, mesh, heightmap
        this.showGrid = true;
        this.colorByElevation = true;
        this.colormapType = 'linear'; // linear, quantile, zeroed, stddev
        this.verticalExaggeration = 2.0;
        this.showFullMetadata = false;

        // Context layers
        this.showBasemap = false;
        this.showTopography = false;
        this.contextOpacity = 0.5;
        this.contextLayer = 'overlay'; // overlay or underlay

        // Camera
        this.camera = {
            distance: 25,
            rotationX: -0.6, // Pitch (rotation around X axis)
            rotationY: 0,    // Yaw (rotation around Y axis)
            rotationZ: 0.3,  // Roll (rotation around Z axis)
            centerX: 7.5,
            centerY: 7.5,
            centerZ: 1.5
        };

        // Mouse interaction
        this.mouse = {
            isDragging: false,
            lastX: 0,
            lastY: 0,
            currentX: 0,
            currentY: 0
        };

        // Hover state
        this.hoveredPoint = null;

        // Color cache for performance
        this.colorCache = {};

        this.initCanvas();
        this.initEventListeners();
    }

    initCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.render();
    }

    initEventListeners() {
        // Mouse events for rotation
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.onMouseUp(e));

        // Wheel for zoom
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e));

        // Touch support for mobile
        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
        this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e));
    }

    // Mouse event handlers
    onMouseDown(e) {
        this.mouse.isDragging = true;
        this.mouse.lastX = e.clientX;
        this.mouse.lastY = e.clientY;
    }

    onMouseMove(e) {
        this.mouse.currentX = e.clientX;
        this.mouse.currentY = e.clientY;

        if (this.mouse.isDragging) {
            const deltaX = e.clientX - this.mouse.lastX;
            const deltaY = e.clientY - this.mouse.lastY;

            // Rotate camera
            this.camera.rotationY += deltaX * 0.005;
            this.camera.rotationX += deltaY * 0.005;

            // Clamp rotation X to prevent flipping
            this.camera.rotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.camera.rotationX));

            this.mouse.lastX = e.clientX;
            this.mouse.lastY = e.clientY;

            this.render();
        } else {
            // Update hover state
            this.updateHover(e.offsetX, e.offsetY);
        }
    }

    onMouseUp(e) {
        this.mouse.isDragging = false;
    }

    onWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 1.1 : 0.9;
        this.camera.distance *= delta;
        this.camera.distance = Math.max(10, Math.min(100, this.camera.distance));
        this.render();
    }

    // Touch event handlers
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
            const deltaX = e.touches[0].clientX - this.mouse.lastX;
            const deltaY = e.touches[0].clientY - this.mouse.lastY;

            this.camera.rotationY += deltaX * 0.005;
            this.camera.rotationX += deltaY * 0.005;
            this.camera.rotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.camera.rotationX));

            this.mouse.lastX = e.touches[0].clientX;
            this.mouse.lastY = e.touches[0].clientY;

            this.render();
        }
    }

    onTouchEnd(e) {
        this.mouse.isDragging = false;
    }

    // Load dataset
    async loadDataset(url) {
        try {
            const response = await fetch(url);
            this.dataset = await response.json();
            this.points = this.dataset.points.map(p => ({
                x: p.x,
                y: p.y,
                z: p.z * this.verticalExaggeration,
                originalZ: p.z,
                elevation: p.elevation,
                classification: p.classification
            }));

            // Generate triangulation for mesh mode
            this.generateMesh();

            // Update camera to center on dataset
            const bounds = this.dataset.metadata.bounds;
            this.camera.centerX = (bounds.x_min + bounds.x_max) / 2;
            this.camera.centerY = (bounds.y_min + bounds.y_max) / 2;
            this.camera.centerZ = (bounds.z_min + bounds.z_max) / 2 * this.verticalExaggeration;

            this.render();
            return this.dataset;
        } catch (error) {
            console.error('Failed to load dataset:', error);
            throw error;
        }
    }

    // Generate mesh triangulation (simple grid-based)
    generateMesh() {
        // Create a simple Delaunay-like triangulation
        // For performance, we'll use a grid-based approach
        this.triangles = [];

        // Sort points by x, y for grid-based triangulation
        const gridPoints = {};
        const gridSize = 0.5; // 50cm grid

        this.points.forEach((p, idx) => {
            const gridX = Math.floor(p.x / gridSize);
            const gridY = Math.floor(p.y / gridSize);
            const key = `${gridX},${gridY}`;

            if (!gridPoints[key]) {
                gridPoints[key] = [];
            }
            gridPoints[key].push({ ...p, idx });
        });

        // Create triangles between adjacent grid cells
        Object.keys(gridPoints).forEach(key => {
            const [gx, gy] = key.split(',').map(Number);
            const neighbors = [
                `${gx + 1},${gy}`,
                `${gx},${gy + 1}`,
                `${gx + 1},${gy + 1}`
            ];

            const currentPoints = gridPoints[key];

            neighbors.forEach(nKey => {
                if (gridPoints[nKey]) {
                    const neighborPoints = gridPoints[nKey];

                    // Create triangles between points
                    currentPoints.forEach(p1 => {
                        neighborPoints.forEach(p2 => {
                            // Find third point
                            const third = currentPoints.find(p => p.idx !== p1.idx);
                            if (third) {
                                const dist = Math.sqrt(
                                    Math.pow(p1.x - p2.x, 2) +
                                    Math.pow(p1.y - p2.y, 2)
                                );

                                // Only create triangles for nearby points
                                if (dist < gridSize * 2) {
                                    this.triangles.push([p1, p2, third]);
                                }
                            }
                        });
                    });
                }
            });
        });
    }

    // Update vertical exaggeration
    updateVerticalExaggeration(value) {
        this.verticalExaggeration = value;
        this.points.forEach(p => {
            p.z = p.originalZ * this.verticalExaggeration;
        });
        this.camera.centerZ = (this.dataset.metadata.bounds.z_min + this.dataset.metadata.bounds.z_max) / 2 * this.verticalExaggeration;
        this.generateMesh();
        this.render();
    }

    // 3D Projection
    project3D(x, y, z) {
        // Translate to center
        let px = x - this.camera.centerX;
        let py = y - this.camera.centerY;
        let pz = z - this.camera.centerZ;

        // Apply rotations (Z -> X -> Y order)
        // Rotation around Z axis (roll)
        let cosZ = Math.cos(this.camera.rotationZ);
        let sinZ = Math.sin(this.camera.rotationZ);
        let tx = px * cosZ - py * sinZ;
        let ty = px * sinZ + py * cosZ;
        px = tx;
        py = ty;

        // Rotation around X axis (pitch)
        let cosX = Math.cos(this.camera.rotationX);
        let sinX = Math.sin(this.camera.rotationX);
        ty = py * cosX - pz * sinX;
        let tz = py * sinX + pz * cosX;
        py = ty;
        pz = tz;

        // Rotation around Y axis (yaw)
        let cosY = Math.cos(this.camera.rotationY);
        let sinY = Math.sin(this.camera.rotationY);
        tx = px * cosY + pz * sinY;
        tz = -px * sinY + pz * cosY;
        px = tx;
        pz = tz;

        // Perspective projection
        const scale = 500 / (this.camera.distance + pz);
        const screenX = this.canvas.width / 2 + px * scale;
        const screenY = this.canvas.height / 2 - py * scale;

        return { x: screenX, y: screenY, z: pz, scale };
    }

    // Get color for elevation
    getElevationColor(z, classification) {
        if (!this.colorByElevation) {
            // Default colors by classification
            const classColors = {
                'ground': '#8B7355',
                'vegetation': '#228B22',
                'rock': '#696969'
            };
            return classColors[classification] || '#888888';
        }

        const bounds = this.dataset.metadata.bounds;
        let normalizedZ;

        // Apply colormap type
        switch (this.colormapType) {
            case 'linear':
                normalizedZ = (z - bounds.z_min) / (bounds.z_max - bounds.z_min);
                break;

            case 'quantile':
                // Quantile-based coloring
                const sortedZ = this.points.map(p => p.originalZ).sort((a, b) => a - b);
                const rank = sortedZ.findIndex(val => val >= z);
                normalizedZ = rank / sortedZ.length;
                break;

            case 'zeroed':
                // Center at mean elevation
                const meanZ = this.points.reduce((sum, p) => sum + p.originalZ, 0) / this.points.length;
                const range = Math.max(Math.abs(bounds.z_max - meanZ), Math.abs(bounds.z_min - meanZ));
                normalizedZ = ((z - meanZ) / range + 1) / 2;
                break;

            case 'stddev':
                // Standard deviation anomalies
                const mean = this.points.reduce((sum, p) => sum + p.originalZ, 0) / this.points.length;
                const variance = this.points.reduce((sum, p) => sum + Math.pow(p.originalZ - mean, 2), 0) / this.points.length;
                const stddev = Math.sqrt(variance);
                const anomaly = (z - mean) / stddev;
                normalizedZ = Math.max(0, Math.min(1, (anomaly + 3) / 6)); // Map -3σ to +3σ to 0-1
                break;

            default:
                normalizedZ = (z - bounds.z_min) / (bounds.z_max - bounds.z_min);
        }

        normalizedZ = Math.max(0, Math.min(1, normalizedZ));

        // Color gradient: blue -> green -> yellow -> orange -> red
        if (normalizedZ < 0.25) {
            const t = normalizedZ / 0.25;
            return this.rgbToHex(
                Math.floor(33 + (76 - 33) * t),
                Math.floor(150 + (175 - 150) * t),
                Math.floor(243 + (80 - 243) * t)
            );
        } else if (normalizedZ < 0.5) {
            const t = (normalizedZ - 0.25) / 0.25;
            return this.rgbToHex(
                Math.floor(76 + (255 - 76) * t),
                Math.floor(175 + (235 - 175) * t),
                Math.floor(80 + (59 - 80) * t)
            );
        } else if (normalizedZ < 0.75) {
            const t = (normalizedZ - 0.5) / 0.25;
            return this.rgbToHex(
                Math.floor(255),
                Math.floor(235 + (152 - 235) * t),
                Math.floor(59 + (0 - 59) * t)
            );
        } else {
            const t = (normalizedZ - 0.75) / 0.25;
            return this.rgbToHex(
                Math.floor(255 + (244 - 255) * t),
                Math.floor(152 + (67 - 152) * t),
                Math.floor(0 + (54 - 0) * t)
            );
        }
    }

    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    // Render scene
    render() {
        if (!this.dataset) return;

        // Clear canvas
        this.ctx.fillStyle = getComputedStyle(document.documentElement)
            .getPropertyValue('--canvas-bg').trim();
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw context underlay if enabled
        if (this.contextLayer === 'underlay' && (this.showBasemap || this.showTopography)) {
            this.renderContextLayer();
        }

        // Project all points
        const projectedPoints = this.points.map(p => ({
            ...p,
            projected: this.project3D(p.x, p.y, p.z)
        }));

        // Sort by depth (painter's algorithm)
        projectedPoints.sort((a, b) => b.projected.z - a.projected.z);

        // Render based on view mode
        switch (this.viewMode) {
            case 'points':
                this.renderPoints(projectedPoints);
                break;
            case 'mesh':
                this.renderMesh(projectedPoints);
                break;
            case 'heightmap':
                this.renderHeightmap(projectedPoints);
                break;
        }

        // Draw context overlay if enabled
        if (this.contextLayer === 'overlay' && (this.showBasemap || this.showTopography)) {
            this.renderContextLayer();
        }

        // Draw grid if enabled
        if (this.showGrid) {
            this.renderGrid();
        }
    }

    renderPoints(projectedPoints) {
        projectedPoints.forEach(p => {
            const proj = p.projected;
            if (proj.x < 0 || proj.x > this.canvas.width || proj.y < 0 || proj.y > this.canvas.height) {
                return;
            }

            const color = this.getElevationColor(p.originalZ, p.classification);
            const size = Math.max(1, proj.scale * 2);

            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(proj.x, proj.y, size, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    renderMesh(projectedPoints) {
        // Create point lookup
        const pointLookup = new Map();
        projectedPoints.forEach((p, idx) => {
            pointLookup.set(p, p.projected);
        });

        // Render triangles
        this.triangles.forEach(triangle => {
            const p1 = pointLookup.get(triangle[0]);
            const p2 = pointLookup.get(triangle[1]);
            const p3 = pointLookup.get(triangle[2]);

            if (!p1 || !p2 || !p3) return;

            // Calculate average z for coloring
            const avgZ = (triangle[0].originalZ + triangle[1].originalZ + triangle[2].originalZ) / 3;
            const color = this.getElevationColor(avgZ, triangle[0].classification);

            this.ctx.fillStyle = color;
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 0.5;

            this.ctx.beginPath();
            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(p2.x, p2.y);
            this.ctx.lineTo(p3.x, p3.y);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
        });
    }

    renderHeightmap(projectedPoints) {
        // Create a grid-based heightmap
        const gridSize = 30;
        const grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));

        // Populate grid with points
        projectedPoints.forEach(p => {
            const gx = Math.floor((p.x / 15) * gridSize);
            const gy = Math.floor((p.y / 15) * gridSize);

            if (gx >= 0 && gx < gridSize && gy >= 0 && gy < gridSize) {
                if (!grid[gx][gy] || grid[gx][gy].originalZ < p.originalZ) {
                    grid[gx][gy] = p;
                }
            }
        });

        // Render grid cells
        for (let x = 0; x < gridSize - 1; x++) {
            for (let y = 0; y < gridSize - 1; y++) {
                const p1 = grid[x][y];
                const p2 = grid[x + 1][y];
                const p3 = grid[x][y + 1];
                const p4 = grid[x + 1][y + 1];

                if (p1 && p2 && p3 && p4) {
                    const avgZ = (p1.originalZ + p2.originalZ + p3.originalZ + p4.originalZ) / 4;
                    const color = this.getElevationColor(avgZ, 'ground');

                    const proj1 = this.project3D(p1.x, p1.y, p1.z);
                    const proj2 = this.project3D(p2.x, p2.y, p2.z);
                    const proj3 = this.project3D(p3.x, p3.y, p3.z);
                    const proj4 = this.project3D(p4.x, p4.y, p4.z);

                    this.ctx.fillStyle = color;
                    this.ctx.beginPath();
                    this.ctx.moveTo(proj1.x, proj1.y);
                    this.ctx.lineTo(proj2.x, proj2.y);
                    this.ctx.lineTo(proj4.x, proj4.y);
                    this.ctx.lineTo(proj3.x, proj3.y);
                    this.ctx.closePath();
                    this.ctx.fill();
                }
            }
        }
    }

    renderGrid() {
        const gridSize = 1; // 1 meter grid
        const bounds = this.dataset.metadata.bounds;
        const textColor = getComputedStyle(document.documentElement)
            .getPropertyValue('--text-secondary').trim();

        this.ctx.strokeStyle = textColor;
        this.ctx.lineWidth = 1;
        this.ctx.globalAlpha = 0.3;

        // Draw grid lines
        for (let x = bounds.x_min; x <= bounds.x_max; x += gridSize) {
            const p1 = this.project3D(x, bounds.y_min, 0);
            const p2 = this.project3D(x, bounds.y_max, 0);

            this.ctx.beginPath();
            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(p2.x, p2.y);
            this.ctx.stroke();
        }

        for (let y = bounds.y_min; y <= bounds.y_max; y += gridSize) {
            const p1 = this.project3D(bounds.x_min, y, 0);
            const p2 = this.project3D(bounds.x_max, y, 0);

            this.ctx.beginPath();
            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(p2.x, p2.y);
            this.ctx.stroke();
        }

        this.ctx.globalAlpha = 1.0;

        // Draw scale labels
        this.ctx.fillStyle = textColor;
        this.ctx.font = '10px sans-serif';
        const labelProj = this.project3D(bounds.x_max, bounds.y_min, 0);
        this.ctx.fillText('15m', labelProj.x + 10, labelProj.y);
    }

    renderContextLayer() {
        // Placeholder for basemap/topography rendering
        // In a real implementation, this would load and render tile imagery
        this.ctx.globalAlpha = this.contextOpacity;

        if (this.showBasemap) {
            // Draw a simple basemap placeholder
            const bounds = this.dataset.metadata.bounds;
            const corners = [
                this.project3D(bounds.x_min, bounds.y_min, 0),
                this.project3D(bounds.x_max, bounds.y_min, 0),
                this.project3D(bounds.x_max, bounds.y_max, 0),
                this.project3D(bounds.x_min, bounds.y_max, 0)
            ];

            this.ctx.fillStyle = '#E8E4D8';
            this.ctx.beginPath();
            this.ctx.moveTo(corners[0].x, corners[0].y);
            corners.forEach(c => this.ctx.lineTo(c.x, c.y));
            this.ctx.closePath();
            this.ctx.fill();

            // Add some "street" lines to simulate basemap
            this.ctx.strokeStyle = '#D0CCC0';
            this.ctx.lineWidth = 2;
            const mid1 = this.project3D(7.5, bounds.y_min, 0);
            const mid2 = this.project3D(7.5, bounds.y_max, 0);
            this.ctx.beginPath();
            this.ctx.moveTo(mid1.x, mid1.y);
            this.ctx.lineTo(mid2.x, mid2.y);
            this.ctx.stroke();
        }

        if (this.showTopography) {
            // Draw contour lines as simple topography
            const bounds = this.dataset.metadata.bounds;
            this.ctx.strokeStyle = '#8B7355';
            this.ctx.lineWidth = 1;

            for (let z = bounds.z_min; z <= bounds.z_max; z += 0.5) {
                // Draw simple contour circles
                const centerProj = this.project3D(
                    this.camera.centerX,
                    this.camera.centerY,
                    z * this.verticalExaggeration
                );
                this.ctx.beginPath();
                this.ctx.arc(centerProj.x, centerProj.y, 50 + z * 20, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        }

        this.ctx.globalAlpha = 1.0;
    }

    // Hover detection
    updateHover(mouseX, mouseY) {
        if (!this.dataset) return;

        let closestPoint = null;
        let closestDist = Infinity;

        this.points.forEach(p => {
            const proj = this.project3D(p.x, p.y, p.z);
            const dist = Math.sqrt(
                Math.pow(proj.x - mouseX, 2) +
                Math.pow(proj.y - mouseY, 2)
            );

            if (dist < 10 && dist < closestDist) {
                closestDist = dist;
                closestPoint = p;
            }
        });

        if (closestPoint !== this.hoveredPoint) {
            this.hoveredPoint = closestPoint;
            this.onHoverChange(closestPoint);
        }
    }

    onHoverChange(point) {
        // Override this method to handle hover changes
    }

    // View controls
    resetView() {
        this.camera.distance = 25;
        this.camera.rotationX = -0.6;
        this.camera.rotationY = 0;
        this.camera.rotationZ = 0.3;
        this.render();
    }

    fitBounds() {
        const bounds = this.dataset.metadata.bounds;
        const sizeX = bounds.x_max - bounds.x_min;
        const sizeY = bounds.y_max - bounds.y_min;
        const maxSize = Math.max(sizeX, sizeY);

        this.camera.distance = maxSize * 1.5;
        this.render();
    }
}

// Export for use in app.js
window.Viewer3D = Viewer3D;
