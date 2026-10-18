import { MigrationInterface, QueryRunner } from 'typeorm';

interface TemplateSeed {
  slug: string;
  name: string;
  category: 'TRANSACTIONAL' | 'SYSTEM';
  subject: string;
  body: string;
  requiredVariables: string[];
}

const layout = (content: string): string => `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:24px;background:#f6f4ef;font-family:Arial,sans-serif;color:#233a42;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;padding:32px;border-radius:8px;">
      <p style="font-size:24px;font-weight:700;margin:0 0 24px;">Tickr</p>
      ${content}
      <p style="font-size:12px;color:#5c6b70;margin:32px 0 0;">Vous recevez ce message car une action a été effectuée sur votre compte Tickr.</p>
    </div>
  </body>
</html>`;

const button = (variable: string, label: string): string =>
  `<p style="margin:24px 0;"><a href="{{${variable}}}" style="display:inline-block;background:#233a42;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700;">${label}</a></p>
      <p style="font-size:13px;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>{{${variable}}}</p>`;

const TEMPLATES: TemplateSeed[] = [
  {
    slug: 'email-verification',
    name: 'Vérification de l’adresse e-mail',
    category: 'TRANSACTIONAL',
    subject: 'Confirmez votre adresse e-mail Tickr',
    body: layout(`<p>Bonjour {{firstName}},</p>
      <p>Confirmez votre adresse e-mail pour activer votre compte. Ce lien est valable 24 heures.</p>
      ${button('verificationUrl', 'Confirmer mon adresse')}
      <p>Si vous n’avez pas créé de compte Tickr, ignorez ce message.</p>`),
    requiredVariables: ['firstName', 'verificationUrl'],
  },
  {
    slug: 'password-reset-request',
    name: 'Réinitialisation du mot de passe',
    category: 'TRANSACTIONAL',
    subject: 'Réinitialisez votre mot de passe Tickr',
    body: layout(`<p>Bonjour {{firstName}},</p>
      <p>Une réinitialisation du mot de passe a été demandée pour votre compte. Ce lien est valable 1 heure et ne peut être utilisé qu’une fois.</p>
      ${button('resetUrl', 'Choisir un nouveau mot de passe')}
      <p>Si vous n’êtes pas à l’origine de cette demande, ignorez ce message : votre mot de passe reste inchangé.</p>`),
    requiredVariables: ['firstName', 'resetUrl'],
  },
  {
    slug: 'password-changed',
    name: 'Mot de passe modifié',
    category: 'SYSTEM',
    subject: 'Votre mot de passe Tickr a été modifié',
    body: layout(`<p>Bonjour {{firstName}},</p>
      <p>Le mot de passe de votre compte Tickr vient d’être modifié.</p>
      <p>Si vous n’êtes pas à l’origine de ce changement, réinitialisez immédiatement votre mot de passe et contactez le support.</p>`),
    requiredVariables: ['firstName'],
  },
];

export class SeedAuthEmailTemplates1792330000002 implements MigrationInterface {
  name = 'SeedAuthEmailTemplates1792330000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const template of TEMPLATES) {
      // Keep templates that operators have already edited.
      await queryRunner.query(
        `INSERT INTO "notifications"."notification_templates"
          ("name", "slug", "channel", "category", "subject", "body", "required_variables")
        VALUES ($1, $2, 'EMAIL', $3, $4, $5, $6::jsonb)
        ON CONFLICT ("slug") DO NOTHING`,
        [
          template.name,
          template.slug,
          template.category,
          template.subject,
          template.body,
          JSON.stringify(template.requiredVariables),
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "notifications"."notification_templates" WHERE "slug" = ANY($1)`,
      [TEMPLATES.map((template) => template.slug)],
    );
  }
}
