import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'Bu alan boş bırakılamaz.' })
  @MaxLength(200)
  name!: string;
  @IsOptional() @IsString() @MaxLength(100) shortName?: string;
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

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'Bu alan boş bırakılamaz.' })
  @MaxLength(200)
  name?: string;
  @IsOptional() @IsString() @MaxLength(100) shortName?: string | null;
  @IsOptional() @IsString() @MaxLength(150) contactName?: string | null;
  @IsOptional() @IsString() @MaxLength(50) phone?: string | null;
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value === '' ? null : value))
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi girin.' })
  @MaxLength(200)
  email?: string | null;
  @IsOptional() @IsString() @MaxLength(100) taxOffice?: string | null;
  @IsOptional() @IsString() @MaxLength(50) taxNumber?: string | null;
  @IsOptional() @IsString() @MaxLength(1000) address?: string | null;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string | null;
}

export class SetCustomerActiveDto {
  @IsBoolean() isActive!: boolean;
}
