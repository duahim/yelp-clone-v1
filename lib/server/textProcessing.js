// Server-side text processing utilities
const natural = require('natural');
const { TfIdf } = natural;
const Sentiment = require('sentiment');
const sentiment = new Sentiment();

/**
 * Compute text embeddings for a list of texts
 * This is a simplified version of the Python implementation
 * In a production environment, you would use a proper embedding model like USE or BERT
 * @param {Array<string>} textList - List of texts to embed
 * @returns {Array<Array<number>>} - List of embedding vectors
 */
function computeEmbeddings(textList) {
  console.log(`Computing embeddings for ${textList.length} texts`);
  
  // Use TF-IDF as a simple embedding technique
  const tfidf = new TfIdf();
  
  // Add all documents to the TF-IDF model
  textList.forEach(text => {
    if (text && typeof text === 'string') {
      tfidf.addDocument(text);
    } else {
      // Add empty document if text is invalid
      tfidf.addDocument('');
    }
  });
  
  // Extract features from TF-IDF
  const embeddings = [];
  const numFeatures = 50; // Use 50 dimensions for our embeddings
  
  // Get all terms from all documents
  const allTerms = new Set();
  tfidf.documents.forEach(doc => {
    Object.keys(doc).forEach(term => {
      if (term !== '__key') allTerms.add(term);
    });
  });
  
  // Convert to array and keep top terms by document frequency
  const terms = Array.from(allTerms);
  const topTerms = terms.slice(0, numFeatures);
  
  // Create embedding for each document
  tfidf.documents.forEach((doc, docIndex) => {
    const embedding = new Array(numFeatures).fill(0);
    
    topTerms.forEach((term, termIndex) => {
      const tfidfScore = tfidf.tfidf(term, docIndex);
      embedding[termIndex] = tfidfScore;
    });
    
    // Normalize the embedding vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] = embedding[i] / magnitude;
      }
    }
    
    embeddings.push(embedding);
  });
  
  return embeddings;
}

/**
 * Calculate sentiment scores for a list of texts
 * @param {Array<string>} textList - List of texts to analyze
 * @returns {Array<{score: number, comparative: number}>} - List of sentiment objects
 */
function batchSentimentAnalysis(textList) {
  console.log(`Analyzing sentiment for ${textList.length} texts`);
  
  return textList.map(text => {
    if (text && typeof text === 'string') {
      const result = sentiment.analyze(text);
      return {
        score: result.score,
        comparative: result.comparative // normalized by text length
      };
    } else {
      return { score: 0, comparative: 0 };
    }
  });
}

module.exports = {
  computeEmbeddings,
  batchSentimentAnalysis
}; 