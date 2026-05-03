const User = require('../models/user');
const Case = require('../models/Case');

class AITaskMatcher {
    
    // Calculate comprehensive match score using AI algorithm
    static calculateMatchScore(volunteer, task) {
        let score = 0;
        let matchDetails = {
            skillMatch: 0,
            locationMatch: 0,
            availabilityMatch: 0,
            experienceMatch: 0,
            urgencyMatch: 0
        };
        
        // 1. SKILL MATCHING (40% weight)
        const requiredSkills = task.skills_required || [];
        const volunteerSkills = volunteer.skills || [];
        
        if (requiredSkills.length > 0) {
            const matchedSkills = requiredSkills.filter(reqSkill =>
                volunteerSkills.some(vSkill =>
                    vSkill.toLowerCase().includes(reqSkill.toLowerCase()) ||
                    reqSkill.toLowerCase().includes(vSkill.toLowerCase())
                )
            );
            matchDetails.skillMatch = (matchedSkills.length / requiredSkills.length) * 40;
            score += matchDetails.skillMatch;
        } else {
            // No specific skills needed - default 30%
            matchDetails.skillMatch = 30;
            score += 30;
        }
        
        // 2. LOCATION MATCHING (25% weight)
        if (volunteer.location && task.location_name) {
            const locationSimilarity = this.calculateLocationSimilarity(
                volunteer.location, 
                task.location_name
            );
            matchDetails.locationMatch = locationSimilarity * 25;
            score += matchDetails.locationMatch;
        } else {
            matchDetails.locationMatch = 10;
            score += 10;
        }
        
        // 3. AVAILABILITY MATCHING (15% weight)
        if (volunteer.availability && task.urgency_level) {
            let availabilityScore = 0;
            if (volunteer.availability === 'Full-time' && task.urgency_level === 'High') {
                availabilityScore = 15;
            } else if (volunteer.availability === 'Part-time') {
                availabilityScore = 10;
            } else if (volunteer.availability === 'Weekends') {
                availabilityScore = 8;
            } else {
                availabilityScore = 5;
            }
            matchDetails.availabilityMatch = availabilityScore;
            score += availabilityScore;
        }
        
        // 4. EXPERIENCE MATCHING (10% weight) - based on completed tasks
        const completedTasksCount = volunteer.completedTasks || 0;
        matchDetails.experienceMatch = Math.min(completedTasksCount, 10);
        score += matchDetails.experienceMatch;
        
        // 5. URGENCY MATCHING (10% weight)
        if (task.urgency_level === 'High') {
            matchDetails.urgencyMatch = 10;
            score += 10;
        } else if (task.urgency_level === 'Medium') {
            matchDetails.urgencyMatch = 7;
            score += 7;
        } else {
            matchDetails.urgencyMatch = 5;
            score += 5;
        }
        
        return {
            totalScore: Math.round(score),
            matchDetails,
            priority: score >= 80 ? 'Excellent Match' : score >= 60 ? 'Good Match' : score >= 40 ? 'Potential Match' : 'Low Match'
        };
    }
    
    // Simple location similarity calculation
    static calculateLocationSimilarity(volLocation, taskLocation) {
        const volLower = volLocation.toLowerCase();
        const taskLower = taskLocation.toLowerCase();
        
        if (volLower === taskLower) return 1;
        if (volLower.includes(taskLower) || taskLower.includes(volLower)) return 0.7;
        
        // Indian cities mapping
        const cityMapping = {
            'mumbai': ['mumbai', 'bombay', 'maharastra'],
            'delhi': ['delhi', 'ncr', 'new delhi'],
            'bangalore': ['bangalore', 'bengaluru', 'karnataka'],
            'chennai': ['chennai', 'madras', 'tamilnadu'],
            'kolkata': ['kolkata', 'calcutta', 'west bengal'],
            'hyderabad': ['hyderabad', 'telangana'],
            'pune': ['pune', 'punjab'],
            'ahmedabad': ['ahmedabad', 'gujarat'],
            'jaipur': ['jaipur', 'rajasthan']
        };
        
        for (const [city, variations] of Object.entries(cityMapping)) {
            const volMatch = variations.some(v => volLower.includes(v));
            const taskMatch = variations.some(v => taskLower.includes(v));
            if (volMatch && taskMatch) return 0.8;
        }
        
        return 0.2;
    }
    
