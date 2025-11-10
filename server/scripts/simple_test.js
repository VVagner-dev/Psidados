const fetch = require('node-fetch');

const testEndpoint = async (url) => {
    try {
        console.log(`Testing ${url}...`);
        const response = await fetch(url);
        const data = await response.text();
        console.log('Status:', response.status);
        console.log('Response:', data);
        return true;
    } catch (error) {
        console.error('Error:', error.message);
        return false;
    }
};

// Test the root endpoint
testEndpoint('http://localhost:3001/')
    .then(success => {
        if (!success) {
            console.log('Failed to connect to server. Please ensure the server is running on port 3001.');
        }
    });