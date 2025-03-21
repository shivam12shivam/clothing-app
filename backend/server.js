const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const { createCanvas, loadImage } = require("canvas");
const { exec } = require("child_process");


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



app.post("/api/upload", upload.single("image"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }

    let filePath = req.file.path; // Local storage path
    console.log(filePath);
    try {
        // 1️⃣ Step 1: Face Landmark Detection (Python script using OpenCV)
        const processedPath = `uploads/processed_${Date.now()}.png`;
        console.log(processedPath);
        await new Promise((resolve, reject) => {
            exec(`python process_image.py ${filePath} ${processedPath}`, (err) => {
                if (err) reject(err);
                else resolve();
            });
            console.log("python file executed");
        });

        // 2️⃣ Step 2: (Optional) Background Removal using remove.bg API
        //   const finalPath = `uploads/final_${Date.now()}.png`;

        //   const formData = new FormData();
        //   formData.append("image_file", fs.createReadStream(processedPath));

        //   const removeBgRes = await axios.post("https://api.remove.bg/v1.0/removebg", formData, {
        //     headers: { ...formData.getHeaders(), "X-Api-Key": "<YOUR_REMOVE_BG_API_KEY>" },
        //     responseType: "arraybuffer",
        //   });

        //   fs.writeFileSync(finalPath, removeBgRes.data);

        // 3️⃣ Step 3: Save the processed image in MongoDB
        const newClothing = new Clothing({
            name: req.body.name || "Clothing Item",
            imageUrl: processedPath, // Store final image URL
            description: req.body.description || "Processed Image",
        });

        await newClothing.save();

        res.json({ imageUrl: processedPath, message: "Image processed & saved!", clothing: newClothing });
    } catch (error) {
        console.error("Processing error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});


// 📌 Route 2: Upload Clothing Texture (Separate from Try-On)
app.post("/api/uploadtexture", upload.single("texture"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No texture uploaded" });

    let texturePath = req.file.path;
    console.log("texturepath is working fine",texturePath);

    try {
        // Save texture in MongoDB
        const newTexture = new ClothingTexture({
            name: req.body.name || "Unnamed Texture",
            textureUrl: texturePath,
            description: req.body.description || "Texture file",
        });

        await newTexture.save();

        // Generate Three.js texture data

        const generateTexture = async (imagePath) => {
            try {

                console.log("textrue loaded :", imagePath);

                const canvas = createCanvas(512, 512);
                const ctx = canvas.getContext("2d");
        
                const image = await loadImage(imagePath);
                ctx.drawImage(image, 0, 0, 512, 512);
        
                // Convert canvas to base64 (for frontend rendering)
                const textureDat = canvas.toDataURL();

                console.log("generate texture working fine");
                
                return {

                    texture: textureDat,
                    object: {
                        type: "plane",
                        width: 3.5,
                        height: 4,
                    },
                };
            } catch (error) {
                console.error("Error generating Three.js texture:", error);
                return { error: "Texture generation failed" };
            }
            
        };

        const textureData = await generateTexture(texturePath);

        res.json({
            textureUrl: texturePath,
            message: "Texture uploaded successfully!",
            texture: newTexture,
            sceneData: textureData, // Send scene info
        });
    } catch (error) {
        console.error("Texture upload error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// // Endpoint to get a clothing item by id (from MongoDB)
// app.get('/api/clothes/:id', async (req, res) => {
//     try {
//         const item = await Clothing.findById(req.params.id);
//         if (!item) return res.status(404).json({ message: "Clothing item not found" });
//         res.json(item);
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });

app.get('/api/getClothingTexture', async (req, res) => {
    try {
        const latestClothing = await Clothing.findOne().sort({ _id: -1 }); // Get latest item
        if (!latestClothing) return res.status(404).json({ message: "No clothing found" });
        res.json({ texturePath: latestClothing.textureUrl });
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
