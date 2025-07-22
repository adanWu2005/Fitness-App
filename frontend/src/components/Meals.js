import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Meals.css';

const LOCAL_STORAGE_FOLDERS_KEY = 'mealFolders';

const Meals = ({ user }) => {
  const [folders, setFolders] = useState([]);
  const [newFolder, setNewFolder] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editingFolder, setEditingFolder] = useState('');

  useEffect(() => {
    if (user) {
      loadFolders();
    }
    // eslint-disable-next-line
  }, [user]);

  const loadFolders = () => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_FOLDERS_KEY + '_' + user.id);
      setFolders(stored ? JSON.parse(stored) : []);
    } catch (err) {
      setError('Failed to load meal folders');
    }
  };

  const saveFolders = (foldersToSave) => {
    setFolders(foldersToSave);
    localStorage.setItem(LOCAL_STORAGE_FOLDERS_KEY + '_' + user.id, JSON.stringify(foldersToSave));
  };

  const addFolder = (e) => {
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
    // Remove meals for the deleted folder
    localStorage.removeItem('folderMeals_' + user.id + '_' + folderId);
  };

  const startEditFolder = (folder) => {
    setEditingFolderId(folder.id);
    setEditingFolder(folder.name);
  };

  const cancelEditFolder = () => {
    setEditingFolderId(null);
    setEditingFolder('');
  };

  const saveEditFolder = (folderId) => {
    const updated = folders.map(f => f.id === folderId ? { ...f, name: editingFolder } : f);
    saveFolders(updated);
    cancelEditFolder();
  };

  const toggleStarFolder = (folderId) => {
    const updated = folders.map(f => f.id === folderId ? { ...f, starred: !f.starred } : f);
    // Starred folders first
    const sorted = [...updated.filter(f => f.starred), ...updated.filter(f => !f.starred)];
    saveFolders(sorted);
  };

  // Helper to get meals key for localStorage
  const getMealsKey = (folderId) => `folderMeals_${user.id}_${folderId}`;

  // Calculate total nutrition for all meals in all folders
  const calculateAllFoldersNutrition = () => {
    let totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    folders.forEach(folder => {
      const storedMeals = localStorage.getItem(getMealsKey(folder.id));
      const meals = storedMeals ? JSON.parse(storedMeals) : [];
      meals.forEach(meal => {
        if (meal.nutrition) {
          totals.calories += meal.nutrition.calories || 0;
          totals.protein += meal.nutrition.protein || 0;
          totals.carbs += meal.nutrition.carbs || 0;
          totals.fat += meal.nutrition.fat || 0;
        }
      });
    });
    return totals;
  };

  // Helper to clear all meal folders and their meals
  const clearAllMealFolders = () => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_FOLDERS_KEY + '_' + user.id);
      const folders = stored ? JSON.parse(stored) : [];
      // Remove all meals for each folder
      folders.forEach(folder => {
        localStorage.removeItem('folderMeals_' + user.id + '_' + folder.id);
      });
      // Remove the folders list
      localStorage.removeItem(LOCAL_STORAGE_FOLDERS_KEY + '_' + user.id);
      setFolders([]);
    } catch (err) {
      setError('Failed to clear meal folders');
    }
  };

  // Helper to get the next midnight timestamp
  const getNextMidnight = () => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 0, 0); // set to next midnight
    return next.getTime();
  };

  useEffect(() => {
    if (!user) return;
    // Check if we already reset today
    const lastResetKey = 'mealFoldersLastReset_' + user.id;
    const today = new Date().toDateString();
    const lastReset = localStorage.getItem(lastResetKey);
    if (lastReset !== today) {
      clearAllMealFolders();
      localStorage.setItem(lastResetKey, today);
    }
    // Set timer for next midnight
    const now = Date.now();
    const msToMidnight = getNextMidnight() - now;
    const timer = setTimeout(() => {
      clearAllMealFolders();
      localStorage.setItem(lastResetKey, new Date().toDateString());
    }, msToMidnight);
    return () => clearTimeout(timer);
  }, [user]);

  return (
    <div className="meals-page">
      <div className="meals-header">
        <button onClick={() => navigate('/')} className="back-btn">
          ←
        </button>
        <h2>🍽️ Meal Management</h2>
        <p>Organize your meals into folders for better tracking</p>
      </div>
      {error && <div className="error-message">{error}</div>}
      <div className="meals-section">
        <h3>Create New Meal Folder</h3>
        <form onSubmit={addFolder} className="add-folder-form">
          <input
            type="text"
            value={newFolder}
            onChange={e => setNewFolder(e.target.value)}
            placeholder="Meal folder name (e.g., Breakfast, Lunch, Dinner)"
          />
          <button type="submit">Add Folder</button>
        </form>

        {/* Total Nutrition Summary for All Folders */}
        {folders.length > 0 && (
          <div style={{ margin: '32px 0' }}>
            <div style={{
              background: 'linear-gradient(135deg, #7f53ac 0%, #647dee 100%)',
              borderRadius: '20px',
              padding: '24px 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: '0 8px 32px rgba(100, 125, 222, 0.12)',
              color: 'white',
              fontWeight: 600,
              fontSize: '1.1rem',
              flexWrap: 'wrap',
            }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8, color: 'white', textAlign: 'center', letterSpacing: '0.5px' }}>
                Total nutrition today
              </div>
              <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {(() => {
                  const totals = calculateAllFoldersNutrition();
                  return (
                    <>
                      <span style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '16px', padding: '10px 22px', margin: '0 4px' }}>{Math.round(totals.calories)} cal</span>
                      <span style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '16px', padding: '10px 22px', margin: '0 4px' }}>{totals.protein.toFixed(1)}g protein</span>
                      <span style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '16px', padding: '10px 22px', margin: '0 4px' }}>{totals.carbs.toFixed(1)}g carbs</span>
                      <span style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '16px', padding: '10px 22px', margin: '0 4px' }}>{totals.fat.toFixed(1)}g fat</span>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
        <h3>Your Meal Folders ({folders.length})</h3>
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
                    value={editingFolder}
                    onChange={e => setEditingFolder(e.target.value)}
                    className="edit-folder-input"
                    placeholder="Folder name"
                  />
                  <button onClick={() => saveEditFolder(folder.id)} className="save-folder-btn">💾</button>
                  <button onClick={cancelEditFolder} className="cancel-folder-btn">✖️</button>
                </>
              ) : (
                <>
                  <button onClick={() => navigate(`/meals/${folder.name}`)} className="folder-btn">
                    {folder.name}
                  </button>
                  <button onClick={() => startEditFolder(folder)} className="edit-folder-btn">✏️</button>
                  <button onClick={() => deleteFolder(folder.id)} className="delete-folder-btn">🗑️</button>
                </>
              )}
            </li>
          ))}
        </ul>
        {folders.length === 0 && (
          <div className="empty-state">
            <p>No meal folders yet. Create your first folder above!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Meals; 