import React, { useEffect } from 'react';
import { View, Text, Button, ActivityIndicator, StyleSheet } from 'react-native';
import useProductStore from '../store/productStore';

// Simple component to demonstrate Zustand usage
const ZustandExample = ({ university, city }: { university: string; city: string }) => {
  // Get state and actions from the store
  const {
    featuredProducts,
    loadingFeatured,
    error,
    loadFeaturedProducts,
    handleRefresh,
  } = useProductStore();

  // Load featured products when component mounts
  useEffect(() => {
    if (university && city) {
      loadFeaturedProducts(university, city);
    }
  }, [university, city, loadFeaturedProducts]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Featured Products (Zustand)</Text>

      {loadingFeatured ? (
        <ActivityIndicator size="large" color="#f7b305" />
      ) : error ? (
        <View>
          <Text style={styles.error}>{error}</Text>
          <Button
            title="Retry"
            onPress={() => loadFeaturedProducts(university, city)}
          />
        </View>
      ) : (
        <View>
          <Text style={styles.count}>
            {featuredProducts.length} products loaded
          </Text>
          <Button
            title="Refresh All"
            onPress={() => handleRefresh(university, city)}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginVertical: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  count: {
    fontSize: 16,
    marginBottom: 12,
  },
  error: {
    color: 'red',
    marginBottom: 12,
  },
});

export default ZustandExample;
