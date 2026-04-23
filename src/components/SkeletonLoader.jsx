import React from "react";
import "../styles/SkeletonLoader.css";

function SkeletonLoader({ type = "card", count = 1 }) {
  const renderSkeleton = () => {
    switch (type) {
      case "card":
        return (
          <div className="skeleton-card">
            <div className="skeleton-image"></div>
            <div className="skeleton-content">
              <div className="skeleton-title"></div>
              <div className="skeleton-text"></div>
              <div className="skeleton-text short"></div>
            </div>
          </div>
        );
      case "list":
        return (
          <div className="skeleton-list-item">
            <div className="skeleton-avatar"></div>
            <div className="skeleton-list-content">
              <div className="skeleton-title"></div>
              <div className="skeleton-text"></div>
            </div>
          </div>
        );
      case "table":
        return (
          <div className="skeleton-table-row">
            <div className="skeleton-cell"></div>
            <div className="skeleton-cell"></div>
            <div className="skeleton-cell"></div>
            <div className="skeleton-cell"></div>
          </div>
        );
      default:
        return <div className="skeleton-card"></div>;
    }
  };

  return (
    <div className="skeleton-container">
      {Array.from({ length: count }).map((_, index) => (
        <React.Fragment key={index}>{renderSkeleton()}</React.Fragment>
      ))}
    </div>
  );
}

export default SkeletonLoader;

