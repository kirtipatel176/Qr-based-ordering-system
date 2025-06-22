import { supabase } from "./supabase"
import { notificationService } from "./notifications"

export interface PaymentMethod {
  id: string
  method_name: string
  method_type: "card" | "upi" | "wallet" | "cash" | "bank_transfer"
  provider: string
  is_active: boolean
  configuration: any
}

export interface PaymentRequest {
  orderId?: string
  sessionId: string
  amount: number
  method: PaymentMethod
  customerPhone?: string
  tipAmount?: number
  splitData?: any
  paymentReference?: string
}

export interface PaymentResult {
  success: boolean
  transactionId?: string
  paymentId?: string
  error?: string
  receipt?: any
}

export class EnhancedPaymentService {
  async getAvailablePaymentMethods(restaurantId: string): Promise<PaymentMethod[]> {
    try {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .order("method_name")

      if (error) throw error
      return data || []
    } catch (error) {
      console.error("Error fetching payment methods:", error)
      return []
    }
  }

  async processPayment(paymentRequest: PaymentRequest): Promise<PaymentResult> {
    try {
      const { orderId, sessionId, amount, method, customerPhone, tipAmount = 0 } = paymentRequest

      // Calculate fees and net amount
      const paymentFee = this.calculatePaymentFee(amount, method.method_type)
      const netAmount = amount - paymentFee
      const totalWithTip = amount + tipAmount

      // Generate transaction ID
      const transactionId = this.generateTransactionId(method.method_type)

      // Process payment based on method type
      const paymentResult = await this.processPaymentByMethod(method, totalWithTip, paymentRequest)

      if (!paymentResult.success) {
        return paymentResult
      }

      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .insert({
          order_id: orderId,
          session_id: sessionId,
          payment_method: method.method_type,
          payment_provider: method.provider,
          payment_gateway: method.provider,
          transaction_id: transactionId,
          gateway_transaction_id: paymentResult.gatewayTransactionId,
          amount: totalWithTip,
          payment_fee: paymentFee,
          net_amount: netAmount,
          currency: "USD",
          payment_reference: paymentRequest.paymentReference,
          status: "completed",
          payment_data: {
            customer_phone: customerPhone,
            method_details: method,
            processed_at: new Date().toISOString(),
            tip_amount: tipAmount,
          },
        })
        .select()
        .single()

      if (paymentError) {
        throw new Error(`Payment record creation failed: ${paymentError.message}`)
      }

      // Record tip if provided
      if (tipAmount > 0) {
        await supabase.from("tips").insert({
          session_id: sessionId,
          payment_id: payment.id,
          tip_amount: tipAmount,
          tip_percentage: (tipAmount / amount) * 100,
        })
      }

      // Update order payment status if orderId provided
      if (orderId) {
        await supabase.from("orders").update({ payment_status: "paid" }).eq("id", orderId)
      }

      // Generate receipt
      const receipt = await this.generateEnhancedReceipt(payment.id)

      // Send notifications
      await this.sendPaymentNotifications(sessionId, orderId, transactionId, totalWithTip)

      return {
        success: true,
        transactionId,
        paymentId: payment.id,
        receipt,
      }
    } catch (error) {
      console.error("Payment processing error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Payment processing failed",
      }
    }
  }

  private async processPaymentByMethod(
    method: PaymentMethod,
    amount: number,
    request: PaymentRequest,
  ): Promise<{ success: boolean; gatewayTransactionId?: string; error?: string }> {
    switch (method.method_type) {
      case "card":
        return this.processCardPayment(method, amount, request)
      case "upi":
        return this.processUPIPayment(method, amount, request)
      case "wallet":
        return this.processWalletPayment(method, amount, request)
      case "cash":
        return this.processCashPayment(method, amount, request)
      case "bank_transfer":
        return this.processBankTransfer(method, amount, request)
      default:
        return { success: false, error: "Unsupported payment method" }
    }
  }

