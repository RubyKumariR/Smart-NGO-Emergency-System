from flask import Flask, request, jsonify

app = Flask(__name__)

def ngo_ai_engine(text):
    # PASTE YOUR FULL COLAB FUNCTION HERE
    return {
        "type": "Food & Water",
        "priority_score": 9,
        "urgency_level": "High",
        "people_affected": 250,
        "location": {"lat": None, "lng": None},
        "keywords": [],
        "summary": "High priority food & water required",
        "recommended_volunteer_type": ["food distribution", "logistics"]
    }

@app.route("/predict", methods=["POST"])
def predict():
    data = request.json
    text = data.get("text")

    result = ngo_ai_engine(text)

    return jsonify(result)

if __name__ == "__main__":
    app.run(port=5001)