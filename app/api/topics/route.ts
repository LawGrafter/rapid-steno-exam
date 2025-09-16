import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('category_id')

    let query = supabase
      .from('test_topics')
      .select(`
        id,
        name,
        description,
        display_order,
        category_id,
        category:test_categories(id, name)
      `)
      .order('display_order', { ascending: true })

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    const { data: topics, error } = await query

    if (error) {
      console.error('Error fetching topics:', error)
      return NextResponse.json({ error: 'Failed to fetch topics' }, { status: 500 })
    }

    // Get test counts separately to avoid complex joins
    const topicsWithCounts = await Promise.all(
      (topics || []).map(async (topic) => {
        const { count } = await supabase
          .from('tests')
          .select('*', { count: 'exact', head: true })
          .eq('topic_id', topic.id)
        
        return {
          ...topic,
          test_count: count || 0
        }
      })
    )

    return NextResponse.json(topicsWithCounts)
  } catch (error) {
    console.error('Error in topics API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, description, category_id } = await request.json()

    if (!name || !category_id) {
      return NextResponse.json({ error: 'Topic name and category_id are required' }, { status: 400 })
    }

    // Get the highest display_order for this category and add 1
    const { data: maxOrder } = await supabase
      .from('test_topics')
      .select('display_order')
      .eq('category_id', category_id)
      .order('display_order', { ascending: false })
      .limit(1)

    const nextOrder = (maxOrder?.[0]?.display_order || 0) + 1

    const { data: topic, error } = await supabase
      .from('test_topics')
      .insert([{ name, description, category_id, display_order: nextOrder }])
      .select(`
        id,
        name,
        description,
        display_order,
        category_id,
        category:test_categories(id, name)
      `)
      .single()

    if (error) {
      console.error('Error creating topic:', error)
      return NextResponse.json({ error: 'Failed to create topic' }, { status: 500 })
    }

    return NextResponse.json(topic)
  } catch (error) {
    console.error('Error in topics POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
