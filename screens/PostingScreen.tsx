import React from 'react';
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
  const [image, setImage] = React.useState(null);
  const [title, setTitle] = React.useState('');
  const [type, setType] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [age, setAge] = React.useState('');

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
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  imageUpload: {
    height: 150,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    marginBottom: 15,
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

export default PostingScreen; 