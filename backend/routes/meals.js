const express = require('express');
const router = express.Router();
const mealsService = require('../services/mealsService');
const { authenticateToken } = require('../middleware/auth');
const { validateIdParam, sanitizeString } = require('../middleware/validation');

// Get all meal folders for a user
router.get('/folders', authenticateToken, async (req, res) => {
  try {
    const folders = await mealsService.getFolders(req.user._id.toString());
    res.json({ folders });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch meal folders' });
  }
});

// Create a new meal folder
// SECURITY: Input sanitization prevents injection
router.post('/folders', authenticateToken, async (req, res) => {
  try {
    const name = sanitizeString(req.body.name, 200);
    
    if (!name || name.length === 0) {
      return res.status(400).json({ error: 'Folder name is required and must be a valid string' });
    }
    
    const folder = await mealsService.createFolder(req.user._id.toString(), name);
    res.json({ folder });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create meal folder' });
  }
});

// Delete a meal folder
// SECURITY: validateIdParam ensures folderId is safe and doesn't contain injection characters
router.delete('/folders/:folderId', authenticateToken, validateIdParam, async (req, res) => {
  try {
    // SECURITY: userId comes from authenticated token (req.user._id), not from request params
    // This ensures users can only access their own folders
    const userId = req.user._id.toString();
    const folderId = req.params.folderId;
    
    // Verify folder exists and belongs to user (implicitly checked by service)
    const folders = mealsService.getFolders(userId);
    const folder = folders.find(f => f.id === folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found or access denied' });
    }
    
    await mealsService.deleteFolder(userId, folderId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete meal folder' });
  }
});

// Update meal folder name
// SECURITY: validateIdParam and input sanitization prevent injection
router.put('/folders/:folderId', authenticateToken, validateIdParam, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const folderId = req.params.folderId;
    const name = sanitizeString(req.body.name, 200);
    
    if (!name || name.length === 0) {
      return res.status(400).json({ error: 'Folder name is required and must be a valid string' });
    }
    
    // Verify folder exists and belongs to user
    const folders = mealsService.getFolders(userId);
    const folder = folders.find(f => f.id === folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found or access denied' });
    }
    
    const updatedFolder = await mealsService.updateFolderName(userId, folderId, name);
    res.json({ folder: updatedFolder });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update meal folder name' });
  }
});

// Toggle meal folder star
// SECURITY: validateIdParam ensures folderId is safe
router.post('/folders/:folderId/star', authenticateToken, validateIdParam, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const folderId = req.params.folderId;
    
    // Verify folder exists and belongs to user
    const folders = mealsService.getFolders(userId);
    const folder = folders.find(f => f.id === folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found or access denied' });
    }
    
    const updatedFolder = await mealsService.toggleFolderStar(userId, folderId);
    res.json({ folder: updatedFolder });
  } catch (error) {
    res.status(500).json({ error: 'Failed to star/unstar meal folder' });
  }
});

// Get all meals in a folder
// SECURITY: validateIdParam ensures folderId is safe
router.get('/meals/:folderId', authenticateToken, validateIdParam, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const folderId = req.params.folderId;
    
    // Verify folder exists and belongs to user before returning meals
    const folders = mealsService.getFolders(userId);
    const folder = folders.find(f => f.id === folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found or access denied' });
    }
    
    const meals = await mealsService.getMeals(userId, folderId);
    res.json({ meals });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch meals' });
  }
});

// Add a meal to a folder
// SECURITY: validateIdParam and input sanitization prevent injection
router.post('/meals/:folderId', authenticateToken, validateIdParam, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const folderId = req.params.folderId;
    
    // Verify folder exists and belongs to user
    const folders = mealsService.getFolders(userId);
    const folder = folders.find(f => f.id === folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found or access denied' });
    }
    
    // Sanitize and validate input
    const name = sanitizeString(req.body.name, 500);
    const description = req.body.description ? sanitizeString(req.body.description, 2000) : null;
    const quantity = req.body.quantity ? parseFloat(req.body.quantity) : 1;
    
    if (!name || name.length === 0) {
      return res.status(400).json({ error: 'Meal name is required' });
    }
    
    if (isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be a positive number' });
    }
    
    // Nutrition and image should be validated objects/strings but we'll accept them
    // In production, you'd want stricter validation
    const meal = await mealsService.addMeal(userId, folderId, { 
      name, 
      nutrition: req.body.nutrition, 
      image: req.body.image, 
      description, 
      quantity 
    });
    res.json({ meal });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add meal' });
  }
});

// Delete a meal
// SECURITY: validateIdParam ensures both folderId and mealId are safe
router.delete('/meals/:folderId/:mealId', authenticateToken, validateIdParam, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const folderId = req.params.folderId;
    const mealId = req.params.mealId;
    
    // SECURITY: Verify both folder and meal exist and belong to user
    const folders = mealsService.getFolders(userId);
    const folder = folders.find(f => f.id === folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found or access denied' });
    }
    
    const meal = folder.meals.find(m => m.id === mealId);
    if (!meal) {
      return res.status(404).json({ error: 'Meal not found or access denied' });
    }
    
    await mealsService.deleteMeal(userId, folderId, mealId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete meal' });
  }
});

// Update meal details
// SECURITY: validateIdParam ensures both folderId and mealId are safe
router.put('/meals/:folderId/:mealId', authenticateToken, validateIdParam, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const folderId = req.params.folderId;
    const mealId = req.params.mealId;
    
    // SECURITY: Verify both folder and meal exist and belong to user
    const folders = mealsService.getFolders(userId);
    const folder = folders.find(f => f.id === folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found or access denied' });
    }
    
    const meal = folder.meals.find(m => m.id === mealId);
    if (!meal) {
      return res.status(404).json({ error: 'Meal not found or access denied' });
    }
    
    const { quantity } = req.body;
    
    // Only allow quantity updates
    if (quantity === undefined) {
      return res.status(400).json({ error: 'Quantity is required' });
    }
    
    const numQuantity = parseFloat(quantity);
    if (isNaN(numQuantity) || numQuantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than 0' });
    }
    
    const updatedMeal = await mealsService.updateMeal(userId, folderId, mealId, { 
      quantity: numQuantity
    });
    res.json({ meal: updatedMeal });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update meal' });
  }
});

// Toggle meal star
// SECURITY: validateIdParam ensures both folderId and mealId are safe
router.post('/meals/:folderId/:mealId/star', authenticateToken, validateIdParam, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const folderId = req.params.folderId;
    const mealId = req.params.mealId;
    
    // SECURITY: Verify both folder and meal exist and belong to user
    const folders = mealsService.getFolders(userId);
    const folder = folders.find(f => f.id === folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found or access denied' });
    }
    
    const meal = folder.meals.find(m => m.id === mealId);
    if (!meal) {
      return res.status(404).json({ error: 'Meal not found or access denied' });
    }
    
    const updatedMeal = await mealsService.toggleMealStar(userId, folderId, mealId);
    res.json({ meal: updatedMeal });
  } catch (error) {
    res.status(500).json({ error: 'Failed to star/unstar meal' });
  }
});

module.exports = router; 