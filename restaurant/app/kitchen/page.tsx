"use client"

import { useState, useEffect } from "react"
import { ChefHat, Clock, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase, type Order } from "@/lib/supabase"
import { authService, type Employee } from "@/lib/auth"
import { notificationService } from "@/lib/notifications"

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  // Add authentication state
  const [currentUser, setCurrentUser] = useState<Employee | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
        *,
        table_sessions!inner(
          table_id,
          customer_name,
          tables!inner(table_number)
        )
      `)
        .in("status", ["pending", "confirmed", "preparing"])
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Error fetching kitchen orders:", error.message)
        return
      }

      setOrders(data || [])
    } catch (error) {
      console.error("Unexpected error fetching orders:", error)
    } finally {
      setLoading(false)
    }
  }

  // Update useEffect for authentication
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const user = await authService.getCurrentUser()
    if (user && authService.isEmployee()) {
      setCurrentUser(user as Employee)
      setIsAuthenticated(true)
      fetchOrders()
      setupRealTimeUpdates()
    } else {
      window.location.href = "/login"
    }
  }

  const setupRealTimeUpdates = () => {
    // Set up real-time subscription with better error handling
    const subscription = supabase
      .channel("kitchen-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: "status=in.(pending,confirmed,preparing)",
        },
        (payload) => {
          console.log("Real-time order update:", payload)
          fetchOrders() // Refetch all orders when any order changes
        },
      )
      .subscribe((status) => {
        console.log("Kitchen subscription status:", status)
      })

    return () => {
      subscription.unsubscribe()
    }
  }

  // Update the updateOrderStatus function to send notifications
  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { data: order } = await supabase
        .from("orders")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", orderId)
        .select("*, table_sessions(*)")
        .single()

      if (order) {
        // Send notification to customer
        await notificationService.sendOrderNotification(
          order.table_sessions?.table_id,
          order.id,
          status as any,
          order.order_number,
        )
      }

      fetchOrders()
    } catch (error) {
      console.error("Error updating order status:", error)
    }
  }

  const getTimeElapsed = (createdAt: string) => {
    const now = new Date()
    const created = new Date(createdAt)
    const diffInMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60))
    return diffInMinutes
  }

  const filterOrdersByStatus = (status: string) => {
    return orders.filter((order) => order.status === status)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <ChefHat className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Kitchen Display System</h1>
              <p className="text-muted-foreground">Welcome, {currentUser?.full_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-lg px-3 py-1">
              {orders.length} Active Orders
            </Badge>
            <Button
              variant="outline"
              onClick={() => {
                authService.logout()
                window.location.href = "/login"
              }}
            >
              Logout
            </Button>
          </div>
        </div>

        {/* Order Status Tabs */}
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Pending ({filterOrdersByStatus("pending").length})
            </TabsTrigger>
            <TabsTrigger value="confirmed" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Confirmed ({filterOrdersByStatus("confirmed").length})
            </TabsTrigger>
            <TabsTrigger value="preparing" className="flex items-center gap-2">
              <ChefHat className="h-4 w-4" />
              Preparing ({filterOrdersByStatus("preparing").length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterOrdersByStatus("pending").map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onUpdateStatus={updateOrderStatus}
                  timeElapsed={getTimeElapsed(order.created_at)}
                />
              ))}
              {filterOrdersByStatus("pending").length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">No pending orders</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="confirmed">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterOrdersByStatus("confirmed").map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onUpdateStatus={updateOrderStatus}
                  timeElapsed={getTimeElapsed(order.created_at)}
                />
              ))}
              {filterOrdersByStatus("confirmed").length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">No confirmed orders</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="preparing">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterOrdersByStatus("preparing").map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onUpdateStatus={updateOrderStatus}
                  timeElapsed={getTimeElapsed(order.created_at)}
                />
              ))}
              {filterOrdersByStatus("preparing").length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">No orders being prepared</div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

interface OrderCardProps {
  order: any
  onUpdateStatus: (orderId: string, status: string) => void
  timeElapsed: number
}

function OrderCard({ order, onUpdateStatus, timeElapsed }: OrderCardProps) {
  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case "pending":
        return "confirmed"
      case "confirmed":
        return "preparing"
      case "preparing":
        return "ready"
      default:
        return currentStatus
    }
  }

  const getNextStatusLabel = (currentStatus: string) => {
    switch (currentStatus) {
      case "pending":
        return "Confirm Order"
      case "confirmed":
        return "Start Preparing"
      case "preparing":
        return "Mark Ready"
      default:
        return "Update"
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500 text-yellow-50"
      case "confirmed":
        return "bg-blue-500 text-blue-50"
      case "preparing":
        return "bg-orange-500 text-orange-50"
      case "ready":
        return "bg-green-500 text-green-50"
      default:
        return "bg-gray-500 text-gray-50"
    }
  }

  return (
    <Card className={`${timeElapsed > 15 ? "border-red-500 border-2" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Order #{order.order_number}</CardTitle>
          <Badge className={getStatusBadgeColor(order.status)}>{order.status.toUpperCase()}</Badge>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Table {order.table_sessions?.tables?.table_number}</span>
          <span className={timeElapsed > 15 ? "text-red-500 font-semibold" : ""}>{timeElapsed}m ago</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {order.items.map((item: any, index: number) => (
            <div key={index} className="flex justify-between items-start">
              <div className="flex-1">
                <div className="font-medium">{item.name}</div>
                <div className="text-sm text-muted-foreground">Qty: {item.quantity}</div>
                {Object.keys(item.customizations || {}).length > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {Object.entries(item.customizations)
                      .filter(([_, selected]) => selected)
                      .map(([name]) => name)
                      .join(", ")}
                  </div>
                )}
                {item.instructions && <div className="text-xs text-blue-600 mt-1">Note: {item.instructions}</div>}
              </div>
            </div>
          ))}
        </div>

        {order.special_instructions && (
          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
            <div className="text-sm font-medium text-yellow-800">Special Instructions:</div>
            <div className="text-sm text-yellow-700">{order.special_instructions}</div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => onUpdateStatus(order.id, getNextStatus(order.status))}
            className="flex-1"
            variant={order.status === "preparing" ? "default" : "outline"}
          >
            {getNextStatusLabel(order.status)}
          </Button>
          {order.status !== "pending" && (
            <Button onClick={() => onUpdateStatus(order.id, "cancelled")} variant="destructive" size="sm">
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
