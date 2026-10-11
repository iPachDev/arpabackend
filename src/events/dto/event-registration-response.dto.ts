import { ApiProperty } from '@nestjs/swagger';
import { EventRegistrationStatus } from '../schemas/event-registration.schema';
import { EventResponseDto } from './event-response.dto';

export class EventRegistrationResponseDto {
  @ApiProperty({ example: '66f84cbd29d229e491a23362' })
  id: string;

  @ApiProperty({ enum: EventRegistrationStatus })
  status: EventRegistrationStatus;

  @ApiProperty()
  registeredAt: Date;

  @ApiProperty({ type: EventResponseDto })
  event: EventResponseDto;
}
