"use client"

import { useState, useEffect } from "react"
import { CreditCard, Clock, CheckCircle, AlertCircle, User, Phone } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { dualPaymentService, type PaymentOption } from "@/lib/dual-payment-service"
import { EnhancedPaymentDialog } from "@/components/payment/enhanced-payment-dialog"

interface DualPaymentDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  sessionId: string
  sessionData: {
    customer_name: string
    customer_phone?: string
    total_amount: number
    table_number: string
    unpaid_orders: number
    orders: any[]
  }
  restaurantId: string
  onPaymentComplete: () => void
}

export function DualPaymentDialog({
  isOpen,
  onOpenChange,
  sessionId,
  sessionData,
  restaurantId,
  onPaymentComplete,
}: DualPaymentDialogProps) {
  const [paymentOptions, setPaymentOptions] = useState<PaymentOption[]>([])
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showOnlinePayment, setShowOnlinePayment] = useState(false)
  const [counterPaymentSelected, setCounterPaymentSelected] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadPaymentOptions()
    }
  }, [isOpen, sessionData.unpaid_orders])

  const loadPaymentOptions = async () => {
    const options = await dualPaymentService.getPaymentOptions(sessionId, sessionData.unpaid_orders > 0)
    setPaymentOptions(options)
  }

  const handleOptionSelect = async (optionId: string) => {
    setSelectedOption(optionId)
    setIsProcessing(true)

    try {
      if (optionId === "online") {
        setShowOnlinePayment(true)
      } else if (optionId === "counter") {
        const result = await dualPaymentService.selectCounterPayment(sessionId)
        if (result.success) {
          setCounterPaymentSelected(true)
          // Don't close the dialog immediately - show confirmation
        } else {
          alert(result.error || "Failed to select counter payment")
        }
      }
    } catch (error) {
      console.error("Payment option selection error:", error)
      alert("Failed to process payment option")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleOnlinePaymentSuccess = (transactionId: string) => {
    alert(`Payment successful! Transaction ID: ${transactionId}`)
    onPaymentComplete()
    onOpenChange(false)
  }

  const handleCounterPaymentConfirm = () => {
    onPaymentComplete()
    onOpenChange(false)
  }

  const unpaidOrders = sessionData.orders.filter((order) => order.payment_status === "unpaid")
  const unpaidAmount = unpaidOrders.reduce((sum, order) => sum + order.total_amount, 0)

  if (counterPaymentSelected) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-orange-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-4">Counter Payment Selected</h3>

            {/* Customer Info */}
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <User className="h-4 w-4 text-slate-600" />
                  <span className="font-medium">{sessionData.customer_name}</span>
                </div>
                {sessionData.customer_phone && (
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
                    <Phone className="h-3 w-3" />
                    <span>{sessionData.customer_phone}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="bg-orange-50 rounded-lg p-4 mb-4">
              <div className="text-2xl font-bold text-orange-600 mb-2">₹{unpaidAmount.toFixed(2)}</div>
              <p className="text-sm text-orange-700">Amount to pay at counter</p>
            </div>

            <div className="space-y-3 text-sm text-slate-600">
              <p>✅ Your session will remain active</p>
              <p>💵 Please pay at the counter when leaving</p>
              <p>🧾 You'll receive a receipt after payment</p>
              <p>⚠️ Session will be closed by staff after payment</p>
            </div>

            <div className="mt-6">
              <button
                onClick={handleCounterPaymentConfirm}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                Continue Dining
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      <Dialog open={isOpen && !showOnlinePayment} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Choose Payment Method</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Customer & Session Summary */}
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-4 w-4 text-slate-600" />
                      <h3 className="font-semibold text-lg">{sessionData.customer_name}</h3>
                    </div>
                    {sessionData.customer_phone && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone className="h-3 w-3" />
                        <span>{sessionData.customer_phone}</span>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">Table {sessionData.table_number}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">₹{unpaidAmount.toFixed(2)}</div>
                    <p className="text-sm text-muted-foreground">{sessionData.unpaid_orders} unpaid orders</p>
                  </div>
                </div>

                {/* Unpaid Orders List */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Unpaid Orders:</h4>
                  {unpaidOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between text-sm bg-white/50 rounded p-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          #{order.order_number}
                        </Badge>
                        <span>{order.items?.length || 0} items</span>
                      </div>
                      <span className="font-medium">₹{order.total_amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Payment Options */}
            <div className="space-y-4">
              <h3 className="font-semibold">Select Payment Method</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paymentOptions.map((option) => (
                  <Card
                    key={option.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      !option.available ? "opacity-50 cursor-not-allowed" : ""
                    } ${selectedOption === option.id ? "ring-2 ring-blue-500" : ""}`}
                    onClick={() => option.available && handleOptionSelect(option.id)}
                  >
                    <CardContent className="p-6 text-center">
                      <div className="text-4xl mb-3">{option.icon}</div>
                      <h4 className="font-semibold mb-2">{option.title}</h4>
                      <p className="text-sm text-muted-foreground mb-4">{option.description}</p>

                      {option.type === "online" && (
                        <div className="flex items-center justify-center gap-2 text-xs text-green-600">
                          <CreditCard className="h-3 w-3" />
                          <span>Instant Payment & Session Closure</span>
                        </div>
                      )}

                      {option.type === "counter" && (
                        <div className="flex items-center justify-center gap-2 text-xs text-orange-600">
                          <Clock className="h-3 w-3" />
                          <span>Session Stays Active</span>
                        </div>
                      )}

                      {!option.available && (
                        <div className="flex items-center justify-center gap-2 text-xs text-red-600 mt-2">
                          <AlertCircle className="h-3 w-3" />
                          <span>{option.reason}</span>
                        </div>
                      )}

                      {isProcessing && selectedOption === option.id && (
                        <div className="flex items-center justify-center gap-2 text-xs text-blue-600 mt-2">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                          <span>Processing...</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Payment Method Details */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-sm">Payment Options:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h5 className="font-medium text-green-600 mb-1">💳 Online Payment</h5>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• Pay immediately with card/UPI/wallet</li>
                    <li>• Instant confirmation</li>
                    <li>• Digital receipt</li>
                    <li>• Session closes automatically</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium text-orange-600 mb-1">💵 Counter Payment</h5>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• Pay with cash at counter</li>
                    <li>• Session stays active until payment</li>
                    <li>• Manager processes payment</li>
                    <li>• Physical receipt at counter</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enhanced Payment Dialog for Online Payment */}
      <EnhancedPaymentDialog
        isOpen={showOnlinePayment}
        onOpenChange={(open) => {
          setShowOnlinePayment(open)
          if (!open) {
            setSelectedOption(null)
          }
        }}
        sessionId={sessionId}
        amount={unpaidAmount}
        restaurantId={restaurantId}
        onPaymentSuccess={handleOnlinePaymentSuccess}
      />
    </>
  )
}
