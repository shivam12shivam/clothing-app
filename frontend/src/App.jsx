import { useState, useEffect, useRef } from 'react'
import './App.css'
import axios from "axios";
import * as THREE from "three";
import '@tensorflow/tfjs';
import * as posenet from '@tensorflow-models/posenet';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [clothingTexture, setClothingTexture] = useState(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const clothingRef = useRef(null);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleTextureChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  useEffect(() => {
    axios.get('/api/getClothingTexture')
      .then(response => {
        console.log("Fetched texture path:", response.data.texturePath);
        setClothingTexture(response.data.texturePath);
      })
      .catch(error => console.error('Clothing fetch error', error));
  }, []);



  const handleUpload = async () => {
    if (!selectedFile) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("image", selectedFile);

    try {
      const response = await axios.post("http://localhost:5000/api/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const imagePath = response.data.imageUrl;
      console.log("Processed image path from backend:", imagePath);
      // Construct full URL so it can be loaded from backend
      const fullImageUrl = `http://localhost:5000/uploads/${imagePath.split('/').pop()}`;
      console.log(fullImageUrl);
      initThree(fullImageUrl);
    } catch (error) {
      console.error("Upload error", error);
    } finally {
      setLoading(false);
    }
  }

  const handleTextureUpload = async () => {
    if (!selectedFile) return;
    setLoading(true);
    console.log("insdie heandle textureupload");
    const formData = new FormData();
    formData.append("texture", selectedFile);
    formData.append("name", "Cool Jacket"); // Example clothing name
    formData.append("description", "Red stylish jacket"); // Example description

    try {

      const res = await axios.post("http://localhost:5000/api/uploadtexture", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setLoading(false);
      setSelectedFile(null);
      const fullImageUrl = `http://localhost:5000/${res.data.textureUrl.split('/').pop()}`;
      setClothingTexture(fullImageUrl);
      console.log("texture_url: ",res.data.textureUrl);
      console.log("texture_url full image url: ",fullImageUrl);

      // fetchClothingTextures(); // Refresh available clothing textures
    } catch (error) {
      setLoading(false);
      console.error("Texture upload error", error);
    }
  };

  // const fetchClothingTextures = async () => {
  //   try {
  //     const response = await axios.get("/api/clothes");
  //     if (response.data.length > 0) {
  //       setClothingTexture(response.data[0].imageUrl); // Use first texture
  //     }
  //   } catch (error) {
  //     console.error("Error fetching clothing textures", error);
  //   }
  // };

  // useEffect(() => {
  //   fetchClothingTextures();
  // }, []);


  useEffect(() => {
    if (clothingTexture && sceneRef.current) {
      console.log("New clothing texture detected. Updating scene...");
      const textureLoader = new THREE.TextureLoader();

      textureLoader.load(
        clothingTexture,
        (texture) => {
          console.log("inside texture-loader clothing texture loaded:", texture);
          const clothingMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true
          });

          // Remove old clothing if it exists
          if (clothingRef.current) {
            sceneRef.current.remove(clothingRef.current);
          }

          // Create new clothing mesh
          const clothingPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(3.5, 4),
            clothingMaterial
          );
          clothingPlane.position.set(0, 0, 0.2);

          sceneRef.current.add(clothingPlane);
          clothingRef.current = clothingPlane;
        },
        undefined,
        (error) => {
          console.error("Texture loading error for clothing texture:", error);
          setSelectedFile(null);
        }
      );
    }
  }, [clothingTexture]);  // This runs whenever clothingTexture updates

  // Initialize Three.js scene with human image and overlay clothing texture (if available)
  const initThree = async (userImageUrl) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log("Canvas not found inside initThree");
      return;
    }

    console.log("Inside initThree function, loading user image from:", userImageUrl);

    // Set renderer dimensions
    const width = window.innerWidth * 0.8;
    const height = window.innerHeight * 0.6;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(width, height);
    canvas.style.border = "2px solid red"; // Debug border

    // Clear previous scene if exists
    if (sceneRef.current) {
      while (sceneRef.current.children.length > 0) {
        sceneRef.current.remove(sceneRef.current.children[0]);
      }
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 3; // Adjust camera

    const textureLoader = new THREE.TextureLoader();

    // Load the human image texture
    textureLoader.load(
      userImageUrl,
      (texture) => {
        console.log("User texture loaded:", texture);
        const imageAspect = texture.image.width / texture.image.height;

        // Reduce the size of the plane while keeping the aspect ratio
        const baseSize = 5; // Adjust this value to control overall size
        const planeWidth = baseSize;
        const planeHeight = planeWidth / imageAspect;

        const userPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(planeWidth, planeHeight),
          new THREE.MeshBasicMaterial({ map: texture })
        );

        scene.add(userPlane);
      },
      undefined,
      (error) => {
        console.error("Texture loading error for user image:", error);
      }
    );


    // Animation loop to render the scene
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    setLoading(false);
    console.log("initThree function ended");
  };


  // Pose Estimation to Adjust Clothing Position
  // const estimatePose = async (canvas) => {
  //   const net = await posenet.load();
  //   const video = document.createElement('video');
  //   video.srcObject = await navigator.mediaDevices.getUserMedia({ video: true });
  //   video.play();

  //   video.onloadeddata = async () => {
  //     const pose = await net.estimateSinglePose(video, { flipHorizontal: false });
  //     const nose = pose.keypoints.find(p => p.part === 'nose');
  //     if (clothingRef.current && nose) {
  //       clothingRef.current.position.y = nose.position.y / 100 - 2;
  //     }
  //   };
  // };


  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
        <h1 className="text-3xl font-bold mb-6 text-center">Virtual Try-On Clothing App</h1>
        {loading && <p className="text-red-500 font-semibold mt-2">Loading...</p>}
        <div className="flex flex-col items-center gap-4">
          {/* Human Image Upload */}
          <input
            type="file"
            className="file:border file:border-gray-300 file:bg-gray-800 file:text-white file:rounded-lg px-4 py-2"
            onChange={handleFileChange}
          />
          <button
            onClick={handleUpload}
            className="bg-blue-600 hover:cursor-pointer hover:bg-blue-500 text-white font-semibold py-2 px-6 rounded-lg transition disabled:bg-gray-600"
            disabled={!selectedFile || loading}
          >
            {loading ? "Processing..." : "Upload and Try On"}
          </button>
        </div>

        <div>
          {/* Clothing Texture Upload */}
          <h2 className="mt-6 text-xl font-semibold">Upload Clothing Texture</h2>
          <input type="file" onChange={handleTextureChange} className="mt-2 p-2 border rounded" />
          <button onClick={handleTextureUpload} className="ml-2 bg-green-500 hover:cursor-pointer text-white p-2 rounded">
            {loading ? "Uploading..." : "Upload Clothing"}
          </button>
        </div>

        <canvas ref={canvasRef} className="mt-6 border-2 border-gray-400 rounded-lg shadow-lg"></canvas>
      </div>
    </>
  )
}

export default App
