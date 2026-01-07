import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface FacebookDownloadState {
  // Legal acceptance
  legalAccepted: boolean;
  setLegalAccepted: (accepted: boolean) => void;
  
  // Settings
  defaultFormat: 'video' | 'audio';
  defaultAudioFormat: 'mp3' | 'm4a';
  defaultQuality: 'best' | '720p' | '480p' | '360p';
  maxConcurrentDownloads: number;
  
  updateSettings: (settings: Partial<Omit<FacebookDownloadState, 'legalAccepted' | 'setLegalAccepted' | 'updateSettings'>>) => void;
}

/**
 * Facebook-specific store for legal acceptance and settings
 */
export const useFacebookStore = create<FacebookDownloadState>()(
  persist(
    (set) => ({
      // Legal
      legalAccepted: false,
      setLegalAccepted: (accepted: boolean) => set({ legalAccepted: accepted }),
      
      // Settings
      defaultFormat: 'video',
      defaultAudioFormat: 'mp3',
      defaultQuality: 'best',
      maxConcurrentDownloads: 3,
      
      updateSettings: (settings) => set(settings),
    }),
    {
      name: 'facebook-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        legalAccepted: state.legalAccepted,
        defaultFormat: state.defaultFormat,
        defaultAudioFormat: state.defaultAudioFormat,
        defaultQuality: state.defaultQuality,
        maxConcurrentDownloads: state.maxConcurrentDownloads,
      }),
    }
  )
);

