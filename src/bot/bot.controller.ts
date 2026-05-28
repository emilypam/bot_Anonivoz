import { Controller, Post, Body, Request } from '@nestjs/common';
import { BotService } from './bot.service';

@Controller('bot')
export class BotController {
  constructor(private readonly botService: BotService) {}

  @Post('webhook')
  async handleWebhook(@Body() update: any, @Request() req: any) {
    try {
      await this.botService.handleWebhook(update);
      return { ok: true };
    } catch (error) {
      console.error('Webhook error:', error);
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}
