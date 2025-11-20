import { StyleSheet, View, ViewStyle } from 'react-native';
import {  useSafeAreaInsets } from 'react-native-safe-area-context';

export const Container = ({ 
  children, 
  style 
}: { 
  children: React.ReactNode;
  style?: ViewStyle;
}) => {
  const {top} = useSafeAreaInsets()
  return <View style={[styles.container, { paddingTop: top }, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // padding: 24,
    // paddingVertical:8,
    backgroundColor: 'white',
  },
});
