// Synthetic Photogrammetry Dataset Generator
// Run with: node generate-dataset.js

const fs = require('fs');

// Load the base JSON
const dataset = require('./rolling-hill-melbourne.json');

// Random number generator with seed for reproducibility
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

    gaussian(mean = 0, std = 1) {
        // Box-Muller transform
        const u1 = this.next();
        const u2 = this.next();
        const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        return mean + z0 * std;
    }
}

const rng = new Random(12345);

// Generate base terrain (rolling hill)
function generateTerrain(pointCount = 7000) {
    const points = [];
    const gridSize = Math.sqrt(pointCount);
    const step = 15.0 / gridSize;

    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            // Base position with slight randomness
            const x = i * step + rng.range(-step * 0.3, step * 0.3);
            const y = j * step + rng.range(-step * 0.3, step * 0.3);

            // Clamp to bounds
            const xClamped = Math.max(0, Math.min(15, x));
            const yClamped = Math.max(0, Math.min(15, y));

            // Create rolling hill terrain using sine waves
            const wave1 = Math.sin((xClamped / 15.0) * Math.PI * 2) * 0.8;
            const wave2 = Math.cos((yClamped / 15.0) * Math.PI * 1.5) * 0.6;
            const wave3 = Math.sin(((xClamped + yClamped) / 30.0) * Math.PI * 3) * 0.4;

            // Combine waves for natural terrain
            let z = 0.5 + wave1 + wave2 + wave3;

            // Add some noise for natural variation
            z += rng.gaussian(0, 0.05);

            // Ensure positive elevation
            z = Math.max(0, z);

            // Elevation-based color (will be used for coloring)
            const elevation = z;

            points.push({
                x: parseFloat(xClamped.toFixed(3)),
                y: parseFloat(yClamped.toFixed(3)),
                z: parseFloat(z.toFixed(3)),
                elevation: parseFloat(elevation.toFixed(3)),
                classification: 'ground'
            });
        }
    }

    return points;
}

// Generate tree (elevated point cluster)
function generateTree(centerX, centerY, baseZ, pointCount = 800) {
    const points = [];
    const trunkHeight = rng.range(1.8, 2.5);
    const canopyRadius = rng.range(1.2, 1.8);

    for (let i = 0; i < pointCount; i++) {
        // Random position within tree canopy (spherical distribution)
        const theta = rng.range(0, Math.PI * 2);
        const phi = rng.range(0, Math.PI);
        const r = rng.range(0, canopyRadius) * Math.pow(rng.next(), 0.3); // Bias toward center

        const x = centerX + r * Math.sin(phi) * Math.cos(theta);
        const y = centerY + r * Math.sin(phi) * Math.sin(theta);
        const z = baseZ + trunkHeight + r * Math.cos(phi) * 0.8;

        // Only add points within bounds
        if (x >= 0 && x <= 15 && y >= 0 && y <= 15 && z >= 0) {
            points.push({
                x: parseFloat(x.toFixed(3)),
                y: parseFloat(y.toFixed(3)),
                z: parseFloat(z.toFixed(3)),
                elevation: parseFloat((z - baseZ).toFixed(3)),
                classification: 'vegetation'
            });
        }
    }

    // Add trunk points
    const trunkPoints = 50;
    for (let i = 0; i < trunkPoints; i++) {
        const height = rng.range(0, trunkHeight);
        const angle = rng.range(0, Math.PI * 2);
        const radius = rng.range(0, 0.15);

        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        const z = baseZ + height;

        if (x >= 0 && x <= 15 && y >= 0 && y <= 15) {
            points.push({
                x: parseFloat(x.toFixed(3)),
                y: parseFloat(y.toFixed(3)),
                z: parseFloat(z.toFixed(3)),
                elevation: parseFloat((z - baseZ).toFixed(3)),
                classification: 'vegetation'
            });
        }
    }

    return points;
}

