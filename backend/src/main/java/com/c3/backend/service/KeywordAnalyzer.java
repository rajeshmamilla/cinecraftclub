package com.c3.backend.service;

import org.springframework.stereotype.Service;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class KeywordAnalyzer {
    
    // Common stopwords to exclude (English + Telugu)
    private static final Set<String> STOPWORDS = Set.of(
        "the", "is", "are", "was", "were", "a", "an", "and", "or", "but",
        "in", "on", "at", "to", "for", "of", "with", "by", "from", "as",
        "this", "that", "these", "those", "it", "its", "they", "them",
        "what", "which", "who", "when", "where", "why", "how", "can",
        "could", "should", "would", "will", "has", "have", "had", "do",
        "does", "did", "very", "too", "just", "so", "than", "such",
        "undi", "unnadi", "chala", "bagundi", "nachindi", "ela", "emiti",
        "movie", "film", "scene", "watch", "watched", "see", "saw", "please",
        "like", "good", "great", "one", "some", "any", "no", "yes", "i", "you",
        "we", "us", "our", "my", "your", "his", "her", "their", "me"
    );
    
    /**
     * Extract top trending keywords from discussion content
     * Uses HashMap for O(1) word frequency counting
     * 
     * @param discussionTexts List of discussion/comment content
     * @param topN Number of top keywords to return (default 10)
     * @return List of keywords with their counts, sorted by frequency
     */
    public List<KeywordCount> extractTrendingKeywords(List<String> discussionTexts, int topN) {
        // HashMap for counting word frequency - O(1) lookups
        Map<String, Integer> wordFrequency = new HashMap<>();
        
        for (String text : discussionTexts) {
            if (text == null || text.trim().isEmpty()) continue;
            
            // Tokenize: lowercase, remove punctuation, split by whitespace
            String[] words = text.toLowerCase()
                .replaceAll("[^a-z0-9\\s-]", " ")  // Keep letters, numbers, hyphens
                .split("\\s+");
            
            for (String word : words) {
                word = word.trim();
                
                // Filter: min 3 chars, not stopword, not pure number
                if (word.length() >= 3 
                    && !STOPWORDS.contains(word)
                    && !word.matches("\\d+")) {
                    
                    wordFrequency.put(word, wordFrequency.getOrDefault(word, 0) + 1);
                }
            }
        }
        
        // Sort by count descending, return top N
        return wordFrequency.entrySet().stream()
            .map(entry -> new KeywordCount(entry.getKey(), entry.getValue()))
            .sorted((a, b) -> Integer.compare(b.getCount(), a.getCount()))
            .limit(topN)
            .collect(Collectors.toList());
    }
    
    /**
     * Simple data holder for keyword + count
     */
    public static class KeywordCount {
        private final String keyword;
        private final int count;
        
        public KeywordCount(String keyword, int count) {
            this.keyword = keyword;
            this.count = count;
        }
        
        public String getKeyword() { return keyword; }
        public int getCount() { return count; }
    }
}
