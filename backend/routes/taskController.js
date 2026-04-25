const Case = require('../models/Case');
const User = require('../models/User');
const { findBestMatch, findMatchingVolunteers } = require('../utils/skillMatcher');
const { sendTaskAssignmentEmail } = require('../services/emailService');
const { sendTaskAssignmentSMS } = require('../services/smsService');

/**
 * Create a new task/need (NGO only)
 * Automatically matches and assigns to volunteers
 */
async function createTask(req, res) {
  try {
    const { 
      text, 
      type, 
      urgency_level, 
      people_affected, 
      skills_required,
      summary 
    } = req.body;
    
    // Verify user is NGO
    if (req.user.role !== 'ngo') {
      return res.status(403).json({ error: 'Only NGOs can create tasks' });
    }
    
    // Create new case
    const newTask = new Case({
      text,
      type: type || 'Other',
      urgency_level: urgency_level || 'Medium',
      people_affected: people_affected || 0,
      skills_required: skills_required || [],
      summary,
      status: 'open',
      createdAt: new Date()
    });
    
    await newTask.save();
    
    // Auto-assign to matching volunteers
    const assignmentResult = await autoAssignTask(newTask._id);
    
    res.status(201).json({
      message: 'Task created successfully',
      task: newTask,
      assignments: assignmentResult
    });
    
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Auto-assign task to matching volunteers
 */
async function autoAssignTask(taskId) {
  const task = await Case.findById(taskId);
  if (!task) throw new Error('Task not found');
  
  // Find all volunteers
  const volunteers = await User.find({ role: 'volunteer' });
  
  if (volunteers.length === 0) {
    return { message: 'No volunteers registered yet' };
  }
  
  // Find matching volunteers
  const matches = findMatchingVolunteers(volunteers, task.skills_required, 50);
  
  const assignments = [];
  
  for (const match of matches) {
    // Assign task to volunteer
    task.assignedTo = match.volunteer._id;
    task.status = 'accepted';
    await task.save();
    
    // Send notifications
    const ngo = await User.findById(task.createdBy || match.volunteer._id);
    
    // Email notification
    await sendTaskAssignmentEmail(match.volunteer, task, ngo || { organizationName: 'NGO' });
    
    // SMS notification
    await sendTaskAssignmentSMS(match.volunteer, task);
    
    assignments.push({
      volunteer: match.volunteer.fullName,
      email: match.volunteer.email,
      matchPercentage: match.matchPercentage,
      matchedSkills: match.matchedSkills
    });
    
    // Assign to first best match only (optional: can assign to multiple)
    break;
  }
  
  return {
    taskAssigned: assignments.length > 0,
    assignments
  };
}

/**
 * Get tasks assigned to logged-in volunteer
 */
async function getMyTasks(req, res) {
  try {
    const tasks = await Case.find({ assignedTo: req.user._id })
      .sort({ createdAt: -1 });
    
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Update task status (volunteer or NGO)
 */
async function updateTaskStatus(req, res) {
  try {
    const { taskId } = req.params;
    const { status } = req.body;
    
    const task = await Case.findById(taskId);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Check permission
    if (req.user.role === 'volunteer' && task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    task.status = status;
    await task.save();
    
    // Send notification to volunteer if status updated by NGO
    if (req.user.role === 'ngo' && task.assignedTo) {
      const volunteer = await User.findById(task.assignedTo);
      if (volunteer) {
        await sendTaskUpdateEmail(volunteer, task, status);
      }
    }
    
    res.json({ message: 'Task status updated', task });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get all open tasks (for volunteers to browse)
 */
async function getOpenTasks(req, res) {
  try {
    const tasks = await Case.find({ 
      status: 'open',
      assignedTo: null 
    }).sort({ urgency_level: -1, createdAt: -1 });
    
    // Add match info for logged-in volunteer
    if (req.user.role === 'volunteer') {
      const tasksWithMatch = tasks.map(task => {
        const match = calculateSkillMatch(req.user.skills, task.skills_required);
        return {
          ...task.toObject(),
          matchPercentage: match.matchPercentage,
          matchedSkills: match.matchedSkills
        };
      });
      return res.json(tasksWithMatch.sort((a, b) => b.matchPercentage - a.matchPercentage));
    }
    
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Manual task assignment (for testing/admin)
 */
async function manualAssignTask(req, res) {
  try {
    const { taskId, volunteerId } = req.body;
    
    const task = await Case.findById(taskId);
    const volunteer = await User.findById(volunteerId);
    
    if (!task || !volunteer) {
      return res.status(404).json({ error: 'Task or volunteer not found' });
    }
    
    task.assignedTo = volunteerId;
    task.status = 'accepted';
    await task.save();
    
    // Send notifications
    await sendTaskAssignmentEmail(volunteer, task, { organizationName: 'NGO' });
    await sendTaskAssignmentSMS(volunteer, task);
    
    res.json({ message: 'Task assigned successfully', task });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  createTask,
  autoAssignTask,
  getMyTasks,
  updateTaskStatus,
  getOpenTasks,
  manualAssignTask
};