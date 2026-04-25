/**
 * Calculate skill match score between volunteer and task
 * Returns: { matchedSkills, missingSkills, matchPercentage }
 */
function calculateSkillMatch(volunteerSkills, requiredSkills) {
  if (!requiredSkills || requiredSkills.length === 0) {
    return { matchedSkills: [], missingSkills: [], matchPercentage: 100 };
  }
  
  if (!volunteerSkills || volunteerSkills.length === 0) {
    return { matchedSkills: [], missingSkills: requiredSkills, matchPercentage: 0 };
  }
  
  // Normalize skills (lowercase, trim)
  const normalizedVolunteerSkills = volunteerSkills.map(s => s.toLowerCase().trim());
  const normalizedRequiredSkills = requiredSkills.map(s => s.toLowerCase().trim());
  
  // Find matches
  const matchedSkills = normalizedVolunteerSkills.filter(skill => 
    normalizedRequiredSkills.includes(skill)
  );
  
  const missingSkills = normalizedRequiredSkills.filter(skill => 
    !normalizedVolunteerSkills.includes(skill)
  );
  
  const matchPercentage = (matchedSkills.length / normalizedRequiredSkills.length) * 100;
  
  return {
    matchedSkills,
    missingSkills,
    matchPercentage: Math.round(matchPercentage)
  };
}

/**
 * Find volunteers who match a task's required skills
 * @param {Array} volunteers - List of volunteer users
 * @param {Array} requiredSkills - Skills required for task
 * @param {Number} minMatchPercentage - Minimum match % (default 50)
 */
function findMatchingVolunteers(volunteers, requiredSkills, minMatchPercentage = 50) {
  const matches = volunteers.map(volunteer => {
    const match = calculateSkillMatch(volunteer.skills, requiredSkills);
    return {
      volunteer,
      ...match
    };
  });
  
  // Filter by minimum match percentage and sort by best match
  return matches
    .filter(m => m.matchPercentage >= minMatchPercentage)
    .sort((a, b) => b.matchPercentage - a.matchPercentage);
}

/**
 * Assign task to best matching volunteer
 */
function findBestMatch(volunteers, requiredSkills) {
  const matches = findMatchingVolunteers(volunteers, requiredSkills, 30);
  
  if (matches.length === 0) return null;
  
  // Return the volunteer with highest match percentage
  return matches[0].volunteer;
}

module.exports = { 
  calculateSkillMatch, 
  findMatchingVolunteers, 
  findBestMatch 
};