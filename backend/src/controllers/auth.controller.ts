import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { ENV } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { Status } from '@prisma/client';

const loginSchema = z.object({
  username: z.string().min(1, 'El usuario es requerido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { username, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || user.status !== Status.ACTIVE) {
      throw new AppError('Credenciales incorrectas o usuario inactivo.', 401);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new AppError('Credenciales incorrectas o usuario inactivo.', 401);
    }

    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
    };

    const token = jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: '12h' });

    res.json({
      success: true,
      message: 'Inicio de sesión exitoso.',
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('No autenticado.', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        status: true,
        created_at: true,
      },
    });

    if (!user || user.status !== Status.ACTIVE) {
      throw new AppError('Usuario no encontrado o inactivo.', 401);
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
}
