"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/dash-ui/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/dash-ui/ui/tabs"
import { ChartContainer } from "@/components/dash-ui/ui/chart"
import { ResponsiveBar } from "@nivo/bar"
import { ResponsivePie } from "@nivo/pie"
import { initializeDashboardData, DatasetStats, ReviewDistribution, StarsDistribution, BusinessCategory } from "@/lib/dashboard-data"
import { BarDatum } from "@nivo/bar"

export default function DatasetOverview() {
  // State for the dashboard data
  const [datasetStats, setDatasetStats] = useState<DatasetStats>({
    totalUsers: 0,
    totalBusinesses: 0,
    totalReviews: 0,
    avgStarsPerBusiness: 0,
    avgReviewsPerUser: 0,
  });
  const [reviewDistributionData, setReviewDistributionData] = useState<ReviewDistribution[]>([]);
  const [starsDistributionData, setStarsDistributionData] = useState<StarsDistribution[]>([]);
  const [businessCategoriesData, setBusinessCategoriesData] = useState<BusinessCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load data when component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        // Try to load real data
        const { stats, reviewDistribution, starsDistribution, businessCategories } = await initializeDashboardData();
        
        setDatasetStats(stats);
        setReviewDistributionData(reviewDistribution);
        setStarsDistributionData(starsDistribution);
        setBusinessCategoriesData(businessCategories);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
        // If loading fails, we'll use the default state values
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-2xl">{datasetStats.totalUsers.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Businesses</CardDescription>
            <CardTitle className="text-2xl">{datasetStats.totalBusinesses.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Reviews</CardDescription>
            <CardTitle className="text-2xl">{datasetStats.totalReviews.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg. Stars per Business</CardDescription>
            <CardTitle className="text-2xl">{datasetStats.avgStarsPerBusiness}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Review Count Distribution</CardTitle>
            <CardDescription>Number of users by review count range</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ChartContainer>
                <ResponsiveBar
                  data={reviewDistributionData as BarDatum[]}
                  keys={["value"]}
                  indexBy="count"
                  margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
                  padding={0.3}
                  valueScale={{ type: "linear" }}
                  colors={{ scheme: "nivo" }}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: "Review Count Range",
                    legendPosition: "middle",
                    legendOffset: 40,
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: "Number of Users",
                    legendPosition: "middle",
                    legendOffset: -50,
                  }}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  role="application"
                  ariaLabel="Review count distribution"
                />
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stars Distribution</CardTitle>
            <CardDescription>Distribution of star ratings across all reviews</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ChartContainer>
                <ResponsiveBar
                  data={starsDistributionData as BarDatum[]}
                  keys={["value"]}
                  indexBy="stars"
                  margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
                  padding={0.3}
                  valueScale={{ type: "linear" }}
                  colors={{ scheme: "nivo" }}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: "Star Rating",
                    legendPosition: "middle",
                    legendOffset: 40,
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: "Percentage (%)",
                    legendPosition: "middle",
                    legendOffset: -50,
                  }}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  role="application"
                  ariaLabel="Stars distribution"
                />
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business Categories</CardTitle>
          <CardDescription>Distribution of businesses by category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ChartContainer>
              <ResponsivePie
                data={businessCategoriesData}
                margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
                innerRadius={0.5}
                padAngle={0.7}
                cornerRadius={3}
                activeOuterRadiusOffset={8}
                colors={{ scheme: "nivo" }}
                borderWidth={1}
                borderColor={{ from: "color", modifiers: [["darker", 0.2]] }}
                arcLinkLabelsSkipAngle={10}
                arcLinkLabelsTextColor={{ from: "color", modifiers: [] }}
                arcLinkLabelsThickness={2}
                arcLinkLabelsColor={{ from: "color" }}
                arcLabelsSkipAngle={10}
                arcLabelsTextColor={{ from: "color", modifiers: [["darker", 2]] }}
                legends={[
                  {
                    anchor: "bottom",
                    direction: "row",
                    justify: false,
                    translateX: 0,
                    translateY: 56,
                    itemsSpacing: 0,
                    itemWidth: 100,
                    itemHeight: 18,
                    itemTextColor: "#999",
                    itemDirection: "left-to-right",
                    itemOpacity: 1,
                    symbolSize: 18,
                    symbolShape: "circle",
                  },
                ]}
              />
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      
    </div>
  )
}
