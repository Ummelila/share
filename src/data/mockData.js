// Mock Users Data
export const users = [
  {
    id: 1,
    name: "Admin User",
    email: "admin@shareforgood.com",
    password: "admin123",
    role: "admin"
  },
  {
    id: 2,
    name: "John Donor",
    email: "john@example.com",
    password: "donor123",
    role: "donor"
  },
  {
    id: 3,
    name: "Sarah Recipient",
    email: "sarah@example.com",
    password: "recipient123",
    role: "recipient",
    isVerified: true
  }
];

// Mock Donation Requests
export const donationRequests = [
  {
    id: 1,
    recipientId: 3,
    recipientName: "Sarah Recipient",
    type: "cash",
    amount: 5000,
    reason: "Medical Emergency",
    status: "pending",
    date: "2024-11-01"
  }
];

// Mock Donations
export const donations = [
  {
    id: 1,
    donorId: 2,
    donorName: "John Donor",
    type: "product",
    item: "Laptop",
    quantity: 1,
    status: "approved",
    date: "2024-11-05"
  }
];