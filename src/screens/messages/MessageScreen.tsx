import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute, RouteProp, NavigationProp } from '@react-navigation/native';
import { MainStackParamList } from '../../types/navigation.types';

interface MessageItem {
  id: string;
  time: string;
  text: string;
  sender: 'me' | 'friend';
}

type MessageScreenRouteProp = RouteProp<MainStackParamList, 'MessageScreen'>;

const MessageScreen = () => {
  const navigation = useNavigation<NavigationProp<MainStackParamList>>();
  const route = useRoute<MessageScreenRouteProp>();
  const [messageText, setMessageText] = useState('');
  
  const { recipientName } = route.params;

  // Sample messages data
  const messages: MessageItem[] = [
    { id: '1', time: '10:30 PM', text: 'Is it available?', sender: 'me' },
    { id: '2', time: '10:38 PM', text: 'Yes, it is available', sender: 'friend' },
    { id: '3', time: '07:00 PM', text: 'Is there any discount?', sender: 'friend' },
    { id: '4', time: '10:30 PM', text: 'No, there is no discount', sender: 'me' },
  ];

  const sendMessage = () => {
    if (messageText.trim()) {
      console.log('Sending message:', messageText);
      setMessageText('');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#f0f0f0' }]}>
      <View style={[styles.header, { backgroundColor: '#f7b305' }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          testID="back-button"
        >
          <Ionicons name="chevron-back" size={22} color="black" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: "black" }]}>{recipientName}</Text>
        <TouchableOpacity 
          style={styles.callButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Icon name="home" size={20} color="black" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={messages}
        renderItem={({ item }) => (
          <View 
            style={[
              styles.messageContainer,
              { 
                justifyContent: item.sender === 'me' ? 'flex-end' : 'flex-start' 
              }
            ]}
          >
            {item.sender === 'friend' && (
              <View style={[styles.profileCircle, { backgroundColor: '#e0e0e0' }]}>
                <Text style={[styles.profileInitial, { color: 'black' }]}>
                  {recipientName.charAt(0)}
                </Text>
              </View>
            )}
            <View 
              style={[
                item.sender === 'me' 
                  ? [styles.myMessage, { backgroundColor: '#f7b305' }]
                  : [styles.friendMessage, { backgroundColor: 'white' }],
                { 
                  marginLeft: item.sender === 'me' ? 60 : 0,
                  marginRight: item.sender === 'friend' ? 60 : 0
                }
              ]}
            >
              <Text style={[
                styles.messageText, 
                { color: 'black' }
              ]}>
                {item.text}
              </Text>
              <Text 
                style={[
                  styles.messageTime,
                  { 
                    marginTop: 4,
                    color: item.sender === 'me' ? '#666' : 'gray'
                  }
                ]}
              >
                {item.time}
              </Text>
            </View>
          </View>
        )}
        keyExtractor={item => item.id}
        style={styles.messageList}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <View style={[styles.inputContainer, { backgroundColor: 'white' }]}>
        <TextInput 
          style={[styles.input, { 
            borderColor: '#ddd', 
            color: 'black',
            backgroundColor: 'white'
          }]}
          placeholder="Type a message..."
          placeholderTextColor="gray"
          value={messageText}
          onChangeText={setMessageText}
        />
        <TouchableOpacity 
          style={[styles.sendButton, { backgroundColor: '#f7b305' }]}
          onPress={sendMessage}
        >
          <Icon name="paper-plane" size={20} color="black" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 5,
  },
  callButton: {
    padding: 5,
  },
  messageList: {
    padding: 10,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 5,
  },
  profileCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  profileInitial: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  myMessage: {
    borderRadius: 10,
    padding: 10,
    maxWidth: '80%',
    alignSelf: 'flex-end',
    marginLeft: 30,
  },
  friendMessage: {
    borderRadius: 10,
    padding: 10,
    maxWidth: '80%',
    alignSelf: 'flex-start',
    marginRight: 30,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingBottom: 20,
    borderRadius: 20,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    padding: 10,
    marginRight: 10,
  },
  sendButton: {
    borderRadius: 20,
    padding: 10,
  },
});

export default MessageScreen; 