#!/usr/bin/env node
/**
 * Vertex AI Prediction API Test Script
 * Usage: node test_api.js PROJECT_ID REGION ENDPOINT_ID
 */

const fs = require('fs');
const { exec } = require('child_process');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Configuration
const args = process.argv.slice(2);
if (args.length < 3) {
  console.error('Usage: node test_api.js PROJECT_ID REGION ENDPOINT_ID');
  process.exit(1);
}

const PROJECT_ID = args[0];
const REGION = args[1];
const ENDPOINT_ID = args[2];
const INPUT_FILE = args[3] || 'input.json';

// Function to get access token
function getAccessToken() {
  return new Promise((resolve, reject) => {
    exec('gcloud auth print-access-token', (error, stdout, stderr) => {
      if (error) {
        reject(`Error getting access token: ${error.message}`);
        return;
      }
      if (stderr) {
        reject(`Error getting access token: ${stderr}`);
        return;
      }
      resolve(stdout.trim());
    });
  });
}

// Function to test Vertex AI prediction
async function testPrediction() {
  try {
    // Get access token for authentication
    const accessToken = await getAccessToken();
    
    // Read input data
    const inputData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
    
    console.log(`Making prediction request to endpoint: ${ENDPOINT_ID}`);
    console.log(`Input data: ${JSON.stringify(inputData, null, 2)}`);
    console.log('-'.repeat(50));
    
    // API URL
    const apiUrl = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/endpoints/${ENDPOINT_ID}:predict`;
    
    // Make the API request
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(inputData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Prediction successful!');
    console.log(`Response:\n${JSON.stringify(result, null, 2)}`);
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the test
testPrediction(); 