const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const { createCanvas, loadImage } = require("canvas");
const { exec } = require("child_process");
const fs = require('fs');
const { PythonShell } = require('python-shell');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log("MongoDB Connected"))
.catch(err => console.error(err));

// app.get("/", (req, res) => res.send("API Running"));

app.use("/uploads", express.static("uploads"));

const clothingSchema = new mongoose.Schema({
    name: String,
    imageUrl: String,
    description: String,
});
const Clothing = mongoose.model('Clothing', clothingSchema);

const clothingTextureSchema = new mongoose.Schema({
    name: String,
    textureUrl: String,
    description: String,
});
const ClothingTexture = mongoose.model("ClothingTexture", clothingTextureSchema)


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    },
});

const upload = multer({ storage: storage });


// Improved upload endpoint for human image
app.post("/api/upload-human", upload.single("image"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    
    try {
        const humanPath = req.file.path;
        res.json({ 
            success: true,
            humanUrl: `/uploads/${path.basename(humanPath)}`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



// Separate endpoint for clothing upload
app.post("/api/upload-clothing", upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }
    
    try {
        const clothingUrl = `/uploads/${req.file.filename}`;
        res.json({ 
            success: true,
            clothingUrl: clothingUrl
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// New endpoint for processing both images
app.post("/api/process-outfit", async (req, res) => {
    const { humanUrl, clothingUrl } = req.body;
    
    if (!humanUrl || !clothingUrl) {
        return res.status(400).json({ error: "Both image URLs are required" });
    }

    try {
        // Convert to absolute paths
        const humanPath = path.join(__dirname, humanUrl);
        const clothingPath = path.join(__dirname, clothingUrl);
        const outputPath = path.join(__dirname, 'uploads', `result_${Date.now()}.png`);

        // Debug log paths
        console.log('Processing with paths:', {
            humanPath,
            clothingPath,
            outputPath
        });

        const command = `python ${path.join(__dirname, 'process_outfit.py')} "${humanPath}" "${clothingPath}" "${outputPath}"`;
        
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Python Error: ${error}`);
                console.error(`STDERR: ${stderr}`);
                return res.status(500).json({ 
                    error: "Image processing failed",
                    details: stderr 
                });
            }
            console.log(`Python Output: ${stdout}`);
            res.json({
                success: true,
                resultUrl: `http://localhost:5000/uploads/${path.basename(outputPath)}`
                
            });
        });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/getClothingTexture', async (req, res) => {
    try {
        const latestClothing = await Clothing.findOne().sort({ _id: -1 });
        if (!latestClothing) return res.status(404).json({ message: "No clothing found" });
        // For user image, we return the processed image URL as full URL
        const fullUrl = `http://localhost:5000/uploads/${latestClothing.imageUrl.split('/').pop()}`;
        res.json({ texturePath: fullUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



app.get("/api/textures", async (req, res) => {
    try {
        const textures = await ClothingTexture.find();
        res.json(textures);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
