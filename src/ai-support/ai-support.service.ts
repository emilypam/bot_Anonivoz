import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';

const SYSTEM_PROMPT = `Eres un asistente de apoyo emocional dentro de AnoniVoz, un sistema confidencial de reporte de acoso escolar para instituciones Fe y Alegría en Ecuador. Tu rol es escuchar, acompañar y validar las emociones de estudiantes que han vivido o presenciado situaciones de acoso.

Reglas que debes seguir siempre:
- Responde en español, con un tono cálido, empático y sin juzgar.
- Mantén respuestas cortas (máximo 3 párrafos cortos).
- Nunca minimices lo que el estudiante siente o vivió.
- Siempre sugiere hablar con el DECE, un docente de confianza o un familiar.
- Si detectas riesgo inmediato (violencia física activa, ideas de hacerse daño), responde con urgencia y pide que busquen ayuda humana de inmediato.
- No eres un psicólogo ni un médico. Eres un primer punto de escucha y acompañamiento.
- No repitas la misma frase de cierre en cada mensaje.
- Si el estudiante quiere terminar la conversación, despídete con calidez y recuérdale que puede volver cuando lo necesite.`;

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

@Injectable()
export class AiSupportService {
  private groq: Groq;
  private logger = new Logger(AiSupportService.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY')!;
    this.groq = new Groq({ apiKey });
  }

  async chat(history: ChatMessage[], userMessage: string): Promise<string> {
    try {
      const messages: Groq.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.map((m) => ({
          role: (m.role === 'model' ? 'assistant' : 'user') as 'user' | 'assistant',
          content: m.parts[0].text,
        })),
        { role: 'user', content: userMessage },
      ];

      const completion = await this.groq.chat.completions.create({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages,
        max_tokens: 300,
        temperature: 0.7,
      });

      return completion.choices[0]?.message?.content ?? 'No pude generar una respuesta.';
    } catch (error) {
      this.logger.error('Groq API error:', error);
      return 'En este momento no puedo responder. Por favor habla con el DECE o un adulto de confianza en tu institución.';
    }
  }
}
