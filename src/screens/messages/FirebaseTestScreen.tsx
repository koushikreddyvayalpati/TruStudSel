import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Platform
} from 'react-native';
import { 
  testFirebaseConnection, 
  testCurrentUserRetrieval, 
  testSendDirectMessage 
} from '../../services/firebaseTest';

const FirebaseTestScreen = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<Array<{
    test: string;
    success: boolean;
    message: string;
    details?: any;
  }>>([]);
  
  const runFirebaseTest = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    try {
      // Test 1: Firestore Connection
      console.log('Testing Firestore connection...');
      const connectionResult = await testFirebaseConnection();
      setTestResults(prev => [...prev, {
        test: 'Firestore Connection',
        success: connectionResult.success,
        message: connectionResult.message,
        details: connectionResult.details
      }]);
      
      // Test 2: User Retrieval
      console.log('Testing user retrieval...');
      const userResult = await testCurrentUserRetrieval();
      setTestResults(prev => [...prev, {
        test: 'User Authentication',
        success: userResult.success,
        message: userResult.message,
        details: userResult.user
      }]);
      
    } catch (error) {
      console.error('Error running Firebase tests:', error);
      setTestResults(prev => [...prev, {
        test: 'Test Execution',
        success: false,
        message: 'An unexpected error occurred while running tests',
        details: error
      }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add a new function to test direct messaging
  const runDirectMessageTest = async () => {
    setIsLoading(true);
    
    try {
      console.log('Testing direct message capability...');
      const messageResult = await testSendDirectMessage();
      setTestResults([{
        test: 'Direct Message Test',
        success: messageResult.success,
        message: messageResult.message,
        details: messageResult.details
      }]);
    } catch (error) {
      console.error('Error testing direct message:', error);
      setTestResults([{
        test: 'Direct Message Test',
        success: false,
        message: 'An unexpected error occurred during the direct message test',
        details: error
      }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Firebase Connectivity Test</Text>
      </View>
      
      <View style={styles.buttonsContainer}>
        <TouchableOpacity 
          style={styles.testButton} 
          onPress={runFirebaseTest}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Running Tests...' : 'Test Firebase Connection'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.testButton, styles.messageTestButton]} 
          onPress={runDirectMessageTest}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Testing...' : 'Test Direct Messaging'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffb300" />
          <Text style={styles.loadingText}>Running tests, please wait...</Text>
        </View>
      )}
      
      {testResults.length > 0 && (
        <ScrollView style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Test Results:</Text>
          
          {testResults.map((result, index) => (
            <View 
              key={index} 
              style={[
                styles.resultCard,
                result.success ? styles.successCard : styles.failureCard
              ]}
            >
              <Text style={styles.testName}>{result.test}</Text>
              <Text style={styles.resultStatus}>
                Status: {result.success ? 'PASSED' : 'FAILED'}
              </Text>
              <Text style={styles.resultMessage}>{result.message}</Text>
              
              {result.details && (
                <View style={styles.detailsContainer}>
                  <Text style={styles.detailsTitle}>Details:</Text>
                  <Text style={styles.detailsText}>
                    {JSON.stringify(result.details, null, 2)}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          This screen tests Firebase connectivity to help troubleshoot issues.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    padding: 16,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  buttonsContainer: {
    marginBottom: 20,
  },
  testButton: {
    backgroundColor: '#ffb300',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  messageTestButton: {
    backgroundColor: '#4caf50',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  resultsContainer: {
    flex: 1,
    marginBottom: 10,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  resultCard: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  successCard: {
    backgroundColor: '#e6f7e6',
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  failureCard: {
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  testName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  resultStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  resultMessage: {
    fontSize: 14,
    color: '#555',
    marginBottom: 10,
  },
  detailsContainer: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    padding: 10,
    borderRadius: 4,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#666',
  },
  detailsText: {
    fontSize: 12,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  footer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#777',
    textAlign: 'center',
  },
});

export default FirebaseTestScreen; 