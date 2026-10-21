import { resolve } from 'path';

import { QRCodeVO } from '@modules/tickets/domain/value-objects/qr-code.vo';
import { Logger } from '@nestjs/common';
import { hash } from 'bcrypt';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';

import { AppDataSource } from '../data-source';

import { assertDemoTarget } from './demo-target';
import { seedEntranceScenarios } from './entrance-scenarios';

const logger = new Logger('DemoSeed');

async function run(): Promise<void> {
  assertDemoTarget({
    nodeEnv: process.env.NODE_ENV,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    databaseUrl: process.env.DATABASE_URL,
  });
  const dataSource = new DataSource({
    ...AppDataSource.options,
    logging: false,
  });
  await dataSource.initialize();
  try {
    await dataSource.runMigrations();
    const passwordHash = await hash('TickrDemo2026!', 10);
    await dataSource.transaction(async (manager) => {
      const users = [
        [
          '10000000-0000-4000-8000-000000000001',
          'participant@demo.tickr.local',
          'Amal',
          'Démo',
          'PARTICIPANT',
        ],
        [
          '10000000-0000-4000-8000-000000000002',
          'organizer@demo.tickr.local',
          'Tickr',
          'Studio',
          'ORGANIZER',
        ],
        [
          '10000000-0000-4000-8000-000000000003',
          'other@demo.tickr.local',
          'Sami',
          'Démo',
          'PARTICIPANT',
        ],
      ];
      for (const [id, email, firstName, lastName, role] of users) {
        await manager.query(
          'INSERT INTO users.users (id,email,password_hash,first_name,last_name,role,is_organizer,email_verified,is_active) VALUES ($1,$2,$3,$4,$5,$6,$7,true,true) ON CONFLICT DO NOTHING',
          [
            id,
            email,
            passwordHash,
            firstName,
            lastName,
            role,
            role === 'ORGANIZER',
          ],
        );
      }
      const events = [
        {
          title: 'Nuits sonores',
          category: 'CONCERT',
          city: 'Tunis',
          venue: 'Carthage · Scène de démonstration',
          poster: 'sonores',
          price: 45,
          offset: 30,
          sold: 1,
          description:
            'Une scène ouverte sur la nuit, des sons qui se croisent et le plaisir de se retrouver. Entre live et musiques électroniques, on prend le temps d’écouter, de danser, de rester encore un peu.',
        },
        {
          title: 'Jazz au jardin',
          category: 'CONCERT',
          city: 'Tunis',
          venue: 'Le Jardin · Lieu de démonstration',
          poster: 'jazz',
          price: 35,
          offset: 23,
          sold: 1,
          description:
            'Un quartet, un jardin et une soirée pour ralentir. Le jazz prend l’air entre standards revisités et improvisations.',
        },
        {
          title: 'Place au rire',
          category: 'COMEDY',
          city: 'La Marsa',
          venue: 'La Scène · Lieu de démonstration',
          poster: 'rire',
          price: 30,
          offset: 37,
          sold: 0,
          description:
            'Trois voix, trois regards et une scène pour rire de ce qu’on connaît tous. Une soirée de stand-up sans détour, à partager entre amis.',
        },
        {
          title: 'Sous les étoiles',
          category: 'FESTIVAL',
          city: 'Hammamet',
          venue: 'Plein air · Lieu de démonstration',
          poster: 'etoiles',
          price: 60,
          offset: 44,
          sold: 0,
          description:
            'Le ciel pour plafond et la musique pour point de rencontre. Une fin d’après-midi qui se prolonge en soirée.',
        },
        {
          title: 'Mouvement libre',
          category: 'WORKSHOP',
          city: 'Sousse',
          venue: 'Le Studio · Lieu de démonstration',
          poster: 'mouvement',
          price: 20.25,
          offset: 24,
          sold: 0,
          description:
            'Un atelier de mouvement ouvert aux curieux, avec ou sans expérience. Prévoyez une tenue confortable.',
        },
        {
          title: 'Dernier rappel',
          category: 'THEATER',
          city: 'Tunis',
          venue: 'Le Théâtre · Lieu de démonstration',
          poster: 'rappel',
          price: 25,
          offset: -7,
          sold: 1,
          description:
            'Une création théâtrale autour des départs, des retrouvailles et des choses qu’on n’a pas encore dites.',
        },
      ];
      const now = new Date();
      for (const [index, event] of events.entries()) {
        const suffix = String(index + 1).padStart(12, '0');
        const eventId = `20000000-0000-4000-8000-${suffix}`;
        const tierId = `30000000-0000-4000-8000-${suffix}`;
        const startsAt = new Date(now);
        startsAt.setUTCDate(startsAt.getUTCDate() + event.offset);
        startsAt.setUTCHours(19, 0, 0, 0);
        const endsAt = new Date(startsAt.getTime() + 3 * 60 * 60 * 1000);
        const capacity = index === 5 ? 1 : 100;
        await manager.query(
          'INSERT INTO events.events (id,organizer_id,title,description,category,status,image_url,location_address,location_city,location_country,start_date,end_date,total_capacity,sold_tickets,revenue_amount,revenue_currency,published_at,commission_rate_override) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,0) ON CONFLICT DO NOTHING',
          [
            eventId,
            users[1][0],
            event.title,
            event.description,
            event.category,
            'PUBLISHED',
            `/demo/posters/${event.poster}.png`,
            event.venue,
            event.city,
            'Tunisia',
            startsAt,
            endsAt,
            capacity,
            event.sold,
            index === 1 ? 0 : event.sold * event.price,
            'TND',
            now,
          ],
        );
        await manager.query(
          'INSERT INTO events.ticket_types (id,event_id,name,description,price_amount,price_currency,quantity,sold_quantity,sales_start,sales_end,is_active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true) ON CONFLICT DO NOTHING',
          [
            tierId,
            eventId,
            'Entrée standard',
            'Accès à l’événement · Placement libre',
            event.price,
            'TND',
            capacity,
            event.sold,
            new Date(now.getTime() - 60 * 86400000),
            new Date(startsAt.getTime() - 3600000),
          ],
        );
        if (![0, 1, 5].includes(index)) continue;
        const orderId = `40000000-0000-4000-8000-${suffix}`;
        const status = index === 1 ? 'PENDING' : 'PAID';
        const expiresAt = new Date(now.getTime() + 60 * 60000);
        await manager.query(
          'INSERT INTO payments.orders (id,user_id,event_id,status,subtotal_amount,platform_fee_amount,payment_fees_amount,total_amount,currency,paid_at,expires_at,metadata,status_history) VALUES ($1,$2,$3,$4,$5,0,0,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING',
          [
            orderId,
            users[0][0],
            eventId,
            status,
            event.price,
            'TND',
            status === 'PAID' ? now : null,
            expiresAt,
            JSON.stringify({ demo: true }),
            JSON.stringify([
              { status: 'PENDING', timestamp: now.toISOString() },
              ...(status === 'PAID'
                ? [{ status: 'PAID', timestamp: now.toISOString() }]
                : []),
            ]),
          ],
        );
        await manager.query(
          'INSERT INTO payments.order_items (id,order_id,ticket_type_id,ticket_type_name,price_amount,price_currency,quantity) VALUES ($1,$2,$3,$4,$5,$6,1) ON CONFLICT DO NOTHING',
          [
            `50000000-0000-4000-8000-${suffix}`,
            orderId,
            tierId,
            'Entrée standard',
            event.price,
            'TND',
          ],
        );
        await manager.query(
          'INSERT INTO tickets.tickets (id,event_id,ticket_type_id,order_id,user_id,qr_code,status,price_amount,price_currency,holder_name,holder_email,reserved_until,checked_in_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT DO NOTHING',
          [
            `60000000-0000-4000-8000-${suffix}`,
            eventId,
            tierId,
            orderId,
            users[0][0],
            QRCodeVO.generate().value,
            index === 1 ? 'RESERVED' : index === 5 ? 'CHECKED_IN' : 'CONFIRMED',
            event.price,
            'TND',
            'Amal Démo',
            users[0][1],
            index === 1 ? expiresAt : null,
            index === 5 ? endsAt : null,
          ],
        );
      }
      // A private, editable scenario for the organizer workspace. Re-running the
      // seed preserves edits and any later publication made through the API.
      const draftStart = new Date(now.getTime() + 52 * 86400000);
      draftStart.setUTCHours(18, 0, 0, 0);
      await manager.query(
        `INSERT INTO events.events
          (id,organizer_id,title,description,category,status,location_address,
           location_city,location_country,start_date,end_date,total_capacity,
           sold_tickets,revenue_amount,revenue_currency,commission_rate_override)
         VALUES ($1,$2,$3,$4,$5,'DRAFT',$6,$7,$8,$9,$10,0,0,0,'TND',0)
         ON CONFLICT DO NOTHING`,
        [
          '20000000-0000-4000-8000-000000000007',
          users[1][0],
          'La prochaine scène',
          'Un brouillon de démonstration à préparer dans votre espace organisateur.',
          'CONCERT',
          'Le Studio · Lieu de démonstration',
          'Tunis',
          'Tunisia',
          draftStart,
          new Date(draftStart.getTime() + 3 * 3600000),
        ],
      );
      await seedEntranceScenarios(manager, now);
    });
    logger.log(
      'Demo records ready (idempotent). Participant: participant@demo.tickr.local. Password: TickrDemo2026!',
    );
  } finally {
    await dataSource.destroy();
  }
}

// dotenv is preloaded before the data source, so only the explicit demo file applies.
config({ path: resolve(process.cwd(), '.env.demo.example') });
void run().catch((error: unknown) => {
  logger.error(error instanceof Error ? error.message : 'Demo seed failed');
  process.exitCode = 1;
});
