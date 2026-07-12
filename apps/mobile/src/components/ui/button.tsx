import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { Pressable, Text, type PressableProps } from 'react-native'

import { cn } from '../lib/utils'

const buttonVariants = cva(
  'group flex flex-row items-center justify-center rounded-md',
  {
    variants: {
      variant: {
        default: 'bg-primary active:opacity-90',
        outline: 'border border-border bg-background active:bg-accent',
        secondary: 'bg-secondary active:opacity-80',
        ghost: 'active:bg-accent',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

const buttonTextVariants = cva('text-sm font-medium', {
  variants: {
    variant: {
      default: 'text-primary-foreground',
      outline: 'text-foreground',
      secondary: 'text-secondary-foreground',
      ghost: 'text-foreground',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

export type ButtonProps = PressableProps &
  VariantProps<typeof buttonVariants> & {
    label: string
  }

/** React Native Reusables-style button spike (Uniwind + Tailwind classes). */
export function Button({ className, variant, size, label, ...props }: ButtonProps) {
  return (
    <Pressable className={cn(buttonVariants({ variant, size, className }))} {...props}>
      <Text className={cn(buttonTextVariants({ variant }))}>{label}</Text>
    </Pressable>
  )
}