// Generate rock cluster
function generateRock(centerX, centerY, baseZ, pointCount = 150) {
    const points = [];
    const rockSize = rng.range(0.4, 0.8);
    const rockHeight = rng.range(0.3, 0.6);

    for (let i = 0; i < pointCount; i++) {
        // Random position within rock (ellipsoid)
        const theta = rng.range(0, Math.PI * 2);
        const phi = rng.range(0, Math.PI);
        const r = rng.range(0, 1) * Math.pow(rng.next(), 0.5);

        const x = centerX + r * rockSize * Math.sin(phi) * Math.cos(theta);
        const y = centerY + r * rockSize * Math.sin(phi) * Math.sin(theta);
        const z = baseZ + r * rockHeight * Math.abs(Math.cos(phi));

        // Only add points within bounds
        if (x >= 0 && x <= 15 && y >= 0 && y <= 15 && z >= baseZ) {
            points.push({
                x: parseFloat(x.toFixed(3)),
                y: parseFloat(y.toFixed(3)),
                z: parseFloat(z.toFixed(3)),
                elevation: parseFloat((z - baseZ).toFixed(3)),
                classification: 'rock'
            });
        }
    }

    return points;
}

// Generate complete dataset
console.log('Generating synthetic photogrammetry dataset...');

let allPoints = [];

// Generate base terrain
console.log('- Generating terrain (7000 points)...');
allPoints = allPoints.concat(generateTerrain(7000));

// Generate trees at strategic locations
console.log('- Generating trees (3 specimens)...');
const treeLocations = [
    { x: 4.0, y: 8.0 },
    { x: 11.0, y: 5.0 },
    { x: 8.0, y: 12.0 }
];

treeLocations.forEach((loc, idx) => {
    // Find base elevation at tree location
    const nearbyPoints = allPoints.filter(p =>
        Math.abs(p.x - loc.x) < 0.5 && Math.abs(p.y - loc.y) < 0.5
    );
    const baseZ = nearbyPoints.length > 0
        ? nearbyPoints.reduce((sum, p) => sum + p.z, 0) / nearbyPoints.length
        : 1.0;

    console.log(`  Tree ${idx + 1} at (${loc.x}, ${loc.y}) base elevation ${baseZ.toFixed(2)}m`);
    allPoints = allPoints.concat(generateTree(loc.x, loc.y, baseZ, 800));
});

// Generate rocks
console.log('- Generating rocks (5 features)...');
const rockLocations = [
    { x: 2.5, y: 3.0 },
    { x: 6.5, y: 6.5 },
    { x: 13.0, y: 9.0 },
    { x: 3.0, y: 13.5 },
    { x: 12.0, y: 2.0 }
];

rockLocations.forEach((loc, idx) => {
    const nearbyPoints = allPoints.filter(p =>
        Math.abs(p.x - loc.x) < 0.5 && Math.abs(p.y - loc.y) < 0.5
    );
    const baseZ = nearbyPoints.length > 0
        ? nearbyPoints.reduce((sum, p) => sum + p.z, 0) / nearbyPoints.length
        : 0.5;

    allPoints = allPoints.concat(generateRock(loc.x, loc.y, baseZ, 120));
});

// Update bounds based on actual data
const xValues = allPoints.map(p => p.x);
const yValues = allPoints.map(p => p.y);
const zValues = allPoints.map(p => p.z);

dataset.metadata.bounds.z_max = parseFloat(Math.max(...zValues).toFixed(3));
dataset.metadata.processing.point_count_decimated = allPoints.length;

// Add points to dataset
dataset.points = allPoints;

// Save dataset
console.log(`\nGenerated ${allPoints.length} points`);
console.log(`Elevation range: ${dataset.metadata.bounds.z_min}m to ${dataset.metadata.bounds.z_max}m`);
console.log('Saving dataset...');

fs.writeFileSync(
    './rolling-hill-melbourne.json',
    JSON.stringify(dataset, null, 2)
);

console.log('✓ Dataset saved to rolling-hill-melbourne.json');
console.log(`✓ File size: ${(fs.statSync('./rolling-hill-melbourne.json').size / 1024).toFixed(1)} KB`);
