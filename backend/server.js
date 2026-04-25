require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const { GoogleGenAI } = require("@google/genai");
const axios = require('axios');
const User = require('./models/User');
const multer = require('multer'); 
const fs = require('fs'); 


const app = express();


app.use(express.static(path.join(__dirname, 'frontend')));


app.use(cors());
app.use(express.json());

// ==================== MULTER UPLOAD CONFIGURATION ====================
// Create uploads folder if it doesn't exist
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
    console.log('📁 Uploads folder created');
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

console.log('✅ File upload system ready');


// Database Connection
mongoose.connect(process.env.DB_CONNECT_STRING || 'mongodb://127.0.0.1:27017/hackathon')
  .then(() => console.log(' MongoDB Connected'))
  .catch(err => console.error(' MongoDB Connection Error:', err));


// Routes
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is healthy 🟢' });
});



app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
     console.log('Login attempt:', email);
   
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
       console.log('User not found:', email);
      return res.status(400).json({ error: 'Invalid credentials' });
    }


     console.log('Stored password hash:', user.password);
    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match:', isMatch);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }


    // Generate token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );


    return res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        fullName: user.fullName
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});




//registration route


  app.post('/api/auth/register', async (req, res) => {
  try {
    const {
      role,
      fullName,
      email,
      phoneNumber,
      password,
      location,
      organizationName,
      ngoDescription,
      registrationNumber,
      skills,
      availability
    } = req.body;


    // Basic validation
    if (!role || !fullName || !email || !phoneNumber || !password || !location) {
      return res.status(400).json({ error: 'Required fields missing' });
    }


    // Role-specific validation
    if (role === 'ngo') {
      if (!organizationName || !ngoDescription || !registrationNumber) {
        return res.status(400).json({ error: 'NGO fields missing' });
      }
    } else if (role === 'volunteer') {
      if (!skills || !availability) {
        return res.status(400).json({ error: 'Volunteer fields missing' });
      }
    }


    // Check for existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }


    // Hash the password
    const salt = await bcrypt.genSalt(10); // Generate a salt
    const hashedPassword = await bcrypt.hash(password, salt); // Hash the password


    // Create user with hashed password
    const user = new User({
      role,
      fullName,
      email,
      phoneNumber,
      password: hashedPassword, // Use the hashed password
      location,
      organizationName,
      ngoDescription,
      registrationNumber,
      skills: skills ? skills.split(',').map(skill => skill.trim()) : [],
      availability
    });


    await user.save();


    // Generate token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );


    return res.status(201).json({
      message: 'User registered successfully',
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


// app.use('/api', require('./routes/api'));



const Case = require("./models/Case");
// ==================== DOCUMENT SCHEMA ====================
const DocumentSchema = new mongoose.Schema({
    needId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case' },
    ngoId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    filename: String,
    originalName: String,
    filePath: String,
    fileSize: Number,
    mimeType: String,
    status: { type: String, enum: ['pending', 'synced', 'failed'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    syncedAt: Date
});

const Document = mongoose.model('Document', DocumentSchema);

app.post("/predict", async (req, res) => {
  try {
    const { text, skills, people, address } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text required" });
    }

    // 🔥 CALL PYTHON AI MODEL
    const aiRes = await axios.post("http://127.0.0.1:5001/predict", {
      text: text
    });

    const result = aiRes.data;

    // ✅ USE USER SKILLS (NOT AI)
    const skills_required = skills
      ? skills.split(",").map(s => s.trim())
      : [];

    // 🔥 SAVE TO DATABASE
    const savedCase = await Case.create({
      text,
      type: result.type,
      urgency_level: result.urgency_level,

      // ✅ Prefer user input if given
      people_affected: people || result.people_affected,

      priority_score: result.priority_score,
      summary: result.summary,
      keywords: result.keywords || [],

      skills_required, // ✅ USER DATA

      location: {
        type: "Point",
        coordinates: [
          result.location?.lng || 0,
          result.location?.lat || 0
        ]
      },

      address: address || "" // optional if you add in schema
    });

    // 🔥 RESPONSE
    res.json({
      ...result,
      skills_required, // ✅ send user skills back
      people_affected: people || result.people_affected,
      saved_id: savedCase._id,
      message: "AI prediction + saved successfully"
    });

  } catch (err) {
    console.error("AI ERROR:", err.message);
    res.status(500).json({ error: "AI model failed" });
  }
});








const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];


    if (!token) {
        return res.status(401).json({ error: "No token" });
    }


    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid token" });
    }
};


app.get("/api/profile", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");


        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }


        res.json(user);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});



app.put("/api/profile/update", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;


        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                fullName: req.body.fullName,
                phoneNumber: req.body.phoneNumber,
                location: req.body.location
            },
            { new: true }
        );


        res.json(updatedUser);


    } catch (err) {
        res.status(500).json({ error: "Update failed" });
    }
});




