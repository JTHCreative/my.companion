import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { HomeScreen } from '../screens/HomeScreen';
import { AddEditPetScreen } from '../screens/AddEditPetScreen';
import { ScheduleScreen } from '../screens/ScheduleScreen';
import { MealsScreen } from '../screens/MealsScreen';
import { MedicalScreen } from '../screens/MedicalScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();

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
    </HomeStack.Navigator>
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
            backgroundColor: theme.colors.tabBar,
            borderTopColor: theme.colors.border,
            paddingBottom: 8,
            paddingTop: 8,
            height: 88,
          },
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
    </NavigationContainer>
  );
}
