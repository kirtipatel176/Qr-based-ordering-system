-- Enhanced payment system tables

-- Add payment methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  method_name VARCHAR(100) NOT NULL,
  method_type VARCHAR(50) NOT NULL, -- 'card', 'upi', 'wallet', 'cash', 'bank_transfer'
  provider VARCHAR(100), -- 'stripe', 'razorpay', 'paytm', 'gpay', etc.
  is_active BOOLEAN DEFAULT true,
  configuration JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced payments table with more details
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_gateway VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_transaction_id VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS net_amount DECIMAL(10,2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- Add payment splits for group orders
CREATE TABLE IF NOT EXISTS payment_splits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES table_sessions(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  split_type VARCHAR(50) DEFAULT 'equal', -- 'equal', 'custom', 'by_item'
  total_amount DECIMAL(10,2) NOT NULL,
  split_data JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add tips table
CREATE TABLE IF NOT EXISTS tips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES table_sessions(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  tip_amount DECIMAL(10,2) NOT NULL,
  tip_percentage DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default payment methods
INSERT INTO payment_methods (restaurant_id, method_name, method_type, provider, configuration) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Credit/Debit Card', 'card', 'stripe', '{"accepts": ["visa", "mastercard", "amex"]}'),
('550e8400-e29b-41d4-a716-446655440000', 'Google Pay', 'upi', 'gpay', '{"upi_id": "restaurant@okaxis"}'),
('550e8400-e29b-41d4-a716-446655440000', 'PayPal', 'wallet', 'paypal', '{"merchant_id": "restaurant123"}'),
('550e8400-e29b-41d4-a716-446655440000', 'Apple Pay', 'wallet', 'apple_pay', '{}'),
('550e8400-e29b-41d4-a716-446655440000', 'Cash Payment', 'cash', 'manual', '{}'),
('550e8400-e29b-41d4-a716-446655440000', 'Bank Transfer', 'bank_transfer', 'manual', '{"account": "1234567890"}')
ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_methods_restaurant ON payment_methods(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_payment_splits_session ON payment_splits(session_id);
CREATE INDEX IF NOT EXISTS idx_tips_session ON tips(session_id);
