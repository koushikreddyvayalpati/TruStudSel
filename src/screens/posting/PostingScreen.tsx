import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { PostingScreenProps } from '../../types/navigation.types';
import { useTheme } from '../../hooks';
import { TextInput } from '../../components/common';

const PostingScreen: React.FC<PostingScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const [image, setImage] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [age, setAge] = useState('');
  const [isSell, setIsSell] = useState(true);

  const handleImageUpload = () => {
    // Logic for image upload (e.g., using an image picker)
    // For now, we'll just simulate it
    setImage('https://via.placeholder.com/300'); // Placeholder image URL
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Icon name="chevron-left" size={20} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Upload Item</Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.imageUpload, { borderColor: theme.colors.border }]} 
            onPress={handleImageUpload}
          >
            {image ? (
              <Image source={{ uri: image }} style={styles.image} />
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Icon name="camera" size={40} color={theme.colors.primary} />
                <Text style={[styles.uploadText, { color: theme.colors.textSecondary }]}>
                  Tap to upload image
                </Text>
              </View>
            )}
          </TouchableOpacity>
          
          <View style={styles.toggleContainer}>
            <TouchableOpacity 
              style={[
                styles.toggleButton, 
                { backgroundColor: isSell ? theme.colors.primary : theme.colors.surface }
              ]} 
              onPress={() => setIsSell(true)}
            >
              <Text style={[
                styles.toggleText, 
                { color: isSell ? theme.colors.buttonText : theme.colors.text }
              ]}>
                Sell
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.toggleButton, 
                { backgroundColor: !isSell ? theme.colors.primary : theme.colors.surface }
              ]} 
              onPress={() => setIsSell(false)}
            >
              <Text style={[
                styles.toggleText, 
                { color: !isSell ? theme.colors.buttonText : theme.colors.text }
              ]}>
                Rent
              </Text>
            </TouchableOpacity>
          </View>
          
          <TextInput
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="Enter item title"
            containerStyle={styles.inputContainer}
          />
          
          <TextInput
            label="Type"
            value={type}
            onChangeText={setType}
            placeholder="Enter item type (e.g., Electronics, Books)"
            containerStyle={styles.inputContainer}
          />
          
          <TextInput
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your item"
            multiline
            textAlignVertical="top"
            containerStyle={styles.textAreaContainer}
            inputStyle={styles.textArea}
          />
          
          <TextInput
            label="Price"
            value={price}
            onChangeText={setPrice}
            placeholder="Enter price in $"
            keyboardType="numeric"
            containerStyle={styles.inputContainer}
          />
          
          <TextInput
            label="Condition"
            value={age}
            onChangeText={setAge}
            placeholder="How old is this item?"
            containerStyle={styles.inputContainer}
          />
          
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.buttonText, { color: theme.colors.buttonText }]}>
              Post Item
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  backButton: {
    padding: 10,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  imageUpload: {
    height: 200,
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    marginTop: 10,
    fontSize: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  textAreaContainer: {
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  toggleButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  toggleText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  button: {
    height: 55,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PostingScreen; 