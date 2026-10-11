import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailModule } from '../email/email.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { LocationOwnershipTransfersController } from './location-ownership-transfers.controller';
import { LocationOwnershipTransfersService } from './location-ownership-transfers.service';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import {
  LocationOwnershipTransfer,
  LocationOwnershipTransferSchema,
} from './schemas/location-ownership-transfer.schema';
import { Location, LocationSchema } from './schemas/location.schema';

@Module({
  imports: [
    EmailModule,
    MongooseModule.forFeature([
      { name: Location.name, schema: LocationSchema },
      {
        name: LocationOwnershipTransfer.name,
        schema: LocationOwnershipTransferSchema,
      },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [LocationsController, LocationOwnershipTransfersController],
  providers: [LocationsService, LocationOwnershipTransfersService],
})
export class LocationsModule {}
