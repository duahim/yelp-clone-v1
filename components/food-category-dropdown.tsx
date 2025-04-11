"use client"

import { useState } from "react"
import Link from "next/link"
import { ShoppingBag, Calendar, Utensils, Truck, Coffee, Pizza, Soup, Beef } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const foodCategories = [
  { name: "Takeout", icon: <ShoppingBag className="mr-2 h-5 w-5" />, href: "/search?category=takeout" },
  { name: "Reservations", icon: <Calendar className="mr-2 h-5 w-5" />, href: "/search?category=reservations" },
  { name: "Burgers", icon: <Beef className="mr-2 h-5 w-5" />, href: "/search?category=burgers" },
  { name: "Delivery", icon: <Truck className="mr-2 h-5 w-5" />, href: "/search?category=delivery" },
  { name: "Chinese", icon: <Soup className="mr-2 h-5 w-5" />, href: "/search?category=chinese" },
  { name: "Mexican", icon: <Utensils className="mr-2 h-5 w-5" />, href: "/search?category=mexican" },
  { name: "Italian", icon: <Pizza className="mr-2 h-5 w-5" />, href: "/search?category=italian" },
  { name: "Thai", icon: <Coffee className="mr-2 h-5 w-5" />, href: "/search?category=thai" },
]

export default function FoodCategoryDropdown() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger className="text-sm font-medium flex items-center gap-1 focus:outline-none">
        Restaurants
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ml-1"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[500px] grid grid-cols-2 p-4 bg-white">
        {foodCategories.map((category) => (
          <DropdownMenuItem key={category.name} asChild className="p-2">
            <Link href={category.href} className="flex items-center">
              {category.icon}
              <span>{category.name}</span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

