-- Comprehensive system check and fixes
-- This script ensures all tables, functions, and data are properly set up

-- 1. Check and fix table schemas
DO $$
BEGIN
    -- Add missing columns to table_sessions if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'table_sessions' AND column_name = 'status') THEN
        ALTER TABLE table_sessions ADD COLUMN status VARCHAR(20) DEFAULT 'active';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'table_sessions' AND column_name = 'last_activity') THEN
        ALTER TABLE table_sessions ADD COLUMN last_activity TIMESTAMP DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'table_sessions' AND column_name = 'expires_at') THEN
        ALTER TABLE table_sessions ADD COLUMN expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '24 hours');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'table_sessions' AND column_name = 'customer_email') THEN
        ALTER TABLE table_sessions ADD COLUMN customer_email VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'table_sessions' AND column_name = 'counter_payment_pending') THEN
        ALTER TABLE table_sessions ADD COLUMN counter_payment_pending BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'table_sessions' AND column_name = 'counter_payment_completed') THEN
        ALTER TABLE table_sessions ADD COLUMN counter_payment_completed BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'table_sessions' AND column_name = 'can_close_session') THEN
        ALTER TABLE table_sessions ADD COLUMN can_close_session BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Update existing records to have proper status
UPDATE table_sessions SET status = 'active' WHERE status IS NULL;
UPDATE table_sessions SET last_activity = created_at WHERE last_activity IS NULL;
UPDATE table_sessions SET expires_at = created_at + INTERVAL '24 hours' WHERE expires_at IS NULL;

-- 3. Create or replace essential functions
CREATE OR REPLACE FUNCTION create_table_session(
    p_table_id UUID,
    p_session_token VARCHAR(255),
    p_customer_name VARCHAR(255),
    p_customer_phone VARCHAR(20) DEFAULT NULL,
    p_customer_email VARCHAR(255) DEFAULT NULL,
    p_customer_id UUID DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_session_id UUID;
    v_result JSON;
BEGIN
    -- Validate table exists and is active
    IF NOT EXISTS (SELECT 1 FROM tables WHERE id = p_table_id AND is_active = TRUE) THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Table not found or inactive',
            'error_code', 'TABLE_NOT_FOUND'
        );
    END IF;
    
    -- Create new session
    INSERT INTO table_sessions (
        table_id,
        session_token,
        customer_name,
        customer_phone,
        customer_email,
        customer_id,
        status,
        payment_mode,
        total_amount,
        created_at,
        last_activity,
        expires_at
    ) VALUES (
        p_table_id,
        p_session_token,
        p_customer_name,
        p_customer_phone,
        p_customer_email,
        p_customer_id,
        'active',
        'final_bill',
        0,
        NOW(),
        NOW(),
        NOW() + INTERVAL '24 hours'
    ) RETURNING id INTO v_session_id;
    
    -- Return success response
    RETURN json_build_object(
        'success', TRUE,
        'session_id', v_session_id,
        'message', 'Session created successfully'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', SQLERRM,
            'error_code', 'DATABASE_ERROR'
        );
END;
$$;

-- 4. Create session validation function
CREATE OR REPLACE FUNCTION validate_session(
    p_session_id UUID,
    p_session_token VARCHAR(255)
) RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_session RECORD;
    v_result JSON;
BEGIN
    -- Get session details
    SELECT * INTO v_session
    FROM table_sessions
    WHERE id = p_session_id AND session_token = p_session_token;
    
    -- Check if session exists
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Session not found',
            'error_code', 'SESSION_NOT_FOUND'
        );
    END IF;
    
    -- Check if session is active
    IF v_session.status != 'active' THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Session is not active',
            'error_code', 'SESSION_INACTIVE'
        );
    END IF;
    
    -- Check if session is expired
    IF v_session.expires_at < NOW() THEN
        -- Mark as expired
        UPDATE table_sessions SET status = 'expired' WHERE id = p_session_id;
        
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Session has expired',
            'error_code', 'SESSION_EXPIRED'
        );
    END IF;
    
    -- Update last activity
    UPDATE table_sessions 
    SET last_activity = NOW(), expires_at = NOW() + INTERVAL '24 hours'
    WHERE id = p_session_id;
    
    -- Return success
    RETURN json_build_object(
        'success', TRUE,
        'session', json_build_object(
            'id', v_session.id,
            'expires_at', v_session.expires_at
        )
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', SQLERRM,
            'error_code', 'VALIDATION_ERROR'
        );
END;
$$;

-- 5. Create session summary function
CREATE OR REPLACE FUNCTION get_session_summary(
    p_session_id UUID
) RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_session RECORD;
    v_orders JSON;
    v_result JSON;
