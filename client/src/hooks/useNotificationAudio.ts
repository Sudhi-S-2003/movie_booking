import { useEffect, useRef, useCallback } from 'react';
import { useNotificationStore } from '../store/notificationStore.js';

const AUDIO_SRC = '/notification.mp3';
const FALLBACK_AUDIO_SRC = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
const AUDIO_PLAYBACK_LIMIT = 3000; // 3 seconds maximum

export const useNotificationAudio = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlocked = useRef(false);
  const isSoundEnabled = useNotificationStore(state => state.isSoundEnabled);
  const isSoundEnabledRef = useRef(isSoundEnabled);

  // Sync ref with state for use in async/socket callbacks to avoid stale closures
  useEffect(() => {
    isSoundEnabledRef.current = isSoundEnabled;
  }, [isSoundEnabled]);

  // Preload audio instance once on mount
  useEffect(() => {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') {
      console.warn('🔊 [NOTIFICATION] Audio API not supported in this environment. Skipping audio.');
      return;
    }
    
    try {
      const audio = new Audio(AUDIO_SRC);
      audio.preload = 'auto';
      audio.volume = 0.5;
      audioRef.current = audio;

      audio.onerror = () => {
        console.warn('🔊 [NOTIFICATION] Primary audio failed to load, switching to fallback...');
        if (audioRef.current) audioRef.current.src = FALLBACK_AUDIO_SRC;
      };
    } catch (e) {
      console.warn('🔊 [NOTIFICATION] Failed to initialize Audio object. Skipping audio.');
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Unlock audio context on first user interaction (Browser Compliance)
  useEffect(() => {
    const unlock = () => {
      if (audioUnlocked.current || !audioRef.current) return;
      
      const audio = audioRef.current;
      audio.muted = true;
      
      audio.play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false; // Restore sound for actual notifications
          audioUnlocked.current = true;
          console.log('🔊 [NOTIFICATION] Audio context successfully unlocked');
          cleanup();
        })
        .catch(() => {
          // If it failed, restore muted state so we can try again
          audio.muted = false;
        });
    };

    const cleanup = () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    window.addEventListener('click', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock);

    return cleanup;
  }, []);

  const playNotificationSound = useCallback(() => {
    if (!isSoundEnabledRef.current || !audioRef.current) return;

    try {
      const audio = audioRef.current;
      audio.currentTime = 0;
      
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setTimeout(() => {
              if (audio && !audio.paused) {
                audio.pause();
                audio.currentTime = 0;
              }
            }, AUDIO_PLAYBACK_LIMIT);
          })
          .catch(err => {
            console.warn('🔊 [NOTIFICATION] Playback restricted by browser policy:', err.message);
          });
      }
    } catch (error) {
      console.error('🔊 [NOTIFICATION] Audio playback failure:', error);
    }
  }, []);

  return { playNotificationSound };
};
