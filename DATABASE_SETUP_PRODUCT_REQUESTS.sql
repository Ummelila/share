-- Create product_requests table for Step 4
CREATE TABLE IF NOT EXISTS product_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name VARCHAR(255) NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  product_donation_id BIGINT NOT NULL REFERENCES product_donations(id) ON DELETE CASCADE,
  product_name VARCHAR(255),
  product_category VARCHAR(100) NOT NULL,
  reason TEXT NOT NULL,
  address TEXT,
  status VARCHAR(50) DEFAULT 'pending' NOT NULL, -- pending, approved, rejected
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_product_requests_user_id ON product_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_product_requests_status ON product_requests(status);
CREATE INDEX IF NOT EXISTS idx_product_requests_product_donation_id ON product_requests(product_donation_id);
CREATE INDEX IF NOT EXISTS idx_product_requests_created_at ON product_requests(created_at DESC);

