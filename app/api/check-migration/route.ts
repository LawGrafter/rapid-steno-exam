import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    // Check total tests
    const { data: allTests, error: testsError } = await supabase
      .from('tests')
      .select('id, title, topic_id, category_id, status')

    // Check categories
    const { data: categories, error: catError } = await supabase
      .from('test_categories')
      .select('*')

    // Check topics
    const { data: topics, error: topicsError } = await supabase
      .from('test_topics')
      .select('*')

    // Check tests with relationships
    const { data: testsWithRelations, error: relError } = await supabase
      .from('tests')
      .select(`
        id,
        title,
        status,
        topic_id,
        category_id,
        topic:test_topics(id, name),
        category:test_categories(id, name)
      `)

    return NextResponse.json({
      summary: {
        total_tests: allTests?.length || 0,
        total_categories: categories?.length || 0,
        total_topics: topics?.length || 0,
        tests_with_topic: allTests?.filter(t => t.topic_id).length || 0,
        tests_with_category: allTests?.filter(t => t.category_id).length || 0
      },
      allTests: allTests || [],
      categories: categories || [],
      topics: topics || [],
      testsWithRelations: testsWithRelations || [],
      errors: {
        testsError,
        catError,
        topicsError,
        relError
      }
    })
  } catch (error) {
    console.error('Migration check error:', error)
    return NextResponse.json({ error: 'Check failed', details: error }, { status: 500 })
  }
}
