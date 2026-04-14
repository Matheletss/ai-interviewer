import { useState, useEffect, useCallback } from 'react';

interface ProctoringState {
  tabSwitchCount: number;
  showWarning: boolean;
  dismissWarning: () => void;
}

/**
 * Custom hook that detects tab switches / window minimisation
 * and exposes a warning overlay state for the interview page.
 */
export const useProctoring = (isInterviewStarted: boolean): ProctoringState => {
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(0);
  const [showWarning, setShowWarning] = useState<boolean>(false);

  useEffect(() => {
    if (!isInterviewStarted) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => prev + 1);
        setShowWarning(true);
        console.warn('[Proctoring] Tab switch detected!');
      }
    };

    // Also detect window blur (covers Alt+Tab on some browsers)
    const handleBlur = () => {
      if (isInterviewStarted) {
        setTabSwitchCount(prev => prev + 1);
        setShowWarning(true);
        console.warn('[Proctoring] Window blur detected!');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isInterviewStarted]);

  const dismissWarning = useCallback(() => {
    setShowWarning(false);
  }, []);

  return { tabSwitchCount, showWarning, dismissWarning };
};
