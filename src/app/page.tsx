'use client'

import { useEffect, useState } from 'react'
import { useTelegram } from '@/hooks/useTelegram'
import { useChildren } from '@/hooks/useSupabase'
import { useAutoTheme } from '@/hooks/useAutoTheme'
import Card from '@/components/ui/Card'
import WelcomeScreen from '@/components/WelcomeScreen'
import AddChildForm from '@/components/AddChildForm'
import EditChildForm from '@/components/EditChildForm'
import MainScreen from '@/components/MainScreen'
import ClientOnly from '@/components/ClientOnly'
import { Child } from '@/lib/supabase'

function AppContent() {
  const { isReady } = useTelegram()
  const { children, loading } = useChildren()
  const [currentView, setCurrentView] = useState<'welcome' | 'add-child' | 'edit-child' | 'main'>('welcome')
  const [editingChild, setEditingChild] = useState<Child | null>(null)
  
  // Automatically detect and apply appropriate theme
  useAutoTheme()

  useEffect(() => {
    if (isReady && !loading) {
      if (children.length === 0) {
        setCurrentView('welcome')
      } else {
        setCurrentView('main')
      }
    }
  }, [isReady, loading, children.length])

  if (!isReady || loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
        <Card className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-300 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      {currentView === 'welcome' && (
        <WelcomeScreen onAddChild={() => setCurrentView('add-child')} />
      )}
      
      {currentView === 'add-child' && (
        <AddChildForm 
          onBack={() => setCurrentView(children.length > 0 ? 'main' : 'welcome')}
          onSuccess={() => setCurrentView('main')}
        />
      )}
      
      {currentView === 'edit-child' && editingChild && (
        <EditChildForm 
          child={editingChild}
          onBack={() => setCurrentView('main')}
          onSuccess={() => setCurrentView('main')}
        />
      )}
      
      {currentView === 'main' && (
        <MainScreen 
          onAddChild={() => setCurrentView('add-child')}
          onEditChild={(child) => {
            setEditingChild(child)
            setCurrentView('edit-child')
          }}
        />
      )}
    </div>
  )
}

export default function Home() {
  return (
    <ClientOnly
      fallback={
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
          <Card className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-300 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </Card>
        </div>
      }
    >
      <AppContent />
    </ClientOnly>
  )
}