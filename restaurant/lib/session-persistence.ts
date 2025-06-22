"use client"

import { supabase } from "@/lib/supabase"

export interface PersistedSession {
  sessionId: string
  tableId: string
  restaurantId: string
  customerName: string
  customerPhone?: string
  customerEmail?: string
  sessionToken: string
  createdAt: string
  lastAccessed: string
  expiresAt: string
}

export interface SessionValidation {
  isValid: boolean
  session?: PersistedSession
  reason?: string
  errorCode?: string
}

export interface QRScanResult {
  action: "redirect" | "show-options" | "show-conflict"
  sessionId?: string
  conflictSession?: PersistedSession
}

class SessionPersistence {
  private readonly STORAGE_KEY = "qr_restaurant_session"
  private readonly COOKIE_NAME = "qr_session"
  private readonly BACKUP_COOKIE_NAME = "qr_session_backup"
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000 // 24 hours
  private readonly COOKIE_EXPIRES_DAYS = 1

  constructor() {
    // Initialize and cleanup on load
    if (typeof window !== "undefined") {
      this.initializeSession()
      this.setupStorageListener()
    }
  }

  private initializeSession(): void {
    try {
      // Clean up expired sessions on initialization
      this.cleanupExpiredSessions()
    } catch (error) {
      console.error("Error initializing session:", error)
    }
  }

