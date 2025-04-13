"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/dash-ui/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/dash-ui/ui/tabs"
import { ChartContainer } from "@/components/dash-ui/ui/chart"
import { ResponsiveBar } from "@nivo/bar"
import { ResponsiveBoxPlot } from "@nivo/boxplot"
import { ResponsiveHeatMap } from "@nivo/heatmap"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/dash-ui/ui/select"
import { Label } from "@/components/dash-ui/ui/label"

interface SimilarityDistributionProps {
  method: string
}

export default function SimilarityDistribution({ method }: SimilarityDistributionProps) {
  const [similarityHistogramData, setSimilarityHistogramData] = useState<Record<string, { range: string; count: number }[]>>({})
  const [boxplotData, setBoxplotData] = useState<any[]>([])
  const [categoryHeatmapData, setCategoryHeatmapData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [similarityData, setSimilarityData] = useState<any>(null)
  const [similarityMetric, setSimilarityMetric] = useState<string>("cosine")

  const methodName = method === "tfidf" ? "TF-IDF" : method === "lsa" ? "LSA" : "Sentence Transformer"
  
  // Get the display name for the similarity metric
  const metricDisplayName = {
    cosine: "Cosine Similarity",
    pearson: "Pearson Correlation",
    euclidean: "Euclidean Distance (Inverted)"
  }[similarityMetric] || "Cosine Similarity"

  // Ensure we have valid data for the selected method
  const histogramData = similarityHistogramData[method] || []
  const filteredBoxplotData = boxplotData.filter((d) => d?.group === methodName) || []
  
  // Update heatmap data when method changes
  useEffect(() => {
    if (similarityData && similarityData[method]?.heatmap) {
      setCategoryHeatmapData(similarityData[method].heatmap);
    } else {
      setCategoryHeatmapData([]);
    }
  }, [method, similarityData]);
  
  const heatmapData = categoryHeatmapData || []

  // Fetch similarity distribution data
  const fetchSimilarityData = async (metric: string) => {
    let isMounted = true;
    console.log(`Fetching similarity distribution data with ${metric} metric...`);
    
    try {
      setLoading(true);
      setError(null);
      
      // Set a timeout to avoid hanging on slow requests
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('API request timeout after 30 seconds')), 30000)
      );
      
      console.log('Attempting to fetch similarity data from API...');
      const fetchPromise = fetch(`/api/evaluation/similarity?metric=${metric}`, {
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
          setError(`Error fetching similarity data: ${response instanceof Error ? response.message : 'Unknown error'}`);
        }
        setLoading(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch similarity data: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!isMounted) return;
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Store the full data response
      setSimilarityData(data);
      
      // Check if any models failed to load
      let partialDataWarning = null;
      if (!data["sentence-transformer"]) {
        partialDataWarning = "Note: Sentence Transformer model data is unavailable. Some visualizations may be incomplete.";
        console.warn(partialDataWarning);
      }
      
      // Update state with actual data
      const updatedHistogramData = {
        tfidf: data.tfidf?.histogram || [],
        lsa: data.lsa?.histogram || [],
        "sentence-transformer": data["sentence-transformer"]?.histogram || [],
      };
      setSimilarityHistogramData(updatedHistogramData);
      
      // Update boxplot data
      const updatedBoxplotData = [
        ...(data.tfidf?.boxplot || []),
        ...(data.lsa?.boxplot || []),
        ...(data["sentence-transformer"]?.boxplot || [])
      ];
      setBoxplotData(updatedBoxplotData);
      
      // Update heatmap data
      setCategoryHeatmapData(data[method]?.heatmap || []);
      
      // If we have a partial data warning, set it as a non-critical error
      if (partialDataWarning) {
        setError(partialDataWarning);
      }
    } catch (err) {
      if (!isMounted) return;
      console.error('Error fetching similarity data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };
    
  // Use useEffect to fetch data when component mounts or metric changes
  useEffect(() => {
    fetchSimilarityData(similarityMetric);
    
    // Cleanup function
    return () => {};
  }, [similarityMetric]); // Only run when similarityMetric changes

  // Handle similarity metric change
  const handleMetricChange = (value: string) => {
    setSimilarityMetric(value);
  };

  return (
    <div className="space-y-6">
      {loading && <div className="text-center py-4">Loading similarity data...</div>}
      {error && (
        <div className={`text-center py-4 px-4 rounded ${error.includes('Note:') ? 'bg-yellow-50 text-yellow-800' : 'bg-red-50 text-red-500'}`}>
          {error}
        </div>
      )}

      <div className="flex justify-end mb-4">
        <div className="flex items-center space-x-4">
          <Label htmlFor="similarity-metric">Similarity Metric:</Label>
          <Select value={similarityMetric} onValueChange={handleMetricChange}>
            <SelectTrigger id="similarity-metric" className="w-[200px]">
              <SelectValue placeholder="Select a metric" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cosine">Cosine Similarity</SelectItem>
              <SelectItem value="pearson">Pearson Correlation</SelectItem>
              <SelectItem value="euclidean">Euclidean Distance (Inverted)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{metricDisplayName} Distribution</CardTitle>
            <CardDescription>Distribution of {metricDisplayName.toLowerCase()} scores for {methodName}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ChartContainer>
                {histogramData.length > 0 ? (
                  <ResponsiveBar
                    data={histogramData}
                    keys={["count"]}
                    indexBy="range"
                    margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
                    padding={0.3}
                    valueScale={{ type: "linear" }}
                    colors={{ scheme: "nivo" }}
                    axisBottom={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      legend: `${metricDisplayName} Score Range`,
                      legendPosition: "middle",
                      legendOffset: 40,
                    }}
                    axisLeft={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      legend: "Count",
                      legendPosition: "middle",
                      legendOffset: -50,
                    }}
                    labelSkipWidth={12}
                    labelSkipHeight={12}
                    role="application"
                    ariaLabel={`${metricDisplayName} distribution`}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No histogram data available</p>
                  </div>
                )}
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{metricDisplayName} Score Boxplot</CardTitle>
            <CardDescription>Distribution statistics of {metricDisplayName.toLowerCase()} scores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ChartContainer>
                {filteredBoxplotData.length > 0 ? (
                  <ResponsiveBoxPlot
                    data={filteredBoxplotData as any}
                    margin={{ top: 40, right: 110, bottom: 50, left: 60 }}
                    minValue={0}
                    maxValue={1}
                    subGroupBy="subgroup"
                    padding={0.3}
                    enableGridX={true}
                    axisBottom={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      legend: "Method",
                      legendPosition: "middle",
                      legendOffset: 40,
                    }}
                    axisLeft={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      legend: `${metricDisplayName} Score`,
                      legendPosition: "middle",
                      legendOffset: -50,
                    }}
                    colors={{ scheme: "nivo" }}
                    borderWidth={2}
                    borderColor={{
                      from: "color",
                      modifiers: [["darker", 0.3]],
                    }}
                    medianWidth={2}
                    medianColor={{
                      from: "color",
                      modifiers: [["darker", 0.3]],
                    }}
                    whiskerEndSize={0.6}
                    whiskerColor={{
                      from: "color",
                      modifiers: [["darker", 0.3]],
                    }}
                    motionConfig="stiff"
                    legends={[
                      {
                        anchor: "right",
                        direction: "column",
                        justify: false,
                        translateX: 100,
                        translateY: 0,
                        itemWidth: 100,
                        itemHeight: 20,
                        itemsSpacing: 0,
                        itemDirection: "left-to-right",
                        symbolSize: 20,
                        symbolShape: "square",
                      },
                    ]}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No boxplot data available</p>
                  </div>
                )}
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Category {metricDisplayName} Heatmap</CardTitle>
          <CardDescription>Average {metricDisplayName.toLowerCase()} scores between business categories using {methodName}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ChartContainer>
              {heatmapData.length > 0 ? (
                <ResponsiveHeatMap
                  data={heatmapData}
                  colors={{
                    type: "sequential",
                    scheme: "blues"
                  }}
                  margin={{ top: 60, right: 80, bottom: 60, left: 80 }}
                  forceSquare={true}
                  axisTop={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: -45,
                    legend: "",
                    legendOffset: 46,
                  }}
                  axisRight={null}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: -45,
                    legend: "",
                    legendPosition: "middle",
                    legendOffset: 36,
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: "Category",
                    legendPosition: "middle",
                    legendOffset: -72,
                  }}
                  valueFormat=">-.2f"
                  emptyColor="#555555"
                  legends={[
                    {
                      anchor: "right",
                      translateX: 30,
                      translateY: 0,
                      length: 100,
                      thickness: 10,
                      direction: "column",
                      tickPosition: "after",
                      tickSize: 3,
                      tickSpacing: 4,
                      tickOverlap: false,
                      tickFormat: ">-.2f",
                      title: `${metricDisplayName} →`,
                      titleAlign: "start",
                      titleOffset: 4,
                    },
                  ]}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">No heatmap data available</p>
                </div>
              )}
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Similarity Interpretation</CardTitle>
          <CardDescription>Understanding the {metricDisplayName.toLowerCase()} distributions for {methodName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {similarityData ? (
            <>
              <div>
                <h3 className="text-lg font-medium">Distribution Analysis</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  The {metricDisplayName.toLowerCase()} distribution for {methodName} shows the pattern of similarity scores across business pairs.
                  Higher concentrations in certain ranges indicate common levels of content similarity in the dataset.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium">Top Recommendations</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  The boxplot compares general similarity scores with those from top-10 recommendations.
                  Top recommendations typically have higher similarity scores, demonstrating the effectiveness
                  of the content-based filtering approach in identifying similar businesses.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium">Category Insights</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  The heatmap reveals how similarity varies between business categories.
                  Businesses within the same category typically show higher similarity scores,
                  while cross-category similarities provide insights into potential relationships between different business types.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium">Method-Specific Observations</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {method === "tfidf"
                    ? `TF-IDF ${metricDisplayName.toLowerCase()} scores reflect direct term-matching between business descriptions, highlighting explicit content similarities.`
                    : method === "lsa"
                      ? `LSA ${metricDisplayName.toLowerCase()} scores capture latent semantic relationships, potentially revealing connections that aren't apparent from direct term matches.`
                      : `Sentence Transformer ${metricDisplayName.toLowerCase()} scores leverage deep learning to understand semantic meaning, often providing the most nuanced measure of content similarity.`}
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-medium">Metric Explanation</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {similarityMetric === "cosine"
                    ? "Cosine similarity measures the cosine of the angle between vectors. It's scale-invariant and values range from 0 (completely dissimilar) to 1 (identical)."
                    : similarityMetric === "pearson"
                      ? "Pearson correlation measures linear relationships between vectors. Values range from -1 (perfect negative correlation) to 1 (perfect positive correlation), but are normalized to 0-1 for visualization."
                      : "Euclidean distance measures the straight-line distance between vectors. For visualization, it's inverted (1/(1+distance)) so higher values mean more similar."}
                </p>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-20">
              <p className="text-muted-foreground">No interpretation data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
