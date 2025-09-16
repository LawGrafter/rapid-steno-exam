import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    // First get categories
    const { data: categories, error: catError } = await supabase
      .from('test_categories')
      .select('*')
      .order('display_order', { ascending: true })

    if (catError) {
      console.error('Error fetching categories:', catError)
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
    }

    // Then get topics for each category
    const categoriesWithTopics = await Promise.all(
      (categories || []).map(async (category) => {
        const { data: topics, error: topicsError } = await supabase
          .from('test_topics')
          .select('*')
          .eq('category_id', category.id)
          .order('display_order', { ascending: true })

        if (topicsError) {
          console.error('Error fetching topics for category:', category.id, topicsError)
          return { ...category, topics: [] }
        }

        // Get tests for each topic
        const topicsWithTests = await Promise.all(
          (topics || []).map(async (topic) => {
            const { data: tests, error: testsError } = await supabase
              .from('tests')
              .select('id, title, status, duration_minutes, description, created_at')
              .eq('topic_id', topic.id)
              .neq('status', 'draft')

            if (testsError) {
              console.error('Error fetching tests for topic:', topic.id, testsError)
              return { ...topic, tests: [], test_count: 0 }
            }

            // Get question counts for each test
            const testsWithQuestionCount = await Promise.all(
              (tests || []).map(async (test) => {
                const { count } = await supabase
                  .from('questions')
                  .select('*', { count: 'exact', head: true })
                  .eq('test_id', test.id)
                
                return { ...test, question_count: count || 0 }
              })
            )

            return { ...topic, tests: testsWithQuestionCount, test_count: testsWithQuestionCount.length }
          })
        )

        const totalTests = topicsWithTests.reduce((sum, topic) => sum + topic.test_count, 0)
        return { ...category, topics: topicsWithTests, test_count: totalTests }
      })
    )

    return NextResponse.json(categoriesWithTopics)
  } catch (error) {
    console.error('Error in categories API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, description } = await request.json()

    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    // Get the highest display_order and add 1
    const { data: maxOrder } = await supabase
      .from('test_categories')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)

    const nextOrder = (maxOrder?.[0]?.display_order || 0) + 1

    const { data: category, error } = await supabase
      .from('test_categories')
      .insert([{ name, description, display_order: nextOrder }])
      .select()
      .single()

    if (error) {
      console.error('Error creating category:', error)
      return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
    }

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error in categories POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
