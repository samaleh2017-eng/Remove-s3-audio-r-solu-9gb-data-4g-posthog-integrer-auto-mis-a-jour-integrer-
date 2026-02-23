import { ReactNode } from 'react'
import { Switch } from '@/app/components/ui/switch'
import { MicrophoneSelector } from '@/app/components/ui/microphone-selector'
import { useSettingsStore } from '@/app/store/useSettingsStore'

function SettingRow({ children, last }: { children: ReactNode; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-4 px-5 ${!last ? 'border-b border-[#EBEBEB]' : ''}`}>
      {children}
    </div>
  )
}

export default function AudioSettingsContent() {
  const {
    microphoneDeviceId,
    microphoneName,
    interactionSounds,
    muteAudioWhenDictating,
    setMicrophoneDeviceId,
    setInteractionSounds,
    setMuteAudioWhenDictating,
  } = useSettingsStore()

  return (
    <div className="rounded-xl bg-[#F2F2F2]">
      <SettingRow>
        <div>
          <div className="text-sm font-medium text-[#1f1f1f]">Interaction Sounds</div>
          <div className="text-[13px] text-[#888]">
            Play a sound when Ito starts and stops recording.
          </div>
        </div>
        <Switch
          checked={interactionSounds}
          onCheckedChange={setInteractionSounds}
        />
      </SettingRow>
      <SettingRow>
        <div>
          <div className="text-sm font-medium text-[#1f1f1f]">
            Mute audio when dictating
          </div>
          <div className="text-[13px] text-[#888]">
            Automatically silence other active audio during dictation.
          </div>
        </div>
        <Switch
          checked={muteAudioWhenDictating}
          onCheckedChange={setMuteAudioWhenDictating}
        />
      </SettingRow>
      <SettingRow last>
        <div>
          <div className="text-sm font-medium text-[#1f1f1f]">
            Select default microphone
          </div>
          <div className="text-[13px] text-[#888]">
            Select the microphone Ito will use by default for audio input.
          </div>
        </div>
        <MicrophoneSelector
          selectedDeviceId={microphoneDeviceId}
          selectedMicrophoneName={microphoneName}
          onSelectionChange={setMicrophoneDeviceId}
          triggerButtonVariant="outline"
          triggerButtonClassName=""
        />
      </SettingRow>
    </div>
  )
}
