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

  // Responsive styles
  const containerStyle = {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: '40px',
    position: 'relative',
    color: 'white'
  };

  const backButtonStyle = {
    position: 'absolute',
    left: '0',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'rgba(255, 255, 255, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    padding: '12px 24px',
    borderRadius: '25px',
    cursor: 'pointer',
    fontSize: '14px',
    color: 'white',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
    fontWeight: '500'
  };

  const titleStyle = {
    fontSize: '3rem',
    fontWeight: '800',
    margin: '0 0 15px 0',
    color: 'white',
    textShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    letterSpacing: '-0.5px'
  };

  const subtitleStyle = {
    fontSize: '1.2rem',
    color: 'rgba(255, 255, 255, 0.9)',
    margin: '0',
    fontWeight: '400',
    lineHeight: '1.5'
  };

  const sectionStyle = {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '25px',
    padding: '40px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    marginBottom: '30px'
  };

  const sectionTitleStyle = {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#2c3e50',
    margin: '0 0 20px 0',
    letterSpacing: '-0.5px'
  };

  const formStyle = {
    display: 'flex',
    gap: '12px',
    marginBottom: '25px',
    padding: '15px',
    flexWrap: 'wrap'
  };

  const inputStyle = {
    flex: '1 1 120px',
    minWidth: '0',
    boxSizing: 'border-box',
    padding: '12px 16px',
    border: '2px solid #e9ecef',
    borderRadius: '12px',
    fontSize: '16px',
    transition: 'all 0.3s ease',
    background: 'white',
    height: '48px',
    lineHeight: '1'
  };

  const buttonStyle = {
    flex: '0 0 auto',
    minWidth: '120px',
    whiteSpace: 'nowrap',
    background: 'linear-gradient(135deg, #007bff, #0056b3)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 25px rgba(0, 123, 255, 0.3)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    height: '48px',
    lineHeight: '1'
  };

  const inputFocusStyle = {
    outline: 'none',
    borderColor: '#007bff',
    boxShadow: '0 0 0 3px rgba(0, 123, 255, 0.1)'
  };

  const buttonHoverStyle = {
    background: 'linear-gradient(135deg, #0056b3, #004085)',
    transform: 'translateY(-2px)',
    boxShadow: '0 12px 35px rgba(0, 123, 255, 0.4)'
  };

  // Mobile responsive styles
  const mobileFormStyle = {
    ...formStyle,
    flexDirection: 'column',
    gap: '12px',
    padding: '10px'
  };

  const mobileInputStyle = {
    ...inputStyle,
    width: '100%',
    minWidth: '0',
    padding: '8px 10px',
    fontSize: '13px',
    height: '44px'
  };

  const mobileButtonStyle = {
    ...buttonStyle,
    width: '100%',
    minWidth: '0',
    padding: '8px 10px',
    fontSize: '13px',
    height: '44px',
    textTransform: 'none',
    letterSpacing: 'normal'
  };

  const smallMobileInputStyle = {
    ...mobileInputStyle,
    fontSize: '0.95rem',
    padding: '6px 8px',
    height: '40px'
  };

  const smallMobileButtonStyle = {
    ...mobileButtonStyle,
    fontSize: '0.95rem',
    padding: '6px 8px',
    height: '40px'
  };

  // Check if mobile
  const isMobile = window.innerWidth <= 768;
  const isSmallMobile = window.innerWidth <= 480;

  const getFormStyle = () => {
    if (isSmallMobile) return mobileFormStyle;
    if (isMobile) return mobileFormStyle;
    return formStyle;
  };

  const getInputStyle = () => {
    if (isSmallMobile) return smallMobileInputStyle;
    if (isMobile) return mobileInputStyle;
    return inputStyle;
  };

  const getButtonStyle = () => {
    if (isSmallMobile) return smallMobileButtonStyle;
    if (isMobile) return mobileButtonStyle;
    return buttonStyle;
  };

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
      <div style={containerStyle}>
        <div style={headerStyle}>
          <button onClick={() => navigate(-1)} style={backButtonStyle}>
            ← Back to Workouts
          </button>
          <h2 style={titleStyle}>❌ Folder Not Found</h2>
          <p style={subtitleStyle}>Could not find folder: {folderName}</p>
        </div>
        {error && <div className="error-message">{error}</div>}
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {isMobile && (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', marginBottom: 10 }}>
          <button onClick={() => navigate(-1)} style={{ ...backButtonStyle, position: 'static', transform: 'none', marginBottom: 0, marginLeft: 0, alignSelf: 'flex-start' }}>
            ←
          </button>
        </div>
      )}
      <div style={headerStyle}>
        <h2 style={titleStyle}>
          {!isMobile && (
            <button onClick={() => navigate(-1)} style={backButtonStyle}>
              ←
            </button>
          )}
          💪 Workouts for {folder.name}
        </h2>
        <p style={subtitleStyle}>Add and manage your exercises in this folder</p>
      </div>
      {error && <div className="error-message">{error}</div>}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Add New Workout</h3>
        <form onSubmit={addWorkout} style={getFormStyle()}>
          <input
            type="text"
            value={newWorkout.name}
            onChange={e => setNewWorkout({ ...newWorkout, name: e.target.value })}
            placeholder="Workout name"
            style={getInputStyle()}
            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={(e) => {
              e.target.style.outline = '';
              e.target.style.borderColor = '#e9ecef';
              e.target.style.boxShadow = '';
            }}
          />
          <input
            type="number"
            value={newWorkout.reps}
            onChange={e => setNewWorkout({ ...newWorkout, reps: e.target.value })}
            placeholder="Reps"
            style={{
              ...getInputStyle(),
              WebkitAppearance: 'none',
              MozAppearance: 'textfield',
              appearance: 'textfield'
            }}
            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={(e) => {
              e.target.style.outline = '';
              e.target.style.borderColor = '#e9ecef';
              e.target.style.boxShadow = '';
            }}
          />
          <input
            type="number"
            value={newWorkout.weight}
            onChange={e => setNewWorkout({ ...newWorkout, weight: e.target.value })}
            placeholder="Weight (kg)"
            style={{
              ...getInputStyle(),
              WebkitAppearance: 'none',
              MozAppearance: 'textfield',
              appearance: 'textfield'
            }}
            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={(e) => {
              e.target.style.outline = '';
              e.target.style.borderColor = '#e9ecef';
              e.target.style.boxShadow = '';
            }}
          />
          <button 
            type="submit" 
            style={getButtonStyle()}
            onMouseEnter={(e) => Object.assign(e.target.style, buttonHoverStyle)}
            onMouseLeave={(e) => {
              e.target.style.background = 'linear-gradient(135deg, #007bff, #0056b3)';
              e.target.style.transform = '';
              e.target.style.boxShadow = '0 8px 25px rgba(0, 123, 255, 0.3)';
            }}
          >
            Add Workout
          </button>
        </form>
        
        <h3 style={sectionTitleStyle}>Your Workouts ({workouts.length})</h3>
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