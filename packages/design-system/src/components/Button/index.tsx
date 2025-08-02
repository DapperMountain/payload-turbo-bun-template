'use client'
import { clsx } from 'clsx'
import React from 'react'

type ButtonProps = {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

export const Button: React.FC<ButtonProps> = ({ label, onClick, variant = 'primary' }) => {
  return (
    <button
      onClick={onClick}
      className={clsx('px-4 py-2 rounded font-bold text-white', variant === 'primary' ? 'bg-blue-500' : 'bg-gray-500')}
    >
      {label}
    </button>
  )
}
