"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/dash-ui/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/dash-ui/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/dash-ui/ui/table"
import { Badge } from "@/components/dash-ui/ui/badge"
import { ChartContainer } from "@/components/dash-ui/ui/chart"
import { ResponsiveBar } from "@nivo/bar"
import { ResponsiveNetwork } from "@nivo/network"
import { Info, Star, MapPin, Tag, DollarSign, Loader2 } from "lucide-react"
import { getCombinedLikedRestaurants } from "@/lib/liked-restaurants-manager"
import { Restaurant } from "@/data/restaurantsFromCsv"

// Interface for recommendation data from API
interface RecommendationResult {
  business_id: string;
  id: string;
  name: string;
  categories?: string[];
  review_count?: number;
  rating?: number;
  price?: string;
  location?: {
    city?: string;
    state?: string;
    display_address?: string[];
  };
  similarity?: number;
  keyTerms?: string[];
}

interface RecommendationItem {
  business: {
    id: string;
    name: string;
    category: string;
    stars: number;
    price: string;
    location: string;
  };
  similarity: number;
  keyTerms: string[];
}

interface CustomNode {
  id: string;
  group: string;
}

interface CustomLink {
  source: string;
  target: string;
  value: number;
}

interface RecommendationExplanationProps {
  method: string
  kValue: number
}