    // AI-Powered Smart Assignment
    static async smartAssignTask(taskId) {
        try {
            const task = await Case.findById(taskId);
            if (!task || task.status !== 'open') {
                return { success: false, message: 'Task not available' };
            }
            
            // Get all active volunteers
            const volunteers = await User.find({ 
                role: 'volunteer',
                status: 'active'
            });
            
            if (volunteers.length === 0) {
                return { success: false, message: 'No volunteers available' };
            }
            
            // Calculate scores for all volunteers
            const scoredVolunteers = volunteers.map(volunteer => {
                const matchResult = this.calculateMatchScore(volunteer, task);
                return {
                    volunteer,
                    matchScore: matchResult.totalScore,
                    matchDetails: matchResult.matchDetails,
                    priority: matchResult.priority
                };
            });
            
            // Sort by match score
            scoredVolunteers.sort((a, b) => b.matchScore - a.matchScore);
            
            // Get top 5 matches
            const topMatches = scoredVolunteers.slice(0, 5);
            
            // Auto-assign to best match if score > 85%
            if (topMatches[0] && topMatches[0].matchScore >= 85) {
                const bestMatch = topMatches[0];
                task.assignedTo = bestMatch.volunteer._id;
                task.status = 'auto-assigned';
                task.autoAssigned = true;
                task.matchScore = bestMatch.matchScore;
                await task.save();
                
                return {
                    success: true,
                    action: 'auto-assigned',
                    assignedTo: bestMatch.volunteer.fullName,
                    matchScore: bestMatch.matchScore,
                    matchDetails: bestMatch.matchDetails,
                    topMatches: topMatches.slice(1, 3)
                };
            }
            
            // Otherwise, notify top matches
            return {
                success: true,
                action: 'notify',
                topMatches: topMatches,
                message: 'Notified top matching volunteers'
            };
            
        } catch (error) {
            console.error('Smart assignment error:', error);
            return { success: false, error: error.message };
        }
    }
    
    // AI-Powered Task Recommendations
    static async getPersonalizedRecommendations(volunteerId) {
        try {
            const volunteer = await User.findById(volunteerId);
            const openTasks = await Case.find({ status: 'open' });
            
            const recommendations = openTasks.map(task => {
                const matchResult = this.calculateMatchScore(volunteer, task);
                return {
                    task,
                    matchScore: matchResult.totalScore,
                    matchDetails: matchResult.matchDetails,
                    priority: matchResult.priority,
                    whyThisMatch: this.generateMatchReason(matchResult.matchDetails, task)
                };
            });
            
            // Sort by match score and filter low matches
            return recommendations
                .filter(rec => rec.matchScore >= 40)
                .sort((a, b) => b.matchScore - a.matchScore)
                .slice(0, 10);
                
        } catch (error) {
            console.error('Recommendation error:', error);
            return [];
        }
    }
    
    // Generate human-readable match reason
    static generateMatchReason(matchDetails, task) {
        const reasons = [];
        
        if (matchDetails.skillMatch >= 30) {
            reasons.push(`Your skills strongly match the required skills`);
        } else if (matchDetails.skillMatch >= 20) {
            reasons.push(`You have some of the required skills`);
        }
        
        if (matchDetails.locationMatch >= 20) {
            reasons.push(`You are located near ${task.location_name}`);
        }
        
        if (matchDetails.availabilityMatch >= 12 && task.urgency_level === 'High') {
            reasons.push(`Your availability is perfect for this urgent task`);
        }
        
        if (reasons.length === 0) {
            return `This task needs assistance in ${task.location_name || 'your area'}`;
        }
        
        return reasons.join('. ');
    }
    
    // Auto-escalate unassigned tasks
    static async escalateUnassignedTasks() {
        const unassignedTasks = await Case.find({
            status: 'open',
            createdAt: { $lt: new Date(Date.now() - 2 * 60 * 60 * 1000) } // 2 hours old
        });
        
        for (const task of unassignedTasks) {
            // Increase priority
            if (task.urgency_level === 'Medium') {
                task.urgency_level = 'High';
                task.priority_score = Math.min(task.priority_score + 10, 100);
            } else if (task.urgency_level === 'Low') {
                task.urgency_level = 'Medium';
                task.priority_score = Math.min(task.priority_score + 15, 100);
            }
            
            task.escalated = true;
            task.escalatedAt = new Date();
            await task.save();
            
            // Broadcast escalation
            console.log(`⚠️ Task escalated: ${task._id} - Now ${task.urgency_level} priority`);
        }
        
        return unassignedTasks.length;
    }
}

module.exports = AITaskMatcher;