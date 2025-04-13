"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/dash-ui/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/dash-ui/ui/tabs"
import { ChartContainer } from "@/components/dash-ui/ui/chart"
import { ResponsiveRadar } from "@nivo/radar"
import { ResponsiveBar } from "@nivo/bar"
import { ResponsiveLine } from "@nivo/line"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Mock data - replace with actual comparison data from your recommender system
const radarData = [
  {
    method: "TF-IDF",
    precision: 0.35,
    recall: 0.32,
    ndcg: 0.38,
    coverage: 0.65,
    diversity: 0.45,
    computation: 0.85,
  },
  {
    method: "LSA",
    precision: 0.33,
    recall: 0.3,
    ndcg: 0.36,
    coverage: 0.7,
    diversity: 0.6,
    computation: 0.65,
  },
  {
    method: "Sentence Transformer",
    precision: 0.38,
    recall: 0.35,
    ndcg: 0.41,
    coverage: 0.75,
    diversity: 0.7,
    computation: 0.4,
  },
]

const categoryPerformanceData = [
  {
    category: "Restaurants",
    "TF-IDF": 0.42,
    LSA: 0.38,
    "Sentence Transformer": 0.45,
  },
  {
    category: "Shopping",
    "TF-IDF": 0.38,
    LSA: 0.35,
    "Sentence Transformer": 0.4,
  },
  {
    category: "Home Services",
    "TF-IDF": 0.3,
    LSA: 0.32,
    "Sentence Transformer": 0.35,
  },
  {
    category: "Beauty & Spas",
    "TF-IDF": 0.35,
    LSA: 0.36,
    "Sentence Transformer": 0.38,
  },
  {
    category: "Nightlife",
    "TF-IDF": 0.4,
    LSA: 0.42,
    "Sentence Transformer": 0.48,
  },
]

const timeComplexityData = [
  {
    x: 1000,
    "TF-IDF": 0.5,
    LSA: 1.2,
    "Sentence Transformer": 3.5,
  },
  {
    x: 5000,
    "TF-IDF": 2.5,
    LSA: 6.0,
    "Sentence Transformer": 17.5,
  },
  {
    x: 10000,
    "TF-IDF": 5.0,
    LSA: 12.0,
    "Sentence Transformer": 35.0,
  },
  {
    x: 50000,
    "TF-IDF": 25.0,
    LSA: 60.0,
    "Sentence Transformer": 175.0,
  },
  {
    x: 100000,
    "TF-IDF": 50.0,
    LSA: 120.0,
    "Sentence Transformer": 350.0,
  },
]

const strengthsWeaknessesData = [
  {
    method: "TF-IDF",
    strengths: [
      "Fast computation time",
      "Low memory requirements",
      "Easily interpretable results",
      "Good performance for exact term matching",
      "Simple implementation",
    ],
    weaknesses: [
      "Limited semantic understanding",
      "Sensitive to vocabulary mismatch",
      "Cannot capture synonyms or related concepts",
      "Sparse vector representations",
      "Performance degrades with short texts",
    ],
    bestFor: [
      "Large datasets with limited computational resources",
      "Applications where exact keyword matching is important",
      "Cases where interpretability is a priority",
      "Systems requiring frequent model updates",
    ],
  },
  {
    method: "LSA",
    strengths: [
      "Captures latent semantic relationships",
      "Handles synonymy and polysemy",
      "Reduces dimensionality of feature space",
      "Moderate computational requirements",
      "Better than TF-IDF for conceptual matching",
    ],
    weaknesses: [
      "Less interpretable than TF-IDF",
      "Requires careful selection of topic dimensions",
      "Cannot capture word order or context",
      "Struggles with very large vocabularies",
      "Performance depends on quality of SVD",
    ],
    bestFor: [
      "Applications requiring semantic understanding beyond keywords",
      "Datasets with significant vocabulary overlap between items",
      "Systems with moderate computational resources",
      "Cases where dimensionality reduction is beneficial",
    ],
  },
  {
    method: "Sentence Transformer",
    strengths: [
      "Superior semantic understanding",
      "Captures contextual relationships",
      "Handles nuanced language patterns",
      "Pre-trained on large corpora",
      "Dense vector representations",
    ],
    weaknesses: [
      "High computational requirements",
      "Longer processing time",
      "Requires GPU for efficient training/inference",
      "Less interpretable (black box)",
      "Larger memory footprint",
    ],
    bestFor: [
      "Applications requiring deep semantic understanding",
      "Systems with sufficient computational resources",
      "Cases where nuanced language understanding is critical",
      "Datasets with complex textual descriptions",
    ],
  },
]

