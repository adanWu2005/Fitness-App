import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Workouts.css';

const LOCAL_STORAGE_FOLDERS_KEY = 'workoutFolders';

const FolderWorkouts = ({ user }) => {
  const { folderName } = useParams();
  const [folder, setFolder] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [newWorkout, setNewWorkout] = useState({ name: '', reps: '', weight: '' });
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [editingWorkoutId, setEditingWorkoutId] = useState(null);
  const [editingWorkout, setEditingWorkout] = useState({ name: '', reps: '', weight: '' });

  useEffect(() => {
    if (user) loadFolderAndWorkouts();
    // eslint-disable-next-line
  }, [user, folderName]);

  const getFoldersKey = () => LOCAL_STORAGE_FOLDERS_KEY + '_' + user.id;

  const loadFolderAndWorkouts = () => {
    try {
      const stored = localStorage.getItem(getFoldersKey());
      const folders = stored ? JSON.parse(stored) : [];
      const found = folders.find(f => f.name === folderName);
      setFolder(found);
      setWorkouts(found && found.workouts ? found.workouts : []);
    } catch (err) {
      setError('Failed to load folder or workouts');
    }
  };

  const saveFolders = (foldersToSave) => {
    localStorage.setItem(getFoldersKey(), JSON.stringify(foldersToSave));
  };

  const updateFolderWorkouts = (newWorkouts) => {
    setWorkouts(newWorkouts);
    const stored = localStorage.getItem(getFoldersKey());
    const folders = stored ? JSON.parse(stored) : [];
    const updatedFolders = folders.map(f =>
      f.name === folderName ? { ...f, workouts: newWorkouts } : f
    );
    saveFolders(updatedFolders);
  };

  const addWorkout = (e) => {
    e.preventDefault();
    if (!newWorkout.name.trim() || !newWorkout.reps || !newWorkout.weight) return;
    const id = Date.now().toString();
    const workout = { id, ...newWorkout, starred: false };
    const updated = [...workouts, workout];
    updateFolderWorkouts(updated);
    setNewWorkout({ name: '', reps: '', weight: '' });
  };

  const deleteWorkout = (workoutId) => {
    const updated = workouts.filter(w => w.id !== workoutId);
    updateFolderWorkouts(updated);
  };

  const startEditWorkout = (w) => {
    setEditingWorkoutId(w.id);
    setEditingWorkout({ name: w.name, reps: w.reps, weight: w.weight });
  };
  const cancelEditWorkout = () => {
    setEditingWorkoutId(null);
    setEditingWorkout({ name: '', reps: '', weight: '' });
  };
  const saveEditWorkout = (workoutId) => {
    const updated = workouts.map(w =>
      w.id === workoutId ? { ...w, ...editingWorkout } : w
    );
    updateFolderWorkouts(updated);
    cancelEditWorkout();
  };

  const toggleStarWorkout = (workoutId) => {
    const updated = workouts.map(w =>
      w.id === workoutId ? { ...w, starred: !w.starred } : w
    );
    // Starred workouts first
    const sorted = [...updated.filter(w => w.starred), ...updated.filter(w => !w.starred)];
    updateFolderWorkouts(sorted);
  };

  if (!folder) {
    return (
      <div className="folder-workouts-page">
        <div className="workouts-header">
          <button onClick={() => navigate(-1)} className="back-btn">
            ← Back to Workouts
          </button>
          <h2>❌ Folder Not Found</h2>
          <p>Could not find folder: {folderName}</p>
        </div>
        {error && <div className="error-message">{error}</div>}
      </div>
    );
  }

  return (
    <div className="folder-workouts-page">
      <div className="workouts-header">
        <button onClick={() => navigate(-1)} className="back-btn">
          ←
        </button>
        <h2>💪 Workouts for {folder.name}</h2>
        <p>Add and manage your exercises in this folder</p>
      </div>
      {error && <div className="error-message">{error}</div>}
      <div className="workouts-section">
        <h3>Add New Workout</h3>
        <form onSubmit={addWorkout} className="add-workout-form">
          <input
            type="text"
            value={newWorkout.name}
            onChange={e => setNewWorkout({ ...newWorkout, name: e.target.value })}
            placeholder="Workout name"
          />
          <input
            type="number"
            value={newWorkout.reps}
            onChange={e => setNewWorkout({ ...newWorkout, reps: e.target.value })}
            placeholder="Reps"
          />
          <input
            type="number"
            value={newWorkout.weight}
            onChange={e => setNewWorkout({ ...newWorkout, weight: e.target.value })}
            placeholder="Weight (kg)"
          />
          <button type="submit">Add Workout</button>
        </form>
        
        <h3>Your Workouts ({workouts.length})</h3>
        <ul className="workouts-list">
          {workouts
            .sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0))
            .map(w => (
            <li key={w.id}>
              <button onClick={() => toggleStarWorkout(w.id)} className="star-workout-btn">
                {w.starred ? '★' : '☆'}
              </button>
              {editingWorkoutId === w.id ? (
                <>
                  <input
                    type="text"
                    value={editingWorkout.name}
                    onChange={e => setEditingWorkout({ ...editingWorkout, name: e.target.value })}
                    className="edit-workout-input"
                    placeholder="Workout name"
                  />
                  <input
                    type="number"
                    value={editingWorkout.reps}
                    onChange={e => setEditingWorkout({ ...editingWorkout, reps: e.target.value })}
                    className="edit-workout-input"
                    placeholder="Reps"
                  />
                  <input
                    type="number"
                    value={editingWorkout.weight}
                    onChange={e => setEditingWorkout({ ...editingWorkout, weight: e.target.value })}
                    className="edit-workout-input"
                    placeholder="Weight (kg)"
                  />
                  <button onClick={() => saveEditWorkout(w.id)} className="save-workout-btn">💾</button>
                  <button onClick={cancelEditWorkout} className="cancel-workout-btn">✖️</button>
                </>
              ) : (
                <>
                  <span className="workout-info">{w.name} - {w.reps} reps @ {w.weight} kg</span>
                  <button onClick={() => startEditWorkout(w)} className="edit-workout-btn">✏️</button>
                  <button onClick={() => deleteWorkout(w.id)} className="delete-workout-btn">🗑️</button>
                </>
              )}
            </li>
          ))}
        </ul>
        {workouts.length === 0 && (
          <div className="empty-state">
            <p>No workouts yet. Add your first workout above!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FolderWorkouts; 