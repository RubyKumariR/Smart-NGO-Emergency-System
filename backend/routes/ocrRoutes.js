const express = require('express');
const router = express.Router();
const axios = require('axios');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const authMiddleware = require('../middleware/authMiddleware');

// ── Upload directory ────────────────────────────────────────
const uploadDir = './uploads/ocr';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// ── Multer config ───────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        // Preserve original extension so OCR.space detects file type correctly
        const ext = path.extname(file.originalname) || '.jpg';
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (JPG, PNG, BMP, TIFF, WEBP)'));
        }
    }
});

// ── Smart emergency data extractor ─────────────────────────
function extractEmergencyData(text) {
    console.log('📝 Extracting data from text length:', text.length);
    console.log('📄 Full text:\n', text);

    const lower = text.toLowerCase();

    const data = {
        location: null,
        peopleAffected: null,
        type: null,
        urgency: 'Medium',
        skills: []
    };

    // ── Location: expanded Indian cities + states + generic patterns ──
    const knownPlaces = [
        'mumbai', 'delhi', 'new delhi', 'bangalore', 'bengaluru', 'chennai', 'kolkata',
        'hyderabad', 'pune', 'ahmedabad', 'jaipur', 'surat', 'lucknow', 'kanpur',
        'nagpur', 'indore', 'bhopal', 'patna', 'vadodara', 'ghaziabad', 'ludhiana',
        'agra', 'nashik', 'meerut', 'rajkot', 'varanasi', 'amritsar', 'allahabad',
        'prayagraj', 'howrah', 'coimbatore', 'vijayawada', 'madurai', 'visakhapatnam',
        'bhubaneswar', 'dehradun', 'jammu', 'srinagar', 'shimla', 'gangtok',
        'imphal', 'shillong', 'aizawl', 'itanagar', 'kohima', 'agartala', 'dispur',
        // States
        'mizoram', 'kerala', 'jharkhand', 'assam', 'bihar', 'gujarat', 'odisha',
        'punjab', 'haryana', 'rajasthan', 'maharashtra', 'karnataka', 'tamil nadu',
        'andhra pradesh', 'telangana', 'uttar pradesh', 'madhya pradesh',
        'west bengal', 'uttarakhand', 'himachal pradesh', 'chhattisgarh', 'goa',
        'manipur', 'meghalaya', 'nagaland', 'tripura', 'arunachal pradesh', 'sikkim'
    ];

    for (const place of knownPlaces) {
        if (lower.includes(place)) {
            // Title case
            data.location = place.replace(/\b\w/g, c => c.toUpperCase());
            console.log('📍 Location detected:', data.location);
            break;
        }
    }

    // Fallback: look for "in <City>" or "at <City>" or "District: <City>" patterns
    if (!data.location) {
        const locPatterns = [
            /(?:in|at|near|from|district[:\s]+|location[:\s]+|place[:\s]+|area[:\s]+)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/,
            /([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+(?:district|region|state|city|town|village)/i
        ];
        for (const pat of locPatterns) {
            const m = text.match(pat);
            if (m && m[1] && m[1].length > 2) {
                data.location = m[1].trim();
                console.log('📍 Location detected via pattern:', data.location);
                break;
            }
        }
    }

    // ── People affected ──────────────────────────────────────
    const peoplePatterns = [
        /(\d[\d,]+)\s*(?:people|persons?|families|households|individuals|victims?|survivors?|residents?|citizens?)\s*(?:affected|displaced|stranded|injured|missing|dead|killed|homeless)/i,
        /(?:affected|displaced|stranded|injured|missing|impacted)[^\d]{0,20}(\d[\d,]+)/i,
        /(?:total|approx\.?|approximately|nearly|over|more than)\s+(\d[\d,]+)\s*(?:people|persons?|affected)/i,
        /population[:\s]+(\d[\d,]+)/i
    ];
    for (const pat of peoplePatterns) {
        const m = text.match(pat);
        if (m) {
            data.peopleAffected = parseInt(m[1].replace(/,/g, ''));
            console.log('👥 People affected:', data.peopleAffected);
            break;
        }
    }

    // ── Emergency type ───────────────────────────────────────
    const typeMap = [
        ['flood', 'Flood'],
        ['flash flood', 'Flood'],
        ['inundation', 'Flood'],
        ['earthquake', 'Earthquake'],
        ['tremor', 'Earthquake'],
        ['seismic', 'Earthquake'],
        ['fire', 'Fire'],
        ['wildfire', 'Fire'],
        ['blaze', 'Fire'],
        ['cyclone', 'Cyclone'],
        ['hurricane', 'Cyclone'],
        ['typhoon', 'Cyclone'],
        ['storm', 'Cyclone'],
        ['landslide', 'Landslide'],
        ['mudslide', 'Landslide'],
        ['drought', 'Drought'],
        ['famine', 'Drought'],
        ['tsunami', 'Tsunami'],
        ['epidemic', 'Epidemic'],
        ['outbreak', 'Epidemic'],
        ['covid', 'Epidemic'],
        ['explosion', 'Industrial Accident'],
        ['chemical', 'Industrial Accident'],
        ['accident', 'Industrial Accident']
    ];
    for (const [keyword, type] of typeMap) {
        if (lower.includes(keyword)) {
            data.type = type;
            console.log('🚨 Type detected:', type);
            break;
        }
    }
    if (!data.type) data.type = 'Emergency';

    // ── Urgency ──────────────────────────────────────────────
    if (/\b(critical|extreme|life.?threatening|sos|mayday|immediate|urgent)\b/i.test(text)) {
        data.urgency = 'Critical';
    } else if (/\b(urgent|emergency|high priority|severe|serious)\b/i.test(text)) {
        data.urgency = 'High';
    } else if (/\b(moderate|medium|manageable)\b/i.test(text)) {
        data.urgency = 'Medium';
    } else if (/\b(low|minor|stable)\b/i.test(text)) {
        data.urgency = 'Low';
    }
    console.log('⚠️ Urgency detected:', data.urgency);

    // ── Skills ───────────────────────────────────────────────
    const skillMap = [
        ['rescue', 'Search and Rescue'],
        ['search and rescue', 'Search and Rescue'],
        ['evacuati', 'Search and Rescue'],
        ['medical', 'Medical Aid'],
        ['first aid', 'Medical Aid'],
        ['doctor', 'Medical Aid'],
        ['nurse', 'Medical Aid'],
        ['health', 'Medical Aid'],
        ['paramedic', 'Medical Aid'],
        ['food', 'Food Distribution'],
        ['meal', 'Food Distribution'],
        ['ration', 'Food Distribution'],
        ['nutrition', 'Food Distribution'],
        ['water', 'Water Sanitation'],
        ['sanitation', 'Water Sanitation'],
        ['drinking', 'Water Sanitation'],
        ['shelter', 'Shelter Construction'],
        ['housing', 'Shelter Construction'],
        ['camp', 'Shelter Construction'],
        ['tent', 'Shelter Construction'],
        ['logistics', 'Logistics'],
        ['transport', 'Logistics'],
        ['supply', 'Logistics'],
        ['delivery', 'Logistics'],
        ['counsel', 'Psychological Support'],
        ['mental health', 'Psychological Support'],
        ['trauma', 'Psychological Support'],
        ['psycholog', 'Psychological Support']
    ];

    const addedSkills = new Set();
    for (const [keyword, skill] of skillMap) {
        if (lower.includes(keyword) && !addedSkills.has(skill)) {
            data.skills.push(skill);
            addedSkills.add(skill);
        }
    }
    if (data.skills.length === 0) {
        data.skills = ['General Volunteer'];
    }
    console.log('🛠️ Skills detected:', data.skills);

    return data;
}

// ── OCR Route ───────────────────────────────────────────────
router.post('/scan', authMiddleware, upload.single('image'), async (req, res) => {
    const filePath = req.file?.path;

    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded. Make sure the field name is "image".' });
        }

        const apiKey = process.env.OCR_SPACE_API_KEY;
        if (!apiKey) {
            console.error('❌ OCR_SPACE_API_KEY not set in .env');
            return res.status(500).json({ success: false, error: 'OCR API key not configured on server.' });
        }

        console.log('📷 Processing OCR for file:', req.file.originalname);
        console.log('📏 File size:', req.file.size, 'bytes');
        console.log('🖼️  MIME type:', req.file.mimetype);

        // ── Guard: reject suspiciously small files ──
        if (req.file.size < 1024) {
            console.warn('⚠️ File too small — likely corrupted or empty upload');
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            return res.status(400).json({
                success: false,
                error: `File too small (${req.file.size} bytes). The image did not upload correctly. Please try again with a valid image file.`
            });
        }

        // ── Build OCR.space request ──
        const formData = new FormData();
        formData.append('apikey', apiKey);
        formData.append('file', fs.createReadStream(filePath), {
            filename: req.file.filename,
            contentType: req.file.mimetype
        });
        formData.append('language', 'eng');
        formData.append('isOverlayRequired', 'false');
        formData.append('OCREngine', '2');       // Engine 2 is better for printed text
        formData.append('scale', 'true');
        formData.append('isTable', 'false');
        formData.append('detectOrientation', 'true');

        console.log('🔗 Calling OCR.space API...');

        const ocrResponse = await axios.post('https://api.ocr.space/parse/image', formData, {
            headers: { ...formData.getHeaders() },
            timeout: 30000
        });

        const ocrResult = ocrResponse.data;
        console.log('📡 OCR.space raw response:', JSON.stringify(ocrResult).substring(0, 500));

        // Clean up temp file
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        // ── Handle OCR errors ──
        if (ocrResult.IsErroredOnProcessing) {
            const errMsg = Array.isArray(ocrResult.ErrorMessage)
                ? ocrResult.ErrorMessage.join(', ')
                : (ocrResult.ErrorMessage || 'OCR.space processing error');
            console.error('❌ OCR.space error:', errMsg);
            return res.status(500).json({ success: false, error: errMsg });
        }

        if (!ocrResult.ParsedResults || ocrResult.ParsedResults.length === 0) {
            console.warn('⚠️ No ParsedResults from OCR.space');
            return res.status(500).json({ success: false, error: 'OCR returned no results. Try a clearer image.' });
        }

        const extractedText = ocrResult.ParsedResults[0].ParsedText || '';
        const exitCode = ocrResult.ParsedResults[0].FileParseExitCode;

        console.log('✅ OCR done. Exit code:', exitCode, '| Text length:', extractedText.length);
        console.log('📝 First 300 chars:', extractedText.substring(0, 300));

        // Exit code 2 = image had no text
        if (exitCode === 2 || extractedText.trim().length === 0) {
            console.warn('⚠️ OCR found no text in image');
            return res.json({
                success: true,
                text: '',
                extractedData: {
                    location: null,
                    peopleAffected: null,
                    type: null,
                    urgency: null,
                    skills: []
                },
                warning: 'No text found in image. Try a higher quality scan.',
                wordCount: 0
            });
        }

        const extractedData = extractEmergencyData(extractedText);

        return res.json({
            success: true,
            text: extractedText,
            extractedData,
            wordCount: extractedText.trim().split(/\s+/).length
        });

    } catch (error) {
        console.error('❌ OCR route error:', error.message);
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);

        if (error.code === 'ECONNABORTED') {
            return res.status(504).json({ success: false, error: 'OCR.space timed out. Try a smaller image.' });
        }
        return res.status(500).json({ success: false, error: 'OCR processing failed: ' + error.message });
    }
});

// ── Health check ────────────────────────────────────────────
router.get('/health', (req, res) => {
    const hasKey = !!process.env.OCR_SPACE_API_KEY;
    res.json({
        status: hasKey ? 'OCR service ready' : 'Missing OCR_SPACE_API_KEY',
        service: 'OCR.space',
        apiKeyConfigured: hasKey
    });
});

module.exports = router;