import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS } from '@nearwork/config';
import { prisma } from '../config/db';
import crypto from 'crypto';

export class TicketController {
  static async createTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'User authentication required'
        });
      }

      const { bookingId, category, subject, description } = req.body;
      const ticketNumber = `TKT-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

      const validBookingId = bookingId && typeof bookingId === 'string' && bookingId.trim().length === 24 ? bookingId.trim() : null;

      const ticket = await prisma.supportTicket.create({
        data: {
          ticketNumber,
          userId,
          bookingId: validBookingId,
          category: category || 'SERVICE',
          subject: (subject || 'General Inquiry').trim(),
          description: (description || 'No description provided').trim()
        }
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Support ticket created successfully',
        data: ticket
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMyTickets(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'User authentication required'
        });
      }

      const tickets = await prisma.supportTicket.findMany({
        where: { userId },
        include: {
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              status: true,
              service: { select: { name: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      res.status(HTTP_STATUS.OK).json({ success: true, data: tickets });
    } catch (error) {
      next(error);
    }
  }

  static async getAllTickets(req: Request, res: Response, next: NextFunction) {
    try {
      const tickets = await prisma.supportTicket.findMany({
        include: {
          user: { select: { name: true, email: true, phone: true, role: true } },
          booking: true
        },
        orderBy: { createdAt: 'desc' }
      });
      res.status(HTTP_STATUS.OK).json({ success: true, data: tickets });
    } catch (error) {
      next(error);
    }
  }

  static async updateTicketStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, adminNotes } = req.body;

      const ticket = await prisma.supportTicket.update({
        where: { id },
        data: { status, adminNotes }
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Ticket updated',
        data: ticket
      });
    } catch (error) {
      next(error);
    }
  }
}
