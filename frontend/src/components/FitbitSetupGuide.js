import React, { useState } from 'react';
import './FitbitSetupGuide.css';

const FitbitSetupGuide = ({ onClose, onContinue }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [hasFitbitAccount, setHasFitbitAccount] = useState(null);

  const steps = [
    {
      id: 1,
      title: "Fitbit Account Setup",
      content: (
        <div className="step-content">
          <h3>Do you have a Fitbit account?</h3>
          <p>Each user needs their own unique Fitbit account to track their personal fitness data.</p>
          
          <div className="account-options">
            <button 
              className={`option-button ${hasFitbitAccount === true ? 'selected' : ''}`}
              onClick={() => setHasFitbitAccount(true)}
            >
              <span className="option-icon">✓</span>
              <span className="option-text">Yes, I have a Fitbit account</span>
            </button>
            
            <button 
              className={`option-button ${hasFitbitAccount === false ? 'selected' : ''}`}
              onClick={() => setHasFitbitAccount(false)}
            >
              <span className="option-icon">+</span>
              <span className="option-text">No, I need to create one</span>
            </button>
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: "Create Fitbit Account",
      content: (
        <div className="step-content">
          <h3>Create Your Fitbit Account</h3>
          <p>Follow these steps to create your own Fitbit account:</p>
          
          <div className="setup-steps">
            <div className="setup-step">
              <div className="step-number">1</div>
              <div className="step-details">
                <h4>Visit Fitbit.com</h4>
                <p>Go to <a href="https://www.fitbit.com" target="_blank" rel="noopener noreferrer">www.fitbit.com</a> and click "Sign Up"</p>
              </div>
            </div>
            
            <div className="setup-step">
              <div className="step-number">2</div>
              <div className="step-details">
                <h4>Create Account</h4>
                <p>Use a different email address than your fitness app account</p>
              </div>
            </div>
            
            <div className="setup-step">
              <div className="step-number">3</div>
              <div className="step-details">
                <h4>Verify Email</h4>
                <p>Check your email and click the verification link</p>
              </div>
            </div>
            
            <div className="setup-step">
              <div className="step-number">4</div>
              <div className="step-details">
                <h4>Complete Profile</h4>
                <p>Add your basic information (height, weight, goals)</p>
              </div>
            </div>
          </div>
          
          <div className="important-note">
            <h4>⚠️ Important</h4>
            <p>Each user must have their own unique Fitbit account. Sharing accounts is not allowed for privacy and data accuracy.</p>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: "Connect Your Account",
      content: (
        <div className="step-content">
          <h3>Ready to Connect</h3>
          <p>Now you can connect your Fitbit account to start tracking your fitness data!</p>
          
          <div className="benefits">
            <h4>What you'll get:</h4>
            <ul>
              <li>✓ Real-time step tracking</li>
              <li>✓ Calorie burn data</li>
              <li>✓ Activity monitoring</li>
              <li>✓ Personal fitness insights</li>
            </ul>
          </div>
          
          <div className="privacy-note">
            <h4>🔒 Privacy & Security</h4>
            <p>Your Fitbit data is private and only accessible to you. We use secure OAuth authentication to protect your information.</p>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      onContinue();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    if (currentStep === 1) {
      return hasFitbitAccount !== null;
    }
    return true;
  };

  const getStepContent = () => {
    // If user has account, skip step 2
    if (hasFitbitAccount === true && currentStep === 2) {
      return steps[2]; // Go directly to step 3
    }
    return steps[currentStep - 1];
  };

  const currentStepData = getStepContent();

  return (
    <div className="fitbit-setup-guide">
      <div className="guide-header">
        <h2>Fitbit Account Setup</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      <div className="guide-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          ></div>
        </div>
        <span className="progress-text">Step {currentStep} of {steps.length}</span>
      </div>
      
      <div className="guide-content">
        <h3>{currentStepData.title}</h3>
        {currentStepData.content}
      </div>
      
      <div className="guide-actions">
        {currentStep > 1 && (
          <button className="back-button" onClick={handleBack}>
            Back
          </button>
        )}
        
        <button 
          className={`continue-button ${!canProceed() ? 'disabled' : ''}`}
          onClick={handleNext}
          disabled={!canProceed()}
        >
          {currentStep === steps.length ? 'Connect Fitbit' : 'Continue'}
        </button>
      </div>
    </div>
  );
};

export default FitbitSetupGuide; 