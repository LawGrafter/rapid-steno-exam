'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

interface UserSubscription {
  id: string
  user_id: string
  plan_id: string
  status: string
  created_at: string
  expires_at: string | null
  is_active: boolean
  plans: {
    id: string
    name: string
    display_name: string
  }
  profiles: {
    id: string
    email: string
    full_name: string | null
  }
}

interface Plan {
  id: string
  name: string
  display_name: string
}

interface EditSubscriptionDialogProps {
  subscription: UserSubscription | null
  plans: Plan[]
  open: boolean
  onClose: () => void
  onUpdate: () => void
}

export function EditSubscriptionDialog({ 
  subscription, 
  plans, 
  open, 
  onClose, 
  onUpdate 
}: EditSubscriptionDialogProps) {
  const [loading, setLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [createdAt, setCreatedAt] = useState('')
  const { toast } = useToast()

  // Initialize form when subscription changes
  useEffect(() => {
    if (subscription) {
      setSelectedPlan(subscription.plan_id)
      setExpiresAt(subscription.expires_at ? new Date(subscription.expires_at).toISOString().split('T')[0] : '')
      setCreatedAt(new Date(subscription.created_at).toISOString().split('T')[0])
    }
  }, [subscription])

  const handleSave = async () => {
    if (!subscription) return

    setLoading(true)
    try {
      const updates: any = {
        plan_id: selectedPlan,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        created_at: new Date(createdAt).toISOString()
      }

      const { error } = await supabase
        .from('user_subscriptions')
        .update(updates)
        .eq('id', subscription.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Subscription updated successfully"
      })

      onUpdate()
      onClose()
    } catch (error) {
      console.error('Error updating subscription:', error)
      toast({
        title: "Error",
        description: "Failed to update subscription",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  if (!subscription) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Subscription</DialogTitle>
          <DialogDescription>
            Update subscription details for {subscription.profiles?.email}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="plan" className="text-right">
              Plan
            </Label>
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.length === 0 ? (
                  <SelectItem value="no-plans" disabled>No plans available</SelectItem>
                ) : (
                  plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.display_name || plan.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="created" className="text-right">
              Created Date
            </Label>
            <Input
              id="created"
              type="date"
              value={createdAt}
              onChange={(e) => setCreatedAt(e.target.value)}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="expires" className="text-right">
              Expires Date
            </Label>
            <Input
              id="expires"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
