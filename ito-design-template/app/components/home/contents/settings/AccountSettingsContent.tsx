import { useState } from 'react'
import { SettingRow } from '@/app/components/ui/setting-row'
import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'

export default function AccountSettingsContent() {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  return (
    <div className="h-full justify-between">
      <div className="rounded-xl bg-[#F2F2F2]">
        <SettingRow>
          <label className="text-sm font-medium text-[#1f1f1f]">Name</label>
          <input
            type="text"
            defaultValue="Arka"
            className="w-80 bg-white border border-[var(--border)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent"
          />
        </SettingRow>
        <SettingRow last>
          <label className="text-sm font-medium text-[#1f1f1f]">Email</label>
          <div className="w-80 text-sm text-[#888] px-4">user@example.com</div>
        </SettingRow>
      </div>

      <div className="flex pt-8 w-full justify-center">
        <button className="bg-[#D9D9DE] border-0 text-[#1f1f1f] hover:bg-[#CDCDD2] rounded-lg text-sm px-8 py-2.5 cursor-pointer">
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
              action cannot be undone and will permanently remove all your data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => setShowDeleteDialog(false)}>
              Yes, delete everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
