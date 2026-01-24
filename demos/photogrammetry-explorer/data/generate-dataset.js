// Synthetic Photogrammetry Dataset Generator
// Run with: node generate-dataset.js
// Generates an optimized, lightweight dataset for fast web loading

const fs = require('fs');

class Random {
    constructor(seed = 42) {
        this.seed = seed;
    }
    next() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }
    range(min, max) {
        return min + this.next() * (max - min);
    }
}

const rng = new Random(12345);

function generateDataset() {
    const points = [];
    const gridSize = 50;
    const spacing = 15 / gridSize;

    function noise(x, y, seed) {
        const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
        return n - Math.floor(n);
    }

    function getTerrainHeight(x, y) {
        const hillX = (x - 7.5) / 6;
        const hillY = (y - 7.5) / 6;
        const mainHill = 2.0 * Math.exp(-(hillX * hillX + hillY * hillY));
        const n1 = noise(x * 0.5, y * 0.5, 1) * 0.5;
        const n2 = noise(x * 1.2, y * 1.2, 2) * 0.2;
        return mainHill + n1 + n2;
    }

    const trees = [
        { x: 3.2, y: 4.5, r: 1.2 },
        { x: 11.5, y: 3.8, r: 1.0 },
        { x: 9.0, y: 11.2, r: 1.4 }
    ];
    const rocks = [
        { x: 5.5, y: 8.0, r: 0.8 },
        { x: 12.0, y: 7.5, r: 0.6 }
    ];

    function classifyPoint(x, y) {
        for (const t of trees) {
            if (Math.sqrt(Math.pow(x - t.x, 2) + Math.pow(y - t.y, 2)) < t.r) return 'vegetation';
        }
        for (const r of rocks) {
            if (Math.sqrt(Math.pow(x - r.x, 2) + Math.pow(y - r.y, 2)) < r.r) return 'rock';
        }
        return 'ground';
    }

    for (let i = 0; i <= gridSize; i++) {
        for (let j = 0; j <= gridSize; j++) {
            let x = i * spacing + (rng.next() - 0.5) * spacing * 0.3;
            let y = j * spacing + (rng.next() - 0.5) * spacing * 0.3;
            x = Math.max(0, Math.min(15, x));
            y = Math.max(0, Math.min(15, y));

            let z = getTerrainHeight(x, y);
            const cls = classifyPoint(x, y);

            if (cls === 'vegetation') z += 0.8 + rng.next() * 1.5;
            if (cls === 'rock') z += 0.1 + rng.next() * 0.3;

            points.push({
                x: Math.round(x * 1000) / 1000,
                y: Math.round(y * 1000) / 1000,
                z: Math.round(z * 1000) / 1000,
                elevation: Math.round(z * 1000) / 1000,
                classification: cls
            });
        }
    }

    let zMin = Infinity, zMax = -Infinity;
    points.forEach(p => {
        if (p.z < zMin) zMin = p.z;
        if (p.z > zMax) zMax = p.z;
    });

    return {
        metadata: {
            name: "Rolling Hill Melbourne (Synthetic)",
            location: {
                name: "Fitzroy Gardens",
                city: "Melbourne CBD",
                state: "Victoria",
                country: "Australia",
                latitude: -37.8136,
                longitude: 144.9791
            },
            capture: {
                date: "2024-03-15",
                method: "DJI Phantom 4 RTK",
                altitude_m: 40,
                overlap_forward: 80,
                overlap_side: 70,
                gsd_cm: 1.2,
                images: 127
            },
            processing: {
                software: "Agisoft Metashape Pro 2.0",
                dense_cloud_quality: "High",
                point_count_original: 2847293,
                point_count_decimated: points.length,
                coordinate_accuracy_cm: 2.5
            },
            coordinate_system: {
                type: "Local",
                origin: "Survey marker SM-001",
                units: "meters",
                vertical_datum: "AHD"
            },
            bounds: {
                x_min: 0, x_max: 15,
                y_min: 0, y_max: 15,
                z_min: Math.round(zMin * 1000) / 1000,
                z_max: Math.round(zMax * 1000) / 1000
            },
            features: {
                terrain: "Rolling hill with gentle slope",
                vegetation: ["Eucalyptus trees", "Native shrubs"],
                objects: ["Rock outcrop", "Garden path"]
            }
        },
        points: points
    };
}

const dataset = generateDataset();
const json = JSON.stringify(dataset);
fs.writeFileSync(__dirname + '/rolling-hill-melbourne.json', json);
console.log(`Generated ${dataset.points.length} points`);
console.log(`File size: ${(json.length / 1024).toFixed(1)} KB`);
