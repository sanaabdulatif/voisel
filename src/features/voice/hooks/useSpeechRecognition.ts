import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../../shared/lib/store';
import { parseVoiceCommand } from '../utils/voiceParser';

export function useSpeechRecognition(lang: 'en-IN' | 'ml-IN' = 'en-IN') {
  const {
    setVoiceStatus,
    setVoiceTranscript,
    setVoiceConfirmation,
    setVoiceError,
    voiceStatus
  } = useAppStore();

  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      recognitionRef.current = rec;
    } else {
      setIsSupported(false);
    }
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) {
      setVoiceError('Speech recognition is not supported in this browser.');
      return;
    }

    try {
      setVoiceStatus('listening');
      setVoiceError(null);
      setVoiceTranscript('');
      setVoiceConfirmation(null);

      recognitionRef.current.lang = lang;
      
      recognitionRef.current.onstart = () => {
        setVoiceStatus('listening');
      };

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setVoiceTranscript(transcript);
        setVoiceStatus('processing');
        
        // Parse the text into structured confirmation card
        setTimeout(() => {
          const parsed = parseVoiceCommand(transcript);
          if (parsed) {
            setVoiceConfirmation(parsed);
            setVoiceStatus('success');
          } else {
            setVoiceError("Could not parse command. Try: 'Tomato 2 kg vittu' or 'Apple 2 kg sold'. Tip: Switch between English and Malayalam using the buttons at the top of this modal!");
            setVoiceStatus('error');
          }
        }, 1000);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          setVoiceError('No speech detected. Please try again.');
        } else if (event.error === 'not-allowed') {
          setVoiceError('Microphone permission denied.');
        } else {
          setVoiceError(`Error: ${event.error}`);
        }
        setVoiceStatus('error');
      };

      recognitionRef.current.onend = () => {
        // Only reset if we were listening and got aborted
        useAppStore.setState((state) => {
          if (state.voiceStatus === 'listening') {
            return { voiceStatus: 'idle' };
          }
          return {};
        });
      };

      recognitionRef.current.start();
    } catch (e) {
      console.error(e);
      setVoiceStatus('error');
      setVoiceError('Failed to start speech recognition.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && voiceStatus === 'listening') {
      recognitionRef.current.stop();
      setVoiceStatus('idle');
    }
  };

  const simulateSpeech = (text: string) => {
    setVoiceStatus('listening');
    setVoiceTranscript(text);
    setVoiceError(null);
    setVoiceConfirmation(null);

    setTimeout(() => {
      setVoiceStatus('processing');
      setTimeout(() => {
        const parsed = parseVoiceCommand(text);
        if (parsed) {
          setVoiceConfirmation(parsed);
          setVoiceStatus('success');
        } else {
          setVoiceError("Could not parse command. Try: 'Tomato 2 kg vittu' or 'Apple 2 kg sold'. Tip: Switch between English and Malayalam using the buttons at the top of this modal!");
          setVoiceStatus('error');
        }
      }, 1000);
    }, 1000);
  };

  return {
    isSupported,
    startListening,
    stopListening,
    simulateSpeech,
    isListening: voiceStatus === 'listening'
  };
}
