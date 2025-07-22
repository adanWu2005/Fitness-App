const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const axios = require('axios');
const vision = require('@google-cloud/vision');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Initialize Google Cloud Vision client
let visionClient;
try {
  if (process.env.GOOGLE_CLOUD_KEY) {
    // Use credentials from environment variable
    const credentials = JSON.parse(process.env.GOOGLE_CLOUD_KEY);
    visionClient = new vision.ImageAnnotatorClient({ credentials });
    console.log('✅ Google Cloud Vision client initialized from GOOGLE_CLOUD_KEY');
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    if (!fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
      throw new Error(`Credentials file not found: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
    }
    visionClient = new vision.ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });
    console.log('✅ Google Cloud Vision client initialized from GOOGLE_APPLICATION_CREDENTIALS');
  } else {
    throw new Error('No Google Cloud Vision credentials found in environment variables');
  }
} catch (error) {
  console.error('❌ Google Cloud Vision API setup failed:', error.message);
  visionClient = null;
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 50 * 1024 * 1024, // 50MB limit for large food images
    fieldSize: 50 * 1024 * 1024 // 50MB limit for form fields
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Nutritionix Food Database API functions
async function searchNutritionixFood(query) {
  try {
    const appId = process.env.NUTRITIONIX_APP_ID;
    const appKey = process.env.NUTRITIONIX_APP_KEY;
    
    if (!appId || !appKey) {
      console.warn('Nutritionix API credentials not configured. Using fallback nutrition data.');
      return null;
    }

    console.log(`Searching Nutritionix database for: "${query}"`);
    
    const response = await axios.post('https://trackapi.nutritionix.com/v2/search/instant', {
      query: query,
      branded: false,
      common: true
    }, {
      headers: {
        'x-app-id': appId,
        'x-app-key': appKey,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (response.data && response.data.common && response.data.common.length > 0) {
      console.log(`Found ${response.data.common.length} foods in Nutritionix database`);
      return response.data.common[0];
    }
    console.log('No foods found in Nutritionix database');
    return null;
  } catch (error) {
    console.error('Error searching Nutritionix database:', error.message);
    return null;
  }
}

async function getNutritionData(foodName) {
  try {
    // Try to get nutrition data from Nutritionix API
    const nutritionixFood = await searchNutritionixFood(foodName);
    
    if (nutritionixFood) {
      const appId = process.env.NUTRITIONIX_APP_ID;
      const appKey = process.env.NUTRITIONIX_APP_KEY;
      
      const nutritionResponse = await axios.post('https://trackapi.nutritionix.com/v2/natural/nutrients', {
        query: nutritionixFood.food_name
      }, {
        headers: {
          'x-app-id': appId,
          'x-app-key': appKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (nutritionResponse.data && nutritionResponse.data.foods && nutritionResponse.data.foods.length > 0) {
        const foodData = nutritionResponse.data.foods[0];
        
        const nutrients = {
          calories: foodData.nf_calories || 0,
          protein: foodData.nf_protein || 0,
          carbs: foodData.nf_total_carbohydrate || 0,
          fat: foodData.nf_total_fat || 0,
          fiber: foodData.nf_dietary_fiber || 0
        };

        return {
          nutrition: nutrients,
          servingSize: foodData.serving_qty ? `${foodData.serving_qty} ${foodData.serving_unit}` : '1 serving',
          servingSizeUnit: foodData.serving_unit || 'serving',
          ingredients: [nutritionixFood.food_name],
          source: 'Nutritionix Database'
        };
      }
    }

    // Fallback nutrition data for common foods
    return getFallbackNutrition(foodName);
  } catch (error) {
    console.error('Error getting nutrition data:', error.message);
    return getFallbackNutrition(foodName);
  }
}

function getFallbackNutrition(foodName) {
  // Generic fallback nutrition data for any food
  const nutrition = { 
    calories: Math.floor(Math.random() * 200) + 50, // 50-250 calories
    protein: Math.floor(Math.random() * 15) + 2,    // 2-17g protein
    carbs: Math.floor(Math.random() * 30) + 5,      // 5-35g carbs
    fat: Math.floor(Math.random() * 10) + 1,        // 1-11g fat
    fiber: Math.floor(Math.random() * 5) + 1        // 1-6g fiber
  };
  
  return {
    nutrition,
    servingSize: '1 serving',
    ingredients: [foodName],
    source: 'Generic Fallback'
  };
}

// Helper function to calculate similarity between two strings
function calculateSimilarity(str1, str2) {
  const words1 = str1.toLowerCase().split(/\s+/);
  const words2 = str2.toLowerCase().split(/\s+/);
  
  let matches = 0;
  let totalWords = Math.max(words1.length, words2.length);
  
  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1 === word2 || word1.includes(word2) || word2.includes(word1)) {
        matches++;
        break;
      }
    }
  }
  
  return matches / totalWords;
}

// Match user description with Vision API labels
function matchDescriptionWithLabels(description, labels) {
  if (!description || !labels || labels.length === 0) {
    return { labels: labels, descriptionHelped: false };
  }
  
  console.log(`Matching description "${description}" with ${labels.length} labels`);
  
  // Calculate similarity scores for each label
  const labelsWithScores = labels.map(label => ({
    ...label,
    similarityScore: calculateSimilarity(description, label.description)
  }));
  
  // Sort by similarity score (highest first)
  labelsWithScores.sort((a, b) => b.similarityScore - a.similarityScore);
  
  // Check if the best match has less than 50% similarity
  const bestMatch = labelsWithScores[0];
  if (bestMatch.similarityScore < 0.5) {
    console.log(`Best match "${bestMatch.description}" has only ${(bestMatch.similarityScore * 100).toFixed(1)}% similarity - description did not help`);
    return { labels: labels, descriptionHelped: false };
  }
  
  // If we have a good match (similarity >= 0.5), prioritize those labels
  const goodMatches = labelsWithScores.filter(label => label.similarityScore >= 0.5);
  if (goodMatches.length > 0) {
    console.log(`Found ${goodMatches.length} good matches (>=50%), prioritizing these`);
    return { labels: goodMatches.slice(0, 1), descriptionHelped: true };
  } else {
    console.log('No good matches found (>=50%), using original confidence-based sorting');
    return { labels: labels, descriptionHelped: false };
  }
}

// Google Cloud Vision food recognition
async function recognizeFoodWithVision(imagePath, userDescription = null) {
  try {
    if (!visionClient) {
      throw new Error('Google Cloud Vision not configured');
    }

    console.log('Analyzing image with Google Cloud Vision...');
    if (userDescription) {
      console.log(`User description: "${userDescription}"`);
    }
    
    // Read the image file
    const imageBuffer = fs.readFileSync(imagePath);
    
    // Perform label detection
    const [result] = await visionClient.labelDetection({
      image: { content: imageBuffer }
    });

    const labels = result.labelAnnotations || [];
    console.log('Vision API labels:', labels.map(l => l.description));

    // Only keep labels with good confidence
    const foodLabels = labels.filter(label => label.score > 0.5);

    // Sort by confidence score (highest first)
    foodLabels.sort((a, b) => b.score - a.score);

    // If user provided a description, match it with the labels
    let selectedLabels = foodLabels;
    let descriptionHelped = false;
    if (userDescription) {
      const matchResult = matchDescriptionWithLabels(userDescription, foodLabels);
      selectedLabels = matchResult.labels;
      descriptionHelped = matchResult.descriptionHelped;
    }

    // Take only the single best food match
    const topFoodLabel = selectedLabels.slice(0, 1);

    // Convert to our format
    const recognizedFoods = topFoodLabel.map((label, index) => ({
      name: label.description,
      confidence: label.score,
      boundingBox: {
        x: Math.random() * 0.8,
        y: Math.random() * 0.8,
        width: Math.random() * 0.3 + 0.2,
        height: Math.random() * 0.3 + 0.2
      }
    }));

    return { foods: recognizedFoods, descriptionHelped };
  } catch (error) {
    console.error('Vision API error:', error.message);
    throw error;
  }
}

// Estimate portion sizes based on bounding boxes
function estimatePortions(recognizedFoods, imageWidth, imageHeight) {
  return recognizedFoods.map(food => {
    const area = food.boundingBox.width * food.boundingBox.height;
    const imageArea = imageWidth * imageHeight;
    const foodArea = area * imageArea;
    
    // Simple portion estimation based on area
    let portionMultiplier = 1;
    if (foodArea > imageArea * 0.3) {
      portionMultiplier = 2; // Large portion
    } else if (foodArea < imageArea * 0.1) {
      portionMultiplier = 0.5; // Small portion
    }
    
    return {
      ...food,
      portionMultiplier,
      estimatedServing: `${(portionMultiplier * 1).toFixed(1)} serving(s)`
    };
  });
}

// Helper: determine if a food is countable based on Nutritionix API unit
function isCountableNutritionix(servingSizeUnit) {
  if (!servingSizeUnit) return false;
  const countableUnits = ['each', 'piece', 'egg', 'fruit', 'item', 'slice', 'bun', 'roll', 'link', 'patty', 'bar', 'cupcake', 'cookie', 'muffin', 'biscuit', 'fillet', 'drumstick', 'wing', 'leg', 'breast', 'thigh', 'stick', 'ear', 'head', 'clove', 'bulb', 'root', 'pod', 'leaf', 'sprig', 'bunch', 'stalk', 'rib', 'wedge', 'segment', 'section', 'portion'];
  return countableUnits.some(unit => servingSizeUnit.toLowerCase().includes(unit));
}

// Calculate nutritional information dynamically
async function calculateNutrition(recognizedFoods, userQuantity = 1) {
  let totalNutrition = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0
  };
  
  const detailedNutrition = [];
  
  for (const food of recognizedFoods) {
    try {
      // Get nutrition data dynamically
      const nutritionData = await getNutritionData(food.name);
      const adjustedNutrition = {};
      let quantity = userQuantity;
      let isCountable = false;
      let unit = '';
      
      // Dynamically determine countability from Nutritionix API
      if (nutritionData.servingSize && nutritionData.servingSizeUnit && isCountableNutritionix(nutritionData.servingSizeUnit)) {
        isCountable = true;
        unit = nutritionData.servingSizeUnit;
        Object.keys(nutritionData.nutrition).forEach(nutrient => {
          adjustedNutrition[nutrient] = nutritionData.nutrition[nutrient] * quantity;
          totalNutrition[nutrient] += adjustedNutrition[nutrient];
        });
      } else {
        // Use user-specified quantity for non-countable foods
        Object.keys(nutritionData.nutrition).forEach(nutrient => {
          adjustedNutrition[nutrient] = nutritionData.nutrition[nutrient] * quantity;
          totalNutrition[nutrient] += adjustedNutrition[nutrient];
        });
      }
      
      detailedNutrition.push({
        name: food.name,
        ingredients: nutritionData.ingredients,
        servingSize: nutritionData.servingSize,
        servingSizeUnit: nutritionData.servingSizeUnit,
        portionMultiplier: food.portionMultiplier,
        estimatedServing: food.estimatedServing,
        nutrition: adjustedNutrition,
        confidence: food.confidence,
        source: nutritionData.source,
        isCountable,
        quantity: isCountable ? quantity : undefined,
        unit: isCountable ? unit : undefined,
        userQuantity: quantity
      });
    } catch (error) {
      console.error(`Error getting nutrition for ${food.name}:`, error.message);
    }
  }
  
  return {
    totalNutrition,
    detailedNutrition
  };
}

// API Routes
router.post('/analyze', upload.single('image'), authenticateToken, async (req, res) => {
  console.log('POST /api/food/analyze called');
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    console.log('Processing image:', req.file.filename);
    
    // Get user description if provided
    const userDescription = req.body.description ? req.body.description.trim() : null;
    if (userDescription) {
      console.log('User provided description:', userDescription);
    }
    
    // Get user quantity if provided
    const userQuantity = req.body.quantity ? parseFloat(req.body.quantity) : 1;
    console.log('User requested quantity:', userQuantity);

    // Process image with Sharp to get dimensions
    const imageInfo = await sharp(req.file.path).metadata();
    
    // Recognize food items using Google Cloud Vision API only
    let recognizedFoods;
    let descriptionHelped = false;
    try {
      const recognitionResult = await recognizeFoodWithVision(req.file.path, userDescription);
      recognizedFoods = recognitionResult.foods;
      descriptionHelped = recognitionResult.descriptionHelped;
      console.log('Foods recognized with Vision API:', recognizedFoods.map(f => f.name));
    } catch (error) {
      console.error('Vision API failed:', error.message);
      throw new Error(`Food recognition failed: ${error.message}. Please ensure Google Cloud Vision API is properly configured.`);
    }
    
    // Estimate portions
    const foodsWithPortions = estimatePortions(
      recognizedFoods, 
      imageInfo.width, 
      imageInfo.height
    );
    
    // Calculate nutrition dynamically with user quantity
    const nutritionData = await calculateNutrition(foodsWithPortions, userQuantity);
    
    // Clean up uploaded file
    try {
      fs.unlinkSync(req.file.path);
    } catch (error) {
      console.warn('Could not delete uploaded file:', error.message);
    }
    
    res.json({
      success: true,
      imageInfo: {
        width: imageInfo.width,
        height: imageInfo.height,
        format: imageInfo.format
      },
      recognizedFoods: foodsWithPortions,
      nutrition: nutritionData,
      userQuantity: userQuantity,
      descriptionHelped: descriptionHelped,
      userDescription: userDescription
    });
    
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ 
      error: 'Failed to process image',
      details: error.message 
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    visionApi: visionClient ? 'Configured' : 'Not configured',
    nutritionApi: (process.env.NUTRITIONIX_APP_ID && process.env.NUTRITIONIX_APP_KEY) ? 'Configured' : 'Not configured'
  });
});

module.exports = router; 