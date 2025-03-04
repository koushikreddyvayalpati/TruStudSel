/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import 'react-native-gesture-handler';
import React from 'react';
import type {PropsWithChildren} from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  SafeAreaView,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StackNavigationProp } from '@react-navigation/stack';

import {
  Colors,
  DebugInstructions,
  Header,
  LearnMoreLinks,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';

// Import screens
import HomeScreen from './screens/Homescreen';
import ProfileScreen from './screens/ProfileScreen';
import BottomNavigation from './components/BottomNavigation';
import ProductInfoPage from './screens/ProductInfoPage';
import MessageScreen from './screens/MessageScreen';
import MessagesScreen from './screens/MessagesScreen';
import GetStartedScreen from './screens/GetStartedScreen';
import SignInPage from './screens/SignInPage';
import EmailVerificationPage from './screens/EmailVerificationPage';
import OtpInputPage from './screens/OtpInputPage';
// Define type for navigation parameters
type RootStackParamList = {
  GetStarted: undefined;
  Home: undefined;
  Profile: undefined;
  ProductInfoPage: { product: { id: number; name: string; price: string; image: string } };
  MessageScreen: undefined;
  MessagesScreen: undefined;
  SignIn: undefined;
  EmailVerification: undefined;
  OtpInput: undefined;
};

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;
type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Profile'>;

// Create stack navigator with our types
const Stack = createStackNavigator<RootStackParamList>();

// Define HomeScreenNav props interface
interface HomeScreenNavProps {
  navigation: HomeScreenNavigationProp;
}

type SectionProps = PropsWithChildren<{
  title: string;
}>;

function Section({children, title}: SectionProps): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <View style={styles.sectionContainer}>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: isDarkMode ? Colors.white : Colors.black,
          },
        ]}>
        {title}
      </Text>
      <Text
        style={[
          styles.sectionDescription,
          {
            color: isDarkMode ? Colors.light : Colors.dark,
          },
        ]}>
        {children}
      </Text>
    </View>
  );
}

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
    flex: 1,
  };

  /*
   * To keep the template simple and small we're adding padding to prevent view
   * from rendering under the System UI.
   * For bigger apps the reccomendation is to use `react-native-safe-area-context`:
   * https://github.com/AppAndFlow/react-native-safe-area-context
   *
   * You can read more about it here:
   * https://github.com/react-native-community/discussions-and-proposals/discussions/827
   */
  const safePadding = '5%';

  return (
    <NavigationContainer>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="#fff"
      />
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          gestureEnabled: false,
        }}
      >
        <Stack.Screen 
          name="GetStarted" 
          component={GetStartedScreen} 
        />
        <Stack.Screen 
          name="Home" 
          component={HomeScreenWithNav}
          options={{ animationEnabled: false }} 
        />
        <Stack.Screen 
          name="Profile" 
          component={ProfileScreen}
          options={{ animationEnabled: true }} 
        />
        <Stack.Screen 
          name="ProductInfoPage" 
          component={ProductInfoPage} 
        />
        <Stack.Screen 
          name="MessageScreen" 
          component={MessageScreen} 
        />
        <Stack.Screen 
          name="MessagesScreen" 
          component={MessagesScreen} 
        />
        <Stack.Screen 
          name="SignIn" 
          component={SignInPage} 
        />
        <Stack.Screen 
          name="EmailVerification" 
          component={EmailVerificationPage} 
        />
        <Stack.Screen 
          name="OtpInput" 
          component={OtpInputPage} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Wrapper component to add bottom navigation to HomeScreen
const HomeScreenWithNav = ({ navigation }: HomeScreenNavProps) => {
  return (
    <View style={styles.container}>
      <HomeScreen navigation={navigation} />
      <BottomNavigation navigation={navigation} />
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
  container: {
    flex: 1,
    position: 'relative',
  },
});

export default App;
