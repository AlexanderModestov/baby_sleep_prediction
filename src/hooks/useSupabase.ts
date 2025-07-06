import { useEffect, useState, useCallback } from 'react'
import { supabase, Child, SleepSession } from '@/lib/supabase'
import { getUserId } from '@/lib/telegram'

export function useChildren() {
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchChildren()
  }, [])

  const fetchChildren = async () => {
    try {
      setLoading(true)
      const userId = getUserId()

      const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setChildren(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const addChild = async (childData: Omit<Child, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const userId = getUserId()
      
      const { data, error } = await supabase
        .from('children')
        .insert([{ ...childData, user_id: userId }])
        .select()
        .single()

      if (error) throw error
      
      setChildren(prev => [data, ...prev])
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add child')
      throw err
    }
  }

  const updateChild = async (id: string, updates: Partial<Child>) => {
    try {
      const { data, error } = await supabase
        .from('children')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      
      setChildren(prev => prev.map(child => 
        child.id === id ? { ...child, ...data } : child
      ))
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update child')
      throw err
    }
  }

  const deleteChild = async (id: string) => {
    try {
      const { error } = await supabase
        .from('children')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      setChildren(prev => prev.filter(child => child.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete child')
      throw err
    }
  }

  return {
    children,
    loading,
    error,
    addChild,
    updateChild,
    deleteChild,
    refetch: fetchChildren
  }
}

export function useSleepSessions(childId?: string) {
  const [sessions, setSessions] = useState<SleepSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSessions = useCallback(async () => {
    if (!childId) return
    
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('sleep_sessions')
        .select('*')
        .eq('child_id', childId)
        .order('start_time', { ascending: false })

      if (error) throw error
      setSessions(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [childId])

  useEffect(() => {
    if (childId) {
      fetchSessions()
    }
  }, [childId, fetchSessions])

  const startSleepSession = async (sessionData: Omit<SleepSession, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('sleep_sessions')
        .insert([sessionData])
        .select()
        .single()

      if (error) throw error
      
      setSessions(prev => [data, ...prev])
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start sleep session')
      throw err
    }
  }

  const endSleepSession = async (id: string, endTime: string, quality?: string) => {
    try {
      const session = sessions.find(s => s.id === id)
      if (!session) throw new Error('Session not found')

      const startTime = new Date(session.start_time)
      const endTimeDate = new Date(endTime)
      const durationMinutes = Math.floor((endTimeDate.getTime() - startTime.getTime()) / (1000 * 60))

      const { data, error } = await supabase
        .from('sleep_sessions')
        .update({
          end_time: endTime,
          duration_minutes: durationMinutes,
          quality: quality || null,
          is_active: false
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      
      setSessions(prev => prev.map(s => 
        s.id === id ? { ...s, ...data } : s
      ))
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end sleep session')
      throw err
    }
  }

  const updateSleepSession = async (id: string, updates: Partial<SleepSession>) => {
    try {
      const { data, error } = await supabase
        .from('sleep_sessions')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      
      setSessions(prev => prev.map(s => 
        s.id === id ? { ...s, ...data } : s
      ))
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update sleep session')
      throw err
    }
  }

  const deleteSleepSession = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sleep_sessions')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      setSessions(prev => prev.filter(s => s.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete sleep session')
      throw err
    }
  }

  return {
    sessions,
    loading,
    error,
    startSleepSession,
    endSleepSession,
    updateSleepSession,
    deleteSleepSession,
    refetch: fetchSessions
  }
}