import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  Image 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';

const PostingScreen = () => {
  const navigation = useNavigation();
  const [image, setImage] = useState(null);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [age, setAge] = useState('');
  const [isSell, setIsSell] = useState(true);

  const handleImageUpload = () => {
    // Logic for image upload (e.g., using an image picker)
    // For now, we'll just simulate it
    setImage('path/to/image'); // Replace with actual image path
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={20} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Upload Image</Text>
      </View>
      
      <TouchableOpacity style={styles.imageUpload} onPress={handleImageUpload}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} />
        ) : (
          <Text style={styles.uploadText}>Tap to upload image</Text>
        )}
      </TouchableOpacity>
      
      <View style={styles.toggleContainer}>
        <TouchableOpacity 
          style={[styles.toggleButton, isSell && styles.activeToggle]} 
          onPress={() => setIsSell(true)}
        >
          <Text style={styles.toggleText}>Sell</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.toggleButton, !isSell && styles.activeToggle]} 
          onPress={() => setIsSell(false)}
        >
          <Text style={styles.toggleText}>Rent</Text>
        </TouchableOpacity>
      </View>
      
      <TextInput 
        style={styles.input}
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
      />
      
      <TextInput 
        style={styles.input}
        placeholder="Price"
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
      />
      
      <TextInput 
        style={styles.input}
        placeholder="How much old"
        value={age}
        onChangeText={setAge}
      />
      
      <TextInput 
        style={styles.input}
        placeholder="Title"
        value={title}
        onChangeText={setTitle}
      />
      
      <TextInput 
        style={styles.input}
        placeholder="Type"
        value={type}
        onChangeText={setType}
      />
      
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop:50,
    justifyContent: 'flex-start',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    marginLeft: 15,
    color: '#333',
  },
  imageUpload: {
    height: 200,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 5,
  },
  uploadText: {
    color: '#999',
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    backgroundColor: '#ffffff',
    fontSize: 16,
    color: '#333',
  },
  inputPlaceholder: {
    color: '#aaa',
  },
  button: {
    backgroundColor: '#f7b305',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  toggleButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    marginRight: 10,
  },
  activeToggle: {
    backgroundColor: '#f7b305',
  },
  toggleText: {
    fontWeight: 'bold',
    color: '#333',
  },
});

export default PostingScreen; 