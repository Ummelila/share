import React from "react";
import "../styles/ErrorMessage.css";

function ErrorMessage({ 
  message, 
  onRetry = null, 
  type = "error",
  dismissible = false,
  onDismiss = null 
}) {
  const getIcon = () => {
    switch (type) {
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      case "info":
        return "ℹ️";
      default:
        return "❌";
    }
  };

  return (
    <div className={`error-message error-message-${type}`}>
      <div className="error-content">
        <span className="error-icon">{getIcon()}</span>
        <span className="error-text">{message}</span>
        {dismissible && onDismiss && (
          <button 
            className="error-dismiss" 
            onClick={onDismiss}
            aria-label="Dismiss"
          >
            ✕
          </button>
        )}
      </div>
      {onRetry && (
        <button className="error-retry-btn" onClick={onRetry}>
          🔄 Retry
        </button>
      )}
    </div>
  );
}

export default ErrorMessage;

