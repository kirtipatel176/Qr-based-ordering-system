-- Add authentication and payment tables
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add employee management
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'kitchen_staff',
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add payment transactions
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  session_id UUID REFERENCES table_sessions(id) ON DELETE CASCADE,
  payment_method VARCHAR(50) NOT NULL, -- 'card', 'cash', 'upi', 'wallet'
  payment_provider VARCHAR(50), -- 'stripe', 'razorpay', 'paytm', etc.
  transaction_id VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  payment_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES table_sessions(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'order_placed', 'order_confirmed', 'order_ready', 'payment_received'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  phone_number VARCHAR(20),
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add receipts
CREATE TABLE IF NOT EXISTS receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES table_sessions(id) ON DELETE CASCADE,
  receipt_number VARCHAR(100) UNIQUE NOT NULL,
  customer_phone VARCHAR(20),
  total_amount DECIMAL(10,2) NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  payment_details JSONB DEFAULT '{}',
  receipt_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_employees_username ON employees(username);
CREATE INDEX IF NOT EXISTS idx_employees_restaurant ON employees(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_session_id ON payments(session_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_notifications_session ON notifications(session_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_receipts_phone ON receipts(customer_phone);
CREATE INDEX IF NOT EXISTS idx_receipts_number ON receipts(receipt_number);

-- Insert default admin user (username: admin, password: admin123)
INSERT INTO admin_users (restaurant_id, email, password_hash, name, role) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'admin@restaurant.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Restaurant Admin', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insert sample kitchen staff
INSERT INTO employees (restaurant_id, username, password_hash, full_name, role, created_by) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'kitchen1', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Kitchen Staff 1', 'kitchen_staff', (SELECT id FROM admin_users WHERE email = 'admin@restaurant.com' LIMIT 1)),
('550e8400-e29b-41d4-a716-446655440000', 'kitchen2', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Kitchen Staff 2', 'kitchen_staff', (SELECT id FROM admin_users WHERE email = 'admin@restaurant.com' LIMIT 1))
ON CONFLICT (username) DO NOTHING;
