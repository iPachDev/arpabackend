import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';
import { ErrorResponseDto } from './dto/error-response.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Users / Customer Access Entitlement')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    operationId: 'createUser',
    summary: 'Registrar un usuario',
    description:
      'Crea el perfil inicial de acceso del usuario. Adaptación ligera del Service Domain Customer Access Entitlement de BIAN.',
  })
  @ApiCreatedResponse({
    description: 'Usuario registrado correctamente.',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Los datos enviados no cumplen el contrato.',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'El correo o teléfono ya está registrado.',
    type: ErrorResponseDto,
  })
  create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto);
  }
}
