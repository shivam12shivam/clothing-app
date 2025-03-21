// server.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const port = 5000;

// --- MongoDB Connection ---
// Replace <connection_string> with your MongoDB connection string
mongoose.connect('<connection_string>', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// --- Define a Clothing Schema (example) ---
const clothingSchema = new mongoose.Schema({
  name: String,
  imageUrl: String,
  description: String,
});
const Clothing = mongoose.model('Clothing', clothingSchema);

// --- Multer Setup ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // ensure this directory exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage: storage });

// --- Routes ---
// Image upload & processing endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
  const filePath = req.file.path;
  
  // TODO: Integrate image processing logic (e.g., landmark detection, background removal)
  // For now, simply return the file path
  res.json({ filePath, message: "Image uploaded successfully" });
});

// Endpoint to get a clothing item by id (from MongoDB)
app.get('/api/clothes/:id', async (req, res) => {
  try {
    const item = await Clothing.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Clothing item not found" });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => console.log(`Server started on port ${port}`));


  const initThree = (imagePath) => {
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    renderer.setSize(window.innerWidth * 0.8, window.innerHeight * 0.6);

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
    camera.position.z = 5;

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(imagePath, (texture) => {
      // User image as background
      const geometry = new THREE.PlaneGeometry(5, 5);
      const material = new THREE.MeshBasicMaterial({ map: texture });
      const userPlane = new THREE.Mesh(geometry, material);
      scene.add(userPlane);

      // Simulated clothing overlay
      const clothingGeometry = new THREE.PlaneGeometry(3.5, 4);
      const clothingMaterial = new THREE.MeshBasicMaterial({
        color: "#ff0000",
        opacity: 0.7,
        transparent: true,
      });
      const clothingPlane = new THREE.Mesh(clothingGeometry, clothingMaterial);
      clothingPlane.position.set(0, 0, 0.2);
      scene.add(clothingPlane);

      const animate = () => {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
      };
      animate();
    });
  };