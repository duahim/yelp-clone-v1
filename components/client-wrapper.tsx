"use client"

import { useState, useEffect } from "react"
import { LoginModal } from "./login-modal"
import { User, getCurrentUser, logoutUser } from "@/lib/user-interactions"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "./ui/dropdown-menu"
import { LogOut, UserCircle } from "lucide-react"
import { useToast } from "./ui/use-toast"

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    // Set up event listener for login button
    const loginButton = document.getElementById("login-button")
    if (loginButton) {
      loginButton.addEventListener("click", () => setLoginModalOpen(true))
    }

    // Check if user is already logged in
    const user = getCurrentUser()
    setCurrentUser(user)

    return () => {
      // Clean up event listener
      if (loginButton) {
        loginButton.removeEventListener("click", () => setLoginModalOpen(true))
      }
    }
  }, [])

  // When a user logs in, update the UI
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user)
    setLoginModalOpen(false)
    
    // Show toast message instead of redirecting
    toast({
      title: "Logged in successfully",
      description: `Welcome, ${user.name}!`,
    })
  }

  const handleLogout = () => {
    logoutUser()
    setCurrentUser(null)
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    })
    router.push("/")
  }

  // Update the login/signup buttons based on login state
  useEffect(() => {
    const loginButton = document.getElementById("login-button")
    const signupButton = document.getElementById("signup-button")
    const userAvatarContainer = document.getElementById("user-avatar-container")
    
    if (currentUser) {
      // Hide login/signup buttons when logged in
      if (loginButton) loginButton.style.display = "none"
      if (signupButton) signupButton.style.display = "none"
      // Show user avatar
      if (userAvatarContainer) userAvatarContainer.style.display = "block"
    } else {
      // Show login/signup buttons when logged out
      if (loginButton) loginButton.style.display = "block"
      if (signupButton) signupButton.style.display = "block"
      // Hide user avatar
      if (userAvatarContainer) userAvatarContainer.style.display = "none"
    }
  }, [currentUser])

  return (
    <>
      {children}
      
      {/* User Avatar Dropdown - Will be shown when logged in */}
      <div 
        id="user-avatar-container" 
        className="hidden absolute top-4 right-4 z-50"
      >
        <DropdownMenu>
          <DropdownMenuTrigger className="focus:outline-none">
            <Avatar className="h-8 w-8 border border-gray-200">
              <AvatarFallback className="bg-red-500 text-white text-xs">
                {currentUser?.name?.substring(0, 2).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              {currentUser?.name || "User"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="cursor-pointer"
              onClick={() => router.push("/my-list/liked")}
            >
              <UserCircle className="mr-2 h-4 w-4" />
              <span>My Liked Restaurants</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="cursor-pointer"
              onClick={() => router.push("/my-list/saved")}
            >
              <UserCircle className="mr-2 h-4 w-4" />
              <span>My Saved Restaurants</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="cursor-pointer text-red-600" 
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <LoginModal 
        open={loginModalOpen} 
        onOpenChange={setLoginModalOpen}
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  )
} 