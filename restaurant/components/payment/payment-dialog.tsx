"use client"

import { useState } from "react"
import { CreditCard, Smartphone, Wallet, DollarSign } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent } from "@/components/ui/card"
import { paymentService } from "@/lib/payment"

interface PaymentDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  orderId: string
  sessionId: string
  amount: number
  customerPhone?: string
  onPaymentSuccess: (transactionId: string) => void
}

export function PaymentDialog({
  isOpen,
  onOpenChange,
  orderId,
  sessionId,
  amount,
  customerPhone,
  onPaymentSuccess,
}: PaymentDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<"card" | "upi" | "wallet" | "cash">("card")
  const [isProcessing, setIsProcessing] = useState(false)
  const [cardDetails, setCardDetails] = useState({
    number: "",
    expiry: "",
    cvv: "",
    name: "",
  })
  const [upiId, setUpiId] = useState("")

  const handlePayment = async () => {
    setIsProcessing(true)

    try {
      const result = await paymentService.processPayment({
        orderId,
        sessionId,
        amount,
        method: paymentMethod,
        customerPhone,
      })

      if (result.success && result.transactionId) {
        onPaymentSuccess(result.transactionId)
        onOpenChange(false)
      } else {
        alert(result.error || "Payment failed")
      }
    } catch (error) {
      console.error("Payment error:", error)
      alert("Payment processing failed")
    } finally {
      setIsProcessing(false)
    }
  }

  const paymentMethods = [
    { id: "card", label: "Credit/Debit Card", icon: CreditCard },
    { id: "upi", label: "UPI Payment", icon: Smartphone },
    { id: "wallet", label: "Digital Wallet", icon: Wallet },
    { id: "cash", label: "Cash Payment", icon: DollarSign },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">${amount.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">Total Amount</div>
          </div>

          <div>
            <Label className="text-base font-medium">Choose Payment Method</Label>
            <RadioGroup value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)} className="mt-3">
              {paymentMethods.map((method) => (
                <div key={method.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={method.id} id={method.id} />
                  <Label htmlFor={method.id} className="flex items-center gap-2 cursor-pointer">
                    <method.icon className="h-4 w-4" />
                    {method.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {paymentMethod === "card" && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <Label htmlFor="card-number">Card Number</Label>
                  <Input
                    id="card-number"
                    placeholder="1234 5678 9012 3456"
                    value={cardDetails.number}
                    onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiry">Expiry</Label>
                    <Input
                      id="expiry"
                      placeholder="MM/YY"
                      value={cardDetails.expiry}
                      onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      placeholder="123"
                      value={cardDetails.cvv}
                      onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="card-name">Cardholder Name</Label>
                  <Input
                    id="card-name"
                    placeholder="John Doe"
                    value={cardDetails.name}
                    onChange={(e) => setCardDetails({ ...cardDetails, name: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {paymentMethod === "upi" && (
            <Card>
              <CardContent className="p-4">
                <Label htmlFor="upi-id">UPI ID</Label>
                <Input
                  id="upi-id"
                  placeholder="yourname@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                />
              </CardContent>
            </Card>
          )}

          {paymentMethod === "wallet" && (
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-sm text-muted-foreground">
                  You will be redirected to your wallet app to complete the payment
                </div>
              </CardContent>
            </Card>
          )}

          {paymentMethod === "cash" && (
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-sm text-muted-foreground">
                  Please pay the amount in cash to the restaurant staff
                </div>
              </CardContent>
            </Card>
          )}

          <Button onClick={handlePayment} className="w-full" disabled={isProcessing}>
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing Payment...
              </>
            ) : (
              `Pay $${amount.toFixed(2)}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
