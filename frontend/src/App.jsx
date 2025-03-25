import { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [humanImage, setHumanImage] = useState(null);
  const [clothingImage, setClothingImage] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [uploadingHuman, setUploadingHuman] = useState(false);
  const [uploadingClothing, setUploadingClothing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const validateImage = (file) => {
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Only PNG, JPEG, and WEBP formats allowed');
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return false;
    }
    return true;
  };

  const handleHumanUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !validateImage(file)) return;

    setUploadingHuman(true);
    setError(null);
    const formData = new FormData();
    formData.append('image', file);

    try {
      // Generate preview immediately
      const previewUrl = URL.createObjectURL(file);
      
      // Upload to server
      const res = await axios.post('http://localhost:5000/api/upload-human', formData);
      
      // Set both preview and server URL
      setHumanImage({
        preview: previewUrl,
        serverUrl: res.data.humanUrl
      });

    } catch (error) {
      setError(error.response?.data?.error || 'Human upload failed');
    } finally {
      setUploadingHuman(false);
    }
  };

  // Similar fix for handleClothingUpload
  const handleClothingUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !validateImage(file)) return;

    setUploadingClothing(true);
    setError(null);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const previewUrl = URL.createObjectURL(file);
      const res = await axios.post('http://localhost:5000/api/upload-clothing', formData);
      
      setClothingImage({
        preview: previewUrl,
        serverUrl: res.data.clothingUrl
      });
    } catch (error) {
      setError(error.response?.data?.error || 'Clothing upload failed');
    } finally {
      setUploadingClothing(false);
    }
  };


  const processOutfit = async () => {
    if (!humanImage || !clothingImage) return;

    setProcessing(true);
    setError(null);
    try {
      const res = await axios.post('http://localhost:5000/api/process-outfit', {
        humanUrl: humanImage.serverUrl, // Use the server URL from state
        clothingUrl: clothingImage.serverUrl // Use the server URL from state
      });
      setResultImage(res.data.resultUrl);
      // console.log(res.data.resultUrl);
    } catch (error) {
      setError(error.response?.data?.error || 'Processing failed');
      console.error('Processing error:', error);
    } finally {
      setProcessing(false);
    }
  };


  return (
    <div className="app">
      <h1 className='text-2xl text-black font-bold'> Virtual Try-On</h1>
      {error && <div className="error-banner">{error}</div>}

      <div className="upload-section">
        <div className="upload-card">
          <h3>Upload Human Image</h3>
          <input
            className='bg-fuchsia-800'
            type="file"
            onChange={handleHumanUpload}
            accept="image/png, image/jpeg, image/webp"
            disabled={uploadingHuman}
          />
          {uploadingHuman && <p>Uploading human image...</p>}
          {humanImage && (
            <img
              src={humanImage.preview}
              alt="Human Preview"
              className="preview-image"
            />
          )}
        </div>

        <div className="upload-card">
          <h3>Upload Clothing Image</h3>
          <input
            type="file"
            onChange={handleClothingUpload}
            accept="image/png, image/jpeg, image/webp"
            disabled={uploadingClothing}
          />
          {uploadingClothing && <p>Uploading clothing...</p>}
          {clothingImage && (
            <img
              src={clothingImage.preview}
              alt="Clothing Preview"
              className="preview-image"
            />
          )}
        </div>
      </div>

      <button
        onClick={processOutfit}
        disabled={!humanImage || !clothingImage || processing}
        className="process-button hover:cursor-pointer bg-green-400"
      >
        {processing ? (
          <>
            <span className="spinner"></span>
            Processing...
          </>
        ) : 'Try On Outfit'}
      </button>

      {resultImage && (
        <div className="result-section">
          <h2>Result</h2>
          <img
            src={resultImage}
            alt="Virtual Try-On Result"
            className="result-image"
          />
          <div className="result-actions">
            <button className="download-btn">Download Result</button>
            <button className="reset-btn" onClick={() => {
              setHumanImage(null);
              setClothingImage(null);
              setResultImage(null);
            }}>
              Start Over
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;