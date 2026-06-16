import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Context, Scenes, Telegraf } from 'telegraf';
import { ReportService } from '../report/report.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiSupportService, ChatMessage } from '../ai-support/ai-support.service';

const HARASSMENT_TYPES = ['Físico', 'Verbal', 'Social/Exclusión', 'Ciberacoso'];
const FREQUENCY_LEVELS = ['Una sola vez', 'Semanalmente', 'Diariamente'];
const LOCATIONS = ['Salón de clases', 'Recreo/Patios', 'Redes Sociales', 'Fuera de la escuela'];
const INFORMANT_TYPES = ['Víctima', 'Testigo'];

const BUTTON_ONLY_STEPS = [0, 1, 2, 3, 4, 7, 8];

const STATUS_LABELS: Record<string, string> = {
  PENDING: '⏳ Pendiente',
  IN_REVIEW: '🔍 En revisión',
  RESOLVED: '✅ Resuelto',
  DISMISSED: '❌ Desestimado',
};

const HARASSMENT_TYPE_LABELS: Record<string, string> = {
  PHYSICAL: 'Físico',
  VERBAL: 'Verbal',
  SOCIAL: 'Social/Exclusión',
  CYBERBULLYING: 'Ciberacoso',
};

function formatDate(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days === 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  if (days < 30) return `hace ${Math.floor(days / 7)} semana(s)`;
  return `hace ${Math.floor(days / 30)} mes(es)`;
}

const MAIN_MENU_KB = {
  inline_keyboard: [
    [{ text: '📋 Registrar un incidente', callback_data: 'main_report' }],
    [{ text: '💬 Necesito apoyo emocional', callback_data: 'main_apoyo' }],
    [{ text: '📊 Ver mis reportes', callback_data: 'main_mis_reportes' }],
    [{ text: 'ℹ️ Mis derechos y la ley', callback_data: 'main_info' }],
  ],
};

const CANCEL_KB = {
  inline_keyboard: [[{ text: '❌ Cancelar reporte', callback_data: 'wizard_cancel' }]],
};

interface BotSession extends Scenes.WizardSessionData {
  institutionId?: string;
  institutionName?: string;
  informantType?: string;
  harassmentType?: string;
  frequencyLevel?: string;
  locationTag?: string;
  incidentDate?: string;
  aggressorInfo?: string;
  witnessInfo?: string;
  waitingForWitnessNames?: boolean;
  wantsContact?: boolean;
  previousReport?: boolean;
  evidenceUrl?: string;
  waitingForEvidenceUrl?: boolean;
  descriptionText?: string;
  chatHistory?: ChatMessage[];
}

interface BotContext extends Context {
  session: BotSession;
  scene: {
    enter: (id: string) => Promise<void>;
    leave: () => Promise<void>;
    reenter: () => Promise<void>;
  };
  wizard: {
    cursor: number;
    next: () => void;
  };
}

@Injectable()
export class BotService {
  private bot!: Telegraf<BotContext>;
  private logger = new Logger(BotService.name);

  constructor(
    private configService: ConfigService,
    private reportService: ReportService,
    private prisma: PrismaService,
    private aiSupport: AiSupportService,
  ) {
    this.setupBot();
  }

  private dbSession() {
    const prisma = this.prisma;
    return async (ctx: any, next: () => Promise<void>) => {
      const key = ctx.from?.id ? String(ctx.from.id) : null;
      if (!key) {
        ctx.session = {};
        return next();
      }
      const stored = await prisma.telegramSession.findUnique({ where: { key } });
      ctx.session = stored ? JSON.parse(stored.data) : {};
      await next();
      await prisma.telegramSession.upsert({
        where: { key },
        create: { key, data: JSON.stringify(ctx.session) },
        update: { data: JSON.stringify(ctx.session) },
      });
    };
  }

  private setupBot() {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN')!;
    this.bot = new Telegraf<BotContext>(token as any);
    const stage = new Scenes.Stage<any>([this.createWizardScene(), this.createSupportScene()]);
    this.bot.use(this.dbSession() as any);
    this.bot.use(stage.middleware() as any);
    this.setupCommands();
  }

