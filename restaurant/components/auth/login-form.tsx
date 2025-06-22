"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { authService } from "@/lib/auth"
import { LogIn, ChefHat, Settings } from "lucide-react"

interface LoginFormProps {
  onLogin: (user: any, type: "admin" | "employee") => void
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleAdminLogin = async (formData: FormData) => {
    setIsLoading(true)
    setError("")

    const email = formData.get("email") as string
    const password = formData.get("password") as string

    const result = await authService.loginAdmin(email, password)

    if (result.success && result.user) {
      onLogin(result.user, "admin")
    } else {
      setError(result.error || "Login failed")
    }

    setIsLoading(false)
  }

  const handleEmployeeLogin = async (formData: FormData) => {
    setIsLoading(true)
    setError("")

    const username = formData.get("username") as string
    const password = formData.get("password") as string

    const result = await authService.loginEmployee(username, password)

    if (result.success && result.user) {
      onLogin(result.user, "employee")
    } else {
      setError(result.error || "Login failed")
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Restaurant Login</CardTitle>
          <CardDescription>Access your restaurant management system</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="admin" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Admin
              </TabsTrigger>
              <TabsTrigger value="employee" className="flex items-center gap-2">
                <ChefHat className="h-4 w-4" />
                Kitchen Staff
              </TabsTrigger>
            </TabsList>

            <TabsContent value="admin">
              <form action={handleAdminLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="admin@restaurant.com"
                    defaultValue="admin@restaurant.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="admin123"
                    defaultValue="admin123"
                    required
                  />
                </div>
                {error && <div className="text-sm text-red-600">{error}</div>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Signing in...
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4 mr-2" />
                      Sign in as Admin
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="employee">
              <form action={handleEmployeeLogin} className="space-y-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" name="username" placeholder="kitchen1" defaultValue="kitchen1" required />
                </div>
                <div>
                  <Label htmlFor="emp-password">Password</Label>
                  <Input
                    id="emp-password"
                    name="password"
                    type="password"
                    placeholder="admin123"
                    defaultValue="admin123"
                    required
                  />
                </div>
                {error && <div className="text-sm text-red-600">{error}</div>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Signing in...
                    </>
                  ) : (
                    <>
                      <ChefHat className="h-4 w-4 mr-2" />
                      Sign in as Staff
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center text-sm text-muted-foreground space-y-2">
            <p className="font-semibold">✅ Working Demo Credentials:</p>
            <div className="bg-green-50 border border-green-200 rounded p-3 space-y-1">
              <p>
                <strong>Admin:</strong> admin@restaurant.com / admin123
              </p>
              <p>
                <strong>Kitchen:</strong> kitchen1 / admin123
              </p>
            </div>
            <p className="text-xs">
              Password is always: <code className="bg-gray-100 px-1 rounded">admin123</code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
