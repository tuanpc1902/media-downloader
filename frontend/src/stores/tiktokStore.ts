import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface TikTokDownloadState {
  // Legal acceptance
  legalAccepted: boolean;
  setLegalAccepted: (accepted: boolean) => void;
  
  // Settings
  defaultFormat: 'video' | 'audio';
  defaultAudioFormat: 'mp3' | 'm4a';
  defaultQuality: 'best' | '720p' | '480p' | '360p';
  maxConcurrentDownloads: number;
  
  updateSettings: (settings: Partial<Omit<TikTokDownloadState, 'legalAccepted' | 'setLegalAccepted' | 'updateSettings'>>) => void;
}

/**
 * TikTok-specific store for legal acceptance and settings
 */
export const useTikTokStore = create<TikTokDownloadState>()(
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
      name: 'tiktok-store',
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

