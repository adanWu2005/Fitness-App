const express = require('express');
const router = express.Router();
const workoutsService = require('../services/workoutsService');
const { authenticateToken } = require('../middleware/auth');
const { validateIdParam, sanitizeString, sanitizeNumber } = require('../middleware/validation');

// Get all folders (body parts) for a user
router.get('/folders', authenticateToken, async (req, res) => {
  try {
    const folders = await workoutsService.getFolders(req.user._id.toString());
    res.json({ folders });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

// Create a new folder (body part)
// SECURITY: Input sanitization prevents injection
router.post('/folders', authenticateToken, async (req, res) => {
  try {
    const name = sanitizeString(req.body.name, 200);
    
    if (!name || name.length === 0) {
      return res.status(400).json({ error: 'Folder name is required and must be a valid string' });
    }
    
    const folder = await workoutsService.createFolder(req.user._id.toString(), name);
    res.json({ folder });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Delete a folder
// SECURITY: validateIdParam ensures folderId is safe
router.delete('/folders/:folderId', authenticateToken, validateIdParam, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const folderId = req.params.folderId;
    
    // SECURITY: Verify folder exists and belongs to user
    const folders = workoutsService.getFolders(userId);
    const folder = folders.find(f => f.id === folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found or access denied' });
    }
    
    await workoutsService.deleteFolder(userId, folderId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// Update folder name
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
    const folders = workoutsService.getFolders(userId);
    const folder = folders.find(f => f.id === folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found or access denied' });
    }
    
    const updatedFolder = await workoutsService.updateFolderName(userId, folderId, name);
    res.json({ folder: updatedFolder });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update folder name' });
  }
});

// Toggle folder star
// SECURITY: validateIdParam ensures folderId is safe
router.post('/folders/:folderId/star', authenticateToken, validateIdParam, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const folderId = req.params.folderId;
    
    // Verify folder exists and belongs to user
    const folders = workoutsService.getFolders(userId);
    const folder = folders.find(f => f.id === folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found or access denied' });
    }
    
    const updatedFolder = await workoutsService.toggleFolderStar(userId, folderId);
    res.json({ folder: updatedFolder });
  } catch (error) {
    res.status(500).json({ error: 'Failed to star/unstar folder' });
  }
});

// Get all workouts in a folder
// SECURITY: validateIdParam ensures folderId is safe
router.get('/workouts/:folderId', authenticateToken, validateIdParam, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const folderId = req.params.folderId;
    
    // Verify folder exists and belongs to user before returning workouts
    const folders = workoutsService.getFolders(userId);
    const folder = folders.find(f => f.id === folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found or access denied' });
    }
    
    const workouts = await workoutsService.getWorkouts(userId, folderId);
    res.json({ workouts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workouts' });
  }
});

// Add a workout to a folder
// SECURITY: validateIdParam and input sanitization prevent injection
router.post('/workouts/:folderId', authenticateToken, validateIdParam, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const folderId = req.params.folderId;
    
    // Verify folder exists and belongs to user
    const folders = workoutsService.getFolders(userId);
    const folder = folders.find(f => f.id === folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found or access denied' });
    }
    
    // Sanitize and validate input
    const name = sanitizeString(req.body.name, 500);
    const reps = req.body.reps ? sanitizeNumber(req.body.reps, 0, 10000) : null;
    const weight = req.body.weight ? sanitizeNumber(req.body.weight, 0, 10000) : null;
    
    if (!name || name.length === 0) {
      return res.status(400).json({ error: 'Workout name is required' });
    }
    
    const workout = await workoutsService.addWorkout(userId, folderId, { name, reps, weight });
    res.json({ workout });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add workout' });
  }
});

// Delete a workout
// SECURITY: validateIdParam ensures both folderId and workoutId are safe
router.delete('/workouts/:folderId/:workoutId', authenticateToken, validateIdParam, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const folderId = req.params.folderId;
    const workoutId = req.params.workoutId;
    
    // SECURITY: Verify both folder and workout exist and belong to user
    const folders = workoutsService.getFolders(userId);
    const folder = folders.find(f => f.id === folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found or access denied' });
    }
    
    const workout = folder.workouts.find(w => w.id === workoutId);
    if (!workout) {
      return res.status(404).json({ error: 'Workout not found or access denied' });
    }
    
    await workoutsService.deleteWorkout(userId, folderId, workoutId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete workout' });
  }
});

// Update workout details
// SECURITY: validateIdParam ensures both folderId and workoutId are safe
router.put('/workouts/:folderId/:workoutId', authenticateToken, validateIdParam, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const folderId = req.params.folderId;
    const workoutId = req.params.workoutId;
    
    // SECURITY: Verify both folder and workout exist and belong to user
    const folders = workoutsService.getFolders(userId);
    const folder = folders.find(f => f.id === folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found or access denied' });
    }
    
    const workout = folder.workouts.find(w => w.id === workoutId);
    if (!workout) {
      return res.status(404).json({ error: 'Workout not found or access denied' });
    }
    
    // Sanitize and validate input
    const name = req.body.name ? sanitizeString(req.body.name, 500) : undefined;
    const reps = req.body.reps !== undefined ? sanitizeNumber(req.body.reps, 0, 10000) : undefined;
    const weight = req.body.weight !== undefined ? sanitizeNumber(req.body.weight, 0, 10000) : undefined;
    
    const updatedWorkout = await workoutsService.updateWorkout(userId, folderId, workoutId, { name, reps, weight });
    res.json({ workout: updatedWorkout });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update workout' });
  }
});

// Toggle workout star
// SECURITY: validateIdParam ensures both folderId and workoutId are safe
router.post('/workouts/:folderId/:workoutId/star', authenticateToken, validateIdParam, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const folderId = req.params.folderId;
    const workoutId = req.params.workoutId;
    
    // SECURITY: Verify both folder and workout exist and belong to user
    const folders = workoutsService.getFolders(userId);
    const folder = folders.find(f => f.id === folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found or access denied' });
    }
    
    const workout = folder.workouts.find(w => w.id === workoutId);
    if (!workout) {
      return res.status(404).json({ error: 'Workout not found or access denied' });
    }
    
    const updatedWorkout = await workoutsService.toggleWorkoutStar(userId, folderId, workoutId);
    res.json({ workout: updatedWorkout });
  } catch (error) {
    res.status(500).json({ error: 'Failed to star/unstar workout' });
  }
});

module.exports = router; 