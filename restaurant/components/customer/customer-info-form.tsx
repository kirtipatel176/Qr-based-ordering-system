"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, User, Phone, Mail, Star, Gift, Bell, Receipt } from "lucide-react"

interface CustomerInfoFormProps {
  onSubmit: (data: { name: string; phone?: string; email?: string }) => void
  onBack: () => void
  loading?: boolean
  restaurantName: string
  tableNumber: string
}

export function CustomerInfoForm({
  onSubmit,
  onBack,
  loading = false,
  restaurantName,
  tableNumber,
}: CustomerInfoFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    // Name is required
    if (!formData.name.trim()) {
      newErrors.name = "Name is required"
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters"
    }

    // Phone validation (optional but if provided, must be valid)
    if (formData.phone && !/^\d{10}$/.test(formData.phone.replace(/\D/g, ""))) {
      newErrors.phone = "Please enter a valid 10-digit phone number"
    }

    // Email validation (optional but if provided, must be valid)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log("📝 Form submitted with data:", formData)

    if (!validateForm()) {
      console.warn("⚠️ Form validation failed:", errors)
      return
    }

    setIsSubmitting(true)

    try {
      console.log("✅ Form valid, calling onSubmit")
      await onSubmit({
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
      })
    } catch (error) {
      console.error("❌ Error submitting form:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormDisabled = loading || isSubmitting

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Header */}
      <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-full flex items-center justify-center mb-4">
            <User className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
            Welcome to {restaurantName}
          </CardTitle>
          <p className="text-slate-600">Table {tableNumber}</p>
          <p className="text-sm text-slate-500 mt-2">Please provide your details to start your dining experience</p>
        </CardHeader>
      </Card>

      {/* Form */}
      <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <User className="h-4 w-4" />
                Full Name *
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter your full name"
                className={`h-12 ${errors.name ? "border-red-300 focus:border-red-500" : ""}`}
                disabled={isFormDisabled}
                required
              />
              {errors.name && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <span className="text-red-500">•</span>
                  {errors.name}
                </p>
              )}
            </div>

            {/* Phone Field */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
                <span className="text-xs text-slate-500">(Optional)</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="Enter your phone number"
                className={`h-12 ${errors.phone ? "border-red-300 focus:border-red-500" : ""}`}
                disabled={isFormDisabled}
              />
              {errors.phone && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <span className="text-red-500">•</span>
                  {errors.phone}
                </p>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
                <span className="text-xs text-slate-500">(Optional)</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="Enter your email address"
                className={`h-12 ${errors.email ? "border-red-300 focus:border-red-500" : ""}`}
                disabled={isFormDisabled}
              />
              {errors.email && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <span className="text-red-500">•</span>
                  {errors.email}
                </p>
              )}
            </div>

            {/* Benefits Section */}
            <div className="bg-gradient-to-r from-emerald-50 to-blue-50 p-4 rounded-lg border border-emerald-200">
              <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                <Gift className="h-4 w-4 text-emerald-600" />
                Why provide your details?
              </h4>
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-blue-600" />
                  <span>Get real-time order updates via SMS</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-600" />
                  <span>Earn loyalty points for future discounts</span>
                </div>
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-green-600" />
                  <span>Receive digital receipts instantly</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                className="flex-1 h-12"
                disabled={isFormDisabled}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                type="submit"
                className="flex-1 h-12 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 font-semibold"
                disabled={isFormDisabled}
              >
                {isFormDisabled ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Session...
                  </>
                ) : (
                  <>Start Dining</>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <Card className="border-0 bg-white/60 backdrop-blur-sm">
        <CardContent className="p-4 text-center">
          <p className="text-xs text-slate-500">
            🔒 Your information is secure and will only be used to enhance your dining experience
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
