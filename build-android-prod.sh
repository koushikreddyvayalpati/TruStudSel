#!/bin/bash

# TruStudSel Production Build Script for Android
# ----------------------------------------------------------

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}TruStudSel Android Production Build Starting${NC}"
echo -e "${YELLOW}------------------------------------------------${NC}"

# 1. Set environment variables for keystore
# You can either set these permanently in your environment or enter them here
if [ -z "$TRUSTUDSEL_STORE_PASSWORD" ]; then
  echo -e "${YELLOW}Enter keystore password:${NC}"
  read -s TRUSTUDSEL_STORE_PASSWORD
  export TRUSTUDSEL_STORE_PASSWORD
fi

if [ -z "$TRUSTUDSEL_KEY_PASSWORD" ]; then
  echo -e "${YELLOW}Enter key password:${NC}"
  read -s TRUSTUDSEL_KEY_PASSWORD
  export TRUSTUDSEL_KEY_PASSWORD
fi

if [ -z "$TRUSTUDSEL_KEY_ALIAS" ]; then
  export TRUSTUDSEL_KEY_ALIAS="trustudsel-key"
fi

# 2. Clean the project
echo -e "${GREEN}Cleaning the project...${NC}"
cd android && ./gradlew clean && cd ..

# 3. Remove old build artifacts
echo -e "${GREEN}Removing old build outputs...${NC}"
rm -rf android/app/build/outputs/apk/release
rm -rf android/app/build/outputs/bundle/release

# 4. Build for the desired target
echo -e "${YELLOW}What type of build do you want to create?${NC}"
echo "1. APK (for direct installation)"
echo "2. AAB (for Google Play Store)"

read -p "Enter your choice (1 or 2): " BUILD_CHOICE

if [ "$BUILD_CHOICE" == "1" ]; then
  echo -e "${GREEN}Building release APK...${NC}"
  cd android && ./gradlew assembleRelease
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}APK build successful!${NC}"
    echo -e "${GREEN}APK location: android/app/build/outputs/apk/release/app-release.apk${NC}"
  else
    echo -e "${RED}APK build failed!${NC}"
    exit 1
  fi
  
elif [ "$BUILD_CHOICE" == "2" ]; then
  echo -e "${GREEN}Building release AAB bundle...${NC}"
  cd android && ./gradlew bundleRelease
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}AAB build successful!${NC}"
    echo -e "${GREEN}AAB location: android/app/build/outputs/bundle/release/app-release.aab${NC}"
  else
    echo -e "${RED}AAB build failed!${NC}"
    exit 1
  fi
  
else
  echo -e "${RED}Invalid choice. Exiting.${NC}"
  exit 1
fi

# 5. Check if we should run verification
echo -e "${YELLOW}Do you want to verify the APK with APK Analyzer? (y/n)${NC}"
read -p "Your choice: " VERIFY_CHOICE

if [ "$VERIFY_CHOICE" == "y" ]; then
  if [ -x "$(command -v bundletool)" ]; then
    echo -e "${GREEN}Verifying build...${NC}"
    if [ "$BUILD_CHOICE" == "1" ]; then
      bundletool validate --bundle=android/app/build/outputs/apk/release/app-release.apk
    else
      bundletool validate --bundle=android/app/build/outputs/bundle/release/app-release.aab
    fi
  else
    echo -e "${YELLOW}Bundletool not installed. Skipping verification.${NC}"
    echo -e "${YELLOW}To install: 'brew install bundletool'${NC}"
  fi
fi

echo -e "${GREEN}Build process completed!${NC}"
echo -e "${YELLOW}Remember to test your production build thoroughly before distribution.${NC}"
