import React, { useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { HomeScreen } from '../screens/HomeScreen';
import { AddEditPetScreen } from '../screens/AddEditPetScreen';
import { ScheduleScreen } from '../screens/ScheduleScreen';
import { MealsScreen } from '../screens/MealsScreen';
import { MedicalScreen } from '../screens/MedicalScreen';
import { MessagesScreen } from '../screens/MessagesScreen';
import { SharePetScreen } from '../screens/SharePetScreen';
import { ImportPetScreen } from '../screens/ImportPetScreen';
import { AddPetChoiceScreen } from '../screens/AddPetChoiceScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SignInScreen } from '../screens/SignInScreen';
import { SignUpScreen } from '../screens/SignUpScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

function HomeStackNavigator() {
  const { theme } = useTheme();
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
    </HomeStack.Navigator>
  );
}

function MainTabs() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;
  const gradientHeight = tabBarHeight + 20;

  const tabBarColor = theme.colors.tabBar;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'HomeTab':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'ScheduleTab':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'MealsTab':
              iconName = focused ? 'restaurant' : 'restaurant-outline';
              break;
            case 'MedicalTab':
              iconName = focused ? 'medkit' : 'medkit-outline';
              break;
            case 'MessagesTab':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            default:
              iconName = 'ellipsis-horizontal';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          position: 'absolute',
          elevation: 0,
          paddingBottom: bottomPadding,
          paddingTop: 8,
          height: tabBarHeight,
        },
        tabBarBackground: () => (
          <LinearGradient
            colors={['transparent', tabBarColor]}
            locations={[0, 0.45]}
            style={[navStyles.tabBarGradient, { height: gradientHeight }]}
          />
        ),
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="ScheduleTab"
        component={ScheduleScreen}
        options={{ tabBarLabel: 'Schedule' }}
      />
      <Tab.Screen
        name="MealsTab"
        component={MealsScreen}
        options={{ tabBarLabel: 'Meals' }}
      />
      <Tab.Screen
        name="MedicalTab"
        component={MedicalScreen}
        options={{ tabBarLabel: 'Medical' }}
      />
      <Tab.Screen
        name="MessagesTab"
        component={MessagesScreen}
        options={{ tabBarLabel: 'Messages' }}
      />
    </Tab.Navigator>
  );
}

function AuthFlow() {
  const [screen, setScreen] = useState<'signIn' | 'signUp'>('signIn');

  if (screen === 'signUp') {
    return <SignUpScreen onGoToSignIn={() => setScreen('signIn')} />;
  }
  return <SignInScreen onGoToSignUp={() => setScreen('signUp')} />;
}

function MainApp() {
  const { theme } = useTheme();
  const { loading } = useData();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Tabs" component={MainTabs} />
      <RootStack.Screen
        name="AddPetChoice"
        component={AddPetChoiceScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <RootStack.Screen
        name="AddPet"
        component={AddEditPetScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <RootStack.Screen
        name="EditPet"
        component={AddEditPetScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <RootStack.Screen
        name="SharePet"
        component={SharePetScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <RootStack.Screen
        name="ImportPet"
        component={ImportPetScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <RootStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
    </RootStack.Navigator>
  );
}

export function AppNavigator() {
  const { theme, isDark } = useTheme();
  const { user, initializing } = useAuth();

  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.colors.background,
      card: theme.colors.card,
      text: theme.colors.text,
      border: theme.colors.border,
      primary: theme.colors.primary,
    },
  };

  if (initializing) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {user ? <MainApp /> : <AuthFlow />}
    </NavigationContainer>
  );
}

const navStyles = StyleSheet.create({
  tabBarGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
