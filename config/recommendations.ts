export const RECOMMENDATION_CONFIG = {
  recommendationsPerPage: 10,
  defaultRating: 2,
  minRating: 1,
  maxRating: 5,
  similarUsersCount: 5,
  contentBased: {
    numFeatures: 50,
    minSimilarity: 0.1
  },
  collaborative: {
    minCommonRatings: 1,
    similarityThreshold: 0.3
  },
  matrix: {
    numFactors: 20,
    learningRate: 0.01,
    regularization: 0.1,
    iterations: 100
  }
}; 