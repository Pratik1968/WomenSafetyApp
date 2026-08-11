import { Audio } from "expo-av";

export class SoundService {
  private sound: Audio.Sound | null = null;
  private voice: Audio.Sound | null = null;
  private isPlaying: boolean = false;
  private isVoicePlaying: boolean = false;

  /**
   * Play ringtone audio on loop when fake call is incoming
   */
  public async playRingtone(ringtoneName: string = "Marimba"): Promise<void> {
    try {
      await this.stopRingtone();

      if (ringtoneName === "Silent") {
        return;
      }

      // Configure Audio Mode for call playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Map ringtone names to actual audio URLs
      let audioUri = "https://bigsoundbank.com/UPLOAD/mp3/0452.mp3"; // Default (Marimba)
      if (ringtoneName === "Classic") {
        audioUri = "https://bigsoundbank.com/UPLOAD/mp3/1111.mp3";
      }

      // Synthetic audio tone stream or ringtone sound resource
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true, isLooping: true, volume: 0.9 }
      );

      this.sound = sound;
      this.isPlaying = true;
    } catch {
      // Audio playback fallback if offline or network unavailable
      this.isPlaying = true;
    }
  }

  /**
   * Stop ringtone audio immediately when call is answered or declined
   */
  public async stopRingtone(): Promise<void> {
    if (!this.isPlaying && !this.sound) return;

    try {
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
      }
    } catch {
      // Silently ignore unload errors
    } finally {
      this.sound = null;
      this.isPlaying = false;
    }
  }

  /**
   * Play prerecorded voice
   */
  public async playVoice(callerName: string): Promise<void> {
    try {
      await this.stopVoice();

      const text = callerName.includes('Mom') 
        ? "Hi! Where are you? I'm waiting outside. Come quickly." 
        : "I'm already nearby. Stay where you are.";

      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=en&client=tw-ob`;

      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true, isLooping: false, volume: 1.0 }
      );

      this.voice = sound;
      this.isVoicePlaying = true;
    } catch (e) {
      console.log("Failed to play voice", e);
    }
  }

  public async stopVoice(): Promise<void> {
    if (!this.isVoicePlaying && !this.voice) return;

    try {
      if (this.voice) {
        await this.voice.stopAsync();
        await this.voice.unloadAsync();
      }
    } catch {
    } finally {
      this.voice = null;
      this.isVoicePlaying = false;
    }
  }
}

export const soundService = new SoundService();
