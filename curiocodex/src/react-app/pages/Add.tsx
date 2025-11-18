/**
 * Add page - Create new hobbies or items.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { apiRequest, parseResponse } from "../utils/api";
import { CATEGORIES } from "../utils/categories";
import "./Add.css";

interface Hobby {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
}

interface Item {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
}

function Add() {
  const [type, setType] = useState<"hobby" | "item">("hobby");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedHobbyId, setSelectedHobbyId] = useState("");
  const [hobbies, setHobbies] = useState<Hobby[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [manualCategory, setManualCategory] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();

  const fetchHobbies = useCallback(async () => {
    try {
      const response = await apiRequest("/api/hobbies", { method: "GET" }, token);
      const data = await parseResponse<{ hobbies: Hobby[] }>(response);
      setHobbies(data.hobbies);
      setSelectedHobbyId((prev) => {
        // Only set if we don't have a selection yet and there are hobbies available
        if (!prev && data.hobbies.length > 0) {
          return data.hobbies[0].id;
        }
        return prev;
      });
    } catch (err) {
      console.error("Error fetching hobbies:", err);
      setError("Failed to load hobbies");
    }
  }, [token]);

  // Fetch hobbies when component mounts and when type changes to "item"
  useEffect(() => {
    if (isAuthenticated && type === "item") {
      fetchHobbies();
    }
  }, [type, isAuthenticated, fetchHobbies]);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Handle video element when camera is shown
  useEffect(() => {
    if (showCamera && cameraStream && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = cameraStream;
      video.play().catch(err => {
        console.error("Error playing video:", err);
      });
    }
  }, [showCamera, cameraStream]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError("Image size must be less than 10MB");
        return;
      }

      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    // Stop camera if it's running
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const handleStartCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      setCameraStream(stream);
      setShowCamera(true);
    } catch (error) {
      console.error("Error accessing camera:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('permission')) {
        setError("Camera permission denied. Please allow camera access in your browser settings.");
      } else if (errorMessage.includes('not found')) {
        setError("No camera found. Please connect a camera or use file upload instead.");
      } else {
        setError("Unable to access camera. Please check permissions.");
      }
    }
  };

  const handleStopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    
    // Check if video is ready
    if (video.readyState < 2) {
      setError("Camera is not ready yet. Please wait a moment.");
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Flip the image back since we mirrored the video for display
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    
    // Convert canvas to blob, then to File
    canvas.toBlob((blob) => {
      if (!blob) return;
      
      const file = new File([blob], `camera-photo-${Date.now()}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });
      
      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Stop camera
      handleStopCamera();
    }, 'image/jpeg', 0.9);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    // For items, name is required unless an image is provided (AI will generate name)
    if (type === "item" && !name.trim() && !imageFile) {
      setError("Name is required, or upload an image for AI to generate one");
      setLoading(false);
      return;
    }

    if (type === "item" && !selectedHobbyId) {
      setError("Please select a hobby");
      setLoading(false);
      return;
    }

    try {
      if (type === "hobby") {
        // Create hobby
        const requestBody: { name: string; description: string | null; category?: string } = {
          name: name.trim(),
          description: description.trim() || null,
        };
        
        // Include category if manually selected
        if (manualCategory) {
          requestBody.category = manualCategory;
        }

        const response = await apiRequest(
          "/api/hobbies",
          {
            method: "POST",
            body: JSON.stringify(requestBody),
          },
          token
        );

        const data = await parseResponse<{ success: boolean; hobby: Hobby }>(response);
        
        if (data.success) {
          setSuccess(`Hobby "${data.hobby.name}" created successfully!`);
          setName("");
          setDescription("");
          setManualCategory("");
          setShowAdvanced(false);
          setImageFile(null);
          setImagePreview(null);
          setShowCamera(false);
          if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
          }
          // Redirect to hobbies page after 1.5 seconds
          setTimeout(() => {
            navigate("/hobbies");
          }, 1500);
        }
      } else {
        // Create item - use FormData if image is present, otherwise JSON
        let response: Response;
        
        if (imageFile) {
          // Use FormData for image upload
          const formData = new FormData();
          formData.append("name", name.trim());
          if (description.trim()) formData.append("description", description.trim());
          if (manualCategory) formData.append("category", manualCategory);
          formData.append("image", imageFile);

          response = await apiRequest(
            `/api/hobbies/${selectedHobbyId}/items`,
            {
              method: "POST",
              body: formData,
            },
            token
          );
        } else {
          // Use JSON for regular item creation
          const requestBody: { name: string; description: string | null; category?: string } = {
            name: name.trim(),
            description: description.trim() || null,
          };
          
          // Include category if manually selected
          if (manualCategory) {
            requestBody.category = manualCategory;
          }

          response = await apiRequest(
            `/api/hobbies/${selectedHobbyId}/items`,
            {
              method: "POST",
              body: JSON.stringify(requestBody),
            },
            token
          );
        }

        const data = await parseResponse<{ success: boolean; item: Item }>(response);
        
        if (data.success) {
          const hobbyName = hobbies.find(h => h.id === selectedHobbyId)?.name || "hobby";
          setSuccess(`Item "${data.item.name}" added to ${hobbyName} successfully!`);
          setName("");
          setDescription("");
          setManualCategory("");
          setShowAdvanced(false);
          setImageFile(null);
          setImagePreview(null);
          setShowCamera(false);
          if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
          }
          // Redirect to items page after 1.5 seconds
          setTimeout(() => {
            navigate("/items");
          }, 1500);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="page">
        <h1>Add New</h1>
        <div className="page-content">
          <p>Please log in to add hobbies or items.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Add New</h1>
      <div className="page-content">
        <div className="add-form-container">
          <div className="type-selector">
            <button
              type="button"
              className={`type-button ${type === "hobby" ? "active" : ""}`}
              onClick={() => {
                setType("hobby");
                setError("");
                setSuccess("");
              }}
            >
              ✨ Hobby
            </button>
            <button
              type="button"
              className={`type-button ${type === "item" ? "active" : ""}`}
              onClick={() => {
                setType("item");
                setError("");
                setSuccess("");
              }}
            >
              📦 Item
            </button>
          </div>

          <form onSubmit={handleSubmit} className="add-form">
            {type === "item" && (
              <>
                <div className="form-group">
                  <label htmlFor="hobby">Select Hobby *</label>
                  <select
                    id="hobby"
                    value={selectedHobbyId}
                    onChange={(e) => setSelectedHobbyId(e.target.value)}
                    disabled={loading || hobbies.length === 0}
                    required
                    className="form-select"
                  >
                    {hobbies.length === 0 ? (
                      <option value="">No hobbies available. Create a hobby first.</option>
                    ) : (
                      hobbies.map((hobby) => (
                        <option key={hobby.id} value={hobby.id}>
                          {hobby.name}
                        </option>
                      ))
                    )}
                  </select>
                  {hobbies.length === 0 && (
                    <p className="form-hint">
                      You need to create a hobby first before adding items.
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="image">Item Photo</label>
                  <div className="image-input-container">
                    <input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      disabled={loading || !selectedHobbyId || showCamera}
                      className="form-input"
                    />
                    <button
                      type="button"
                      onClick={showCamera ? handleStopCamera : handleStartCamera}
                      disabled={loading || !selectedHobbyId}
                      className="camera-button"
                    >
                      {showCamera ? "📷 Stop Camera" : "📷 Take Photo"}
                    </button>
                  </div>
                  <p className="form-hint">
                    Upload a photo or take one with your camera. AI will automatically suggest a name, description, and category if fields are empty.
                  </p>
                  
                  {showCamera && (
                    <div className="camera-container">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="camera-video"
                        onLoadedMetadata={() => {
                          // Ensure video plays when metadata is loaded
                          if (videoRef.current) {
                            videoRef.current.play().catch(err => {
                              console.error("Error playing video:", err);
                            });
                          }
                        }}
                      />
                      <div className="camera-controls">
                        <button
                          type="button"
                          onClick={handleCapturePhoto}
                          className="capture-button"
                          disabled={loading}
                        >
                          📸 Capture
                        </button>
                        <button
                          type="button"
                          onClick={handleStopCamera}
                          className="cancel-camera-button"
                          disabled={loading}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {imagePreview && !showCamera && (
                    <div className="image-preview-container">
                      <img src={imagePreview} alt="Preview" className="image-preview" />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="remove-image-button"
                        disabled={loading}
                      >
                        ✕ Remove
                      </button>
                    </div>
                  )}
                  {imagePreview && !showCamera && (!name.trim() || !description.trim()) && (
                    <p className="form-hint" style={{ color: "#9370db" }}>
                      💡 Leave name/description empty to let AI generate them from the image
                    </p>
                  )}
                </div>
              </>
            )}

            <div className="form-group">
              <label htmlFor="name">Name {type === "item" && imageFile ? "" : "*"}</label>
              <input
                id="name"
                type="text"
                placeholder={`Enter ${type} name...`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={type === "hobby" || (type === "item" && !imageFile)}
                disabled={loading}
                className="form-input"
              />
              <p className="form-hint">
                {type === "item" && imageFile 
                  ? "Leave empty to let AI generate from the image, or enter manually."
                  : `AI will automatically categorize and tag your ${type} based on the name and description.`}
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                placeholder={`Describe your ${type}...`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                rows={4}
                className="form-textarea"
              />
              <p className="form-hint">
                Optional. A detailed description helps AI generate better tags and categorization.
              </p>
            </div>

            {/* Advanced Options */}
            <div className="advanced-section">
              <button
                type="button"
                className="advanced-toggle"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? "▼" : "▶"} Advanced Options
              </button>
              {showAdvanced && (
                <div className="advanced-content">
                  <div className="form-group">
                    <label htmlFor="category">Category</label>
                    <select
                      id="category"
                      value={manualCategory}
                      onChange={(e) => setManualCategory(e.target.value)}
                      disabled={loading}
                      className="form-select"
                    >
                      <option value="">Auto-categorize with AI</option>
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <p className="form-hint">
                      Select a category manually to override AI categorization. Leave as "Auto-categorize" to let AI decide.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <button type="submit" className="submit-button" disabled={loading || (type === "item" && hobbies.length === 0)}>
              {loading ? (
                <>✨ Creating...</>
              ) : (
                <>✨ Create {type === "hobby" ? "Hobby" : "Item"}</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Add;

