import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  DATABASE_URL: process.env.DATABASE_URL || 'mysql://root:1234@localhost:3306/carniceria_db',
  JWT_SECRET: process.env.JWT_SECRET || 'carniceria_super_secret_jwt_key_2026_x789',
  VENDEDOR_EDIT_WINDOW_MINUTES: process.env.VENDEDOR_EDIT_WINDOW_MINUTES
    ? parseInt(process.env.VENDEDOR_EDIT_WINDOW_MINUTES, 10)
    : 30,
};
