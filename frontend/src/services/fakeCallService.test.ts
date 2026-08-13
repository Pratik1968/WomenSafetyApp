import AsyncStorage from '@react-native-async-storage/async-storage';
import { fakeCallService, DEFAULT_FAKE_CALL_CONFIG } from './fakeCallService';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('fakeCallService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return DEFAULT_FAKE_CALL_CONFIG if no config is stored', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    const config = await fakeCallService.getConfig();
    expect(config).toEqual(DEFAULT_FAKE_CALL_CONFIG);
  });

  it('should backfill delayMinutes to 0 if it is missing from stored config', async () => {
    const oldConfig = {
      callerName: 'Dad',
      ringtone: 'Silent',
      vibrate: false,
      autoPlayVoice: false,
      // Missing delayMinutes
    };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(oldConfig));
    
    const config = await fakeCallService.getConfig();
    expect(config.delayMinutes).toBe(0);
    expect(config.callerName).toBe('Dad');
  });

  it('should use stored delayMinutes if present', async () => {
    const storedConfig = {
      callerName: 'Mom',
      ringtone: 'Marimba',
      vibrate: true,
      autoPlayVoice: true,
      delayMinutes: 5,
    };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(storedConfig));
    
    const config = await fakeCallService.getConfig();
    expect(config.delayMinutes).toBe(5);
  });
});
