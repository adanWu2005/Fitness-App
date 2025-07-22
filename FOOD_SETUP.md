# Food Recognition System Setup Guide

This guide will help you set up the food recognition system that has been integrated into your fitness tracker app.

## Overview

The food recognition system allows users to:
- Upload food images
- Get AI-powered food identification
- Receive detailed nutritional information
- Track their food intake

## Prerequisites

1. **Google Cloud Vision API**: Required for food image recognition
2. **Nutritionix API** (Optional): For enhanced nutrition data
3. **Node.js**: Version 14 or higher

## Setup Instructions

### 1. Google Cloud Vision API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Cloud Vision API:
   - Go to "APIs & Services" > "Library"
   - Search for "Cloud Vision API"
   - Click "Enable"
4. Create a service account:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Fill in the details and create the account
5. Download the JSON key file:
   - Click on the created service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create New Key"
   - Choose JSON format and download
6. Place the JSON file in the `backend/` directory
7. Set the environment variable in your `.env` file:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=./img-recognition-466123-820b241b7988.json
   ```

### 2. Nutritionix API Setup (Optional)

For enhanced nutrition data:

1. Go to [Nutritionix](https://www.nutritionix.com/business/api)
2. Sign up for a free API account
3. Get your App ID and App Key
4. Add to your `.env` file:
   ```
   NUTRITIONIX_APP_ID=your_app_id_here
   NUTRITIONIX_APP_KEY=your_app_key_here
   ```

### 3. Install Dependencies

Navigate to the backend directory and install the new dependencies:

```bash
cd backend
npm install
```

The following new packages will be installed:
- `multer`: For file upload handling
- `sharp`: For image processing
- `@google-cloud/vision`: For Google Cloud Vision API

### 4. Environment Variables

Create or update your `.env` file in the backend directory:

```env
# Existing Fitbit variables
FITBIT_CLIENT_ID=your_fitbit_client_id
FITBIT_CLIENT_SECRET=your_fitbit_client_secret
FITBIT_REDIRECT_URI=http://localhost:3000/callback.html

# New Food Recognition variables
GOOGLE_APPLICATION_CREDENTIALS=./img-recognition-466123-820b241b7988.json
NUTRITIONIX_APP_ID=your_nutritionix_app_id
NUTRITIONIX_APP_KEY=your_nutritionix_app_key
```

### 5. Start the Application

1. Start the backend server:
   ```bash
   cd backend
   npm start
   ```

2. Start the frontend:
   ```bash
   cd frontend
   npm start
   ```

## Usage

1. **Access Food Recognition**: Click on the "Food Recognition" card on the dashboard
2. **Upload Image**: Drag and drop or click to upload a food image
3. **Add Description** (Optional): Describe the food to improve recognition accuracy
4. **Set Servings**: Adjust the number of servings for accurate nutrition
5. **Analyze**: Click "Analyze Food" to get results
6. **View Results**: See identified foods, ingredients, and nutritional information

## Features

### Food Recognition
- AI-powered food identification using Google Cloud Vision
- Support for various food types and cuisines
- Confidence scoring for recognition accuracy

### Nutrition Analysis
- Detailed nutritional breakdown (calories, protein, carbs, fat, fiber)
- Serving size adjustments
- Data from Nutritionix API (when configured) or fallback data

### User Experience
- Drag and drop image upload
- Real-time image preview
- Optional food description for improved accuracy
- Responsive design for mobile and desktop
- Error handling and loading states

## API Endpoints

### POST /api/food/analyze
Analyzes a food image and returns nutritional information.

**Request:**
- `image`: Image file (multipart/form-data)
- `description`: Optional food description (string)
- `servings`: Number of servings (number)

**Response:**
```json
{
  "success": true,
  "imageInfo": {
    "width": 1920,
    "height": 1080,
    "format": "jpeg"
  },
  "recognizedFoods": [...],
  "nutrition": {
    "totalNutrition": {...},
    "detailedNutrition": [...]
  },
  "userServings": 1,
  "descriptionHelped": true,
  "userDescription": "chicken"
}
```

### GET /api/food/health
Health check endpoint for the food recognition service.

## Troubleshooting

### Common Issues

1. **"Google Cloud Vision not configured"**
   - Ensure the credentials file exists in the backend directory
   - Check that `GOOGLE_APPLICATION_CREDENTIALS` environment variable is set correctly

2. **"Food recognition failed"**
   - Verify Google Cloud Vision API is enabled
   - Check API quotas and billing
   - Ensure the service account has proper permissions

3. **"No nutrition data found"**
   - Nutritionix API is optional - the system will use fallback data
   - Check Nutritionix API credentials if you want enhanced nutrition data

4. **Image upload issues**
   - Ensure the image is a valid format (JPEG, PNG, etc.)
   - Check file size (max 10MB)
   - Verify the uploads directory has write permissions

### Debug Mode

Enable debug logging by setting:
```env
DEBUG=true
```

## Security Considerations

1. **File Upload Security**: Images are processed and deleted after analysis
2. **API Keys**: Keep your Google Cloud and Nutritionix API keys secure
3. **CORS**: Configure CORS settings appropriately for your deployment

## Performance

- Image processing typically takes 2-5 seconds
- Results are cached temporarily for better performance
- Large images are automatically resized for optimal processing

## Future Enhancements

Potential improvements for the food recognition system:
- Food diary integration
- Calorie tracking over time
- Meal planning features
- Barcode scanning for packaged foods
- Integration with fitness goals 