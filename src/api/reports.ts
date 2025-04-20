/**
 * Reports API Service
 *
 * Handles all reporting related API operations
 */

import apiClient from './apiClient';
import { API_URL } from './config';
import { AxiosError } from 'axios';

// Report data interface
export interface ReportData {
  productId: string;
  userEmail: string;
  sellerId: string;
  reportMessage: string;
}

/**
 * Submit a report for a product
 * @param reportData Report data object containing product and report details
 */
export const submitReport = async (reportData: ReportData) => {
  try {
    // Import Auth from Amplify inside the function to avoid circular dependencies
    const { Auth } = require('aws-amplify');

    // Get the current authenticated session to retrieve the JWT token
    const currentSession = await Auth.currentSession();
    const token = currentSession.getIdToken().getJwtToken();

    // Using apiClient to maintain consistency with other API calls
    const response = await apiClient.post(`${API_URL}/api/reports`, reportData, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    return response.data;
  } catch (error: unknown) {
    console.error('Failed to submit report:');

    // Type guard for AxiosError
    if (error instanceof AxiosError) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Status:', error.response.status);
        console.error('Data:', JSON.stringify(error.response.data, null, 2));
        console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        console.error('Request Error: No response received. Request details:', error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Axios Error Message:', error.message);
      }
    } else if (error instanceof Error) {
        // Handle generic Error objects
        console.error('Generic Error Message:', error.message);
    } else {
        // Handle cases where the error is not an Error object (e.g., string thrown)
        console.error('Unexpected error type:', error);
    }

    // Log the full error object for further inspection if needed
    console.error('Full Error Object:', error);
    throw error;
  }
};

export default {
  submitReport,
}; 