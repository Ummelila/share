-- Product Donations Table
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS product_donations (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name VARCHAR(255) NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  product_name VARCHAR(255),
  category VARCHAR(100) NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  ai_checked BOOLEAN DEFAULT FALSE,
  ai_result VARCHAR(50), -- 'safe', 'unsafe', 'pending'
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_product_donations_user_id ON product_donations(user_id);
CREATE INDEX IF NOT EXISTS idx_product_donations_status ON product_donations(status);
CREATE INDEX IF NOT EXISTS idx_product_donations_category ON product_donations(category);
CREATE INDEX IF NOT EXISTS idx_product_donations_created_at ON product_donations(created_at DESC);

-- Add comment to table
COMMENT ON TABLE product_donations IS 'Stores product donations from donors. Products go through AI check and admin approval before being available for recipients.';

