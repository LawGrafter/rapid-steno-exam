'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Plus, Edit, Trash2, Save, X, FolderPlus } from 'lucide-react'

type Test = {
  id: string
  title: string
  description: string
  category_id: string
  topic_id: string
  duration_minutes: number
  starts_at: string
  ends_at: string
  status: 'draft' | 'published' | 'coming_soon'
  shuffle_questions: boolean
  shuffle_options: boolean
  negative_marking: boolean
  created_at: string
}

type Category = {
  id: string
  name: string
  description: string
}

type Topic = {
  id: string
  name: string
  description: string
  category_id: string
}

type Question = {
  id: string
  text: string
  points: number
  negative_points: number
  order_index: number
  options: Option[]
}

type Option = {
  id: string
  label: string
  is_correct: boolean
  order_index: number
}

export default function EditTestPage() {
  const router = useRouter()
  const params = useParams()
  const testId = params.id as string
  
  const [test, setTest] = useState<Test | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Form states
  const [testForm, setTestForm] = useState({
    title: '',
    description: '',
    category_id: '',
    topic_id: '',
    duration_minutes: 60,
    status: 'draft',
    shuffle_questions: true,
    shuffle_options: true,
    negative_marking: false
  })

  // Categories and topics management
  const [categories, setCategories] = useState<Category[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  
  // Question dialog states
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [questionForm, setQuestionForm] = useState({
    text: '',
    points: 1,
    negative_points: 0,
    options: [
      { id: '', label: '', is_correct: false, order_index: 0 },
      { id: '', label: '', is_correct: false, order_index: 1 },
      { id: '', label: '', is_correct: false, order_index: 2 },
      { id: '', label: '', is_correct: false, order_index: 3 }
    ]
  })

  useEffect(() => {
    if (testId) {
      fetchTest()
      fetchQuestions()
      fetchCategories()
    }
  }, [testId])

  const fetchTest = async () => {
    try {
      const { data, error } = await supabase
        .from('tests')
        .select(`
          *,
          test_categories!inner(id, name),
          test_topics!inner(id, name)
        `)
        .eq('id', testId)
        .single()

      if (error) throw error

      if (data) {
        setTest(data)
        setTestForm({
          title: data.title || '',
          description: data.description || '',
          category_id: data.category_id || '',
          topic_id: data.topic_id || '',
          duration_minutes: data.duration_minutes || 60,
          status: data.status || 'draft',
          shuffle_questions: data.shuffle_questions || true,
          shuffle_options: data.shuffle_options || true,
          negative_marking: data.negative_marking || false
        })
        setSelectedCategoryId(data.category_id || '')
        
        // Fetch topics for the current category
        if (data.category_id) {
          await fetchTopicsForCategory(data.category_id)
        }
      }
    } catch (error) {
      console.error('Error fetching test:', error)
      setError('Failed to fetch test')
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('test_categories')
        .select('*')
        .order('display_order')

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
      setCategories([])
    }
  }

  const fetchTopicsForCategory = async (categoryId: string) => {
    try {
      const { data, error } = await supabase
        .from('test_topics')
        .select('*')
        .eq('category_id', categoryId)
        .order('display_order')

      if (error) throw error
      setTopics(data || [])
    } catch (error) {
      console.error('Error fetching topics:', error)
      setTopics([])
    }
  }

  const handleCategoryChange = async (categoryId: string) => {
    setSelectedCategoryId(categoryId)
    setTestForm({ ...testForm, category_id: categoryId, topic_id: '' })
    await fetchTopicsForCategory(categoryId)
  }

  const fetchQuestions = async () => {
    try {
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testId)
        .order('order_index')

      if (questionsError) throw questionsError

      const questionsWithOptions = await Promise.all(
        questionsData.map(async (question) => {
          const { data: optionsData } = await supabase
            .from('options')
            .select('*')
            .eq('question_id', question.id)
            .order('order_index')
          
          return {
            ...question,
            options: optionsData || []
          }
        })
      )

      setQuestions(questionsWithOptions)
    } catch (error) {
      console.error('Error fetching questions:', error)
      setError('Failed to fetch questions')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestSave = async () => {
    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const { error } = await supabase
        .from('tests')
        .update({
          title: testForm.title,
          description: testForm.description,
          category_id: testForm.category_id,
          topic_id: testForm.topic_id,
          duration_minutes: testForm.duration_minutes,
          status: testForm.status,
          shuffle_questions: testForm.shuffle_questions,
          shuffle_options: testForm.shuffle_options,
          negative_marking: testForm.negative_marking
        })
        .eq('id', testId)

      if (error) throw error

      setSuccess('Test updated successfully!')
      fetchTest()
    } catch (error) {
      console.error('Error updating test:', error)
      setError('Failed to update test')
    } finally {
      setIsSaving(false)
    }
  }

  const handleQuestionSave = async () => {
    if (!editingQuestion) {
      // Create new question
      try {
        const { data: questionData, error: questionError } = await supabase
          .from('questions')
          .insert({
            test_id: testId,
            text: questionForm.text,
            points: questionForm.points,
            negative_points: questionForm.negative_points,
            order_index: questions.length
          })
          .select()
          .single()

        if (questionError) throw questionError

        // Create options
        for (let i = 0; i < questionForm.options.length; i++) {
          const option = questionForm.options[i]
          if (option.label.trim()) {
            await supabase
              .from('options')
              .insert({
                question_id: questionData.id,
                label: option.label,
                is_correct: option.is_correct,
                order_index: i
              })
          }
        }

        setSuccess('Question added successfully!')
        setIsQuestionDialogOpen(false)
        resetQuestionForm()
        fetchQuestions()
      } catch (error) {
        console.error('Error creating question:', error)
        setError('Failed to create question')
      }
    } else {
      // Update existing question
      try {
        await supabase
          .from('questions')
          .update({
            text: questionForm.text,
            points: questionForm.points,
            negative_points: questionForm.negative_points
          })
          .eq('id', editingQuestion.id)

        // Update options
        for (const option of questionForm.options) {
          if (option.id) {
            await supabase
              .from('options')
              .update({
                label: option.label,
                is_correct: option.is_correct
              })
              .eq('id', option.id)
          }
        }

        setSuccess('Question updated successfully!')
        setIsQuestionDialogOpen(false)
        setEditingQuestion(null)
        resetQuestionForm()
        fetchQuestions()
      } catch (error) {
        console.error('Error updating question:', error)
        setError('Failed to update question')
      }
    }
  }

  const resetQuestionForm = () => {
    setQuestionForm({
      text: '',
      points: 1,
      negative_points: 0,
      options: [
        { id: '', label: '', is_correct: false, order_index: 0 },
        { id: '', label: '', is_correct: false, order_index: 1 },
        { id: '', label: '', is_correct: false, order_index: 2 },
        { id: '', label: '', is_correct: false, order_index: 3 }
      ]
    })
  }

  const openQuestionDialog = (question?: Question) => {
    if (question) {
      setEditingQuestion(question)
      setQuestionForm({
        text: question.text,
        points: question.points,
        negative_points: question.negative_points,
        options: question.options.map(opt => ({
          id: opt.id,
          label: opt.label,
          is_correct: opt.is_correct,
          order_index: opt.order_index
        }))
      })
    } else {
      setEditingQuestion(null)
      resetQuestionForm()
    }
    setIsQuestionDialogOpen(true)
  }

  const deleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return

    try {
      await supabase.from('questions').delete().eq('id', questionId)
      setSuccess('Question deleted successfully!')
      fetchQuestions()
    } catch (error) {
      console.error('Error deleting question:', error)
      setError('Failed to delete question')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    )
  }

  if (!test) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Test Not Found</h1>
          <Button onClick={() => router.push('/admin/tests')}>Back to Tests</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button onClick={() => router.push('/admin/tests')} variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Tests
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Edit Test</h1>
                <p className="text-sm text-gray-600">Modify test details and questions</p>
              </div>
            </div>
            <Button onClick={handleTestSave} disabled={isSaving}>
              {isSaving ? <LoadingSpinner className="mr-2" /> : <Save className="mr-2" />}
              Save Test
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Test Details Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Test Details</CardTitle>
            <CardDescription>Basic information about the test</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="title">Test Title</Label>
                <Input
                  id="title"
                  value={testForm.title}
                  onChange={(e) => setTestForm({ ...testForm, title: e.target.value })}
                  placeholder="Enter test title"
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={testForm.status} onValueChange={(value: any) => setTestForm({ ...testForm, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="coming_soon">Coming Soon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={testForm.category_id} onValueChange={handleCategoryChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="topic">Topic</Label>
                <Select 
                  value={testForm.topic_id} 
                  onValueChange={(value) => setTestForm({ ...testForm, topic_id: value })}
                  disabled={!selectedCategoryId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedCategoryId ? "Select a topic" : "Select category first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {topics.map(topic => (
                      <SelectItem key={topic.id} value={topic.id}>
                        {topic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Choose the topic where this test belongs
                </p>
              </div>
              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={testForm.duration_minutes}
                  onChange={(e) => setTestForm({ ...testForm, duration_minutes: parseInt(e.target.value) })}
                  min="1"
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={testForm.description}
                  onChange={(e) => setTestForm({ ...testForm, description: e.target.value })}
                  placeholder="Enter test description"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="shuffle_questions"
                  checked={testForm.shuffle_questions}
                  onChange={(e) => setTestForm({ ...testForm, shuffle_questions: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="shuffle_questions">Shuffle Questions</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="shuffle_options"
                  checked={testForm.shuffle_options}
                  onChange={(e) => setTestForm({ ...testForm, shuffle_options: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="shuffle_options">Shuffle Options</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="negative_marking"
                  checked={testForm.negative_marking}
                  onChange={(e) => setTestForm({ ...testForm, negative_marking: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="negative_marking">Negative Marking</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Questions Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Questions ({questions.length})</CardTitle>
                <CardDescription>Manage test questions and answers</CardDescription>
              </div>
              <Dialog open={isQuestionDialogOpen} onOpenChange={setIsQuestionDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => openQuestionDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Question
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingQuestion ? 'Edit Question' : 'Add New Question'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingQuestion ? 'Modify the question and its options' : 'Create a new question with multiple choice options'}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="questionText">Question Text</Label>
                      <Textarea
                        id="questionText"
                        value={questionForm.text}
                        onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })}
                        placeholder="Enter your question here"
                        rows={3}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="points">Points</Label>
                        <Input
                          id="points"
                          type="number"
                          value={questionForm.points}
                          onChange={(e) => setQuestionForm({ ...questionForm, points: parseInt(e.target.value) })}
                          min="1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="negativePoints">Negative Points</Label>
                        <Input
                          id="negativePoints"
                          type="number"
                          value={questionForm.negative_points}
                          onChange={(e) => setQuestionForm({ ...questionForm, negative_points: parseInt(e.target.value) })}
                          min="0"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label>Answer Options</Label>
                      <div className="space-y-3">
                        {questionForm.options.map((option, index) => (
                          <div key={index} className="flex items-center space-x-3">
                            <input
                              type="radio"
                              name="correctAnswer"
                              checked={option.is_correct}
                              onChange={() => {
                                const newOptions = questionForm.options.map((opt, i) => ({
                                  ...opt,
                                  is_correct: i === index
                                }))
                                setQuestionForm({ ...questionForm, options: newOptions })
                              }}
                              className="rounded"
                            />
                            <Input
                              value={option.label}
                              onChange={(e) => {
                                const newOptions = [...questionForm.options]
                                newOptions[index].label = e.target.value
                                setQuestionForm({ ...questionForm, options: newOptions })
                              }}
                              placeholder={`Option ${String.fromCharCode(65 + index)}`}
                            />
                            <Badge variant={option.is_correct ? "default" : "secondary"}>
                              {option.is_correct ? "Correct" : "Incorrect"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsQuestionDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleQuestionSave}>
                      {editingQuestion ? 'Update Question' : 'Add Question'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          
          <CardContent>
            {questions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No questions added yet</p>
                <p className="text-sm">Click "Add Question" to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((question, index) => (
                  <Card key={question.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant="outline">Q{index + 1}</Badge>
                          <Badge variant="secondary">{question.points} pts</Badge>
                          {question.negative_points > 0 && (
                            <Badge variant="destructive">-{question.negative_points} pts</Badge>
                          )}
                        </div>
                        <p className="font-medium mb-3">{question.text}</p>
                        <div className="space-y-2">
                          {question.options.map((option, optIndex) => (
                            <div key={option.id} className="flex items-center space-x-2">
                              <span className="text-sm text-gray-500 w-6">
                                {String.fromCharCode(65 + optIndex)}.
                              </span>
                              <span className={`text-sm ${option.is_correct ? 'font-semibold text-green-600' : 'text-gray-700'}`}>
                                {option.label}
                                {option.is_correct && ' ✓'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openQuestionDialog(question)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteQuestion(question.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
