import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';

const { width } = Dimensions.get('window');

const messagesData = [
  { id: '1', name: 'Fauziah', message: 'I will do the voice over', time: '10:30 PM', status: 'online' },
  { id: '2', name: 'Nicole', message: 'just open la', time: '3:15 PM', status: 'online' },
  { id: '3', name: 'Brian', message: 'bye', time: 'Yesterday', status: 'offline' },
  { id: '4', name: 'Cheng', message: 'call me when you get...', time: 'Yesterday', status: 'offline' },
  { id: '5', name: 'Model', message: 'ready for another adv...', time: 'Yesterday', status: 'offline' },
  { id: '6', name: 'Ash King', message: 'whatsapp my frnd', time: '2d', status: 'offline' },
  { id: '7', name: 'Remote Guy', message: 'here is your bill for the...', time: 'Mar 10', status: 'offline' },
  { id: '8', name: 'Kg1', message: 'LOL!!!', time: 'Mar 7', status: 'offline' },
  { id: '9', name: 'Stephen', message: 'that would be great!', time: 'Mar 3', status: 'offline' },
];

const MessagesScreen = () => {
  const navigation = useNavigation();

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.messageContainer}
      onPress={() => navigation.navigate('MessageDetail', { contactName: item.name })}
      activeOpacity={0.8} // Adds subtle press feedback
    >
      <View style={[
        styles.avatar,
        { backgroundColor: item.status === 'online' ? '#4CAF50' : '#B0BEC5' }, // More modern gray for offline
      ]}>
        <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
        {item.status === 'online' && <View style={styles.onlineIndicatorAvatar} />}
      </View>
      <View style={styles.messageContent}>
        <View style={styles.headerRow}>
          <Text style={styles.senderName}>{item.name}</Text>
          <Text style={styles.messageTime}>{item.time}</Text>
        </View>
        <Text 
          style={styles.messageText} 
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {item.message}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7b305" />
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={20} color="black" />
        </TouchableOpacity>
        <Text style={styles.header}>Messages</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="search" size={22} color="black" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Icon name="home" size={22} color="black" />
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={messagesData}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
      <TouchableOpacity style={styles.composeButton}>
        <Icon name="edit" size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f7b305',
    padding: 15,
    paddingTop: StatusBar.currentHeight + 10,
    elevation: 4,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  backButton: {
    padding: 10,
  },
  header: {
    fontSize: 24,
    fontWeight: '400',
    color: 'black',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 15,
  },
  actionButton: {
    padding: 5,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15, // Increased padding for breathing room
    backgroundColor: '#fff',
    borderRadius: 12, // Rounded corners for modern look
    marginHorizontal: 10, // Side margins for card effect
    marginVertical: 5, // Vertical spacing between cards
    elevation: 2, // Subtle shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  avatar: {
    width: 54, // Slightly larger avatar
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12, // Increased spacing from content
    borderWidth: 1, // Subtle border
    borderColor: 'rgba(0,0,0,0.05)',
  },
  avatarText: {
    color: '#fff',
    fontSize: 22, // Larger text for better visibility
    fontWeight: '700', // Bolder initial
  },
  messageContent: {
    flex: 1,
    flexDirection: 'column',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6, // More space below header
  },
  senderName: {
    fontSize: 17, // Slightly larger for emphasis
    fontWeight: '700', // Bolder for hierarchy
    color: '#222', // Darker for contrast
  },
  messageText: {
    fontSize: 14,
    color: '#777', // Lighter gray for preview
    width: width * 0.65,
  },
  messageTime: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  onlineIndicatorAvatar: {
    width: 12, // Larger for visibility
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2, // White border for contrast
    borderColor: '#fff',
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 0, // Full-width separator (optional, adjust as needed)
  },
  composeButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f7b305',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});

export default MessagesScreen;