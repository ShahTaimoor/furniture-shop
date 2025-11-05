/**
 * Highlights search terms in text
 * @param {string} text - The text to highlight
 * @param {string} searchTerm - The search term to highlight
 * @returns {JSX.Element} - JSX with highlighted text
 */
export const highlightSearchTerm = (text, searchTerm) => {
  if (!searchTerm || !text || searchTerm.trim().length < 1) return text;

  const cleanText = text.toString();
  const cleanSearchTerm = searchTerm.trim().toLowerCase();
  
  // Split search term into individual words
  const searchWords = cleanSearchTerm.split(/\s+/).filter(word => word.length > 0);
  
  if (searchWords.length === 0) return cleanText;
  
  // Create a regex pattern that matches any of the search words
  const pattern = new RegExp(`(${searchWords.map(word => 
    word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  ).join('|')})`, 'gi');

  // Split text by the pattern while keeping the matches
  const parts = cleanText.split(pattern);
  
  return parts.map((part, index) => {
    // Check if this part matches any search word (case-insensitive)
    const isMatch = searchWords.some(word => 
      part.toLowerCase() === word.toLowerCase()
    );
    
    if (isMatch) {
      return (
        <mark 
          key={index} 
          className="bg-yellow-200 text-yellow-900 px-1 rounded font-medium"
        >
          {part}
        </mark>
      );
    }
    return part;
  });
};

/**
 * Highlights search terms in text with custom highlight component
 * @param {string} text - The text to highlight
 * @param {string} searchTerm - The search term to highlight
 * @param {React.Component} HighlightComponent - Custom highlight component
 * @returns {JSX.Element} - JSX with highlighted text
 */
export const highlightSearchTermCustom = (text, searchTerm, HighlightComponent) => {
  if (!searchTerm || !text) return text;

  const searchWords = searchTerm.trim().toLowerCase().split(/\s+/);
  const pattern = new RegExp(`(${searchWords.map(word => 
    word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  ).join('|')})`, 'gi');

  const parts = text.split(pattern);
  
  return parts.map((part, index) => {
    const isMatch = searchWords.some(word => 
      part.toLowerCase() === word.toLowerCase()
    );
    
    if (isMatch) {
      return (
        <HighlightComponent key={index}>
          {part}
        </HighlightComponent>
      );
    }
    return part;
  });
};

/**
 * Truncates text and highlights search terms
 * @param {string} text - The text to truncate and highlight
 * @param {string} searchTerm - The search term to highlight
 * @param {number} maxLength - Maximum length of text
 * @returns {JSX.Element} - JSX with truncated and highlighted text
 */
export const truncateAndHighlight = (text, searchTerm, maxLength = 100) => {
  if (!text) return '';
  
  let truncatedText = text;
  if (text.length > maxLength) {
    truncatedText = text.substring(0, maxLength) + '...';
  }
  
  return highlightSearchTerm(truncatedText, searchTerm);
};
