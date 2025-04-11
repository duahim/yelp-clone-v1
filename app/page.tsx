import Image from "next/image"
import Link from "next/link"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import HeroSection from "@/components/hero-section"

export default function Home() {
  return (
    <main className="flex-1">
      <HeroSection />
    </main>
  )
}

