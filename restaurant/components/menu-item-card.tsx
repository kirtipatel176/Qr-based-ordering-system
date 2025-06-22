"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Minus, Leaf, Flame, ShoppingCart } from "lucide-react"
import Image from "next/image"
import type { MenuItem } from "@/lib/supabase"

interface MenuItemCardProps {
  item: MenuItem
  onAddToCart: (item: MenuItem, quantity: number, customizations: any, instructions: string) => void
}

export function MenuItemCard({ item, onAddToCart }: MenuItemCardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [customizations, setCustomizations] = useState<any>({})
  const [instructions, setInstructions] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  const handleCustomizationChange = (optionName: string, checked: boolean) => {
    setCustomizations((prev: any) => ({
      ...prev,
      [optionName]: checked,
    }))
  }

  const calculatePrice = () => {
    let price = item.price
    if (item.customization_options) {
      item.customization_options.forEach((option: any) => {
        if (customizations[option.name]) {
          price += option.price || 0
        }
      })
    }
    return price * quantity
  }

  const handleAddToCart = async () => {
    setIsAdding(true)
    try {
      await onAddToCart(item, quantity, customizations, instructions)
      setIsOpen(false)
      setQuantity(1)
      setCustomizations({})
      setInstructions("")
    } catch (error) {
      console.error("Error adding to cart:", error)
    } finally {
      setIsAdding(false)
    }
  }

  const getSpiceIndicator = (level: number) => {
    return Array.from({ length: level }, (_, i) => <Flame key={i} className="h-3 w-3 text-red-500" />)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 border-0 bg-white/90 backdrop-blur-sm group">
          <CardContent className="p-0">
            {/* Image */}
            <div className="relative h-48 overflow-hidden rounded-t-lg">
              <Image
                src={item.image_url || "/placeholder.svg?height=200&width=200"}
                alt={item.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-200"
                unoptimized
              />
              {!item.is_available && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Badge variant="destructive">Out of Stock</Badge>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-lg text-slate-800 group-hover:text-emerald-600 transition-colors">
                  {item.name}
                </h3>
                <div className="text-right">
                  <div className="text-xl font-bold text-emerald-600">${item.price.toFixed(2)}</div>
                </div>
              </div>

              {item.description && <p className="text-slate-600 text-sm mb-3 line-clamp-2">{item.description}</p>}

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-3">
                {item.is_vegetarian && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                    <Leaf className="h-3 w-3 mr-1" />
                    Vegetarian
                  </Badge>
                )}
                {item.is_vegan && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                    <Leaf className="h-3 w-3 mr-1" />
                    Vegan
                  </Badge>
                )}
                {item.is_gluten_free && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                    GF
                  </Badge>
                )}
                {item.spice_level > 0 && (
                  <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">
                    {getSpiceIndicator(item.spice_level)}
                  </Badge>
                )}
              </div>

              {/* Add Button */}
              <Button
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
                disabled={!item.is_available}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                {item.is_available ? "Add to Cart" : "Out of Stock"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>

      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{item.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Image */}
          <div className="relative h-48 rounded-lg overflow-hidden">
            <Image
              src={item.image_url || "/placeholder.svg?height=200&width=200"}
              alt={item.name}
              fill
              className="object-cover"
              unoptimized
            />
          </div>

          {/* Description */}
          {item.description && <p className="text-slate-600">{item.description}</p>}

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {item.is_vegetarian && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <Leaf className="h-3 w-3 mr-1" />
                Vegetarian
              </Badge>
            )}
            {item.is_vegan && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <Leaf className="h-3 w-3 mr-1" />
                Vegan
              </Badge>
            )}
            {item.is_gluten_free && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Gluten Free
              </Badge>
            )}
            {item.spice_level > 0 && (
              <Badge variant="secondary" className="bg-red-100 text-red-800">
                <div className="flex items-center gap-1">
                  {getSpiceIndicator(item.spice_level)}
                  <span className="ml-1">Spicy</span>
                </div>
              </Badge>
            )}
          </div>

          {/* Customizations */}
          {item.customization_options && item.customization_options.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold">Customizations</h4>
              {item.customization_options.map((option: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`option-${index}`}
                      checked={customizations[option.name] || false}
                      onChange={(e) => handleCustomizationChange(option.name, e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor={`option-${index}`} className="text-sm">
                      {option.name}
                    </Label>
                  </div>
                  {option.price > 0 && <span className="text-sm text-slate-600">+${option.price.toFixed(2)}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Special Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions">Special Instructions (Optional)</Label>
            <Textarea
              id="instructions"
              placeholder="Any special requests or modifications..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
            />
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label>Quantity</Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
              <Button variant="outline" size="icon" onClick={() => setQuantity(quantity + 1)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Price and Add Button */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between text-lg">
              <span className="font-semibold">Total:</span>
              <span className="font-bold text-emerald-600">${calculatePrice().toFixed(2)}</span>
            </div>
            <Button
              onClick={handleAddToCart}
              className="w-full h-12 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
              disabled={!item.is_available || isAdding}
            >
              {isAdding ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Adding to Cart...
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart - ${calculatePrice().toFixed(2)}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
