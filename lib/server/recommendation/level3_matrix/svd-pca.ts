import { 
  Rating,
  RecommendationResult,
  MatrixFactorizationModel
} from '../types';
import { SVDRecommender } from './svd';

export class SVDPCARecommender extends SVDRecommender {
  private readonly varianceThreshold: number;
  private explainedVarianceRatio: number[];
  private reducedDimensions: number;

  constructor(
    numFactors: number = 50,
    learningRate: number = 0.005,
    regularization: number = 0.02,
    varianceThreshold: number = 0.95  // Keep components that explain 95% of variance
  ) {
    super(numFactors, learningRate, regularization);
    this.varianceThreshold = varianceThreshold;
    this.explainedVarianceRatio = [];
    this.reducedDimensions = numFactors;
  }

  /**
   * Compute singular values and explained variance
   * @param matrix Matrix to analyze
   * @returns Singular values and explained variance ratios
   */
  private computeSingularValues(matrix: number[][]): {
    singularValues: number[];
    explainedVarianceRatio: number[];
  } {
    const numRows = matrix.length;
    const numCols = matrix[0].length;

    // Compute covariance matrix
    const covariance = new Array(numCols).fill(0).map(() => new Array(numCols).fill(0));
    
    for (let i = 0; i < numCols; i++) {
      for (let j = 0; j < numCols; j++) {
        let sum = 0;
        for (let k = 0; k < numRows; k++) {
          sum += matrix[k][i] * matrix[k][j];
        }
        covariance[i][j] = sum / (numRows - 1);
      }
    }

    // Compute eigenvalues (singular values squared)
    // Note: This is a simplified implementation. In production, use a proper linear algebra library.
    const eigenvalues = this.powerIteration(covariance, numCols);
    const singularValues = eigenvalues.map(e => Math.sqrt(Math.abs(e)));

    // Compute explained variance ratio
    const totalVariance = singularValues.reduce((sum, sv) => sum + sv * sv, 0);
    const explainedVarianceRatio = singularValues.map(sv => (sv * sv) / totalVariance);

    return { singularValues, explainedVarianceRatio };
  }

  /**
   * Power iteration method to compute eigenvalues
   * @param matrix Square matrix
   * @param numValues Number of eigenvalues to compute
   * @returns Array of eigenvalues
   */
  private powerIteration(matrix: number[][], numValues: number): number[] {
    const n = matrix.length;
    const eigenvalues: number[] = [];
    const maxIter = 100;
    const tolerance = 1e-10;

    for (let k = 0; k < numValues; k++) {
      // Initialize random vector
      let vector = new Array(n).fill(0).map(() => Math.random());
      let prevEigenvalue = 0;

      // Power iteration
      for (let iter = 0; iter < maxIter; iter++) {
        // Multiply matrix by vector
        const newVector = new Array(n).fill(0);
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            newVector[i] += matrix[i][j] * vector[j];
          }
        }

        // Normalize
        const norm = Math.sqrt(newVector.reduce((sum, val) => sum + val * val, 0));
        vector = newVector.map(val => val / norm);

        // Compute Rayleigh quotient (eigenvalue estimate)
        let eigenvalue = 0;
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            eigenvalue += vector[i] * matrix[i][j] * vector[j];
          }
        }

        if (Math.abs(eigenvalue - prevEigenvalue) < tolerance) {
          break;
        }
        prevEigenvalue = eigenvalue;
      }

      eigenvalues.push(prevEigenvalue);

      // Deflate matrix
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          matrix[i][j] -= prevEigenvalue * vector[i] * vector[j];
        }
      }
    }

    return eigenvalues;
  }

  /**
   * Reduce dimensions based on explained variance
   * @param factors Factor matrix to reduce
   * @returns Reduced factor matrix
   */
  private reduceDimensions(factors: number[][]): number[][] {
    // Convert factors map to matrix
    const matrix = Array.from(factors);
    
    // Compute singular values and explained variance
    const { explainedVarianceRatio } = this.computeSingularValues(matrix);
    this.explainedVarianceRatio = explainedVarianceRatio;

    // Find number of components to keep
    let cumSum = 0;
    this.reducedDimensions = this.numFactors;
    for (let i = 0; i < explainedVarianceRatio.length; i++) {
      cumSum += explainedVarianceRatio[i];
      if (cumSum >= this.varianceThreshold) {
        this.reducedDimensions = i + 1;
        break;
      }
    }

    this.log(`Reduced dimensions from ${this.numFactors} to ${this.reducedDimensions}`);

    // Return reduced matrix
    return matrix.map(row => row.slice(0, this.reducedDimensions));
  }

  /**
   * Override train method to include dimensionality reduction
   */
  public async train(ratings: Rating[], numEpochs?: number): Promise<void> {
    // First train normally using SVD
    await super.train(ratings, numEpochs);

    this.log('Performing dimensionality reduction...');

    // Convert factor maps to arrays for reduction
    const userFactorsArray = Array.from(this.userFactors.entries());
    const itemFactorsArray = Array.from(this.itemFactors.entries());

    // Reduce dimensions
    const reducedUserFactors = this.reduceDimensions(
      userFactorsArray.map(([, factors]) => factors)
    );
    
    const reducedItemFactors = this.reduceDimensions(
      itemFactorsArray.map(([, factors]) => factors)
    );

    // Update factor maps with reduced dimensions
    this.userFactors.clear();
    this.itemFactors.clear();

    userFactorsArray.forEach(([userId], i) => {
      this.userFactors.set(userId, reducedUserFactors[i]);
    });

    itemFactorsArray.forEach(([itemId], i) => {
      this.itemFactors.set(itemId, reducedItemFactors[i]);
    });

    this.log('Dimensionality reduction completed');
  }

  /**
   * Override getModel to include explained variance ratio
   */
  public override getModel(): MatrixFactorizationModel {
    return {
      ...super.getModel(),
      explained_variance_ratio: this.explainedVarianceRatio
    };
  }

  /**
   * Override getRecommendationExplanation to include dimensionality information
   */
  public override async getRecommendationExplanation(
    userId: string,
    businessId: string
  ): Promise<string> {
    const baseExplanation = await super.getRecommendationExplanation(userId, businessId);
    
    const varianceExplained = this.explainedVarianceRatio
      .slice(0, this.reducedDimensions)
      .reduce((sum, ratio) => sum + ratio, 0) * 100;

    return `${baseExplanation} The model uses ${this.reducedDimensions} key features ` +
           `that explain ${varianceExplained.toFixed(1)}% of rating patterns.`;
  }

  /**
   * Get information about the dimensionality reduction
   */
  public getDimensionalityInfo(): {
    originalDimensions: number;
    reducedDimensions: number;
    explainedVarianceRatio: number[];
    totalExplainedVariance: number;
  } {
    const totalExplainedVariance = this.explainedVarianceRatio
      .slice(0, this.reducedDimensions)
      .reduce((sum, ratio) => sum + ratio, 0);

    return {
      originalDimensions: this.numFactors,
      reducedDimensions: this.reducedDimensions,
      explainedVarianceRatio: this.explainedVarianceRatio,
      totalExplainedVariance
    };
  }
}
