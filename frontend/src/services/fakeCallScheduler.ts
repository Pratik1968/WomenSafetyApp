import * as Notifications from 'expo-notifications';

const FAKE_CALL_IDENTIFIER = 'fake-call-scheduled';

export class FakeCallScheduler {
  private scheduledNotificationId: string | null = null;

  async scheduleFakeCall(delayMinutes: number): Promise<void> {
    await this.cancelFakeCall();

    const trigger: any = {
      seconds: delayMinutes * 60,
    };

    this.scheduledNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Incoming Call',
        body: 'Tap to answer',
        data: { action: 'FAKE_CALL' },
      },
      trigger,
    });
  }

  async cancelFakeCall(): Promise<void> {
    if (this.scheduledNotificationId) {
      await Notifications.cancelScheduledNotificationAsync(this.scheduledNotificationId);
      this.scheduledNotificationId = null;
    }
  }
}

export const fakeCallScheduler = new FakeCallScheduler();
