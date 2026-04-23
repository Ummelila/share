-- Step 5: Bidding System - Database Tables
-- This creates the tables needed for the bidding system

-- Table for products that are up for bidding
CREATE TABLE IF NOT EXISTS bidding_products (
  id BIGSERIAL PRIMARY KEY,
  product_donation_id BIGINT NOT NULL REFERENCES product_donations(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  product_category VARCHAR(100) NOT NULL,
  product_description TEXT,
  product_image_url TEXT,
  starting_price DECIMAL(10, 2) NOT NULL CHECK (starting_price >= 0),
  current_highest_bid DECIMAL(10, 2) DEFAULT 0 CHECK (current_highest_bid >= 0),
  highest_bidder_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  highest_bidder_name VARCHAR(255),
  highest_bidder_email VARCHAR(255),
  bid_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  bid_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'upcoming' NOT NULL CHECK (status IN ('upcoming', 'active', 'ended', 'completed', 'cancelled')),
  winner_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  winner_name VARCHAR(255),
  winner_email VARCHAR(255),
  payment_verified BOOLEAN DEFAULT FALSE,
  delivery_arranged BOOLEAN DEFAULT FALSE,
  created_by_admin_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_bid_dates CHECK (bid_end_date > bid_start_date)
);

-- Table for all bids placed on bidding products
CREATE TABLE IF NOT EXISTS bids (
  id BIGSERIAL PRIMARY KEY,
  bidding_product_id BIGINT NOT NULL REFERENCES bidding_products(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name VARCHAR(255) NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  bid_amount DECIMAL(10, 2) NOT NULL CHECK (bid_amount > 0),
  is_winning_bid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bidding_products_status ON bidding_products(status);
CREATE INDEX IF NOT EXISTS idx_bidding_products_bid_dates ON bidding_products(bid_start_date, bid_end_date);
CREATE INDEX IF NOT EXISTS idx_bidding_products_product_donation_id ON bidding_products(product_donation_id);
CREATE INDEX IF NOT EXISTS idx_bids_bidding_product_id ON bids(bidding_product_id);
CREATE INDEX IF NOT EXISTS idx_bids_user_id ON bids(user_id);
CREATE INDEX IF NOT EXISTS idx_bids_created_at ON bids(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bids_winning ON bids(is_winning_bid) WHERE is_winning_bid = TRUE;

-- Function to automatically update current_highest_bid when a new bid is placed
CREATE OR REPLACE FUNCTION update_bidding_product_highest_bid()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the bidding product with the new highest bid
  UPDATE bidding_products
  SET 
    current_highest_bid = NEW.bid_amount,
    highest_bidder_id = NEW.user_id,
    highest_bidder_name = NEW.user_name,
    highest_bidder_email = NEW.user_email,
    updated_at = NOW()
  WHERE id = NEW.bidding_product_id
    AND NEW.bid_amount > COALESCE(current_highest_bid, 0);
  
  -- Mark this bid as winning and unmark previous winning bid
  UPDATE bids
  SET is_winning_bid = FALSE
  WHERE bidding_product_id = NEW.bidding_product_id
    AND id != NEW.id;
  
  NEW.is_winning_bid = TRUE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update highest bid when a new bid is inserted
CREATE TRIGGER trigger_update_highest_bid
  AFTER INSERT ON bids
  FOR EACH ROW
  EXECUTE FUNCTION update_bidding_product_highest_bid();

-- Function to automatically update bidding product status based on dates
CREATE OR REPLACE FUNCTION update_bidding_product_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update status based on current time and bid dates
  UPDATE bidding_products
  SET status = CASE
    WHEN NOW() < bid_start_date THEN 'upcoming'
    WHEN NOW() >= bid_start_date AND NOW() <= bid_end_date THEN 'active'
    WHEN NOW() > bid_end_date AND status = 'active' THEN 'ended'
    ELSE status
  END,
  updated_at = NOW()
  WHERE id = NEW.id OR id = OLD.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Status updates will be handled by application logic or scheduled jobs
-- The trigger above is a helper but may need manual status updates

