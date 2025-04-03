import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { searchUsersByName, getRecommendedUsers } from '../services/userService';
import { getOrCreateConversation } from '../services/chatService';
import { UserData } from '../contexts/AuthContext';
import { UserSearchScreenNavigationProp } from '../types/navigation.types';

const UserSearchScreen: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserData[]>([]);
  const [recommendedUsers, setRecommendedUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const navigation = useNavigation<UserSearchScreenNavigationProp>();

  // Define handleSearch as a useCallback to include it in the useEffect dependency array
  const handleSearch = useCallback(async () => {
    if (searchTerm.length < 3) return;
    
    console.log('Starting search for:', searchTerm);
    setLoading(true);
    try {
      const results = await searchUsersByName(searchTerm);
      console.log(`Found ${results.length} results for "${searchTerm}":`, results);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  // Load recommended users on initial mount
  useEffect(() => {
    const loadRecommendedUsers = async () => {
      try {
        const users = await getRecommendedUsers();
        setRecommendedUsers(users);
      } catch (error) {
        console.error('Error loading recommended users:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    loadRecommendedUsers();
  }, []);

  // Handle search when search term changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length >= 3) {
        handleSearch();
      } else if (searchTerm.length === 0) {
        setSearchResults([]);
      }
    }, 500); // Debounce search for better performance

    return () => clearTimeout(timer);
  }, [searchTerm, handleSearch]);

  const startConversation = async (user: UserData) => {
    try {
      setLoading(true);
      const conversation = await getOrCreateConversation(
        user.username, // Using username as user ID for demo
        user.name || user.username
      );
      
      // Navigate to chat screen with the selected conversation
      navigation.navigate('MessageScreen', { 
        conversationId: conversation.id,
        recipientName: user.name || user.username
      });
    } catch (error) {
      console.error('Error starting conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderUserItem = ({ item }: { item: UserData }) => (
    <TouchableOpacity 
      style={styles.userItem}
      onPress={() => startConversation(item)}
    >
      <View style={styles.userAvatar}>
        {item.profileImage ? (
          <Image source={{ uri: item.profileImage }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarText}>
            {(item.name || item.username || 'U').charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name || item.username}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        {item.university && (
          <Text style={styles.userUniversity}>{item.university}</Text>
        )}
      </View>
      <TouchableOpacity style={styles.messageButton} onPress={() => startConversation(item)}>
        <Text style={styles.messageButtonText}>Message</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
          testID="back-button"
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find People</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users by name..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {loading && <ActivityIndicator size="large" color="#007bff" />}

      {searchTerm.length > 0 ? (
        <View style={styles.resultsContainer}>
          <Text style={styles.sectionTitle}>
            Search Results for "{searchTerm}"
          </Text>
          {searchResults.length === 0 && !loading ? (
            <Text style={styles.noResults}>No users found matching "{searchTerm}"</Text>
          ) : (
            <FlatList
              data={searchResults}
              renderItem={renderUserItem}
              keyExtractor={(item) => item.username}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      ) : (
        <View style={styles.recommendedContainer}>
          <Text style={styles.sectionTitle}>Recommended Users</Text>
          {initialLoading ? (
            <ActivityIndicator size="large" color="#007bff" />
          ) : (
            <FlatList
              data={recommendedUsers}
              renderItem={renderUserItem}
              keyExtractor={(item) => item.username}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  searchContainer: {
    padding: 12,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchInput: {
    height: 46,
    borderRadius: 23,
    paddingHorizontal: 16,
    backgroundColor: '#f0f0f0',
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 12,
    marginHorizontal: 16,
  },
  resultsContainer: {
    flex: 1,
  },
  recommendedContainer: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  userUniversity: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  messageButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  messageButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20,
  },
  noResults: {
    textAlign: 'center',
    marginTop: 24,
    color: '#666',
    fontSize: 16,
  },
});

export default UserSearchScreen; 