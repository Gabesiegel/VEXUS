# VExUS ATLAS

AI-based image recognition tool designed to assist in Venous Excess Ultrasound Score (VExUS) waveform interpretation. This project provides an interactive calculator for VExUS scoring using AI to classify ultrasound images of hepatic, portal, and renal veins.

## Features

- Automatic classification of ultrasound images for hepatic, portal, and renal veins
- Interactive VExUS score calculator based on vein waveform patterns
- HIPAA compliant image handling with PHI warnings
- Responsive web interface with mobile support
- Real-time feedback on classification confidence

## Setup Instructions

### Prerequisites

- Node.js (v16+)
- NPM
- Google Cloud Platform account with Vertex AI configured

### Installation

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

3. Ensure the Google Cloud credentials are properly set up.

### Running the Server

We've provided a control script to manage the server. You can use it as follows:

```bash
# Start the server
./server_control.sh start

# Check server status
./server_control.sh status

# View logs
./server_control.sh logs

# Stop the server
./server_control.sh stop

# Restart the server
./server_control.sh restart
```

Alternatively, you can run the server directly:

```bash
node server.js
```

### Troubleshooting

If you encounter "Address already in use" errors:

1. Check which process is using port 3003:
```bash
lsof -i:3003
```

2. Kill the process:
```bash
kill -9 $(lsof -t -i:3003)
```

3. Or change the port in `server.js` and try again.

## Technical Details

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js with Express
- AI: Google Vertex AI for image classification
- Image Storage: Google Cloud Storage

## Using the VExUS Calculator

1. Navigate to `http://localhost:3003/calculator.html` in your browser
2. Fill in the IVC measurement (< 2cm or > 2cm)
3. Upload images of hepatic, portal, and renal veins
4. Review the AI classification results
5. Click "Calculate VExUS Score" to get the final score

## HIPAA Compliance

This application is designed with HIPAA compliance in mind:
- PHI warning on image upload
- No patient identifiers stored
- All images are processed securely

## License

MIT 