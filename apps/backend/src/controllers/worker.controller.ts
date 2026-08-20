import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS, ERROR_CODES } from '@nearwork/config';
import { prisma } from '../config/db';
import { BookingStatus, WorkerStatus } from '@nearwork/types';
import { EarningService } from '../services/earning.service';

export class WorkerController {
  /**
   * Get worker profile, status, verification, and schedule
   */
  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const worker = await prisma.workerProfile.findUnique({
        where: { userId: req.user!.id },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
          skills: { include: { category: true } },
          availability: true
        }
      });

      if (!worker) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          code: ERROR_CODES.WORKER_NOT_FOUND,
          message: 'Worker profile not found'
        });
        return;
      }

      res.status(HTTP_STATUS.OK).json({ success: true, data: worker });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle Online / Offline status
   */
  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;
      const workerId = req.user!.workerId;

      if (!workerId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Worker ID missing'
        });
        return;
      }

      const updated = await prisma.workerProfile.update({
        where: { id: workerId },
        data: { status }
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: `Worker is now ${status}`,
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update live worker location
   */
  static async updateLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const { latitude, longitude, heading, speed, accuracy } = req.body;
      let workerId = req.user!.workerId;

      if (!workerId) {
        const profile = await prisma.workerProfile.findUnique({ where: { userId: req.user!.id } });
        workerId = profile?.id;
      }

      if (!workerId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'Worker ID missing' });
        return;
      }

      await prisma.$transaction([
        prisma.workerProfile.update({
          where: { id: workerId },
          data: { currentLat: latitude, currentLng: longitude }
        }),
        prisma.workerLocation.create({
          data: {
            workerId,
            latitude,
            longitude,
            heading: heading || 0,
            speed: speed || 0,
            accuracy: accuracy || 5
          }
        })
      ]);

      // Broadcast to active bookings and admin room
      try {
        const { getIO } = await import('../config/socket');
        const io = getIO ? getIO() : null;
        if (io) {
          const activeBookings = await prisma.booking.findMany({
            where: {
              workerId,
              status: {
                in: [
                  BookingStatus.WORKER_ACCEPTED,
                  BookingStatus.WORKER_EN_ROUTE,
                  BookingStatus.WORKER_ARRIVED,
                  BookingStatus.SERVICE_STARTED
                ]
              }
            },
            select: { id: true }
          });

          for (const b of activeBookings) {
            io.to(`booking:${b.id}`).emit('tracking:update', {
              workerId,
              bookingId: b.id,
              latitude,
              longitude,
              heading: heading || 0,
              speed: speed || 0,
              accuracy: accuracy || 5,
              timestamp: Date.now()
            });
          }

          io.to('admin:room').emit('admin:liveUpdate', {
            workerId,
            latitude,
            longitude,
            timestamp: Date.now()
          });
        }
      } catch (sockErr) {
        // Non-blocking socket broadcast
      }

      res.status(HTTP_STATUS.OK).json({ success: true, message: 'Location updated' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get worker assigned/accepted/active/completed bookings
   */
  static async getJobs(req: Request, res: Response, next: NextFunction) {
    try {
      const workerId = req.user!.workerId;
      const { status } = req.query;

      const worker = await prisma.workerProfile.findUnique({
        where: { id: workerId },
        include: { skills: true }
      });

      const skillCategoryIds = worker?.skills.map((s) => s.categoryId) || [];

      let where: any = {};
      if (status) {
        where = { workerId, status };
      } else {
        where = {
          OR: [
            { workerId },
            {
              workerId: null,
              status: BookingStatus.SEARCHING_WORKER,
              ...(skillCategoryIds.length > 0 ? { service: { categoryId: { in: skillCategoryIds } } } : {})
            }
          ]
        };
      }

      const jobs = await prisma.booking.findMany({
        where,
        include: {
          service: { include: { category: true } },
          address: true,
          customer: { select: { name: true, phone: true, avatarUrl: true } },
          payment: true
        },
        orderBy: { createdAt: 'desc' }
      });

      res.status(HTTP_STATUS.OK).json({ success: true, data: jobs });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get worker earnings and ledger
   */
  static async getEarnings(req: Request, res: Response, next: NextFunction) {
    try {
      const workerId = req.user!.workerId;
      if (!workerId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'Worker ID missing' });
        return;
      }

      const result = await EarningService.getWorkerEarnings(workerId);
      res.status(HTTP_STATUS.OK).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Request Payout
   */
  static async requestPayout(req: Request, res: Response, next: NextFunction) {
    try {
      const { amount } = req.body;
      const workerId = req.user!.workerId;

      if (!workerId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'Worker ID missing' });
        return;
      }

      const payout = await EarningService.requestPayout(workerId, parseFloat(amount));
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Payout request created successfully',
        data: payout
      });
    } catch (error) {
      next(error);
    }
  }
}
