"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ConnectionStatus } from "@/components/connection-status"
import { SupabaseProvider } from "@/components/supabase-provider"
import { Database, Server, Settings, CheckCircle } from "lucide-react"

export default function SetupPage() {
  const [step, setStep] = useState(1)
  const [supabaseUrl, setSupabaseUrl] = useState("")
  const [supabaseKey, setSupabaseKey] = useState("")

  const steps = [
    {
      id: 1,
      title: "Environment Variables",
      description: "Configure your Supabase connection",
      icon: Settings,
    },
    {
      id: 2,
      title: "Database Setup",
      description: "Run SQL scripts to create tables",
      icon: Database,
    },
    {
      id: 3,
      title: "Test Connection",
      description: "Verify everything is working",
      icon: Server,
    },
  ]

  return (
    <SupabaseProvider>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Setup QR Restaurant System</h1>
              <p className="text-muted-foreground">Configure your Supabase database connection to get started</p>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-center mb-8">
              {steps.map((stepItem, index) => (
                <div key={stepItem.id} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                      step >= stepItem.id
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-muted-foreground text-muted-foreground"
                    }`}
                  >
                    {step > stepItem.id ? <CheckCircle className="h-5 w-5" /> : <stepItem.icon className="h-5 w-5" />}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-0.5 mx-2 ${step > stepItem.id ? "bg-primary" : "bg-muted-foreground"}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Step Content */}
            <div className="space-y-6">
              {/* Step 1: Environment Variables */}
              {step === 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Step 1: Environment Variables
                    </CardTitle>
                    <CardDescription>
                      First, you need to create a Supabase project and get your connection details.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2">📋 Instructions:</h4>
                      <ol className="text-sm text-blue-800 space-y-1">
                        <li>
                          1. Go to{" "}
                          <a
                            href="https://supabase.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            supabase.com
                          </a>{" "}
                          and create a new project
                        </li>
                        <li>2. Wait for your project to be ready (usually takes 1-2 minutes)</li>
                        <li>3. Go to Settings → API in your Supabase dashboard</li>
                        <li>4. Copy your Project URL and anon public key</li>
                        <li>
                          5. Create a <code className="bg-blue-100 px-1 rounded">.env.local</code> file in your project
                          root
                        </li>
                      </ol>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="supabase-url">Supabase Project URL</Label>
                        <Input
                          id="supabase-url"
                          placeholder="https://your-project.supabase.co"
                          value={supabaseUrl}
                          onChange={(e) => setSupabaseUrl(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="supabase-key">Supabase Anon Key</Label>
                        <Textarea
                          id="supabase-key"
                          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                          value={supabaseKey}
                          onChange={(e) => setSupabaseKey(e.target.value)}
                          rows={3}
                        />
                      </div>
                    </div>

                    <div className="bg-gray-50 border rounded-lg p-4">
                      <h4 className="font-semibold mb-2">📄 Your .env.local file should look like this:</h4>
                      <pre className="text-sm bg-gray-100 p-3 rounded overflow-x-auto">
                        {`NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl || "your_supabase_project_url_here"}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseKey || "your_supabase_anon_key_here"}`}
                      </pre>
                    </div>

                    <Button onClick={() => setStep(2)} className="w-full" disabled={!supabaseUrl || !supabaseKey}>
                      Continue to Database Setup
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Step 2: Database Setup */}
              {step === 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Step 2: Database Setup
                    </CardTitle>
                    <CardDescription>
                      Run the SQL scripts to create your database tables and seed initial data.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Important:</h4>
                      <p className="text-sm text-yellow-800">
                        Make sure you've saved your .env.local file and restarted your development server before
                        proceeding.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">📋 Database Setup Instructions:</h4>
                        <ol className="text-sm space-y-2">
                          <li className="flex items-start gap-2">
                            <Badge variant="outline" className="mt-0.5">
                              1
                            </Badge>
                            <span>Go to your Supabase dashboard → SQL Editor</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Badge variant="outline" className="mt-0.5">
                              2
                            </Badge>
                            <span>
                              Copy and run the SQL script from <code>scripts/01-create-tables.sql</code>
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Badge variant="outline" className="mt-0.5">
                              3
                            </Badge>
                            <span>
                              Copy and run the SQL script from <code>scripts/02-seed-data.sql</code>
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Badge variant="outline" className="mt-0.5">
                              4
                            </Badge>
                            <span>Verify tables were created in Database → Tables</span>
                          </li>
                        </ol>
                      </div>

                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-semibold text-green-900 mb-2">✅ Expected Tables:</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm text-green-800">
                          <span>• restaurants</span>
                          <span>• tables</span>
                          <span>• menu_categories</span>
                          <span>• menu_items</span>
                          <span>• table_sessions</span>
                          <span>• orders</span>
                          <span>• order_items</span>
                          <span>• admin_users</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setStep(1)}>
                        Back
                      </Button>
                      <Button onClick={() => setStep(3)} className="flex-1">
                        Continue to Test Connection
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 3: Test Connection */}
              {step === 3 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="h-5 w-5" />
                      Step 3: Test Connection
                    </CardTitle>
                    <CardDescription>Let's verify that everything is working correctly.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <ConnectionStatus />

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2">🎉 Setup Complete!</h4>
                      <p className="text-sm text-blue-800 mb-3">
                        If the connection is successful, your QR Restaurant System is ready to use!
                      </p>
                      <div className="space-y-2 text-sm text-blue-800">
                        <p>
                          <strong>Next steps:</strong>
                        </p>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                          <li>
                            Visit the{" "}
                            <a href="/admin" className="underline">
                              Admin Panel
                            </a>{" "}
                            to manage your restaurant
                          </li>
                          <li>
                            Check the{" "}
                            <a href="/kitchen" className="underline">
                              Kitchen Display
                            </a>{" "}
                            for order management
                          </li>
                          <li>
                            Print QR codes from the{" "}
                            <a href="/" className="underline">
                              Home Page
                            </a>
                          </li>
                          <li>Test the customer flow by scanning a QR code</li>
                        </ul>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setStep(2)}>
                        Back
                      </Button>
                      <Button asChild className="flex-1">
                        <a href="/">Go to Dashboard</a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </SupabaseProvider>
  )
}
