module.exports = {
  analyzeText: (text) => {
    // Simple keyword-based analysis (no NLP required)
    const lowerText = text.toLowerCase();
    
    return {
      type: lowerText.includes('food') ? 'Food' : 
            lowerText.includes('medical') ? 'Medical' : 
            lowerText.includes('shelter') ? 'Shelter' : 'General',
            
      priority: lowerText.includes('urgent') || 
                lowerText.includes('emergency') ? 9 : 5,
                
      people: parseInt(text.match(/\d+/)?.[0] || 1),
      
      // Mock NLP features
      keywords: [...new Set(lowerText.split(/\W+/).filter(w => w.length > 3))],
      sentiment: lowerText.includes('help') ? 'positive' : 'neutral'
    };
  }
};