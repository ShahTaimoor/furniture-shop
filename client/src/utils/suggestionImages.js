/**
 * Utility for getting appropriate suggestion images based on search terms
 */

// Image mapping for different car parts and models
const imageMap = {
  // Car models
  corolla: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=100&h=100&fit=crop&crop=center',
  civic: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=100&h=100&fit=crop&crop=center',
  altima: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=100&h=100&fit=crop&crop=center',
  mazda: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=100&h=100&fit=crop&crop=center',
  elantra: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=100&h=100&fit=crop&crop=center',
  forte: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=100&h=100&fit=crop&crop=center',
  lancer: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=100&h=100&fit=crop&crop=center',
  impreza: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=100&h=100&fit=crop&crop=center',
  
  // Car parts
  grill: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=100&h=100&fit=crop&crop=center',
  grille: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=100&h=100&fit=crop&crop=center',
  bumper: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=100&h=100&fit=crop&crop=center',
  headlight: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=100&h=100&fit=crop&crop=center',
  taillight: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=100&h=100&fit=crop&crop=center',
  mirror: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=100&h=100&fit=crop&crop=center',
  fender: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=100&h=100&fit=crop&crop=center',
  hood: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=100&h=100&fit=crop&crop=center',
  door: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=100&h=100&fit=crop&crop=center',
  handle: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=100&h=100&fit=crop&crop=center',
  
  // Accessories
  'steering wheel': 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=100&h=100&fit=crop&crop=center',
  lock: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=100&h=100&fit=crop&crop=center',
  alarm: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=100&h=100&fit=crop&crop=center',
  camera: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=100&h=100&fit=crop&crop=center',
  monitor: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=100&h=100&fit=crop&crop=center',
  bluetooth: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=100&h=100&fit=crop&crop=center',
  mount: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=100&h=100&fit=crop&crop=center',
  charger: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=100&h=100&fit=crop&crop=center',
  seat: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=100&h=100&fit=crop&crop=center',
  cover: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=100&h=100&fit=crop&crop=center'
};

/**
 * Get appropriate image for a suggestion based on its text
 * @param {string} suggestionText - The suggestion text
 * @returns {string} - Image URL
 */
export const getSuggestionImage = (suggestionText) => {
  if (!suggestionText) return imageMap.corolla;
  
  const text = suggestionText.toLowerCase();
  
  // Check for specific car models first
  for (const [model, image] of Object.entries(imageMap)) {
    if (text.includes(model)) {
      return image;
    }
  }
  
  // Default car image
  return imageMap.corolla;
};

/**
 * Get multiple images for different suggestions
 * @param {Array} suggestions - Array of suggestion texts
 * @returns {Array} - Array of objects with text and image
 */
export const getSuggestionsWithImages = (suggestions) => {
  return suggestions.map(suggestion => ({
    text: suggestion,
    image: getSuggestionImage(suggestion)
  }));
};

export default imageMap;

