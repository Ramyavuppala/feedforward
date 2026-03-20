import React from 'react';

// Ordered steps for the full delivery lifecycle.
const STEPS = ['Pending', 'Accepted', 'Picked', 'Delivered'];

/**
 * Live status tracker for a seeker request.
 *
 * Step rules:
 * - requestStatus === "pending"  -> step 1 (Pending)
 * - requestStatus === "accepted" -> step 2 (Accepted)
 * - volunteerStatus === "picked" -> step 3 (Picked)
 * - volunteerStatus === "delivered" OR requestStatus === "completed" -> step 4 (Delivered)
 *
 * The component is defensive against missing/null values so it can be reused safely.
 */
export default function StatusTracker({ requestStatus, volunteerStatus }) {
  const normalizedReq = (requestStatus || '').toLowerCase();
  const normalizedVolunteer = (volunteerStatus || '').toLowerCase();

  let currentStep = 0;
  if (normalizedReq === 'pending') currentStep = 1;
  else if (normalizedReq === 'accepted') currentStep = 2;
  if (normalizedVolunteer === 'picked') currentStep = 3;
  if (normalizedVolunteer === 'delivered' || normalizedReq === 'completed') currentStep = 4;

  // Clamp between 0 and 4
  if (!Number.isFinite(currentStep)) currentStep = 0;
  currentStep = Math.max(0, Math.min(4, currentStep));

  return (
    <div className="flex items-center gap-1">
      {STEPS.map((label, index) => {
        const stepNumber = index + 1;
        const isCompleted = currentStep > stepNumber;
        const isCurrent = currentStep === stepNumber;

        let circleClass = 'bg-stone-200 text-stone-500';
        if (isCompleted) circleClass = 'bg-emerald-500 text-white';
        else if (isCurrent) circleClass = 'bg-blue-500 text-white';

        let lineClass = 'bg-stone-200';
        if (currentStep > stepNumber) lineClass = 'bg-emerald-500';
        else if (currentStep === stepNumber) lineClass = 'bg-blue-400';

        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300 ${
                  circleClass
                } ${isCurrent ? 'scale-110 shadow-md' : ''}`}
              >
                {isCompleted ? '✓' : stepNumber}
              </div>
              <span
                className={`text-[11px] font-medium ${
                  isCompleted || isCurrent ? 'text-stone-800' : 'text-stone-400'
                }`}
              >
                {label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 mt-3 rounded-full transition-colors duration-300 ${lineClass}`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

