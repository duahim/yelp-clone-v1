"use client"

import { useState } from "react"
import { Info } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface RecommendationExplanationProps {
  algorithm: string
}

export default function RecommendationExplanation({ algorithm }: RecommendationExplanationProps) {
  const [open, setOpen] = useState(false)
  
  return (
    <div className="mb-6 bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {getAlgorithmTitle(algorithm)}
        </h2>
        
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button 
              className="flex items-center text-sm text-gray-500 hover:text-gray-700"
              aria-label="Learn more about this recommendation algorithm"
            >
              <Info className="h-4 w-4 mr-1" />
              <span>How it works</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4">
            <div className="space-y-2">
              <h3 className="font-medium">{getAlgorithmTitle(algorithm)}</h3>
              <p className="text-sm text-gray-600">
                {getAlgorithmExplanation(algorithm)}
              </p>
              
              <h4 className="text-sm font-medium mt-3">Pros:</h4>
              <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
                {getAlgorithmPros(algorithm).map((pro, i) => (
                  <li key={i}>{pro}</li>
                ))}
              </ul>
              
              <h4 className="text-sm font-medium mt-3">Cons:</h4>
              <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
                {getAlgorithmCons(algorithm).map((con, i) => (
                  <li key={i}>{con}</li>
                ))}
              </ul>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      <p className="text-sm text-gray-600 mt-1">
        {getAlgorithmShortDescription(algorithm)}
      </p>
    </div>
  )
}

function getAlgorithmTitle(algorithm: string): string {
  switch (algorithm) {
    case "content-based":
      return "Content-Based Filtering"
    case "collaborative":
      return "Collaborative Filtering"
    case "matrix":
      return "Matrix Factorization"
    default:
      return "Recommendation System"
  }
}

function getAlgorithmShortDescription(algorithm: string): string {
  switch (algorithm) {
    case "content-based":
      return "Advanced recommendations based on NLP analysis of reviews, sentiment scores, and restaurant attributes that match your preferences."
    case "collaborative":
      return "Recommendations based on what similar users with similar tastes have enjoyed."
    case "matrix":
      return "Advanced recommendations using latent factors and patterns from user-restaurant interactions."
    default:
      return "Personalized recommendations based on your preferences."
  }
}

function getAlgorithmExplanation(algorithm: string): string {
  switch (algorithm) {
    case "content-based":
      return "Our advanced content-based filtering analyzes every review for each restaurant, combining natural language processing with sentiment analysis. The system constructs comprehensive restaurant profiles by aggregating all reviews, converting them into numerical vectors using TF-IDF, and integrating sentiment scores. These profiles are then compared using cosine similarity to find restaurants that semantically match your preferences."
    case "collaborative":
      return "Collaborative filtering finds users similar to you, then recommends restaurants they enjoyed that you haven't tried yet. It's based on the idea that people with similar tastes will like similar restaurants."
    case "matrix":
      return "Matrix factorization discovers hidden patterns in user-restaurant interactions by decomposing the user-item matrix into latent factors. This captures deeper relationships beyond simple similarities, potentially leading to more diverse recommendations."
    default:
      return "This algorithm provides personalized recommendations based on your preferences and behavior."
  }
}

function getAlgorithmPros(algorithm: string): string[] {
  switch (algorithm) {
    case "content-based":
      return [
        "Analyzes every review to understand restaurant quality",
        "Incorporates sentiment analysis for emotional context",
        "Uses NLP to understand semantic meaning beyond keywords",
        "Creates comprehensive restaurant profiles from multiple data sources"
      ]
    case "collaborative":
      return [
        "Can discover unexpected recommendations",
        "Doesn't require detailed item attributes",
        "Improves as more users rate restaurants",
        "Benefits from community wisdom"
      ]
    case "matrix":
      return [
        "More accurate than simpler methods",
        "Can detect subtle patterns and preferences",
        "Handles sparse data well",
        "Balances personalization with discovery"
      ]
    default:
      return ["Personalized to your preferences", "Updated automatically as you interact"]
  }
}

function getAlgorithmCons(algorithm: string): string[] {
  switch (algorithm) {
    case "content-based":
      return [
        "May recommend too-similar items",
        "Limited discovery of new interests",
        "Requires good attribute data",
        "Doesn't benefit from other users' opinions"
      ]
    case "collaborative":
      return [
        "Cold-start problem for new items",
        "Needs enough user overlap for accuracy",
        "Less effective with unique tastes",
        "Privacy concerns with user comparisons"
      ]
    case "matrix":
      return [
        "Computationally more complex",
        "Harder to explain recommendations",
        "Requires more data to be effective",
        "Can be sensitive to parameter choices"
      ]
    default:
      return ["May not always match your expectations", "Requires sufficient data to be effective"]
  }
}

