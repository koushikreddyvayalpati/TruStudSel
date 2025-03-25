# Custom Hooks

This directory contains custom React hooks that provide reusable functionality across the application.

## Available Hooks

### 1. useForm

A comprehensive form management hook that handles form state, validation, and submission.

**Features**:
- Type-safe form values
- Field-level validation
- Form-level validation
- Error handling
- Touched state tracking
- Submission handling

**Example usage**:

```tsx
import { useForm } from '../hooks';

const SignUpForm = () => {
  const { 
    values, 
    errors, 
    touched, 
    handleChange, 
    handleBlur, 
    submitForm, 
    isSubmitting 
  } = useForm({
    initialValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
    },
    validators: {
      email: (value) => (!value ? 'Email is required' : !isValidEmail(value) ? 'Invalid email format' : ''),
      password: (value) => getPasswordValidationError(value),
    },
    onSubmit: async (values) => {
      try {
        await authApi.signUp(values);
        navigation.navigate('EmailVerification', { email: values.email });
      } catch (error) {
        console.error('Sign up failed:', error);
      }
    }
  });

  return (
    <View>
      <TextInput
        label="Email"
        value={values.email}
        onChangeText={handleChange('email')}
        onBlur={handleBlur('email')}
        error={touched.email ? errors.email : ''}
      />
      {/* Other form fields */}
      <Button 
        title="Sign Up" 
        onPress={submitForm} 
        loading={isSubmitting} 
        disabled={isSubmitting} 
      />
    </View>
  );
};
```

### 2. useApi

A hook for making API requests with loading, error, and response state management.

**Features**:
- Loading state tracking
- Error handling
- Response caching
- Request cancelation
- Automatic retries

**Example usage**:

```tsx
import { useApi } from '../hooks';

const ProductsList = () => {
  const { 
    data: products, 
    loading, 
    error, 
    request: fetchProducts 
  } = useApi('/products', 'get', { immediate: true });

  const handleRefresh = () => {
    fetchProducts({ limit: 20 });
  };

  if (loading && !products) {
    return <LoadingIndicator />;
  }

  if (error) {
    return <ErrorView message={error.message} onRetry={handleRefresh} />;
  }

  return (
    <FlatList
      data={products}
      renderItem={({ item }) => <ProductCard product={item} />}
      refreshing={loading}
      onRefresh={handleRefresh}
    />
  );
};
```

### 3. useLocalStorage

A hook for using AsyncStorage with a React state-like interface.

**Features**:
- Load and store state in AsyncStorage
- Type-safe interface
- Automatic JSON serialization/deserialization
- Lazy initialization

**Example usage**:

```tsx
import { useLocalStorage, useLocalStorageObject } from '../hooks';

// Simple value
const ThemeToggle = () => {
  const [darkMode, setDarkMode, loading] = useLocalStorage('@settings:darkMode', false);

  return (
    <Switch
      value={darkMode}
      onValueChange={(value) => setDarkMode(value)}
      disabled={loading}
    />
  );
};

// Object value
const UserPreferences = () => {
  const { 
    value: preferences, 
    updateValue, 
    loading 
  } = useLocalStorageObject('@settings:preferences', {
    notifications: true,
    fontSize: 'medium',
    language: 'en',
  });

  return (
    <View>
      <Text>Notification Settings</Text>
      <Switch
        value={preferences.notifications}
        onValueChange={(value) => updateValue('notifications', value)}
        disabled={loading}
      />
      
      {/* Other settings controls */}
    </View>
  );
};
```

## Future Hooks

Planned hooks for future implementation:

- `useTheme`: For accessing theme values and toggling themes
- `useDebounce`: For debouncing quickly changing values (search inputs, etc.)
- `useTimeout`: For managing timeouts with automatic cleanup 