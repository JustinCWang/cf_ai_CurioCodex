/**
 * AddItem page - Create new items (single or bulk) within an existing hobby.
 * Includes optional image capture/upload and AI-assisted metadata.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { apiRequest, parseResponse } from "../utils/api";
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

interface BulkDraftItem {
  id: string;
  name: string;
  description: string;
  category: string;
}

function AddItem() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedHobbyId, setSelectedHobbyId] = useState("");
  const [hobbies, setHobbies] = useState<Hobby[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [manualCategory, setManualCategory] = useState<string>("");
  const [itemCategories, setItemCategories] = useState<string[]>([]);
  const [hobbyCategory, setHobbyCategory] = useState<string | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Bulk item import state
  const [itemMode, setItemMode] = useState<"single" | "bulk">("single");
  const [bulkSource, setBulkSource] = useState<"csv" | "text">("csv");
  const [bulkText, setBulkText] = useState("");
  const [bulkNameDescDelimiter, setBulkNameDescDelimiter] =
    useState<string>("-");
  const [bulkItems, setBulkItems] = useState<BulkDraftItem[]>([]);
  const [csvIncludeFirstRow, setCsvIncludeFirstRow] = useState(false);

  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();

  /**
   * Fetch all hobbies so the user can choose which collection to add
   * the new item(s) to.
   */
  const fetchHobbies = useCallback(async () => {
    try {
      const response = await apiRequest("/api/hobbies", { method: "GET" }, token);
      const data = await parseResponse<{ hobbies: Hobby[] }>(response);
      setHobbies(data.hobbies);
      setSelectedHobbyId((prev) => {
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

  /**
   * Fetch per-hobby item categories so the item category input can
   * offer suggestions for the selected hobby.
   */
  const fetchItemCategoriesForHobby = useCallback(
    async (hobbyId: string) => {
      if (!hobbyId) {
        setItemCategories([]);
        setHobbyCategory(null);
        return;
      }

      try {
        const response = await apiRequest(
          `/api/hobbies/${hobbyId}/item-categories`,
          { method: "GET" },
          token
        );
        const data = await parseResponse<{
          hobbyCategory: string | null;
          itemCategories: string[];
        }>(response);
        setHobbyCategory(data.hobbyCategory);
        setItemCategories(data.itemCategories);
      } catch (err) {
        console.error("Error fetching item categories for hobby:", err);
        setHobbyCategory(null);
        setItemCategories([]);
      }
    },
    [token]
  );

  // Fetch hobbies on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchHobbies();
    }
  }, [isAuthenticated, fetchHobbies]);

  // Refresh per-hobby item categories when the selection changes
  useEffect(() => {
    if (isAuthenticated && selectedHobbyId) {
      fetchItemCategoriesForHobby(selectedHobbyId);
    } else {
      setItemCategories([]);
      setHobbyCategory(null);
    }
  }, [isAuthenticated, selectedHobbyId, fetchItemCategoriesForHobby]);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  // Handle video element when camera is shown
  useEffect(() => {
    if (showCamera && cameraStream && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = cameraStream;
      video
        .play()
        .catch((err) => {
          console.error("Error playing video:", err);
        });
    }
  }, [showCamera, cameraStream]);

  /**
   * Handle file input changes for item images, validating type/size and
   * generating a local preview for the UI.
   */
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError("Image size must be less than 10MB");
        return;
      }

      setImageFile(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * Clear the currently selected/previewed image and shut down any active
   * camera stream to free resources.
   */
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  /**
   * Start the device camera (when available and over HTTPS) so the user can
   * capture a photo directly into a new item.
   */
  const handleStartCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError(
        "Camera API not supported in this browser. Please use file upload instead."
      );
      return;
    }

    const isSecure =
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    if (!isSecure) {
      setError("Camera access requires HTTPS. Please use file upload instead.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      setCameraStream(stream);
      setShowCamera(true);
      setError("");
    } catch (error) {
      console.error("Error accessing camera:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : "";

      if (
        errorName === "NotAllowedError" ||
        errorMessage.includes("permission") ||
        errorMessage.includes("denied")
      ) {
        setError(
          "Camera permission denied. Please allow camera access in your browser settings and try again."
        );
      } else if (
        errorName === "NotFoundError" ||
        errorMessage.includes("not found") ||
        errorMessage.includes("no device")
      ) {
        setError(
          "No camera found. Please connect a camera or use file upload instead."
        );
      } else if (
        errorName === "NotReadableError" ||
        errorMessage.includes("not readable")
      ) {
        setError(
          "Camera is already in use by another application. Please close other apps using the camera."
        );
      } else if (errorName === "OverconstrainedError") {
        setError(
          "Camera doesn't support the requested settings. Trying with default settings..."
        );
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          setCameraStream(fallbackStream);
          setShowCamera(true);
          setError("");
          return;
        } catch {
          setError("Unable to access camera. Please use file upload instead.");
        }
      } else {
        setError(
          `Unable to access camera: ${errorMessage}. Please use file upload instead.`
        );
      }
    }
  };

  /**
   * Stop any active camera stream and hide the camera UI.
   */
  const handleStopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  /**
   * Capture a still frame from the camera video element, convert it into a
   * File object, and use it as the pending item image (with preview).
   */
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    if (video.readyState < 2) {
      setError("Camera is not ready yet. Please wait a moment.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        const file = new File([blob], `camera-photo-${Date.now()}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });

        setImageFile(file);

        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        handleStopCamera();
      },
      "image/jpeg",
      0.9
    );
  };

  /**
   * Main submit handler for the AddItem page.
   * - In "single" mode, creates one item (with optional image upload).
   * - In "bulk" mode, creates many items from CSV or text input.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!selectedHobbyId) {
      setError("Please select a hobby");
      setLoading(false);
      return;
    }

    try {
      if (itemMode === "single") {
        if (!name.trim() && !imageFile) {
          setError(
            "Name is required, or upload an image for AI to generate one"
          );
          setLoading(false);
          return;
        }

        let response: Response;

        if (imageFile) {
          const formData = new FormData();
          formData.append("name", name.trim());
          if (description.trim()) {
            formData.append("description", description.trim());
          }
          if (manualCategory) {
            formData.append("category", manualCategory);
          }
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
          const requestBody: {
            name: string;
            description: string | null;
            category?: string;
          } = {
            name: name.trim(),
            description: description.trim() || null,
          };

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

        const data = await parseResponse<{ success: boolean; item: Item }>(
          response
        );

        if (data.success) {
          const hobbyName =
            hobbies.find((h) => h.id === selectedHobbyId)?.name || "hobby";
          setSuccess(
            `Item "${data.item.name}" added to ${hobbyName} successfully!`
          );
          setName("");
          setDescription("");
          setManualCategory("");
          setShowAdvanced(false);
          setImageFile(null);
          setImagePreview(null);
          setShowCamera(false);
          if (cameraStream) {
            cameraStream.getTracks().forEach((track) => track.stop());
            setCameraStream(null);
          }
          setTimeout(() => {
            navigate("/items");
          }, 1200);
        }
      } else {
        if (bulkItems.length === 0) {
          setError(
            "No items to import. Paste text or upload a CSV and parse it first."
          );
          setLoading(false);
          return;
        }

        const payload = {
          items: bulkItems
            .map((it) => {
              const cleanName = (it.name ?? "").trim();
              const cleanDescription = (it.description ?? "").trim();
              const cleanCategory = (it.category ?? "").trim();

              if (!cleanName) {
                return null;
              }

              return {
                name: cleanName,
                description: cleanDescription || null,
                ...(cleanCategory ? { category: cleanCategory } : {}),
              };
            })
            .filter(
              (
                it
              ): it is {
                name: string;
                description: string | null;
                category?: string;
              } => !!it
            ),
        };

        const response = await apiRequest(
          `/api/hobbies/${selectedHobbyId}/items/bulk`,
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
          token
        );

        const data = await parseResponse<{
          success: boolean;
          items: Item[];
          skipped?: { index: number; reason: string }[];
        }>(response);

        if (data.success) {
          const hobbyName =
            hobbies.find((h) => h.id === selectedHobbyId)?.name || "hobby";
          const createdCount = data.items.length;
          const skippedCount = data.skipped?.length ?? 0;
          const summary =
            skippedCount > 0
              ? `Imported ${createdCount} items into ${hobbyName}. Skipped ${skippedCount} rows.`
              : `Imported ${createdCount} items into ${hobbyName} successfully!`;

          setSuccess(summary);
          setBulkItems([]);
          setBulkText("");
          setShowAdvanced(false);

          setTimeout(() => {
            navigate("/items");
          }, 1200);
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to create items. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="page">
        <h1>Add Item</h1>
        <div className="page-content">
          <p>Please log in to add items.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Add Item</h1>
      <div className="page-content">
        <div className="add-form-container">
          <form onSubmit={handleSubmit} className="add-form">
            {/* Hobby selection */}
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
                  <option value="">
                    No hobbies available. Create a hobby first.
                  </option>
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

            {/* Shared datalist for item categories for this hobby */}
            <datalist id="item-category-options">
              {itemCategories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>

            {/* Item mode selector: single vs bulk */}
            <div className="form-group">
              <label>Item Mode</label>
              <div className="type-selector">
                <button
                  type="button"
                  className={`type-button ${
                    itemMode === "single" ? "active" : ""
                  }`}
                  onClick={() => {
                    setItemMode("single");
                    setError("");
                    setSuccess("");
                  }}
                >
                  ✏️ Single item
                </button>
                <button
                  type="button"
                  className={`type-button ${
                    itemMode === "bulk" ? "active" : ""
                  }`}
                  onClick={() => {
                    setItemMode("bulk");
                    setError("");
                    setSuccess("");
                  }}
                >
                  📥 Bulk import
                </button>
              </div>
              <p className="form-hint">
                Switch to bulk import to add many items at once from CSV or
                plain text.
              </p>
            </div>

            {itemMode === "single" && (
              <>
                {/* Image upload / camera */}
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
                    Upload a photo or take one with your camera. AI will
                    automatically suggest a name, description, and category if
                    fields are empty.
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
                          if (videoRef.current) {
                            videoRef.current
                              .play()
                              .catch((err) => {
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
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="image-preview"
                      />
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
                  {imagePreview &&
                    !showCamera &&
                    (!name.trim() || !description.trim()) && (
                      <p
                        className="form-hint"
                        style={{ color: "#9370db" }}
                      >
                        💡 Leave name/description empty to let AI generate them
                        from the image
                      </p>
                    )}
                </div>

                {/* Name / description */}
                <div className="form-group">
                  <label htmlFor="name">Name {imageFile ? "" : "*"}</label>
                  <input
                    id="name"
                    type="text"
                    placeholder="Enter item name..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={!imageFile}
                    disabled={loading}
                    className="form-input"
                  />
                  <p className="form-hint">
                    {imageFile
                      ? "Leave empty to let AI generate from the image, or enter manually."
                      : "AI will automatically categorize and tag your item based on the name and description."}
                  </p>
                </div>

                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    placeholder="Describe your item..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={loading}
                    rows={4}
                    className="form-textarea"
                  />
                  <p className="form-hint">
                    Optional. A detailed description helps AI generate better
                    tags and categorization.
                  </p>
                </div>
              </>
            )}

            {itemMode === "bulk" && (
              <>
                <div className="form-group">
                  <label>Bulk source</label>
                  <div className="type-selector">
                    <button
                      type="button"
                      className={`type-button ${
                        bulkSource === "csv" ? "active" : ""
                      }`}
                      onClick={() => setBulkSource("csv")}
                    >
                      📄 CSV file
                    </button>
                    <button
                      type="button"
                      className={`type-button ${
                        bulkSource === "text" ? "active" : ""
                      }`}
                      onClick={() => setBulkSource("text")}
                    >
                      ✍️ Plain text
                    </button>
                  </div>
                </div>

                {bulkSource === "csv" && (
                  <div className="form-group">
                    <label htmlFor="csv-upload">Upload CSV</label>
                    <input
                      id="csv-upload"
                      type="file"
                      accept=".csv,text/csv"
                      disabled={loading}
                      className="form-input"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          const text = String(reader.result ?? "");
                          const lines = text
                            .split(/\r?\n/)
                            .map((l) => l.trim())
                            .filter((l) => l.length > 0);

                          if (lines.length === 0) {
                            setBulkItems([]);
                            return;
                          }

                          const dataRows = csvIncludeFirstRow
                            ? lines
                            : lines.slice(1);

                          const drafts: BulkDraftItem[] = dataRows
                            .map((row, idx) => {
                              const cols = row.split(",");
                              const n = (cols[0] ?? "").trim();
                              const descParts = cols
                                .slice(1)
                                .map((c) => c.trim())
                                .filter(Boolean);
                              const d = descParts.join("\n");

                              return {
                                id: `${Date.now()}-${idx}`,
                                name: n,
                                description: d,
                                category: "",
                              };
                            })
                            .filter((d) => d.name.length > 0);

                          setBulkItems(drafts);
                        };
                        reader.readAsText(file);
                      }}
                    />
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginTop: "0.5rem",
                        gap: "0.4rem",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={csvIncludeFirstRow}
                        onChange={(e) =>
                          setCsvIncludeFirstRow(e.target.checked)
                        }
                        disabled={loading}
                      />
                      <span>
                        Include first row as items (don&apos;t treat it as a
                        header)
                      </span>
                    </label>
                    <p className="form-hint">
                      First column is the item name. All remaining columns in
                      each row are joined into the description using newlines.
                      Use the checkbox if your CSV has no header row and the
                      first line is real data.
                    </p>
                  </div>
                )}

                {bulkSource === "text" && (
                  <>
                    <div className="form-group">
                      <label htmlFor="bulk-text">Paste items</label>
                      <textarea
                        id="bulk-text"
                        placeholder={
                          "One item per line. Optionally use a separator, e.g.\n" +
                          "Dune - Classic sci-fi novel\n" +
                          "Foundation - Another sci-fi classic"
                        }
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
                        disabled={loading}
                        rows={8}
                        className="form-textarea"
                      />
                      <p className="form-hint">
                        Each line becomes an item. If you include a separator
                        (default &quot;-&quot;), text before it is the name,
                        after it is the description.
                      </p>
                    </div>

                    <div className="form-group">
                      <label htmlFor="bulk-delimiter">
                        Name / Description separator
                      </label>
                      <input
                        id="bulk-delimiter"
                        type="text"
                        value={bulkNameDescDelimiter}
                        onChange={(e) =>
                          setBulkNameDescDelimiter(e.target.value || "-")
                        }
                        disabled={loading}
                        className="form-input"
                      />
                      <p className="form-hint">
                        We&apos;ll split each line on the first occurrence of
                        this separator.
                      </p>
                    </div>

                    <div className="form-group">
                      <button
                        type="button"
                        className="camera-button"
                        disabled={loading || !bulkText.trim()}
                        onClick={() => {
                          const delim = bulkNameDescDelimiter || "-";
                          const drafts: BulkDraftItem[] = bulkText
                            .split(/\r?\n/)
                            .map((line, idx) => {
                              const trimmed = line.trim();
                              if (!trimmed) {
                                return null;
                              }
                              const sepIndex = trimmed.indexOf(delim);
                              let namePart = trimmed;
                              let descPart = "";
                              if (sepIndex >= 0) {
                                namePart = trimmed.slice(0, sepIndex);
                                descPart = trimmed.slice(
                                  sepIndex + delim.length
                                );
                              }
                              return {
                                id: `${Date.now()}-${idx}`,
                                name: namePart.trim(),
                                description: descPart.trim(),
                                category: "",
                              };
                            })
                            .filter(
                              (d): d is BulkDraftItem =>
                                !!d && d.name.length > 0
                            );

                          setBulkItems(drafts);
                        }}
                      >
                        Parse text into items
                      </button>
                    </div>
                  </>
                )}

                {bulkItems.length > 0 && (
                  <div className="form-group">
                    <label>Preview items ({bulkItems.length})</label>
                    <div className="bulk-preview">
                      <div className="bulk-preview-header">
                        <span>Name</span>
                        <span>Description</span>
                        <span>Category</span>
                        <span>Actions</span>
                      </div>
                      {bulkItems.map((item, index) => (
                        <div className="bulk-preview-row" key={item.id}>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => {
                              const value = e.target.value;
                              setBulkItems((prev) =>
                                prev.map((it, i) =>
                                  i === index ? { ...it, name: value } : it
                                )
                              );
                            }}
                            className="form-input"
                          />
                          <textarea
                            value={item.description}
                            onChange={(e) => {
                              const value = e.target.value;
                              setBulkItems((prev) =>
                                prev.map((it, i) =>
                                  i === index
                                    ? { ...it, description: value }
                                    : it
                                )
                              );
                            }}
                            rows={2}
                            className="form-textarea"
                          />
                          <input
                            type="text"
                            value={item.category}
                            onChange={(e) => {
                              const value = e.target.value;
                              setBulkItems((prev) =>
                                prev.map((it, i) =>
                                  i === index
                                    ? { ...it, category: value }
                                    : it
                                )
                              );
                            }}
                            className="form-input"
                            list="item-category-options"
                            placeholder={
                              hobbyCategory
                                ? `Leave empty to let AI use hobby category (${hobbyCategory})`
                                : "Leave empty to let AI choose a category"
                            }
                          />
                          <button
                            type="button"
                            className="remove-image-button"
                            onClick={() =>
                              setBulkItems((prev) =>
                                prev.filter((_, i) => i !== index)
                              )
                            }
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="form-hint">
                      Edit or remove any rows before importing. Items without a
                      name will be skipped.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Advanced options for item category override */}
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
                    <input
                      id="category"
                      type="text"
                      value={manualCategory}
                      onChange={(e) => setManualCategory(e.target.value)}
                      disabled={loading || !selectedHobbyId}
                      className="form-input"
                      list="item-category-options"
                      placeholder={
                        hobbyCategory
                          ? `Leave empty to use the hobby category (${hobbyCategory}), or type a custom item category`
                          : "Leave empty to let AI use the hobby category or type a custom item category"
                      }
                    />
                    <p className="form-hint">
                      Start typing to create a new item category, or pick from
                      your previously used item categories. Leave empty to
                      inherit the hobby&apos;s category by default.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <button
              type="submit"
              className="submit-button"
              disabled={loading || hobbies.length === 0}
            >
              {loading ? <>✨ Creating...</> : <>✨ Create Item</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddItem;


