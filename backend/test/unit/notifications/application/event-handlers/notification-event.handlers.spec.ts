import type { SendNotificationCommand } from '@modules/notifications/application/commands/send-notification/send-notification.command';
import type { SendNotificationHandler } from '@modules/notifications/application/commands/send-notification/send-notification.handler';
import { NotificationEventHandlers } from '@modules/notifications/application/event-handlers/notification-event.handlers';
import { NotificationChannel } from '@modules/notifications/domain/value-objects/notification-channel.vo';
import { NotificationPriority } from '@modules/notifications/domain/value-objects/notification-priority.vo';
import { NotificationType } from '@modules/notifications/domain/value-objects/notification-type.vo';
import { Result } from '@shared/domain/result';


describe('NotificationEventHandlers', () => {
  let execute: jest.Mock;
  let handlers: NotificationEventHandlers;

  const lastCommand = (): SendNotificationCommand =>
    execute.mock.calls[execute.mock.calls.length - 1][0];

  beforeEach(() => {
    execute = jest.fn().mockResolvedValue(
      Result.ok({ notificationId: 'n-1', status: 'SENT' }),
    );
    handlers = new NotificationEventHandlers({
      execute,
    } as unknown as SendNotificationHandler);
  });

  it('sends the verification link without exposing the raw token', async () => {
    await handlers.onUserRegistered({
      userId: 'u-1',
      email: 'jane@example.com',
      firstName: 'Jane',
      verificationToken: 'secret-token',
      verificationUrl: 'http://localhost:3001/verify-email?token=secret-token',
    });

    const command = lastCommand();
    expect(command.type).toBe(NotificationType.EMAIL_VERIFICATION);
    expect(command.channel).toBe(NotificationChannel.EMAIL);
    expect(command.templateSlug).toBe('email-verification');
    expect(command.priority).toBe(NotificationPriority.HIGH);
    expect(command.templateData).toEqual({
      firstName: 'Jane',
      verificationUrl: 'http://localhost:3001/verify-email?token=secret-token',
    });
  });

  it('sends the password reset link with high priority', async () => {
    await handlers.onPasswordResetRequested({
      userId: 'u-1',
      email: 'jane@example.com',
      firstName: 'Jane',
      resetUrl: 'http://localhost:3001/reset-password?token=abc',
    });

    const command = lastCommand();
    expect(command.type).toBe(NotificationType.PASSWORD_RESET);
    expect(command.recipient).toEqual({ email: 'jane@example.com' });
    expect(command.templateSlug).toBe('password-reset-request');
    expect(command.priority).toBe(NotificationPriority.HIGH);
    expect(command.templateData).toEqual({
      firstName: 'Jane',
      resetUrl: 'http://localhost:3001/reset-password?token=abc',
    });
  });

  it('sends a security alert after the password changes', async () => {
    await handlers.onPasswordReset({
      userId: 'u-1',
      email: 'jane@example.com',
      firstName: 'Jane',
    });

    const command = lastCommand();
    expect(command.type).toBe(NotificationType.SECURITY_ALERT);
    expect(command.templateSlug).toBe('password-changed');
    expect(command.templateData).toEqual({ firstName: 'Jane' });
    expect(command.priority).toBe(NotificationPriority.HIGH);
  });

  it('does not throw when delivery fails', async () => {
    execute.mockResolvedValue(
      Result.fail({ type: 'SEND_FAILED', message: 'provider down' }),
    );

    await expect(
      handlers.onPasswordResetRequested({
        userId: 'u-1',
        email: 'jane@example.com',
        firstName: 'Jane',
        resetUrl: 'http://localhost:3001/reset-password?token=abc',
      }),
    ).resolves.toBeUndefined();
  });
});
