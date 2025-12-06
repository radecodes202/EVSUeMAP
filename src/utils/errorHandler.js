// src/utils/errorHandler.js - Error Handling Utilities

/**
 * Get user-friendly error message from API error
 * @param {Error} error - The error object
 * @returns {string} User-friendly error message
 */
export const getErrorMessage = (error) => {
  let errorMsg = 'Failed to load campus data.\n\n';
  
  if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
    errorMsg += '🔴 Cannot connect to backend server.\n\nMake sure:\n1. Backend server is running\n2. API_URL has your correct IP address\n3. You are on the same WiFi network';
  } else if (error.code === 'ECONNABORTED') {
    errorMsg += 'Request timeout. Check your network connection.';
  } else {
    errorMsg += error.message;
  }
  
  return errorMsg;
};

