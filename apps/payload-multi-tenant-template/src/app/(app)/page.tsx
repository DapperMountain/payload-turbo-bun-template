'use client'
import { Button } from '@dappermountain/design-system'
import type { NextPage } from 'next'

const Home: NextPage = () => {
  return (
    <div className="p-8">
      <h1 className="text-2xl mb-4">Welcome to the site!</h1>
      <Button label="Click Me" onClick={() => alert('Button clicked!')} />
    </div>
  )
}

export default Home
