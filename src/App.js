import React, { useState } from 'react';
import './App.css';

function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

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
            mimeType: file.type,
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
        <p className="subtitle">Project ID: plucky-weaver-450819-k7</p>
        
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
            <h2>Uploaded Image:</h2>
            <img src={selectedImage} alt="Selected" style={{maxWidth: '500px'}} />
          </div>
        )}

        {prediction && (
          <div className="prediction-results">
            <h2>Analysis Results:</h2>
            <pre>{JSON.stringify(prediction, null, 2)}</pre>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
