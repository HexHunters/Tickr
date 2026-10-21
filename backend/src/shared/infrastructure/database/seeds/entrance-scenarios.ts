import { QRCodeVO } from '@modules/tickets/domain/value-objects/qr-code.vo';
import type { EntityManager } from 'typeorm';

const participantId = '10000000-0000-4000-8000-000000000001';
const organizerId = '10000000-0000-4000-8000-000000000002';
const staffId = '10000000-0000-4000-8000-000000000003';
const eventId = '20000000-0000-4000-8000-000000000008';
const tierId = '30000000-0000-4000-8000-000000000008';

/** Isolated demo only. Existing entry results and revoked access are preserved. */
export async function seedEntranceScenarios(
  manager: EntityManager,
  now: Date,
): Promise<void> {
  const start = new Date(now.getTime() + 15 * 60000);
  const end = new Date(now.getTime() + 3 * 3600000);
  await manager.query(
    `INSERT INTO events.events
      (id,organizer_id,title,description,category,status,image_url,
       location_address,location_city,location_country,start_date,end_date,
       total_capacity,sold_tickets,revenue_amount,revenue_currency,published_at,commission_rate_override)
     VALUES ($1,$2,$3,$4,'CONCERT','PUBLISHED','/demo/posters/sonores.png',
       $5,'Tunis','Tunisia',$6,$7,30,3,30,'TND',$8,0)
     ON CONFLICT DO NOTHING`,
    [
      eventId,
      organizerId,
      '[Démo] Les portes sont ouvertes',
      'Un événement local pour essayer le contrôle des billets et les accès de votre équipe.',
      'Entrée de démonstration · Tunis',
      start,
      end,
      now,
    ],
  );
  await manager.query(
    `INSERT INTO events.ticket_types
      (id,event_id,name,description,price_amount,price_currency,quantity,
       sold_quantity,sales_start,sales_end,is_active)
     VALUES ($1,$2,'Entrée standard','Accès de démonstration',15,'TND',30,3,$3,$4,true)
     ON CONFLICT DO NOTHING`,
    [tierId, eventId, new Date(now.getTime() - 86400000), start],
  );
  for (const [index, status] of [
    'CONFIRMED',
    'CHECKED_IN',
    'RESERVED',
  ].entries()) {
    const suffix = String(index + 8).padStart(12, '0');
    const orderId = `40000000-0000-4000-8000-${suffix}`;
    const isPaid = status !== 'RESERVED';
    const expiry = new Date(now.getTime() + 3600000);
    await manager.query(
      `INSERT INTO payments.orders
        (id,user_id,event_id,status,subtotal_amount,platform_fee_amount,
         payment_fees_amount,total_amount,currency,paid_at,expires_at,metadata,status_history)
       VALUES ($1,$2,$3,$4,15,0,0,15,'TND',$5,$6,$7,$8)
       ON CONFLICT DO NOTHING`,
      [
        orderId,
        participantId,
        eventId,
        isPaid ? 'PAID' : 'PENDING',
        isPaid ? now : null,
        expiry,
        JSON.stringify({ demo: true }),
        JSON.stringify([
          { status: 'PENDING', timestamp: now.toISOString() },
          ...(isPaid ? [{ status: 'PAID', timestamp: now.toISOString() }] : []),
        ]),
      ],
    );
    await manager.query(
      `INSERT INTO payments.order_items
        (id,order_id,ticket_type_id,ticket_type_name,price_amount,price_currency,quantity)
       VALUES ($1,$2,$3,'Entrée standard',15,'TND',1) ON CONFLICT DO NOTHING`,
      [`50000000-0000-4000-8000-${suffix}`, orderId, tierId],
    );
    await manager.query(
      `INSERT INTO tickets.tickets
        (id,event_id,ticket_type_id,order_id,user_id,qr_code,status,price_amount,
         price_currency,holder_name,holder_email,reserved_until,checked_in_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,15,'TND','Amal Démo',
         'participant@demo.tickr.local',$8,$9) ON CONFLICT DO NOTHING`,
      [
        `60000000-0000-4000-8000-${suffix}`,
        eventId,
        tierId,
        orderId,
        participantId,
        QRCodeVO.generate().value,
        status,
        isPaid ? null : expiry,
        status === 'CHECKED_IN' ? now : null,
      ],
    );
  }
  await manager.query(
    `INSERT INTO events.event_check_in_staff_assignments
      (id,event_id,user_id,assigned_by,assigned_at)
     VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
    [
      '70000000-0000-4000-8000-000000000008',
      eventId,
      staffId,
      organizerId,
      now,
    ],
  );
  // Terminal records only: these samples must never trigger an email or retry.
  for (const [index, message] of [
    {
      userId: participantId,
      subject: '[Démo] Votre billet est prêt',
      status: 'DELIVERED',
    },
    {
      userId: participantId,
      subject: '[Démo] Un message non remis',
      status: 'FAILED',
    },
    {
      userId: organizerId,
      subject: '[Démo] Votre équipe se prépare',
      status: 'DELIVERED',
    },
  ].entries()) {
    await manager.query(
      `INSERT INTO notifications.notifications
        (id,user_id,type,channel,priority,subject,content,status,sent_at,
         delivered_at,failure_reason,max_retries,metadata,created_at,updated_at)
       VALUES ($1,$2,'ACCOUNT_UPDATE','EMAIL','MEDIUM',$3,$4,$5,$6,$7,$8,0,$9,$6,$6)
       ON CONFLICT DO NOTHING`,
      [
        `80000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
        message.userId,
        message.subject,
        'Historique de démonstration local. Aucun envoi.',
        message.status,
        now,
        message.status === 'DELIVERED' ? now : null,
        message.status === 'FAILED'
          ? 'Échec de démonstration sans tentative d’envoi.'
          : null,
        JSON.stringify({ demo: true }),
      ],
    );
  }
}
