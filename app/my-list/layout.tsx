import { ReactNode } from "react"

export default function MyListLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex-1 bg-gray-50">{children}</main>
  )
}

