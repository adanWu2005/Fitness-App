const express = require('express');
const router = express.Router();
const workoutsService = require('../services/workoutsService');
const { authenticateToken } = require('../middleware/auth');

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
router.post('/folders', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    const folder = await workoutsService.createFolder(req.user._id.toString(), name);
    res.json({ folder });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Delete a folder
router.delete('/folders/:folderId', authenticateToken, async (req, res) => {
  try {
    await workoutsService.deleteFolder(req.user._id.toString(), req.params.folderId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// Update folder name
router.put('/folders/:folderId', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    const folder = await workoutsService.updateFolderName(req.user._id.toString(), req.params.folderId, name);
    res.json({ folder });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update folder name' });
  }
});

// Toggle folder star
router.post('/folders/:folderId/star', authenticateToken, async (req, res) => {
  try {
    const folder = await workoutsService.toggleFolderStar(req.user._id.toString(), req.params.folderId);
    res.json({ folder });
  } catch (error) {
    res.status(500).json({ error: 'Failed to star/unstar folder' });
  }
});

// Get all workouts in a folder
router.get('/workouts/:folderId', authenticateToken, async (req, res) => {
  try {
    const workouts = await workoutsService.getWorkouts(req.user._id.toString(), req.params.folderId);
    res.json({ workouts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workouts' });
  }
});

// Add a workout to a folder
router.post('/workouts/:folderId', authenticateToken, async (req, res) => {
  try {
    const { name, reps, weight } = req.body;
    const workout = await workoutsService.addWorkout(req.user._id.toString(), req.params.folderId, { name, reps, weight });
    res.json({ workout });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add workout' });
  }
});

// Delete a workout
router.delete('/workouts/:folderId/:workoutId', authenticateToken, async (req, res) => {
  try {
    await workoutsService.deleteWorkout(req.user._id.toString(), req.params.folderId, req.params.workoutId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete workout' });
  }
});

// Update workout details
router.put('/workouts/:folderId/:workoutId', authenticateToken, async (req, res) => {
  try {
    const { name, reps, weight } = req.body;
    const workout = await workoutsService.updateWorkout(req.user._id.toString(), req.params.folderId, req.params.workoutId, { name, reps, weight });
    res.json({ workout });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update workout' });
  }
});

// Toggle workout star
router.post('/workouts/:folderId/:workoutId/star', authenticateToken, async (req, res) => {
  try {
    const workout = await workoutsService.toggleWorkoutStar(req.user._id.toString(), req.params.folderId, req.params.workoutId);
    res.json({ workout });
  } catch (error) {
    res.status(500).json({ error: 'Failed to star/unstar workout' });
  }
});

module.exports = router; 