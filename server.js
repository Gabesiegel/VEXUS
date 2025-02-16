/****************************************************************
 * server.js
 * - /refresh-token returns JSON (no HTML)
 * - CORS enabled so you can call from any domain
 * - Serves static files (including calculator.html)
 ****************************************************************/
const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleAuth } = require('google-auth-library');

const app = express();

// 1) Enable CORS for all routes
app.use(cors());

// 2) Parse JSON bodies
app.use(express.json());

// 3) /refresh-token route
app.post('/refresh-token', async (req, res) => {
  try {
    // Your service account key
    const auth = new GoogleAuth({
      keyFilename: path.join(__dirname, 'credentials', 'key.json'),
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    // Get token
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    if (!tokenResponse.token) {
      return res.status(500).json({ error: 'No token returned from GoogleAuth' });
    }

    // Return JSON
    res.json({
      access_token: tokenResponse.token,
      expires_in: 3600
    });

  } catch (err) {
    console.error('Error in /refresh-token:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4) Serve static files, e.g. your calculator.html
app.use(express.static(__dirname));

// 5) Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
