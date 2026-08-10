import { Audio } from 'expo-av';

/**
 * Service handling voice playback after a fake call is answered.
 * Supports male/female preset recordings and optional custom URIs.
 */
export class VoiceService {
  private sound: Audio.Sound | null = null;
  private isPlaying: boolean = false;

  /**
   * Play a voice clip based on the selected gender.
   * If a custom recording URL is supplied, it will be used; otherwise a default remote sample is played.
   */
  public async playVoice(
    voiceGender: 'Male' | 'Female',
    customUri?: string,
  ): Promise<void> {
    // Ensure any previous voice playback is stopped
    await this.stopVoice();

    // Resolve the source to play
    const source = customUri
      ? { uri: customUri }
      : voiceGender === 'Male'
      ? { uri: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm.ogg' } // placeholder male
      : { uri: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm.ogg' }; // placeholder female (reuse for demo)

    try {
      const { sound } = await Audio.Sound.createAsync(source, {
        shouldPlay: true,
        isLooping: false,
        volume: 1.0,
      });
      this.sound = sound;
      this.isPlaying = true;
    } catch (e) {
      // Silently ignore playback errors in the preparation phase
      console.warn('Voice playback error', e);
    }
  }

  /**
   * Stop any currently playing voice audio and unload the resource.
   */
  public async stopVoice(): Promise<void> {
    if (!this.isPlaying || !this.sound) return;
    try {
      await this.sound.stopAsync();
      await this.sound.unloadAsync();
    } catch {
      // ignore errors
    } finally {
      this.sound = null;
      this.isPlaying = false;
    }
  }
}

export const voiceService = new VoiceService();
