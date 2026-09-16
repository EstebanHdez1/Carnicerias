import { useState, useEffect, useCallback } from 'react';

export function useDraft(storageKey, initialValue) {
  const [hasDraft, setHasDraft] = useState(false);
  const [savedDraft, setSavedDraft] = useState(null);

  // Check for existing draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`draft_${storageKey}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Only consider draft if it actually has content
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          setSavedDraft(parsed);
          setHasDraft(true);
        }
      }
    } catch (e) {
      console.warn('Error reading draft from localStorage', e);
    }
  }, [storageKey]);

  // Save draft periodically or on form changes
  const saveDraft = useCallback(
    (data) => {
      try {
        localStorage.setItem(`draft_${storageKey}`, JSON.stringify(data));
      } catch (e) {
        console.warn('Error saving draft to localStorage', e);
      }
    },
    [storageKey]
  );

  // Clear draft ONLY upon backend confirmation OK
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(`draft_${storageKey}`);
      setHasDraft(false);
      setSavedDraft(null);
    } catch (e) {
      console.warn('Error clearing draft from localStorage', e);
    }
  }, [storageKey]);

  // Dismiss draft without applying
  const discardDraft = useCallback(() => {
    clearDraft();
  }, [clearDraft]);

  return {
    hasDraft,
    savedDraft,
    saveDraft,
    clearDraft,
    discardDraft,
  };
}