const { GoogleGenerativeAI } = require("@google/generative-ai"); // ✅ Correct import
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); 
app.post("/api/gemini", async (req, res) => {
    try {
        const userMessage = req.body.message;


        // ✅ Get the model instance
        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview"
        });


        // ✅ Generate content (correct format)
        const result = await model.generateContent({
            contents: [{
                role: "user",
                parts: [{ text: userMessage }]
            }]
        });


        // ✅ Extract response text properly
        const response = await result.response;
        const text = response.text();


        res.json({ reply: text });


    } catch (err) {
        console.error("Gemini Error:", err);
       res.json({
    reply: "⚠️ AI is busy right now. Please try again in a moment."
});
    }
});



app.get("/api/cases", async (req, res) => {
  try {
    const cases = await Case.find().sort({ createdAt: -1 });
    res.json(cases);
  } catch (err) {
    console.log("Fetch cases error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


app.get("/cases", async (req, res) => {
    const data = await Case.find().sort({ createdAt: -1 });
    res.json(data);
});


// ==================== TASK MANAGEMENT SYSTEM (ADDED) ====================

// Email Service for Notifications
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendTaskAssignmentEmail(volunteer, task, ngo) {
  const mailOptions = {
    from: `"Smart NGO" <${process.env.EMAIL_USER}>`,
    to: volunteer.email,
    subject: `🎯 New Task Assigned: ${task.text}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #b71c1c;">🌟 New Volunteer Task Assigned!</h2>
        <p>Dear <strong>${volunteer.fullName}</strong>,</p>
        <p>Your skills match a new emergency task created by <strong>${ngo?.organizationName || ngo?.fullName || 'NGO'}</strong>.</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">📋 Task Details:</h3>
          <p><strong>Task:</strong> ${task.text}</p>
          <p><strong>Type:</strong> ${task.type}</p>
          <p><strong>Urgency:</strong> ${task.urgency_level}</p>
          <p><strong>People Affected:</strong> ${task.people_affected}</p>
          <p><strong>Required Skills:</strong> ${task.skills_required?.join(', ') || 'None'}</p>
        </div>
        <a href="http://localhost:3000/volunteertasks.html" style="background: #b71c1c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View My Tasks</a>
      </div>
    `
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${volunteer.email}`);
  } catch (error) {
    console.error('Email error:', error);
  }
}

async function sendTaskAssignmentSMS(volunteer, task) {
  const message = `Smart NGO: Hi ${volunteer.fullName}, new task: "${task.text}" (${task.urgency_level}). Required skills: ${task.skills_required?.join(', ') || 'None'}. Login to dashboard.`;
  let phone = volunteer.phoneNumber;
  if (!phone.startsWith('+')) phone = '+91' + phone;
  
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      const twilio = require('twilio');
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({ body: message, to: phone, from: process.env.TWILIO_PHONE_NUMBER });
      console.log(`📱 SMS sent to ${phone}`);
    } catch (error) {
      console.error('SMS error:', error);
    }
  } else {
    console.log(`📱 [SMS Simulated] To: ${phone}, Message: ${message}`);
  }
}

// Skill Matching Function
function calculateSkillMatch(volunteerSkills, requiredSkills) {
  if (!requiredSkills || requiredSkills.length === 0) return { matchedSkills: [], missingSkills: [], matchPercentage: 100 };
  if (!volunteerSkills || volunteerSkills.length === 0) return { matchedSkills: [], missingSkills: requiredSkills, matchPercentage: 0 };
  
  const normalizedVolunteer = volunteerSkills.map(s => s.toLowerCase().trim());
  const normalizedRequired = requiredSkills.map(s => s.toLowerCase().trim());
  const matchedSkills = normalizedVolunteer.filter(skill => normalizedRequired.includes(skill));
  const matchPercentage = (matchedSkills.length / normalizedRequired.length) * 100;
  
  return { matchedSkills, missingSkills: normalizedRequired.filter(s => !normalizedVolunteer.includes(s)), matchPercentage: Math.round(matchPercentage) };
}

// Auto Assign Task Function
async function autoAssignTask(taskId, ngoUser) {
  const task = await Case.findById(taskId);
  if (!task) throw new Error('Task not found');
  
  const volunteers = await User.find({ role: 'volunteer' });
  if (volunteers.length === 0) return { message: 'No volunteers registered yet' };
  
  const matches = volunteers.map(volunteer => ({ volunteer, ...calculateSkillMatch(volunteer.skills, task.skills_required) }))
    .filter(m => m.matchPercentage >= 50)
    .sort((a, b) => b.matchPercentage - a.matchPercentage);
  
  const assignments = [];
  for (const match of matches) {
    task.assignedTo = match.volunteer._id;
    task.status = 'accepted';
    await task.save();
    await sendTaskAssignmentEmail(match.volunteer, task, ngoUser);
    await sendTaskAssignmentSMS(match.volunteer, task);
    assignments.push({ volunteer: match.volunteer.fullName, email: match.volunteer.email, matchPercentage: match.matchPercentage, matchedSkills: match.matchedSkills });
    break;
  }
  return { taskAssigned: assignments.length > 0, assignments };
}

// Create Task (NGO only)
app.post('/api/tasks', authMiddleware, async (req, res) => {
  try {
    const { text, type, urgency_level, people_affected, skills_required, summary } = req.body;
    
    const user = await User.findById(req.user.id);
    if (user.role !== 'ngo') return res.status(403).json({ error: 'Only NGOs can create tasks' });
    
    const newTask = new Case({
      text, type: type || 'Other', urgency_level: urgency_level || 'Medium',
      people_affected: people_affected || 0, skills_required: skills_required || [],
      summary, status: 'open', createdBy: req.user.id, createdAt: new Date()
    });
    await newTask.save();
    
    const assignmentResult = await autoAssignTask(newTask._id, user);
    res.status(201).json({ message: 'Task created successfully', task: newTask, assignments: assignmentResult });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get My Assigned Tasks (Volunteer)
app.get('/api/tasks/my-tasks', authMiddleware, async (req, res) => {
  try {
    const tasks = await Case.find({ assignedTo: req.user.id }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Open Tasks (Available for volunteers)
app.get('/api/tasks/open-tasks', authMiddleware, async (req, res) => {
  try {
    const tasks = await Case.find({ status: 'open', assignedTo: null }).sort({ urgency_level: -1, createdAt: -1 });
    const user = await User.findById(req.user.id);
    
    if (user.role === 'volunteer') {
      const tasksWithMatch = tasks.map(task => ({ ...task.toObject(), ...calculateSkillMatch(user.skills, task.skills_required) }));
      return res.json(tasksWithMatch.sort((a, b) => b.matchPercentage - a.matchPercentage));
    }
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Task Status
app.put('/api/tasks/:taskId/status', authMiddleware, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;
    const task = await Case.findById(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    
    const user = await User.findById(req.user.id);
    if (user.role === 'volunteer' && task.assignedTo?.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    task.status = status;
    await task.save();
    res.json({ message: 'Task status updated', task });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual Assign Task (NGO only)
app.post('/api/tasks/assign', authMiddleware, async (req, res) => {
  try {
    const { taskId, volunteerId } = req.body;
    const user = await User.findById(req.user.id);
    if (user.role !== 'ngo') return res.status(403).json({ error: 'Only NGOs can assign tasks' });
    
    const task = await Case.findById(taskId);
    const volunteer = await User.findById(volunteerId);
    if (!task || !volunteer) return res.status(404).json({ error: 'Task or volunteer not found' });
    
    task.assignedTo = volunteerId;
    task.status = 'accepted';
    await task.save();
    await sendTaskAssignmentEmail(volunteer, task, user);
    await sendTaskAssignmentSMS(volunteer, task);
    res.json({ message: 'Task assigned successfully', task });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get All Volunteers (NGO only)
app.get('/api/volunteers', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'ngo') return res.status(403).json({ error: 'Only NGOs can view volunteers' });
    const volunteers = await User.find({ role: 'volunteer' }).select('fullName email phoneNumber location skills availability');
    res.json(volunteers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Volunteer Skills
app.put('/api/auth/skills', authMiddleware, async (req, res) => {
  try {
    const { skills } = req.body;
    const user = await User.findById(req.user.id);
    if (user.role !== 'volunteer') return res.status(403).json({ error: 'Only volunteers can update skills' });
    
    user.skills = skills;
    await user.save();
    res.json({ message: 'Skills updated successfully', skills: user.skills });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== TEST ENDPOINTS ====================

// Test SMS Endpoint
app.post('/api/test-sms', async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number required' });
    }
    
    const testMessage = message || 'Test SMS from Smart NGO!';
    
    // Format phone number
    let cleaned = phoneNumber.toString().replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    if (!cleaned.startsWith('91') && cleaned.length === 10) cleaned = '91' + cleaned;
    if (!cleaned.startsWith('+')) cleaned = '+' + cleaned;
    
    console.log(`📱 Sending test SMS to: ${cleaned}`);
    
    // Use Twilio client
    const twilio = require('twilio');
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    
    const result = await client.messages.create({
      body: testMessage,
      to: cleaned,
      from: process.env.TWILIO_PHONE_NUMBER
    });
    
    console.log(`✅ SMS sent! SID: ${result.sid}`);
    
    res.json({
      success: true,
      message: 'SMS sent successfully!',
      sid: result.sid
    });
    
  } catch (error) {
    console.error('❌ SMS error:', error.message);
    res.json({
      success: false,
      message: 'SMS failed',
      error: error.message
    });
  }
});

// Test Email Endpoint
app.post('/api/test-email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: 'a8ffb4001@smtp-brevo.com',
        pass: process.env.BREVO_API_KEY
      }
    });
    
    await transporter.sendMail({
      from: '"Smart NGO" <a8ffb4001@smtp-brevo.com>',
      to: email,
      subject: 'Test Email',
      html: '<h2>Test Successful!</h2>'
    });
    
    res.json({ message: 'Test email sent!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check Status Endpoint
app.get('/api/notification-status', (req, res) => {
  res.json({
    email: { configured: !!process.env.BREVO_API_KEY },
    sms: { 
      configured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || 'not set'
    }
  });
});

// ==================== END OF TEST ENDPOINTS ====================

// ==================== DOCUMENT UPLOAD ENDPOINTS ====================

// Upload documents endpoint
// ==================== DOCUMENT UPLOAD ENDPOINTS ====================

// Upload documents endpoint
app.post('/api/upload-documents', authMiddleware, upload.array('documents', 10), async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'ngo') {
            return res.status(403).json({ error: 'Only NGOs can upload documents' });
        }
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }
        
        const documents = [];
        for (const file of req.files) {
            const doc = new Document({
                ngoId: req.user.id,
                filename: file.filename,
                originalName: file.originalname,
                filePath: file.path,
                fileSize: file.size,
                mimeType: file.mimetype,
                status: 'synced'
            });
            await doc.save();
            documents.push(doc);
        }
        
        res.json({ 
            success: true, 
            message: `${req.files.length} file(s) uploaded successfully`,
            documents: documents 
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all documents for current NGO
app.get('/api/my-documents', authMiddleware, async (req, res) => {
    try {
        const documents = await Document.find({ ngoId: req.user.id });
        res.json(documents);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete document
app.delete('/api/delete-document/:docId', authMiddleware, async (req, res) => {
    try {
        const doc = await Document.findById(req.params.docId);
        if (!doc) return res.status(404).json({ error: 'Document not found' });
        
        if (doc.ngoId.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        
        if (fs.existsSync(doc.filePath)) {
            fs.unlinkSync(doc.filePath);
        }
        
        await Document.findByIdAndDelete(req.params.docId);
        res.json({ message: 'Document deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Download document
app.get('/api/download-document/:docId', authMiddleware, async (req, res) => {
    try {
        const doc = await Document.findById(req.params.docId);
        if (!doc) return res.status(404).json({ error: 'Document not found' });
        
        if (doc.ngoId.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        
        if (!fs.existsSync(doc.filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }
        
        res.download(doc.filePath, doc.originalName);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

console.log('✅ Document upload endpoints registered');











// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
});