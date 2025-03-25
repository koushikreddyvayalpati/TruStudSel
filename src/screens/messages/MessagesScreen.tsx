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
import { useNavigation, NavigationProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { MainStackParamList } from '../../types/navigation.types';

const { width } = Dimensions.get('window');

interface MessageData {
  id: string;
  name: string;
  message: string;
  time: string;
  status: 'online' | 'offline';
}

const messagesData: MessageData[] = [
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
  const navigation = useNavigation<NavigationProp<MainStackParamList>>();
  const { theme } = useTheme();

  const renderItem = ({ item }: { item: MessageData }) => (
    <TouchableOpacity 
      style={[
        styles.messageContainer, 
        { backgroundColor: theme.colors.card, ...theme.shadows.sm }
      ]}
      onPress={() => navigation.navigate('MessageScreen', { conversationId: item.id, recipientName: item.name })}
      activeOpacity={0.8}
    >
      <View style={[
        styles.avatar,
        { backgroundColor: item.status === 'online' ? theme.colors.success : theme.colors.textSecondary },
      ]}>
        <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
        {item.status === 'online' && (
          <View style={[styles.onlineIndicatorAvatar, { backgroundColor: theme.colors.success, borderColor: theme.colors.card }]} />
        )}
      </View>
      <View style={styles.messageContent}>
        <View style={styles.headerRow}>
          <Text style={[styles.senderName, { color: theme.colors.text }]}>{item.name}</Text>
          <Text style={[styles.messageTime, { color: theme.colors.textSecondary }]}>{item.time}</Text>
        </View>
        <Text 
          style={[styles.messageText, { color: theme.colors.textSecondary }]} 
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {item.message}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.primary} />
      <View style={[styles.headerContainer, { backgroundColor: theme.colors.primary }]}>
        <TouchableOpacity 
          onPress={() => navigation.navigate('Home')} 
          style={styles.backButton}
          testID="back-button"
        >
          <MaterialIcons name="arrow-back-ios-new" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.header, { color: "#FFFFFF" }]}>Messages</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="search-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Icon name="home" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={messagesData}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />}
      />
      <TouchableOpacity style={[styles.composeButton, { backgroundColor: theme.colors.primary, ...theme.shadows.md }]}>
        <Icon name="edit" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 5 : 5,
    paddingBottom: 10,
    elevation: 4,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  backButton: {
    padding: 10,
  },
  header: {
    fontSize: 18,
    fontWeight: '400',
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
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 0,
    marginVertical: 0,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  messageContent: {
    flex: 1,
    flexDirection: 'column',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  senderName: {
    fontSize: 17,
    fontWeight: '700',
  },
  messageText: {
    fontSize: 14,
    width: width * 0.65,
  },
  messageTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  onlineIndicatorAvatar: {
    width: 12,
    height: 12,
    borderRadius: 6,
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
  },
  separator: {
    height: 1,
    marginLeft: 0,
  },
  composeButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  listContainer: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  }
});

export default MessagesScreen; 