import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const topicId = searchParams.get('topic_id')
    const categoryId = searchParams.get('category_id')

    let query = supabase
      .from('tests')
      .select('id, title, description, duration_minutes, status, created_at, topic_id, category_id')
      .neq('status', 'draft')

    if (topicId) {
      query = query.eq('topic_id', topicId)
    } else if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    const { data: tests, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching tests:', error)
      return NextResponse.json({ error: 'Failed to fetch tests' }, { status: 500 })
    }

    // Get topic and category info separately
    const testsWithInfo = await Promise.all(
      (tests || []).map(async (test) => {
        const { data: topic } = await supabase
          .from('test_topics')
          .select('id, name')
          .eq('id', test.topic_id)
          .single()

        const { data: category } = await supabase
          .from('test_categories')
          .select('id, name')
          .eq('id', test.category_id)
          .single()

        return {
          ...test,
          topic: topic || null,
          category: category || null
        }
      })
    )

    return NextResponse.json(testsWithInfo)
  } catch (error) {
    console.error('Error in tests API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, description, topic_id, difficulty, time_limit } = await request.json()

    if (!title || !topic_id) {
      return NextResponse.json({ error: 'Title and topic_id are required' }, { status: 400 })
    }

    // Get the category_id from the topic
    const { data: topic, error: topicError } = await supabase
      .from('test_topics')
      .select('category_id')
      .eq('id', topic_id)
      .single()

    if (topicError || !topic) {
      return NextResponse.json({ error: 'Invalid topic_id' }, { status: 400 })
    }

    const { data: test, error } = await supabase
      .from('tests')
      .insert([{ 
        title, 
        description, 
        topic_id, 
        category_id: topic.category_id,
        difficulty: difficulty || 'medium',
        time_limit: time_limit || 30,
        status: 'draft'
      }])
      .select(`
        id,
        title,
        description,
        status,
        difficulty,
        time_limit,
        created_at,
        topic_id,
        category_id,
        topic:test_topics(id, name, description),
        category:test_categories(id, name, description)
      `)
      .single()

    if (error) {
      console.error('Error creating test:', error)
      return NextResponse.json({ error: 'Failed to create test' }, { status: 500 })
    }

    return NextResponse.json(test)
  } catch (error) {
    console.error('Error in tests POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
