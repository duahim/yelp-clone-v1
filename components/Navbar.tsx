"use client"

import Link from "next/link"
import { ChevronDown } from "lucide-react"
import MyListDropdown from "@/components/my-list-dropdown"
import FoodCategoryDropdown from "@/components/food-category-dropdown"

export default function Navbar() {
  return (
    <div className="container flex items-center px-4 sm:px-6 h-12 border-t">
      <nav className="flex items-center space-x-4">
        <FoodCategoryDropdown />
        <Link href="/services/home" className="text-sm font-medium flex items-center gap-1">
          Home Services
          <ChevronDown className="h-4 w-4" />
        </Link>
        <Link href="/services/auto" className="text-sm font-medium flex items-center gap-1">
          Auto Services
          <ChevronDown className="h-4 w-4" />
        </Link>
        <Link href="/more" className="text-sm font-medium flex items-center gap-1">
          More
          <ChevronDown className="h-4 w-4" />
        </Link>
        <MyListDropdown />
      </nav>
    </div>
  )
} 