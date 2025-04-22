import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  Modal,
  Dimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import citiesData from '../city_names_sorted.json';

// Get cities from imported JSON file
const PREDEFINED_CITIES = citiesData.city_names;

// Constants for list optimization
const ITEM_HEIGHT = 53; // Height of each city item (16px padding top/bottom + 1px border + text height)

interface CitySelectorProps {
  isVisible: boolean;
  onClose: () => void;
  onSelectCity: (city: string) => void;
  currentCity: string | null;
  defaultCity?: string | null;
}

// Memoized list item component to prevent unnecessary re-renders
const CityItem = React.memo(({
  city,
  isSelected,
  onSelect
}: {
  city: string,
  isSelected: boolean,
  onSelect: () => void
}) => (
  <TouchableOpacity
    style={[styles.cityItem, isSelected && styles.selectedCityItem]}
    onPress={onSelect}
  >
    <Text style={[styles.cityItemText, isSelected && styles.selectedCityItemText]}>
      {city}
    </Text>
    {isSelected && (
      <Ionicons name="checkmark" size={20} color="#4CAF50" />
    )}
  </TouchableOpacity>
));

const CitySelector: React.FC<CitySelectorProps> = ({
  isVisible,
  onClose,
  onSelectCity,
  currentCity,
  defaultCity,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter cities based on search query
  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) return PREDEFINED_CITIES;
    
    const normalizedQuery = searchQuery.toLowerCase().trim();
    
    // For very short queries, only match from the beginning of city names
    if (normalizedQuery.length < 3) {
      return PREDEFINED_CITIES.filter(city => 
        city.toLowerCase().startsWith(normalizedQuery)
      );
    }
    
    // For longer queries, match anywhere in the city name
    return PREDEFINED_CITIES.filter(city => 
      city.toLowerCase().includes(normalizedQuery)
    );
  }, [searchQuery]);

  // Handle reset to default city
  const handleResetToDefault = useCallback(() => {
    if (defaultCity && defaultCity !== currentCity) {
      onSelectCity(defaultCity);
      onClose();
    }
  }, [defaultCity, currentCity, onSelectCity, onClose]);

  // FlatList optimization functions
  const getItemLayout = useCallback((data: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }), []);

  const renderCityItem = useCallback(({ item }: { item: string }) => (
    <CityItem
      city={item}
      isSelected={currentCity === item}
      onSelect={() => {
        onSelectCity(item);
        onClose();
      }}
    />
  ), [currentCity, onSelectCity, onClose]);

  const keyExtractor = useCallback((item: string) => item, []);

  const isResetDisabled = !defaultCity || defaultCity === currentCity;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose Location</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={[styles.resetButton, isResetDisabled && styles.resetButtonDisabled]}
                onPress={handleResetToDefault}
                disabled={isResetDisabled}
              >
                <Text style={[styles.resetButtonText, isResetDisabled && styles.resetButtonTextDisabled]}>
                  Reset
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.citySearchInput}
              placeholder="Search cities..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
          
          {filteredCities.length === 0 ? (
            <View style={styles.noCitiesContainer}>
              <Text style={styles.noCitiesText}>No cities found</Text>
            </View>
          ) : (
            <FlatList
              data={filteredCities}
              keyExtractor={keyExtractor}
              renderItem={renderCityItem}
              getItemLayout={getItemLayout}
              initialNumToRender={10}
              maxToRenderPerBatch={20}
              windowSize={10}
              removeClippedSubviews={true}
              style={styles.cityList}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: Dimensions.get('window').width * 0.9,
    maxHeight: Dimensions.get('window').height * 0.7,
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
    padding: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resetButton: {
    marginRight: 15,
    padding: 5,
  },
  resetButtonDisabled: {
    opacity: 0.5,
  },
  resetButtonText: {
    color: '#007BFF',
    fontSize: 16,
  },
  resetButtonTextDisabled: {
    color: '#999',
  },
  closeButton: {
    padding: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    margin: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  searchIcon: {
    marginRight: 10,
  },
  citySearchInput: {
    flex: 1,
    padding: 10,
    fontSize: 16,
  },
  clearButton: {
    padding: 5,
  },
  cityList: {
    flexGrow: 0,
  },
  cityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedCityItem: {
    backgroundColor: '#f0f9ff',
  },
  cityItemText: {
    fontSize: 16,
    color: '#333',
  },
  selectedCityItemText: {
    fontWeight: 'bold',
    color: '#007BFF',
  },
  noCitiesContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noCitiesText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default CitySelector; 