  private createWizardScene() {
    const wizard = new Scenes.WizardScene<any>(
      'report_wizard',

      // Paso 0: Rol
      (ctx) => ctx.reply(
        '*Paso 1 de 11*\n\n¿Eres la persona afectada o estás reportando algo que viste?\n\n_Selecciona una opción:_',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              ...INFORMANT_TYPES.map((t) => [{ text: t, callback_data: `role_${t}` }]),
              [{ text: '❌ Cancelar reporte', callback_data: 'wizard_cancel' }],
            ],
          },
        },
      ),

      // Paso 1: Tipo de acoso
      (ctx) => ctx.reply(
        '*Paso 2 de 11*\n\n¿Qué tipo de acoso describe mejor la situación?\n\n_Selecciona una opción:_',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              ...HARASSMENT_TYPES.map((t) => [{ text: t, callback_data: `type_${t}` }]),
              [{ text: '❌ Cancelar reporte', callback_data: 'wizard_cancel' }],
            ],
          },
        },
      ),

      // Paso 2: Frecuencia
      (ctx) => ctx.reply(
        '*Paso 3 de 11*\n\n¿Con qué frecuencia ha ocurrido esto?\n\n_Selecciona una opción:_',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              ...FREQUENCY_LEVELS.map((f) => [{ text: f, callback_data: `freq_${f}` }]),
              [{ text: '❌ Cancelar reporte', callback_data: 'wizard_cancel' }],
            ],
          },
        },
      ),

      // Paso 3: Lugar
      (ctx) => ctx.reply(
        '*Paso 4 de 11*\n\n¿Dónde ha ocurrido principalmente?\n\n_Selecciona una opción:_',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              ...LOCATIONS.map((l) => [{ text: l, callback_data: `loc_${l}` }]),
              [{ text: '❌ Cancelar reporte', callback_data: 'wizard_cancel' }],
            ],
          },
        },
      ),

      // Paso 4: Fecha
      (ctx) => ctx.reply(
        '*Paso 5 de 11*\n\n¿Cuándo ocurrió el incidente más reciente?\n\n_Selecciona una opción:_',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Hoy', callback_data: 'date_Hoy' },
                { text: 'Ayer', callback_data: 'date_Ayer' },
              ],
              [{ text: 'Esta semana', callback_data: 'date_Esta semana' }],
              [{ text: 'La semana pasada', callback_data: 'date_La semana pasada' }],
              [{ text: 'Hace más de un mes', callback_data: 'date_Hace más de un mes' }],
              [{ text: '❌ Cancelar reporte', callback_data: 'wizard_cancel' }],
            ],
          },
        },
      ),

      // Paso 5: Datos del agresor (texto)
      (ctx) => ctx.reply(
        '*Paso 6 de 11*\n\n¿Quién cometió el acoso?\n\nEscribe el nombre, curso, apodo o cualquier dato que recuerdes de esa persona.',
        { parse_mode: 'Markdown', reply_markup: CANCEL_KB },
      ),

      // Paso 6: Testigos
      (ctx) => {
        ctx.session.waitingForWitnessNames = false;
        return ctx.reply(
          '*Paso 7 de 11*\n\n¿Hubo personas que presenciaron el incidente?\n\n_Selecciona una opción:_',
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Sí, hubo testigos', callback_data: 'witness_yes' }],
                [{ text: 'No hubo testigos', callback_data: 'witness_no' }],
                [{ text: '❌ Cancelar reporte', callback_data: 'wizard_cancel' }],
              ],
            },
          },
        );
      },

      // Paso 7: ¿Ya fue reportado?
      (ctx) => ctx.reply(
        '*Paso 8 de 11*\n\n¿Esta situación ya fue reportada antes a alguna autoridad?\n\n_Selecciona una opción:_',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Sí, ya fue reportada antes', callback_data: 'prev_yes' }],
              [{ text: 'No, es la primera vez', callback_data: 'prev_no' }],
              [{ text: '❌ Cancelar reporte', callback_data: 'wizard_cancel' }],
            ],
          },
        },
      ),

      // Paso 8: ¿Quiere contacto?
      (ctx) => ctx.reply(
        '*Paso 9 de 11*\n\n¿Deseas que una autoridad escolar se contacte contigo para dar seguimiento?\n\nTu identidad estará protegida en todo momento.\n\n_Selecciona una opción:_',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Sí, quiero seguimiento', callback_data: 'contact_yes' }],
              [{ text: 'No, prefiero el anonimato', callback_data: 'contact_no' }],
              [{ text: '❌ Cancelar reporte', callback_data: 'wizard_cancel' }],
            ],
          },
        },
      ),

      // Paso 9: Evidencia
      (ctx) => {
        ctx.session.waitingForEvidenceUrl = false;
        return ctx.reply(
          '*Paso 10 de 11*\n\n¿Cuentas con alguna evidencia del incidente (fotos, capturas, mensajes)?\n\n_Selecciona una opción:_',
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Sí, tengo un enlace (URL)', callback_data: 'evidence_yes' }],
                [{ text: 'No tengo evidencia', callback_data: 'evidence_no' }],
                [{ text: '❌ Cancelar reporte', callback_data: 'wizard_cancel' }],
              ],
            },
          },
        );
      },

      // Paso 10: Descripción libre (texto)
      (ctx) => ctx.reply(
        '*Paso 11 de 11 — Último paso*\n\nDescribe con tus palabras lo que ocurrió. Puedes incluir qué pasó, qué se dijo, cómo te sentiste y cualquier detalle adicional.',
        { parse_mode: 'Markdown', reply_markup: CANCEL_KB },
      ),
    );

    const guardStep = async (ctx: any, expectedStep: number): Promise<boolean> => {
      if (ctx.wizard.cursor !== expectedStep) {
        await ctx.answerCbQuery('Este botón ya no es válido.');
        return false;
      }
      return true;
    };

    wizard.action('wizard_cancel', async (ctx) => {
      await ctx.answerCbQuery();
      this.trackEvent(String(ctx.from?.id ?? ''), 'REPORT_ABANDONED', ctx.session.institutionId);
      await ctx.scene.leave();
      await ctx.reply(
        'Reporte cancelado. ¿Qué deseas hacer?',
        { reply_markup: MAIN_MENU_KB },
      );
    });

    wizard.action(/^role_/, async (ctx, next) => {
      if (!('data' in ctx.callbackQuery)) return;
      if (!await guardStep(ctx, 0)) return;
      const match = ctx.callbackQuery.data.match(/^role_(.+)$/);
      if (!match) return;
      ctx.session.informantType = match[1];
      await ctx.answerCbQuery(match[1]);
      ctx.wizard.next();
      return next();
    });

    wizard.action(/^type_/, async (ctx, next) => {
      if (!('data' in ctx.callbackQuery)) return;
      if (!await guardStep(ctx, 1)) return;
      const match = ctx.callbackQuery.data.match(/^type_(.+)$/);
      if (!match) return;
      ctx.session.harassmentType = match[1];
      await ctx.answerCbQuery(match[1]);
      ctx.wizard.next();
      return next();
    });

    wizard.action(/^freq_/, async (ctx, next) => {
      if (!('data' in ctx.callbackQuery)) return;
      if (!await guardStep(ctx, 2)) return;
      const match = ctx.callbackQuery.data.match(/^freq_(.+)$/);
      if (!match) return;
      ctx.session.frequencyLevel = match[1];
      await ctx.answerCbQuery(match[1]);
      ctx.wizard.next();
      return next();
    });

    wizard.action(/^loc_/, async (ctx, next) => {
      if (!('data' in ctx.callbackQuery)) return;
      if (!await guardStep(ctx, 3)) return;
      const match = ctx.callbackQuery.data.match(/^loc_(.+)$/);
      if (!match) return;
      ctx.session.locationTag = match[1];
      await ctx.answerCbQuery(match[1]);
      ctx.wizard.next();
      return next();
    });

    wizard.action(/^date_/, async (ctx, next) => {
      if (!('data' in ctx.callbackQuery)) return;
      if (!await guardStep(ctx, 4)) return;
      const match = ctx.callbackQuery.data.match(/^date_(.+)$/);
      if (!match) return;
      ctx.session.incidentDate = match[1];
      await ctx.answerCbQuery(match[1]);
      ctx.wizard.next();
      return next();
    });

    wizard.action('witness_yes', async (ctx) => {
      if (!await guardStep(ctx, 6)) return;
      ctx.session.waitingForWitnessNames = true;
      await ctx.answerCbQuery();
      await ctx.reply(
        'Escribe los nombres, cursos o una descripción de quienes lo presenciaron:',
        { reply_markup: CANCEL_KB },
      );
    });

    wizard.action('witness_no', async (ctx, next) => {
      if (!await guardStep(ctx, 6)) return;
      ctx.session.witnessInfo = undefined;
      ctx.session.waitingForWitnessNames = false;
      await ctx.answerCbQuery();
      ctx.wizard.next();
      return next();
    });

    wizard.action(/^prev_/, async (ctx, next) => {
      if (!('data' in ctx.callbackQuery)) return;
      if (!await guardStep(ctx, 7)) return;
      const match = ctx.callbackQuery.data.match(/^prev_(.+)$/);
      if (!match) return;
      ctx.session.previousReport = match[1] === 'yes';
      await ctx.answerCbQuery();
      ctx.wizard.next();
      return next();
    });

    wizard.action(/^contact_/, async (ctx, next) => {
      if (!('data' in ctx.callbackQuery)) return;
      if (!await guardStep(ctx, 8)) return;
      const match = ctx.callbackQuery.data.match(/^contact_(.+)$/);
      if (!match) return;
      ctx.session.wantsContact = match[1] === 'yes';
      await ctx.answerCbQuery();
      ctx.wizard.next();
      return next();
    });

    wizard.action('evidence_yes', async (ctx) => {
      if (!await guardStep(ctx, 9)) return;
      ctx.session.waitingForEvidenceUrl = true;
      await ctx.answerCbQuery();
      await ctx.reply(
        'Escribe el enlace (URL) de la evidencia. Debe comenzar con http:// o https://',
        { reply_markup: CANCEL_KB },
      );
    });

    wizard.action('evidence_no', async (ctx, next) => {
      if (!await guardStep(ctx, 9)) return;
      ctx.session.evidenceUrl = undefined;
      ctx.session.waitingForEvidenceUrl = false;
      await ctx.answerCbQuery();
      ctx.wizard.next();
      return next();
    });

    wizard.command('cancel', async (ctx) => {
      await ctx.scene.leave();
      await ctx.reply('Reporte cancelado. ¿Qué deseas hacer?', { reply_markup: MAIN_MENU_KB });
    });

    wizard.command('start', async (ctx) => {
      await ctx.scene.leave();
      await ctx.reply(
        ctx.session.institutionName
          ? `*AnoniVoz — ${ctx.session.institutionName}*\n\nReporte cancelado. ¿Qué deseas hacer?`
          : '*Bienvenido a AnoniVoz*\n\nPara registrar un reporte accede a través del enlace o código QR de tu institución.',
        ctx.session.institutionName
          ? { parse_mode: 'Markdown', reply_markup: MAIN_MENU_KB }
          : { parse_mode: 'Markdown' },
      );
    });

    wizard.command('help', async (ctx) => {
      await ctx.reply(
        '*Ayuda — AnoniVoz*\n\nEstás registrando un reporte. Sigue los pasos con los botones o escribe cuando se te pida.',
        { parse_mode: 'Markdown', reply_markup: CANCEL_KB },
      );
    });

    wizard.on('text', async (ctx, next) => {
      if (ctx.message.text.startsWith('/')) return next();

      const step = ctx.wizard.cursor;

      if (BUTTON_ONLY_STEPS.includes(step)) {
        await ctx.reply(
          'Por favor, usa los botones para responder.',
          { reply_markup: CANCEL_KB },
        );
        return;
      }

      if (step === 5) {
        ctx.session.aggressorInfo = ctx.message.text;
        ctx.wizard.next();
        return next();
      }

      if (step === 6) {
        if (ctx.session.waitingForWitnessNames) {
          ctx.session.witnessInfo = ctx.message.text;
          ctx.session.waitingForWitnessNames = false;
          ctx.wizard.next();
          return next();
        }
        await ctx.reply('Por favor, usa los botones para responder.', { reply_markup: CANCEL_KB });
        return;
      }

      if (step === 9) {
        if (ctx.session.waitingForEvidenceUrl) {
          const url = ctx.message.text.trim();
          if (!url.startsWith('http')) {
            await ctx.reply(
              'El enlace no es válido. Debe comenzar con http:// o https://\n\nInténtalo de nuevo:',
              { reply_markup: CANCEL_KB },
            );
            return;
          }
          ctx.session.evidenceUrl = url;
          ctx.session.waitingForEvidenceUrl = false;
          ctx.wizard.next();
          return next();
        }
        await ctx.reply('Por favor, usa los botones para responder.', { reply_markup: CANCEL_KB });
        return;
      }

      if (step === 10) {
        ctx.session.descriptionText = ctx.message.text;
        await this.saveReport(ctx);
      }
    });

    return wizard;
  }

  private async saveReport(ctx: any) {
    try {
      const report = await this.reportService.create({
        telegramUserId: String(ctx.from?.id ?? 'unknown'),
        institutionId: ctx.session.institutionId,
        informantType: ctx.session.informantType ?? '',
        harassmentType: ctx.session.harassmentType ?? '',
        frequencyLevel: ctx.session.frequencyLevel ?? '',
        locationTag: ctx.session.locationTag ?? '',
        incidentDate: ctx.session.incidentDate ?? '',
        aggressorInfo: ctx.session.aggressorInfo ?? '',
        witnessInfo: ctx.session.witnessInfo,
        wantsContact: ctx.session.wantsContact ?? false,
        previousReport: ctx.session.previousReport ?? false,
        evidenceUrl: ctx.session.evidenceUrl,
        descriptionText: ctx.session.descriptionText ?? '',
      });

      this.trackEvent(String(ctx.from?.id ?? ''), 'REPORT_COMPLETED', ctx.session.institutionId);

      await ctx.reply(
        `*Reporte registrado exitosamente*\n\n` +
          `Número de caso: \`${report.reportNumber}\`\n\n` +
          `Gracias por tu valentía. Tu reporte será revisado de forma *confidencial* por las autoridades correspondientes.\n\n` +
          `Guarda tu número de caso para cualquier seguimiento futuro.`,
        { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } },
      );

      await ctx.reply(
        '¿Cómo te sientes después de reportar esto?',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '💬 Quiero hablar con alguien', callback_data: 'post_report_apoyo' }],
              [{ text: '✅ Estoy bien, gracias', callback_data: 'post_report_ok' }],
            ],
          },
        },
      );

      await ctx.scene.leave();
    } catch (error) {
      this.logger.error('Error saving report:', error);
      await ctx.scene.leave();
      await ctx.reply(
        'Ocurrió un error al guardar el reporte. ¿Qué deseas hacer?',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄 Intentar de nuevo', callback_data: 'main_report' }],
              [{ text: '💬 Hablar con alguien', callback_data: 'main_apoyo' }],
            ],
          },
        },
      );
    }
  }

  private createSupportScene() {
    const scene = new Scenes.BaseScene<any>('support_scene');

    scene.enter(async (ctx) => {
      ctx.session.chatHistory = [];
      await ctx.reply(
        '👋 Hola, soy el asistente de apoyo de *AnoniVoz*.\n\n' +
          'Estoy aquí para escucharte y acompañarte. Puedo ayudarte a:\n' +
          '• Hablar sobre cómo te sientes\n' +
          '• Darte orientación si viviste o presenciaste acoso\n' +
          '• Aconsejarte sobre qué pasos puedes seguir\n\n' +
          'Todo lo que me cuentes es confidencial. No soy un psicólogo, pero sí un primer espacio seguro para desahogarte.\n\n' +
          'Cuéntame, ¿cómo estás? ¿Qué está pasando?',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[{ text: '🚪 Terminar conversación', callback_data: 'support_salir' }]],
          },
        },
      );
    });

    scene.action('support_salir', async (ctx) => {
      await ctx.answerCbQuery();
      ctx.session.chatHistory = [];
      await ctx.scene.leave();
      await ctx.reply(
        'Gracias por compartir conmigo. Recuerda que el DECE y los adultos de confianza en tu institución siempre están disponibles para ayudarte.',
        { reply_markup: MAIN_MENU_KB },
      );
    });

    scene.command('salir', async (ctx) => {
      ctx.session.chatHistory = [];
      await ctx.scene.leave();
      await ctx.reply(
        'Gracias por compartir conmigo. Recuerda que el DECE y los adultos de confianza en tu institución siempre están disponibles para ayudarte.',
        { reply_markup: MAIN_MENU_KB },
      );
    });

    scene.command('cancel', async (ctx) => {
      ctx.session.chatHistory = [];
      await ctx.scene.leave();
      await ctx.reply('Has salido del modo de apoyo. ¿Qué deseas hacer?', { reply_markup: MAIN_MENU_KB });
    });

    scene.command('start', async (ctx) => {
      ctx.session.chatHistory = [];
      await ctx.scene.leave();
      await ctx.reply(
        ctx.session.institutionName
          ? `*Bienvenido de nuevo a AnoniVoz*\n\nInstitución: *${ctx.session.institutionName}*\n\n¿Qué deseas hacer?`
          : '*Bienvenido a AnoniVoz*\n\nPara registrar un reporte accede a través del enlace o código QR de tu institución.',
        ctx.session.institutionName
          ? { parse_mode: 'Markdown', reply_markup: MAIN_MENU_KB }
          : { parse_mode: 'Markdown' },
      );
    });

    scene.on('text', async (ctx) => {
      const userMessage = (ctx.message as any).text as string;

      if (userMessage.startsWith('/')) return;

      const history: ChatMessage[] = ctx.session.chatHistory ?? [];

      const response = await this.aiSupport.chat(history, userMessage);

      ctx.session.chatHistory = [
        ...history,
        { role: 'user', parts: [{ text: userMessage }] },
        { role: 'model', parts: [{ text: response }] },
      ].slice(-20);

      await ctx.reply(response, {
        reply_markup: {
          inline_keyboard: [[{ text: '🚪 Terminar conversación', callback_data: 'support_salir' }]],
        },
      });
    });

    return scene;
  }

  private setupCommands() {
    this.bot.command('start', async (ctx) => {
      const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
      const code = text.split(' ')[1]?.trim() || undefined;

      if (code) {
        const institution = await this.prisma.institution.findUnique({
          where: { code: code.trim().toUpperCase() },
        });

        if (!institution || !institution.active) {
          return ctx.reply(
            'El enlace de acceso no es válido o la institución no está activa.\n\nSolicita el QR o enlace correcto a tu institución educativa.',
          );
        }

        ctx.session.institutionId = institution.id;
        ctx.session.institutionName = institution.name;

        this.trackEvent(String(ctx.from?.id ?? ''), 'BOT_START', institution.id);

        return ctx.reply(
          `*Bienvenido a AnoniVoz*\n\n` +
            `Institución: *${institution.name}*\n\n` +
            'Este es un sistema seguro y confidencial para reportar situaciones de acoso escolar.\n\n' +
            'Tu identidad está protegida en todo momento. ¿Qué deseas hacer?',
          { parse_mode: 'Markdown', reply_markup: MAIN_MENU_KB },
        );
      }

      return ctx.reply(
        '*Bienvenido a AnoniVoz*\n\n' +
          'Para registrar un reporte debes acceder a través del enlace o código QR de tu institución educativa.\n\n' +
          'Solicítalo a las autoridades de tu colegio.',
        { parse_mode: 'Markdown' },
      );
    });

    this.bot.command('report', async (ctx) => {
      if (!ctx.session.institutionId) {
        return ctx.reply(
          'Para registrar un reporte debes acceder primero a través del enlace de tu institución.\n\nSolicita el QR o enlace a las autoridades de tu colegio.',
        );
      }
      return ctx.reply(
        '⚠️ *Antes de continuar — Información importante*\n\n' +
        'Los reportes deben basarse en *hechos reales*. Presentar una denuncia falsa o maliciosa es una *falta grave* sancionada por el Código de Convivencia institucional y puede tener consecuencias disciplinarias para quien la realice (Art. 132 LOEI).\n\n' +
        'AnoniVoz es una herramienta de protección. Úsala con responsabilidad.\n\n' +
        '¿Deseas continuar con el registro del reporte?',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ Entiendo, quiero continuar', callback_data: 'confirm_report' }],
              [{ text: '❌ Cancelar', callback_data: 'back_main' }],
            ],
          },
        },
      );
    });

    this.bot.command('help', (ctx) =>
      ctx.reply(
        '*Ayuda — AnoniVoz*\n\n' +
          'Sistema confidencial de reporte de acoso escolar.\n\n' +
          '¿Qué deseas hacer?',
        { parse_mode: 'Markdown', reply_markup: MAIN_MENU_KB },
      ),
    );

    this.bot.command('apoyo', async (ctx) => {
      await ctx.scene.enter('support_scene');
    });

    this.bot.command('cancel', async (ctx) =>
      ctx.reply('No hay ningún reporte en curso. ¿Qué deseas hacer?', { reply_markup: MAIN_MENU_KB }),
    );

    this.bot.action('main_report', async (ctx) => {
      await ctx.answerCbQuery();
      if (!ctx.session.institutionId) {
        return ctx.reply('Para registrar un reporte accede a través del enlace o código QR de tu institución.');
      }
      return ctx.reply(
        '⚠️ *Antes de continuar — Información importante*\n\n' +
        'Los reportes deben basarse en *hechos reales*. Presentar una denuncia falsa o maliciosa es una *falta grave* sancionada por el Código de Convivencia institucional y puede tener consecuencias disciplinarias para quien la realice (Art. 132 LOEI).\n\n' +
        'AnoniVoz es una herramienta de protección. Úsala con responsabilidad.\n\n' +
        '¿Deseas continuar con el registro del reporte?',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ Entiendo, quiero continuar', callback_data: 'confirm_report' }],
              [{ text: '❌ Cancelar', callback_data: 'back_main' }],
            ],
          },
        },
      );
    });

    this.bot.action('confirm_report', async (ctx) => {
      await ctx.answerCbQuery();
      this.trackEvent(String(ctx.from?.id ?? ''), 'REPORT_STARTED', ctx.session.institutionId);
      await ctx.reply('Vamos a registrar tu reporte paso a paso.\n\nEn la mayoría de pasos solo debes presionar un botón.');
      return ctx.scene.enter('report_wizard');
    });

    this.bot.action('main_apoyo', async (ctx) => {
      await ctx.answerCbQuery();
      this.trackEvent(String(ctx.from?.id ?? ''), 'SUPPORT_STARTED', ctx.session.institutionId);
      return ctx.scene.enter('support_scene');
    });

    this.bot.action('post_report_apoyo', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.scene.enter('support_scene');
    });

    this.bot.action('post_report_ok', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.reply(
        'Me alegra saberlo. Aquí estaremos si necesitas algo más.',
        { reply_markup: MAIN_MENU_KB },
      );
    });

    this.bot.action('main_mis_reportes', async (ctx) => {
      await ctx.answerCbQuery();
      const telegramUserId = String(ctx.from?.id ?? '');

      const reports = await this.prisma.report.findMany({
        where: { telegramUserId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      if (!reports.length) {
        return ctx.reply(
          'No tienes reportes registrados aún.\n\nCuando registres uno podrás ver su estado aquí.',
          { reply_markup: MAIN_MENU_KB },
        );
      }

      const buttons = reports.map((r) => [{
        text: `#${r.reportNumber} — ${STATUS_LABELS[r.status] ?? r.status} — ${formatDate(r.createdAt)}`,
        callback_data: `ver_reporte_${r.reportNumber}`,
      }]);

      return ctx.reply(
        `*Tus reportes*\n\nTienes ${reports.length} reporte(s). Selecciona uno para ver el detalle:`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              ...buttons,
              [{ text: '🏠 Menú principal', callback_data: 'back_main' }],
            ],
          },
        },
      );
    });

    this.bot.action(/^ver_reporte_(\d+)$/, async (ctx) => {
      await ctx.answerCbQuery();
      if (!('data' in ctx.callbackQuery)) return;
      const match = ctx.callbackQuery.data.match(/^ver_reporte_(\d+)$/);
      if (!match) return;

      const reportNumber = parseInt(match[1], 10);
      const report = await this.prisma.report.findUnique({
        where: { reportNumber },
        include: {
          incident: true,
          statusHistory: { orderBy: { changedAt: 'desc' }, take: 1 },
        },
      });

      if (!report || report.telegramUserId !== String(ctx.from?.id)) {
        return ctx.reply('No se encontró ese reporte.', { reply_markup: MAIN_MENU_KB });
      }

      const lastChange = report.statusHistory[0];
      const lines = [
        `*Reporte #${report.reportNumber}*`,
        '',
        `Estado: ${STATUS_LABELS[report.status] ?? report.status}`,
        `Registrado: ${formatDate(report.createdAt)}`,
        report.incident
          ? `Tipo: ${HARASSMENT_TYPE_LABELS[report.incident.harassmentType] ?? report.incident.harassmentType}`
          : '',
        lastChange
          ? `\nÚltima actualización: ${formatDate(lastChange.changedAt)}`
          : '',
        lastChange?.notes ? `Nota del DECE: _${lastChange.notes}_` : '',
      ].filter(Boolean).join('\n');

      return ctx.reply(lines, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '← Volver a mis reportes', callback_data: 'main_mis_reportes' }],
            [{ text: '🏠 Menú principal', callback_data: 'back_main' }],
          ],
        },
      });
    });

    const INFO_MENU_KB = {
      inline_keyboard: [
        [{ text: '📚 ¿Qué es el acoso escolar?', callback_data: 'info_que_es' }],
        [{ text: '⚖️ Mis derechos como estudiante', callback_data: 'info_derechos' }],
        [{ text: '⚠️ Sanciones para el agresor', callback_data: 'info_sanciones' }],
        [{ text: '🔍 ¿Qué pasa cuando reporto?', callback_data: 'info_proceso' }],
        [{ text: '🏠 Menú principal', callback_data: 'back_main' }],
      ],
    };

    this.bot.action('main_info', async (ctx) => {
      await ctx.answerCbQuery();
      this.trackEvent(String(ctx.from?.id ?? ''), 'INFO_ACCESSED', ctx.session?.institutionId);
      await ctx.reply(
        'ℹ️ *Información — Tus derechos y la ley*\n\n' +
        'La *Ley Orgánica de Educación Intercultural (LOEI)* te protege.\n\n' +
        'Selecciona un tema para saber más:',
        { parse_mode: 'Markdown', reply_markup: INFO_MENU_KB },
      );
    });

    this.bot.action('info_que_es', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.reply(
        '📚 *¿Qué es el acoso escolar?*\n\n' +
        'El acoso escolar o *bullying* es cualquier acto repetido de agresión física, verbal, psicológica o digital que cause daño a otra persona dentro del entorno educativo.\n\n' +
        'La LOEI lo considera una *falta grave* (Art. 132 y 133) y obliga a las instituciones a prevenirlo y sancionarlo.\n\n' +
        '*Tipos reconocidos:*\n' +
        '• _Físico_: golpes, empujones, daño a objetos\n' +
        '• _Verbal_: insultos, apodos, amenazas\n' +
        '• _Social_: exclusión, rumores, manipulación grupal\n' +
        '• _Ciberacoso_: hostigamiento por redes sociales, mensajes o fotos',
        { parse_mode: 'Markdown', reply_markup: INFO_MENU_KB },
      );
    });

    this.bot.action('info_derechos', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.reply(
        '⚖️ *Mis derechos como estudiante*\n\n' +
        '📌 *Art. 7, lit. i* — Tienes derecho a recibir protección en situaciones de riesgo y a denunciar cualquier violación sin miedo a represalias.\n\n' +
        '📌 *Art. 7, lit. b* — Tienes derecho a educarte en un entorno seguro, sin discriminación ni violencia.\n\n' +
        '📌 *Art. 11, lit. s* — Los docentes y directivos tienen la *obligación legal* de escucharte y actuar cuando reportas un caso.\n\n' +
        '📌 *Art. 58, lit. c* — La institución debe garantizar tu protección y bienestar dentro del plantel.\n\n' +
        'Tu identidad está protegida. Nadie puede revelar quién realizó el reporte.',
        { parse_mode: 'Markdown', reply_markup: INFO_MENU_KB },
      );
    });

    this.bot.action('info_sanciones', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.reply(
        '⚠️ *Sanciones para quien comete acoso*\n\n' +
        'La LOEI establece sanciones claras (Art. 132 y 133):\n\n' +
        '*Para estudiantes agresores:*\n' +
        '• Disculpa pública o privada\n' +
        '• Trabajo comunitario dentro de la institución\n' +
        '• Suspensión temporal de clases\n' +
        '• Separación definitiva en casos graves\n\n' +
        '*Para docentes o personal que no actúen:*\n' +
        '• Sanción disciplinaria por omisión (Art. 132)\n' +
        '• La dirección está obligada a reportar al DECE y a las autoridades superiores\n\n' +
        'Todos los procesos siguen el *Código de Convivencia* de la institución.',
        { parse_mode: 'Markdown', reply_markup: INFO_MENU_KB },
      );
    });

    this.bot.action('info_proceso', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.reply(
        '🔍 *¿Qué pasa cuando hago un reporte?*\n\n' +
        '1️⃣ *Tu reporte llega al DECE* de manera confidencial\n' +
        '2️⃣ *El DECE revisa el caso* y puede investigar o solicitar más información\n' +
        '3️⃣ *Se aplica el proceso* establecido en el Código de Convivencia (Art. 134 LOEI)\n' +
        '4️⃣ *Si dejaste tus datos*, un orientador puede contactarte de forma discreta\n' +
        '5️⃣ *El caso se cierra* con la medida correctiva o sanción que corresponda\n\n' +
        'La LOEI *prohíbe expresamente* cualquier represalia contra quien denuncia.\n' +
        'Tu anonimato está protegido en todo momento. 🔒',
        { parse_mode: 'Markdown', reply_markup: INFO_MENU_KB },
      );
    });

    this.bot.action('back_main', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.reply('¿Qué deseas hacer?', { reply_markup: MAIN_MENU_KB });
    });

    this.bot.on('message', (ctx) =>
      ctx.reply(
        'No reconozco ese mensaje. ¿Qué deseas hacer?',
        { reply_markup: MAIN_MENU_KB },
      ),
    );
  }

  private trackEvent(
    telegramUserId: string,
    eventType: 'BOT_START' | 'REPORT_STARTED' | 'REPORT_COMPLETED' | 'REPORT_ABANDONED' | 'SUPPORT_STARTED',
    institutionId?: string,
  ) {
    this.prisma.botEvent
      .create({ data: { telegramUserId, eventType, institutionId } })
      .then(() => this.logger.debug(`trackEvent OK: ${eventType} uid=${telegramUserId}`))
      .catch((err: Error) => this.logger.error(`trackEvent FAILED [${eventType}]: ${err?.message}`, err?.stack));
  }

  async sendDirectMessage(telegramUserId: string, text: string) {
    await this.bot.telegram.sendMessage(telegramUserId, text, { parse_mode: 'Markdown' });
  }

  getBot() {
    return this.bot;
  }

  async handleWebhook(update: any) {
    return this.bot.handleUpdate(update);
  }
}
