"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/dash-ui/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/dash-ui/ui/tabs"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/dash-ui/ui/chart"
import { ResponsiveLine } from "@nivo/line"
import { ResponsiveBar } from "@nivo/bar"
import { HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/dash-ui/ui/tooltip"

// Initial mock data - will be replaced with actual data from the API
const initialPrecisionData = {
  tfidf: [
    { k: 1, value: 0.42 },
    { k: 3, value: 0.38 },
    { k: 5, value: 0.35 },
    { k: 10, value: 0.3 },
    { k: 15, value: 0.25 },
    { k: 20, value: 0.22 },
  ],
  lsa: [
    { k: 1, value: 0.4 },
    { k: 3, value: 0.36 },
    { k: 5, value: 0.33 },
    { k: 10, value: 0.28 },
    { k: 15, value: 0.24 },
    { k: 20, value: 0.2 },
  ],
  "sentence-transformer": [
    { k: 1, value: 0.45 },
    { k: 3, value: 0.41 },
    { k: 5, value: 0.38 },
    { k: 10, value: 0.33 },
    { k: 15, value: 0.28 },
    { k: 20, value: 0.25 },
  ],
}

const initialRecallData = {
  tfidf: [
    { k: 1, value: 0.08 },
    { k: 3, value: 0.22 },
    { k: 5, value: 0.32 },
    { k: 10, value: 0.45 },
    { k: 15, value: 0.52 },
    { k: 20, value: 0.58 },
  ],
  lsa: [
    { k: 1, value: 0.07 },
    { k: 3, value: 0.2 },
    { k: 5, value: 0.3 },
    { k: 10, value: 0.42 },
    { k: 15, value: 0.5 },
    { k: 20, value: 0.55 },
  ],
  "sentence-transformer": [
    { k: 1, value: 0.09 },
    { k: 3, value: 0.24 },
    { k: 5, value: 0.35 },
    { k: 10, value: 0.48 },
    { k: 15, value: 0.56 },
    { k: 20, value: 0.62 },
  ],
}

const initialNdcgData = {
  tfidf: [
    { k: 1, value: 0.42 },
    { k: 3, value: 0.4 },
    { k: 5, value: 0.38 },
    { k: 10, value: 0.35 },
    { k: 15, value: 0.33 },
    { k: 20, value: 0.31 },
  ],
  lsa: [
    { k: 1, value: 0.4 },
    { k: 3, value: 0.38 },
    { k: 5, value: 0.36 },
    { k: 10, value: 0.33 },
    { k: 15, value: 0.31 },
    { k: 20, value: 0.29 },
  ],
  "sentence-transformer": [
    { k: 1, value: 0.45 },
    { k: 3, value: 0.43 },
    { k: 5, value: 0.41 },
    { k: 10, value: 0.38 },
    { k: 15, value: 0.36 },
    { k: 20, value: 0.34 },
  ],
}

// Define types for metrics data
interface MetricDataPoint {
  k: number;
  value: number;
}

interface MetricsData {
  tfidf: MetricDataPoint[];
  lsa: MetricDataPoint[];
  "sentence-transformer": MetricDataPoint[];
}

interface FormattedLineData {
  id: string;
  data: { x: number; y: number }[];
}

// Regular formatting functions (not hooks)
const formatLineData = (data: any, method: string): FormattedLineData[] => {
  if (!data || !data[method]) {
    return [{ id: "No Data", data: [] }]
  }

  return [
    {
      id: method === "tfidf" ? "TF-IDF" : method === "lsa" ? "LSA" : "Sentence Transformer",
      data: data[method].map((d: any) => ({ x: d?.k || 0, y: d?.value || 0 })),
    },
  ]
}

const formatBarData = (data: any, k: number) => {
  if (!data) {
    return []
  }

  const tfidfValue = data.tfidf?.find((d: any) => d?.k === k)?.value || 0
  const lsaValue = data.lsa?.find((d: any) => d?.k === k)?.value || 0
  const stValue = data["sentence-transformer"]?.find((d: any) => d?.k === k)?.value || 0

  return [
    { method: "TF-IDF", value: tfidfValue },
    { method: "LSA", value: lsaValue },
    { method: "Sentence Transformer", value: stValue },
  ]
}

interface MetricsSectionProps {
  method: string
  kValue: number
}

export default function MetricsSection({ method, kValue }: MetricsSectionProps) {
  const [precisionData, setPrecisionData] = useState(initialPrecisionData)
  const [recallData, setRecallData] = useState(initialRecallData)
  const [ndcgData, setNdcgData] = useState(initialNdcgData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetchCount, setFetchCount] = useState(0) // For debugging

  // Memoize line and bar data to prevent unnecessary recalculations
  const formattedPrecisionLineData = useMemo(() => 
    formatLineData(precisionData, method),
    [precisionData, method]
  )
  
  const formattedRecallLineData = useMemo(() => 
    formatLineData(recallData, method),
    [recallData, method]
  )
  
  const formattedNdcgLineData = useMemo(() => 
    formatLineData(ndcgData, method),
    [ndcgData, method]
  )
  
  const formattedComparisonData = useMemo(() => [
    {
      metric: "Precision",
      "TF-IDF": precisionData.tfidf.find((d) => d?.k === kValue)?.value || 0,
      LSA: precisionData.lsa.find((d) => d?.k === kValue)?.value || 0,
      "Sentence Transformer":
        precisionData["sentence-transformer"].find((d) => d?.k === kValue)?.value || 0,
    },
    {
      metric: "Recall",
      "TF-IDF": recallData.tfidf.find((d) => d?.k === kValue)?.value || 0,
      LSA: recallData.lsa.find((d) => d?.k === kValue)?.value || 0,
      "Sentence Transformer": recallData["sentence-transformer"].find((d) => d?.k === kValue)?.value || 0,
    },
    {
      metric: "NDCG",
      "TF-IDF": ndcgData.tfidf.find((d) => d?.k === kValue)?.value || 0,
      LSA: ndcgData.lsa.find((d) => d?.k === kValue)?.value || 0, 
      "Sentence Transformer": ndcgData["sentence-transformer"].find((d) => d?.k === kValue)?.value || 0,
    },
  ], [precisionData, recallData, ndcgData, kValue]);

  // Use a single fetch effect with a clear dependency array
  useEffect(() => {
    let isMounted = true;
    console.log("Fetching metrics data..."); // Debug log
    
    const fetchMetrics = async () => {
      if (!isMounted) return;
      
      try {
        setLoading(true);
        setError(null);
        setFetchCount(prev => prev + 1); // Track fetch count for debugging
        
        // Set a timeout to avoid hanging on slow requests
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('API request timeout after 20 seconds')), 20000)
        );
        
        console.log('Attempting to fetch metrics from API...');
        const fetchPromise = fetch('/api/evaluation/recommenders', {
          cache: 'no-store', // Force fresh data instead of using cache
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        // Race the fetch against the timeout
        const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
        
        if (!isMounted) return;
        
        if (response instanceof Error || !response) {
          if (response?.message === 'Request timed out') {
            setError('Request timed out. The embedding service may be unavailable.');
          } else {
            setError(`Error fetching metrics: ${response instanceof Error ? response.message : 'Unknown error'}`);
          }
          setLoading(false);
          return;
        }
        
        if (!response.ok) {
          throw new Error(`Failed to fetch metrics data: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!isMounted) return;
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        // Check if any models failed to load
        let partialDataWarning = null;
        if (!data["sentence-transformer"] || Object.keys(data["sentence-transformer"]).length === 0) {
          partialDataWarning = "Note: Sentence Transformer model data is unavailable. Some metrics may be incomplete.";
          console.warn(partialDataWarning);
        }
        
        // Update state with actual metrics data
        setPrecisionData({
          tfidf: data.tfidf?.precision || initialPrecisionData.tfidf,
          lsa: data.lsa?.precision || initialPrecisionData.lsa,
          "sentence-transformer": data["sentence-transformer"]?.precision || initialPrecisionData["sentence-transformer"],
        });
        
        setRecallData({
          tfidf: data.tfidf?.recall || initialRecallData.tfidf,
          lsa: data.lsa?.recall || initialRecallData.lsa,
          "sentence-transformer": data["sentence-transformer"]?.recall || initialRecallData["sentence-transformer"],
        });
        
        setNdcgData({
          tfidf: data.tfidf?.ndcg || initialNdcgData.tfidf,
          lsa: data.lsa?.ndcg || initialNdcgData.lsa,
          "sentence-transformer": data["sentence-transformer"]?.ndcg || initialNdcgData["sentence-transformer"],
        });
        
        // If we have a partial data warning, set it as a non-critical error
        if (partialDataWarning) {
          setError(partialDataWarning);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Error fetching metrics:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        
        // Explicitly ensure mock data is used when API fails
        console.log('Using mock data as fallback due to API error');
        setPrecisionData(initialPrecisionData);
        setRecallData(initialRecallData);
        setNdcgData(initialNdcgData);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchMetrics();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run on mount

  return (
    <div className="space-y-6">
      {loading && <div className="text-center py-4">Loading metrics data...</div>}
      {error && (
        <div className={`text-center py-4 px-4 rounded ${error.includes('Note:') ? 'bg-yellow-50 text-yellow-800' : 'bg-red-50 text-red-500'}`}>
          {error}
          {!loading && (
            <button 
              className="ml-4 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              onClick={() => {
                console.log('Manually loading sample data');
                setPrecisionData(initialPrecisionData);
                setRecallData(initialRecallData);
                setNdcgData(initialNdcgData);
                setError(null);
              }}
            >
              Load Sample Data
            </button>
          )}
        </div>
      )}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-muted-foreground">Fetch count: {fetchCount}</div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Precision@{kValue}</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Precision@K measures the proportion of recommended items in the top-K that are relevant. Higher
                      values indicate better accuracy in recommendations.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <CardDescription>
              {method === "tfidf" ? "TF-IDF" : method === "lsa" ? "LSA" : "Sentence Transformer"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {(
                (precisionData[method as keyof typeof precisionData]?.find((d) => d?.k === kValue)?.value || 0) * 100
              ).toFixed(0)}
              %
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recall@{kValue}</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Recall@K measures the proportion of relevant items that are successfully retrieved in the top-K
                      recommendations. Higher values indicate better coverage of relevant items.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <CardDescription>
              {method === "tfidf" ? "TF-IDF" : method === "lsa" ? "LSA" : "Sentence Transformer"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {(
                (recallData[method as keyof typeof recallData]?.find((d) => d?.k === kValue)?.value || 0) * 100
              ).toFixed(0)}
              %
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">NDCG@{kValue}</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Normalized Discounted Cumulative Gain measures the ranking quality, taking into account the
                      position of relevant items. Higher values indicate better ranking of recommendations.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <CardDescription>
              {method === "tfidf" ? "TF-IDF" : method === "lsa" ? "LSA" : "Sentence Transformer"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {((ndcgData[method as keyof typeof ndcgData]?.find((d) => d?.k === kValue)?.value || 0) * 100).toFixed(0)}
              %
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="precision">
        {/* <TabsList className="grid w-full grid-cols-3"> */}
        <TabsList className="flex w-full">
          <TabsTrigger value="precision">Precision@K</TabsTrigger>
          <TabsTrigger value="recall">Recall@K</TabsTrigger>
          <TabsTrigger value="ndcg">NDCG@K</TabsTrigger>
        </TabsList>

        <TabsContent value="precision" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Precision@K Across Different K Values</CardTitle>
              <CardDescription>How precision changes as the number of recommendations (K) increases</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ChartContainer>
                  <ResponsiveLine
                    data={formattedPrecisionLineData}
                    margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
                    xScale={{ type: "point" }}
                    yScale={{ type: "linear", min: 0, max: 0.5 }}
                    axisBottom={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      legend: "K Value",
                      legendOffset: 40,
                      legendPosition: "middle",
                    }}
                    axisLeft={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      legend: "Precision",
                      legendOffset: -50,
                      legendPosition: "middle",
                      format: (value) => `${value * 100}%`,
                    }}
                    pointSize={10}
                    pointColor={{ theme: "background" }}
                    pointBorderWidth={2}
                    pointBorderColor={{ from: "serieColor" }}
                    pointLabelYOffset={-12}
                    useMesh={true}
                    enableSlices="x"
                    sliceTooltip={({ slice }) => {
                      if (!slice || !slice.points || slice.points.length === 0) {
                        return null
                      }
                      return (
                        <ChartTooltip>
                          <ChartTooltipContent>
                            {slice.points.map((point) => {
                              if (!point || !point.data) return null
                              return (
                                <div key={point.id} className="flex items-center">
                                  <div
                                    className="mr-2 h-3 w-3 rounded-full"
                                    style={{ backgroundColor: point.serieColor }}
                                  />
                                  <span className="font-bold">
                                    {point.data.yFormatted || `${(Number(point.data.y) * 100).toFixed(1)}%`}
                                  </span>
                                </div>
                              )
                            })}
                            <div className="pt-2 text-xs">K = {String(slice.points[0]?.data?.x || "N/A")}</div>
                          </ChartTooltipContent>
                        </ChartTooltip>
                      )
                    }}
                  />
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recall" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Recall@K Across Different K Values</CardTitle>
              <CardDescription>How recall changes as the number of recommendations (K) increases</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ChartContainer>
                  <ResponsiveLine
                    data={formattedRecallLineData}
                    margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
                    xScale={{ type: "point" }}
                    yScale={{ type: "linear", min: 0, max: 0.7 }}
                    axisBottom={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      legend: "K Value",
                      legendOffset: 40,
                      legendPosition: "middle",
                    }}
                    axisLeft={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      legend: "Recall",
                      legendOffset: -50,
                      legendPosition: "middle",
                      format: (value) => `${value * 100}%`,
                    }}
                    pointSize={10}
                    pointColor={{ theme: "background" }}
                    pointBorderWidth={2}
                    pointBorderColor={{ from: "serieColor" }}
                    pointLabelYOffset={-12}
                    useMesh={true}
                    enableSlices="x"
                    sliceTooltip={({ slice }) => {
                      if (!slice || !slice.points || slice.points.length === 0) {
                        return null
                      }
                      return (
                        <ChartTooltip>
                          <ChartTooltipContent>
                            {slice.points.map((point) => {
                              if (!point || !point.data) return null
                              return (
                                <div key={point.id} className="flex items-center">
                                  <div
                                    className="mr-2 h-3 w-3 rounded-full"
                                    style={{ backgroundColor: point.serieColor }}
                                  />
                                  <span className="font-bold">
                                    {point.data.yFormatted || `${(Number(point.data.y) * 100).toFixed(1)}%`}
                                  </span>
                                </div>
                              )
                            })}
                            <div className="pt-2 text-xs">K = {String(slice.points[0]?.data?.x || "N/A")}</div>
                          </ChartTooltipContent>
                        </ChartTooltip>
                      )
                    }}
                  />
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ndcg" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>NDCG@K Across Different K Values</CardTitle>
              <CardDescription>How NDCG changes as the number of recommendations (K) increases</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ChartContainer>
                  <ResponsiveLine
                    data={formattedNdcgLineData}
                    margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
                    xScale={{ type: "point" }}
                    yScale={{ type: "linear", min: 0, max: 0.5 }}
                    axisBottom={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      legend: "K Value",
                      legendOffset: 40,
                      legendPosition: "middle",
                    }}
                    axisLeft={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      legend: "NDCG",
                      legendOffset: -50,
                      legendPosition: "middle",
                      format: (value) => `${value * 100}%`,
                    }}
                    pointSize={10}
                    pointColor={{ theme: "background" }}
                    pointBorderWidth={2}
                    pointBorderColor={{ from: "serieColor" }}
                    pointLabelYOffset={-12}
                    useMesh={true}
                    enableSlices="x"
                    sliceTooltip={({ slice }) => {
                      if (!slice || !slice.points || slice.points.length === 0) {
                        return null
                      }
                      return (
                        <ChartTooltip>
                          <ChartTooltipContent>
                            {slice.points.map((point) => {
                              if (!point || !point.data) return null
                              return (
                                <div key={point.id} className="flex items-center">
                                  <div
                                    className="mr-2 h-3 w-3 rounded-full"
                                    style={{ backgroundColor: point.serieColor }}
                                  />
                                  <span className="font-bold">
                                    {point.data.yFormatted || `${(Number(point.data.y) * 100).toFixed(1)}%`}
                                  </span>
                                </div>
                              )
                            })}
                            <div className="pt-2 text-xs">K = {String(slice.points[0]?.data?.x || "N/A")}</div>
                          </ChartTooltipContent>
                        </ChartTooltip>
                      )
                    }}
                  />
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Comparison at K={kValue}</CardTitle>
          <CardDescription>Comparing all metrics across different recommendation methods at K={kValue}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ChartContainer>
              <ResponsiveBar
                data={formattedComparisonData}
                keys={["TF-IDF", "LSA", "Sentence Transformer"]}
                indexBy="metric"
                margin={{ top: 20, right: 130, bottom: 50, left: 60 }}
                padding={0.3}
                groupMode="grouped"
                valueScale={{ type: "linear" }}
                indexScale={{ type: "band", round: true }}
                colors={{ scheme: "nivo" }}
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: "Metric",
                  legendPosition: "middle",
                  legendOffset: 40,
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: "Value",
                  legendPosition: "middle",
                  legendOffset: -50,
                  format: (value) => `${value * 100}%`,
                }}
                labelSkipWidth={12}
                labelSkipHeight={12}
                labelFormat={(value: string | number) => `${(Number(value) * 100).toFixed(1)}%`}
                legends={[
                  {
                    dataFrom: "keys",
                    anchor: "bottom-right",
                    direction: "column",
                    justify: false,
                    translateX: 120,
                    translateY: 0,
                    itemsSpacing: 2,
                    itemWidth: 100,
                    itemHeight: 20,
                    itemDirection: "left-to-right",
                    itemOpacity: 0.85,
                    symbolSize: 20,
                    effects: [
                      {
                        on: "hover",
                        style: {
                          itemOpacity: 1,
                        },
                      },
                    ],
                  },
                ]}
                role="application"
                ariaLabel="Metrics comparison"
              />
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Understanding Recommender Evaluation Metrics</CardTitle>
          <CardDescription>A guide to interpreting Precision, Recall, and NDCG</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <h3 className="text-lg font-medium">The "quick‑start" way to understand Precision, Recall and NDCG on the Yelp recommender</h3>
          
          <p className="text-sm text-muted-foreground">
            Think of the evaluation as a short story about each Yelp user:
          </p>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">1. <strong>Freeze part of the user's history.</strong></p>
              <p className="text-sm text-muted-foreground ml-5">
                We hide a handful of businesses the user rated ≥ 4 stars; these become the set called <code>relevantItems</code>. 
                The rest of the reviews stay visible so the recommender can learn. The helper <code>isRelevantBusiness()</code> is 
                what flags those 4‑star‑and‑up places as "relevant".
              </p>
            </div>

            <div>
              <p className="text-sm font-medium">2. <strong>Ask a recommender to guess.</strong></p>
              <p className="text-sm text-muted-foreground ml-5">
                TF‑IDF, LSA or a Sentence‑Transformer builds text embeddings for every restaurant, looks at the user's 
                favourite visible places, finds similar ones, and hands back a ranked list of business IDs.
              </p>
            </div>

            <div>
              <p className="text-sm font-medium">3. <strong>Score the guess with three lenses.</strong></p>
              <div className="space-y-2 ml-5">
                <div>
                  <p className="text-sm"><strong>Precision@K</strong> – "In the first <em>K</em> suggestions, how many are in <code>relevantItems</code>?"</p>
                  <p className="text-sm text-muted-foreground ml-5">
                    Code: count the overlap in the top‑K slice and divide by <em>K</em>.<br />
                    <em>What a number means:</em> a Precision@5 of 32 % tells us that, averaged over users, roughly 1 – 2 
                    of the first five restaurants really were ones the user liked but the model had not seen.
                  </p>
                </div>

                <div>
                  <p className="text-sm"><strong>Recall@K</strong> – "Out of <em>all</em> hidden favourites, how many did I manage to surface in the first <em>K</em>?"</p>
                  <p className="text-sm text-muted-foreground ml-5">
                    Same overlap, but now the denominator is the total size of <code>relevantItems</code>.<br />
                    <em>What it means:</em> a Recall@5 of 21 % says the algorithm covered about one‑fifth of everything 
                    the user actually liked.
                  </p>
                </div>

                <div>
                  <p className="text-sm"><strong>NDCG@K</strong> – "Did I put the right hits near the top?"</p>
                  <p className="text-sm text-muted-foreground ml-5">
                    It sums a gain for each hit, discounted by its rank (DCG), then divides by the best possible DCG (IDCG).<br />
                    <em>Meaning:</em> 37 % means the ordering of those five items achieves 37 % of the gain you would get 
                    from a perfect ranking where every relevant item is shown first.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium">4. <strong>Average across everyone.</strong></p>
              <p className="text-sm text-muted-foreground ml-5">
                <code>evaluateRecommendations()</code> loops through K = 1, 5, 10, 20, computes the three metrics for each user, 
                and averages the results to give the headline scores you saw.
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mt-4">Why the trio matters</h3>
            <ul className="list-disc text-sm text-muted-foreground ml-5 space-y-1 mt-2">
              <li>Precision tells you how "clean" the very first suggestions are.</li>
              <li>Recall shows how much of the user's true interest space you're covering.</li>
              <li>NDCG penalises burying good matches deep in the list, so it is often the closest proxy to real user satisfaction.</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-3">
              A high‑quality recommender pushes all three numbers upward: many of the first results are hits (precision), 
              they cover a good share of the user's tastes (recall), and the best hits appear early (NDCG).
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Chart Interpretation Guide</CardTitle>
          <CardDescription>Understanding the metrics visualization for TF-IDF recommendations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Here's how to read the three lines you plotted for the <strong>TF‑IDF recommender</strong> on the Yelp data.
          </p>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">Precision@K curve</h3>
              <p className="text-sm text-muted-foreground mt-1">
                <em>At K = 1 the algorithm is almost a coin‑flip away from perfect—roughly 40 % of the very first suggestions are restaurants the user eventually rates four stars or better.</em>
                <br />
                Every time you widen the list you divide by a bigger <em>K</em> while only adding a handful of new hits, so the percentage slides steadily downward. By the time you show 20 places only one or two of them are truly relevant, giving the ≈ 3 – 4 % tail you see.
                <br />
                (The metric is computed exactly as <code>relevantCount / k</code> over the first <em>K</em> IDs.)
              </p>
              <p className="text-sm font-medium mt-2">
                <strong>Take‑away:</strong> TF‑IDF does a respectable job with the very first cards a user will see, but its precision erodes quickly if you surface a long carousel.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium">Recall@K curve</h3>
              <p className="text-sm text-muted-foreground mt-1">
                <em>The mirror image of precision.</em>
                <br />
                With just one suggestion you cover only about 10 % of everything the user actually likes. Each additional batch of items uncovers more hidden favourites, so recall rises—to about 60 % by K = 20 in your plot. This is the same overlap counted above but divided by the size of <code>relevantItems</code> instead of <em>K</em>.
              </p>
              <p className="text-sm font-medium mt-2">
                <strong>Take‑away:</strong> if your UI lets people scroll, larger lists will help them discover more of their potential favourites, even though many non‑relevant items sneak in.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium">NDCG@K curve</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Because NDCG discounts a hit the lower it appears, it tells you whether good matches stay near the top. The curve starts around 40 %, dips only slightly through K = 5, then falls more sharply. That means TF‑IDF ranks the first handful of relevant businesses well; after that it still finds some hits but scatters them deeper in the list.
                <br />
                (The score is DCG divided by the ideal DCG, so 100 % would mean every relevant item is perfectly ordered.)
              </p>
              <p className="text-sm font-medium mt-2">
                <strong>Take‑away:</strong> your users will probably feel the list quality drop if they scroll beyond the first page, even though recall keeps climbing.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium">Decision flow the chart reflects</h3>
              <ol className="list-decimal text-sm text-muted-foreground ml-5 space-y-1 mt-2">
                <li><strong>Hold‑out split</strong> – a few four‑star‑and‑up reviews per user are hidden as ground truth.</li>
                <li><strong>TF‑IDF generates a ranked list</strong> from cosine similarity of review‑text vectors.</li>
                <li><strong><code>evaluateRecommendations()</code></strong> measures precision, recall and NDCG at K = 1, 3, 5, 10, 15, 20 for every user, then averages the results.</li>
              </ol>
              <p className="text-sm text-muted-foreground mt-3">
                The three curves together reveal the classic trade‑off: short lists are cleaner but miss many relevant options; long lists improve coverage but dilute relevance and bury good hits. Where you set <em>K</em> should balance UI constraints with the point on these curves that best matches your product goals.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
