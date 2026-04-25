const Need = require('../models/Need');

module.exports = {
  findNearbyNeeds: async (lng, lat, radius) => {
    return await Need.find({
      location: {
        $nearSphere: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat]
          },
          $maxDistance: radius
        }
      }
    }).sort({ priority: -1 });
  },

  reverseGeocode: async (lat, lng) => {
    // Mock - replace with real API in production
    return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  }
};