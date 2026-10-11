import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { EventOwnershipTransfersController } from './event-ownership-transfers.controller';
import { EventOwnershipTransfersService } from './event-ownership-transfers.service';
import { EventRegistrationsController } from './event-registrations.controller';
import { EventRegistrationsService } from './event-registrations.service';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import {
  EventRegistration,
  EventRegistrationSchema,
} from './schemas/event-registration.schema';
import { Event, EventSchema } from './schemas/event.schema';
import {
  EventOwnershipTransfer,
  EventOwnershipTransferSchema,
} from './schemas/event-ownership-transfer.schema';

@Module({
  imports: [
    NotificationsModule,
    EmailModule,
    MongooseModule.forFeature([
      { name: Event.name, schema: EventSchema },
      { name: EventRegistration.name, schema: EventRegistrationSchema },
      {
        name: EventOwnershipTransfer.name,
        schema: EventOwnershipTransferSchema,
      },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [
    EventsController,
    EventRegistrationsController,
    EventOwnershipTransfersController,
  ],
  providers: [
    EventsService,
    EventRegistrationsService,
    EventOwnershipTransfersService,
  ],
})
export class EventsModule {}
