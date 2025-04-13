"use client"

import Link from "next/link"
import { ChevronDown } from "lucide-react"
import MyListDropdown from "@/components/my-list-dropdown"
import FoodCategoryDropdown from "@/components/food-category-dropdown"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"

export default function Navbar() {
  return (
    <div className="container flex items-center px-4 sm:px-6 h-12 border-t">
      <nav className="flex items-center space-x-4">
        <FoodCategoryDropdown />
        <DropdownMenu>
          <DropdownMenuTrigger className="text-sm font-medium flex items-center gap-1">
            Dashboard
            <ChevronDown className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/level1">Level1</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/level2">Level2</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/level3">Level3</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/level4">Level4</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/level5">Level5</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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