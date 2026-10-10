import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { Session } from './schemas/session.schema';
import { SessionsService } from './sessions.service';

describe('SessionsService', () => {
  const exec = jest.fn();
  const sessionModel = {
    create: jest.fn(),
    updateOne: jest.fn(
      (
        _filter: Record<string, unknown>,
        _update: { $set: { revokedAt: Date } },
      ) => ({ exec }),
    ),
    updateMany: jest.fn(() => ({ exec })),
  };
  let service: SessionsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: getModelToken(Session.name), useValue: sessionModel },
        { provide: ConfigService, useValue: { get: jest.fn(() => '7') } },
      ],
    }).compile();

    service = module.get(SessionsService);
    jest.clearAllMocks();
  });

  it('persiste únicamente el hash de un token aleatorio', async () => {
    sessionModel.create.mockResolvedValue({});

    const result = await service.create('66f84cbd29d229e491a23362', {
      userAgent: 'Jest',
      ipAddress: '127.0.0.1',
    });
    const storedSession = sessionModel.create.mock.calls[0][0];

    expect(result.token).toHaveLength(43);
    expect(storedSession.tokenHash).toHaveLength(64);
    expect(storedSession.tokenHash).not.toBe(result.token);
  });

  it('revoca la sesión en MongoDB sin almacenar ni consultar el token plano', async () => {
    exec.mockResolvedValue({ modifiedCount: 1 });

    await service.revokeByToken('valid-token');

    const [filter, update] = sessionModel.updateOne.mock.calls[0];
    expect(filter.tokenHash).toHaveLength(64);
    expect(filter.tokenHash).not.toBe('valid-token');
    expect(filter.revokedAt).toBeNull();
    expect(update.$set.revokedAt).toBeInstanceOf(Date);
  });

  it('revoca las demás sesiones sin cerrar la actual', async () => {
    exec.mockResolvedValue({ modifiedCount: 2 });
    const userId = new Types.ObjectId().toString();
    const currentSessionId = new Types.ObjectId().toString();

    await service.revokeOthersForUser(userId, currentSessionId);

    expect(sessionModel.updateMany).toHaveBeenCalledWith(
      {
        userId: new Types.ObjectId(userId),
        _id: { $ne: new Types.ObjectId(currentSessionId) },
        revokedAt: null,
      },
      { $set: { revokedAt: expect.any(Date) } },
    );
  });
});
