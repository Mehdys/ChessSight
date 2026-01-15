export class VoiceCoach {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.transcriptCallback = null;

        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';

            this.recognition.onstart = () => {
                this.isListening = true;
                this.updateMicIcon(true);
            };

            this.recognition.onend = () => {
                this.isListening = false;
                this.updateMicIcon(false);
            };

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                if (this.transcriptCallback) {
                    this.transcriptCallback(transcript);
                }
            };
        } else {
            console.warn('Web Speech API not supported');
        }
    }

    setTranscriptCallback(callback) {
        this.transcriptCallback = callback;
    }

    toggleListen() {
        if (!this.recognition) return;
        if (this.isListening) {
            this.recognition.stop();
        } else {
            this.recognition.start();
        }
    }

    updateMicIcon(active) {
        const btn = document.getElementById('mic-btn');
        if (btn) {
            btn.querySelector('i').textContent = active ? 'mic_off' : 'mic';
            btn.style.color = active ? 'red' : 'inherit';
        }
    }

    speak(text) {
        if (!window.speechSynthesis) return;

        // Don't speak if mute is toggled on (icon checks)
        const muteBtn = document.getElementById('tts-toggle');
        const isMuted = muteBtn && muteBtn.querySelector('i').textContent === 'volume_off';
        if (isMuted) return;

        // Cancel current speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
    }
}
