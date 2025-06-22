-- Fix session persistence and add proper session management
-- This script ensures all session-related database operations work correctly

-- Update table_sessions table to include all required fields
ALTER TABLE table_sessions 
ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS session_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
ADD COLUMN IF NOT EXISTS device_info JSONB DEFAULT '{}';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_table_sessions_expires_at ON table_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_table_sessions_last_activity ON table_sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_table_sessions_customer_phone ON table_sessions(customer_phone);

-- Function to create session with proper validation
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
    v_restaurant_id UUID;
    v_result JSON;
BEGIN
    -- Check if table exists and is active
    SELECT EXISTS(
        SELECT 1 FROM tables 
        WHERE id = p_table_id AND status = 'active'
    ), restaurant_id INTO v_table_exists, v_restaurant_id
    FROM tables WHERE id = p_table_id;
    
    IF NOT v_table_exists THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Table not found or inactive',
            'error_code', 'TABLE_NOT_FOUND'
        );
    END IF;
    
    -- Generate new session ID
    v_session_id := gen_random_uuid();
    
    -- Insert new session
    INSERT INTO table_sessions (
        id,
        table_id,
        session_token,
        customer_name,
        customer_phone,
        customer_email,
        customer_id,
        status,
        created_at,
        last_activity,
        expires_at,
        session_data
    ) VALUES (
        v_session_id,
        p_table_id,
        p_session_token,
        p_customer_name,
        p_customer_phone,
        p_customer_email,
        p_customer_id,
        'active',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP + INTERVAL '24 hours',
        json_build_object(
            'created_by', 'qr_scan',
            'user_agent', 'web_app'
        )
    );
    
    -- Return success with session details
    RETURN json_build_object(
        'success', true,
        'session_id', v_session_id,
        'session_token', p_session_token,
        'expires_at', (CURRENT_TIMESTAMP + INTERVAL '24 hours')::text,
        'restaurant_id', v_restaurant_id
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'error_code', 'DATABASE_ERROR'
        );
END;
$$;

-- Function to validate and refresh session
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
    SELECT 
        ts.*,
        t.table_number,
        t.restaurant_id,
        r.name as restaurant_name
    INTO v_session
    FROM table_sessions ts
    JOIN tables t ON ts.table_id = t.id
    JOIN restaurants r ON t.restaurant_id = r.id
    WHERE ts.id = p_session_id 
    AND ts.session_token = p_session_token
    AND ts.status = 'active';
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Session not found or expired',
            'error_code', 'SESSION_NOT_FOUND'
        );
    END IF;
    
    -- Check if session is expired
    IF v_session.expires_at < CURRENT_TIMESTAMP THEN
        -- Mark session as expired
        UPDATE table_sessions 
        SET status = 'expired' 
        WHERE id = p_session_id;
        
        RETURN json_build_object(
            'success', false,
            'error', 'Session has expired',
            'error_code', 'SESSION_EXPIRED'
        );
    END IF;
    
    -- Update last activity
    UPDATE table_sessions 
    SET last_activity = CURRENT_TIMESTAMP,
        expires_at = CURRENT_TIMESTAMP + INTERVAL '24 hours'
    WHERE id = p_session_id;
    
    -- Return session details
    RETURN json_build_object(
        'success', true,
        'session', json_build_object(
            'id', v_session.id,
            'table_id', v_session.table_id,
            'table_number', v_session.table_number,
            'restaurant_id', v_session.restaurant_id,
            'restaurant_name', v_session.restaurant_name,
            'customer_name', v_session.customer_name,
            'customer_phone', v_session.customer_phone,
            'customer_email', v_session.customer_email,
            'status', v_session.status,
            'created_at', v_session.created_at,
            'expires_at', (CURRENT_TIMESTAMP + INTERVAL '24 hours')::text
        )
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'error_code', 'DATABASE_ERROR'
        );
END;
$$;

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE table_sessions 
    SET status = 'expired'
    WHERE expires_at < CURRENT_TIMESTAMP 
    AND status = 'active';
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- Create a scheduled cleanup (if using pg_cron extension)
-- SELECT cron.schedule('cleanup-sessions', '0 * * * *', 'SELECT cleanup_expired_sessions();');
