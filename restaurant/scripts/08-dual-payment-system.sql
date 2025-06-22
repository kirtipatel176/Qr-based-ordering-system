-- Enhanced payment system with dual payment modes
-- Add payment mode tracking and counter payment support

-- Add payment mode enum
DO $$ BEGIN
    CREATE TYPE payment_mode_enum AS ENUM ('online_payment', 'cash_counter');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update table_sessions to track payment preference
ALTER TABLE table_sessions 
ADD COLUMN IF NOT EXISTS preferred_payment_mode payment_mode_enum DEFAULT 'online_payment',
ADD COLUMN IF NOT EXISTS counter_payment_pending boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS manager_notes text,
ADD COLUMN IF NOT EXISTS terminated_by varchar(255),
ADD COLUMN IF NOT EXISTS termination_reason text,
ADD COLUMN IF NOT EXISTS terminated_at timestamp with time zone;

-- Create counter payments tracking table
CREATE TABLE IF NOT EXISTS counter_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid REFERENCES table_sessions(id) ON DELETE CASCADE,
    order_ids uuid[] NOT NULL,
    total_amount decimal(10,2) NOT NULL,
    payment_method varchar(50) DEFAULT 'cash',
    received_by varchar(255) NOT NULL,
    received_at timestamp with time zone DEFAULT now(),
    notes text,
    receipt_number varchar(100),
    created_at timestamp with time zone DEFAULT now()
);

-- Create session termination log
CREATE TABLE IF NOT EXISTS session_terminations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid REFERENCES table_sessions(id) ON DELETE CASCADE,
    terminated_by varchar(255) NOT NULL,
    termination_type varchar(50) NOT NULL, -- 'manager_manual', 'customer_complete', 'auto_timeout'
    reason text,
    final_amount decimal(10,2),
    payment_status varchar(50),
    notes text,
    terminated_at timestamp with time zone DEFAULT now()
);

-- Function to process counter payment
CREATE OR REPLACE FUNCTION process_counter_payment(
    p_session_id uuid,
    p_order_ids uuid[],
    p_received_by varchar(255),
    p_notes text DEFAULT NULL
) RETURNS json AS $$
DECLARE
    v_total_amount decimal(10,2) := 0;
    v_receipt_number varchar(100);
    v_counter_payment_id uuid;
    v_order_id uuid;
BEGIN
    -- Calculate total amount from orders
    SELECT COALESCE(SUM(total_amount), 0) INTO v_total_amount
    FROM orders 
    WHERE id = ANY(p_order_ids) AND session_id = p_session_id;
    
    -- Generate receipt number
    v_receipt_number := 'CTR' || to_char(now(), 'YYYYMMDD') || '-' || LPAD(nextval('receipt_sequence')::text, 4, '0');
    
    -- Create counter payment record
    INSERT INTO counter_payments (
        session_id, order_ids, total_amount, received_by, notes, receipt_number
    ) VALUES (
        p_session_id, p_order_ids, v_total_amount, p_received_by, p_notes, v_receipt_number
    ) RETURNING id INTO v_counter_payment_id;
    
    -- Update orders as paid
    FOREACH v_order_id IN ARRAY p_order_ids
    LOOP
        UPDATE orders 
        SET payment_status = 'paid', 
            payment_method = 'cash_counter',
            paid_at = now()
        WHERE id = v_order_id;
    END LOOP;
    
    -- Update session counter payment status
    UPDATE table_sessions 
    SET counter_payment_pending = false
    WHERE id = p_session_id;
    
    RETURN json_build_object(
        'success', true,
        'payment_id', v_counter_payment_id,
        'receipt_number', v_receipt_number,
        'total_amount', v_total_amount
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- Function to manually terminate session
CREATE OR REPLACE FUNCTION terminate_session_manually(
    p_session_id uuid,
    p_terminated_by varchar(255),
    p_reason text DEFAULT NULL,
    p_notes text DEFAULT NULL
) RETURNS json AS $$
DECLARE
    v_session_data record;
    v_unpaid_orders integer;
BEGIN
    -- Get session data
    SELECT * INTO v_session_data
    FROM table_sessions 
    WHERE id = p_session_id AND status = 'active';
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Session not found or already terminated'
        );
    END IF;
    
    -- Check for unpaid orders
    SELECT COUNT(*) INTO v_unpaid_orders
    FROM orders 
    WHERE session_id = p_session_id AND payment_status = 'unpaid';
    
    -- Update session status
    UPDATE table_sessions 
    SET status = 'completed',
        terminated_by = p_terminated_by,
        termination_reason = p_reason,
        terminated_at = now(),
        manager_notes = p_notes
    WHERE id = p_session_id;
    
    -- Log termination
    INSERT INTO session_terminations (
        session_id, terminated_by, termination_type, reason, 
        final_amount, payment_status, notes
    ) VALUES (
        p_session_id, p_terminated_by, 'manager_manual', p_reason,
        v_session_data.total_amount, 
        CASE WHEN v_unpaid_orders > 0 THEN 'partial' ELSE 'complete' END,
        p_notes
    );
    
    RETURN json_build_object(
        'success', true,
        'session_id', p_session_id,
        'unpaid_orders', v_unpaid_orders,
        'final_amount', v_session_data.total_amount
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- Create receipt sequence if not exists
CREATE SEQUENCE IF NOT EXISTS receipt_sequence START 1;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_counter_payments_session ON counter_payments(session_id);
CREATE INDEX IF NOT EXISTS idx_session_terminations_session ON session_terminations(session_id);
CREATE INDEX IF NOT EXISTS idx_table_sessions_payment_mode ON table_sessions(preferred_payment_mode);
CREATE INDEX IF NOT EXISTS idx_table_sessions_counter_pending ON table_sessions(counter_payment_pending);
