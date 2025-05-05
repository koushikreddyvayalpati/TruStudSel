# TruStudSel App

A marketplace application for students to buy, sell and exchange items within their university community.

## Project Structure

```
TruStudSel/
├── android/                # Android native code
├── ios/                    # iOS native code
├── src/                    # Source files
│   ├── api/                # API services and endpoints
│   │   ├── config.ts       # API configuration
│   │   ├── auth.ts         # Authentication API methods
│   │   ├── products.ts     # Products API methods
│   │   └── index.ts        # API exports
│   ├── assets/             # Static assets
│   │   ├── images/         # Image files
│   │   ├── fonts/          # Font files
│   │   └── icons/          # Icon files
│   ├── components/         # Reusable components
│   │   ├── common/         # Common components (buttons, inputs, etc.)
│   │   ├── layout/         # Layout components
│   │   └── screens/        # Screen-specific components
│   ├── constants/          # Constants and configuration
│   │   ├── colors.ts       # Color definitions
│   │   ├── typography.ts   # Typography definitions
│   │   └── index.ts        # Constants exports
│   ├── contexts/           # React context providers
│   │   ├── AuthContext.tsx # Authentication context
│   │   └── index.ts        # Context exports
│   ├── hooks/              # Custom React hooks
│   │   ├── useAuth.ts      # Authentication hook
│   │   └── index.ts        # Hooks exports
│   ├── navigation/         # Navigation configuration
│   │   ├── AppNavigator.tsx # Main navigation
│   │   ├── AuthNavigator.tsx # Auth-related navigation
│   │   ├── types.ts        # Navigation types
│   │   └── index.ts        # Navigation exports
│   ├── screens/            # Screen components
│   │   ├── auth/           # Authentication screens
│   │   ├── home/           # Home-related screens
│   │   ├── profile/        # Profile-related screens
│   │   ├── messages/       # Messaging screens
│   │   └── products/       # Product-related screens
│   ├── services/           # Business logic services
│   │   ├── auth/           # Authentication services
│   │   └── products/       # Product services
│   ├── types/              # TypeScript type definitions
│   │   ├── api.types.ts    # API related types
│   │   ├── navigation.types.ts # Navigation types
│   │   └── index.ts        # Type exports
│   ├── utils/              # Utility functions
│   │   ├── format.ts       # Formatting utilities
│   │   ├── validation.ts   # Validation utilities
│   │   └── index.ts        # Utilities exports
│   ├── App.tsx             # Main App component
│   └── index.ts            # Entry point
├── .eslintrc.js            # ESLint configuration
├── .gitignore              # Git ignore configuration
├── .prettierrc.js          # Prettier configuration
├── app.json                # React Native app configuration
├── babel.config.js         # Babel configuration
├── index.js                # React Native entry point
├── jest.config.js          # Jest configuration
├── package.json            # NPM package configuration
├── tsconfig.json           # TypeScript configuration
└── README.md               # Project documentation
```

## Setup and Development

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- React Native CLI
- XCode (for iOS development)
- Android Studio (for Android development)
- AWS Account (for Amplify services)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/TruStudSel.git
   cd TruStudSel
   ```

2. Install dependencies:
   ```
   yarn install
   ```

3. Install Pods (for iOS):
   ```
   cd ios && pod install && cd ..
   ```

4. Setup AWS Amplify:
   ```
   amplify init
   ```

### Running the App

#### iOS

```
yarn ios
```

#### Android

```
yarn android
```

### Development Practices

- Follow the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Use TypeScript for type safety
- Write unit tests for business logic
- Use Prettier for code formatting
- Use ESLint for code linting

## Features

- User authentication (sign up, sign in, password reset)
- Product listing and browsing
- Messaging between users
- User profiles
- Wishlist functionality
- Product search and filtering

## Architecture

This app follows a clean architecture approach with a focus on separation of concerns:

- **Presentation Layer**: React components, screens, and navigation
- **Domain Layer**: Business logic in services and contexts
- **Data Layer**: API services, local storage, and data management

## Guest Browsing

TruStudSel now supports guest browsing, allowing users to access non-account based features without requiring registration. Specifically:

- Users can browse products and view product details without logging in
- Account-based features (adding to cart, contacting sellers, adding to wishlist, etc.) still require registration
- Users are prompted to sign in when trying to access account-based features
- The app provides a clear "Sign In" button for guests to easily register or login

This implementation complies with app store guidelines requiring that apps only request user registration for account-based features.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
