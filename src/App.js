import React, { useState } from 'react';
import './App.css';

// Configuration
const CONFIG = {
    projectId: 'plucky-weaver-450819-k7',
    modelId: '1401033999995895808',
    lastUpdated: '2025-02-18 01:15:02',
    developer: 'Gabesiegel'
};

function App() {
    const [selectedImage, setSelectedImage] = useState(null);
    const [prediction, setPrediction] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleImageUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // PHI Warning
        if (!window.confirm("Please confirm that the image does NOT contain any Protected Health Information (PHI).")) {
            return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = reader.result.split(',')[1];
            setSelectedImage(reader.result);
            setLoading(true);
            setError(null);

            try {
                const response = await fetch('/predict', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        content: base64String,
                        mimeType: file.type
                    }),
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
                setPrediction(result);
            } catch (error) {
                console.error('Error:', error);
                setError('Error processing image: ' + error.message);
            } finally {
                setLoading(false);
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="App">
            <header className="App-header">
                <h1>VExUS ATLAS - AI Image Recognition & Scoring</h1>
                <div className="project-info">
                    <p>Project ID: {CONFIG.projectId}</p>
                    <p>Model ID: {CONFIG.modelId}</p>
                </div>

                <div className="upload-section">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="file-input"
                    />
                    {loading && <p className="loading">Processing image...</p>}
                    {error && <p className="error">{error}</p>}
                </div>

                {selectedImage && (
                    <div className="image-preview">
                        <img src={selectedImage} alt="Selected" style={{maxWidth: '500px'}} />
                    </div>
                )}

                {prediction && (
                    <div className="prediction-results">
                        <pre>{JSON.stringify(prediction, null, 2)}</pre>
                    </div>
                )}

                <div className="version-info">
                    <p>Last Updated: {CONFIG.lastUpdated}</p>
                    <p>Developer: {CONFIG.developer}</p>
                </div>
            </header>
        </div>
    );
}

export default App;
