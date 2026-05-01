from flask import Flask, request, jsonify
from flask_cors import CORS
import re
import requests

app = Flask(__name__)
CORS(app)

# Location database for Indian places
LOCATION_COORDS = {
    'mizoram': (23.1645, 92.9376),
    'jharkhand': (23.6102, 85.2799),
    'kerala': (10.8505, 76.2711),
    'mumbai': (19.0760, 72.8777),
    'pune': (18.5204, 73.8567),
    'bangalore': (12.9716, 77.5946),
    'bengaluru': (12.9716, 77.5946),
    'delhi': (28.7041, 77.1025),
    'gujarat': (22.2587, 71.1924),
    'odisha': (20.9517, 85.0985),
    'uttarakhand': (30.0668, 79.0193),
    'assam': (26.2006, 92.9376),
    'bihar': (25.5941, 85.1376),
    'tamil nadu': (11.1271, 78.6569),
    'chennai': (13.0827, 80.2707),
    'kolkata': (22.5726, 88.3639),
    'hyderabad': (17.3850, 78.4867),
    'ahmedabad': (23.0225, 72.5714),
    'jaipur': (26.9124, 75.7873),
    'lucknow': (26.8467, 80.9462),
    'kanpur': (26.4499, 80.3319),
    'nagpur': (21.1458, 79.0882),
    'indore': (22.7196, 75.8577),
    'bhopal': (23.2599, 77.4126),
    'visakhapatnam': (17.6868, 83.2185),
    'patna': (25.5941, 85.1376),
    'vadodara': (22.3072, 73.1812),
    'gurgaon': (28.4595, 77.0266),
    'noida': (28.5355, 77.3910)
}

def extract_location_and_coords(text):
    """Extract location from text and return name + coordinates"""
    text_lower = text.lower()
    
    # Check for known locations
    for location, (lat, lng) in LOCATION_COORDS.items():
        if location in text_lower:
            return location.title(), lat, lng
    
    # Default to India center
    return "India", 20.5937, 78.9629

def ngo_ai_engine(text):
    """Analyze emergency text and return structured response"""
    text_lower = text.lower()
    
    # Extract location
    location_name, lat, lng = extract_location_and_coords(text)
    
    # Determine emergency type
    if any(word in text_lower for word in ['flood', 'flooding', 'inundation']):
        emergency_type = "Flood"
        urgency = "High"
        priority = 95
        people_match = re.search(r'(\d+[\s,]?\d*)\s*(?:people|persons?)', text)
        people_affected = int(people_match.group(1).replace(',', '')) if people_match else 5000
        summary = f"Flood emergency affecting {people_affected} people in {location_name}"
        keywords = ["flood", "water", "rescue", "evacuation"]
        volunteers = ["rescue", "medical", "food distribution", "shelter"]
        
    elif any(word in text_lower for word in ['fire', 'burning', 'blaze']):
        emergency_type = "Fire"
        urgency = "High"
        priority = 90
        people_match = re.search(r'(\d+[\s,]?\d*)\s*(?:people|persons?)', text)
        people_affected = int(people_match.group(1).replace(',', '')) if people_match else 500
        summary = f"Fire emergency affecting {people_affected} people in {location_name}"
        keywords = ["fire", "evacuation", "safety"]
        volunteers = ["fire safety", "medical", "shelter"]
        
    elif any(word in text_lower for word in ['corona', 'covid', 'pandemic', 'disease']):
        emergency_type = "Health Crisis"
        urgency = "High"
        priority = 88
        people_match = re.search(r'(\d+[\s,]?\d*)\s*(?:people|persons?)', text)
        people_affected = int(people_match.group(1).replace(',', '')) if people_match else 1000
        summary = f"Health crisis affecting {people_affected} people in {location_name}"
        keywords = ["health", "medical", "disease"]
        volunteers = ["medical", "healthcare", "sanitation"]
        
    else:
        emergency_type = "Food & Water"
        urgency = "Medium"
        priority = 70
        people_match = re.search(r'(\d+[\s,]?\d*)\s*(?:people|persons?)', text)
        people_affected = int(people_match.group(1).replace(',', '')) if people_match else 250
        summary = f"Emergency assistance required in {location_name}"
        keywords = ["relief", "assistance", "supplies"]
        volunteers = ["food distribution", "logistics", "water supply"]
    
    return {
        "type": emergency_type,
        "priority_score": priority,
        "urgency_level": urgency,
        "people_affected": people_affected,
        "location_name": location_name,
        "location": {
            "lat": lat,
            "lng": lng
        },
        "keywords": keywords,
        "summary": summary,
        "recommended_volunteer_type": volunteers
    }

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.json
        text = data.get("text", "")
        
        if not text:
            return jsonify({"error": "Text is required"}), 400
        
        result = ngo_ai_engine(text)
        return jsonify(result)
        
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy"})

if __name__ == "__main__":
    print("🚀 ML API Starting...")
    print("📍 Location coordinates loaded:", len(LOCATION_COORDS), "locations")
    app.run(host="127.0.0.1", port=5001, debug=True)