"use client"

import { useState } from "react"
import Link from "next/link"
import { Heart, Bookmark } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export default function MyListDropdown() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger className="text-sm font-medium flex items-center gap-1 focus:outline-none">
        My List
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
      <DropdownMenuContent align="start" className="w-[200px] p-2 bg-white">
        <DropdownMenuItem asChild className="p-2">
          <Link href="/my-list/liked" className="flex items-center">
            <Heart className="mr-2 h-5 w-5 text-red-500" />
            <span>Liked Restaurants</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="p-2">
          <Link href="/my-list/saved" className="flex items-center">
            <Bookmark className="mr-2 h-5 w-5 text-blue-500" />
            <span>Saved Restaurants</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

