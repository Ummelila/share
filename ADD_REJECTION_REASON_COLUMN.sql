-- Migration: Add rejection_reason column to notifications table
-- Run this SQL if you already created the notifications table

ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- This adds the rejection_reason column to store admin's rejection reasons
-- The column is optional (nullable) so existing notifications won't break

