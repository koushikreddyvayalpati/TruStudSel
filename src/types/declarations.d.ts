/**
 * Global declarations for external modules
 */

// Fix for react-native-vector-icons
declare module 'react-native-vector-icons/FontAwesome';
declare module 'react-native-vector-icons/EvilIcons';
declare module 'react-native-vector-icons/Entypo';
declare module 'react-native-vector-icons/MaterialIcons';
declare module 'react-native-vector-icons/MaterialCommunityIcons';
declare module 'react-native-vector-icons/Ionicons';
declare module 'react-native-vector-icons/Feather';
declare module 'react-native-vector-icons/AntDesign';

// Allow importing images
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.webp';
declare module '*.svg';

// Allow importing CSS modules
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

// React Navigation types for deep linking
import { AuthStackParamList, MainStackParamList } from './navigation.types';

declare global {
  namespace ReactNavigation {
    // Merge all navigator params into the root
    interface RootParamList extends AuthStackParamList, MainStackParamList {}
  }
}
