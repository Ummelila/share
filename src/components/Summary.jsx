import React from 'react';

function Summary({ 
  verifications, 
  cashRequests, 
  cashDonations, 
  productDonations, 
  productRequests, 
  biddingProducts 
}) {
  return (
    <div className="stats-container">
      <div className="stat-card">
        <h3>Verifications</h3>
        <p className="stat-number">{verifications.length}</p>
        <div className="stat-breakdown">
          <span className="stat-pending">
            <strong>{verifications.filter((v) => v.status === "pending").length}</strong>
            Pending
          </span>
          <span className="stat-approved">
            <strong>{verifications.filter((v) => v.status === "approved").length}</strong>
            Approved
          </span>
          <span className="stat-rejected">
            <strong>{verifications.filter((v) => v.status === "rejected").length}</strong>
            Rejected
          </span>
        </div>
      </div>

      <div className="stat-card">
        <h3>Cash Requests</h3>
        <p className="stat-number">{cashRequests.length}</p>
        <div className="stat-breakdown">
          <span className="stat-pending">
            <strong>{cashRequests.filter((r) => r.status === "pending").length}</strong>
            Pending
          </span>
          <span className="stat-approved">
            <strong>{cashRequests.filter((r) => r.status === "approved").length}</strong>
            Approved
          </span>
          <span className="stat-rejected">
            <strong>{cashRequests.filter((r) => r.status === "rejected").length}</strong>
            Rejected
          </span>
        </div>
        <p className="stat-amount">
          <span>Total Approved:</span>
          <strong>PKR {cashRequests
            .filter((r) => r.status === "approved")
            .reduce((sum, r) => sum + Number(r.amount), 0)
            .toLocaleString()}</strong>
        </p>
      </div>

      <div className="stat-card">
        <h3>Cash Donations</h3>
        <p className="stat-number">{cashDonations.length}</p>
        <div className="stat-breakdown">
          <span className="stat-pending">
            <strong>{cashDonations.filter((d) => d.status === "pending").length}</strong>
            Pending
          </span>
          <span className="stat-approved">
            <strong>{cashDonations.filter((d) => d.status === "approved").length}</strong>
            Approved
          </span>
          <span className="stat-rejected">
            <strong>{cashDonations.filter((d) => d.status === "rejected").length}</strong>
            Rejected
          </span>
        </div>
        <p className="stat-amount">
          <span>Total Approved:</span>
          <strong>PKR {cashDonations
            .filter((d) => d.status === "approved")
            .reduce((sum, d) => sum + Number(d.amount), 0)
            .toLocaleString()}</strong>
        </p>
      </div>

      <div className="stat-card">
        <h3>Product Donations</h3>
        <p className="stat-number">{productDonations.length}</p>
        <div className="stat-breakdown">
          <span className="stat-pending">
            <strong>{productDonations.filter((d) => d.status === "pending").length}</strong>
            Pending
          </span>
          <span className="stat-approved">
            <strong>{productDonations.filter((d) => d.status === "approved").length}</strong>
            Approved
          </span>
          <span className="stat-rejected">
            <strong>{productDonations.filter((d) => d.status === "rejected").length}</strong>
            Rejected
          </span>
        </div>
      </div>

      <div className="stat-card">
        <h3>Product Requests</h3>
        <p className="stat-number">{productRequests.length}</p>
        <div className="stat-breakdown">
          <span className="stat-pending">
            <strong>{productRequests.filter((r) => r.status === "pending").length}</strong>
            Pending
          </span>
          <span className="stat-approved">
            <strong>{productRequests.filter((r) => r.status === "approved").length}</strong>
            Approved
          </span>
          <span className="stat-rejected">
            <strong>{productRequests.filter((r) => r.status === "rejected").length}</strong>
            Rejected
          </span>
        </div>
      </div>

      <div className="stat-card">
        <h3>Bidding Products</h3>
        <p className="stat-number">{biddingProducts.length}</p>
        <div className="stat-breakdown">
          <span className="stat-pending">
            <strong>{biddingProducts.filter((b) => b.status === "upcoming").length}</strong>
            Upcoming
          </span>
          <span className="stat-approved">
            <strong>{biddingProducts.filter((b) => b.status === "active").length}</strong>
            Active
          </span>
          <span className="stat-rejected">
            <strong>{biddingProducts.filter((b) => b.status === "ended").length}</strong>
            Ended
          </span>
        </div>
      </div>
    </div>
  );
}

export default Summary;
