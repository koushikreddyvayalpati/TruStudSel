/**
 * Tests for the Jest setup
 */

describe('Setup Jest', () => {
  it('should mock navigation hooks', () => {
    const { useNavigation } = require('@react-navigation/native');
    const navigation = useNavigation();
    expect(navigation.navigate).toBeDefined();
    expect(navigation.goBack).toBeDefined();
  });

  it('should mock AsyncStorage', () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    expect(AsyncStorage.setItem).toBeDefined();
    expect(AsyncStorage.getItem).toBeDefined();
  });
}); 