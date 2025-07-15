import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const telegramUserId = searchParams.get('telegram_user_id')
  
  if (!telegramUserId) {
    return NextResponse.json({ error: 'telegram_user_id is required' }, { status: 400 })
  }
  
  try {
    // Fetch user from Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_user_id', parseInt(telegramUserId))
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching user:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
    
    if (user) {
      return NextResponse.json({
        id: user.id,
        telegram_id: user.telegram_user_id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        custom_name: user.custom_name || user.first_name,
        settings: user.settings || {
          notifications_enabled: true,
          sleep_reminders: true,
          wake_reminders: true
        }
      })
    } else {
      // Return null when user is not found - let the client handle this
      return NextResponse.json({
        telegram_id: parseInt(telegramUserId),
        settings: {
          notifications_enabled: true,
          sleep_reminders: true,
          wake_reminders: true
        }
      })
    }
  } catch (error) {
    console.error('Error fetching user data:', error)
    return NextResponse.json({
      telegram_id: parseInt(telegramUserId),
      settings: {
        notifications_enabled: true,
        sleep_reminders: true,
        wake_reminders: true
      }
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { telegram_user_id, first_name, last_name, username, custom_name, settings } = body
    
    if (!telegram_user_id || !first_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    // Upsert user in Supabase
    const { data, error } = await supabase
      .from('users')
      .upsert({
        telegram_user_id: parseInt(telegram_user_id),
        first_name,
        last_name,
        username,
        custom_name: custom_name || first_name,
        settings: settings || {
          notifications_enabled: true,
          sleep_reminders: true,
          wake_reminders: true
        }
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error upserting user:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, user: data })
  } catch (error) {
    console.error('Error in POST /api/telegram-user:', error)
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}