import { NextDesignSystemProvider } from '@dappermountain/design-system'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>{process.env.NODE_ENV === 'production' && <link rel="stylesheet" href="/styles.css" />}</head>
      <body>
        <NextDesignSystemProvider>{children}</NextDesignSystemProvider>
      </body>
    </html>
  )
}
