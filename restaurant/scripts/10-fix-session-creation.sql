-- Fix session creation issues
-- First, let's check the current table structure and fix any issues

-- Update table_sessions table to ensure all required fields exist
ALTER TABLE table_sessions 
ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS preferred_payment_mode VARCHAR(50) DEFAULT 'final_bill',
ADD COLUMN IF NOT EXISTS counter_payment_pending BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS counter_payment_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_close_session BOOLEAN DEFAULT TRUE;

-- Create customers table if it doesn't exist
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    loyalty_points INTEGER DEFAULT 0,
    total_visits INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint on phone if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'customers_phone_unique'
    ) THEN
        ALTER TABLE customers ADD CONSTRAINT customers_phone_unique UNIQUE (phone);
    END IF;
END $$;

-- Create function to safely create a new session
CREATE OR REPLACE FUNCTION create_table_session(
    p_table_id UUID,
    p_session_token VARCHAR(255),
    p_customer_name VARCHAR(255),
    p_customer_phone VARCHAR(20) DEFAULT NULL,
    p_customer_email VARCHAR(255) DEFAULT NULL,
    p_customer_id UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_session_id UUID;
    v_result JSON;
BEGIN
    -- Check if table exists and is active
    IF NOT EXISTS (
        SELECT 1 FROM tables 
        WHERE id = p_table_id AND is_active = TRUE
    ) THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Table not found or inactive'
        );
    END IF;

    -- Close any existing active sessions for this table
    UPDATE table_sessions 
    SET status = 'completed', 
        closed_at = NOW(),
        closure_reason = 'New session started'
    WHERE table_id = p_table_id 
    AND status = 'active';

    -- Create new session
    INSERT INTO table_sessions (
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
        last_accessed
    ) VALUES (
        p_table_id,
        p_session_token,
        p_customer_name,
        p_customer_phone,
        p_customer_email,
        p_customer_id,
        'final_bill',
        'final_bill',
        'active',
        0,
        FALSE,
        FALSE,
        TRUE,
        NOW(),
        NOW()
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
            'error_code', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_table_session TO anon, authenticated;
