import { supabase } from "./supabase"

export interface AdminUser {
  id: string
  email: string
  name: string
  role: string
  restaurant_id: string
}

export interface Employee {
  id: string
  username: string
  full_name: string
  role: string
  phone?: string
  is_active: boolean
  restaurant_id: string
}

export class AuthService {
  private static instance: AuthService
  private currentUser: AdminUser | Employee | null = null
  private sessionToken: string | null = null

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  async loginAdmin(email: string, password: string): Promise<{ success: boolean; user?: AdminUser; error?: string }> {
    try {
      const { data: user, error } = await supabase
        .from("admin_users")
        .select("*")
        .eq("email", email)
        .eq("is_active", true)
        .single()

      if (error || !user) {
        return { success: false, error: "Invalid email or password" }
      }

      // For demo purposes, we'll accept the password "admin123" for any admin user
      // In production, you'd use bcrypt.compare(password, user.password_hash)
      if (password !== "admin123") {
        return { success: false, error: "Invalid email or password" }
      }

      // Create session
      const sessionToken = this.generateSessionToken()
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

      await supabase.from("admin_sessions").insert({
        admin_user_id: user.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
      })

      this.currentUser = user
      this.sessionToken = sessionToken
      localStorage.setItem("admin_session", sessionToken)

      return { success: true, user }
    } catch (error) {
      console.error("Login error:", error)
      return { success: false, error: "Login failed" }
    }
  }

  async loginEmployee(
    username: string,
    password: string,
  ): Promise<{ success: boolean; user?: Employee; error?: string }> {
    try {
      const { data: employee, error } = await supabase
        .from("employees")
        .select("*")
        .eq("username", username)
        .eq("is_active", true)
        .single()

      if (error || !employee) {
        return { success: false, error: "Invalid username or password" }
      }

      // For demo purposes, we'll accept the password "admin123" for any employee
      // In production, you'd use bcrypt.compare(password, employee.password_hash)
      if (password !== "admin123") {
        return { success: false, error: "Invalid username or password" }
      }

      this.currentUser = employee
      localStorage.setItem("employee_session", username)

      return { success: true, user: employee }
    } catch (error) {
      console.error("Employee login error:", error)
      return { success: false, error: "Login failed" }
    }
  }

  async logout(): Promise<void> {
    if (this.sessionToken) {
      await supabase.from("admin_sessions").delete().eq("session_token", this.sessionToken)
    }

    this.currentUser = null
    this.sessionToken = null
    localStorage.removeItem("admin_session")
    localStorage.removeItem("employee_session")
  }

  async getCurrentUser(): Promise<AdminUser | Employee | null> {
    if (this.currentUser) return this.currentUser

    const adminSession = localStorage.getItem("admin_session")
    const employeeSession = localStorage.getItem("employee_session")

    if (adminSession) {
      const { data: session } = await supabase
        .from("admin_sessions")
        .select("*, admin_users(*)")
        .eq("session_token", adminSession)
        .gt("expires_at", new Date().toISOString())
        .single()

      if (session?.admin_users) {
        this.currentUser = session.admin_users
        this.sessionToken = adminSession
        return this.currentUser
      }
    }

    if (employeeSession) {
      const { data: employee } = await supabase
        .from("employees")
        .select("*")
        .eq("username", employeeSession)
        .eq("is_active", true)
        .single()

      if (employee) {
        this.currentUser = employee
        return this.currentUser
      }
    }

    return null
  }

  isAdmin(): boolean {
    return this.currentUser && "email" in this.currentUser && this.currentUser.role === "admin"
  }

  isEmployee(): boolean {
    return this.currentUser && "username" in this.currentUser
  }

  private generateSessionToken(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  async createEmployee(employeeData: {
    username: string
    password: string
    full_name: string
    role: string
    phone?: string
    restaurant_id: string
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // For demo purposes, we'll use a simple password hash
      // In production, use bcrypt.hash(employeeData.password, 10)
      const passwordHash = "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"

      const { error } = await supabase.from("employees").insert({
        ...employeeData,
        password_hash: passwordHash,
        created_by: this.currentUser?.id,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error("Create employee error:", error)
      return { success: false, error: "Failed to create employee" }
    }
  }
}

export const authService = AuthService.getInstance()
