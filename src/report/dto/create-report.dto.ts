export class CreateReportDto {
  telegramUserId: string;
  informantType: string;   // 'Víctima' | 'Testigo'
  harassmentType: string;  // 'Físico' | 'Verbal' | 'Social/Exclusión' | 'Ciberacoso'
  frequencyLevel: string;  // 'Una sola vez' | 'Semanalmente' | 'Diariamente'
  locationTag: string;     // 'Salón de clases' | 'Recreo/Patios' | 'Redes Sociales' | 'Fuera de la escuela'
  incidentDate: string;    // 'Hoy' | 'Ayer' | 'Esta semana' | 'La semana pasada' | 'Hace más de un mes'
  aggressorInfo: string;
  witnessInfo?: string;
  wantsContact: boolean;
  previousReport: boolean;
  evidenceUrl?: string;
  descriptionText: string;
}
