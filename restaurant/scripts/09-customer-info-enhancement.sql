-- Add customer information fields to table_sessions
ALTER TABLE table_sessions 
ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS counter_payment_pending BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS counter_payment_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_close_session BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS preferred_payment_mode VARCHAR(50) DEFAULT 'final_bill';

-- Create counter_payments table for tracking cash payments
CREATE TABLE IF NOT EXISTS counter_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES table_sessions(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'cash',
  processed_by VARCHAR(255),
  receipt_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create session_closures table for audit trail
CREATE TABLE IF NOT EXISTS session_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES table_sessions(id) ON DELETE CASCADE,
  closed_by VARCHAR(255),
  closure_reason VARCHAR(255) DEFAULT 'payment_completed',
  final_amount DECIMAL(10,2),
  payment_method VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update existing sessions to have proper defaults
UPDATE table_sessions 
SET 
  counter_payment_pending = FALSE,
  counter_payment_completed = FALSE,
  can_close_session = TRUE,
  preferred_payment_mode = 'final_bill'
WHERE counter_payment_pending IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_counter_payments_session_id ON counter_payments(session_id);
CREATE INDEX IF NOT EXISTS idx_session_closures_session_id ON session_closures(session_id);
CREATE INDEX IF NOT EXISTS idx_table_sessions_counter_payment ON table_sessions(counter_payment_pending, counter_payment_completed);

-- Function to process counter payment
CREATE OR REPLACE FUNCTION process_counter_payment(
  p_session_id UUID,
  p_amount DECIMAL(10,2),
  p_processed_by VARCHAR(255),
  p_notes TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_receipt_number VARCHAR(100);
  v_result JSON;
BEGIN
  -- Generate receipt number
  v_receipt_number := 'RCP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('receipt_sequence')::TEXT, 4, '0');
  
  -- Insert counter payment record
  INSERT INTO counter_payments (
    session_id, amount, processed_by, receipt_number, notes
  ) VALUES (
    p_session_id, p_amount, p_processed_by, v_receipt_number, p_notes
  );
  
  -- Update session status
  UPDATE table_sessions 
  SET 
    counter_payment_completed = TRUE,
    can_close_session = TRUE,
    updated_at = NOW()
  WHERE id = p_session_id;
  
  -- Update order payment status
  UPDATE orders 
  SET 
    payment_status = 'paid',
    payment_method = 'cash',
    updated_at = NOW()
  WHERE session_id = p_session_id AND payment_status = 'unpaid';
  
  v_result := json_build_object(
    'success', true,
    'receipt_number', v_receipt_number,
    'message', 'Payment processed successfully'
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- Function to close session manually
CREATE OR REPLACE FUNCTION close_session_manually(
  p_session_id UUID,
  p_closed_by VARCHAR(255),
  p_notes TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_session_data RECORD;
  v_result JSON;
BEGIN
  -- Get session data
  SELECT * INTO v_session_data
  FROM table_sessions 
  WHERE id = p_session_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Session not found'
    );
  END IF;
  
  -- Check if session can be closed
  IF NOT v_session_data.can_close_session THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Session cannot be closed yet'
    );
  END IF;
  
  -- Insert closure record
  INSERT INTO session_closures (
    session_id, closed_by, final_amount, payment_method, notes
  ) VALUES (
    p_session_id, p_closed_by, v_session_data.total_amount, 
    CASE WHEN v_session_data.counter_payment_completed THEN 'cash' ELSE 'digital' END,
    p_notes
  );
  
  -- Update session status
  UPDATE table_sessions 
  SET 
    status = 'completed',
    updated_at = NOW()
  WHERE id = p_session_id;
  
  v_result := json_build_object(
    'success', true,
    'message', 'Session closed successfully'
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- Create receipt sequence if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS receipt_sequence START 1;
