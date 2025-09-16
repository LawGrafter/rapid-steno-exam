import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    // Check raw tests data
    const { data: tests, error: testsError } = await supabase
      .from('tests')
      .select('*')
      .limit(10)

    // Check categories
    const { data: categories, error: catError } = await supabase
      .from('test_categories')
      .select('*')

    // Check topics
    const { data: topics, error: topicsError } = await supabase
      .from('test_topics')
      .select('*')

    return NextResponse.json({
      tests: tests || [],
      categories: categories || [],
      topics: topics || [],
      errors: {
        testsError,
        catError,
        topicsError
      }
    })
  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json({ error: 'Debug failed' }, { status: 500 })
  }
}
