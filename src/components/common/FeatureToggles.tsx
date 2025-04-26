import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import useProductStore, {
  enableFeaturedProductsAPI,
  disableFeaturedProductsAPI,
  enableNewArrivalsAPI,
  disableNewArrivalsAPI,
} from '../../store/productStore';

/**
 * FeatureToggles component provides UI to toggle features on/off
 * This can be used for development or included in settings
 */
const FeatureToggles: React.FC = () => {
  // Get the current state of feature toggles
  const disableFeaturedProductsFlag = useProductStore(state => state.disableFeaturedProductsAPI);
  const disableNewArrivalsFlag = useProductStore(state => state.disableNewArrivalsAPI);

  // Local state for toggle values
  const [featuredEnabled, setFeaturedEnabled] = useState(!disableFeaturedProductsFlag);
  const [newArrivalsEnabled, setNewArrivalsEnabled] = useState(!disableNewArrivalsFlag);

  // Update local state when store state changes
  useEffect(() => {
    setFeaturedEnabled(!disableFeaturedProductsFlag);
    setNewArrivalsEnabled(!disableNewArrivalsFlag);
  }, [disableFeaturedProductsFlag, disableNewArrivalsFlag]);

  // Toggle featured products API
  const toggleFeaturedProducts = (value: boolean) => {
    setFeaturedEnabled(value);
    if (value) {
      enableFeaturedProductsAPI();
    } else {
      disableFeaturedProductsAPI();
    }
  };

  // Toggle new arrivals API
  const toggleNewArrivals = (value: boolean) => {
    setNewArrivalsEnabled(value);
    if (value) {
      enableNewArrivalsAPI();
    } else {
      disableNewArrivalsAPI();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>API Feature Toggles</Text>
      
      <View style={styles.row}>
        <Text style={styles.toggleLabel}>Featured Products</Text>
        <Switch
          value={featuredEnabled}
          onValueChange={toggleFeaturedProducts}
          thumbColor={featuredEnabled ? '#f7b305' : '#f4f3f4'}
          trackColor={{ false: '#767577', true: '#f7b30550' }}
        />
      </View>
      
      <View style={styles.row}>
        <Text style={styles.toggleLabel}>New Arrivals</Text>
        <Switch
          value={newArrivalsEnabled}
          onValueChange={toggleNewArrivals}
          thumbColor={newArrivalsEnabled ? '#f7b305' : '#f4f3f4'}
          trackColor={{ false: '#767577', true: '#f7b30550' }}
        />
      </View>

      <Text style={styles.description}>
        Toggle these features on or off. When disabled, the corresponding API calls won't be made, improving app performance.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  toggleLabel: {
    fontSize: 16,
    color: '#444',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 16,
    fontStyle: 'italic',
  },
});

export default FeatureToggles; 