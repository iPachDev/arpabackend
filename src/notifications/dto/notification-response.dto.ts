import { ApiProperty } from '@nestjs/swagger';
import {
  NotificationEmailStatus,
  NotificationType,
} from '../schemas/notification.schema';

export class NotificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  eventId: string;

  @ApiProperty({ enum: NotificationType })
  type: NotificationType;

  @ApiProperty()
  title: string;

  @ApiProperty()
  message: string;

  @ApiProperty({ enum: NotificationEmailStatus })
  emailStatus: NotificationEmailStatus;

  @ApiProperty({ nullable: true })
  readAt: Date | null;

  @ApiProperty()
  createdAt: Date;
}
