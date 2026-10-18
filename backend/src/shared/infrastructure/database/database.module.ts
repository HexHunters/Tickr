import { join } from 'path';

import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Import all entities explicitly for reliability
import { EventAnalyticsOrmEntity } from '../../../modules/analytics/infrastructure/persistence/entities/event-analytics.orm-entity';
import { MetricOrmEntity } from '../../../modules/analytics/infrastructure/persistence/entities/metric.orm-entity';
import { PlatformAnalyticsOrmEntity } from '../../../modules/analytics/infrastructure/persistence/entities/platform-analytics.orm-entity';
import { EventCheckInStaffAssignmentOrmEntity } from '../../../modules/events/infrastructure/persistence/entities/event-check-in-staff-assignment.orm-entity';
import { EventOrmEntity } from '../../../modules/events/infrastructure/persistence/entities/event.orm-entity';
import { TicketTypeOrmEntity } from '../../../modules/events/infrastructure/persistence/entities/ticket-type.orm-entity';
import { NotificationPreferenceOrmEntity } from '../../../modules/notifications/infrastructure/persistence/entities/notification-preference.orm-entity';
import { NotificationTemplateOrmEntity } from '../../../modules/notifications/infrastructure/persistence/entities/notification-template.orm-entity';
import { NotificationOrmEntity } from '../../../modules/notifications/infrastructure/persistence/entities/notification.orm-entity';
import { OrderItemOrmEntity } from '../../../modules/payments/infrastructure/persistence/entities/order-item.orm-entity';
import { OrderOrmEntity } from '../../../modules/payments/infrastructure/persistence/entities/order.orm-entity';
import { PaymentOrmEntity } from '../../../modules/payments/infrastructure/persistence/entities/payment.orm-entity';
import { RefundOrmEntity } from '../../../modules/payments/infrastructure/persistence/entities/refund.orm-entity';
import { CheckInOrmEntity } from '../../../modules/tickets/infrastructure/persistence/entities/check-in.orm-entity';
import { TicketOrmEntity } from '../../../modules/tickets/infrastructure/persistence/entities/ticket.orm-entity';
import { UserEntity } from '../../../modules/users/infrastructure/persistence/entities/user.orm-entity';
import { VerificationTokenEntity } from '../../../modules/users/infrastructure/persistence/entities/verification-token.orm-entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_DATABASE', 'tickr'),
        entities: [
          // Users module entities
          UserEntity,
          VerificationTokenEntity,
          // Events module entities
          EventOrmEntity,
          EventCheckInStaffAssignmentOrmEntity,
          TicketTypeOrmEntity,
          // Tickets module entities
          TicketOrmEntity,
          CheckInOrmEntity,
          // Payments module entities
          OrderOrmEntity,
          OrderItemOrmEntity,
          PaymentOrmEntity,
          RefundOrmEntity,
          // Notifications module entities
          NotificationOrmEntity,
          NotificationPreferenceOrmEntity,
          NotificationTemplateOrmEntity,
          // Analytics module entities
          MetricOrmEntity,
          EventAnalyticsOrmEntity,
          PlatformAnalyticsOrmEntity,
        ],
        migrations: [
          join(__dirname, `migrations/*-*.${__filename.endsWith('.ts') ? 'ts' : 'js'}`),
        ],
        synchronize: configService.get<string>('NODE_ENV') === 'development',
        logging: configService.get<string>('NODE_ENV') === 'development',
        migrationsTableName: 'migrations',
        extra: {
          min: configService.get<number>('DB_POOL_MIN', 5),
          max: configService.get<number>('DB_POOL_MAX', 20),
          idleTimeoutMillis: 30000,
        },
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
