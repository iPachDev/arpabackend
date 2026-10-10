import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomBytes } from 'crypto';
import { Model, Types } from 'mongoose';
import { SessionResponseDto } from './dto/session-response.dto';
import { Session, SessionDocument } from './schemas/session.schema';

type SessionMetadata = {
  userAgent: string;
  ipAddress: string;
};

type CreatedSession = {
  token: string;
  expiresAt: Date;
};

@Injectable()
export class SessionsService {
  constructor(
    @InjectModel(Session.name)
    private readonly sessionModel: Model<SessionDocument>,
    private readonly configService: ConfigService,
  ) {}

  async create(
    userId: string,
    metadata: SessionMetadata,
  ): Promise<CreatedSession> {
    const token = randomBytes(32).toString('base64url');
    const ttlDays = Number(
      this.configService.get<string>('SESSION_TTL_DAYS', '7'),
    );
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    await this.sessionModel.create({
      userId: new Types.ObjectId(userId),
      tokenHash: this.hashToken(token),
      userAgent: metadata.userAgent.slice(0, 500) || 'Desconocido',
      ipAddress: metadata.ipAddress.slice(0, 100) || 'Desconocida',
      lastSeenAt: new Date(),
      expiresAt,
    });

    return { token, expiresAt };
  }

  async findActiveByToken(token: string): Promise<SessionDocument | null> {
    const session = await this.sessionModel
      .findOne({
        tokenHash: this.hashToken(token),
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      })
      .exec();

    if (session && Date.now() - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
      session.lastSeenAt = new Date();
      await session.save();
    }

    return session;
  }

  async listForUser(
    userId: string,
    currentSessionId: string,
  ): Promise<SessionResponseDto[]> {
    const now = new Date();
    const sessions = await this.sessionModel
      .find({ userId: new Types.ObjectId(userId), expiresAt: { $gt: now } })
      .sort({ createdAt: -1 })
      .exec();

    return sessions.map((session) => ({
      id: session._id.toString(),
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      createdAt: session.createdAt,
      lastSeenAt: session.lastSeenAt,
      expiresAt: session.expiresAt,
      active: session.revokedAt === null,
      current: session._id.toString() === currentSessionId,
    }));
  }

  async revokeByToken(token: string): Promise<void> {
    await this.sessionModel
      .updateOne(
        { tokenHash: this.hashToken(token), revokedAt: null },
        { $set: { revokedAt: new Date() } },
      )
      .exec();
  }

  async revokeById(sessionId: string): Promise<void> {
    await this.sessionModel
      .updateOne(
        { _id: new Types.ObjectId(sessionId), revokedAt: null },
        { $set: { revokedAt: new Date() } },
      )
      .exec();
  }

  async revokeOthersForUser(
    userId: string,
    currentSessionId: string,
  ): Promise<void> {
    await this.sessionModel
      .updateMany(
        {
          userId: new Types.ObjectId(userId),
          _id: { $ne: new Types.ObjectId(currentSessionId) },
          revokedAt: null,
        },
        { $set: { revokedAt: new Date() } },
      )
      .exec();
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
