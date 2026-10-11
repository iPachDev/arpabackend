import { ApiProperty } from '@nestjs/swagger';
import {
  EventDiscipline,
  EventStatus,
  EventType,
} from '../schemas/event.schema';
import { EventLocationDto } from './event-location.dto';
import { EventSessionDto } from './event-session.dto';

export class EventResponseDto {
  @ApiProperty({ example: '66f84cbd29d229e491a23362' })
  id: string;

  @ApiProperty({ example: 'copa-metropolitana-de-karting' })
  slug: string;

  @ApiProperty({ example: 'Copa Metropolitana de Karting' })
  title: string;

  @ApiProperty({ enum: EventType })
  type: EventType;

  @ApiProperty({ enum: EventDiscipline })
  discipline: EventDiscipline;

  @ApiProperty()
  description: string;

  @ApiProperty()
  startsAt: Date;

  @ApiProperty()
  endsAt: Date;

  @ApiProperty({ nullable: true })
  registrationDeadline: Date | null;

  @ApiProperty({ type: EventLocationDto, nullable: true })
  location: EventLocationDto | null;

  @ApiProperty({ type: EventSessionDto, isArray: true })
  sessions: EventSessionDto[];

  @ApiProperty({ nullable: true })
  maxParticipants: number | null;

  @ApiProperty({ nullable: true })
  imageUrl: string | null;

  @ApiProperty({ enum: EventStatus })
  status: EventStatus;

  @ApiProperty()
  createdByUserId: string;

  @ApiProperty({ readOnly: true })
  registrationCount: number;

  @ApiProperty({ readOnly: true })
  isRegistered: boolean;

  @ApiProperty({ readOnly: true })
  canEdit: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
