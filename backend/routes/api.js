const express = require('express');
const Need = require('../models/Need');
const router = express.Router();
const nlpService = require('../services/nlpService');
const geoService = require('../services/geoService');
const natural = require("natural");

// AI Analysis Endpoint
router.post('/analyze', async (req, res) => {
  try {
    const analysis = await nlpService.analyzeText(req.body.text);
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: 'AI processing failed' });
  }
});

// Create Need (with auto-geotagging)
router.post('/needs', async (req, res) => {
  try {
    const need = new Need({
      ...req.body,
      location: {
        type: 'Point',
        coordinates: req.body.coordinates // [lng, lat]
      }
    });
    await need.save();
    res.status(201).json(need);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get Nearby Needs (Map Intelligence)
router.get('/needs/nearby', async (req, res) => {
  try {
    const { lng, lat, radius = 5000 } = req.query;
    const needs = await geoService.findNearbyNeeds(parseFloat(lng), parseFloat(lat), parseInt(radius));
    res.json(needs);
  } catch (err) {
    res.status(500).json({ error: 'Geospatial query failed' });
  }
});

module.exports = router;