BEGIN
    -- Get session with table info
    SELECT ts.*, t.table_number, r.name as restaurant_name
    INTO v_session
    FROM table_sessions ts
    JOIN tables t ON ts.table_id = t.id
    JOIN restaurants r ON t.restaurant_id = r.id
    WHERE ts.id = p_session_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Session not found'
        );
    END IF;
    
    -- Get orders for this session
    SELECT json_agg(
        json_build_object(
            'id', o.id,
            'order_number', o.order_number,
            'total_amount', o.total_amount,
            'status', o.status,
            'payment_status', o.payment_status,
            'created_at', o.created_at,
            'items', o.items
        )
    ) INTO v_orders
    FROM orders o
    WHERE o.session_id = p_session_id
    ORDER BY o.created_at DESC;
    
    -- Build result
    RETURN json_build_object(
        'success', TRUE,
        'session', json_build_object(
            'id', v_session.id,
            'customer_name', v_session.customer_name,
            'customer_phone', v_session.customer_phone,
            'customer_email', v_session.customer_email,
            'table_number', v_session.table_number,
            'restaurant_name', v_session.restaurant_name,
            'total_amount', v_session.total_amount,
            'status', v_session.status,
            'created_at', v_session.created_at,
            'last_activity', v_session.last_activity,
            'expires_at', v_session.expires_at
        ),
        'orders', COALESCE(v_orders, '[]'::json)
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', SQLERRM
        );
END;
$$;

-- 6. Ensure sample data exists
INSERT INTO restaurants (id, name, description, address, phone, email, is_active)
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Delicious Bites Restaurant',
    'Experience authentic flavors with our carefully crafted dishes',
    '123 Food Street, Culinary District',
    '+1-555-0123',
    'info@deliciousbites.com',
    TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = TRUE;

-- 7. Ensure sample tables exist
INSERT INTO tables (id, restaurant_id, table_number, qr_code, is_active)
VALUES 
    ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 1, 'table-1-qr', TRUE),
    ('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 2, 'table-2-qr', TRUE),
    ('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 3, 'table-3-qr', TRUE)
ON CONFLICT (id) DO UPDATE SET
    is_active = TRUE;

-- 8. Ensure sample menu categories exist
INSERT INTO menu_categories (id, restaurant_id, name, description, sort_order, is_active)
VALUES 
    ('770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Appetizers', 'Start your meal with our delicious appetizers', 1, TRUE),
    ('770e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Main Courses', 'Hearty and satisfying main dishes', 2, TRUE),
    ('770e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Desserts', 'Sweet endings to your perfect meal', 3, TRUE),
    ('770e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', 'Beverages', 'Refreshing drinks and beverages', 4, TRUE)
ON CONFLICT (id) DO UPDATE SET
    is_active = TRUE;

-- 9. Ensure sample menu items exist
INSERT INTO menu_items (id, restaurant_id, category_id, name, description, price, image_url, is_available, is_vegetarian, is_vegan, is_gluten_free, spice_level, sort_order)
VALUES 
    ('880e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440001', 'Crispy Spring Rolls', 'Fresh vegetables wrapped in crispy pastry', 8.99, '/placeholder.svg?height=200&width=200', TRUE, TRUE, FALSE, FALSE, 1, 1),
    ('880e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440001', 'Buffalo Wings', 'Spicy chicken wings with blue cheese dip', 12.99, '/placeholder.svg?height=200&width=200', TRUE, FALSE, FALSE, FALSE, 3, 2),
    ('880e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440002', 'Grilled Salmon', 'Fresh Atlantic salmon with herbs', 24.99, '/placeholder.svg?height=200&width=200', TRUE, FALSE, FALSE, TRUE, 0, 1),
    ('880e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440002', 'Vegetarian Pasta', 'Penne pasta with seasonal vegetables', 16.99, '/placeholder.svg?height=200&width=200', TRUE, TRUE, TRUE, FALSE, 1, 2),
    ('880e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440003', 'Chocolate Cake', 'Rich chocolate cake with vanilla ice cream', 7.99, '/placeholder.svg?height=200&width=200', TRUE, TRUE, FALSE, FALSE, 0, 1),
    ('880e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440004', 'Fresh Orange Juice', 'Freshly squeezed orange juice', 4.99, '/placeholder.svg?height=200&width=200', TRUE, TRUE, TRUE, TRUE, 0, 1)
ON CONFLICT (id) DO UPDATE SET
    is_available = TRUE;

-- 10. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_table_sessions_status ON table_sessions(status);
CREATE INDEX IF NOT EXISTS idx_table_sessions_table_id ON table_sessions(table_id);
CREATE INDEX IF NOT EXISTS idx_table_sessions_expires_at ON table_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_orders_session_id ON orders(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(is_available);

-- 11. Clean up expired sessions
UPDATE table_sessions SET status = 'expired' WHERE expires_at < NOW() AND status = 'active';

-- Success message
SELECT 'System check completed successfully' as message;
