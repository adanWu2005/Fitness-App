import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Workouts.css';

const LOCAL_STORAGE_FOLDERS_KEY = 'workoutFolders';

const Workouts = ({ user }) => {
  const [folders, setFolders] = useState([]);
  const [newFolder, setNewFolder] = useState('');
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [newWorkout, setNewWorkout] = useState({ name: '', reps: '', weight: '' });
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editingFolderName, setEditingFolderName] = useState('');

  useEffect(() => {
    if (user) {
      loadFolders();
    }
    // eslint-disable-next-line
  }, [user]);

  const getFoldersKey = () => LOCAL_STORAGE_FOLDERS_KEY + '_' + user.id;

  const loadFolders = () => {
    try {
      const stored = localStorage.getItem(getFoldersKey());
      setFolders(stored ? JSON.parse(stored) : []);
    } catch (err) {
      setError('Failed to load folders');
    }
  };

  const saveFolders = (foldersToSave) => {
    setFolders(foldersToSave);
    localStorage.setItem(getFoldersKey(), JSON.stringify(foldersToSave));
  };

  const createFolder = (e) => {
    e.preventDefault();
    if (!newFolder.trim()) return;
    const id = Date.now().toString();
    const newFolderData = { id, name: newFolder, starred: false };
    const updated = [...folders, newFolderData];
    saveFolders(updated);
    setNewFolder('');
  };

  const deleteFolder = (folderId) => {
    const updated = folders.filter(f => f.id !== folderId);
    saveFolders(updated);
  };

  const startEditFolder = (folder) => {
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
  };
  const cancelEditFolder = () => {
    setEditingFolderId(null);
    setEditingFolderName('');
  };
  const saveEditFolder = (folderId) => {
    const updated = folders.map(f => f.id === folderId ? { ...f, name: editingFolderName } : f);
    saveFolders(updated);
    cancelEditFolder();
  };

  const toggleStarFolder = (folderId) => {
    const updated = folders.map(f => f.id === folderId ? { ...f, starred: !f.starred } : f);
    // Starred folders first
    const sorted = [...updated.filter(f => f.starred), ...updated.filter(f => !f.starred)];
    saveFolders(sorted);
  };

  const selectFolder = (folder) => {
    navigate(`/workouts/${encodeURIComponent(folder.name)}`);
  };

  return (
    <div className="workouts-page">
      <div className="workouts-header">
        <button onClick={() => navigate(-1)} className="back-btn">
          ←
        </button>
        <h2>🏋️‍♂️ Workouts</h2>
        <p>Manage your workout folders and exercises</p>
      </div>
      {error && <div className="error-message">{error}</div>}
      <div className="folders-section">
        <h3>Body Part Folders</h3>
        <form onSubmit={createFolder} className="add-folder-form">
          <input
            type="text"
            value={newFolder}
            onChange={e => setNewFolder(e.target.value)}
            placeholder="Add new body part folder"
          />
          <button type="submit">Add Folder</button>
        </form>
        <ul className="folders-list">
          {folders
            .sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0))
            .map(folder => (
            <li key={folder.id}>
              <button onClick={() => toggleStarFolder(folder.id)} className="star-folder-btn">
                {folder.starred ? '★' : '☆'}
              </button>
              {editingFolderId === folder.id ? (
                <>
                  <input
                    type="text"
                    value={editingFolderName}
                    onChange={e => setEditingFolderName(e.target.value)}
                    className="edit-folder-input"
                  />
                  <button onClick={() => saveEditFolder(folder.id)} className="save-folder-btn">💾</button>
                  <button onClick={cancelEditFolder} className="cancel-folder-btn">✖️</button>
                </>
              ) : (
                <>
                  <button onClick={() => selectFolder(folder)} className="folder-btn">
                    {folder.name}
                  </button>
                  <button onClick={() => startEditFolder(folder)} className="edit-folder-btn">✏️</button>
                  <button onClick={() => deleteFolder(folder.id)} className="delete-folder-btn">🗑️</button>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
      {/* Remove selectedFolder and workouts UI from this page */}
    </div>
  );
};

export default Workouts; 