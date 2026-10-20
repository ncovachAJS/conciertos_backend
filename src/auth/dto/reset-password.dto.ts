import { IsString, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
  // El token se genera con 32 bytes aleatorios en hexadecimal (64 caracteres).
  // Exigir ese formato evita que se envíen objetos o filtros en lugar de un texto.
  @IsString()
  @Matches(/^[a-f0-9]{64}$/, { message: 'Token inválido' })
  token!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
