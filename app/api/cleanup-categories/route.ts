import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    // Get all categories with their test counts
    const { data: categories, error } = await supabase
      .from('test_categories')
      .select(`
        id,
        name,
        description,
        display_order,
        topics:test_topics(
          id,
          name,
          tests:tests(id)
        )
      `)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching categories:', error)
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
    }

    // Calculate test counts and identify empty categories
    const categoriesWithCounts = categories?.map(category => {
      const testCount = category.topics?.reduce((total, topic) => {
        return total + (topic.tests?.length || 0)
      }, 0) || 0

      return {
        ...category,
        test_count: testCount,
        topic_count: category.topics?.length || 0,
        isEmpty: testCount === 0
      }
    })

    return NextResponse.json({
      categories: categoriesWithCounts || [],
      emptyCategories: categoriesWithCounts?.filter(cat => cat.isEmpty) || []
    })
  } catch (error) {
    console.error('Error in cleanup categories API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { categoryIds } = await request.json()

    if (!categoryIds || !Array.isArray(categoryIds)) {
      return NextResponse.json({ error: 'Category IDs array is required' }, { status: 400 })
    }

    // First, check if any of these categories have tests
    const { data: categoriesWithTests, error: checkError } = await supabase
      .from('test_categories')
      .select(`
        id,
        name,
        topics:test_topics(
          tests:tests(id)
        )
      `)
      .in('id', categoryIds)

    if (checkError) {
      console.error('Error checking categories:', checkError)
      return NextResponse.json({ error: 'Failed to check categories' }, { status: 500 })
    }

    // Identify categories that have tests
    const categoriesWithTestsIds = categoriesWithTests?.filter(cat => 
      cat.topics?.some(topic => topic.tests && topic.tests.length > 0)
    ).map(cat => cat.id) || []

    if (categoriesWithTestsIds.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete categories that contain tests',
        categoriesWithTests: categoriesWithTestsIds
      }, { status: 400 })
    }

    // Delete empty topics first
    const { error: topicsError } = await supabase
      .from('test_topics')
      .delete()
      .in('category_id', categoryIds)

    if (topicsError) {
      console.error('Error deleting topics:', topicsError)
      return NextResponse.json({ error: 'Failed to delete topics' }, { status: 500 })
    }

    // Delete categories
    const { error: categoriesError } = await supabase
      .from('test_categories')
      .delete()
      .in('id', categoryIds)

    if (categoriesError) {
      console.error('Error deleting categories:', categoriesError)
      return NextResponse.json({ error: 'Failed to delete categories' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Categories deleted successfully',
      deletedCount: categoryIds.length
    })
  } catch (error) {
    console.error('Error in cleanup categories DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
