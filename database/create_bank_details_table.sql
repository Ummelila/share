-- Create bank_details table to store user payment information for approved cash requests
CREATE TABLE IF NOT EXISTS bank_details (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    account_holder_name VARCHAR(255) NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('mobile', 'bank')),
    mobile_number VARCHAR(11),
    bank_details TEXT,
    related_notification_id BIGINT REFERENCES notifications(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bank_details_user_id ON bank_details(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_details_notification_id ON bank_details(related_notification_id);

-- Add RLS (Row Level Security) policies
ALTER TABLE bank_details ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own bank details
CREATE POLICY "Users can view own bank details" ON bank_details
    FOR SELECT USING (auth.uid() = user_id::text);

-- Policy: Users can only insert their own bank details
CREATE POLICY "Users can insert own bank details" ON bank_details
    FOR INSERT WITH CHECK (auth.uid() = user_id::text);

-- Policy: Users can only update their own bank details
CREATE POLICY "Users can update own bank details" ON bank_details
    FOR UPDATE USING (auth.uid() = user_id::text);

-- Policy: Admins can view all bank details
CREATE POLICY "Admins can view all bank details" ON bank_details
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::text 
            AND users.role = 'admin'
        )
    );

-- Policy: Admins can update all bank details
CREATE POLICY "Admins can update all bank details" ON bank_details
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::text 
            AND users.role = 'admin'
        )
    );

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bank_details_updated_at 
    BEFORE UPDATE ON bank_details 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
