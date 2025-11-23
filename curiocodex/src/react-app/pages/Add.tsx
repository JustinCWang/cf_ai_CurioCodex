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
          <div className="add-choice-grid">
            <Link to="/add/hobby" className="add-link-button">
              ✨ Create Hobby
            </Link>
            <Link to="/add/item" className="add-link-button">
              📦 Add Item
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Add;

