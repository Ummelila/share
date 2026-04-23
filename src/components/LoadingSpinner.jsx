import React from "react";
import "../styles/LoadingSpinner.css";

function LoadingSpinner({ size = "medium", message = "Loading...", fullScreen = false }) {
  const sizeClass = `spinner-${size}`;
  
  if (fullScreen) {
    return (
      <div className="loading-fullscreen">
        <div className={`spinner ${sizeClass}`}></div>
        <p className="loading-message">{message}</p>
      </div>
    );
  }
  
  return (
    <div className="loading-container">
      <div className={`spinner ${sizeClass}`}></div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
}

export default LoadingSpinner;

