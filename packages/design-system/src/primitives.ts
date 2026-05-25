import './tamagui.config'

import {
  Button as TamaguiButton,
  H1 as TamaguiH1,
  Paragraph as TamaguiParagraph,
  Separator as TamaguiSeparator,
  Text as TamaguiText,
  XStack as TamaguiXStack,
  YStack as TamaguiYStack,
} from 'tamagui'

import { asStyled } from './types'

export const Button = asStyled(TamaguiButton)
export const YStack = asStyled(TamaguiYStack)
export const XStack = asStyled(TamaguiXStack)
export const H1 = asStyled(TamaguiH1)
export const Paragraph = asStyled(TamaguiParagraph)
export const Separator = asStyled(TamaguiSeparator)
export const Text = asStyled(TamaguiText)

/** Vertical stack — default layout primitive for pages and sections. */
export const Stack = YStack

/** Horizontal stack — rows of controls or inline groups. */
export const Row = XStack

export const PageTitle = H1
export const Body = Paragraph
export const Divider = Separator
export const Label = Text
