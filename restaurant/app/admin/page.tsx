"use client"

import { useState, useEffect } from "react"
import { Plus, Edit, Trash2, QrCode, Users, BarChart3, Settings } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { supabase, type MenuItem, type MenuCategory, type Table as RestaurantTable, type Order } from "@/lib/supabase"
import { QRCodeDisplay } from "@/components/qr-code-display"
import { authService, type AdminUser } from "@/lib/auth"

export default function AdminPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false)
  const [isAddItemOpen, setIsAddItemOpen] = useState(false)
  const [isAddTableOpen, setIsAddTableOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [employees, setEmployees] = useState<any[]>([])
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false)

  const restaurantId = "550e8400-e29b-41d4-a716-446655440000" // Default restaurant ID

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const user = await authService.getCurrentUser()
    if (user && authService.isAdmin()) {
      setCurrentUser(user as AdminUser)
      setIsAuthenticated(true)
      fetchData()
      fetchEmployees()
    } else {
      window.location.href = "/login"
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)

      // Use Promise.all for better performance
      const [categoriesResult, itemsResult, tablesResult, ordersResult] = await Promise.all([
        supabase.from("menu_categories").select("*").eq("restaurant_id", restaurantId).order("sort_order"),
        supabase.from("menu_items").select("*").eq("restaurant_id", restaurantId).order("sort_order"),
        supabase.from("tables").select("*").eq("restaurant_id", restaurantId).order("table_number"),
        supabase
          .from("orders")
          .select(`
          *,
          table_sessions!inner(
            table_id,
            customer_name,
            tables!inner(table_number)
          )
        `)
          .order("created_at", { ascending: false })
          .limit(10),
      ])

      // Handle results with error checking
      if (categoriesResult.error) {
        console.error("Error fetching categories:", categoriesResult.error.message)
      } else {
        setCategories(categoriesResult.data || [])
      }

      if (itemsResult.error) {
        console.error("Error fetching menu items:", itemsResult.error.message)
      } else {
        setMenuItems(itemsResult.data || [])
      }

      if (tablesResult.error) {
        console.error("Error fetching tables:", tablesResult.error.message)
      } else {
        setTables(tablesResult.data || [])
      }

      if (ordersResult.error) {
        console.error("Error fetching orders:", ordersResult.error.message)
      } else {
        setOrders(ordersResult.data || [])
      }
    } catch (error) {
      console.error("Unexpected error in admin fetchData:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from("employees")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })

    setEmployees(data || [])
  }

  const addEmployee = async (formData: FormData) => {
    const username = formData.get("username") as string
    const password = formData.get("password") as string
    const fullName = formData.get("full_name") as string
    const role = formData.get("role") as string
    const phone = formData.get("phone") as string

    const result = await authService.createEmployee({
      username,
      password,
      full_name: fullName,
      role,
      phone,
      restaurant_id: restaurantId,
    })

    if (result.success) {
      fetchEmployees()
      setIsAddEmployeeOpen(false)
    } else {
      alert(result.error)
    }
  }

  const addCategory = async (formData: FormData) => {
    const name = formData.get("name") as string
    const description = formData.get("description") as string

    try {
      await supabase.from("menu_categories").insert({
        restaurant_id: restaurantId,
        name,
        description,
        sort_order: categories.length,
      })

      fetchData()
      setIsAddCategoryOpen(false)
    } catch (error) {
      console.error("Error adding category:", error)
    }
  }

  const addMenuItem = async (formData: FormData) => {
    const categoryId = formData.get("category_id") as string
    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const price = Number.parseFloat(formData.get("price") as string)
    const isVegetarian = formData.get("is_vegetarian") === "on"
    const isVegan = formData.get("is_vegan") === "on"
    const isGlutenFree = formData.get("is_gluten_free") === "on"
    const spiceLevel = Number.parseInt(formData.get("spice_level") as string) || 0

    try {
      await supabase.from("menu_items").insert({
        restaurant_id: restaurantId,
        category_id: categoryId,
        name,
        description,
        price,
        is_vegetarian: isVegetarian,
        is_vegan: isVegan,
        is_gluten_free: isGlutenFree,
        spice_level: spiceLevel,
        image_url: "/placeholder.svg?height=200&width=200",
        customization_options: [],
        sort_order: menuItems.filter((item) => item.category_id === categoryId).length,
      })

      fetchData()
      setIsAddItemOpen(false)
    } catch (error) {
      console.error("Error adding menu item:", error)
    }
  }

  const addTable = async (formData: FormData) => {
    const tableNumber = formData.get("table_number") as string

    try {
      await supabase.from("tables").insert({
        restaurant_id: restaurantId,
        table_number: tableNumber,
        qr_code: `table-${tableNumber.toLowerCase()}-qr`,
      })

      fetchData()
      setIsAddTableOpen(false)
    } catch (error) {
      console.error("Error adding table:", error)
    }
  }

  const toggleItemAvailability = async (itemId: string, isAvailable: boolean) => {
    try {
      await supabase.from("menu_items").update({ is_available: isAvailable }).eq("id", itemId)

      fetchData()
    } catch (error) {
      console.error("Error updating item availability:", error)
    }
  }

  const deleteItem = async (itemId: string) => {
    if (confirm("Are you sure you want to delete this item?")) {
      try {
        await supabase.from("menu_items").delete().eq("id", itemId)
        fetchData()
      } catch (error) {
        console.error("Error deleting item:", error)
      }
    }
  }

  const deleteTable = async (tableId: string) => {
    if (confirm("Are you sure you want to delete this table?")) {
      try {
        await supabase.from("tables").delete().eq("id", tableId)
        fetchData()
      } catch (error) {
        console.error("Error deleting table:", error)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading admin panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">Welcome, {currentUser?.name}</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              authService.logout()
              window.location.href = "/login"
            }}
          >
            Logout
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="flex items-center p-6">
              <BarChart3 className="h-8 w-8 text-primary mr-3" />
              <div>
                <h3 className="font-semibold">Total Orders</h3>
                <p className="text-2xl font-bold">{orders.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <Users className="h-8 w-8 text-primary mr-3" />
              <div>
                <h3 className="font-semibold">Active Tables</h3>
                <p className="text-2xl font-bold">{tables.filter((t) => t.is_active).length}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <QrCode className="h-8 w-8 text-primary mr-3" />
              <div>
                <h3 className="font-semibold">Menu Items</h3>
                <p className="text-2xl font-bold">{menuItems.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <Settings className="h-8 w-8 text-primary mr-3" />
              <div>
                <h3 className="font-semibold">Categories</h3>
                <p className="text-2xl font-bold">{categories.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="menu" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="menu">Menu Management</TabsTrigger>
            <TabsTrigger value="tables">Table Management</TabsTrigger>
            <TabsTrigger value="employees">Staff Management</TabsTrigger>
            <TabsTrigger value="orders">Recent Orders</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Menu Management */}
          <TabsContent value="menu" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Menu Management</h2>
              <div className="flex gap-2">
                <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Category</DialogTitle>
                    </DialogHeader>
                    <form action={addCategory} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Category Name</Label>
                        <Input id="name" name="name" required />
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" name="description" />
                      </div>
                      <Button type="submit" className="w-full">
                        Add Category
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Menu Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add New Menu Item</DialogTitle>
                    </DialogHeader>
                    <form action={addMenuItem} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="category_id">Category</Label>
                          <select id="category_id" name="category_id" className="w-full p-2 border rounded-md" required>
                            <option value="">Select Category</option>
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label htmlFor="price">Price ($)</Label>
                          <Input id="price" name="price" type="number" step="0.01" min="0" required />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="name">Item Name</Label>
                        <Input id="name" name="name" required />
                      </div>

                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" name="description" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="spice_level">Spice Level (0-4)</Label>
                          <Input id="spice_level" name="spice_level" type="number" min="0" max="4" defaultValue="0" />
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="is_vegetarian" name="is_vegetarian" className="rounded" />
                          <Label htmlFor="is_vegetarian">Vegetarian</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="is_vegan" name="is_vegan" className="rounded" />
                          <Label htmlFor="is_vegan">Vegan</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="is_gluten_free" name="is_gluten_free" className="rounded" />
                          <Label htmlFor="is_gluten_free">Gluten Free</Label>
                        </div>
                      </div>

                      <Button type="submit" className="w-full">
                        Add Menu Item
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="space-y-6">
              {categories.map((category) => (
                <Card key={category.id}>
                  <CardHeader>
                    <CardTitle>{category.name}</CardTitle>
                    {category.description && <CardDescription>{category.description}</CardDescription>}
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Dietary</TableHead>
                          <TableHead>Available</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {menuItems
                          .filter((item) => item.category_id === category.id)
                          .map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{item.name}</div>
                                  {item.description && (
                                    <div className="text-sm text-muted-foreground">{item.description}</div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>${item.price.toFixed(2)}</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  {item.is_vegetarian && (
                                    <Badge variant="secondary" className="text-xs">
                                      V
                                    </Badge>
                                  )}
                                  {item.is_vegan && (
                                    <Badge variant="secondary" className="text-xs">
                                      VG
                                    </Badge>
                                  )}
                                  {item.is_gluten_free && (
                                    <Badge variant="secondary" className="text-xs">
                                      GF
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Switch
                                  checked={item.is_available}
                                  onCheckedChange={(checked) => toggleItemAvailability(item.id, checked)}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button variant="outline" size="sm">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="destructive" size="sm" onClick={() => deleteItem(item.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Table Management */}
          <TabsContent value="tables" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Table Management</h2>
              <Dialog open={isAddTableOpen} onOpenChange={setIsAddTableOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Table
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Table</DialogTitle>
                  </DialogHeader>
                  <form action={addTable} className="space-y-4">
                    <div>
                      <Label htmlFor="table_number">Table Number</Label>
                      <Input id="table_number" name="table_number" placeholder="e.g., T001, Table 1" required />
                    </div>
                    <Button type="submit" className="w-full">
                      Add Table
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {tables.map((table) => (
                <Card key={table.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Table {table.table_number}</h3>
                      <Button variant="destructive" size="sm" onClick={() => deleteTable(table.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <QRCodeDisplay
                      tableId={table.id}
                      restaurantId={table.restaurant_id}
                      tableNumber={table.table_number}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="employees" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Staff Management</h2>
              <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Employee
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Employee</DialogTitle>
                  </DialogHeader>
                  <form action={addEmployee} className="space-y-4">
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input id="username" name="username" required />
                    </div>
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input id="password" name="password" type="password" required />
                    </div>
                    <div>
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input id="full_name" name="full_name" required />
                    </div>
                    <div>
                      <Label htmlFor="role">Role</Label>
                      <select id="role" name="role" className="w-full p-2 border rounded-md" required>
                        <option value="kitchen_staff">Kitchen Staff</option>
                        <option value="waiter">Waiter</option>
                        <option value="manager">Manager</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" name="phone" type="tel" />
                    </div>
                    <Button type="submit" className="w-full">
                      Add Employee
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">{employee.username}</TableCell>
                        <TableCell>{employee.full_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{employee.role}</Badge>
                        </TableCell>
                        <TableCell>{employee.phone || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant={employee.is_active ? "default" : "secondary"}>
                            {employee.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recent Orders */}
          <TabsContent value="orders" className="space-y-6">
            <h2 className="text-2xl font-semibold">Recent Orders</h2>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.order_number}</TableCell>
                        <TableCell>{order.table_sessions?.tables?.table_number}</TableCell>
                        <TableCell>{order.items.length} items</TableCell>
                        <TableCell>${order.total_amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              order.status === "ready"
                                ? "default"
                                : order.status === "preparing"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(order.created_at).toLocaleTimeString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics" className="space-y-6">
            <h2 className="text-2xl font-semibold">Analytics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Today's Sales</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">$0.00</div>
                  <p className="text-muted-foreground">No sales data available</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Popular Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Analytics coming soon...</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Average Order Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">$0.00</div>
                  <p className="text-muted-foreground">No order data available</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
