import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Meals.css';

const LOCAL_STORAGE_FOLDERS_KEY = 'mealFolders';

const FolderMeals = ({ user }) => {
  const { folderName } = useParams();
  const [folder, setFolder] = useState(null);
  const [meals, setMeals] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [editingMealId, setEditingMealId] = useState(null);
  const [editingMeal, setEditingMeal] = useState({ quantity: '' });
  const [quantityError, setQuantityError] = useState('');

  // Helper to get meals key for localStorage
  const getMealsKey = (folderId) => `folderMeals_${user.id}_${folderId}`;

  useEffect(() => {
    if (user) loadFolderAndMeals();
    // eslint-disable-next-line
  }, [user, folderName]);

  const loadFolderAndMeals = () => {
    try {
      const folders = JSON.parse(localStorage.getItem(LOCAL_STORAGE_FOLDERS_KEY + '_' + user.id)) || [];
      const found = folders.find(f => f.name === folderName);
      setFolder(found);
      if (found) {
        const storedMeals = localStorage.getItem(getMealsKey(found.id));
        setMeals(storedMeals ? JSON.parse(storedMeals) : []);
      } else {
        setMeals([]);
      }
    } catch (err) {
      setError('Failed to load folder or meals');
    }
  };

  const saveMeals = (folderId, mealsToSave) => {
    setMeals(mealsToSave);
    localStorage.setItem(getMealsKey(folderId), JSON.stringify(mealsToSave));
  };

  const calculateTotalNutrition = () => {
    if (!meals || meals.length === 0) return null;
    return meals.reduce((totals, meal) => {
      if (meal.nutrition) {
        totals.calories += meal.nutrition.calories || 0;
        totals.protein += meal.nutrition.protein || 0;
        totals.carbs += meal.nutrition.carbs || 0;
        totals.fat += meal.nutrition.fat || 0;
      }
      return totals;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  };

  const deleteMeal = (mealId) => {
    const updated = meals.filter(m => m.id !== mealId);
    saveMeals(folder.id, updated);
  };

  const startEditMeal = (meal) => {
    setEditingMealId(meal.id);
    setEditingMeal({ quantity: meal.quantity });
    setQuantityError('');
  };

  const cancelEditMeal = () => {
    setEditingMealId(null);
    setEditingMeal({ quantity: '' });
    setQuantityError('');
  };

  const validateQuantity = (quantity) => {
    const numQuantity = parseFloat(quantity);
    if (isNaN(numQuantity) || numQuantity <= 0) {
      return 'Quantity must be greater than 0';
    }
    return '';
  };

  const handleQuantityChange = (e) => {
    const newQuantity = e.target.value;
    setEditingMeal({ quantity: newQuantity });
    setQuantityError(validateQuantity(newQuantity));
  };

  const saveEditMeal = (mealId) => {
    const error = validateQuantity(editingMeal.quantity);
    if (error) {
      setQuantityError(error);
      return;
    }
    const updated = meals.map(m => {
      if (m.id === mealId) {
        const qty = parseFloat(editingMeal.quantity);
        let nutrition = m.nutrition;
        if (m.nutritionPerUnit) {
          nutrition = {
            calories: (m.nutritionPerUnit.calories || 0) * qty,
            protein: (m.nutritionPerUnit.protein || 0) * qty,
            carbs: (m.nutritionPerUnit.carbs || 0) * qty,
            fat: (m.nutritionPerUnit.fat || 0) * qty,
            fiber: (m.nutritionPerUnit.fiber || 0) * qty
          };
        }
        return { ...m, quantity: editingMeal.quantity, nutrition };
      }
      return m;
    });
    saveMeals(folder.id, updated);
    cancelEditMeal();
  };

  const toggleStarMeal = (mealId) => {
    const updated = meals.map(m => m.id === mealId ? { ...m, starred: !m.starred } : m);
    // Starred meals first
    const sorted = [...updated.filter(m => m.starred), ...updated.filter(m => !m.starred)];
    saveMeals(folder.id, sorted);
  };

  const addMealFromFoodRecognition = () => {
    // Navigate to food recognition with folder context
    navigate('/food', { state: { targetFolder: folder } });
  };

  if (!folder) {
    return (
      <div className="folder-meals-page">
        <div className="meals-header">
          <button onClick={() => navigate('/meals')} className="back-btn">
            ←
          </button>
          <h2>❌ Folder Not Found</h2>
          <p>Could not find folder: {folderName}</p>
        </div>
        {error && <div className="error-message">{error}</div>}
      </div>
    );
  }

  return (
    <div className="folder-meals-page">
      <div className="meals-header">
        <button onClick={() => navigate('/meals')} className="back-btn">
          ←
        </button>
        <h2>🍽️ {folder.name} folder</h2>
        <p>Track and manage the food(s) you ate for {folder.name.toLowerCase()}</p>
      </div>
      {error && <div className="error-message">{error}</div>}
      <div className="meals-section">
        <div className="add-meal-section">
          <h3>Add Food</h3>
          <button onClick={addMealFromFoodRecognition} className="add-meal-btn">
            📷 Analyze Food & Add to {folder.name}
          </button>
          <p className="add-meal-hint">
            Use food recognition to analyze food and add it to this folder
          </p>
        </div>
        {meals.length > 0 && (
          <div className="total-nutrition-summary">
            <h4>Total Nutrition</h4>
            <div className="total-nutrition-items">
              {(() => {
                const totals = calculateTotalNutrition();
                if (!totals) return null;
                return (
                  <>
                    <span className="total-nutrition-item">
                      {totals.calories?.toFixed(0) || 0} cal
                    </span>
                    <span className="total-nutrition-item">
                      {totals.protein?.toFixed(1) || 0}g protein
                    </span>
                    <span className="total-nutrition-item">
                      {totals.carbs?.toFixed(1) || 0}g carbs
                    </span>
                    <span className="total-nutrition-item">
                      {totals.fat?.toFixed(1) || 0}g fat
                    </span>
                  </>
                );
              })()}
            </div>
          </div>
        )}
        <h3>Your Meals ({meals.length})</h3>
        <ul className="meals-list">
          {meals
            .sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0))
            .map(meal => (
            <li key={meal.id} className="meal-item">
              <button onClick={() => toggleStarMeal(meal.id)} className="star-meal-btn">
                {meal.starred ? '★' : '☆'}
              </button>
              {editingMealId === meal.id ? (
                <>
                  <div className="meal-content">
                    <div className="meal-info">
                      <span className="meal-name">{meal.name}</span>
                      <div className="edit-quantity-section">
                        <label>Quantity:</label>
                        <input
                          type="number"
                          value={editingMeal.quantity}
                          onChange={handleQuantityChange}
                          className={`edit-meal-input ${quantityError ? 'error' : ''}`}
                          placeholder="Quantity"
                          min="0.1"
                          step="0.1"
                        />
                        <span className="quantity-unit">piece(s)</span>
                      </div>
                      {quantityError && <div className="quantity-error">{quantityError}</div>}
                    </div>
                    {meal.nutrition && (
                      <div className="meal-nutrition">
                        <span className="nutrition-item">
                          {meal.nutrition.calories?.toFixed(0) || 0} cal
                        </span>
                        <span className="nutrition-item">
                          {meal.nutrition.protein?.toFixed(1) || 0}g protein
                        </span>
                        <span className="nutrition-item">
                          {meal.nutrition.carbs?.toFixed(1) || 0}g carbs
                        </span>
                        <span className="nutrition-item">
                          {meal.nutrition.fat?.toFixed(1) || 0}g fat
                        </span>
                      </div>
                    )}
                    <div className="meal-date">
                      {new Date(meal.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="edit-actions">
                    <button onClick={() => saveEditMeal(meal.id)} className="save-meal-btn">💾</button>
                    <button onClick={cancelEditMeal} className="cancel-meal-btn">✖️</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="meal-content">
                    <div className="meal-info">
                      <span className="meal-name">{meal.name}</span>
                      <span className="meal-quantity">{meal.quantity} piece(s)</span>
                    </div>
                    {meal.nutrition && (
                      <div className="meal-nutrition">
                        <span className="nutrition-item">
                          {meal.nutrition.calories?.toFixed(0) || 0} cal
                        </span>
                        <span className="nutrition-item">
                          {meal.nutrition.protein?.toFixed(1) || 0}g protein
                        </span>
                        <span className="nutrition-item">
                          {meal.nutrition.carbs?.toFixed(1) || 0}g carbs
                        </span>
                        <span className="nutrition-item">
                          {meal.nutrition.fat?.toFixed(1) || 0}g fat
                        </span>
                      </div>
                    )}
                    <div className="meal-date">
                      {new Date(meal.date).toLocaleDateString()}
                    </div>
                  </div>
                  <button onClick={() => startEditMeal(meal)} className="edit-meal-btn">✏️</button>
                  <button onClick={() => deleteMeal(meal.id)} className="delete-meal-btn">🗑️</button>
                </>
              )}
            </li>
          ))}
        </ul>
        {meals.length === 0 && (
          <div className="empty-state">
            <p>No meals yet. Add your first meal using food recognition above!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FolderMeals; 