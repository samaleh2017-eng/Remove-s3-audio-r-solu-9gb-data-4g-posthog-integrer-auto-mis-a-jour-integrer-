import React from 'react'
import {
  getOnboardingCategoryIndex,
  useOnboardingStore,
} from '@/app/store/useOnboardingStore'

export const OnboardingTitlebar = () => {
  const { onboardingStep, totalOnboardingSteps, onboardingCategory } =
    useOnboardingStore()
  const onboardingProgress = Math.ceil(
    ((onboardingStep + 1) / totalOnboardingSteps) * 100,
  )
  const onboardingCategoryIndex = getOnboardingCategoryIndex(onboardingCategory)

  return (
    <>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[2] text-[12px] font-medium tracking-[0.14em]">
        {['Sign Up', 'Permissions', 'Set Up', 'Try it'].map(
          (step, idx, arr) => (
            <React.Fragment key={step}>
              <span
                className={`inline-flex items-center mx-6 transition-opacity ${
                  idx <= onboardingCategoryIndex
                    ? 'text-foreground opacity-100'
                    : 'text-[color:var(--muted-foreground)] opacity-70'
                }`}
              >
                {step.toUpperCase()}
              </span>
              {idx < arr.length - 1 && (
                <span
                  className={`inline-flex items-center text-[20px] mx-6 -mt-1 ${
                    idx < onboardingCategoryIndex
                      ? 'text-foreground opacity-70'
                      : 'text-[color:var(--muted-foreground)] opacity-40'
                  }`}
                  aria-hidden="true"
                >
                  &#8250;
                </span>
              )}
            </React.Fragment>
          ),
        )}
      </div>

      <div className="absolute left-0 right-0 bottom-0 h-[3px] bg-[var(--muted)] rounded-full overflow-hidden pointer-events-none z-[1]">
        <div
          className="h-full bg-[var(--ring)] rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${onboardingProgress}%` }}
        />
      </div>
    </>
  )
}
