// In-memory storage for demo purposes
const userMealFolders = new Map(); // userId -> [{ id, name, meals: [{ id, name, nutrition, baseNutrition, image, description, quantity, date }] }]

const generateId = () => Math.random().toString(36).substr(2, 9);

const mealsService = {
  getFolders(userId) {
    return userMealFolders.get(userId) || [];
  },
  createFolder(userId, name) {
    const folders = userMealFolders.get(userId) || [];
    const newFolder = { id: generateId(), name, meals: [], starred: false };
    folders.push(newFolder);
    userMealFolders.set(userId, folders);
    return newFolder;
  },
  deleteFolder(userId, folderId) {
    const folders = userMealFolders.get(userId) || [];
    const updated = folders.filter(f => f.id !== folderId);
    userMealFolders.set(userId, updated);
  },
  getMeals(userId, folderId) {
    const folders = userMealFolders.get(userId) || [];
    const folder = folders.find(f => f.id === folderId);
    return folder ? folder.meals : [];
  },
  addMeal(userId, folderId, mealData) {
    const folders = userMealFolders.get(userId) || [];
    const folder = folders.find(f => f.id === folderId);
    if (!folder) throw new Error('Folder not found');
    
    // Store base nutrition values (per unit) for future quantity adjustments
    const baseNutrition = mealData.nutrition ? {
      calories: mealData.nutrition.calories / mealData.quantity,
      protein: mealData.nutrition.protein / mealData.quantity,
      carbs: mealData.nutrition.carbs / mealData.quantity,
      fat: mealData.nutrition.fat / mealData.quantity,
      fiber: mealData.nutrition.fiber / mealData.quantity
    } : null;
    
    const meal = { 
      id: generateId(), 
      name: mealData.name,
      nutrition: mealData.nutrition,
      baseNutrition: baseNutrition, // Store base nutrition per unit
      image: mealData.image,
      description: mealData.description,
      quantity: mealData.quantity,
      date: new Date().toISOString(),
      starred: false 
    };
    folder.meals.push(meal);
    return meal;
  },
  deleteMeal(userId, folderId, mealId) {
    const folders = userMealFolders.get(userId) || [];
    const folder = folders.find(f => f.id === folderId);
    if (!folder) throw new Error('Folder not found');
    folder.meals = folder.meals.filter(m => m.id !== mealId);
  },
  updateFolderName(userId, folderId, name) {
    const folders = userMealFolders.get(userId) || [];
    const folder = folders.find(f => f.id === folderId);
    if (!folder) throw new Error('Folder not found');
    folder.name = name;
    return folder;
  },
  updateMeal(userId, folderId, mealId, mealData) {
    const folders = userMealFolders.get(userId) || [];
    const folder = folders.find(f => f.id === folderId);
    if (!folder) throw new Error('Folder not found');
    const meal = folder.meals.find(m => m.id === mealId);
    if (!meal) throw new Error('Meal not found');
    
    // Only allow updating quantity, not name
    if (mealData.quantity !== undefined) {
      const oldQuantity = meal.quantity;
      meal.quantity = mealData.quantity;
      
      // Recalculate nutrition based on new quantity and base nutrition
      if (meal.baseNutrition) {
        meal.nutrition = {
          calories: meal.baseNutrition.calories * meal.quantity,
          protein: meal.baseNutrition.protein * meal.quantity,
          carbs: meal.baseNutrition.carbs * meal.quantity,
          fat: meal.baseNutrition.fat * meal.quantity,
          fiber: meal.baseNutrition.fiber * meal.quantity
        };
      } else if (meal.nutrition && oldQuantity > 0) {
        // Fallback for meals created before baseNutrition was implemented
        // Calculate base nutrition from current values and store it
        meal.baseNutrition = {
          calories: meal.nutrition.calories / oldQuantity,
          protein: meal.nutrition.protein / oldQuantity,
          carbs: meal.nutrition.carbs / oldQuantity,
          fat: meal.nutrition.fat / oldQuantity,
          fiber: meal.nutrition.fiber / oldQuantity
        };
        
        // Now recalculate with new quantity
        meal.nutrition = {
          calories: meal.baseNutrition.calories * meal.quantity,
          protein: meal.baseNutrition.protein * meal.quantity,
          carbs: meal.baseNutrition.carbs * meal.quantity,
          fat: meal.baseNutrition.fat * meal.quantity,
          fiber: meal.baseNutrition.fiber * meal.quantity
        };
      }
    }
    
    return meal;
  },
  toggleFolderStar(userId, folderId) {
    const folders = userMealFolders.get(userId) || [];
    const folder = folders.find(f => f.id === folderId);
    if (!folder) throw new Error('Folder not found');
    folder.starred = !folder.starred;
    return folder;
  },
  toggleMealStar(userId, folderId, mealId) {
    const folders = userMealFolders.get(userId) || [];
    const folder = folders.find(f => f.id === folderId);
    if (!folder) throw new Error('Folder not found');
    const meal = folder.meals.find(m => m.id === mealId);
    if (!meal) throw new Error('Meal not found');
    meal.starred = !meal.starred;
    return meal;
  }
};

module.exports = mealsService; 