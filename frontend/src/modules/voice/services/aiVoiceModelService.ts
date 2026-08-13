/**
 * AI Keyword Spotting / Voice Model Inference Service Stub
 * Runs lightweight on-device ML model inference on audio frames.
 */

import { VoiceModelMeta } from '../types/voice.types';

export class AIVoiceModelService {
  public async loadOnDeviceModel(modelMeta: VoiceModelMeta): Promise<boolean> {
    return false;
  }

  public async predictKeyword(pcmBuffer: Float32Array): Promise<{ keyword: string; confidence: number }> {
    return { keyword: 'HELP', confidence: 0.0 };
  }
}

export const aiVoiceModelService = new AIVoiceModelService();
