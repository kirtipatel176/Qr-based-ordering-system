-- Enhanced customer and session management

-- Add customer tracking table
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone VARCHAR(20) UNIQUE,
  name VARCHAR(255),
  email VARCHAR(255),
  visit_count INTEGER DEFAULT 1,
  total_spent DECIMAL(10,2) DEFAULT 0,
  last_visit TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add session status tracking
ALTER TABLE table_sessions ADD COLUMN IF NOT EXISTS session_type VARCHAR(50) DEFAULT 'new_customer';
ALTER TABLE table_sessions ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
ALTER TABLE table_sessions ADD COLUMN IF NOT EXISTS previous_sessions INTEGER DEFAULT 0;
ALTER TABLE table_sessions ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;

-- Add session closure tracking
CREATE TABLE IF NOT EXISTS session_closures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES table_sessions(id) ON DELETE CASCADE,
  closed_by VARCHAR(100), -- 'customer', 'staff', 'admin', 'auto'
  closure_reason VARCHAR(100), -- 'payment_complete', 'manual_close', 'timeout'
  final_amount DECIMAL(10,2),
  payment_status VARCHAR(50),
  feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  feedback_comment TEXT,
  closed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_table_sessions_customer ON table_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_session_closures_session ON session_closures(session_id);

-- Update menu items with better image URLs (food images)
UPDATE menu_items SET image_url = CASE 
  WHEN name LIKE '%Caesar Salad%' THEN 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400&h=300&fit=crop'
  WHEN name LIKE '%Buffalo Wings%' THEN 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=400&h=300&fit=crop'
  WHEN name LIKE '%Hummus%' THEN 'https://images.unsplash.com/photo-1571197119282-7c4e2b2d9c6e?w=400&h=300&fit=crop'
  WHEN name LIKE '%Salmon%' THEN 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop'
  WHEN name LIKE '%Chicken Tikka%' THEN 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop'
  WHEN name LIKE '%Pasta%' THEN 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=400&h=300&fit=crop'
  WHEN name LIKE '%Orange Juice%' THEN 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&h=300&fit=crop'
  WHEN name LIKE '%Beer%' THEN 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=300&fit=crop'
  WHEN name LIKE '%Coffee%' THEN 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=300&fit=crop'
  WHEN name LIKE '%Chocolate Cake%' THEN 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=300&fit=crop'
  WHEN name LIKE '%Sorbet%' THEN 'https://images.unsplash.com/photo-1488900128323-21503983a07e?w=400&h=300&fit=crop'
  ELSE 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'
END;
