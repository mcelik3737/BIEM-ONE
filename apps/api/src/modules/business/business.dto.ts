import { PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Currency, OperationStatus, PurchaseStatus, SalesStatus } from '@prisma/client';

export class PartyDto {
  @IsString() @MinLength(2) @MaxLength(160) @Matches(/\S/) name!: string;
  @IsOptional() @IsString() @MaxLength(80) shortName?: string;
  @IsOptional() @IsString() @MaxLength(120) contactName?: string;
  @IsOptional() @IsString() @MaxLength(80) taxOffice?: string;
  @IsOptional() @IsString() @MaxLength(40) taxNumber?: string;
  @Transform(({ value }) => (value === '' ? null : value))
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @ValidateIf((_object, value) => value !== undefined) @IsBoolean() isActive?: boolean;
}
export class UpdatePartyDto extends PartialType(PartyDto, { skipNullProperties: false }) {}
export class ProjectDto {
  @IsString() @MinLength(2) @MaxLength(160) @Matches(/\S/) name!: string;
  @IsString() @MinLength(1) @MaxLength(100) customerId!: string;
  @IsOptional() @IsString() @MaxLength(80) code?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsString() @MaxLength(300) location?: string;
}
export class SalesDto {
  @IsEnum(SalesStatus) status!: SalesStatus;
}
export class OperationDto {
  @IsEnum(OperationStatus) status!: OperationStatus;
}
export class BomDto {
  @IsString() @MinLength(2) @MaxLength(160) @Matches(/\S/) name!: string;
  @IsOptional() @IsString() @MaxLength(100) partNumber?: string;
  @IsString() @MinLength(1) @MaxLength(20) @Matches(/\S/) unit!: string;
  @Matches(/^\d{1,9}(\.\d{1,4})?$/) quantity!: string;
  @Matches(/^\d{1,9}(\.\d{1,4})?$/) unitPrice!: string;
  @IsEnum(Currency) currency!: Currency;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}
export class OrderLineDto {
  @IsString() @MaxLength(100) bomItemId!: string;
  @Matches(/^\d{1,9}(\.\d{1,4})?$/) quantity!: string;
  @Matches(/^\d{1,9}(\.\d{1,4})?$/) unitPrice!: string;
  @Matches(/^\d{1,3}(\.\d{1,2})?$/) taxRate!: string;
}
export class OrderDto {
  @IsString() @MaxLength(100) supplierId!: string;
  @IsUUID() requestKey!: string;
  @IsEnum(Currency) currency!: Currency;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  items!: OrderLineDto[];
}
export class OrderStatusDto {
  @IsEnum(PurchaseStatus) status!: PurchaseStatus;
}
export class ReceiptLineDto {
  @IsString() @MaxLength(100) itemId!: string;
  @Matches(/^\d{1,9}(\.\d{1,4})?$/) quantity!: string;
}
export class ReceiptDto {
  @IsUUID() requestKey!: string;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ReceiptLineDto)
  items!: ReceiptLineDto[];
}
