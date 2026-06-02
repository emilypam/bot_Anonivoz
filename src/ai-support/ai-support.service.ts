import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
  private genAI: GoogleGenerativeAI;
  private logger = new Logger(AiSupportService.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY')!;
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async chat(history: ChatMessage[], userMessage: string): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash-latest',
        systemInstruction: SYSTEM_PROMPT,
      });

      const chat = model.startChat({
        history,
        generationConfig: {
          maxOutputTokens: 300,
          temperature: 0.7,
        },
      });

      const result = await chat.sendMessage(userMessage);
      return result.response.text();
    } catch (error) {
      this.logger.error('Gemini API error:', error);
      return 'En este momento no puedo responder. Por favor habla con el DECE o un adulto de confianza en tu institución.';
    }
  }
}
