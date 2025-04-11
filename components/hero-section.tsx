import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function HeroSection() {
  return (
    <div className="relative h-[500px] bg-cover bg-center" style={{ backgroundImage: "url('/hero-bg.jpg')" }}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-center">
        <div className="max-w-md text-white">
          <h1 className="text-5xl font-bold mb-4">Weekend on a plate</h1>
          <Button className="bg-red-600 hover:bg-red-700 flex items-center gap-2 text-white">
            <Search className="h-4 w-4" />
            Brunch
          </Button>
        </div>
      </div>
    </div>
  )
}

