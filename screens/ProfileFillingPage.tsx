import React from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const ProfileFillingPage = () => {
  const navigation = useNavigation();
  const [name, setName] = React.useState('');
  const [university, setUniversity] = React.useState('');
  const [preferredCategory, setPreferredCategory] = React.useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>You Are Almost Done</Text>
      <Text style={styles.subtitle}>Please fill in the following details</Text>
      <TextInput 
        style={styles.input}
        placeholder="Name"
        value={name}
        onChangeText={setName}
      />
      
      <TextInput 
        style={styles.input}
        placeholder="University"
        value={university}
        onChangeText={setUniversity}
      />
      
      <TextInput 
        style={styles.input}
        placeholder="Prefer Categories"
        value={preferredCategory}
        onChangeText={setPreferredCategory}
      />
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => {
          console.log('Next button pressed');
          // Handle next button logic here
          navigation.navigate('Home');
        }}
      >
        <Text style={styles.buttonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#f7b305',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
});

export default ProfileFillingPage; 