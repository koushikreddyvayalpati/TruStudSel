/**
 * Navigation Types
 */
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';

// Auth Stack Param List
export type AuthStackParamList = {
  GetStarted: undefined;
  Onboarding: undefined;
  SignIn: undefined;
  SignUp: undefined;
  EmailVerification: { email: string };
  OtpInput: { email: string; name?: string; phoneNumber?: string; tempPassword?: string };
  ProfileFillingPage: { email: string; username: string };
  ForgotPassword: undefined;
};

// Main App Stack Param List
export type MainStackParamList = {
  Home: undefined;
  Profile: undefined;
  EditProfile: undefined;
  MessagesScreen: undefined;
  MessageScreen: { conversationId: string; recipientName: string };
  PostingScreen: undefined;
  ProductInfoPage: { 
    product: { 
      id: number; 
      name: string; 
      price: string; 
      image: string;
      description?: string;
      condition?: string;
      type?: string;
      images?: any[];
    } 
  };
  Wishlist: { wishlist: number[] };
};

// Combined Root Stack Param List
export type RootStackParamList = AuthStackParamList & MainStackParamList;

// Navigation props for each screen
export type GetStartedScreenNavigationProp = StackNavigationProp<RootStackParamList, 'GetStarted'>;
export type OnboardingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Onboarding'>;
export type SignInScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SignIn'>;
export type SignUpScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SignUp'>;
export type EmailVerificationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'EmailVerification'>;
export type OtpInputScreenNavigationProp = StackNavigationProp<RootStackParamList, 'OtpInput'>;
export type ProfileFillingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ProfileFillingPage'>;
export type ForgotPasswordScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ForgotPassword'>;

// Extended Navigation Type for Home Screen with drawer functionality
export type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'> & DrawerNavigationProp<any>;

export type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Profile'>;
export type EditProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'EditProfile'>;
export type MessagesScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MessagesScreen'>;
export type MessageScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MessageScreen'>;
export type PostingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'PostingScreen'>;
export type ProductInfoScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ProductInfoPage'>;
export type WishlistScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Wishlist'>;

// Route props for screens with parameters
export type EmailVerificationScreenRouteProp = RouteProp<RootStackParamList, 'EmailVerification'>;
export type OtpInputScreenRouteProp = RouteProp<RootStackParamList, 'OtpInput'>;
export type ProfileFillingScreenRouteProp = RouteProp<RootStackParamList, 'ProfileFillingPage'>;
export type MessageScreenRouteProp = RouteProp<RootStackParamList, 'MessageScreen'>;
export type ProductInfoScreenRouteProp = RouteProp<RootStackParamList, 'ProductInfoPage'>;
export type WishlistScreenRouteProp = RouteProp<RootStackParamList, 'Wishlist'>;

// Combine navigation and route props for screens with parameters
export type EmailVerificationScreenProps = {
  navigation: EmailVerificationScreenNavigationProp;
  route: EmailVerificationScreenRouteProp;
};

export type OtpInputScreenProps = {
  navigation: OtpInputScreenNavigationProp;
  route: OtpInputScreenRouteProp;
};

export type ProfileFillingScreenProps = {
  navigation: ProfileFillingScreenNavigationProp;
  route: ProfileFillingScreenRouteProp;
};

export type MessageScreenProps = {
  navigation: MessageScreenNavigationProp;
  route: MessageScreenRouteProp;
};

export type PostingScreenProps = {
  navigation: PostingScreenNavigationProp;
  route: RouteProp<RootStackParamList, 'PostingScreen'>;
};

export type ProductInfoScreenProps = {
  navigation: ProductInfoScreenNavigationProp;
  route: ProductInfoScreenRouteProp;
};

export type WishlistScreenProps = {
  navigation: WishlistScreenNavigationProp;
  route: WishlistScreenRouteProp;
}; 