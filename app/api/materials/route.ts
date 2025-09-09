import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    const { data: materials, error } = await supabase
      .from('materials')
      .select(`
        *,
        category:material_categories(*)
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching materials:', error)
      return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 })
    }

    return NextResponse.json(materials || [])
  } catch (error) {
    console.error('Error in materials API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
