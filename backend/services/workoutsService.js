// In-memory storage for demo purposes
const userFolders = new Map(); // userId -> [{ id, name, workouts: [{ id, name, reps, weight }] }]

const generateId = () => Math.random().toString(36).substr(2, 9);

const workoutsService = {
  getFolders(userId) {
    return userFolders.get(userId) || [];
  },
  createFolder(userId, name) {
    const folders = userFolders.get(userId) || [];
    const newFolder = { id: generateId(), name, workouts: [], starred: false };
    folders.push(newFolder);
    userFolders.set(userId, folders);
    return newFolder;
  },
  deleteFolder(userId, folderId) {
    const folders = userFolders.get(userId) || [];
    const updated = folders.filter(f => f.id !== folderId);
    userFolders.set(userId, updated);
  },
  getWorkouts(userId, folderId) {
    const folders = userFolders.get(userId) || [];
    const folder = folders.find(f => f.id === folderId);
    return folder ? folder.workouts : [];
  },
  addWorkout(userId, folderId, { name, reps, weight }) {
    const folders = userFolders.get(userId) || [];
    const folder = folders.find(f => f.id === folderId);
    if (!folder) throw new Error('Folder not found');
    const workout = { id: generateId(), name, reps, weight, starred: false };
    folder.workouts.push(workout);
    return workout;
  },
  deleteWorkout(userId, folderId, workoutId) {
    const folders = userFolders.get(userId) || [];
    const folder = folders.find(f => f.id === folderId);
    if (!folder) throw new Error('Folder not found');
    folder.workouts = folder.workouts.filter(w => w.id !== workoutId);
  },
  updateFolderName(userId, folderId, name) {
    const folders = userFolders.get(userId) || [];
    const folder = folders.find(f => f.id === folderId);
    if (!folder) throw new Error('Folder not found');
    folder.name = name;
    return folder;
  },
  updateWorkout(userId, folderId, workoutId, { name, reps, weight }) {
    const folders = userFolders.get(userId) || [];
    const folder = folders.find(f => f.id === folderId);
    if (!folder) throw new Error('Folder not found');
    const workout = folder.workouts.find(w => w.id === workoutId);
    if (!workout) throw new Error('Workout not found');
    if (name !== undefined) workout.name = name;
    if (reps !== undefined) workout.reps = reps;
    if (weight !== undefined) workout.weight = weight;
    return workout;
  },
  toggleFolderStar(userId, folderId) {
    const folders = userFolders.get(userId) || [];
    const folder = folders.find(f => f.id === folderId);
    if (!folder) throw new Error('Folder not found');
    folder.starred = !folder.starred;
    return folder;
  },
  toggleWorkoutStar(userId, folderId, workoutId) {
    const folders = userFolders.get(userId) || [];
    const folder = folders.find(f => f.id === folderId);
    if (!folder) throw new Error('Folder not found');
    const workout = folder.workouts.find(w => w.id === workoutId);
    if (!workout) throw new Error('Workout not found');
    workout.starred = !workout.starred;
    return workout;
  }
};

module.exports = workoutsService; 