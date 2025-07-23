import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './FoodRecognition.css';
import { API_BASE_URL } from '../services/api';

const FoodRecognition = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentFile, setCurrentFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [foodDescription, setFoodDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [quantityError, setQuantityError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [descriptionFeedback, setDescriptionFeedback] = useState(null);
  const [showFolderSelector, setShowFolderSelector] = useState(false);
  const [availableFolders, setAvailableFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [isAddingToFolder, setIsAddingToFolder] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const fileInputRef = useRef(null);

  // Check if we have a target folder from navigation state
  const targetFolder = location.state?.targetFolder;

  // Check if screen is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle clicking outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest('.custom-dropdown')) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const validateQuantity = (quantity) => {
    const numQuantity = parseFloat(quantity);
    if (isNaN(numQuantity) || numQuantity <= 0) {
      return 'Quantity must be greater than 0';
    }
    return '';
  };

  const handleQuantityChange = (e) => {
    const newQuantity = e.target.value;
    setQuantity(newQuantity);
    setQuantityError(validateQuantity(newQuantity));
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file.');
        return;
      }
      
      setCurrentFile(file);
      setError(null);
      setResults(null);
      setDescriptionFeedback(null);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        setCurrentFile(file);
        setError(null);
        setResults(null);
        setDescriptionFeedback(null);
        
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target.result);
        };
        reader.readAsDataURL(file);
      } else {
        setError('Please select an image file.');
      }
    }
  };

  const analyzeFood = async () => {
    if (!currentFile) {
      setError('Please select an image first.');
      return;
    }

    // Validate quantity before proceeding
    const quantityValidationError = validateQuantity(quantity);
    if (quantityValidationError) {
      setQuantityError(quantityValidationError);
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults(null);
    setDescriptionFeedback(null);
    setQuantityError('');

    try {
      const formData = new FormData();
      formData.append('image', currentFile);
      if (foodDescription.trim()) {
        formData.append('description', foodDescription.trim());
      }
      formData.append('quantity', quantity);

      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/food/analyze`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
        body: formData
      });

      let responseBody = null;
      let data = null;
      if (!response.ok) {
        // Try to parse error JSON, or fallback to text
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          responseBody = await response.text();
          data = responseBody ? JSON.parse(responseBody) : null;
          if (data && data.error) errorMsg = data.error;
        } catch {
          if (responseBody) errorMsg = responseBody;
        }
        throw new Error(errorMsg);
      }

      // Only try to parse JSON if there is content
      responseBody = await response.text();
      if (!responseBody) throw new Error('Empty response from server');
      try {
        data = JSON.parse(responseBody);
      } catch (e) {
        throw new Error('Invalid JSON response from server');
      }

      if (data.success) {
        setResults(data);
        // Set description feedback
        if (data.userDescription) {
          setDescriptionFeedback({
            helped: data.descriptionHelped,
            message: data.descriptionHelped 
              ? 'Your description helped improve recognition accuracy!'
              : 'Your description didn\'t match well with the detected foods.'
          });
        }
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setError(`Analysis failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const resetAnalysis = () => {
    setCurrentFile(null);
    setImagePreview('');
    setFoodDescription('');
    setQuantity(1);
    setQuantityError('');
    setResults(null);
    setError(null);
    setDescriptionFeedback(null);
    setShowFolderSelector(false);
    setSelectedFolder('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const capitalizeFirst = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const LOCAL_STORAGE_FOLDERS_KEY = 'mealFolders';

  const fetchMealFolders = async () => {
    try {
      if (!user) {
        setError('Please connect your account first to save meals.');
        return;
      }
      // Load folders from localStorage
      const stored = localStorage.getItem(LOCAL_STORAGE_FOLDERS_KEY + '_' + user.id);
      const folders = stored ? JSON.parse(stored) : [];
      setAvailableFolders(folders);
      setShowFolderSelector(true);
    } catch (error) {
      setError('Failed to load meal folders');
    }
  };

  const addToMealFolder = async () => {
    if (!selectedFolder) {
      setError('Please select a meal folder');
      return;
    }

    if (!user) {
      setError('Please connect your account first to save meals.');
      return;
    }

    setIsAddingToFolder(true);
    try {
      const folder = availableFolders.find(f => f.id === selectedFolder);
      if (!folder) {
        throw new Error('Selected folder not found');
      }

      // Create meal data
      const perUnitNutrition = results.nutrition.totalNutrition;
      const qty = parseFloat(quantity);
      const mealData = {
        id: Date.now().toString(),
        name: results.nutrition.detailedNutrition[0]?.name || 'Analyzed Food',
        nutritionPerUnit: perUnitNutrition,
        nutrition: {
          calories: (perUnitNutrition.calories || 0) * qty,
          protein: (perUnitNutrition.protein || 0) * qty,
          carbs: (perUnitNutrition.carbs || 0) * qty,
          fat: (perUnitNutrition.fat || 0) * qty,
          fiber: (perUnitNutrition.fiber || 0) * qty
        },
        image: imagePreview,
        description: foodDescription,
        quantity: qty
      };

      // Save meal to localStorage for the folder
      const mealsKey = `folderMeals_${user.id}_${folder.id}`;
      const storedMeals = localStorage.getItem(mealsKey);
      const meals = storedMeals ? JSON.parse(storedMeals) : [];
      meals.push(mealData);
      localStorage.setItem(mealsKey, JSON.stringify(meals));

      // Navigate to the meal folder
      navigate(`/meals/${folder.name}`);
    } catch (error) {
      setError(`Failed to add meal: ${error.message}`);
    } finally {
      setIsAddingToFolder(false);
    }
  };

  return (
    <div className="food-recognition">
      <div className="food-header">
        <button className="back-btn" onClick={() => navigate('/meals')}>
          ←
        </button>
        <h1>🍽️ Food Recognition</h1>
        <p>Upload a food image to identify ingredients and get nutritional information</p>
      </div>

      <div className="food-content">
        {!imagePreview && !isLoading && !results && (
          <div className="upload-section">
            <div 
              className="upload-area"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="upload-content">
                <div className="upload-icon">📷</div>
                <h3>Upload Food Image</h3>
                <p>Drag and drop an image here or click to browse</p>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept="image/*" 
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <button className="upload-btn">
                  Choose File
                </button>
              </div>
            </div>
          </div>
        )}

        {imagePreview && !isLoading && !results && (
          <div className="preview-section">
            <div className="preview-container">
              <img src={imagePreview} alt="Food preview" className="preview-image" />
              
              <div className="input-section">
                <div className="description-section">
                  <label htmlFor="foodDescription" className="input-label">
                    📝 Describe the food (optional)
                  </label>
                  <textarea 
                    id="foodDescription"
                    value={foodDescription}
                    onChange={(e) => setFoodDescription(e.target.value)}
                    placeholder="e.g., 'Ground beef, Chicken, Steak' Do not describe full meals, just single food items"
                    rows="3"
                    className="description-input"
                  />
                  <p className="input-hint">
                    💡 Adding a description helps improve recognition accuracy by matching your description with AI-detected labels.
                  </p>
                </div>
                
                <div className="quantity-section">
                  <label htmlFor="quantityInput" className="input-label">
                    ⚖️ Quantity of Food
                  </label>
                  <div className="quantity-input-container">
                    <input 
                      type="number" 
                      id="quantityInput"
                      value={quantity}
                      onChange={handleQuantityChange}
                      min="0.1" 
                      max="100" 
                      step="0.1"
                      className={`quantity-input ${quantityError ? 'error' : ''}`}
                    />
                    <span className="quantity-unit">pieces</span>
                  </div>
                  {quantityError && <div className="quantity-error">{quantityError}</div>}
                  <p className="input-hint">
                    ℹ️ Adjust the quantity to get accurate nutrition information for your portion size.
                  </p>
                </div>
                
                <button className="analyze-btn" onClick={analyzeFood}>
                  🔍 Analyze Food
                </button>
              </div>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="loading-section">
            <div className="loading-spinner"></div>
            <h3>Analyzing your food...</h3>
            <p>Identifying ingredients and calculating nutrition</p>
          </div>
        )}

        {error && (
          <div className="error-section">
            <div className="error-content">
              <div className="error-icon">⚠️</div>
              <h3>Analysis Failed</h3>
              <p>{error}</p>
              <button className="retry-btn" onClick={resetAnalysis}>
                Try Again
              </button>
            </div>
          </div>
        )}

        {results && (
          <div className="results-section">
            <div className="results-header">
              <h2>📊 Analysis Results</h2>
              <div className="results-actions">
                <button className="add-to-meal-btn" onClick={fetchMealFolders}>
                  📁 Add to Meal Folder
                </button>
                <button className="new-analysis-btn" onClick={resetAnalysis}>
                  ➕ New Analysis
                </button>
              </div>
            </div>

            {descriptionFeedback && (
              <div className={`description-feedback ${descriptionFeedback.helped ? 'success' : 'warning'}`}>
                <div className="feedback-icon">
                  {descriptionFeedback.helped ? '✅' : '⚠️'}
                </div>
                <span>{descriptionFeedback.message}</span>
              </div>
            )}

            {showFolderSelector && (
              <div className="folder-selector">
                <h3>Select a Meal Folder</h3>
                <div className="folder-selector-content">
                  <div className="custom-dropdown">
                    <div 
                      className="dropdown-input"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                      <span className={selectedFolder ? 'selected-value' : 'placeholder'}>
                        {selectedFolder 
                          ? availableFolders.find(f => f.id === selectedFolder)?.name 
                          : 'Choose a folder...'
                        }
                      </span>
                      <span className="dropdown-arrow">▼</span>
                    </div>
                    {isDropdownOpen && (
                      <div className="dropdown-options">
                        <div 
                          className="dropdown-option"
                          onClick={() => {
                            setSelectedFolder('');
                            setIsDropdownOpen(false);
                          }}
                        >
                          Choose a folder...
                        </div>
                        {availableFolders.map(folder => (
                          <div 
                            key={folder.id} 
                            className={`dropdown-option ${selectedFolder === folder.id ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedFolder(folder.id);
                              setIsDropdownOpen(false);
                            }}
                          >
                            {folder.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="folder-selector-actions">
                    <button 
                      className="add-to-folder-btn" 
                      onClick={addToMealFolder}
                      disabled={!selectedFolder || isAddingToFolder}
                    >
                      {isAddingToFolder ? 'Adding...' : 'Add to Folder'}
                    </button>
                    <button 
                      className="cancel-folder-selector-btn" 
                      onClick={() => setShowFolderSelector(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="results-grid">
              <div className="food-items">
                <h3>Recognized Food Items</h3>
                <div className="food-list">
                  {results.nutrition.detailedNutrition.map((food, index) => (
                    <div key={index} className="food-item">
                      <div className="food-item-header">
                        <div className="food-name">{capitalizeFirst(food.name)}</div>
                        <div className="confidence-badge">
                          {(food.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                      
                      <div className="ingredients-list">
                        <h5>Ingredients</h5>
                        <div className="ingredients">
                          {food.ingredients.map((ingredient, idx) => (
                            <span key={idx} className="ingredient-tag">
                              {ingredient}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="food-nutrition">
                        <div className="nutrition-item">
                          <div className="label">
                            {food.isCountable ? 'Quantity' : 'Quantity'}
                          </div>
                          <div className="value">
                            {food.isCountable 
                              ? `${food.quantity} ${food.unit}` 
                              : `${food.userQuantity}${!isMobile ? ' piece(s)' : ''}`
                            }
                          </div>
                        </div>
                        <div className="nutrition-item">
                          <div className="label">Calories</div>
                          <div className="value">{food.nutrition.calories.toFixed(0)}</div>
                        </div>
                        <div className="nutrition-item">
                          <div className="label">Protein</div>
                          <div className="value">{food.nutrition.protein.toFixed(1)}g</div>
                        </div>
                        <div className="nutrition-item">
                          <div className="label">Carbs</div>
                          <div className="value">{food.nutrition.carbs.toFixed(1)}g</div>
                        </div>
                        <div className="nutrition-item">
                          <div className="label">Fat</div>
                          <div className="value">{food.nutrition.fat.toFixed(1)}g</div>
                        </div>
                        <div className="nutrition-item">
                          <div className="label">Fiber</div>
                          <div className="value">{food.nutrition.fiber.toFixed(1)}g</div>
                        </div>
                      </div>
                      
                      {food.source && (
                        <div className="data-source">
                          Data source: {food.source}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="total-nutrition">
                <h3>Total Nutrition</h3>
                <div className="nutrition-summary">
                  <div className="nutrition-item">
                    <div className="label">Total Calories</div>
                    <div className="value">{results.nutrition.totalNutrition.calories.toFixed(0)}</div>
                  </div>
                  <div className="nutrition-item">
                    <div className="label">Total Protein</div>
                    <div className="value">{results.nutrition.totalNutrition.protein.toFixed(1)}g</div>
                  </div>
                  <div className="nutrition-item">
                    <div className="label">Total Carbs</div>
                    <div className="value">{results.nutrition.totalNutrition.carbs.toFixed(1)}g</div>
                  </div>
                  <div className="nutrition-item">
                    <div className="label">Total Fat</div>
                    <div className="value">{results.nutrition.totalNutrition.fat.toFixed(1)}g</div>
                  </div>
                  <div className="nutrition-item">
                    <div className="label">Total Fiber</div>
                    <div className="value">{results.nutrition.totalNutrition.fiber.toFixed(1)}g</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FoodRecognition; 