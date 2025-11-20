
import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import {ArrowLeft} from "lucide-react-native"

export default function Layout() {
  const router = useRouter();
  return <Stack screenOptions={{headerShown: true}} >
    <Stack.Screen name="(tabs)" options={{headerShown: false}} />
    <Stack.Screen name="menuItem" options={{title: "Menu Items", headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()} style={{paddingHorizontal: 10}} ><ArrowLeft /></TouchableOpacity>
         ),headerShown: false,}} />
    <Stack.Screen name="tables" options={{title: "Tables", headerLeft: () => (
      <TouchableOpacity onPress={() =>{
        console.log("Navigate back");
        
         router.back()
      }} style={{paddingHorizontal: 10}} ><ArrowLeft /></TouchableOpacity>
    ), headerShown: false}} />
    <Stack.Screen name="orders" options={{title: "Orders", headerLeft: () => (
      <TouchableOpacity onPress={() => router.back()} style={{paddingHorizontal: 10}} ><ArrowLeft /></TouchableOpacity>
    ), headerShown: false}} />
  </Stack>;
}