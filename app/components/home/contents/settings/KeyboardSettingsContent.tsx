import { useState } from 'react'
import { useSettingsStore } from '@/app/store/useSettingsStore'
import { ItoMode } from '@/app/generated/ito_pb'
import MultiShortcutEditor from '@/app/components/ui/multi-shortcut-editor'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { SUPPORTED_LANGUAGES } from '@/lib/constants/supported-languages'

function LanguageSelect({
  value,
  onValueChange,
}: {
  value: string
  onValueChange: (value: string) => void
}) {
  const [search, setSearch] = useState('')
  const filtered = search
    ? SUPPORTED_LANGUAGES.filter(
        l =>
          l.name.toLowerCase().includes(search.toLowerCase()) ||
          l.code.toLowerCase().includes(search.toLowerCase()),
      )
    : SUPPORTED_LANGUAGES

  const selectedLang = SUPPORTED_LANGUAGES.find(l => l.code === value)

  return (
    <Select value={value} onValueChange={onValueChange} onOpenChange={open => { if (!open) setSearch('') }}>
      <SelectTrigger className="w-[200px] bg-white">
        <SelectValue>
          {selectedLang ? `${selectedLang.name} (${selectedLang.code})` : value}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <div className="px-2 py-1.5">
          <input
            className="w-full rounded-md border border-[#EBEBEB] px-2 py-1.5 text-sm outline-none focus:border-[#999]"
            placeholder="Search languages..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.stopPropagation()}
          />
        </div>
        {filtered.map(lang => (
          <SelectItem key={lang.code} value={lang.code}>
            {lang.name} ({lang.code})
          </SelectItem>
        ))}
        {filtered.length === 0 && (
          <div className="px-2 py-1.5 text-sm text-[#888]">
            No languages found
          </div>
        )}
      </SelectContent>
    </Select>
  )
}

export default function KeyboardSettingsContent() {
  const {
    getItoModeShortcuts,
    translationTargetLanguage,
    translationType,
    translationLanguageA,
    translationLanguageB,
    setTranslationTargetLanguage,
    setTranslationType,
    setTranslationLanguageA,
    setTranslationLanguageB,
  } = useSettingsStore()
  const transcribeShortcuts = getItoModeShortcuts(ItoMode.TRANSCRIBE)
  const editShortcuts = getItoModeShortcuts(ItoMode.EDIT)
  const translateShortcuts = getItoModeShortcuts(ItoMode.TRANSLATE)

  return (
    <>
      <div className="rounded-xl bg-white">
        <div className="flex gap-4 justify-between py-4 px-5 border-b border-[#EBEBEB]">
          <div className="w-1/3">
            <div className="text-sm font-medium text-[#1f1f1f] mb-2">Keyboard Shortcut</div>
            <div className="text-[13px] text-[#888]">
              Set the keyboard shortcut to activate Ito. Press the keys you
              want to use for your shortcut.
            </div>
          </div>
          <MultiShortcutEditor
            shortcuts={transcribeShortcuts}
            mode={ItoMode.TRANSCRIBE}
          />
        </div>
        <div className="flex gap-4 justify-between py-4 px-5 border-b border-[#EBEBEB]">
          <div className="w-1/3">
            <div className="text-sm font-medium text-[#1f1f1f] mb-2">
              Intelligent Mode Shortcut
            </div>
            <div className="text-[13px] text-[#888]">
              Set the shortcut to activate Intelligent Mode. Press your
              hotkey, speak to Ito, and the LLM's output is pasted into your
              text box.
            </div>
          </div>
          <MultiShortcutEditor
            shortcuts={editShortcuts}
            mode={ItoMode.EDIT}
          />
        </div>
        <div className="flex gap-4 justify-between py-4 px-5">
          <div className="w-1/3">
            <div className="text-sm font-medium text-[#1f1f1f] mb-2">
              Translation Mode Shortcut
            </div>
            <div className="text-[13px] text-[#888]">
              Set the shortcut to activate Translation Mode. Press your hotkey,
              speak in any language, and Ito translates into your chosen target
              language.
            </div>
          </div>
          <MultiShortcutEditor
            shortcuts={translateShortcuts}
            mode={ItoMode.TRANSLATE}
          />
        </div>
      </div>

      <div className="text-xs font-semibold tracking-[1.5px] text-[#999] uppercase mt-6 mb-3">
        Translation Settings
      </div>
      <div className="rounded-xl bg-white">
        <div className="flex items-center justify-between py-4 px-5 border-b border-[#EBEBEB]">
          <div>
            <div className="text-sm font-medium text-[#1f1f1f]">Translation Type</div>
            <div className="text-[13px] text-[#888]">
              One-way: translates any spoken language into your target language.
              <br />
              Two-way: translates back and forth between two specific languages.
            </div>
          </div>
          <div className="flex rounded-lg bg-[#F2F2F2] p-0.5">
            <button
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                translationType === 'one_way'
                  ? 'bg-white text-[#1f1f1f] shadow-sm font-medium'
                  : 'text-[#888] hover:text-[#1f1f1f]'
              }`}
              onClick={() => setTranslationType('one_way')}
            >
              One-way
            </button>
            <button
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                translationType === 'two_way'
                  ? 'bg-white text-[#1f1f1f] shadow-sm font-medium'
                  : 'text-[#888] hover:text-[#1f1f1f]'
              }`}
              onClick={() => setTranslationType('two_way')}
            >
              Two-way
            </button>
          </div>
        </div>

        {translationType === 'one_way' ? (
          <div className="flex items-center justify-between py-4 px-5">
            <div>
              <div className="text-sm font-medium text-[#1f1f1f]">Target Language</div>
              <div className="text-[13px] text-[#888]">
                Spoken audio in any language will be translated into this language.
              </div>
            </div>
            <LanguageSelect
              value={translationTargetLanguage}
              onValueChange={setTranslationTargetLanguage}
            />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between py-4 px-5 border-b border-[#EBEBEB]">
              <div>
                <div className="text-sm font-medium text-[#1f1f1f]">Language A</div>
                <div className="text-[13px] text-[#888]">
                  First language in the translation pair.
                </div>
              </div>
              <LanguageSelect
                value={translationLanguageA}
                onValueChange={setTranslationLanguageA}
              />
            </div>
            <div className="flex items-center justify-between py-4 px-5">
              <div>
                <div className="text-sm font-medium text-[#1f1f1f]">Language B</div>
                <div className="text-[13px] text-[#888]">
                  Second language in the translation pair.
                </div>
              </div>
              <LanguageSelect
                value={translationLanguageB}
                onValueChange={setTranslationLanguageB}
              />
            </div>
          </>
        )}
      </div>
    </>
  )
}
