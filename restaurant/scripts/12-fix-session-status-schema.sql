-- Fix table_sessions schema - add missing status column and other required fields
DO $$ 
BEGIN
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'table_sessions' AND column_name = 'status') THEN
        ALTER TABLE table_sessions ADD COLUMN status VARCHAR(50) DEFAULT 'active';
        UPDATE table_sessions SET status = 'active' WHERE status IS NULL;
    END IF;

    -- Add other missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'table_sessions' AND column_name = 'last_activity') THEN
        ALTER TABLE table_sessions ADD COLUMN last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'table_sessions' AND column_name = 'expires_at') THEN
        ALTER TABLE table_sessions ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'table_sessions' AND column_name = 'completed_at') THEN
        ALTER TABLE table_sessions ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'table_sessions' AND column_name = 'session_data') THEN
        ALTER TABLE table_sessions ADD COLUMN session_data JSONB DEFAULT '{}';
    END IF;

    -- Add customer_email if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'table_sessions' AND column_name = 'customer_email') THEN
        ALTER TABLE table_sessions ADD COLUMN customer_email VARCHAR(255);
    END IF;

    -- Add counter payment fields if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'table_sessions' AND column_name = 'counter_payment_pending') THEN
        ALTER TABLE table_sessions ADD COLUMN counter_payment_pending BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'table_sessions' AND column_name = 'counter_payment_completed') THEN
        ALTER TABLE table_sessions ADD COLUMN counter_payment_completed BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'table_sessions' AND column_name = 'can_close_session') THEN
        ALTER TABLE table_sessions ADD COLUMN can_close_session BOOLEAN DEFAULT TRUE;
    END IF;

    -- Add preferred_payment_mode if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'table_sessions' AND column_name = 'preferred_payment_mode') THEN
        ALTER TABLE table_sessions ADD COLUMN preferred_payment_mode VARCHAR(50) DEFAULT 'final_bill';
    END IF;

    -- Update existing records to have proper status
    UPDATE table_sessions 
    SET status = 'active', 
        last_activity = COALESCE(last_activity, created_at),
        expires_at = COALESCE(expires_at, created_at + INTERVAL '24 hours')
    WHERE status IS NULL OR status = '';

END $$;

-- Create index on status for better performance
CREATE INDEX IF NOT EXISTS idx_table_sessions_status ON table_sessions(status);
CREATE INDEX IF NOT EXISTS idx_table_sessions_expires_at ON table_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_table_sessions_table_status ON table_sessions(table_id, status);

-- Create or replace the session creation function with proper error handling
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
    v_table_exists BOOLEAN;
    v_result JSON;
BEGIN
    -- Check if table exists and is active
    SELECT EXISTS(
        SELECT 1 FROM tables 
        WHERE id = p_table_id AND is_active = TRUE
    ) INTO v_table_exists;

    IF NOT v_table_exists THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Table not found or inactive',
            'error_code', 'TABLE_NOT_FOUND'
        );
    END IF;

    -- Validate required parameters
    IF p_table_id IS NULL OR p_session_token IS NULL OR p_customer_name IS NULL OR TRIM(p_customer_name) = '' THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Missing required parameters',
            'error_code', 'INVALID_PARAMETERS'
        );
    END IF;

    -- Generate new session ID
    v_session_id := gen_random_uuid();

    -- Insert new session
    BEGIN
        INSERT INTO table_sessions (
            id,
            table_id,
            session_token,
            customer_name,
            customer_phone,
            customer_email,
            customer_id,
            payment_mode,
            preferred_payment_mode,
            status,
            total_amount,
            counter_payment_pending,
            counter_payment_completed,
            can_close_session,
            created_at,
            last_activity,
            expires_at,
            session_data
        ) VALUES (
            v_session_id,
            p_table_id,
            p_session_token,
            TRIM(p_customer_name),
            NULLIF(TRIM(p_customer_phone), ''),
            NULLIF(TRIM(p_customer_email), ''),
            p_customer_id,
            'final_bill',
            'final_bill',
            'active',
            0,
            FALSE,
            FALSE,
            TRUE,
            NOW(),
            NOW(),
            NOW() + INTERVAL '24 hours',
            '{}'::jsonb
        );

        -- Return success
        RETURN json_build_object(
            'success', TRUE,
            'session_id', v_session_id,
            'message', 'Session created successfully'
        );

    EXCEPTION WHEN OTHERS THEN
        -- Return error details
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Failed to create session: ' || SQLERRM,
            'error_code', 'DATABASE_ERROR'
        );
    END;
END;
$$;

