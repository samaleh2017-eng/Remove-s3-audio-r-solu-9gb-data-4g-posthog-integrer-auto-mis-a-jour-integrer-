import { useState } from 'react'
import { Switch } from '@/app/components/ui/switch'
import { SettingRow } from '@/app/components/ui/setting-row'

export default function AudioSettingsContent() {
  const [interactionSounds, setInteractionSounds] = useState(true)
  const [muteAudio, setMuteAudio] = useState(false)

  return (
    <div className="rounded-xl bg-[#F2F2F2]">
      <SettingRow>
        <div>
          <div className="text-sm font-medium text-[#1f1f1f]">Interaction Sounds</div>
          <div className="text-[13px] text-[#888]">Play a sound when recording starts and stops.</div>
        </div>
        <Switch checked={interactionSounds} onCheckedChange={setInteractionSounds} />
      </SettingRow>
      <SettingRow>
        <div>
          <div className="text-sm font-medium text-[#1f1f1f]">Mute audio when dictating</div>
          <div className="text-[13px] text-[#888]">Automatically silence other active audio during dictation.</div>
        </div>
        <Switch checked={muteAudio} onCheckedChange={setMuteAudio} />
      </SettingRow>
      <SettingRow last>
        <div>
          <div className="text-sm font-medium text-[#1f1f1f]">Select default microphone</div>
          <div className="text-[13px] text-[#888]">Select the microphone to use by default for audio input.</div>
        </div>
        <select className="w-64 bg-white border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]">
          <option>Default — MacBook Pro Microphone</option>
          <option>External USB Microphone</option>
        </select>
      </SettingRow>
    </div>
  )
}
