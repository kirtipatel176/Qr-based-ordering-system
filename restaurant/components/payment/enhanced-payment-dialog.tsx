"use client"

import { useState, useEffect } from "react"
import { CreditCard, Smartphone, Wallet, DollarSign, Plus, Minus, Users } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { enhancedPaymentService, type PaymentMethod } from "@/lib/enhanced-payment"

interface EnhancedPaymentDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  orderId?: string
  sessionId: string
  amount: number
  customerPhone?: string
  restaurantId: string
  onPaymentSuccess: (transactionId: string) => void
}

export function EnhancedPaymentDialog({
  isOpen,
  onOpenChange,
  orderId,
  sessionId,
  amount,
  customerPhone,
  restaurantId,
  onPaymentSuccess,
}: EnhancedPaymentDialogProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [tipAmount, setTipAmount] = useState(0)
  const [tipPercentage, setTipPercentage] = useState(0)
  const [paymentMode, setPaymentMode] = useState<"single" | "split">("single")
  const [splitData, setSplitData] = useState<any[]>([])

  // Card payment details
  const [cardDetails, setCardDetails] = useState({
    number: "",
    expiry: "",
    cvv: "",
    name: "",
  })

  // UPI details
  const [upiId, setUpiId] = useState("")

  useEffect(() => {
    if (isOpen) {
      fetchPaymentMethods()
    }
  }, [isOpen, restaurantId])

  const fetchPaymentMethods = async () => {
    const methods = await enhancedPaymentService.getAvailablePaymentMethods(restaurantId)
    setPaymentMethods(methods)
    if (methods.length > 0) {
      setSelectedMethod(methods[0])
    }
  }

  const calculateTip = (percentage: number) => {
    const tip = (amount * percentage) / 100
    setTipAmount(tip)
    setTipPercentage(percentage)
  }

  const handlePayment = async () => {
    if (!selectedMethod) return

    setIsProcessing(true)

    try {
      const result = await enhancedPaymentService.processPayment({
        orderId,
        sessionId,
        amount,
        method: selectedMethod,
        customerPhone,
        tipAmount,
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

  const handleSplitPayment = async () => {
    setIsProcessing(true)

    try {
      const result = await enhancedPaymentService.splitPayment(sessionId, {
        type: "custom",
        totalAmount: amount + tipAmount,
        splits: splitData,
      })

      if (result.success) {
        onPaymentSuccess(result.transactionId || "SPLIT_PAYMENT")
        onOpenChange(false)
      } else {
        alert(result.error || "Split payment failed")
      }
    } catch (error) {
      console.error("Split payment error:", error)
      alert("Split payment processing failed")
    } finally {
      setIsProcessing(false)
    }
  }

  const addSplitPerson = () => {
    setSplitData([
      ...splitData,
      {
        id: Date.now(),
        name: "",
        amount: 0,
        paymentMethod: paymentMethods[0],
        customerPhone: "",
      },
    ])
  }

  const updateSplitPerson = (id: number, field: string, value: any) => {
    setSplitData(splitData.map((person) => (person.id === id ? { ...person, [field]: value } : person)))
  }

  const removeSplitPerson = (id: number) => {
    setSplitData(splitData.filter((person) => person.id !== id))
  }

  const getMethodIcon = (methodType: string) => {
    switch (methodType) {
      case "card":
        return CreditCard
      case "upi":
        return Smartphone
      case "wallet":
        return Wallet
      case "cash":
        return DollarSign
      default:
        return CreditCard
    }
  }

  const totalWithTip = amount + tipAmount
  const splitTotal = splitData.reduce((sum, person) => sum + person.amount, 0)

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Payment</DialogTitle>
        </DialogHeader>

        <Tabs value={paymentMode} onValueChange={(value: any) => setPaymentMode(value)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Single Payment</TabsTrigger>
            <TabsTrigger value="split">Split Payment</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-6">
            {/* Amount Summary */}
            <Card>
              <CardContent className="p-4">
                <div className="text-center space-y-2">
                  <div className="text-3xl font-bold text-primary">${amount.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">Order Amount</div>
                  {tipAmount > 0 && (
                    <>
                      <div className="text-lg text-green-600">+${tipAmount.toFixed(2)} tip</div>
                      <div className="text-2xl font-bold">${totalWithTip.toFixed(2)} Total</div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tip Selection */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <Label className="text-base font-medium">Add Tip (Optional)</Label>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 18, 20, 25].map((percentage) => (
                    <Button
                      key={percentage}
                      variant={tipPercentage === percentage ? "default" : "outline"}
                      size="sm"
                      onClick={() => calculateTip(percentage)}
                    >
                      {percentage}%
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="custom-tip">Custom Amount:</Label>
                  <Input
                    id="custom-tip"
                    type="number"
                    step="0.01"
                    min="0"
                    value={tipAmount}
                    onChange={(e) => {
                      const tip = Number.parseFloat(e.target.value) || 0
                      setTipAmount(tip)
                      setTipPercentage((tip / amount) * 100)
                    }}
                    className="w-24"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Method Selection */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <Label className="text-base font-medium">Choose Payment Method</Label>
                <RadioGroup
                  value={selectedMethod?.id}
                  onValueChange={(value) => {
                    const method = paymentMethods.find((m) => m.id === value)
                    setSelectedMethod(method || null)
                  }}
                >
                  {paymentMethods.map((method) => {
                    const Icon = getMethodIcon(method.method_type)
                    return (
                      <div key={method.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={method.id} id={method.id} />
                        <Label htmlFor={method.id} className="flex items-center gap-2 cursor-pointer flex-1">
                          <Icon className="h-4 w-4" />
                          <span>{method.method_name}</span>
                          <span className="text-xs text-muted-foreground">({method.provider})</span>
                        </Label>
                      </div>
                    )
                  })}
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Payment Method Details */}
            {selectedMethod?.method_type === "card" && (
              <Card>
                <CardContent className="p-4 space-y-4">
                  <Label className="text-base font-medium">Card Details</Label>
                  <div className="grid grid-cols-1 gap-4">
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
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedMethod?.method_type === "upi" && (
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

            <Button onClick={handlePayment} className="w-full" disabled={isProcessing || !selectedMethod}>
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing Payment...
                </>
              ) : (
                `Pay $${totalWithTip.toFixed(2)}`
              )}
            </Button>
          </TabsContent>

          <TabsContent value="split" className="space-y-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-base font-medium">Split Payment</Label>
                  <Button variant="outline" size="sm" onClick={addSplitPerson}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Person
                  </Button>
                </div>

                <div className="space-y-4">
                  {splitData.map((person, index) => (
                    <Card key={person.id} className="border-dashed">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <Label>Person {index + 1}</Label>
                          <Button variant="ghost" size="sm" onClick={() => removeSplitPerson(person.id)}>
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Name"
                            value={person.name}
                            onChange={(e) => updateSplitPerson(person.id, "name", e.target.value)}
                          />
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Amount"
                            value={person.amount}
                            onChange={(e) =>
                              updateSplitPerson(person.id, "amount", Number.parseFloat(e.target.value) || 0)
                            }
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Separator className="my-4" />

                <div className="flex justify-between items-center">
                  <span>Total: ${amount.toFixed(2)}</span>
                  <span>Split Total: ${splitTotal.toFixed(2)}</span>
                  <span className={splitTotal === amount ? "text-green-600" : "text-red-600"}>
                    {splitTotal === amount
                      ? "✓ Balanced"
                      : `${splitTotal > amount ? "+" : ""}${(splitTotal - amount).toFixed(2)}`}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleSplitPayment}
              className="w-full"
              disabled={isProcessing || splitData.length === 0 || splitTotal !== amount}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing Split Payment...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Process Split Payment
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
