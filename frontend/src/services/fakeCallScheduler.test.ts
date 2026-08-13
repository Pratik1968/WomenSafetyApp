import * as Notifications from 'expo-notifications';
import { fakeCallScheduler } from './fakeCallScheduler';

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
}));

describe('fakeCallScheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // clear internal state
    (fakeCallScheduler as any).scheduledNotificationId = null;
  });

  it('should schedule a notification with correct delay math', async () => {
    (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValueOnce('test-id');

    await fakeCallScheduler.scheduleFakeCall(3); // 3 minutes

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: {
        title: 'Incoming Call',
        body: 'Tap to answer',
        data: { action: 'FAKE_CALL' },
      },
      trigger: {
        seconds: 180, // 3 * 60
      },
    });

    expect((fakeCallScheduler as any).scheduledNotificationId).toBe('test-id');
  });

  it('should cancel an existing scheduled call before scheduling a new one', async () => {
    (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValueOnce('test-id-1');
    await fakeCallScheduler.scheduleFakeCall(1);
    expect((fakeCallScheduler as any).scheduledNotificationId).toBe('test-id-1');

    (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValueOnce('test-id-2');
    await fakeCallScheduler.scheduleFakeCall(2);

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('test-id-1');
    expect((fakeCallScheduler as any).scheduledNotificationId).toBe('test-id-2');
  });

  it('should cancel a pending scheduled call', async () => {
    (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValueOnce('test-id');
    await fakeCallScheduler.scheduleFakeCall(5);
    expect((fakeCallScheduler as any).scheduledNotificationId).toBe('test-id');

    await fakeCallScheduler.cancelFakeCall();

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('test-id');
    expect((fakeCallScheduler as any).scheduledNotificationId).toBeNull();
  });
});
