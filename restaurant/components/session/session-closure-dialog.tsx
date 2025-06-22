"use client"

import { useState } from "react"
import { Star, MessageSquare, CreditCard, Receipt } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { customerService } from "@/lib/customer-service"
import { DualPaymentDialog } from "@/components/payment/dual-payment-dialog"

interface SessionClosureDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  sessionId: string
  sessionData: {
    customer_name: string
    total_amount: number
    table_number: string
    unpaid_orders: number
    orders: any[]
  }
  restaurantId: string
  onSessionClosed: () => void
}

export function SessionClosureDialog({
  isOpen,
  onOpenChange,
  sessionId,
  sessionData,
  restaurantId,
  onSessionClosed,
}: SessionClosureDialogProps) {
  const [step, setStep] = useState<"payment" | "feedback" | "complete">("payment")
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)

  const handlePaymentComplete = () => {
    setShowPaymentDialog(false)
    setStep("feedback")
  }

  const handleSessionClose = async () => {
    setIsProcessing(true)
    try {
      const result = await customerService.closeSession(
        sessionId,
        "customer",
        "payment_complete",
        rating > 0 ? { rating, comment: feedback } : undefined,
      )

      if (result.success) {
        setStep("complete")
        setTimeout(() => {
          onSessionClosed()
          onOpenChange(false)
        }, 3000)
      } else {
        alert(result.error || "Failed to close session")
      }
    } catch (error) {
      console.error("Session closure error:", error)
      alert("Failed to close session")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      <Dialog open={isOpen && !showPaymentDialog} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {step === "payment" && <CreditCard className="h-5 w-5" />}
              {step === "feedback" && <MessageSquare className="h-5 w-5" />}
              {step === "complete" && <Receipt className="h-5 w-5" />}
              {step === "payment" && "Complete Your Bill"}
              {step === "feedback" && "Share Your Experience"}
              {step === "complete" && "Thank You!"}
            </DialogTitle>
          </DialogHeader>

          {step === "payment" && (
            <div className="space-y-6">
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Table {sessionData.table_number}</span>
                      <Badge variant="outline">{sessionData.orders.length} orders</Badge>
                    </div>
                    <div className="flex justify-between items-center text-lg">
                      <span>Total Amount:</span>
                      <span className="font-bold">₹{sessionData.total_amount.toFixed(2)}</span>
                    </div>
                    {sessionData.unpaid_orders > 0 && (
                      <div className="text-sm text-red-600">{sessionData.unpaid_orders} unpaid orders remaining</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={() => setShowPaymentDialog(true)}
                disabled={sessionData.unpaid_orders === 0}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                Choose Payment Method
              </Button>
            </div>
          )}

          {step === "feedback" && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-lg font-medium mb-2">How was your experience?</div>
                <div className="flex justify-center gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className={`text-2xl transition-colors ${star <= rating ? "text-yellow-400" : "text-gray-300"}`}
                    >
                      <Star className="h-8 w-8 fill-current" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="feedback">Additional Comments (Optional)</Label>
                <Textarea
                  id="feedback"
                  placeholder="Tell us about your dining experience..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                  className="mt-2"
                />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("payment")} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleSessionClose} disabled={isProcessing} className="flex-1">
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Closing...
                    </>
                  ) : (
                    "Close Session"
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === "complete" && (
            <div className="text-center space-y-6">
              <div className="text-6xl">🎉</div>
              <div>
                <h3 className="text-xl font-bold text-emerald-600 mb-2">Thank You!</h3>
                <p className="text-gray-600">
                  Your session has been closed successfully. We hope you enjoyed your meal!
                </p>
              </div>
              <div className="bg-emerald-50 p-4 rounded-lg">
                <p className="text-sm text-emerald-700">
                  Receipt has been generated and will be sent to your phone if provided.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DualPaymentDialog
        isOpen={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        sessionId={sessionId}
        sessionData={sessionData}
        restaurantId={restaurantId}
        onPaymentComplete={handlePaymentComplete}
      />
    </>
  )
}
