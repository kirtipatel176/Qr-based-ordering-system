import { supabase } from "./supabase"

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  createdAt: string
  isRead?: boolean
}

export class NotificationService {
  private listeners: Map<string, (notification: Notification) => void> = new Map()

  async sendOrderNotification(
    sessionId: string,
    orderId: string,
    type: "order_placed" | "order_confirmed" | "order_preparing" | "order_ready" | "order_delivered",
    orderNumber: string,
  ): Promise<void> {
    const messages = {
      order_placed: `Order #${orderNumber} has been placed successfully!`,
      order_confirmed: `Order #${orderNumber} has been confirmed by the kitchen.`,
      order_preparing: `Order #${orderNumber} is now being prepared.`,
      order_ready: `Order #${orderNumber} is ready for pickup!`,
      order_delivered: `Order #${orderNumber} has been delivered. Enjoy your meal!`,
    }

    const titles = {
      order_placed: "Order Placed",
      order_confirmed: "Order Confirmed",
      order_preparing: "Preparing Your Order",
      order_ready: "Order Ready",
      order_delivered: "Order Delivered",
    }

    await this.createNotification(sessionId, orderId, type, titles[type], messages[type])
  }

  async createNotification(
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

      const { data: notification } = await supabase
        .from("notifications")
        .insert({
          session_id: sessionId,
          order_id: orderId,
          type,
          title,
          message,
          phone_number: session?.customer_phone,
        })
        .select()
        .single()

      // Trigger real-time notification
      if (notification) {
        this.triggerNotification(sessionId, {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          createdAt: notification.created_at,
        })
      }
    } catch (error) {
      console.error("Create notification error:", error)
    }
  }

  subscribeToNotifications(sessionId: string, callback: (notification: Notification) => void): () => void {
    this.listeners.set(sessionId, callback)

    // Set up real-time subscription
    const subscription = supabase
      .channel(`notifications-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const notification: Notification = {
            id: payload.new.id,
            type: payload.new.type,
            title: payload.new.title,
            message: payload.new.message,
            createdAt: payload.new.created_at,
          }
          callback(notification)
        },
      )
      .subscribe()

    return () => {
      this.listeners.delete(sessionId)
      subscription.unsubscribe()
    }
  }

  private triggerNotification(sessionId: string, notification: Notification): void {
    const callback = this.listeners.get(sessionId)
    if (callback) {
      callback(notification)
    }
  }

  async getNotifications(sessionId: string): Promise<Notification[]> {
    try {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })

      return (
        data?.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          createdAt: n.created_at,
        })) || []
      )
    } catch (error) {
      console.error("Get notifications error:", error)
      return []
    }
  }
}

export const notificationService = new NotificationService()
