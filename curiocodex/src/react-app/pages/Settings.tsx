/**
 * Settings page - User preferences and configuration.
 */

import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { apiRequest, parseResponse } from "../utils/api";

function Settings() {
  const { token } = useAuth();
  const [repairing, setRepairing] = useState(false);
  const [repairResult, setRepairResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleRepairVectors = async () => {
    if (!token) {
      setRepairResult({
        success: false,
        message: "You must be logged in to repair vectors",
      });
      return;
    }

    setRepairing(true);
    setRepairResult(null);

    try {
      const response = await apiRequest(
        "/api/admin/repair-vectorize-metadata",
        {
          method: "POST",
        },
        token
      );

      const data = await parseResponse<{
        success: boolean;
        repaired: number;
        hobbies: number;
        items: number;
      }>(response);

      if (data.success) {
        setRepairResult({
          success: true,
          message: `Successfully repaired ${data.repaired} vectors (${data.hobbies} hobbies, ${data.items} items). Semantic search should now work properly!`,
        });
      } else {
        setRepairResult({
          success: false,
          message: "Repair failed. Please try again.",
        });
      }
    } catch (err) {
      console.error("Error repairing vectors:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to repair vectors";
      setRepairResult({
        success: false,
        message: errorMessage,
      });
    } finally {
      setRepairing(false);
    }
  };

  return (
    <div className="page">
      <h1>Settings</h1>
      <div className="page-content">
        <p>Manage your account settings and preferences.</p>

        <div style={{ marginTop: "2rem", padding: "1rem", border: "1px solid #ddd", borderRadius: "8px" }}>
          <h2 style={{ marginTop: 0 }}>Vector Database Maintenance</h2>
          <p>
            If semantic search isn't working (showing "text" search instead of "semantic"),
            your vectors may be missing metadata. Click the button below to repair them.
          </p>
          <button
            onClick={handleRepairVectors}
            disabled={repairing || !token}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: repairing ? "not-allowed" : "pointer",
              fontSize: "1rem",
              marginTop: "1rem",
            }}
          >
            {repairing ? "Repairing..." : "Repair Vector Metadata"}
          </button>

          {repairResult && (
            <div
              style={{
                marginTop: "1rem",
                padding: "1rem",
                backgroundColor: repairResult.success ? "#d4edda" : "#f8d7da",
                color: repairResult.success ? "#155724" : "#721c24",
                borderRadius: "4px",
                border: `1px solid ${repairResult.success ? "#c3e6cb" : "#f5c6cb"}`,
              }}
            >
              {repairResult.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;

