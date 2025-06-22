"use client"

import { useState, useEffect, useRef } from "react" // CHANGED: Added useRef
import { Users, Phone, CreditCard, Clock, RefreshCw, Receipt, DollarSign } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { supabase, type TableSession, type Order } from "@/lib/supabase"
import { paymentService } from "@/lib/payment"

interface ActiveSession extends TableSession {
  table_number: string
  total_orders: number
  unpaid_orders: number
  last_order_time: string
  orders: Order[]
}

export default function CounterPage() {
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])
  const [loading, setLoading] = useState(true)
  // These states were not used, so they are commented out for cleanup.
  // If you need them later, you can re-enable them.
  // const [selectedSession, setSelectedSession] = useState<ActiveSession | null>(null)
  // const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  // const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<string | null>(null)

  // ADDED: Ref to prevent fetch race conditions from real-time updates
  const isFetching = useRef(false)

  useEffect(() => {
    fetchActiveSessions()
    const subscription = setupRealTimeUpdates()

    // Cleanup subscription on component unmount
    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [])

  const fetchActiveSessions = async () => {
    // ADDED: Check if a fetch is already in progress. If so, skip this one.
    if (isFetching.current) {
      return
    }

    try {
      // ADDED: Set the lock to true
      isFetching.current = true
      // Only set loading to true if the component is not already in a loading state
      if (!loading) setLoading(true)

      const { data: sessions, error } = await supabase
        .from("table_sessions")
        .select(`
          *,
          tables!inner(table_number),
          orders(*)
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching active sessions:", error)
        return
      }

      const processedSessions: ActiveSession[] = sessions.map((session: any) => {
        const orders = session.orders || []
        const unpaidOrders = orders.filter((order: Order) => order.payment_status === "unpaid")
        const lastOrder = [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

        return {
          ...session,
          table_number: session.tables.table_number,
          total_orders: orders.length,
          unpaid_orders: unpaidOrders.length,
          last_order_time: lastOrder ? lastOrder.created_at : session.created_at,
          orders: orders,
        }
      })

      setActiveSessions(processedSessions)
    } catch (error) {
      console.error("Unexpected error fetching sessions:", error)
    } finally {
      setLoading(false)
      // ADDED: Release the lock so the next fetch can run
      isFetching.current = false
    }
  }

  const setupRealTimeUpdates = () => {
    // A single channel can listen to multiple events
    const channel = supabase
      .channel("counter-page-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "table_sessions",
        },
        () => fetchActiveSessions()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => fetchActiveSessions()
      )
      .subscribe()

    return channel
  }

  const getSessionDuration = (createdAt: string) => {
    const now = new Date()
    const created = new Date(createdAt)
    const diffInMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60))

    if (diffInMinutes < 60) return `${diffInMinutes}m`
    const hours = Math.floor(diffInMinutes / 60)
    const minutes = diffInMinutes % 60
    return `${hours}h ${minutes}m`
  }

  const getPaymentStatusColor = (unpaidOrders: number, totalOrders: number) => {
    if (totalOrders === 0) return "bg-gray-100 text-gray-800"
    if (unpaidOrders === 0) return "bg-green-100 text-green-800"
    if (unpaidOrders === totalOrders) return "bg-red-100 text-red-800"
    return "bg-yellow-100 text-yellow-800"
  }

  const getPaymentStatusText = (unpaidOrders: number, totalOrders: number) => {
    if (totalOrders === 0) return "No Orders"
    if (unpaidOrders === 0) return "Fully Paid"
    if (unpaidOrders === totalOrders) return "Unpaid"
    return "Partially Paid"
  }

  const processSessionPayment = async (sessionId: string) => {
    try {
      const session = activeSessions.find((s) => s.id === sessionId)
      if (!session) return

      const unpaidOrders = session.orders.filter((order) => order.payment_status === "unpaid")

      for (const order of unpaidOrders) {
        await paymentService.processPayment({
          orderId: order.id,
          sessionId: sessionId,
          amount: order.total_amount,
          method: "cash", // Assuming 'cash' as a default for counter payment
          customerPhone: session.customer_phone,
        })
      }

      await paymentService.generateReceipt(sessionId)

      await supabase.from("table_sessions").update({ status: "completed" }).eq("id", sessionId)

      // The real-time listener will automatically call fetchActiveSessions,
      // so a manual call here is redundant and can be removed.
      // fetchActiveSessions() 
      
      // ASSIST: Using a toast notification here would be better than an alert.
      alert("Payment processed and session closed successfully!")
    } catch (error) {
      console.error("Error processing session payment:", error)
      alert("Error processing payment. Please check the console for details.")
    }
  }

  const closeSession = async (sessionId: string) => {
    // ASSIST: Using a Dialog from your UI library would be a better user experience than a native confirm.
    if (confirm("Are you sure you want to manually close this session? Any unpaid orders will remain unpaid.")) {
      try {
        await supabase.from("table_sessions").update({ status: "completed" }).eq("id", sessionId)
        // Real-time listener will handle the UI update.
        // fetchActiveSessions()
      } catch (error) {
        console.error("Error closing session:", error)
        alert("Failed to close the session.")
      }
    }
  }

  if (loading && activeSessions.length === 0) { // Only show full-page loader on initial load
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading counter display...</p>
        </div>
      </div>
    )
  }

  // The rest of your JSX remains the same, as it was well-structured.
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Counter Display</h1>
              <p className="text-muted-foreground">Active table sessions and payment status</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-lg px-3 py-1">
              {activeSessions.length} Active Tables
            </Badge>
            <Button variant="outline" onClick={fetchActiveSessions} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="flex items-center p-6">
              <Users className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h3 className="font-semibold">Active Tables</h3>
                <p className="text-2xl font-bold">{activeSessions.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <CreditCard className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <h3 className="font-semibold">Fully Paid</h3>
                <p className="text-2xl font-bold">
                  {activeSessions.filter((s) => s.unpaid_orders === 0 && s.total_orders > 0).length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <DollarSign className="h-8 w-8 text-red-600 mr-3" />
              <div>
                <h3 className="font-semibold">Pending Payment</h3>
                <p className="text-2xl font-bold">{activeSessions.filter((s) => s.unpaid_orders > 0).length}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <Receipt className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <h3 className="font-semibold">Total Orders</h3>
                <p className="text-2xl font-bold">{activeSessions.reduce((sum, s) => sum + s.total_orders, 0)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Sessions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Active Table Sessions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {activeSessions.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No active table sessions</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Table</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">Table {session.table_number}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{session.customer_name || "Guest"}</div>
                          <div className="text-sm text-muted-foreground">
                            Started {getSessionDuration(session.created_at)} ago
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {session.customer_phone ? (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {session.customer_phone}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No phone</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {getSessionDuration(session.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <div className="font-medium">{session.total_orders}</div>
                          {session.unpaid_orders > 0 && (
                            <div className="text-xs text-red-600">{session.unpaid_orders} unpaid</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">${session.total_amount.toFixed(2)}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPaymentStatusColor(session.unpaid_orders, session.total_orders)}>
                          {getPaymentStatusText(session.unpaid_orders, session.total_orders)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                View Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>
                                  Table {session.table_number} - {session.customer_name || "Guest"}
                                </DialogTitle>
                              </DialogHeader>
                              <SessionDetails session={session} />
                            </DialogContent>
                          </Dialog>

                          {session.unpaid_orders > 0 && (
                            <Button
                              size="sm"
                              onClick={() => processSessionPayment(session.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CreditCard className="h-3 w-3 mr-1" />
                              Pay All
                            </Button>
                          )}

                          <Button variant="destructive" size="sm" onClick={() => closeSession(session.id)}>
                            Close
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


// No changes needed for the SessionDetails component. It's already well-written.
interface SessionDetailsProps {
  session: ActiveSession
}

function SessionDetails({ session }: SessionDetailsProps) {
  const totalPaid = session.orders
    .filter((order) => order.payment_status === "paid")
    .reduce((sum, order) => sum + order.total_amount, 0)

  const totalUnpaid = session.orders
    .filter((order) => order.payment_status === "unpaid")
    .reduce((sum, order) => sum + order.total_amount, 0)

  return (
    <div className="space-y-6">
      {/* Session Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold mb-2">Session Information</h4>
          <div className="space-y-1 text-sm">
            <p>
              <strong>Customer:</strong> {session.customer_name || "Guest"}
            </p>
            <p>
              <strong>Phone:</strong> {session.customer_phone || "Not provided"}
            </p>
            <p>
              <strong>Table:</strong> {session.table_number}
            </p>
            <p>
              <strong>Started:</strong> {new Date(session.created_at).toLocaleString()}
            </p>
            <p>
              <strong>Payment Mode:</strong> {session.payment_mode ? session.payment_mode.replace("_", " ") : 'N/A'}
            </p>
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Payment Summary</h4>
          <div className="space-y-1 text-sm">
            <p>
              <strong>Total Orders:</strong> {session.total_orders}
            </p>
            <p>
              <strong>Total Amount:</strong> ${session.total_amount.toFixed(2)}
            </p>
            <p className="text-green-600">
              <strong>Paid:</strong> ${totalPaid.toFixed(2)}
            </p>
            <p className="text-red-600">
              <strong>Unpaid:</strong> ${totalUnpaid.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div>
        <h4 className="font-semibold mb-2">Orders ({session.orders.length})</h4>
        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
          {session.orders.map((order) => (
            <Card key={order.id} className="border-l-4 border-l-primary">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">#{order.order_number}</span>
                    <Badge variant={order.status === "ready" ? "default" : "outline"}>{order.status}</Badge>
                    <Badge variant={order.payment_status === "paid" ? "default" : "destructive"}>
                      {order.payment_status}
                    </Badge>
                  </div>
                  <span className="font-medium">${order.total_amount.toFixed(2)}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {order.items.length} items • {new Date(order.created_at).toLocaleTimeString()}
                </div> 
                <div className="text-xs mt-1">
                  {order.items.map((item: any, index: number) => (
                    <span key={index}>
                      {item.quantity}x {item.name}
                      {index < order.items.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}