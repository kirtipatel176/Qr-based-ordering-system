import { supabase } from "@/lib/supabase"
import { enhancedPaymentService } from "@/lib/enhanced-payment"

export interface PaymentOption {
  id: string
  type: "online" | "counter"
  title: string
  description: string
  icon: string
  available: boolean
  reason?: string
}

export interface CounterPaymentRequest {
  sessionId: string
  orderIds: string[]
  receivedBy: string
  notes?: string
}

export interface SessionTerminationRequest {
  sessionId: string
  terminatedBy: string
  reason?: string
  notes?: string
}

export class DualPaymentService {
  async getPaymentOptions(sessionId: string, hasUnpaidOrders: boolean): Promise<PaymentOption[]> {
    const options: PaymentOption[] = [
      {
        id: "online",
        type: "online",
        title: "Pay All Orders Online",
        description: "Pay for all unpaid orders using card, UPI, or wallet",
        icon: "💳",
        available: hasUnpaidOrders,
        reason: hasUnpaidOrders ? undefined : "No unpaid orders",
      },
      {
        id: "counter",
        type: "counter",
        title: "Pay at Counter (Cash)",
        description: "Pay with cash at the counter when leaving",
        icon: "💵",
        available: hasUnpaidOrders,
        reason: hasUnpaidOrders ? undefined : "No unpaid orders",
      },
    ]

    return options
  }

  async processOnlinePayment(sessionId: string): Promise<{ success: boolean; error?: string; transactionId?: string }> {
    try {
      // Get all unpaid orders for the session
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .eq("session_id", sessionId)
        .eq("payment_status", "unpaid")

      if (ordersError) throw ordersError

      if (!orders || orders.length === 0) {
        return { success: false, error: "No unpaid orders found" }
      }

      const totalAmount = orders.reduce((sum, order) => sum + order.total_amount, 0)

      // Use enhanced payment service for online payment
      const result = await enhancedPaymentService.processSessionPayment(sessionId, 0)

      if (result.success) {
        // Update session payment preference
        await supabase
          .from("table_sessions")
          .update({
            preferred_payment_mode: "online_payment",
            counter_payment_pending: false,
          })
          .eq("id", sessionId)

        return {
          success: true,
          transactionId: result.transactionId,
        }
      } else {
        return { success: false, error: result.error }
      }
    } catch (error) {
      console.error("Online payment error:", error)
      return { success: false, error: "Online payment failed" }
    }
  }

  async selectCounterPayment(sessionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Mark session for counter payment
      const { error } = await supabase
        .from("table_sessions")
        .update({
          preferred_payment_mode: "cash_counter",
          counter_payment_pending: true,
        })
        .eq("id", sessionId)

      if (error) throw error

      // Create notification for staff
      await supabase.from("notifications").insert({
        session_id: sessionId,
        type: "counter_payment_pending",
        title: "Counter Payment Pending",
        message: "Customer has selected to pay at counter",
        is_read: false,
      })

      return { success: true }
    } catch (error) {
      console.error("Counter payment selection error:", error)
      return { success: false, error: "Failed to select counter payment" }
    }
  }

  async processCounterPayment(
    request: CounterPaymentRequest,
  ): Promise<{ success: boolean; error?: string; receiptNumber?: string }> {
    try {
      const { data, error } = await supabase.rpc("process_counter_payment", {
        p_session_id: request.sessionId,
        p_order_ids: request.orderIds,
        p_received_by: request.receivedBy,
        p_notes: request.notes,
      })

      if (error) throw error

      const result = data as any

      if (result.success) {
        return {
          success: true,
          receiptNumber: result.receipt_number,
        }
      } else {
        return { success: false, error: result.error }
      }
    } catch (error) {
      console.error("Counter payment processing error:", error)
      return { success: false, error: "Counter payment processing failed" }
    }
  }

  async terminateSession(
    request: SessionTerminationRequest,
  ): Promise<{ success: boolean; error?: string; sessionData?: any }> {
    try {
      const { data, error } = await supabase.rpc("terminate_session_manually", {
        p_session_id: request.sessionId,
        p_terminated_by: request.terminatedBy,
        p_reason: request.reason,
        p_notes: request.notes,
      })

      if (error) throw error

      const result = data as any

      if (result.success) {
        return {
          success: true,
          sessionData: result,
        }
      } else {
        return { success: false, error: result.error }
      }
    } catch (error) {
      console.error("Session termination error:", error)
      return { success: false, error: "Session termination failed" }
    }
  }

  async getCounterPaymentSessions(): Promise<any[]> {
    try {
      const { data: sessions, error } = await supabase
        .from("table_sessions")
        .select(`
          *,
          tables (table_number),
          orders (
            id, order_number, total_amount, payment_status, created_at
          )
        `)
        .eq("status", "active")
        .eq("counter_payment_pending", true)
        .order("created_at", { ascending: false })

      if (error) throw error

      return sessions || []
    } catch (error) {
      console.error("Error fetching counter payment sessions:", error)
      return []
    }
  }

  async getSessionPaymentHistory(sessionId: string): Promise<any[]> {
    try {
      const { data: payments, error } = await supabase
        .from("counter_payments")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })

      if (error) throw error

      return payments || []
    } catch (error) {
      console.error("Error fetching payment history:", error)
      return []
    }
  }
}

export const dualPaymentService = new DualPaymentService()
