import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegram } from 'telegraf';

const STATUS_MESSAGES: Record<string, string> = {
  PENDING:   'Tu denuncia ha sido recibida y está en espera de revisión.',
  IN_REVIEW: 'Tu denuncia está siendo investigada activamente por el equipo DECE.',
  RESOLVED:  'Tu denuncia ha sido atendida y marcada como resuelta. Gracias por tu valentía.',
  DISMISSED: 'Tu denuncia fue revisada y el equipo DECE la ha cerrado. Si tienes nueva información, puedes enviar otro reporte.',
};

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly telegram: Telegram;

  constructor(private readonly config: ConfigService) {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN') ?? '';
    this.telegram = new Telegram(token);
  }

  async notifyStatusChange(
    telegramUserId: string,
    reportNumber: number,
    newStatus: string,
  ): Promise<void> {
    const detail = STATUS_MESSAGES[newStatus] ?? 'El estado de tu denuncia ha sido actualizado.';

    const text =
      `<b>AnoniVoz — Actualización de tu denuncia #${reportNumber}</b>\n\n` +
      `${detail}\n\n` +
      `<i>Tu identidad permanece protegida en todo momento.</i>`;

    try {
      await this.telegram.sendMessage(telegramUserId, text, { parse_mode: 'HTML' });
    } catch (err: any) {
      // No propagar — el cambio de estado ya fue guardado correctamente
      this.logger.warn(
        `No se pudo notificar al usuario ${telegramUserId} sobre reporte #${reportNumber}: ${err.message}`,
      );
    }
  }
}
