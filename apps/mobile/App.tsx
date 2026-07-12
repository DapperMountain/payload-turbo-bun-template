import './src/global.css'

import { StatusBar } from 'expo-status-bar'
import { Text, View } from 'react-native'

import { Button } from './src/components/ui/button'

export default function App() {
  return (
    <View className="flex-1 items-center justify-center gap-6 bg-background px-6">
      <Text className="text-center text-2xl font-semibold text-foreground">Accounting for Life</Text>
      <Text className="text-center text-base text-muted-foreground">
        Mobile spike — Uniwind + React Native Reusables-style components
      </Text>
      <Button label="Open budget" />
      <Button label="Secondary action" variant="outline" />
      <StatusBar style="auto" />
    </View>
  )
}
