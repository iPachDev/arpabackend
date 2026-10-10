import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailModule } from '../email/email.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import {
  TeamInvitation,
  TeamInvitationSchema,
} from './schemas/team-invitation.schema';
import { Team, TeamSchema } from './schemas/team.schema';
import { TeamInvitationsController } from './team-invitations.controller';
import { TeamInvitationsService } from './team-invitations.service';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Team.name, schema: TeamSchema },
      { name: TeamInvitation.name, schema: TeamInvitationSchema },
      { name: User.name, schema: UserSchema },
    ]),
    EmailModule,
  ],
  controllers: [TeamsController, TeamInvitationsController],
  providers: [TeamsService, TeamInvitationsService],
})
export class TeamsModule {}
