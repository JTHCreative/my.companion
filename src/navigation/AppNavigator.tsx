import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { HomeScreen } from '../screens/HomeScreen';
import { AddEditPetScreen } from '../screens/AddEditPetScreen';
import { ScheduleScreen } from '../screens/ScheduleScreen';
import { MealsScreen } from '../screens/MealsScreen';
import { MedicalScreen } from '../screens/MedicalScreen';
import { SharePetScreen } from '../screens/SharePetScreen';
import { ImportPetScreen } from '../screens/ImportPetScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen
        name="AddPet"
        component={AddEditPetScreen}
        options={{ presentation: 'modal' }}
      />
      <HomeStack.Screen
        name="EditPet"
        component={AddEditPetScreen}
        options={{ presentation: 'modal' }}
      />
      <HomeStack.Screen
        name="SharePet"
        component={SharePetScreen}
        options={{ presentation: 'modal' }}
      />
      <HomeStack.Screen
        name="ImportPet"
        component={ImportPetScreen}
        options={{ presentation: 'modal' }}
      />
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
    </Tab.Navigator>
  );
}

export function AppNavigator() {
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
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
        <RootStack.Screen name="Main" component={MainTabs} />
        <RootStack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ presentation: 'modal' }}
        />
      </RootStack.Navigator>
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