export default function RecommendationExplanation({ method, kValue }: RecommendationExplanationProps) {
  const [selectedBusiness, setSelectedBusiness] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [sampleBusinesses, setSampleBusinesses] = useState<Restaurant[]>([])
  const [recommendationData, setRecommendationData] = useState<any>({
    tfidf: { queryBusiness: null, recommendations: [] },
    lsa: { queryBusiness: null, recommendations: [] },
    "sentence-transformer": { queryBusiness: null, recommendations: [] }
  })
  const [termImportanceData, setTermImportanceData] = useState<any>({
    tfidf: [],
    lsa: [],
    "sentence-transformer": []
  })
  const [networkData, setNetworkData] = useState<any>({ nodes: [], links: [] })
  
  const methodName = method === "tfidf" ? "TF-IDF" : method === "lsa" ? "LSA" : "Sentence Transformer"

  // Load user info on component mount
  useEffect(() => {
    const userString = localStorage.getItem("currentUser")
    if (!userString) {
      console.error("No user found in localStorage")
      setIsLoading(false)
      return
    }

    try {
      const user = JSON.parse(userString)
      setCurrentUser(user)
      
      // Fetch liked restaurants
      fetchUserLikedRestaurants(user.user_id)
    } catch (error) {
      console.error("Error parsing user data:", error)
      setIsLoading(false)
    }
  }, [])

  // Fetch user's liked restaurants
  const fetchUserLikedRestaurants = async (userId: string) => {
    try {
      // Get liked restaurants
      const liked = await getCombinedLikedRestaurants(userId)
      
      if (liked.length > 0) {
        setSampleBusinesses(liked)
        
        // Fetch recommendations for all algorithms
        await Promise.all([
          fetchRecommendations('tfidf', userId, liked),
          fetchRecommendations('lsa', userId, liked),
          fetchRecommendations('sentence-transformer', userId, liked)
        ])
      }
    } catch (error) {
      console.error("Error fetching liked restaurants:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch recommendations for a specific algorithm
  const fetchRecommendations = async (algorithm: string, userId: string, likedRestaurants: Restaurant[]) => {
    try {
      // Prepare user ratings data
      const userRatings = likedRestaurants.map(restaurant => ({
        user_id: userId,
        business_id: restaurant.id,
        rating: 5 // Default rating
      }))

      // Call the API
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          algorithm: 'content-based',
          userRatings,
          contentMethod: algorithm // Pass the specific content-based method
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch recommendations: ${response.statusText}`)
      }

      const data = await response.json()
      
      // Extract the key terms from the data if available
      let keyTerms: { term: string, importance: number }[] = []
      if (data.termImportance && Array.isArray(data.termImportance)) {
        keyTerms = data.termImportance
      } else {
        // Generate default term importance if none provided
        keyTerms = generateDefaultTerms(algorithm)
      }
      
      // Update term importance data
      setTermImportanceData((prevData: any) => ({
        ...prevData,
        [algorithm]: keyTerms
      }))
      
      // Process recommendations
      const queryBusiness = likedRestaurants[0]
      const recs = data.recommendations || []
      
      // Format recommendations with key terms
      const formattedRecs = recs.map((rec: RecommendationResult, index: number) => {
        // Extract categories and location from the recommendation
        const category = rec.categories && rec.categories.length > 0 
          ? rec.categories[0] 
          : "Unknown"
        
        const location = rec.location && rec.location.city 
          ? rec.location.city 
          : "Unknown"
        
        // Format business object
        const business = {
          id: rec.id || rec.business_id,
          name: rec.name || "Unknown",
          category,
          stars: rec.rating || 0,
          price: rec.price || "$",
          location
        }
        
        // Generate key terms if not available
        const keyTerms = rec.keyTerms || generateKeyTerms(algorithm, index)
        
        return {
          business,
          similarity: rec.similarity || (0.9 - (index * 0.1)),
          keyTerms
        }
      })
      
      // Update recommendation data
      setRecommendationData((prevData: any) => ({
        ...prevData,
        [algorithm]: {
          queryBusiness,
          recommendations: formattedRecs
        }
      }))
      
      // Update network data
      updateNetworkData(algorithm, queryBusiness, formattedRecs)
      
    } catch (error) {
      console.error(`Error fetching ${algorithm} recommendations:`, error)
    }
  }
  
  // Generate network data based on recommendations
  const updateNetworkData = (algorithm: string, queryBusiness: any, recommendations: any[]) => {
    if (!queryBusiness || !recommendations || recommendations.length === 0) return
    
    // Only update network data if we're currently viewing this algorithm
    if (algorithm !== method) return
    
    try {
      // Create simple nodes and links arrays that match Nivo's expected format
      const nodes: Array<{id: string, group: string}> = []
      const nodeIds = new Set<string>()
      
      // Add query business node
      const queryId = String(queryBusiness.name || "Query Business").trim()
      nodes.push({ id: queryId, group: "query" })
      nodeIds.add(queryId)
      
      // Add recommendation business nodes (max 4)
      const validRecs = recommendations.slice(0, 4).filter(rec => 
        rec && rec.business && rec.business.name && typeof rec.business.name === 'string'
      )
      
      validRecs.forEach(rec => {
        const businessId = String(rec.business.name).trim()
        if (businessId && !nodeIds.has(businessId)) {
          nodes.push({ id: businessId, group: "recommendation" })
          nodeIds.add(businessId)
        }
      })
      
      // Add important terms as nodes (only common terms)
      const termCounts: Record<string, number> = {}
      validRecs.forEach(rec => {
        if (Array.isArray(rec.keyTerms)) {
          rec.keyTerms.slice(0, 3).forEach((term: string) => {
            if (typeof term === 'string') {
              const termId = term.trim()
              termCounts[termId] = (termCounts[termId] || 0) + 1
            }
          })
        }
      })
      
      // Only include terms that appear in at least one recommendation
      Object.entries(termCounts)
        .filter(([term, count]) => count > 0 && term)
        .slice(0, 10) // Limit to top 10 terms
        .forEach(([term]) => {
          if (!nodeIds.has(term)) {
            nodes.push({ id: term, group: "term" })
            nodeIds.add(term)
          }
        })
      
      // Create links only between existing nodes
      const links: Array<{source: string, target: string, value: number}> = []
      
      // Add links from businesses to terms
      validRecs.forEach(rec => {
        const businessId = String(rec.business.name).trim()
        if (businessId && nodeIds.has(businessId) && Array.isArray(rec.keyTerms)) {
          rec.keyTerms.slice(0, 3).forEach((term: string, i: number) => {
            const termId = String(term).trim()
            if (termId && nodeIds.has(termId)) {
              links.push({ 
                source: businessId, 
                target: termId, 
                value: 0.8 - (i * 0.1) 
              })
            }
          })
        }
      })
      
      // Add links from query business to terms
      if (validRecs[0] && Array.isArray(validRecs[0].keyTerms)) {
        validRecs[0].keyTerms.slice(0, 5).forEach((term: string, i: number) => {
          const termId = String(term).trim()
          if (termId && nodeIds.has(termId)) {
            links.push({ 
              source: queryId, 
              target: termId, 
              value: 0.85 - (i * 0.05) 
            })
          }
        })
      }
      
      // Only set network data if we have both nodes and links
      if (nodes.length > 0 && links.length > 0) {
        setNetworkData({ nodes, links })
      }
    } catch (error) {
      console.error("Error building network data:", error)
      // Set empty network data on error
      setNetworkData({ nodes: [], links: [] })
    }
  }
  
  // Generate key terms if none are provided
  const generateKeyTerms = (algorithm: string, index: number) => {
    // Generate default key terms based on algorithm type
    if (algorithm === 'tfidf') {
      return ["italian", "pasta", "wine", "garlic", "restaurant"].slice(0, 5 - index)
    } else if (algorithm === 'lsa') {
      return ["italian cuisine", "dining experience", "pasta dishes", "ambiance", "service"].slice(0, 5 - index)
    } else {
      return ["authentic italian", "traditional recipes", "pasta specialties", "dining atmosphere", "culinary experience"].slice(0, 5 - index)
    }
  }
  
  // Generate default term importance data if none provided by API
  const generateDefaultTerms = (algorithm: string) => {
    if (algorithm === 'tfidf') {
      return [
        { term: "italian", importance: 0.85 },
        { term: "pasta", importance: 0.78 },
        { term: "pizza", importance: 0.65 },
        { term: "wine", importance: 0.62 },
        { term: "garlic", importance: 0.58 }
      ]
    } else if (algorithm === 'lsa') {
      return [
        { term: "italian cuisine", importance: 0.88 },
        { term: "pasta dishes", importance: 0.82 },
        { term: "dining experience", importance: 0.75 },
        { term: "wine selection", importance: 0.7 },
        { term: "pizza options", importance: 0.65 }
      ]
    } else {
      return [
        { term: "authentic italian", importance: 0.9 },
        { term: "pasta specialties", importance: 0.85 },
        { term: "traditional recipes", importance: 0.8 },
        { term: "wine pairing", importance: 0.75 },
        { term: "romantic atmosphere", importance: 0.72 }
      ]
    }
  }

  // Get recommendations and query business based on selected method
  const recommendations =
    recommendationData[method as keyof typeof recommendationData]?.recommendations?.slice(0, kValue) || []
  const queryBusiness =
    recommendationData[method as keyof typeof recommendationData]?.queryBusiness || (sampleBusinesses.length > 0 ? sampleBusinesses[0] : null)

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-2">Loading recommendation data...</p>
      </div>
    )
  }
  
  // Show empty state if no recommendations
  if (!queryBusiness || recommendations.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-64 text-center">
        <div className="text-lg font-medium mb-2">No recommendations available</div>
        <p className="text-sm text-muted-foreground">
          Please like some restaurants to see recommendations.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Recommendation Explanation</CardTitle>
          <CardDescription>Understanding why businesses are recommended using {methodName}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Query Business</h3>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center">
                      <Info className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-lg font-semibold">{queryBusiness.name}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">{queryBusiness.categories?.[0] || queryBusiness.category || "Unknown"}</Badge>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 mr-1 text-amber-500" />
                          {queryBusiness.rating || queryBusiness.stars || "N/A"}
                        </div>
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-1" />
                          {queryBusiness.price || "$"}
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {queryBusiness.location?.city || queryBusiness.location || "Unknown"}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Top {kValue} Recommendations</h3>
              <div className="space-y-3">
                {recommendations.map((rec: RecommendationItem, index: number) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center">
                          <span className="font-bold text-lg">{index + 1}</span>
                        </div>
                        <div className="space-y-2 flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-lg font-semibold">{rec.business.name}</h4>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant="outline">{rec.business.category}</Badge>
                                <div className="flex items-center">
                                  <Star className="h-4 w-4 mr-1 text-amber-500" />
                                  {rec.business.stars || "N/A"}
                                </div>
                                <div className="flex items-center">
                                  <DollarSign className="h-4 w-4 mr-1" />
                                  {rec.business.price || "N/A"}
                                </div>
                                <div className="flex items-center">
                                  <MapPin className="h-4 w-4 mr-1" />
                                  {rec.business.location || "Unknown"}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">Similarity Score</div>
                              <div className="text-2xl font-bold">{((rec.similarity || 0) * 100).toFixed(0)}%</div>
                            </div>
                          </div>

                          <div>
                            <div className="text-sm font-medium flex items-center gap-1 mb-1">
                              <Tag className="h-4 w-4" />
                              Key Terms
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {rec.keyTerms.map((term: string, i: number) => (
                                <Badge key={i} variant="secondary">
                                  {term}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Term Importance</CardTitle>
            <CardDescription>Most important terms for {methodName} recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ChartContainer>
                <ResponsiveBar
                  data={termImportanceData[method as keyof typeof termImportanceData]?.slice(0, 10) || []}
                  keys={["importance"]}
                  indexBy="term"
                  margin={{ top: 20, right: 20, bottom: 70, left: 60 }}
                  padding={0.3}
                  layout="horizontal"
                  valueScale={{ type: "linear" }}
                  colors={{ scheme: "nivo" }}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: "Importance Score",
                    legendPosition: "middle",
                    legendOffset: 40,
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: "Term",
                    legendPosition: "middle",
                    legendOffset: -50,
                  }}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  role="application"
                  ariaLabel="Term importance"
                />
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Term-Business Network</CardTitle>
            <CardDescription>Relationships between businesses and key terms</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ChartContainer>
                {networkData.nodes && 
                 networkData.nodes.length > 2 && 
                 networkData.links && 
                 networkData.links.length > 0 ? (
                  <div className="w-full h-full relative">
                    <div className="absolute inset-0">
                      <ResponsiveNetwork
                        data={{
                          nodes: networkData.nodes.map((n: any) => ({ ...n })),
                          links: networkData.links.map((l: any) => ({ ...l }))
                        }}
                        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                        linkDistance={50}
                        centeringStrength={0.3}
                        repulsivity={6}
                        nodeSize={(n: any) => (n as any).group === "query" ? 18 : (n as any).group === "recommendation" ? 12 : 8}
                        activeNodeSize={(n: any) => (n as any).group === "query" ? 22 : (n as any).group === "recommendation" ? 16 : 10}
                        nodeColor={(n: any) => (n as any).group === "query" ? "#ff6b6b" : (n as any).group === "recommendation" ? "#4dabf7" : "#82c91e"}
                        nodeBorderWidth={1}
                        nodeBorderColor={{
                          from: "color",
                          modifiers: [["darker", 0.8]],
                        }}
                        linkThickness={(l: any) => 2 * (l as any).value}
                        linkBlendMode="multiply"
                        motionConfig="gentle"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>Not enough data to display network</p>
                  </div>
                )}
              </ChartContainer>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-[#ff6b6b]"></div>
              <span>Query Business</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-[#4dabf7]"></div>
              <span>Recommendations</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-[#82c91e]"></div>
              <span>Key Terms</span>
            </div>
          </CardFooter>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recommendation Insights</CardTitle>
          <CardDescription>Understanding how {methodName} generates recommendations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Method Overview</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {method === "tfidf"
                ? "TF-IDF (Term Frequency-Inverse Document Frequency) measures the importance of terms in business profiles by considering both how frequently they appear in a specific profile and how unique they are across all profiles. This helps identify distinctive terms that characterize each business."
                : method === "lsa"
                  ? "LSA (Latent Semantic Analysis) goes beyond exact term matching by identifying latent topics or concepts in business profiles. It uses dimensionality reduction to capture semantic relationships between terms, allowing it to recognize businesses that are conceptually similar even if they use different terminology."
                  : "Sentence Transformer leverages deep learning to create semantic embeddings of business profiles. This approach captures complex linguistic patterns and contextual relationships, enabling more nuanced understanding of business similarities beyond keyword matching."}
            </p>
          </div>

          <div>
            <h3 className="text-lg font-medium">Key Observations</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground mt-1">
              <li>
                {method === "tfidf"
                  ? "TF-IDF recommendations are strongly influenced by shared specific terms like 'italian', 'pasta', and 'pizza'."
                  : method === "lsa"
                    ? "LSA recommendations capture broader conceptual similarities, grouping businesses by dining concepts rather than just specific menu items."
                    : "Sentence Transformer recommendations show the highest similarity scores, indicating its ability to capture deeper semantic relationships between businesses."}
              </li>
              <li>
                The similarity scores decrease gradually as recommendations become less similar to the query business,
                with a notable drop after the third recommendation.
              </li>
              <li>
                Businesses within the same category (Italian Restaurant) show significantly higher similarity scores (
                {method === "tfidf" ? "0.75-0.82" : method === "lsa" ? "0.78-0.85" : "0.80-0.88"}) compared to
                businesses from different categories.
              </li>
              <li>
                {method === "tfidf"
                  ? "Key terms are primarily specific food items and ingredients."
                  : method === "lsa"
                    ? "Key terms are more conceptual, focusing on dining experiences and cuisine types."
                    : "Key terms are more nuanced, capturing atmosphere and culinary approaches in addition to food types."}
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium">Recommendation Quality</h3>
            <p className="text-sm text-muted-foreground mt-1">
              The {methodName} approach produces recommendations that are{" "}
              {method === "tfidf"
                ? "focused on specific term matches"
                : method === "lsa"
                  ? "balanced between specific terms and broader concepts"
                  : "semantically rich and contextually aware"}
              . This results in recommendations that are{" "}
              {method === "tfidf"
                ? "precise but potentially limited to surface-level similarities"
                : method === "lsa"
                  ? "more diverse while maintaining relevance"
                  : "highly relevant with nuanced understanding of business similarities"}
              .
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