  private async processCardPayment(
    method: PaymentMethod,
    amount: number,
    request: PaymentRequest,
  ): Promise<{ success: boolean; gatewayTransactionId?: string; error?: string }> {
    // Simulate card payment processing
    // In production, integrate with Stripe, Square, etc.

    await new Promise((resolve) => setTimeout(resolve, 2000)) // Simulate processing time

    // Simulate random success/failure for demo
    const isSuccess = Math.random() > 0.1 // 90% success rate

    if (isSuccess) {
      return {
        success: true,
        gatewayTransactionId: `card_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      }
    } else {
      return {
        success: false,
        error: "Card payment declined. Please try another card.",
      }
    }
  }

  private async processUPIPayment(
    method: PaymentMethod,
    amount: number,
    request: PaymentRequest,
  ): Promise<{ success: boolean; gatewayTransactionId?: string; error?: string }> {
    // Simulate UPI payment processing
    await new Promise((resolve) => setTimeout(resolve, 1500))

    return {
      success: true,
      gatewayTransactionId: `upi_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    }
  }

  private async processWalletPayment(
    method: PaymentMethod,
    amount: number,
    request: PaymentRequest,
  ): Promise<{ success: boolean; gatewayTransactionId?: string; error?: string }> {
    // Simulate wallet payment processing
    await new Promise((resolve) => setTimeout(resolve, 1000))

    return {
      success: true,
      gatewayTransactionId: `wallet_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    }
  }

  private async processCashPayment(
    method: PaymentMethod,
    amount: number,
    request: PaymentRequest,
  ): Promise<{ success: boolean; gatewayTransactionId?: string; error?: string }> {
    // Cash payment is always successful (manual verification)
    return {
      success: true,
      gatewayTransactionId: `cash_${Date.now()}`,
    }
  }

  private async processBankTransfer(
    method: PaymentMethod,
    amount: number,
    request: PaymentRequest,
  ): Promise<{ success: boolean; gatewayTransactionId?: string; error?: string }> {
    // Bank transfer processing
    return {
      success: true,
      gatewayTransactionId: `bank_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    }
  }

  private calculatePaymentFee(amount: number, methodType: string): number {
    const feeRates = {
      card: 0.029, // 2.9%
      upi: 0.005, // 0.5%
      wallet: 0.02, // 2%
      cash: 0, // No fee
      bank_transfer: 0.01, // 1%
    }

    const rate = feeRates[methodType as keyof typeof feeRates] || 0
    return Math.round(amount * rate * 100) / 100
  }

  private generateTransactionId(methodType: string): string {
    const prefix = methodType.toUpperCase().substring(0, 3)
    const timestamp = Date.now().toString().slice(-8)
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `${prefix}${timestamp}${random}`
  }

  private async generateEnhancedReceipt(paymentId: string): Promise<any> {
    try {
      const { data: payment } = await supabase
        .from("payments")
        .select(`
          *,
          orders(*),
          table_sessions(*, tables(*))
        `)
        .eq("id", paymentId)
        .single()

      if (!payment) return null

      const receiptNumber = `RCP${Date.now()}`

      const receiptData = {
        session_id: payment.session_id,
        receipt_number: receiptNumber,
        customer_phone: payment.table_sessions?.customer_phone,
        total_amount: payment.amount,
        items: payment.orders?.items || [],
        payment_details: {
          method: payment.payment_method,
          provider: payment.payment_provider,
          transaction_id: payment.transaction_id,
          payment_fee: payment.payment_fee,
          net_amount: payment.net_amount,
          tip_amount: payment.payment_data?.tip_amount || 0,
        },
        receipt_data: {
          restaurant_name: "Delicious Bites Restaurant",
          table_number: payment.table_sessions?.tables?.table_number,
          customer_name: payment.table_sessions?.customer_name,
          generated_at: new Date().toISOString(),
        },
      }

      const { data: receipt } = await supabase.from("receipts").insert(receiptData).select().single()

      return receipt
    } catch (error) {
      console.error("Receipt generation error:", error)
      return null
    }
  }

  private async sendPaymentNotifications(
    sessionId: string,
    orderId: string | undefined,
    transactionId: string,
    amount: number,
  ): Promise<void> {
    await notificationService.createNotification(
      sessionId,
      orderId || null,
      "payment_received",
      "Payment Successful",
      `Payment of $${amount.toFixed(2)} received successfully. Transaction ID: ${transactionId}`,
    )
  }

  async processSessionPayment(sessionId: string, tipAmount = 0): Promise<PaymentResult> {
    try {
      // Get all unpaid orders for the session
      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .eq("session_id", sessionId)
        .eq("payment_status", "unpaid")

      if (!orders || orders.length === 0) {
        return { success: false, error: "No unpaid orders found" }
      }

      const totalAmount = orders.reduce((sum, order) => sum + order.total_amount, 0)

      // Use cash payment method for session payment
      const cashMethod: PaymentMethod = {
        id: "cash",
        method_name: "Cash Payment",
        method_type: "cash",
        provider: "manual",
        is_active: true,
        configuration: {},
      }

      const result = await this.processPayment({
        sessionId,
        amount: totalAmount,
        method: cashMethod,
        tipAmount,
      })

      if (result.success) {
        // Mark all orders as paid
        await supabase
          .from("orders")
          .update({ payment_status: "paid" })
          .eq("session_id", sessionId)
          .eq("payment_status", "unpaid")
      }

      return result
    } catch (error) {
      console.error("Session payment error:", error)
      return { success: false, error: "Session payment failed" }
    }
  }

  async splitPayment(sessionId: string, splitData: any): Promise<PaymentResult> {
    try {
      // Create payment split record
      const { data: split } = await supabase
        .from("payment_splits")
        .insert({
          session_id: sessionId,
          split_type: splitData.type,
          total_amount: splitData.totalAmount,
          split_data: splitData.splits,
        })
        .select()
        .single()

      // Process individual payments based on split
      const results = []
      for (const splitItem of splitData.splits) {
        const result = await this.processPayment({
          sessionId,
          amount: splitItem.amount,
          method: splitItem.paymentMethod,
          customerPhone: splitItem.customerPhone,
          paymentReference: `SPLIT_${split.id}_${splitItem.id}`,
        })
        results.push(result)
      }

      const allSuccessful = results.every((r) => r.success)

      return {
        success: allSuccessful,
        transactionId: results.map((r) => r.transactionId).join(","),
        error: allSuccessful ? undefined : "Some payments failed",
      }
    } catch (error) {
      console.error("Split payment error:", error)
      return { success: false, error: "Split payment failed" }
    }
  }
}

export const enhancedPaymentService = new EnhancedPaymentService()
