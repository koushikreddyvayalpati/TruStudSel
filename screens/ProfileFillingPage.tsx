import React from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const ProfileFillingPage = ({route}:{route:any}) => {
  const {email,name} = route.params;
  const navigation = useNavigation();
  const [university, setUniversity] = React.useState('');
  const [preferredCategory, setPreferredCategory] = React.useState('');
  const [dob, setDob] = React.useState('');
  const [profilePic, setProfilePic] = React.useState(null);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>You Are Almost Done</Text>
      <Text style={styles.subtitle}>Please fill in the following details</Text>
      <TextInput 
        style={styles.input}
        placeholder="Name"
        value={name}
        editable={false}
      />
      <TextInput 
        style={styles.input}
        placeholder="Email"
        value={email}
        editable={false}
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
      
      <TextInput 
        style={styles.input}
        placeholder="Date of Birth"
        value={dob}
        onChangeText={setDob}
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
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => {
          // Logic to upload profile picture
          console.log('Upload profile picture pressed');
        }}
      >
        <Text style={styles.buttonText}>Upload Profile Picture</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 30,
    justifyContent: 'center',
    backgroundColor: '#f0f4f8',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  input: {
    height: 55,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#ff9800',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
});

export default ProfileFillingPage; 