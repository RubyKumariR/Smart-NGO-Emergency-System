const express = require('express');
const router = express.Router();
const axios = require('axios');
const Case = require('../models/Case');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Predict endpoint
router.post("/predict", async (req, res) => {
    try {
        const { text, skills, people, address } = req.body;

        if (!text) {
            return res.status(400).json({ error: "Text required" });
        }

        const aiRes = await axios.post("http://127.0.0.1:5001/predict", {
            text: text
        });

        const result = aiRes.data;

        const skills_required = skills
            ? skills.split(",").map(s => s.trim())
            : [];

        const savedCase = await Case.create({
            text,
            type: result.type,
            urgency_level: result.urgency_level,
            people_affected: people || result.people_affected,
            priority_score: result.priority_score,
            summary: result.summary,
            keywords: result.keywords || [],
            skills_required,
            location: {
                type: "Point",
                coordinates: [
                    result.location?.lng || 0,
                    result.location?.lat || 0
                ]
            },
            address: address || ""
        });

        res.json({
            ...result,
            skills_required,
            people_affected: people || result.people_affected,
            saved_id: savedCase._id,
            message: "AI prediction + saved successfully"
        });

    } catch (err) {
        console.error("AI ERROR:", err.message);
        res.status(500).json({ error: "AI model failed" });
    }
});

// Gemini AI endpoint
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post("/gemini", async (req, res) => {
    try {
        const userMessage = req.body.message;

        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview"
        });

        const result = await model.generateContent({
            contents: [{
                role: "user",
                parts: [{ text: userMessage }]
            }]
        });

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

module.exports = router;