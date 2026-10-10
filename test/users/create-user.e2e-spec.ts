import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { UserStatus } from '../../src/users/schemas/user.schema';
import { UsersController } from '../../src/users/users.controller';
import { UsersService } from '../../src/users/users.service';

describe('POST /api/v1/users', () => {
  let app: INestApplication;
  const usersService = { create: jest.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => app.close());
  beforeEach(() => jest.clearAllMocks());

  it('responde 201 y normaliza correo y teléfono', async () => {
    usersService.create.mockResolvedValue({
      id: '66f84cbd29d229e491a23362',
      name: 'Fernando Pacheco',
      email: 'fernando@example.com',
      phone: '+525512345678',
      status: UserStatus.ACTIVE,
      createdAt: '2026-09-27T12:00:00.000Z',
    });

    await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({
        name: '  Fernando   Pacheco ',
        email: ' FERNANDO@EXAMPLE.COM ',
        phone: '+52 55 1234 5678',
        password: 'MiPassword123',
      })
      .expect(201)
      .expect(({ body }) => expect(body).not.toHaveProperty('passwordHash'));

    expect(usersService.create).toHaveBeenCalledWith({
      name: 'Fernando Pacheco',
      email: 'fernando@example.com',
      phone: '+525512345678',
      password: 'MiPassword123',
    });
  });

  it('responde 400 cuando los datos no son válidos', () =>
    request(app.getHttpServer())
      .post('/api/v1/users')
      .send({
        name: 'F',
        email: 'correo-invalido',
        phone: '5512345678',
        password: 'corta',
      })
      .expect(400));
});
