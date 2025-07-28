// Goals calculation service based on user's height, weight, and gender

// Calculate Basal Metabolic Rate (BMR) using Mifflin-St Jeor Equation
const calculateBMR = (weight, height, age, gender) => {
  // For now, we'll use a default age of 30 if not provided
  // In a real app, you'd want to collect age as well
  const defaultAge = 30;
  const actualAge = age || defaultAge;
  
  if (gender === 'male') {
    return (10 * weight) + (6.25 * height) - (5 * actualAge) + 5;
  } else {
    return (10 * weight) + (6.25 * height) - (5 * actualAge) - 161;
  }
};

// Calculate Total Daily Energy Expenditure (TDEE)
const calculateTDEE = (bmr, activityLevel = 'moderate') => {
  const activityMultipliers = {
    sedentary: 1.2,      // Little or no exercise
    light: 1.375,        // Light exercise/sports 1-3 days/week
    moderate: 1.55,      // Moderate exercise/sports 3-5 days/week
    active: 1.725,       // Hard exercise/sports 6-7 days a week
    veryActive: 1.9      // Very hard exercise/sports & physical job
  };
  
  return bmr * activityMultipliers[activityLevel];
};

// Calculate personalized goals
export const calculatePersonalizedGoals = (height, weight, gender, age = 30) => {
  if (!height || !weight || !gender) {
    // Return default goals if required data is missing
    return {
      dailyCaloriesConsumed: 2000,
      dailyCalorieDeficit: 500
    };
  }

  // Calculate BMR and TDEE
  const bmr = calculateBMR(weight, height, age, gender);
  const tdee = calculateTDEE(bmr, 'moderate');
  
  // Calculate goals based on TDEE
  const dailyCaloriesConsumed = Math.round(tdee);
  
  // Calculate calorie deficit goal (aim for 0.5-1 kg weight loss per week)
  // 1 kg of fat = 7700 calories, so 0.5 kg = 3850 calories per week = 550 calories per day
  const dailyCalorieDeficit = Math.round(tdee * 0.2); // 20% deficit for healthy weight loss
  

  
  return {
    dailyCaloriesConsumed: Math.round(dailyCaloriesConsumed),
    dailyCalorieDeficit: Math.max(300, Math.min(800, dailyCalorieDeficit)) // Keep deficit between 300-800 calories
  };
};

// Get detailed calculation breakdown for user feedback
export const getCalculationDetails = (height, weight, gender, age = 30) => {
  if (!height || !weight || !gender) {
    return {
      canCalculate: false,
      missingFields: []
    };
  }

  const missingFields = [];
  if (!height) missingFields.push('height');
  if (!weight) missingFields.push('weight');
  if (!gender) missingFields.push('gender');

  if (missingFields.length > 0) {
    return {
      canCalculate: false,
      missingFields
    };
  }

  const bmr = calculateBMR(weight, height, age, gender);
  const tdee = calculateTDEE(bmr, 'moderate');
  const goals = calculatePersonalizedGoals(height, weight, gender, age);

  return {
    canCalculate: true,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    goals,
    explanation: {
      bmr: `Your Basal Metabolic Rate (BMR) is ${Math.round(bmr)} calories/day. This is the energy your body needs at rest.`,
      tdee: `Your Total Daily Energy Expenditure (TDEE) is ${Math.round(tdee)} calories/day. This includes your BMR plus daily activities.`,
      caloriesConsumed: `Daily calorie goal: ${goals.dailyCaloriesConsumed} calories (based on your TDEE)`,
      calorieDeficit: `Daily calorie deficit goal: ${goals.dailyCalorieDeficit} calories (20% of TDEE for healthy weight loss)`,

    }
  };
};

// Calculate BMI for additional context
export const calculateBMI = (weight, height) => {
  if (!weight || !height) return null;
  
  // Convert height from cm to meters
  const heightInMeters = height / 100;
  const bmi = weight / (heightInMeters * heightInMeters);
  
  return Math.round(bmi * 10) / 10; // Round to 1 decimal place
};

// Get BMI category
export const getBMICategory = (bmi) => {
  if (!bmi) return null;
  
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal weight';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
};

// Calculate ideal weight range based on height and gender
export const calculateIdealWeightRange = (height, gender) => {
  if (!height || !gender) return null;
  
  // Convert height from cm to inches
  const heightInInches = height / 2.54;
  
  // Use Hamwi formula for ideal body weight
  let baseWeight;
  if (gender === 'male') {
    baseWeight = 106 + (6 * (heightInInches - 60));
  } else {
    baseWeight = 100 + (5 * (heightInInches - 60));
  }
  
  // Convert back to kg
  const baseWeightKg = baseWeight * 0.453592;
  
  // Return range (±10% of ideal weight)
  const range = baseWeightKg * 0.1;
  
  return {
    min: Math.round(baseWeightKg - range),
    max: Math.round(baseWeightKg + range),
    ideal: Math.round(baseWeightKg)
  };
}; 