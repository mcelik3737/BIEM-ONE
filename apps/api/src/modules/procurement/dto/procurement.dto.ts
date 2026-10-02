import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsIn,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { BomItemType, ProcurementStatus, PurchaseOrderStatus } from '@prisma/client';

export class CreateBomItemDto {
  @IsEnum(BomItemType) itemType!: BomItemType;
  @IsOptional() @IsString() @MaxLength(100) stockCode?: string;
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'Bu alan boş bırakılamaz.' })
  @MaxLength(500)
  description!: string;
  @IsOptional() @IsString() @MaxLength(100) brand?: string;
  @IsOptional() @IsString() @MaxLength(100) model?: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001) quantity!: number;
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'Bu alan boş bırakılamaz.' })
  @MaxLength(30)
  unit!: string;
  @IsIn(['TRY', 'USD', 'EUR']) currency!: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) estimatedUnitCost!: number;
  @IsOptional() @IsDateString() requiredAt?: string;
  @IsOptional() @IsEnum(ProcurementStatus) procurementStatus?: ProcurementStatus;
  @IsOptional() @IsString() @MaxLength(2000) technicalNote?: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

export class UpdateBomItemDto {
  @IsOptional() @IsEnum(BomItemType) itemType?: BomItemType;
  @IsOptional() @IsString() @MaxLength(100) stockCode?: string | null;
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'Bu alan boş bırakılamaz.' })
  @MaxLength(500)
  description?: string;
  @IsOptional() @IsString() @MaxLength(100) brand?: string | null;
  @IsOptional() @IsString() @MaxLength(100) model?: string | null;
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity?: number;
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'Bu alan boş bırakılamaz.' })
  @MaxLength(30)
  unit?: string;
  @IsOptional() @IsIn(['TRY', 'USD', 'EUR']) currency?: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  estimatedUnitCost?: number;
  @IsOptional() @IsDateString() requiredAt?: string | null;
  @IsOptional() @IsEnum(ProcurementStatus) procurementStatus?: ProcurementStatus;
  @IsOptional() @IsString() @MaxLength(2000) technicalNote?: string | null;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

export class CreateSupplierDto {
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'Bu alan boş bırakılamaz.' })
  @MaxLength(200)
  name!: string;
  @IsOptional() @IsString() @MaxLength(150) contactName?: string;
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value === '' ? null : value))
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi girin.' })
  @MaxLength(200)
  email?: string;
  @IsOptional() @IsString() @MaxLength(100) taxOffice?: string;
  @IsOptional() @IsString() @MaxLength(50) taxNumber?: string;
  @IsOptional() @IsString() @MaxLength(1000) address?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class UpdateSupplierDto extends CreateSupplierDto {
  @IsOptional() declare name: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class SetSupplierActiveDto {
  @IsBoolean() isActive!: boolean;
}

export class PurchaseOrderItemInputDto {
  @IsOptional() @IsString() bomItemId?: string;
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'Bu alan boş bırakılamaz.' })
  @MaxLength(500)
  description!: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001) quantity!: number;
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'Bu alan boş bırakılamaz.' })
  @MaxLength(30)
  unit!: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) unitPrice!: number;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100) taxRate!: number;
}

export class CreatePurchaseOrderDto {
  @IsString() supplierId!: string;
  @IsOptional() @IsDateString() orderDate?: string;
  @IsOptional() @IsDateString() expectedDeliveryAt?: string;
  @IsIn(['TRY', 'USD', 'EUR']) currency!: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemInputDto)
  items!: PurchaseOrderItemInputDto[];
}

export class UpdatePurchaseOrderDto {
  @IsOptional() @IsString() supplierId?: string;
  @IsOptional() @IsDateString() orderDate?: string;
  @IsOptional() @IsDateString() expectedDeliveryAt?: string | null;
  @IsOptional() @IsIn(['TRY', 'USD', 'EUR']) currency?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string | null;
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemInputDto)
  items?: PurchaseOrderItemInputDto[];
}

export class ChangePurchaseOrderStatusDto {
  @IsEnum(PurchaseOrderStatus) status!: PurchaseOrderStatus;
}

export class ReceivePurchaseItemDto {
  @IsString() itemId!: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001) quantity!: number;
}
