'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Save, Plus, Trash2, Upload, FolderPlus } from 'lucide-react'

type Question = {
  id: string
  text: string
  points: number
  negative_points: number
  options: {
    id: string
    label: string
    is_correct: boolean
  }[]
}

export default function CreateTestPage() {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingCSV, setIsUploadingCSV] = useState(false)
  
  // Test details
  const [testData, setTestData] = useState({
    title: '',
    description: '',
    category: 'General',
    status: 'draft',
    duration_minutes: 60,
    shuffle_questions: true,
    shuffle_options: true,
    negative_marking: false
  })

  // Available categories
  const [categories, setCategories] = useState<string[]>(['General'])
  const [newCategory, setNewCategory] = useState('')
  const [showAddCategory, setShowAddCategory] = useState(false)

  // Questions
  const [questions, setQuestions] = useState<Question[]>([])

  useEffect(() => {
    const adminUser = localStorage.getItem('adminUser')
    if (!adminUser) {
      router.push('/admin/login')
      return
    }

    // Fetch existing categories from database
    fetchCategories()

    // No need to set default dates anymore
  }, [router])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('tests')
        .select('category')
        .not('category', 'is', null)

      if (error) throw error

      const uniqueCategories = Array.from(new Set(data?.map(t => t.category) || []))
      setCategories(uniqueCategories.length > 0 ? uniqueCategories : ['General'])
    } catch (error) {
      console.error('Error fetching categories:', error)
      setCategories(['General'])
    }
  }

  const addNewCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      const updatedCategories = [...categories, newCategory.trim()]
      setCategories(updatedCategories)
      setTestData({ ...testData, category: newCategory.trim() })
      setNewCategory('')
      setShowAddCategory(false)
    }
  }

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      text: '',
      points: 1,
      negative_points: 0,
      options: [
        { id: Date.now().toString() + '1', label: '', is_correct: false },
        { id: Date.now().toString() + '2', label: '', is_correct: false },
        { id: Date.now().toString() + '3', label: '', is_correct: false },
        { id: Date.now().toString() + '4', label: '', is_correct: false },
      ]
    }
    setQuestions([...questions, newQuestion])
  }

  const removeQuestion = (questionId: string) => {
    setQuestions(questions.filter(q => q.id !== questionId))
  }

  const updateQuestion = (questionId: string, field: string, value: any) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, [field]: value } : q
    ))
  }

  const updateOption = (questionId: string, optionId: string, field: string, value: any) => {
    setQuestions(questions.map(q => 
      q.id === questionId 
        ? {
            ...q,
            options: q.options.map(o => 
              o.id === optionId ? { ...o, [field]: value } : o
            )
          }
        : q
    ))
  }

  const setCorrectAnswer = (questionId: string, optionId: string) => {
    setQuestions(questions.map(q => 
      q.id === questionId 
        ? {
            ...q,
            options: q.options.map(o => ({
              ...o,
              is_correct: o.id === optionId
            }))
          }
        : q
    ))
  }

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Handle escaped quotes
          current += '"'
          i++ // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    // Add the last field
    result.push(current.trim())
    return result
  }

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploadingCSV(true)
    
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        alert('CSV file must contain at least a header row and one data row.')
        return
      }
      
      const headers = parseCSVLine(lines[0])
      
      // Expected format: Question,Option A,Option B,Option C,Option D,Correct Answer,Points
      if (headers.length < 7) {
        alert('Invalid CSV format. Please use the template with all required columns.')
        return
      }

      const newQuestions: Question[] = []
      
      for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i])
        if (row.length < 7 || !row[0].trim()) continue

        const questionText = row[0].trim()
        const options = [
          { id: `${i}-1`, label: row[1].trim(), is_correct: row[5].trim().toUpperCase() === 'A' },
          { id: `${i}-2`, label: row[2].trim(), is_correct: row[5].trim().toUpperCase() === 'B' },
          { id: `${i}-3`, label: row[3].trim(), is_correct: row[5].trim().toUpperCase() === 'C' },
          { id: `${i}-4`, label: row[4].trim(), is_correct: row[5].trim().toUpperCase() === 'D' },
        ]

        newQuestions.push({
          id: `csv-${Date.now()}-${i}`,
          text: questionText,
          points: parseFloat(row[6]) || 1,
          negative_points: testData.negative_marking ? 0.25 : 0,
          options
        })
      }

      if (newQuestions.length === 0) {
        alert('No valid questions found in the CSV file.')
        return
      }

      setQuestions(prev => [...prev, ...newQuestions])
      alert(`Successfully imported ${newQuestions.length} questions from CSV.`)
    } catch (error) {
      console.error('Error parsing CSV:', error)
      alert('Error parsing CSV file. Please check the format and try again.')
    } finally {
      setIsUploadingCSV(false)
      event.target.value = '' // Reset file input
    }
  }

  const downloadTemplate = () => {
    const csvContent = [
      'Question,Option A,Option B,Option C,Option D,Correct Answer,Points',
      '"What is the capital of India?","New Delhi","Mumbai","Kolkata","Chennai","A","1"',
      '"In Excel, which function returns the average of numbers ignoring text?","AVERAGE","AVERAGEIF","COUNT","SUM","B","1"',
      '"Which planet is known as the Red Planet?","Venus","Mars","Jupiter","Saturn","B","1"'
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mcq-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const validateForm = () => {
    if (!testData.title.trim()) {
      alert('Please enter a test title')
      return false
    }

    if (questions.length === 0) {
      alert('Please add at least one question')
      return false
    }

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i]
      if (!question.text.trim()) {
        alert(`Please enter text for question ${i + 1}`)
        return false
      }

      const hasCorrectAnswer = question.options.some(o => o.is_correct)
      if (!hasCorrectAnswer) {
        alert(`Please select correct answer for question ${i + 1}`)
        return false
      }

      const hasEmptyOption = question.options.some(o => !o.label.trim())
      if (hasEmptyOption) {
        alert(`Please fill all options for question ${i + 1}`)
        return false
      }
    }

    return true
  }

  const saveTest = async () => {
    if (!validateForm()) return

    setIsSaving(true)
    
    try {
      // Create test without starts_at/ends_at (removed from schema)
      const { data: testResult, error: testError } = await supabase
        .from('tests')
        .insert(testData)
        .select()
        .single()

      if (testError) throw testError

      // Create questions and options
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i]
        
        const { data: questionResult, error: questionError } = await supabase
          .from('questions')
          .insert({
            test_id: testResult.id,
            text: question.text,
            points: question.points,
            negative_points: question.negative_points,
            order_index: i
          })
          .select()
          .single()

        if (questionError) throw questionError

        // Create options
        const optionsData = question.options.map((option, index) => ({
          question_id: questionResult.id,
          label: option.label,
          is_correct: option.is_correct,
          order_index: index
        }))

        const { error: optionsError } = await supabase
          .from('options')
          .insert(optionsData)

        if (optionsError) throw optionsError
      }

      router.push('/admin/tests')
    } catch (error) {
      console.error('Error saving test:', error)
      alert('Error saving test. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/tests">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Create New Test</h1>
                <p className="text-sm text-gray-600">Create a new MCQ test with questions</p>
              </div>
            </div>
            <Button onClick={saveTest} disabled={isSaving}>
              {isSaving ? (
                <>
                  <LoadingSpinner className="h-4 w-4 mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Test
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Test Details */}
        <Card>
          <CardHeader>
            <CardTitle>Test Details</CardTitle>
            <CardDescription>
              Basic information about the test
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Title *
                </label>
                <Input
                  value={testData.title}
                  onChange={(e) => setTestData({ ...testData, title: e.target.value })}
                  placeholder="Enter test title"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Textarea
                  value={testData.description}
                  onChange={(e) => setTestData({ ...testData, description: e.target.value })}
                  placeholder="Enter test description (optional)"
                  rows={3}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <div className="flex gap-2">
                  <select
                    value={testData.category}
                    onChange={(e) => setTestData({ ...testData, category: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#002E2C] focus:border-[#002E2C]"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    onClick={() => setShowAddCategory(!showAddCategory)}
                    variant="outline"
                    size="sm"
                    className="px-3"
                  >
                    <FolderPlus className="h-4 w-4" />
                  </Button>
                </div>
                
                {showAddCategory && (
                  <div className="mt-2 flex gap-2">
                    <Input
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="Enter new category name (e.g., Patna High Court Exam)"
                      className="flex-1"
                      onKeyPress={(e) => e.key === 'Enter' && addNewCategory()}
                    />
                    <Button
                      type="button"
                      onClick={addNewCategory}
                      size="sm"
                      style={{backgroundColor: '#002E2C'}}
                    >
                      Add
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setShowAddCategory(false)
                        setNewCategory('')
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Select existing category or create a new one (e.g., "Patna High Court Exam")
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Status *
                </label>
                <select
                  value={testData.status}
                  onChange={(e) => setTestData({ ...testData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#002E2C] focus:border-[#002E2C]"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="coming_soon">Coming Soon</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Draft tests are hidden from students. Published tests are available to take. Coming Soon tests are visible but not yet available.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes) *
                </label>
                <Input
                  type="number"
                  value={testData.duration_minutes}
                  onChange={(e) => setTestData({ ...testData, duration_minutes: parseInt(e.target.value) || 0 })}
                  min="1"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={testData.negative_marking}
                  onCheckedChange={(checked) => setTestData({ ...testData, negative_marking: checked })}
                />
                <label className="text-sm font-medium text-gray-700">
                  Enable Negative Marking
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={testData.shuffle_questions}
                  onCheckedChange={(checked) => setTestData({ ...testData, shuffle_questions: checked })}
                />
                <label className="text-sm font-medium text-gray-700">
                  Shuffle Questions
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={testData.shuffle_options}
                  onCheckedChange={(checked) => setTestData({ ...testData, shuffle_options: checked })}
                />
                <label className="text-sm font-medium text-gray-700">
                  Shuffle Options
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CSV Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Bulk Import Questions</CardTitle>
            <CardDescription>
              Upload questions from CSV file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  disabled={isUploadingCSV}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                />
              </div>
              <Button onClick={downloadTemplate} variant="outline" size="sm">
                Download Template
              </Button>
            </div>
            {isUploadingCSV && (
              <div className="mt-2 text-sm" style={{color: '#002E2C'}}>
                Processing CSV file...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Questions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Questions ({questions.length})</CardTitle>
                <CardDescription>
                  Add and manage test questions
                </CardDescription>
              </div>
              <Button onClick={addQuestion}>
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {questions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No questions added yet. Click "Add Question" to get started.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {questions.map((question, questionIndex) => (
                  <div key={question.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium">Question {questionIndex + 1}</h3>
                      <Button
                        onClick={() => removeQuestion(question.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Question Text *
                        </label>
                        <Textarea
                          value={question.text}
                          onChange={(e) => updateQuestion(question.id, 'text', e.target.value)}
                          placeholder="Enter question text"
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Points
                          </label>
                          <Input
                            type="number"
                            value={question.points}
                            onChange={(e) => updateQuestion(question.id, 'points', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.1"
                          />
                        </div>
                        {testData.negative_marking && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Negative Points
                            </label>
                            <Input
                              type="number"
                              value={question.negative_points}
                              onChange={(e) => updateQuestion(question.id, 'negative_points', parseFloat(e.target.value) || 0)}
                              min="0"
                              step="0.1"
                            />
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Answer Options *
                        </label>
                        <div className="space-y-2">
                          {question.options.map((option, optionIndex) => (
                            <div key={option.id} className="flex items-center gap-3">
                              <input
                                type="radio"
                                name={`correct-${question.id}`}
                                checked={option.is_correct}
                                onChange={() => setCorrectAnswer(question.id, option.id)}
                                className="h-4 w-4" style={{color: '#002E2C'}}
                              />
                              <span className="text-sm font-medium text-gray-700 w-6">
                                {String.fromCharCode(65 + optionIndex)}.
                              </span>
                              <Input
                                value={option.label}
                                onChange={(e) => updateOption(question.id, option.id, 'label', e.target.value)}
                                placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                                className="flex-1"
                              />
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Select the radio button to mark the correct answer
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}