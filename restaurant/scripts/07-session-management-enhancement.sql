-- Add session management enhancements
ALTER TABLE table_sessions ADD COLUMN IF NOT EXISTS session_status VARCHAR(20) DEFAULT 'active';
ALTER TABLE table_sessions ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP DEFAULT NOW();
ALTER TABLE table_sessions ADD COLUMN IF NOT EXISTS customer_type VARCHAR(20) DEFAULT 'new';

-- Create session history table for tracking multiple sessions per customer
CREATE TABLE IF NOT EXISTS customer_session_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  session_id UUID REFERENCES table_sessions(id),
  table_id UUID REFERENCES tables(id),
  restaurant_id UUID REFERENCES restaurants(id),
  session_date DATE DEFAULT CURRENT_DATE,
  total_orders INTEGER DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  session_duration INTERVAL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create active sessions view
CREATE OR REPLACE VIEW active_table_sessions AS
SELECT 
  ts.*,
  t.table_number,
  t.restaurant_id,
  r.name as restaurant_name,
  c.name as customer_name_from_profile,
  c.phone as customer_phone_from_profile,
  COUNT(o.id) as total_orders,
  COALESCE(SUM(o.total_amount), 0) as session_total
FROM table_sessions ts
LEFT JOIN tables t ON ts.table_id = t.id
LEFT JOIN restaurants r ON t.restaurant_id = r.id
LEFT JOIN customers c ON ts.customer_id = c.id
LEFT JOIN orders o ON ts.id = o.session_id
WHERE ts.status = 'active'
GROUP BY ts.id, t.table_number, t.restaurant_id, r.name, c.name, c.phone;

-- Function to check for existing active session
CREATE OR REPLACE FUNCTION get_active_session_for_table(table_uuid UUID)
RETURNS TABLE (
  session_id UUID,
  customer_name TEXT,
  customer_phone TEXT,
  total_orders BIGINT,
  total_amount NUMERIC,
  session_token TEXT,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ts.id,
    ts.customer_name,
    ts.customer_phone,
    COUNT(o.id) as total_orders,
    COALESCE(SUM(o.total_amount), 0) as total_amount,
    ts.session_token,
    ts.created_at
  FROM table_sessions ts
  LEFT JOIN orders o ON ts.id = o.session_id
  WHERE ts.table_id = table_uuid 
    AND ts.status = 'active'
  GROUP BY ts.id, ts.customer_name, ts.customer_phone, ts.session_token, ts.created_at
  ORDER BY ts.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Update session activity function
CREATE OR REPLACE FUNCTION update_session_activity(session_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE table_sessions 
  SET last_activity = NOW()
  WHERE id = session_uuid;
END;
$$ LANGUAGE plpgsql;
