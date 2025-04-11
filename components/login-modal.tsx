"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { User } from "@/lib/user-interactions"

interface LoginModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLoginSuccess?: (user: User) => void
}

export function LoginModal({ open, onOpenChange, onLoginSuccess }: LoginModalProps) {
  const [users, setUsers] = useState<any[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  
  // Fetch users when the modal is opened
  useEffect(() => {
    if (open) {
      fetchUsers()
    }
  }, [open])
  
  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users")
      const data = await response.json()
      setUsers(data)
    } catch (error) {
      console.error("Error fetching users:", error)
      toast({
        title: "Error",
        description: "Failed to load users. Please try again.",
        variant: "destructive",
      })
    }
  }
  
  const handleLogin = async () => {
    if (!selectedUserId) {
      toast({
        title: "Error",
        description: "Please select a user to login",
        variant: "destructive",
      })
      return
    }
    
    setIsLoading(true)
    
    try {
      // Find the selected user
      const user = users.find(u => u.user_id === selectedUserId)
      
      // Store user info in localStorage
      localStorage.setItem("currentUser", JSON.stringify(user))
      
      // Close the modal
      onOpenChange(false)
      
      // Call the success callback if provided
      if (onLoginSuccess) {
        onLoginSuccess(user)
      } else {
        // Show toast message instead of navigating to liked page
        toast({
          title: "Logged in successfully",
          description: `Welcome, ${user.name}!`,
        })
      }
    } catch (error) {
      console.error("Error during login:", error)
      toast({
        title: "Login Failed",
        description: "There was an error logging in. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log in to Yelp Clone</DialogTitle>
          <DialogDescription>
            Select a user to see personalized recommendations.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <Select onValueChange={setSelectedUserId} value={selectedUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a user" />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.user_id} value={user.user_id}>
                  {user.name || `User ${user.user_id.substring(0, 8)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleLogin} disabled={isLoading || !selectedUserId}>
            {isLoading ? "Logging in..." : "Log In"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Default export for backward compatibility
export default LoginModal; 