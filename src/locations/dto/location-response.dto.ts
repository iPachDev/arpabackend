import { ApiProperty } from '@nestjs/swagger';
import { LocationDiscipline, LocationStatus } from '../schemas/location.schema';

export class LocationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() slug: string;
  @ApiProperty() name: string;
  @ApiProperty() business: string;
  @ApiProperty({ enum: LocationDiscipline }) discipline: LocationDiscipline;
  @ApiProperty() address: string;
  @ApiProperty() city: string;
  @ApiProperty() description: string;
  @ApiProperty({ nullable: true }) coverImageUrl: string | null;
  @ApiProperty({ nullable: true }) circuitMapImageUrl: string | null;
  @ApiProperty({ type: String, isArray: true }) photoUrls: string[];
  @ApiProperty() ownerId: string;
  @ApiProperty({ enum: LocationStatus }) status: LocationStatus;
  @ApiProperty({ readOnly: true }) canEdit: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
