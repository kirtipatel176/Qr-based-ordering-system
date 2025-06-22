import { supabase } from "./supabase"

export interface PaymentData {
  orderId: string
  sessionId: string
  amount: number
  method: "card" | "upi" | "wallet" | "cash"
  customerPhone?: string
}

export interface Receipt {
  id: string
  receiptNumber: string
  customerPhone?: string
  totalAmount: number
  items: any[]
  paymentDetails: any
  createdAt: string
}

export class PaymentService {
  async processPayment(
    paymentData: PaymentData,
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      // Simulate payment processing
      const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

      // Create payment record
      const { data: payment, error } = await supabase
        .from("payments")
        .insert({
          order_id: paymentData.orderId,
          session_id: paymentData.sessionId,
          payment_method: paymentData.method,
          transaction_id: transactionId,
          amount: paymentData.amount,
          status: "completed",
          payment_data: {
            customer_phone: paymentData.customerPhone,
            processed_at: new Date().toISOString(),
          },
        })
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      // Update order payment status
      await supabase.from("orders").update({ payment_status: "paid" }).eq("id", paymentData.orderId)

      // Send payment notification
      await this.sendPaymentNotification(paymentData.sessionId, paymentData.orderId, transactionId)

      return { success: true, transactionId }
    } catch (error) {
      console.error("Payment processing error:", error)
      return { success: false, error: "Payment processing failed" }
    }
  }

  async generateReceipt(sessionId: string): Promise<{ success: boolean; receipt?: Receipt; error?: string }> {
    try {
      // Get session and orders
      const { data: session } = await supabase.from("table_sessions").select("*").eq("id", sessionId).single()

      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .eq("session_id", sessionId)
        .eq("payment_status", "paid")

      if (!session || !orders?.length) {
        return { success: false, error: "No paid orders found" }
      }

      const receiptNumber = `RCP${Date.now()}`
      const totalAmount = orders.reduce((sum, order) => sum + order.total_amount, 0)
      const allItems = orders.flatMap((order) => order.items)

      const receiptData = {
        session_id: sessionId,
        receipt_number: receiptNumber,
        customer_phone: session.customer_phone,
        total_amount: totalAmount,
        items: allItems,
        payment_details: {
          orders: orders.map((o) => ({
            order_number: o.order_number,
            amount: o.total_amount,
            items: o.items.length,
          })),
        },
        receipt_data: {
          restaurant_name: "Delicious Bites Restaurant",
          table_number: session.table_id,
          customer_name: session.customer_name,
          generated_at: new Date().toISOString(),
        },
      }

      const { data: receipt, error } = await supabase.from("receipts").insert(receiptData).select().single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, receipt }
    } catch (error) {
      console.error("Receipt generation error:", error)
      return { success: false, error: "Failed to generate receipt" }
    }
  }

  async sendReceiptSMS(receiptId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: receipt } = await supabase.from("receipts").select("*").eq("id", receiptId).single()

      if (!receipt || !receipt.customer_phone) {
        return { success: false, error: "No phone number found" }
      }

      // Simulate SMS sending
      console.log(`Sending receipt to ${receipt.customer_phone}:`)
      console.log(`Receipt #${receipt.receipt_number}`)
      console.log(`Total: $${receipt.total_amount}`)
      console.log(`Download: ${window.location.origin}/receipt/${receipt.id}`)

      // In a real app, integrate with SMS service like Twilio
      await this.sendNotification(
        receipt.session_id,
        null,
        "receipt_sent",
        "Receipt Sent",
        `Your receipt #${receipt.receipt_number} has been sent to your phone.`,
      )

      return { success: true }
    } catch (error) {
      console.error("SMS sending error:", error)
      return { success: false, error: "Failed to send SMS" }
    }
  }

  private async sendPaymentNotification(sessionId: string, orderId: string, transactionId: string): Promise<void> {
    await this.sendNotification(
      sessionId,
      orderId,
      "payment_received",
      "Payment Successful",
      `Payment received successfully. Transaction ID: ${transactionId}`,
    )
  }

  private async sendNotification(
    sessionId: string,
    orderId: string | null,
    type: string,
    title: string,
    message: string,
  ): Promise<void> {
    try {
      const { data: session } = await supabase
        .from("table_sessions")
        .select("customer_phone")
        .eq("id", sessionId)
        .single()

      await supabase.from("notifications").insert({
        session_id: sessionId,
        order_id: orderId,
        type,
        title,
        message,
        phone_number: session?.customer_phone,
      })
    } catch (error) {
      console.error("Notification error:", error)
    }
  }
}

export const paymentService = new PaymentService()
