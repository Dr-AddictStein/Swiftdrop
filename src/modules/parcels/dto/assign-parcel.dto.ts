import { IsUUID } from 'class-validator';

export class AssignParcelDto {
  @IsUUID()
  assignedAgentId!: string;
}
