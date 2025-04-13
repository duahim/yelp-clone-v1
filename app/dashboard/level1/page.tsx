import { Metadata } from "next"
import Dashboard from "@/components/dash-ui/dashboard"

export const metadata: Metadata = {
  title: "Dashboard | Yelp Clone",
  description: "Dashboard for data analysis and visualization",
}

export default function DashboardPage() {
  return <Dashboard />
} 