-- Create or replace session validation function
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
    WHERE id = p_session_id 
    AND session_token = p_session_token;

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
        -- Mark session as expired
        UPDATE table_sessions 
        SET status = 'expired' 
        WHERE id = p_session_id;

        RETURN json_build_object(
            'success', FALSE,
            'error', 'Session has expired',
            'error_code', 'SESSION_EXPIRED'
        );
    END IF;

    -- Update last activity and extend expiry
    UPDATE table_sessions 
    SET last_activity = NOW(),
        expires_at = NOW() + INTERVAL '24 hours'
    WHERE id = p_session_id;

    -- Return success with session data
    RETURN json_build_object(
        'success', TRUE,
        'session', json_build_object(
            'id', v_session.id,
            'table_id', v_session.table_id,
            'customer_name', v_session.customer_name,
            'customer_phone', v_session.customer_phone,
            'customer_email', v_session.customer_email,
            'status', v_session.status,
            'expires_at', v_session.expires_at,
            'created_at', v_session.created_at
        )
    );
END;
$$;

-- Create function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Update expired sessions
    UPDATE table_sessions 
    SET status = 'expired'
    WHERE status = 'active' 
    AND expires_at < NOW();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    RETURN v_count;
END;
$$;

-- Create function to get session summary
CREATE OR REPLACE FUNCTION get_session_summary(p_session_id UUID)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_session RECORD;
    v_orders JSON;
    v_result JSON;
BEGIN
    -- Get session details
    SELECT s.*, t.table_number, r.name as restaurant_name
    INTO v_session
    FROM table_sessions s
    JOIN tables t ON s.table_id = t.id
    JOIN restaurants r ON t.restaurant_id = r.id
    WHERE s.id = p_session_id;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Session not found'
        );
    END IF;

    -- Get orders for this session
    SELECT COALESCE(json_agg(
        json_build_object(
            'id', o.id,
            'order_number', o.order_number,
            'status', o.status,
            'payment_status', o.payment_status,
            'total_amount', o.total_amount,
            'created_at', o.created_at,
            'items', o.items
        ) ORDER BY o.created_at DESC
    ), '[]'::json) INTO v_orders
    FROM orders o
    WHERE o.session_id = p_session_id;

    -- Build result
    RETURN json_build_object(
        'success', TRUE,
        'session', json_build_object(
            'id', v_session.id,
            'table_id', v_session.table_id,
            'table_number', v_session.table_number,
            'restaurant_name', v_session.restaurant_name,
            'customer_name', v_session.customer_name,
            'customer_phone', v_session.customer_phone,
            'customer_email', v_session.customer_email,
            'status', v_session.status,
            'total_amount', v_session.total_amount,
            'payment_mode', v_session.payment_mode,
            'counter_payment_pending', v_session.counter_payment_pending,
            'counter_payment_completed', v_session.counter_payment_completed,
            'can_close_session', v_session.can_close_session,
            'created_at', v_session.created_at,
            'expires_at', v_session.expires_at
        ),
        'orders', v_orders
    );
END;
$$;

-- Add some sample data to test with
DO $$
BEGIN
    -- Ensure we have at least one restaurant and table for testing
    IF NOT EXISTS (SELECT 1 FROM restaurants LIMIT 1) THEN
        INSERT INTO restaurants (id, name, description, is_active) 
        VALUES (gen_random_uuid(), 'Test Restaurant', 'A test restaurant for development', TRUE);
    END IF;

    -- Ensure we have tables
    IF NOT EXISTS (SELECT 1 FROM tables LIMIT 1) THEN
        INSERT INTO tables (id, restaurant_id, table_number, capacity, is_active)
        SELECT gen_random_uuid(), r.id, 1, 4, TRUE
        FROM restaurants r
        LIMIT 1;
    END IF;
END $$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_table_session TO authenticated, anon;
GRANT EXECUTE ON FUNCTION validate_session TO authenticated, anon;
GRANT EXECUTE ON FUNCTION cleanup_expired_sessions TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_session_summary TO authenticated, anon;

-- Create a trigger to automatically cleanup expired sessions
CREATE OR REPLACE FUNCTION trigger_cleanup_expired_sessions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Cleanup expired sessions when new session is created
    PERFORM cleanup_expired_sessions();
    RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS cleanup_expired_sessions_trigger ON table_sessions;
CREATE TRIGGER cleanup_expired_sessions_trigger
    AFTER INSERT ON table_sessions
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_cleanup_expired_sessions();

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Session schema fix completed successfully';
    RAISE NOTICE 'Added status column and other missing fields to table_sessions';
    RAISE NOTICE 'Created session management functions';
    RAISE NOTICE 'Added indexes for better performance';
END $$;