interface ComparativeAnalysisProps {
  kValue: number
}

export default function ComparativeAnalysis({ kValue }: ComparativeAnalysisProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Method Comparison Radar</CardTitle>
          <CardDescription>Comparing all recommendation methods across multiple metrics at K={kValue}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ChartContainer>
              <ResponsiveRadar
                data={radarData}
                keys={["precision", "recall", "ndcg", "coverage", "diversity", "computation"]}
                indexBy="method"
                maxValue={1}
                margin={{ top: 70, right: 80, bottom: 40, left: 80 }}
                borderColor={{ from: "color" }}
                gridLabelOffset={36}
                dotSize={10}
                dotColor={{ theme: "background" }}
                dotBorderWidth={2}
                colors={{ scheme: "nivo" }}
                blendMode="multiply"
                motionConfig="wobbly"
                legends={[
                  {
                    anchor: "top-left",
                    direction: "column",
                    translateX: -50,
                    translateY: -40,
                    itemWidth: 80,
                    itemHeight: 20,
                    itemTextColor: "#999",
                    symbolSize: 12,
                    symbolShape: "circle",
                    effects: [
                      {
                        on: "hover",
                        style: {
                          itemTextColor: "#000",
                        },
                      },
                    ],
                  },
                ]}
              />
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance by Category</CardTitle>
            <CardDescription>Precision@{kValue} across different business categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ChartContainer>
                <ResponsiveBar
                  data={categoryPerformanceData}
                  keys={["TF-IDF", "LSA", "Sentence Transformer"]}
                  indexBy="category"
                  margin={{ top: 20, right: 130, bottom: 50, left: 60 }}
                  padding={0.3}
                  groupMode="grouped"
                  valueScale={{ type: "linear" }}
                  indexScale={{ type: "band", round: true }}
                  colors={{ scheme: "nivo" }}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: -45,
                    legend: "Category",
                    legendPosition: "middle",
                    legendOffset: 40,
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: "Precision@K",
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
                  ariaLabel="Category performance comparison"
                />
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Computational Performance</CardTitle>
            <CardDescription>Processing time vs. dataset size</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ChartContainer>
                <ResponsiveLine
                  data={[
                    {
                      id: "TF-IDF",
                      data: timeComplexityData?.map((d) => ({ x: d?.x || 0, y: d?.["TF-IDF"] || 0 })) || [],
                    },
                    {
                      id: "LSA",
                      data: timeComplexityData?.map((d) => ({ x: d?.x || 0, y: d?.["LSA"] || 0 })) || [],
                    },
                    {
                      id: "Sentence Transformer",
                      data:
                        timeComplexityData?.map((d) => ({ x: d?.x || 0, y: d?.["Sentence Transformer"] || 0 })) || [],
                    },
                  ]}
                  margin={{ top: 20, right: 110, bottom: 50, left: 60 }}
                  xScale={{ type: "point" }}
                  yScale={{ type: "linear", min: 0, max: "auto" }}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: "Dataset Size (# of businesses)",
                    legendOffset: 40,
                    legendPosition: "middle",
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: "Processing Time (seconds)",
                    legendOffset: -50,
                    legendPosition: "middle",
                  }}
                  pointSize={10}
                  pointColor={{ theme: "background" }}
                  pointBorderWidth={2}
                  pointBorderColor={{ from: "serieColor" }}
                  pointLabelYOffset={-12}
                  useMesh={true}
                  legends={[
                    {
                      anchor: "bottom-right",
                      direction: "column",
                      justify: false,
                      translateX: 100,
                      translateY: 0,
                      itemsSpacing: 0,
                      itemDirection: "left-to-right",
                      itemWidth: 80,
                      itemHeight: 20,
                      itemOpacity: 0.75,
                      symbolSize: 12,
                      symbolShape: "circle",
                      symbolBorderColor: "rgba(0, 0, 0, .5)",
                      effects: [
                        {
                          on: "hover",
                          style: {
                            itemBackground: "rgba(0, 0, 0, .03)",
                            itemOpacity: 1,
                          },
                        },
                      ],
                    },
                  ]}
                />
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Strengths and Weaknesses Analysis</CardTitle>
          <CardDescription>Detailed comparison of recommendation methods</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="tfidf">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tfidf">TF-IDF</TabsTrigger>
              <TabsTrigger value="lsa">LSA</TabsTrigger>
              <TabsTrigger value="sentence-transformer">Sentence Transformer</TabsTrigger>
            </TabsList>

            {strengthsWeaknessesData.map((data, index) => (
              <TabsContent
                key={index}
                value={data.method === "TF-IDF" ? "tfidf" : data.method === "LSA" ? "lsa" : "sentence-transformer"}
                className="mt-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Strengths</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      {data.strengths.map((strength, i) => (
                        <li key={i} className="text-sm">
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-2">Weaknesses</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      {data.weaknesses.map((weakness, i) => (
                        <li key={i} className="text-sm">
                          {weakness}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="text-lg font-medium mb-2">Best Use Cases</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {data.bestFor.map((useCase, i) => (
                      <li key={i} className="text-sm">
                        {useCase}
                      </li>
                    ))}
                  </ul>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performance Summary at K={kValue}</CardTitle>
          <CardDescription>Quantitative comparison of all methods</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>TF-IDF</TableHead>
                <TableHead>LSA</TableHead>
                <TableHead>Sentence Transformer</TableHead>
                <TableHead>Best Method</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Precision@{kValue}</TableCell>
                <TableCell>{((radarData[0]?.precision || 0) * 100).toFixed(1)}%</TableCell>
                <TableCell>{((radarData[1]?.precision || 0) * 100).toFixed(1)}%</TableCell>
                <TableCell>{((radarData[2]?.precision || 0) * 100).toFixed(1)}%</TableCell>
                <TableCell className="font-bold">Sentence Transformer</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Recall@{kValue}</TableCell>
                <TableCell>{((radarData[0]?.recall || 0) * 100).toFixed(1)}%</TableCell>
                <TableCell>{((radarData[1]?.recall || 0) * 100).toFixed(1)}%</TableCell>
                <TableCell>{((radarData[2]?.recall || 0) * 100).toFixed(1)}%</TableCell>
                <TableCell className="font-bold">Sentence Transformer</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">NDCG@{kValue}</TableCell>
                <TableCell>{((radarData[0]?.ndcg || 0) * 100).toFixed(1)}%</TableCell>
                <TableCell>{((radarData[1]?.ndcg || 0) * 100).toFixed(1)}%</TableCell>
                <TableCell>{((radarData[2]?.ndcg || 0) * 100).toFixed(1)}%</TableCell>
                <TableCell className="font-bold">Sentence Transformer</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Coverage</TableCell>
                <TableCell>{((radarData[0]?.coverage || 0) * 100).toFixed(1)}%</TableCell>
                <TableCell>{((radarData[1]?.coverage || 0) * 100).toFixed(1)}%</TableCell>
                <TableCell>{((radarData[2]?.coverage || 0) * 100).toFixed(1)}%</TableCell>
                <TableCell className="font-bold">Sentence Transformer</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Diversity</TableCell>
                <TableCell>{((radarData[0]?.diversity || 0) * 100).toFixed(1)}%</TableCell>
                <TableCell>{((radarData[1]?.diversity || 0) * 100).toFixed(1)}%</TableCell>
                <TableCell>{((radarData[2]?.diversity || 0) * 100).toFixed(1)}%</TableCell>
                <TableCell className="font-bold">Sentence Transformer</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Computation Efficiency</TableCell>
                <TableCell>{((radarData[0]?.computation || 0) * 100).toFixed(1)}%</TableCell>
                <TableCell>{((radarData[1]?.computation || 0) * 100).toFixed(1)}%</TableCell>
                <TableCell>{((radarData[2]?.computation || 0) * 100).toFixed(1)}%</TableCell>
                <TableCell className="font-bold">TF-IDF</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
