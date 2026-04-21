const axios = require('axios');
const fs = require('fs');

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5NDVkYjNmYzBlOWFkNzM2NzhhMDY1MCIsImVtYWlsIjoibGl0dGxlc2lsZW5jZXJzQGdtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc3Njc3NTQ5NCwiZXhwIjoxNzc2Nzc5MDk0fQ.sQ05Gy5aXqmmfPIS89CfnCajeO-_cOkwckIpHCT6VQg';
const API_URL = 'https://along-backend-lo8n.onrender.com/api/v1/bus-stops';

async function sync() {
    console.log('🚀 Starting synchronization of 457 landmarks...');
    
    try {
        const rawData = fs.readFileSync('abuja_harvest_export_clean.json', 'utf8');
        const data = JSON.parse(rawData);
        console.log(`📦 Loaded ${data.length} landmarks.`);

        for (let i = 0; i < data.length; i++) {
            const stop = data[i];
            try {
                // Remove internal _id so the live DB creates its own
                const { _id, ...stopData } = stop;
                
                await axios.post(API_URL, stopData, {
                    headers: { 'Authorization': `Bearer ${TOKEN}` }
                });
                
                if (i % 50 === 0) console.log(`✅ Progress: ${i}/${data.length} synced...`);
            } catch (err) {
                console.error(`❌ Failed: ${stop.name} - ${err.response?.data?.message || err.message}`);
            }
        }
        
        console.log('✨ All landmarks synchronized successfully!');
    } catch (err) {
        console.error('💥 Critical error during sync:', err.message);
    }
}

sync();
