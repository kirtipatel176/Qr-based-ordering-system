import { supabase } from "@/lib/supabase"
import { sessionPersistence } from "@/lib/session-persistence"

export interface SessionOption {
  type: "new" | "existing"
  title: string
  description: string
  session?: any
}

export interface SessionResult {
  success: boolean
  sessionId?: string
  sessionToken?: string
  error?: string
  errorCode?: string
}

export interface TableStatus {
  tableId: string
  isOccupied: boolean
  activeSessions: any[]
  options: SessionOption[]
}

class SessionManager {
  // Generate secure session token
  private generateSessionToken(): string {
    const timestamp = Date.now().toString(36)
    const randomStr = Math.random().toString(36).substring(2, 15)
    return `${timestamp}_${randomStr}`
  }

  // Test database connection
  private async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase.from("restaurants").select("id").limit(1)
      if (error) {
        console.error("❌ Database connection test failed:", error)
        return false
      }
      console.log("✅ Database connection successful")
      return true
    } catch (error) {
      console.error("❌ Database connection error:", error)
      return false
    }
  }

  // Create new session with comprehensive error handling
  async createNewSession(
    tableId: string,
    customerName: string,
    customerPhone?: string,
    customerEmail?: string,
    customerId?: string,
  ): Promise<SessionResult> {
    try {
      console.log("🚀 Creating new session:", {
        tableId,
        customerName,
        customerPhone: customerPhone ? "***" + customerPhone.slice(-4) : undefined,
        customerEmail,
        customerId,
      })

      // Test database connection first
      const isConnected = await this.testConnection()
      if (!isConnected) {
        return {
          success: false,
          error: "Unable to connect to database. Please check your internet connection.",
          errorCode: "CONNECTION_ERROR",
        }
      }

      // Validate inputs
      if (!tableId || !customerName?.trim()) {
        return {
          success: false,
          error: "Table ID and customer name are required",
          errorCode: "INVALID_INPUT",
        }
      }

      // Validate table exists first
      console.log("🔍 Validating table:", tableId)
      const { data: table, error: tableError } = await supabase
        .from("tables")
        .select("id, table_number, is_active, restaurant_id")
        .eq("id", tableId)
        .single()

      if (tableError) {
        console.error("❌ Table validation error:", tableError)
        return {
          success: false,
          error: "Table not found: " + tableError.message,
          errorCode: "TABLE_NOT_FOUND",
        }
      }

      if (!table) {
        return {
          success: false,
          error: "Table does not exist",
          errorCode: "TABLE_NOT_FOUND",
        }
      }

      if (!table.is_active) {
        return {
          success: false,
          error: "Table is not available for service",
          errorCode: "TABLE_INACTIVE",
        }
      }

      console.log("✅ Table validated:", table)

      // Generate session token
      const sessionToken = this.generateSessionToken()
      console.log("🔑 Generated session token")

      // Call database function to create session
      console.log("📝 Calling database function to create session")
      const { data, error } = await supabase.rpc("create_table_session", {
        p_table_id: tableId,
        p_session_token: sessionToken,
        p_customer_name: customerName.trim(),
        p_customer_phone: customerPhone?.trim() || null,
        p_customer_email: customerEmail?.trim() || null,
        p_customer_id: customerId || null,
      })

      if (error) {
        console.error("❌ Database function error:", error)
        return {
          success: false,
          error: "Database error: " + error.message,
          errorCode: "DATABASE_ERROR",
        }
      }

      console.log("📊 Database function result:", data)

      if (!data?.success) {
        console.error("❌ Session creation failed:", data)
        return {
          success: false,
          error: data?.error || "Failed to create session",
          errorCode: data?.error_code || "CREATION_FAILED",
        }
      }

      console.log("✅ Session created successfully:", data.session_id)

      // Store session in persistence layer
      const persistedSession = {
        sessionId: data.session_id,
        tableId: tableId,
        restaurantId: table.restaurant_id,
        customerName: customerName.trim(),
        customerPhone: customerPhone?.trim(),
        customerEmail: customerEmail?.trim(),
        sessionToken: sessionToken,
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }

      const stored = sessionPersistence.storeSession(persistedSession)
      if (!stored) {
        console.warn("⚠️ Failed to store session in persistence layer")
      }

      return {
        success: true,
        sessionId: data.session_id,
        sessionToken: sessionToken,
      }
    } catch (error) {
      console.error("❌ Unexpected error creating session:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unexpected error occurred",
        errorCode: "UNEXPECTED_ERROR",
      }
    }
  }

  // Continue existing session
  async continueExistingSession(sessionId: string): Promise<SessionResult> {
    try {
      console.log("🔄 Continuing existing session:", sessionId)

      if (!sessionId) {
        return {
          success: false,
          error: "Session ID is required",
          errorCode: "INVALID_INPUT",
        }
      }

      // Test connection
      const isConnected = await this.testConnection()
      if (!isConnected) {
        return {
          success: false,
          error: "Unable to connect to database",
          errorCode: "CONNECTION_ERROR",
        }
      }

      // Get session details with proper error handling
      const { data: session, error } = await supabase.from("table_sessions").select("*").eq("id", sessionId).single()

      if (error) {
        console.error("❌ Error fetching session:", error)
        return {
          success: false,
          error: "Session not found: " + error.message,
          errorCode: "SESSION_NOT_FOUND",
        }
      }

      if (!session) {
        return {
          success: false,
          error: "Session does not exist",
          errorCode: "SESSION_NOT_FOUND",
        }
      }

      // Check session status
      if (session.status !== "active") {
        return {
          success: false,
          error: `Session is ${session.status}`,
          errorCode: "SESSION_INACTIVE",
        }
      }

      // Check if session is expired
      const expiresAt = new Date(session.expires_at)
      const now = new Date()
      if (expiresAt < now) {
        // Mark as expired
        await supabase.from("table_sessions").update({ status: "expired" }).eq("id", sessionId)

        return {
          success: false,
          error: "Session has expired",
          errorCode: "SESSION_EXPIRED",
        }
      }

      // Update last activity
      const { error: updateError } = await supabase
        .from("table_sessions")
        .update({
          last_activity: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("id", sessionId)

      if (updateError) {
        console.warn("⚠️ Failed to update session activity:", updateError)
      }

      console.log("✅ Session continued successfully")

      return {
        success: true,
        sessionId: sessionId,
        sessionToken: session.session_token,
      }
    } catch (error) {
      console.error("❌ Error continuing session:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to continue session",
        errorCode: "CONTINUE_ERROR",
      }
    }
  }

  // Check table status and available options
  async checkTableStatus(tableId: string): Promise<TableStatus> {
    try {
      console.log("📊 Checking table status:", tableId)

      // Test connection
      const isConnected = await this.testConnection()
      if (!isConnected) {
        throw new Error("Database connection failed")
      }

      // Get active sessions for this table
      const { data: sessions, error } = await supabase
        .from("table_sessions")
        .select(`
          *,
          orders (
            id,
            total_amount,
            status
          )
        `)
        .eq("table_id", tableId)
        .eq("status", "active")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("❌ Error checking table status:", error)
        throw error
      }

      const activeSessions = sessions || []
      const isOccupied = activeSessions.length > 0

      console.log(`📊 Table status: ${isOccupied ? "occupied" : "available"} (${activeSessions.length} sessions)`)

      // Build session options
      const options: SessionOption[] = []

      // Always offer new session option
      options.push({
        type: "new",
        title: "Start New Session",
        description: "Begin a fresh dining experience with a clean menu and new orders",
      })

      // Add existing session options if any
      if (activeSessions.length > 0) {
        activeSessions.forEach((session) => {
          const totalOrders = session.orders?.length || 0
          const totalAmount =
            session.orders?.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0) || 0

          options.unshift({
            type: "existing",
            title: "Continue Existing Session",
            description: `Resume your dining session with ${totalOrders} orders (₹${totalAmount.toFixed(2)})`,
            session: {
              session_id: session.id,
              customer_name: session.customer_name,
              customer_phone: session.customer_phone,
              customer_email: session.customer_email,
              total_orders: totalOrders,
              total_amount: totalAmount,
              created_at: session.created_at,
              status: session.status,
            },
          })
        })
      }

      return {
        tableId,
        isOccupied,
        activeSessions,
        options,
      }
    } catch (error) {
      console.error("❌ Error checking table status:", error)
      // Return default options on error
      return {
        tableId,
        isOccupied: false,
        activeSessions: [],
        options: [
          {
            type: "new",
            title: "Start New Session",
            description: "Begin a fresh dining experience",
          },
        ],
      }
    }
  }

  // Get session summary for existing session display
  async getSessionSummary(sessionId: string): Promise<any> {
    try {
      console.log("📋 Getting session summary:", sessionId)

      // Use database function for comprehensive summary
      const { data, error } = await supabase.rpc("get_session_summary", {
        p_session_id: sessionId,
      })

      if (error) {
        console.error("❌ Error getting session summary:", error)
        throw error
      }

      if (!data?.success) {
        throw new Error(data?.error || "Failed to get session summary")
      }

      console.log("✅ Session summary retrieved")
      return data
    } catch (error) {
      console.error("❌ Error getting session summary:", error)
      throw error
    }
  }

  // Validate session exists and is active
  async validateSession(sessionId: string, sessionToken?: string): Promise<SessionResult> {
    try {
      if (!sessionToken) {
        const storedSession = sessionPersistence.getStoredSession()
        sessionToken = storedSession?.sessionToken
      }

      if (!sessionToken) {
        return {
          success: false,
          error: "Session token not found",
          errorCode: "NO_TOKEN",
        }
      }

      const { data, error } = await supabase.rpc("validate_session", {
        p_session_id: sessionId,
        p_session_token: sessionToken,
      })

      if (error) {
        console.error("❌ Session validation error:", error)
        return {
          success: false,
          error: "Validation error: " + error.message,
          errorCode: "VALIDATION_ERROR",
        }
      }

      if (!data?.success) {
        return {
          success: false,
          error: data?.error || "Session validation failed",
          errorCode: data?.error_code || "VALIDATION_FAILED",
        }
      }

      return {
        success: true,
        sessionId: sessionId,
        sessionToken: sessionToken,
      }
    } catch (error) {
      console.error("❌ Error validating session:", error)
      return {
        success: false,
        error: "Session validation error",
        errorCode: "VALIDATION_ERROR",
      }
    }
  }

  // Close session
  async closeSession(sessionId: string, reason = "customer_left"): Promise<SessionResult> {
    try {
      console.log("🔚 Closing session:", sessionId, "Reason:", reason)

      const { error } = await supabase
        .from("table_sessions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          session_data: {
            closed_reason: reason,
            closed_at: new Date().toISOString(),
          },
        })
        .eq("id", sessionId)

      if (error) {
        console.error("❌ Error closing session:", error)
        return {
          success: false,
          error: "Failed to close session: " + error.message,
          errorCode: "CLOSE_ERROR",
        }
      }

      // Clear from persistence if it's the current session
      const currentSession = sessionPersistence.getStoredSession()
      if (currentSession?.sessionId === sessionId) {
        sessionPersistence.clearSession()
      }

      console.log("✅ Session closed successfully")

      return {
        success: true,
        sessionId,
      }
    } catch (error) {
      console.error("❌ Error closing session:", error)
      return {
        success: false,
        error: "Unexpected error closing session",
        errorCode: "UNEXPECTED_ERROR",
      }
    }
  }

  // Debug method to check session status
  async debugSession(sessionId: string): Promise<any> {
    try {
      const { data: session, error } = await supabase.from("table_sessions").select("*").eq("id", sessionId).single()

      return {
        session,
        error,
        persistedSession: sessionPersistence.getStoredSession(),
        debugInfo: sessionPersistence.getDebugInfo(),
      }
    } catch (error) {
      return { error: error.message }
    }
  }
}

export const sessionManager = new SessionManager()
