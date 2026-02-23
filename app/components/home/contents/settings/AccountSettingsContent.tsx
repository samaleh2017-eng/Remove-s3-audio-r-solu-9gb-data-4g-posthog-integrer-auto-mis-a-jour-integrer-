import React, { useState } from 'react'
import { useNotesStore } from '../../../../store/useNotesStore'
import { useDictionaryStore } from '../../../../store/useDictionaryStore'
import { useOnboardingStore } from '../../../../store/useOnboardingStore'
import { Button } from '../../../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../ui/dialog'
import { useAuthStore } from '@/app/store/useAuthStore'
import { useAuth } from '@/app/components/auth/useAuth'

export default function AccountSettingsContent() {
  const { user, setName, clearAuth } = useAuthStore()
  const { logoutUser } = useAuth()
  const { loadNotes } = useNotesStore()
  const { loadEntries } = useDictionaryStore()
  const { resetOnboarding } = useOnboardingStore()

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleSignOut = async () => {
    try {
      await logoutUser()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const handleDeleteAccount = async () => {
    try {
      await window.api.deleteUserData()

      window.electron?.store?.set('settings', {})
      window.electron?.store?.set('main', {})
      window.electron?.store?.set('onboarding', {})
      window.electron?.store?.set('auth', {})

      clearAuth(false)

      resetOnboarding()
      loadNotes()
      loadEntries()

      setShowDeleteDialog(false)
    } catch (error) {
      console.error('Failed to delete account data:', error)
      window.electron?.store?.set('settings', {})
      window.electron?.store?.set('main', {})
      window.electron?.store?.set('onboarding', {})
      window.electron?.store?.set('auth', {})

      clearAuth(false)

      resetOnboarding()
      loadNotes()
      loadEntries()

      setShowDeleteDialog(false)
    }
  }

  return (
    <div className="h-full justify-between">
      <div className="rounded-xl bg-[#F2F2F2]">
        <div className="flex items-center justify-between py-4 px-5 border-b border-[#EBEBEB]">
          <label className="text-sm font-medium text-[#1f1f1f]">Name</label>
          <input
            type="text"
            value={user?.name}
            onChange={e => setName(e.target.value)}
            className="w-80 bg-white border border-[var(--border)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent"
          />
        </div>
        <div className="flex items-center justify-between py-4 px-5">
          <label className="text-sm font-medium text-[#1f1f1f]">Email</label>
          <div className="w-80 text-sm text-[#888] px-4">{user?.email}</div>
        </div>
      </div>

      <div className="flex pt-8 w-full justify-center">
        <button
          onClick={handleSignOut}
          className="bg-[#D9D9DE] border-0 text-[#1f1f1f] hover:bg-[#CDCDD2] rounded-lg text-sm px-8 py-2.5 cursor-pointer"
        >
          Sign out
        </button>
      </div>
      <div className="flex pt-12 w-full justify-center">
        <button
          onClick={() => setShowDeleteDialog(true)}
          className="text-sm text-red-400 hover:text-red-500 bg-transparent border-0 cursor-pointer"
        >
          Delete account
        </button>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Account</DialogTitle>
            <DialogDescription className="text-[var(--color-subtext)]">
              Are you absolutely sure you want to delete your account? This
              action cannot be undone and will permanently remove:
              <br />
              <br />
              • All your personal information
              <br />
              • All saved notes
              <br />
              • All dictionary entries
              <br />
              • All app settings and preferences
              <br />
              <br />
              This will reset Ito to its initial state.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount}>
              Yes, delete everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