  private setupStorageListener(): void {
    try {
      // Listen for storage changes across tabs
      window.addEventListener("storage", (e) => {
        if (e.key === this.STORAGE_KEY) {
          console.log("Session updated in another tab")
        }
      })

      // Listen for page visibility changes
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
          this.refreshSessionActivity()
        }
      })
    } catch (error) {
      console.error("Error setting up storage listener:", error)
    }
  }

  // Store session with multiple fallbacks
  storeSession(session: PersistedSession): boolean {
    try {
      const sessionData = {
        ...session,
        lastAccessed: new Date().toISOString(),
        expiresAt: new Date(Date.now() + this.SESSION_TIMEOUT).toISOString(),
      }

      let stored = false

      // Try localStorage first
      if (this.isLocalStorageAvailable()) {
        try {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessionData))
          stored = true
          console.log("✅ Session stored in localStorage")
        } catch (error) {
          console.warn("⚠️ Failed to store in localStorage:", error)
        }
      }

      // Store in cookies as backup
      try {
        this.setCookie(this.COOKIE_NAME, JSON.stringify(sessionData), this.COOKIE_EXPIRES_DAYS)
        this.setCookie(this.BACKUP_COOKIE_NAME, session.sessionId, this.COOKIE_EXPIRES_DAYS)
        stored = true
        console.log("✅ Session stored in cookies")
      } catch (error) {
        console.warn("⚠️ Failed to store in cookies:", error)
      }

      // Store in sessionStorage as additional fallback
      if (this.isSessionStorageAvailable()) {
        try {
          sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessionData))
          console.log("✅ Session stored in sessionStorage")
        } catch (error) {
          console.warn("⚠️ Failed to store in sessionStorage:", error)
        }
      }

      return stored
    } catch (error) {
      console.error("❌ Error storing session:", error)
      return false
    }
  }

  // Retrieve session with fallback chain
  getStoredSession(): PersistedSession | null {
    try {
      let sessionData: string | null = null
      let source = "none"

      // Try localStorage first
      if (this.isLocalStorageAvailable()) {
        try {
          sessionData = localStorage.getItem(this.STORAGE_KEY)
          if (sessionData) source = "localStorage"
        } catch (error) {
          console.warn("⚠️ Failed to read from localStorage:", error)
        }
      }

      // Fallback to cookies
      if (!sessionData) {
        try {
          sessionData = this.getCookie(this.COOKIE_NAME)
          if (sessionData) source = "cookies"
        } catch (error) {
          console.warn("⚠️ Failed to read from cookies:", error)
        }
      }

      // Fallback to sessionStorage
      if (!sessionData && this.isSessionStorageAvailable()) {
        try {
          sessionData = sessionStorage.getItem(this.STORAGE_KEY)
          if (sessionData) source = "sessionStorage"
        } catch (error) {
          console.warn("⚠️ Failed to read from sessionStorage:", error)
        }
      }

      if (!sessionData) {
        console.log("ℹ️ No stored session found")
        return null
      }

      const session = JSON.parse(sessionData) as PersistedSession
      console.log(`✅ Session loaded from ${source}`)

      // Check if session is expired
      if (this.isSessionExpired(session)) {
        console.log("⏰ Session expired, cleaning up")
        this.clearSession()
        return null
      }

      return session
    } catch (error) {
      console.error("❌ Error retrieving session:", error)
      this.clearSession()
      return null
    }
  }

  // Validate session against database
  async validateSession(tableId?: string, restaurantId?: string): Promise<SessionValidation> {
    try {
      const storedSession = this.getStoredSession()

      if (!storedSession) {
        return {
          isValid: false,
          reason: "No stored session found",
          errorCode: "NO_SESSION",
        }
      }

      // Check table/restaurant match if provided
      if (tableId && storedSession.tableId !== tableId) {
        return {
          isValid: false,
          reason: "Session is for different table",
          errorCode: "TABLE_MISMATCH",
        }
      }

      if (restaurantId && storedSession.restaurantId !== restaurantId) {
        return {
          isValid: false,
          reason: "Session is for different restaurant",
          errorCode: "RESTAURANT_MISMATCH",
        }
      }

      // Validate against database
      const { data, error } = await supabase.rpc("validate_session", {
        p_session_id: storedSession.sessionId,
        p_session_token: storedSession.sessionToken,
      })

      if (error) {
        console.error("❌ Database validation error:", error)
        return {
          isValid: false,
          reason: "Database validation failed",
          errorCode: "DATABASE_ERROR",
        }
      }

      if (!data?.success) {
        console.log("❌ Session validation failed:", data?.error)
        this.clearSession()
        return {
          isValid: false,
          reason: data?.error || "Session validation failed",
          errorCode: data?.error_code || "VALIDATION_FAILED",
        }
      }

      // Update stored session with fresh data
      if (data.session) {
        const updatedSession: PersistedSession = {
          ...storedSession,
          lastAccessed: new Date().toISOString(),
          expiresAt: data.session.expires_at,
        }
        this.storeSession(updatedSession)
      }

      console.log("✅ Session validated successfully")
      return {
        isValid: true,
        session: storedSession,
      }
    } catch (error) {
      console.error("❌ Error validating session:", error)
      return {
        isValid: false,
        reason: "Validation error occurred",
        errorCode: "VALIDATION_ERROR",
      }
    }
  }

  // Update last accessed time
  updateLastAccessed(session?: PersistedSession): boolean {
    try {
      const currentSession = session || this.getStoredSession()
      if (!currentSession) return false

      const updatedSession = {
        ...currentSession,
        lastAccessed: new Date().toISOString(),
      }

      return this.storeSession(updatedSession)
    } catch (error) {
      console.error("❌ Error updating last accessed:", error)
      return false
    }
  }

  // Clear session from all storage locations
  clearSession(): boolean {
    try {
      let cleared = false

      // Clear from localStorage
      if (this.isLocalStorageAvailable()) {
        try {
          localStorage.removeItem(this.STORAGE_KEY)
          cleared = true
        } catch (error) {
          console.warn("⚠️ Failed to clear localStorage:", error)
        }
      }

      // Clear from sessionStorage
      if (this.isSessionStorageAvailable()) {
        try {
          sessionStorage.removeItem(this.STORAGE_KEY)
        } catch (error) {
          console.warn("⚠️ Failed to clear sessionStorage:", error)
        }
      }

      // Clear cookies
      try {
        this.deleteCookie(this.COOKIE_NAME)
        this.deleteCookie(this.BACKUP_COOKIE_NAME)
        cleared = true
      } catch (error) {
        console.warn("⚠️ Failed to clear cookies:", error)
      }

      if (cleared) {
        console.log("✅ Session cleared from all storage")
      }

      return cleared
    } catch (error) {
      console.error("❌ Error clearing session:", error)
      return false
    }
  }

  // Handle QR scan with comprehensive logic
  async handleQRScan(tableId: string, restaurantId: string): Promise<QRScanResult> {
    try {
      console.log("🔍 Handling QR scan:", { tableId, restaurantId })

      const storedSession = this.getStoredSession()

      if (!storedSession) {
        console.log("ℹ️ No stored session, showing options")
        return { action: "show-options" }
      }

      // Same table and restaurant - validate and redirect
      if (storedSession.tableId === tableId && storedSession.restaurantId === restaurantId) {
        console.log("🎯 Same table/restaurant, validating session")

        const validation = await this.validateSession(tableId, restaurantId)

        if (validation.isValid) {
          console.log("✅ Session valid, redirecting")
          this.updateLastAccessed(storedSession)
          return {
            action: "redirect",
            sessionId: storedSession.sessionId,
          }
        } else {
          console.log("❌ Session invalid, showing options")
          return { action: "show-options" }
        }
      }

      // Different table or restaurant - check if current session is still valid
      const validation = await this.validateSession()

      if (validation.isValid) {
        console.log("⚠️ Active session at different location, showing conflict")
        return {
          action: "show-conflict",
          conflictSession: storedSession,
        }
      } else {
        console.log("ℹ️ Previous session invalid, showing options")
        return { action: "show-options" }
      }
    } catch (error) {
      console.error("❌ Error handling QR scan:", error)
      return { action: "show-options" }
    }
  }

  // Refresh session activity
  private async refreshSessionActivity(): Promise<void> {
    try {
      const session = this.getStoredSession()
      if (session) {
        await this.validateSession()
      }
    } catch (error) {
      console.error("❌ Error refreshing session activity:", error)
    }
  }

  // Check if session is expired
  private isSessionExpired(session: PersistedSession): boolean {
    try {
      const expiresAt = new Date(session.expiresAt || session.lastAccessed)
      const now = new Date()

      // Add session timeout to last accessed if no explicit expiry
      if (!session.expiresAt) {
        expiresAt.setTime(new Date(session.lastAccessed).getTime() + this.SESSION_TIMEOUT)
      }

      return now > expiresAt
    } catch (error) {
      console.error("❌ Error checking session expiry:", error)
      return true
    }
  }

  // Clean up expired sessions
  private cleanupExpiredSessions(): void {
    try {
      const session = this.getStoredSession()
      if (session && this.isSessionExpired(session)) {
        console.log("🧹 Cleaning up expired session")
        this.clearSession()
      }
    } catch (error) {
      console.error("❌ Error cleaning up expired sessions:", error)
    }
  }

  // Storage availability checks
  private isLocalStorageAvailable(): boolean {
    try {
      if (typeof window === "undefined") return false
      const test = "__localStorage_test__"
      localStorage.setItem(test, test)
      localStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  }

  private isSessionStorageAvailable(): boolean {
    try {
      if (typeof window === "undefined") return false
      const test = "__sessionStorage_test__"
      sessionStorage.setItem(test, test)
      sessionStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  }

  // Cookie helper methods with proper error handling
  private setCookie(name: string, value: string, days: number): void {
    try {
      if (typeof document === "undefined") return

      const expires = new Date()
      expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)

      const cookieValue = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax;Secure=${
        location.protocol === "https:"
      }`

      document.cookie = cookieValue
    } catch (error) {
      console.error("❌ Error setting cookie:", error)
    }
  }

  private getCookie(name: string): string | null {
    try {
      if (typeof document === "undefined") return null

      const nameEQ = name + "="
      const ca = document.cookie.split(";")

      for (let i = 0; i < ca.length; i++) {
        let c = ca[i]
        while (c.charAt(0) === " ") c = c.substring(1, c.length)
        if (c.indexOf(nameEQ) === 0) {
          return decodeURIComponent(c.substring(nameEQ.length, c.length))
        }
      }
      return null
    } catch (error) {
      console.error("❌ Error getting cookie:", error)
      return null
    }
  }

  private deleteCookie(name: string): void {
    try {
      if (typeof document === "undefined") return
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`
    } catch (error) {
      console.error("❌ Error deleting cookie:", error)
    }
  }

  // Public utility methods
  isSessionActive(): boolean {
    const session = this.getStoredSession()
    return session !== null && !this.isSessionExpired(session)
  }

  getSessionInfo(): { tableId: string; restaurantId: string; sessionId: string } | null {
    const session = this.getStoredSession()
    if (!session || this.isSessionExpired(session)) return null

    return {
      tableId: session.tableId,
      restaurantId: session.restaurantId,
      sessionId: session.sessionId,
    }
  }

  // Debug methods
  getDebugInfo(): any {
    return {
      hasLocalStorage: this.isLocalStorageAvailable(),
      hasSessionStorage: this.isSessionStorageAvailable(),
      hasCookies: typeof document !== "undefined",
      storedSession: this.getStoredSession(),
      cookieValue: this.getCookie(this.COOKIE_NAME),
      backupCookie: this.getCookie(this.BACKUP_COOKIE_NAME),
    }
  }
}

export const sessionPersistence = new SessionPersistence()
