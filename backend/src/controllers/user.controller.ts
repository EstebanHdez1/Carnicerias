import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { Role, Status } from '@prisma/client';
import { recordAuditLog } from '../services/audit.service.js';

const createUserSchema = z.object({
  username: z.string().min(3, 'El nombre de usuario debe tener al menos 3 caracteres'),
  name: z.string().min(2, 'El nombre completo es requerido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  role: z.nativeEnum(Role).default(Role.VENDEDOR),
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  username: z.string().min(3).optional(),
  role: z.nativeEnum(Role).optional(),
  status: z.nativeEnum(Status).optional(),
});

const resetPasswordSchema = z.object({
  new_password: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres'),
});

export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        status: true,
        created_at: true,
        _count: {
          select: { sales: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    res.json({ success: true, users });
  } catch (error) {
    next(error);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createUserSchema.parse(req.body);

    const existing = await prisma.user.findUnique({
      where: { username: data.username.trim() },
    });
    if (existing) {
      throw new AppError(`El usuario "${data.username}" ya existe.`);
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const newUser = await prisma.user.create({
      data: {
        username: data.username.trim(),
        name: data.name.trim(),
        password_hash: passwordHash,
        role: data.role,
        status: Status.ACTIVE,
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        status: true,
        created_at: true,
      },
    });

    if (req.user) {
      await recordAuditLog({
        userId: req.user.id,
        action: 'CREATE',
        entity: 'USER',
        entityId: newUser.id,
        details: { username: newUser.username, role: newUser.role },
      });
    }

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente.',
      user: newUser,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const data = updateUserSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Usuario no encontrado.', 404);
    }

    if (data.username && data.username.trim() !== existing.username) {
      const duplicate = await prisma.user.findUnique({
        where: { username: data.username.trim() },
      });
      if (duplicate) {
        throw new AppError(`El nombre de usuario "${data.username}" ya está en uso.`);
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: data.name?.trim(),
        username: data.username?.trim(),
        role: data.role,
        status: data.status,
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        status: true,
        updated_at: true,
      },
    });

    if (req.user) {
      await recordAuditLog({
        userId: req.user.id,
        action: 'UPDATE',
        entity: 'USER',
        entityId: id,
        details: { before: { username: existing.username, role: existing.role }, after: updated },
      });
    }

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente.',
      user: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function toggleUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    if (req.user?.id === id) {
      throw new AppError('No puedes desactivar tu propio usuario administrador.', 400);
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Usuario no encontrado.', 404);
    }

    const newStatus = existing.status === Status.ACTIVE ? Status.INACTIVE : Status.ACTIVE;

    const updated = await prisma.user.update({
      where: { id },
      data: { status: newStatus },
      select: { id: true, username: true, name: true, status: true },
    });

    if (req.user) {
      await recordAuditLog({
        userId: req.user.id,
        action: 'STATUS_CHANGE',
        entity: 'USER',
        entityId: id,
        details: { previousStatus: existing.status, newStatus },
      });
    }

    res.json({
      success: true,
      message: `Usuario ${newStatus === Status.ACTIVE ? 'activado' : 'desactivado'} con éxito.`,
      user: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { new_password } = resetPasswordSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Usuario no encontrado.', 404);
    }

    const passwordHash = await bcrypt.hash(new_password, 10);

    await prisma.user.update({
      where: { id },
      data: { password_hash: passwordHash },
    });

    if (req.user) {
      await recordAuditLog({
        userId: req.user.id,
        action: 'RESET_PASSWORD',
        entity: 'USER',
        entityId: id,
        details: { username: existing.username },
      });
    }

    res.json({
      success: true,
      message: `Contraseña restablecida con éxito para el usuario ${existing.username}.`,
    });
  } catch (error) {
    next(error);
  }
}
