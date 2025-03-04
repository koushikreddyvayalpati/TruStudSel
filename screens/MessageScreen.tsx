import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

const { width } = Dimensions.get('window');

const MessageScreen = ({ navigation }) => {
  // Sample messages data
  const messages = [
    { id: '1', time: '10:30 PM', text: 'Is it available?', sender: 'me' },
    { id: '2', time: '10:38 PM', text: 'Yes, it is available', sender: 'friend' },
    { id: '3', time: '07:00 PM', text: 'Is there any discount?', sender: 'friend' },
    { id: '4', time: '10:30 PM', text: 'No, there is no discount', sender: 'me' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Icon name="arrow-left" size={20} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fauziah</Text>
        <TouchableOpacity 
          style={styles.callButton}
          onPress={() => {
            console.log('Navigating to Home');
            navigation.navigate('Home');
          }}
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
              <View style={styles.profileCircle}>
                <Text style={styles.profileInitial}>F</Text>
              </View>
            )}
            <View 
              style={[
                item.sender === 'me' ? styles.myMessage : styles.friendMessage,
                { 
                  marginLeft: item.sender === 'me' ? 60 : 0,
                  marginRight: item.sender === 'friend' ? 60 : 0
                }
              ]}
            >
              <Text style={styles.messageText}>{item.text}</Text>
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

      <View style={styles.inputContainer}>
        <TextInput 
          style={styles.input}
          placeholder="Type a message..."
        />
        <TouchableOpacity style={styles.sendButton}>
          <Icon name="paper-plane" size={20} color="black" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  header: {
    marginTop: 50,
    backgroundColor: '#f7b305',
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    color: 'black',
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
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  profileInitial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'black',
  },
  myMessage: {
    backgroundColor: '#f7b305',
    borderRadius: 10,
    padding: 10,
    maxWidth: '80%',
    alignSelf: 'flex-end',
    marginLeft: 30,
  },
  friendMessage: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    maxWidth: '80%',
    alignSelf: 'flex-start',
    marginRight: 30,
  },
  messageText: {
    color: 'black',
    fontSize: 16,  // Added for better readability
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'white',
    marginBottom: 5,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    padding: 10,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#f7b305',
    borderRadius: 20,
    padding: 10,
  },
});

export default MessageScreen; 