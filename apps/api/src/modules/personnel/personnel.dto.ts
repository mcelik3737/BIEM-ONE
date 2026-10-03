import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const money = /^\d{1,12}(\.\d{1,2})?$/;
const date = /^\d{4}-\d{2}-\d{2}$/;

export class EmployeeDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(160) fullName!: string;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(160) jobTitle!: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(4000) jobDescription?: string | null;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(160) department?: string | null;
  @IsOptional() @IsEmail() email?: string | null;
  @IsOptional() @IsString() @MaxLength(40) phone?: string | null;
  @IsOptional() @IsString() @MaxLength(100) userId?: string | null;
  @Matches(date) @IsDateString({ strict: true }) startDate!: string;
  @IsOptional() @Matches(date) @IsDateString({ strict: true }) endDate?: string | null;
  @IsBoolean() isActive!: boolean;
}
export class CompensationDto {
  @Matches(date) @IsDateString({ strict: true }) effectiveFrom!: string;
  @IsIn(['NET', 'GROSS']) salaryBasis!: string;
  @Matches(money) monthlySalary!: string;
  @Matches(money) monthlyEmployerCost!: string;
  @Matches(/^\d{1,3}(\.\d{1,2})?$/) monthlyHours!: string;
  @IsIn(['TRY', 'USD', 'EUR', 'GBP']) currency!: string;
}
export class EmployeeDocumentDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(200) title!: string;
  @IsBoolean() isRequired!: boolean;
  @IsBoolean() expiryRequired!: boolean;
  @IsOptional() @Matches(date) @IsDateString({ strict: true }) issuedAt?: string | null;
  @IsOptional() @Matches(date) @IsDateString({ strict: true }) expiresAt?: string | null;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000) notes?: string | null;
}
export class EmployeeTimeDto {
  @Matches(date) @IsDateString({ strict: true }) workDate!: string;
  @IsIn(['PROJECT', 'ADMIN', 'LEAVE']) kind!: string;
  @IsOptional() @IsString() @MaxLength(100) projectId?: string | null;
  @Matches(/^\d{1,2}(\.\d{1,2})?$/) hours!: string;
  @Matches(/^\d{1,2}(\.\d{1,2})?$/) costMultiplier!: string;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(1000) description!: string;
}
export class VoidTimeDto {
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(1000) reason!: string;
}
