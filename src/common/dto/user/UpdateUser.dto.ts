import { IsString, IsOptional, IsEmail, Length } from 'class-validator';

export class UpdateUserDto {
    @IsString()
    @Length(3, 20)
    name!: string;

    @IsEmail()
    email!: string;

    @IsOptional()
    @IsString()
    @Length(6, 100)
    password?: string;

    @IsString()
    role!: string;
}