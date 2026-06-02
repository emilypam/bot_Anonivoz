import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Context, Scenes, Telegraf } from 'telegraf';
import { ReportService } from '../report/report.service';
import { PrismaService } from '../prisma/prisma.service';

const HARASSMENT_TYPES = ['Físico', 'Verbal', 'Social/Exclusión', 'Ciberacoso'];
const FREQUENCY_LEVELS = ['Una sola vez', 'Semanalmente', 'Diariamente'];
const LOCATIONS = ['Salón de clases', 'Recreo/Patios', 'Redes Sociales', 'Fuera de la escuela'];
const INFORMANT_TYPES = ['Víctima', 'Testigo'];

// Pasos:
// 0→Rol  1→Tipo acoso  2→Frecuencia  3→Lugar  4→Fecha
// 5→Agresor(texto)  6→Testigos  7→Reportado?  8→Contacto?
// 9→Evidencia  10→Descripción(texto)
const BUTTON_ONLY_STEPS = [0, 1, 2, 3, 4, 7, 8];

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
}

// Definición manual del contexto para que ctx.session esté tipado
// directamente como BotSession (sin el envoltorio WizardSession<>)
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
    const stage = new Scenes.Stage<any>([this.createWizardScene()]);
    this.bot.use(this.dbSession() as any);
    this.bot.use(stage.middleware() as any);
    this.setupCommands();
  }

  private createWizardScene() {
    const wizard = new Scenes.WizardScene<any>(
      'report_wizard',

      // Paso 0: Rol
      (ctx) => ctx.reply(
        '¿Eres la persona afectada o estás reportando algo que viste?\n\n_Selecciona una opción:_',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: INFORMANT_TYPES.map((t) => [
              { text: t, callback_data: `role_${t}` },
            ]),
          },
        },
      ),

      // Paso 1: Tipo de acoso
      (ctx) => ctx.reply(
        '¿Qué tipo de acoso describe mejor la situación?\n\n_Selecciona una opción:_',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: HARASSMENT_TYPES.map((t) => [
              { text: t, callback_data: `type_${t}` },
            ]),
          },
        },
      ),

      // Paso 2: Frecuencia
      (ctx) => ctx.reply(
        '¿Con qué frecuencia ha ocurrido esto?\n\n_Selecciona una opción:_',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: FREQUENCY_LEVELS.map((f) => [
              { text: f, callback_data: `freq_${f}` },
            ]),
          },
        },
      ),

      // Paso 3: Lugar
      (ctx) => ctx.reply(
        '¿Dónde ha ocurrido principalmente?\n\n_Selecciona una opción:_',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: LOCATIONS.map((l) => [
              { text: l, callback_data: `loc_${l}` },
            ]),
          },
        },
      ),

      // Paso 4: Fecha
      (ctx) => ctx.reply(
        '¿Cuándo ocurrió el incidente más reciente?\n\n_Selecciona una opción:_',
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
            ],
          },
        },
      ),

      // Paso 5: Datos del agresor (TEXTO — necesario)
      (ctx) => ctx.reply(
        '*¿Quién cometió el acoso?*\n\nEscribe el nombre, curso, apodo o cualquier dato que recuerdes de esa persona.',
        { parse_mode: 'Markdown' },
      ),

      // Paso 6: Testigos
      (ctx) => {
        ctx.session.waitingForWitnessNames = false;
        return ctx.reply(
          '¿Hubo personas que presenciaron el incidente?\n\n_Selecciona una opción:_',
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Si, hubo testigos', callback_data: 'witness_yes' }],
                [{ text: 'No hubo testigos', callback_data: 'witness_no' }],
              ],
            },
          },
        );
      },

      // Paso 7: ¿Ya fue reportado?
      (ctx) => ctx.reply(
        '¿Esta situación ya fue reportada antes a alguna autoridad?\n\n_Selecciona una opción:_',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Si, ya fue reportada antes', callback_data: 'prev_yes' }],
              [{ text: 'No, es la primera vez', callback_data: 'prev_no' }],
            ],
          },
        },
      ),

      // Paso 8: ¿Quiere contacto?
      (ctx) => ctx.reply(
        '¿Deseas que una autoridad escolar se contacte contigo para dar seguimiento?\n\nTu identidad estará protegida en todo momento.\n\n_Selecciona una opción:_',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Si, quiero seguimiento', callback_data: 'contact_yes' }],
              [{ text: 'No, prefiero el anonimato', callback_data: 'contact_no' }],
            ],
          },
        },
      ),

      // Paso 9: Evidencia
      (ctx) => {
        ctx.session.waitingForEvidenceUrl = false;
        return ctx.reply(
          '¿Cuentas con alguna evidencia del incidente (fotos, capturas, mensajes)?\n\n_Selecciona una opción:_',
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Si, tengo un enlace (URL)', callback_data: 'evidence_yes' }],
                [{ text: 'No tengo evidencia', callback_data: 'evidence_no' }],
              ],
            },
          },
        );
      },

      // Paso 10: Descripción libre (TEXTO — necesario)
      (ctx) => ctx.reply(
        '*Ultimo paso*\n\nDescribe con tus palabras lo que ocurrió. Puedes incluir qué pasó, qué se dijo, cómo te sentiste y cualquier detalle adicional.',
        { parse_mode: 'Markdown' },
      ),
    );

    // Acciones de botones
    // Patrón Telegraf v4: ctx.wizard.next() + return next()
    // next() permite que handleStep corra con el cursor actualizado
    // y así muestra el siguiente paso inmediatamente.

    // Guard reutilizable: rechaza clics en teclados de pasos anteriores (stale keyboards)
    const guardStep = async (ctx: any, expectedStep: number): Promise<boolean> => {
      if (ctx.wizard.cursor !== expectedStep) {
        await ctx.answerCbQuery('Este boton ya no es valido.');
        return false;
      }
      return true;
    };

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
      await ctx.reply('Escribe los nombres, cursos o una descripción de quienes lo presenciaron:');
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
      await ctx.reply('Escribe el enlace (URL) de la evidencia. Debe comenzar con http:// o https://');
    });

    wizard.action('evidence_no', async (ctx, next) => {
      if (!await guardStep(ctx, 9)) return;
      ctx.session.evidenceUrl = undefined;
      ctx.session.waitingForEvidenceUrl = false;
      await ctx.answerCbQuery();
      ctx.wizard.next();
      return next();
    });

    // Comandos dentro del wizard

    wizard.command('cancel', async (ctx) => {
      await ctx.scene.leave();
      await ctx.reply('Reporte cancelado. Usa /report para comenzar de nuevo.');
    });

    // Manejo de texto

    wizard.on('text', async (ctx, next) => {
      // Comandos dentro de la escena: pasar al paso actual para que
      // re-envíe la pregunta con botones (/cancel lo maneja wizard.command arriba)
      if (ctx.message.text.startsWith('/')) return next();

      const step = ctx.wizard.cursor;

      // Pasos que solo aceptan botones — rechazar texto libre
      if (BUTTON_ONLY_STEPS.includes(step)) {
        await ctx.reply('Por favor, usa los botones para responder. Si no los ves, escribe /cancel para salir.');
        return;
      }

      // Paso 5: Datos del agresor
      if (step === 5) {
        ctx.session.aggressorInfo = ctx.message.text;
        ctx.wizard.next();
        return next();
      }

      // Paso 6: Nombres de testigos (solo si se activó el flag)
      if (step === 6) {
        if (ctx.session.waitingForWitnessNames) {
          ctx.session.witnessInfo = ctx.message.text;
          ctx.session.waitingForWitnessNames = false;
          ctx.wizard.next();
          return next();
        }
        await ctx.reply('Por favor, usa los botones de arriba para responder esta pregunta.');
        return;
      }

      // Paso 9: URL de evidencia (solo si se activó el flag)
      if (step === 9) {
        if (ctx.session.waitingForEvidenceUrl) {
          const url = ctx.message.text.trim();
          if (!url.startsWith('http')) {
            await ctx.reply('El enlace no es valido. Debe comenzar con http:// o https://\n\nInténtalo de nuevo:');
            return;
          }
          ctx.session.evidenceUrl = url;
          ctx.session.waitingForEvidenceUrl = false;
          ctx.wizard.next();
          return next();
        }
        await ctx.reply('Por favor, usa los botones de arriba para responder esta pregunta.');
        return;
      }

      // Paso 10: Descripción final — guarda el reporte
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

      await ctx.reply(
        `*Reporte registrado exitosamente*\n\n` +
          `Número de caso: \`${report.reportNumber}\`\n\n` +
          `Gracias por tu valentía. Tu reporte será revisado de forma *confidencial* por las autoridades correspondientes.\n\n` +
          `Guarda tu número de caso para cualquier seguimiento futuro.`,
        { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } },
      );

      await ctx.scene.leave();
    } catch (error) {
      this.logger.error('Error saving report:', error);
      await ctx.scene.leave();
      await ctx.reply('Ocurrio un error al guardar el reporte. Escribe /report para intentar de nuevo.');
    }
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
            'El enlace de acceso no es válido o la institución no está activa.\n\n' +
              'Solicita el QR o enlace correcto a tu institución educativa.',
          );
        }

        ctx.session.institutionId = institution.id;
        ctx.session.institutionName = institution.name;

        return ctx.reply(
          `*Bienvenido a AnoniVoz*\n\n` +
            `Institución: *${institution.name}*\n\n` +
            'Este es un sistema seguro y confidencial para reportar situaciones de acoso escolar.\n\n' +
            'Tu identidad está protegida en todo momento.\n' +
            'Usa /report para registrar un incidente.\n' +
            'Usa /help para más información.',
          { parse_mode: 'Markdown' },
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
          'Para registrar un reporte debes acceder primero a través del enlace de tu institución.\n\n' +
            'Solicita el QR o enlace a las autoridades de tu colegio.',
        );
      }
      await ctx.reply(
        'Vamos a registrar tu reporte paso a paso.\n\n' +
          'En la mayoría de pasos solo debes presionar un botón. Solo en algunos momentos necesitarás escribir texto.',
      );
      return ctx.scene.enter('report_wizard');
    });

    this.bot.command('help', (ctx) =>
      ctx.reply(
        '*Ayuda — AnoniVoz*\n\n' +
          '/start — Mensaje de bienvenida\n' +
          '/report — Registrar un nuevo reporte\n' +
          '/cancel — Cancelar el reporte en curso\n' +
          '/help — Mostrar esta ayuda\n\n' +
          'En casi todos los pasos solo debes presionar un botón. Solo te pedirá escribir cuando sea estrictamente necesario.',
        { parse_mode: 'Markdown' },
      ),
    );

    this.bot.command('cancel', (ctx) =>
      ctx.reply(
        'No hay ningún reporte en curso.\n\nUsa /report para comenzar uno nuevo.',
      ),
    );

    this.bot.on('message', (ctx) =>
      ctx.reply('No reconozco ese comando. Usa /help para ver las opciones disponibles.'),
    );
  }

  getBot() {
    return this.bot;
  }

  async handleWebhook(update: any) {
    return this.bot.handleUpdate(update);
  }
}
