"use client"

import { useState, useEffect } from "react"
import { DollarSign, Clock, User, Receipt, CheckCircle, X, Phone, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { dualPaymentService } from "@/lib/dual-payment-service"

interface CounterPaymentSession {
  id: string
  customer_name: string
  customer_phone?: string
  customer_email?: string
  table_number: string
  total_amount: number
  created_at: string
  counter_payment_pending: boolean
  counter_payment_completed: boolean
  can_close_session: boolean
  orders: any[]
}

export function CounterPaymentManager() {
  const [sessions, setSessions] = useState<CounterPaymentSession[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState<CounterPaymentSession | null>(null)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const [receivedBy, setReceivedBy] = useState("")
  const [paymentNotes, setPaymentNotes] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    loadCounterPaymentSessions()
    const interval = setInterval(loadCounterPaymentSessions, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const loadCounterPaymentSessions = async () => {
    try {
      setLoading(true)
      const sessionsData = await dualPaymentService.getCounterPaymentSessions()
      setSessions(sessionsData)
    } catch (error) {
      console.error("Error loading counter payment sessions:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleProcessCounterPayment = async () => {
    if (!selectedSession || !receivedBy.trim()) return

    setIsProcessing(true)
    try {
      const unpaidOrders = selectedSession.orders.filter((order) => order.payment_status === "unpaid")
      const orderIds = unpaidOrders.map((order) => order.id)

      const result = await dualPaymentService.processCounterPayment({
        sessionId: selectedSession.id,
        orderIds,
        receivedBy: receivedBy.trim(),
        notes: paymentNotes.trim() || undefined,
      })

      if (result.success) {
        alert(`Payment processed successfully! Receipt: ${result.receiptNumber}`)
        setShowPaymentDialog(false)
        setSelectedSession(null)
        setReceivedBy("")
        setPaymentNotes("")
        loadCounterPaymentSessions()
      } else {
        alert(result.error || "Payment processing failed")
      }
    } catch (error) {
      console.error("Counter payment error:", error)
      alert("Payment processing failed")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCloseSession = async () => {
    if (!selectedSession) return

    setIsProcessing(true)
    try {
      const result = await dualPaymentService.terminateSession({
        sessionId: selectedSession.id,
        terminatedBy: "Manager",
        reason: "Payment completed - session closed",
        notes: "Session closed after counter payment completion",
      })

      if (result.success) {
        alert("Session closed successfully!")
        setShowCloseDialog(false)
        setSelectedSession(null)
        loadCounterPaymentSessions()
      } else {
        alert(result.error || "Session closure failed")
      }
    } catch (error) {
      console.error("Session closure error:", error)
      alert("Session closure failed")
    } finally {
      setIsProcessing(false)
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Counter Payment Manager</h2>
          <p className="text-muted-foreground">Process cash payments and manage session closures</p>
        </div>
        <Badge variant="outline" className="text-lg px-3 py-1">
          {sessions.length} Active Sessions
        </Badge>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No counter payment sessions</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sessions.map((session) => {
            const unpaidOrders = session.orders.filter((order) => order.payment_status === "unpaid")
            const unpaidAmount = unpaidOrders.reduce((sum, order) => sum + order.total_amount, 0)
            const isPaymentPending = session.counter_payment_pending && !session.counter_payment_completed
            const isPaymentCompleted = session.counter_payment_completed
            const canClose = session.can_close_session && isPaymentCompleted

            return (
              <Card
                key={session.id}
                className={`border-l-4 ${
                  isPaymentCompleted
                    ? "border-l-green-500"
                    : isPaymentPending
                      ? "border-l-orange-500"
                      : "border-l-blue-500"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Table {session.table_number}</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        <Clock className="h-3 w-3 mr-1" />
                        {getSessionDuration(session.created_at)}
                      </Badge>
                      {isPaymentCompleted && <Badge className="bg-green-100 text-green-800">Payment Complete</Badge>}
                      {isPaymentPending && <Badge className="bg-orange-100 text-orange-800">Payment Pending</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Customer Information */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{session.customer_name}</span>
                    </div>
                    {session.customer_phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{session.customer_phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Payment Information */}
                  <div
                    className={`rounded-lg p-3 ${
                      isPaymentCompleted ? "bg-green-50" : isPaymentPending ? "bg-orange-50" : "bg-blue-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">
                        {isPaymentCompleted ? "Amount Collected:" : "Amount to Collect:"}
                      </span>
                      <span
                        className={`text-xl font-bold ${
                          isPaymentCompleted ? "text-green-600" : isPaymentPending ? "text-orange-600" : "text-blue-600"
                        }`}
                      >
                        ₹{unpaidAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {unpaidOrders.length} unpaid orders • {session.orders.length} total orders
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {!isPaymentCompleted && (
                      <Dialog
                        open={showPaymentDialog && selectedSession?.id === session.id}
                        onOpenChange={setShowPaymentDialog}
                      >
                        <DialogTrigger asChild>
                          <Button
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            onClick={() => setSelectedSession(session)}
                          >
                            <Receipt className="h-4 w-4 mr-2" />
                            Process Payment
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Process Counter Payment</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            {/* Customer & Session Info */}
                            <Card className="bg-gray-50">
                              <CardContent className="p-4">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    <span className="font-medium">{selectedSession?.customer_name}</span>
                                  </div>
                                  {selectedSession?.customer_phone && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Phone className="h-3 w-3" />
                                      <span>{selectedSession.customer_phone}</span>
                                    </div>
                                  )}
                                  <div className="text-sm text-muted-foreground">
                                    Table {selectedSession?.table_number}
                                  </div>
                                  <div className="text-2xl font-bold text-green-600 mt-2">
                                    ₹{unpaidAmount.toFixed(2)}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {unpaidOrders.length} orders to be paid
                                  </div>
                                </div>
                              </CardContent>
                            </Card>

                            <div>
                              <Label htmlFor="received-by">Received By *</Label>
                              <Input
                                id="received-by"
                                value={receivedBy}
                                onChange={(e) => setReceivedBy(e.target.value)}
                                placeholder="Staff member name"
                              />
                            </div>

                            <div>
                              <Label htmlFor="payment-notes">Notes (Optional)</Label>
                              <Textarea
                                id="payment-notes"
                                value={paymentNotes}
                                onChange={(e) => setPaymentNotes(e.target.value)}
                                placeholder="Any additional notes..."
                              />
                            </div>

                            <div className="flex gap-2">
                              <Button
                                onClick={handleProcessCounterPayment}
                                disabled={!receivedBy.trim() || isProcessing}
                                className="flex-1"
                              >
                                {isProcessing ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Confirm Payment
                                  </>
                                )}
                              </Button>
                              <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}

                    {canClose && (
                      <Dialog
                        open={showCloseDialog && selectedSession?.id === session.id}
                        onOpenChange={setShowCloseDialog}
                      >
                        <DialogTrigger asChild>
                          <Button
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                            onClick={() => setSelectedSession(session)}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Close Session
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Close Session</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="bg-blue-50 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <span className="font-medium">Payment Completed</span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Table {selectedSession?.table_number} - {selectedSession?.customer_name}
                              </div>
                              <div className="text-lg font-bold text-green-600 mt-2">
                                ₹{unpaidAmount.toFixed(2)} collected
                              </div>
                            </div>

                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                <span className="font-medium text-yellow-800">Confirm Session Closure</span>
                              </div>
                              <p className="text-sm text-yellow-700">
                                This will permanently close the session. The customer will no longer be able to place
                                orders.
                              </p>
                            </div>

                            <div className="flex gap-2">
                              <Button onClick={handleCloseSession} disabled={isProcessing} className="flex-1">
                                {isProcessing ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Closing...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Close Session
                                  </>
                                )}
                              </Button>
                              <Button variant="outline" onClick={() => setShowCloseDialog(false)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>

                  {/* Status Messages */}
                  {isPaymentPending && !isPaymentCompleted && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-orange-700">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          Customer selected counter payment - waiting for payment
                        </span>
                      </div>
                    </div>
                  )}

                  {isPaymentCompleted && !canClose && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Payment completed - ready to close session</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
