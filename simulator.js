import axios from 'axios';

// Simulated Sensors Configuration
// Focusing on a specific area (e.g., Bangalore or generic city center)
const SENSORS = [
    // Central Business District
    { id: 'S-001', lat: 12.9716, lng: 77.5946, name: 'MG Road Junction', type: 'normal' },
    { id: 'S-002', lat: 12.9780, lng: 77.6000, name: 'Cubbon Park Edge', type: 'normal' },
    // Residential Areas
    { id: 'S-003', lat: 12.9600, lng: 77.5800, name: 'Lalbagh Gate', type: 'normal' },
    { id: 'S-004', lat: 12.9850, lng: 77.6100, name: 'Indiranagar 100ft', type: 'normal' },
    // Construction Zones (High Dust)
    { id: 'S-005', lat: 12.9350, lng: 77.6200, name: 'Koramangala Construction Site', type: 'construction' },
    { id: 'S-006', lat: 12.9250, lng: 77.6100, name: 'Silk Board Metro Works', type: 'construction' },
    { id: 'S-007', lat: 13.0350, lng: 77.5970, name: 'Hebbal Flyover Repair', type: 'construction' },
    // Industrial Area
    { id: 'S-008', lat: 12.9900, lng: 77.4900, name: 'Peenya Industrial Estate', type: 'industrial' },
    
    // NEW SENSORS
    { id: 'S-009', lat: 12.9698, lng: 77.7500, name: 'Whitefield IT Park', type: 'industrial' },
    { id: 'S-010', lat: 12.8399, lng: 77.6770, name: 'Electronic City Phase 1', type: 'industrial' },
    { id: 'S-011', lat: 12.9250, lng: 77.5938, name: 'Jayanagar 4th Block', type: 'normal' },
    { id: 'S-012', lat: 13.0000, lng: 77.5700, name: 'Malleshwaram 18th Cross', type: 'normal' },
    { id: 'S-013', lat: 12.8950, lng: 77.6000, name: 'Bannerghatta Road Metro', type: 'construction' },
    { id: 'S-014', lat: 13.0100, lng: 77.6500, name: 'KR Puram Bridge', type: 'construction' },
    { id: 'S-015', lat: 13.0290, lng: 77.5400, name: 'Yeshwanthpur Market', type: 'industrial' },
    { id: 'S-016', lat: 12.9116, lng: 77.6389, name: 'HSR Layout Sector 2', type: 'normal' },
    { id: 'S-017', lat: 12.9165, lng: 77.6101, name: 'BTM Layout Lake Road', type: 'normal' }
];

const API_URL = 'http://localhost:5000/api/sensors/data';

// Helper to generate random number in range
const random = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

// Track alert cycles for intentional alert changes
let alertCycle = 0;
const alertSensors = ['S-005', 'S-008', 'S-009']; // Sensors that will trigger alerts

// State to track current levels (for "random walk" effect)
const sensorState = {};

// Initialize state
SENSORS.forEach(s => {
    let basePm25 = random(20, 50);
    if (s.type === 'construction') basePm25 = random(150, 250); // Start high for construction
    if (s.type === 'industrial') basePm25 = random(80, 120);

    sensorState[s.id] = {
        pm25: basePm25,
        pm10: Math.floor(basePm25 * 1.8)
    };
});

async function sendData() {
    alertCycle++;
    
    for (const sensor of SENSORS) {
        // 1. Update State (Random Walk)
        let change = random(-5, 5);
        
        // Scenario based on type
        if (sensor.type === 'construction') {
            change = random(-10, 20); // Volatile and trending up
        } else if (sensor.type === 'industrial') {
            change = random(-5, 10);
        }

        let newPm25 = sensorState[sensor.id].pm25 + change;
        
        // Create intentional alert changes every 45 seconds (23 cycles = 46 seconds, closest to 45)
        if (alertCycle % 23 === 0 && alertSensors.includes(sensor.id)) {
            if (alertCycle % 46 === 0) {
                // Every 1.5 minutes: CRITICAL alert (>200)
                newPm25 = random(200, 300);
                console.log(`[${sensor.id}] TRIGGERING CRITICAL ALERT: PM2.5=${newPm25}`);
            } else {
                // Every 45 seconds: WARNING alert (100-200)
                newPm25 = random(120, 180);
                console.log(`[${sensor.id}] TRIGGERING WARNING ALERT: PM2.5=${newPm25}`);
            }
        }
        
        // Clamp values
        if (newPm25 < 10) newPm25 = 10;
        if (newPm25 > 800) newPm25 = 800; // Cap
        
        sensorState[sensor.id].pm25 = newPm25;
        sensorState[sensor.id].pm10 = Math.floor(newPm25 * 1.8);

        // 2. Prepare Payload
        const payload = {
            sensorId: sensor.id,
            pm25: sensorState[sensor.id].pm25,
            pm10: sensorState[sensor.id].pm10,
            lat: sensor.lat,
            lng: sensor.lng,
            type: sensor.type, // Send type
            name: sensor.name
        };

        // 3. Send to Server
        try {
            await axios.post(API_URL, payload);
            console.log(`[${sensor.id}] Sent: PM2.5=${payload.pm25}`);
        } catch (err) {
            console.error(`Error sending data for ${sensor.id}:`, err.message);
        }
    }
}

// Run every 2 seconds
console.log("Starting IoT Simulation...");
setInterval(sendData, 2000);
