export class CreateReportDto {
  telegramUserId: string;
  institutionId?: string;
  informantType: string;
  harassmentType: string;
  frequencyLevel: string;
  locationTag: string;
  incidentDate: string;
  aggressorInfo: string;
  witnessInfo?: string;
  wantsContact: boolean;
  previousReport: boolean;
  evidenceUrl?: string;
  descriptionText: string;
}
