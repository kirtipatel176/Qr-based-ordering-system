"use client"

import { useState, useEffect } from "react"
import { LoginForm } from "@/components/auth/login-form"
import { authService } from "@/lib/auth"

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkExistingAuth()
  }, [])

  const checkExistingAuth = async () => {
    const user = await authService.getCurrentUser()
    if (user) {
      if (authService.isAdmin()) {
        window.location.href = "/admin"
      } else if (authService.isEmployee()) {
        window.location.href = "/kitchen"
      }
    }
    setIsLoading(false)
  }

  const handleLogin = (user: any, type: "admin" | "employee") => {
    if (type === "admin") {
      window.location.href = "/admin"
    } else {
      window.location.href = "/kitchen"
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return <LoginForm onLogin={handleLogin} />
}
