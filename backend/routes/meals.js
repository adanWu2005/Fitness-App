const express = require('express');
const router = express.Router();
const mealsService = require('../services/mealsService');
const { authenticateToken } = require('../middleware/auth');

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
router.post('/folders', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    const folder = await mealsService.createFolder(req.user._id.toString(), name);
    res.json({ folder });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create meal folder' });
  }
});

// Delete a meal folder
router.delete('/folders/:folderId', authenticateToken, async (req, res) => {
  try {
    await mealsService.deleteFolder(req.user._id.toString(), req.params.folderId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete meal folder' });
  }
});

// Update meal folder name
router.put('/folders/:folderId', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    const folder = await mealsService.updateFolderName(req.user._id.toString(), req.params.folderId, name);
    res.json({ folder });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update meal folder name' });
  }
});

// Toggle meal folder star
router.post('/folders/:folderId/star', authenticateToken, async (req, res) => {
  try {
    const folder = await mealsService.toggleFolderStar(req.user._id.toString(), req.params.folderId);
    res.json({ folder });
  } catch (error) {
    res.status(500).json({ error: 'Failed to star/unstar meal folder' });
  }
});

// Get all meals in a folder
router.get('/meals/:folderId', authenticateToken, async (req, res) => {
  try {
    const meals = await mealsService.getMeals(req.user._id.toString(), req.params.folderId);
    res.json({ meals });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch meals' });
  }
});

// Add a meal to a folder
router.post('/meals/:folderId', authenticateToken, async (req, res) => {
  try {
    const { name, nutrition, image, description, quantity } = req.body;
    const meal = await mealsService.addMeal(req.user._id.toString(), req.params.folderId, { 
      name, 
      nutrition, 
      image, 
      description, 
      quantity 
    });
    res.json({ meal });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add meal' });
  }
});

// Delete a meal
router.delete('/meals/:folderId/:mealId', authenticateToken, async (req, res) => {
  try {
    await mealsService.deleteMeal(req.user._id.toString(), req.params.folderId, req.params.mealId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete meal' });
  }
});

// Update meal details
router.put('/meals/:folderId/:mealId', authenticateToken, async (req, res) => {
  try {
    const { quantity } = req.body;
    
    // Only allow quantity updates
    if (quantity === undefined) {
      return res.status(400).json({ error: 'Quantity is required' });
    }
    
    const numQuantity = parseFloat(quantity);
    if (isNaN(numQuantity) || numQuantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than 0' });
    }
    
    const meal = await mealsService.updateMeal(req.user._id.toString(), req.params.folderId, req.params.mealId, { 
      quantity: numQuantity
    });
    res.json({ meal });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update meal' });
  }
});

// Toggle meal star
router.post('/meals/:folderId/:mealId/star', authenticateToken, async (req, res) => {
  try {
    const meal = await mealsService.toggleMealStar(req.user._id.toString(), req.params.folderId, req.params.mealId);
    res.json({ meal });
  } catch (error) {
    res.status(500).json({ error: 'Failed to star/unstar meal' });
  }
});

module.exports = router; 