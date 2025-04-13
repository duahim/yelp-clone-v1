"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/dash-ui/ui/tabs"
import {
  SidebarProvider,
} from "@/components/dash-ui/ui/sidebar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/dash-ui/ui/select"
import { BarChart, LineChart, PieChart, AreaChart } from "lucide-react"
import DatasetOverview from "@/components/dash-ui/dataset-overview"
import MetricsSection from "@/components/dash-ui/metrics-section"
import SimilarityDistribution from "@/components/dash-ui/similarity-distribution"
import RecommendationExplanation from "@/components/dash-ui/recommendation-explanation"

export default function Dashboard() {
  const [selectedMethod, setSelectedMethod] = useState<string>("tfidf")
  const [kValue, setKValue] = useState<string>("5")

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
          <div className="flex items-center gap-2">
            <BarChart className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Recommender Dashboard</h1>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Select value={selectedMethod} onValueChange={setSelectedMethod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tfidf">TF-IDF</SelectItem>
                <SelectItem value="lsa">LSA</SelectItem>
                <SelectItem value="sentence-transformer">Sentence Transformer</SelectItem>
              </SelectContent>
            </Select>
            <Select value={kValue} onValueChange={setKValue}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="K Value" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">K = 3</SelectItem>
                <SelectItem value="5">K = 5</SelectItem>
                <SelectItem value="10">K = 10</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </header>

        <main className="flex-1 p-6 space-y-8">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="flex w-full">
              <TabsTrigger value="overview">Dataset Overview</TabsTrigger>
              <TabsTrigger value="metrics">Ranking Metrics</TabsTrigger>
              <TabsTrigger value="similarity">Similarity Distribution</TabsTrigger>
              <TabsTrigger value="explanation">Recommendation Explanation</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <DatasetOverview />
            </TabsContent>

            <TabsContent value="metrics" className="mt-6">
              <MetricsSection method={selectedMethod} kValue={Number.parseInt(kValue) || 5} />
            </TabsContent>

            <TabsContent value="similarity" className="mt-6">
              <SimilarityDistribution method={selectedMethod} />
            </TabsContent>

            <TabsContent value="explanation" className="mt-6">
              <RecommendationExplanation method={selectedMethod} kValue={Number.parseInt(kValue) || 5} />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
