'use client'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Crown, Shield, Lock, CheckCircle, X } from 'lucide-react'
import { useRef, useState } from 'react'

interface UpgradeDialogProps {
  isOpen: boolean
  onClose: () => void
  categoryName: string
  userHasGoldPlan?: boolean
}

export function UpgradeDialog({ isOpen, onClose, categoryName, userHasGoldPlan = false }: UpgradeDialogProps) {
  const isAHCContent = categoryName.toLowerCase().includes('allahabad') || 
                      categoryName.toLowerCase().includes('ahc')

  // Request Upgrade form state
  const [showUpgradeForm, setShowUpgradeForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState<string | null>(null)
  const formRef = useRef<HTMLDivElement | null>(null)

  const handleContactAdmin = () => {
    // You can implement contact admin functionality here
    // For now, we'll just close the dialog
    onClose()
  }

  const handleUpgrade = () => {
    // Redirect to payment page
    window.open('https://rapidsteno.com/how-to-pay', '_blank')
    onClose()
  }

  const handleRequestUpgrade = () => {
    // Always show the form
    setShowUpgradeForm(true)
    // Scroll to the form after it becomes visible
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitMsg(null)
    try {
      const res = await fetch('https://formspree.io/f/xovnbgoa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          subject: 'AHC Upgrade Request (Rs 200 difference)',
          message: `User requests upgrade to AHC. Category: ${categoryName}. Current plan: Gold (Rs 497). AHC: Rs 699. Please process Rs 200 upgrade.`,
        }),
      })
      if (res.ok) {
        setSubmitMsg('Request sent! We will contact you shortly.')
        setName('')
        setEmail('')
      } else {
        setSubmitMsg('Failed to send. Please try again in a moment.')
      }
    } catch (err) {
      setSubmitMsg('Network error. Please try again later.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-full mx-auto">
        <div className="max-h-[80vh] overflow-y-auto">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-2 text-[#002E2C]">
              <Lock className="h-5 w-5" />
              Premium Content
            </DialogTitle>
            <DialogDescription className="text-center pt-2">
              <div className="mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-[#002E2C] to-teal-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  {isAHCContent ? (
                    <Crown className="h-8 w-8 text-white" />
                  ) : (
                    <Shield className="h-8 w-8 text-white" />
                  )}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {categoryName}
                </h3>
                {isAHCContent ? (
                  <Badge className="bg-gradient-to-r from-[#002E2C] to-teal-600 text-white">
                    <Crown className="w-3 h-3 mr-1" />
                    AHC Plan Required
                  </Badge>
                ) : (
                  <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                    <Shield className="w-3 h-3 mr-1" />
                    Gold Plan Required
                  </Badge>
                )}
                {isAHCContent && userHasGoldPlan && (
                  <div className="mt-3">
                    <div className="inline-flex items-center justify-center rounded-full border border-teal-600 px-4 py-2 bg-teal-50 text-teal-800 text-lg font-extrabold tracking-wide">
                      +200 Extra to unlock AHC
                    </div>
                    <p className="mt-2 text-sm text-gray-600">You are already on Gold (includes Exam Software). Pay Rs 200 extra to unlock the AHC Plan.</p>
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-1">
          {isAHCContent ? (
            <>
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 max-w-xl mx-auto">
                <h4 className="font-semibold text-[#002E2C] mb-2">AHC Plan Benefits</h4>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Complete access to all materials and all Allahabad High Court content
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Unlimited test attempts and priority support
                  </li>
                </ul>
                {userHasGoldPlan && (
                  <div className="mt-3 text-sm text-blue-800 bg-blue-50 border border-blue-200 rounded-md p-2">
                    You are on Gold (Exam Software enabled). Pay <span className="font-semibold">Rs 200</span> extra to unlock the AHC Plan.
                  </div>
                )}
              </div>

              {/* Pricing section removed as requested; banner added above */}
            </>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <h4 className="font-semibold text-yellow-800 mb-2">Gold Plan Benefits:</h4>
              <ul className="space-y-1 text-sm text-gray-700">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Access to all general materials
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  All general tests and practice
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Regular updates and new content
                </li>
              </ul>
            </div>
          )}
          </div>

          <DialogFooter className="flex-col gap-2 pt-4">
            {userHasGoldPlan && isAHCContent ? (
              <>
                <Button 
                  onClick={handleRequestUpgrade}
                  className="w-full bg-[#002E2C] hover:bg-[#001A18] text-white"
                >
                  Request Upgrade (Rs 200)
                </Button>
                <Button 
                  onClick={handleUpgrade}
                  variant="outline"
                  className="w-full border-[#002E2C] text-[#002E2C] hover:bg-[#002E2C] hover:text-white"
                >
                  Pay Online (Rs 200)
                </Button>
              </>
            ) : (
              <Button 
                onClick={handleUpgrade}
                className="w-full bg-gradient-to-r from-[#002E2C] to-teal-600 hover:from-[#001A18] hover:to-teal-700 text-white"
              >
                {isAHCContent ? 'Upgrade to AHC Plan' : 'Upgrade to Gold Plan'}
              </Button>
            )}
            {/* Close button removed as requested */}
          </DialogFooter>

          {showUpgradeForm && (
            <div ref={formRef} className="mt-4 border rounded-lg p-4 bg-white">
              <h4 className="font-semibold mb-2">Request Upgrade (Rs 200)</h4>
              <p className="text-sm text-gray-600 mb-3">Enter your details and we will assist you to upgrade to AHC.</p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Registered Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    placeholder="you@example.com"
                  />
                </div>
                <input type="hidden" name="category" value={categoryName} />
                <div className="flex gap-2">
                  <Button type="submit" disabled={submitting} className="bg-[#002E2C] text-white hover:bg-[#001A18]">
                    {submitting ? 'Sending...' : 'Send Upgrade Request'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowUpgradeForm(false)}>
                    Cancel
                  </Button>
                </div>
                {submitMsg && (
                  <p className="text-sm text-gray-700">{submitMsg}</p>
                )}
              </form>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
