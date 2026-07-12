// src/app/admin/proposals/new/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient } from '@/lib/supabase-client'
import { MerchantLifecycleService } from '@/lib/services/merchant-lifecycle'
import { GrowthProfileService } from '@/lib/services/growth-profile-service'
import SvgIcon from '@/components/ui/SvgIcon'
import Button from '@/components/ui/Button'
import StatusBadge from '@/components/ui/StatusBadge'

interface Merchant {
  id: string
  business_name: string
  email: string
  website: string
  contact_name: string
  industry: string
}

interface GrowthProfile {
  id: string
  hgri_score: number
  growth_classification: string
  summary: string
}

export default function AdminProposalsNewPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [selectedMerchant, setSelectedMerchant] = useState<string>('')
  const [selectedProfile, setSelectedProfile] = useState<string>('')
  const [profiles, setProfiles] = useState<GrowthProfile[]>([])
  const [formData, setFormData] = useState({
    title: '',
    services: [{ name: '', description: '', price: '' }],
    pricing: {
      total: '',
      payment_terms: '50% upfront, 50% on completion',
      currency: 'USD'
    },
    timeline: '4-6 weeks',
    terms: '',
    notes: '',
    expires_at: ''
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Load merchants with growth profiles
  useEffect(() => {
    fetchMerchants()
  }, [])

  // Load profiles when merchant is selected
  useEffect(() => {
    if (selectedMerchant) {
      fetchProfiles(selectedMerchant)
    } else {
      setProfiles([])
      setSelectedProfile('')
    }
  }, [selectedMerchant])

  async function fetchMerchants() {
    setLoading(true)
    try {
      // Get merchants that have growth profiles ready
      const { data, error } = await supabase
        .from('merchant_status')
        .select(`
          merchant_id,
          status,
          merchant:merchants(
            id,
            business_name,
            email,
            website,
            contact_name,
            industry
          )
        `)
        .in('status', ['growth_profile_ready', 'proposal_ready', 'lead'])
        .order('last_activity', { ascending: false })

      if (error) {
        console.error('Error fetching merchants:', error)
        return
      }

      const merchantList = data
        .map((item: any) => item.merchant)
        .filter((m: any) => m !== null)

      setMerchants(merchantList)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchProfiles(merchantId: string) {
    try {
      const { data, error } = await supabase
        .from('growth_profiles')
        .select(`
          id,
          hgri_score,
          growth_classification,
          summary
        `)
        .eq('merchant_id', merchantId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching profiles:', error)
        return
      }

      setProfiles(data || [])
      
      // Auto-select if only one profile
      if (data && data.length === 1) {
        setSelectedProfile(data[0].id)
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  function addService() {
    setFormData({
      ...formData,
      services: [...formData.services, { name: '', description: '', price: '' }]
    })
  }

  function removeService(index: number) {
    if (formData.services.length === 1) return
    const newServices = formData.services.filter((_, i) => i !== index)
    setFormData({ ...formData, services: newServices })
  }

  function updateService(index: number, field: string, value: string) {
    const newServices = [...formData.services]
    newServices[index] = { ...newServices[index], [field]: value }
    setFormData({ ...formData, services: newServices })
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {}

    if (!selectedMerchant) {
      errors.merchant = 'Please select a merchant'
    }
    if (!formData.title.trim()) {
      errors.title = 'Please enter a proposal title'
    }
    if (!selectedProfile) {
      errors.profile = 'Please select a growth profile'
    }
    if (formData.services.some(s => !s.name.trim())) {
      errors.services = 'Please enter service names'
    }
    if (formData.services.some(s => !s.price.trim())) {
      errors.pricing = 'Please enter prices for all services'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!validateForm()) return

    setSubmitting(true)
    try {
      // Calculate total
      const total = formData.services.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0)

      const { data, error } = await supabase
        .from('proposals')
        .insert({
          merchant_id: selectedMerchant,
          title: formData.title,
          status: 'draft',
          services: formData.services,
          pricing: {
            ...formData.pricing,
            total: total || formData.pricing.total
          },
          timeline: formData.timeline,
          terms: formData.terms,
          notes: formData.notes,
          expires_at: formData.expires_at || null,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating proposal:', error)
        alert('Failed to create proposal. Please try again.')
        return
      }

      // Update merchant status
      await MerchantLifecycleService.updateStatus(selectedMerchant, 'proposal_ready')

      // Create notification for merchant
      await MerchantLifecycleService.createNotification({
        user_id: selectedMerchant,
        user_type: 'merchant',
        type: 'proposal_ready',
        title: 'Proposal Ready',
        message: `Your proposal "${formData.title}" is ready for review.`,
        link: `/client-portal/proposals/${data.id}`
      })

      // Redirect to proposal detail
      router.push(`/admin/proposals/${data.id}`)
    } catch (error) {
      console.error('Error:', error)
      alert('An error occurred while creating the proposal.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/admin/proposals" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <SvgIcon name="chevron-left" size={20} />
            </Link>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">New Proposal</h1>
          </div>
          <p className="text-[var(--text-secondary)]">Create a new proposal for a merchant</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/proposals">
            <Button variant="secondary">Cancel</Button>
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Merchant Selection */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Select Merchant</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)]">Merchant *</label>
              <select
                value={selectedMerchant}
                onChange={(e) => setSelectedMerchant(e.target.value)}
                className={`mt-1 w-full rounded-lg border ${formErrors.merchant ? 'border-red-500' : 'border-[var(--border)]'} bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none`}
              >
                <option value="">Select a merchant...</option>
                {merchants.map((merchant) => (
                  <option key={merchant.id} value={merchant.id}>
                    {merchant.business_name} - {merchant.email}
                  </option>
                ))}
              </select>
              {formErrors.merchant && (
                <p className="mt-1 text-sm text-red-500">{formErrors.merchant}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)]">Growth Profile *</label>
              <select
                value={selectedProfile}
                onChange={(e) => setSelectedProfile(e.target.value)}
                disabled={!selectedMerchant}
                className={`mt-1 w-full rounded-lg border ${formErrors.profile ? 'border-red-500' : 'border-[var(--border)]'} bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none disabled:opacity-50`}
              >
                <option value="">Select a profile...</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    HGRI: {profile.hgri_score} - {profile.growth_classification}
                  </option>
                ))}
              </select>
              {formErrors.profile && (
                <p className="mt-1 text-sm text-red-500">{formErrors.profile}</p>
              )}
              {selectedMerchant && profiles.length === 0 && (
                <p className="mt-1 text-sm text-yellow-500">No growth profiles found for this merchant</p>
              )}
            </div>
          </div>
        </div>

        {/* Proposal Details */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Proposal Details</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)]">Proposal Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Growth Package - Shopify Optimization"
                className={`mt-1 w-full rounded-lg border ${formErrors.title ? 'border-red-500' : 'border-[var(--border)]'} bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none`}
              />
              {formErrors.title && (
                <p className="mt-1 text-sm text-red-500">{formErrors.title}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)]">Timeline</label>
              <select
                value={formData.timeline}
                onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              >
                <option value="2-3 weeks">2-3 weeks</option>
                <option value="4-6 weeks">4-6 weeks</option>
                <option value="8-12 weeks">8-12 weeks</option>
                <option value="3-6 months">3-6 months</option>
                <option value="Custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)]">Payment Terms</label>
              <select
                value={formData.pricing.payment_terms}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  pricing: { ...formData.pricing, payment_terms: e.target.value }
                })}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              >
                <option value="50% upfront, 50% on completion">50% upfront, 50% on completion</option>
                <option value="30% upfront, 40% mid-project, 30% on completion">30% upfront, 40% mid-project, 30% on completion</option>
                <option value="100% on completion">100% on completion</option>
                <option value="Monthly retainer">Monthly retainer</option>
                <option value="Custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)]">Expires At</label>
              <input
                type="date"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Services */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Services</h3>
            <button
              type="button"
              onClick={addService}
              className="text-sm text-[var(--accent)] hover:underline flex items-center gap-1"
            >
              <SvgIcon name="plus" size={14} />
              Add Service
            </button>
          </div>
          
          {formErrors.services && (
            <p className="mb-3 text-sm text-red-500">{formErrors.services}</p>
          )}
          
          <div className="space-y-4">
            {formData.services.map((service, index) => (
              <div key={index} className="rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="text-sm font-medium text-[var(--text-secondary)]">Service Name</label>
                      <input
                        type="text"
                        value={service.name}
                        onChange={(e) => updateService(index, 'name', e.target.value)}
                        placeholder="e.g., Shopify Store Optimization"
                        className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[var(--text-secondary)]">Description</label>
                      <input
                        type="text"
                        value={service.description}
                        onChange={(e) => updateService(index, 'description', e.target.value)}
                        placeholder="Brief description of the service"
                        className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="w-32 flex-shrink-0">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={service.price}
                      onChange={(e) => updateService(index, 'price', e.target.value)}
                      placeholder="0.00"
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeService(index)}
                    className={`mt-6 text-red-500 hover:text-red-700 ${formData.services.length === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={formData.services.length === 1}
                  >
                    <SvgIcon name="trash" size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-4">
            <span className="text-sm font-semibold text-[var(--text-primary)]">Total</span>
            <span className="text-lg font-bold text-[var(--text-primary)]">
              ${formData.services.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0).toFixed(2)}
            </span>
          </div>
          {formErrors.pricing && (
            <p className="mt-2 text-sm text-red-500">{formErrors.pricing}</p>
          )}
        </div>

        {/* Notes & Terms */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Additional Information</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)]">Notes (Internal)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Internal notes about this proposal..."
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)]">Terms & Conditions</label>
              <textarea
                value={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                rows={4}
                placeholder="Standard terms and conditions for this proposal..."
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link href="/admin/proposals">
            <Button variant="secondary" type="button">Cancel</Button>
          </Link>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Proposal'}
          </Button>
        </div>
      </form>
    </div>
  )
}