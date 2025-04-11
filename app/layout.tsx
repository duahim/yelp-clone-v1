import "./globals.css"
import { Inter } from "next/font/google"
import Image from "next/image"
import Link from "next/link"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Navbar from "@/components/Navbar"
import { ClientWrapper } from "@/components/client-wrapper"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Yelp Clone",
  description: "A Yelp clone with restaurant recommendations",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Toaster />
        <ClientWrapper>
          <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-50 w-full bg-white shadow-sm">
              {/* Top header with search */}
              <div className="bg-[#f5f5f5] py-3 border-b">
                <div className="container flex items-center px-4 sm:px-6 gap-4">
                  {/* Yelp Logo */}
                  <Link href="/" className="shrink-0">
                    <div className="text-red-600 text-3xl font-bold flex items-center gap-1">
                      <span>yelp</span>
                      <span className="text-2xl">★</span>
                    </div>
                  </Link>
                  
                  {/* Search bar */}
                  <div className="flex flex-1 max-w-3xl mx-auto">
                    <div className="flex-1 flex">
                      <Input 
                        type="text" 
                        placeholder="things to do, tax services, plumb" 
                        className="rounded-l-md border-r-0 focus-visible:ring-0"
                      />
                    </div>
                    <div className="flex-1 flex">
                      <Input 
                        type="text" 
                        placeholder="San Jose, CA 95125" 
                        className="rounded-none border-l border-r-0 focus-visible:ring-0"
                      />
                    </div>
                    <Button type="submit" className="rounded-l-none bg-red-600 hover:bg-red-700">
                      <Search className="h-5 w-5" />
                    </Button>
                  </div>
                  
                  {/* Right side links and buttons */}
                  <div className="ml-auto flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-4">
                      <Link href="/business" className="text-sm font-medium">
                        Yelp for Business
                      </Link>
                      <Link href="/review" className="text-sm font-medium">
                        Write a Review
                      </Link>
                      <Link href="/project" className="text-sm font-medium">
                        Start a Project
                      </Link>
                    </div>
                    <Button id="login-button" variant="outline" className="hidden sm:flex">
                      Log In
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Navigation bar */}
              <Navbar />
            </header>
            {children}
          </div>
        </ClientWrapper>
      </body>
    </html>
  )
}
