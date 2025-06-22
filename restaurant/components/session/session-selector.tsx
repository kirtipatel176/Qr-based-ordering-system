"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Plus, Clock, ShoppingBag, ArrowRight, CheckCircle } from "lucide-react"

interface SessionOption {
  type: "new" | "existing"
  title: string
  description: string
  session?: any
}

interface SessionSelectorProps {
  options: SessionOption[]
  onOptionSelect: (option: SessionOption) => void
  isOccupied?: boolean
  loading?: boolean
}

export function SessionSelector({
  options,
  onOptionSelect,
  isOccupied = false,
  loading = false,
}: SessionSelectorProps) {
  const [selectedOption, setSelectedOption] = useState<SessionOption | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleOptionClick = (option: SessionOption) => {
    console.log("🎯 Session option clicked:", option)
    setSelectedOption(option)
  }

  const handleContinue = async () => {
    if (!selectedOption) {
      console.warn("⚠️ No option selected")
      return
    }

    console.log("▶️ Continuing with selected option:", selectedOption)
    setIsProcessing(true)

    try {
      // Call the parent handler
      await onOptionSelect(selectedOption)
    } catch (error) {
      console.error("❌ Error handling option selection:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-xl border-0 bg-white/90 backdrop-blur-sm">
        <CardContent className="text-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading session options...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Header */}
      <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-full flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
            Choose Your Session
          </CardTitle>
          <p className="text-slate-600">How would you like to proceed?</p>
          {isOccupied && (
            <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 mt-2">
              Table Currently Occupied
            </Badge>
          )}
        </CardHeader>
      </Card>

      {/* Session Options */}
      <div className="space-y-4">
        {options.map((option, index) => (
          <Card
            key={`${option.type}-${index}`}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
              selectedOption?.type === option.type
                ? "border-emerald-500 bg-emerald-50 shadow-lg"
                : "border-slate-200 hover:border-emerald-300 bg-white/90 backdrop-blur-sm"
            }`}
            onClick={() => handleOptionClick(option)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {option.type === "new" ? (
                    <div className="bg-emerald-100 p-3 rounded-full">
                      <Plus className="h-6 w-6 text-emerald-600" />
                    </div>
                  ) : (
                    <div className="bg-blue-100 p-3 rounded-full">
                      <Clock className="h-6 w-6 text-blue-600" />
                    </div>
                  )}
                  <div>
                    <h3
                      className={`font-semibold text-lg ${
                        option.type === "new" ? "text-emerald-700" : "text-blue-700"
                      }`}
                    >
                      {option.title}
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedOption?.type === option.type && <CheckCircle className="h-5 w-5 text-emerald-600" />}
                  <ArrowRight className="h-5 w-5 text-slate-400" />
                </div>
              </div>

              <p className="text-slate-600 mb-4">{option.description}</p>

              {/* Existing Session Details */}
              {option.type === "existing" && option.session && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-blue-800">Current Session</span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      Active
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-blue-600" />
                      <span className="text-blue-700">{option.session.total_orders || 0} Orders</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-blue-700 font-medium">
                        ₹{(option.session.total_amount || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  {option.session.customer_name && (
                    <div className="mt-2 text-sm text-blue-600">Customer: {option.session.customer_name}</div>
                  )}
                </div>
              )}

              {/* New Session Benefits */}
              {option.type === "new" && (
                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                  <div className="text-sm text-emerald-700 space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      <span>Fresh start with clean menu</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      <span>Personalized recommendations</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      <span>Track your order history</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Continue Button */}
      {selectedOption && (
        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
          <CardContent className="p-6">
            <Button
              onClick={handleContinue}
              className={`w-full h-12 text-lg font-semibold shadow-lg transition-all duration-200 ${
                selectedOption.type === "new"
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
                  : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              }`}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Processing...
                </>
              ) : (
                <>
                  {selectedOption.type === "new" ? (
                    <>
                      <Plus className="h-5 w-5 mr-2" />
                      Start New Session
                    </>
                  ) : (
                    <>
                      <Clock className="h-5 w-5 mr-2" />
                      Continue Session
                    </>
                  )}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Help Text */}
      <Card className="border-0 bg-white/60 backdrop-blur-sm">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-slate-600">
            {selectedOption
              ? `Click "${selectedOption.type === "new" ? "Start New Session" : "Continue Session"}" to proceed`
              : "Select an option above to continue"}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
