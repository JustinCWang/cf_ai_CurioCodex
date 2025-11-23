/**
 * Add page - Simple chooser that routes to Add Hobby / Add Item flows.
 * Keeps the global "Add" entrypoint small while dedicated pages handle logic.
 */

import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import "./Add.css";

function Add() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="page">
        <h1>Add to CurioCodex</h1>
        <div className="page-content">
          <p>Please log in to add hobbies or items.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Add to Your Collection</h1>
      <div className="page-content">
        <div className="add-form-container">
          <p className="add-page-intro">
            Start a brand new hobby universe or tuck a new item into an existing one.
            Choose where your next curiosity belongs.
          </p>

          <div className="add-choice-grid">
            <Link to="/add/hobby" className="add-choice-card">
              <span className="add-choice-icon">✨</span>
              <span className="add-choice-title">Create Hobby</span>
              <span className="add-choice-description">
                Define a new realm of interest and give it a name, category, and story.
              </span>
            </Link>

            <Link to="/add/item" className="add-choice-card">
              <span className="add-choice-icon">📦</span>
              <span className="add-choice-title">Add Item</span>
              <span className="add-choice-description">
                Attach a new artifact, memory, or resource to one of your hobbies.
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Add;

