import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS } from '@nearwork/config';
import { prisma } from '../config/db';

export class CustomerController {
  /**
   * Get customer profile
   */
  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        include: { addresses: true }
      });
      res.status(HTTP_STATUS.OK).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get saved addresses
   */
  static async getAddresses(req: Request, res: Response, next: NextFunction) {
    try {
      const addresses = await prisma.address.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: 'desc' }
      });
      res.status(HTTP_STATUS.OK).json({ success: true, data: addresses });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add new address
   */
  static async addAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const { isDefault, ...rest } = req.body;

      if (isDefault) {
        // Reset previous default addresses
        await prisma.address.updateMany({
          where: { userId: req.user!.id },
          data: { isDefault: false }
        });
      }

      const address = await prisma.address.create({
        data: {
          ...rest,
          userId: req.user!.id,
          isDefault: !!isDefault
        }
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Address added successfully',
        data: address
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get customer bookings with filtering (upcoming, active, completed, cancelled)
   */
  static async getBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.query;
      const where: any = { customerId: req.user!.id };

      if (status) {
        where.status = status;
      }

      const bookings = await prisma.booking.findMany({
        where,
        include: {
          service: { include: { category: true } },
          worker: { include: { user: { select: { name: true, phone: true, avatarUrl: true } } } },
          address: true,
          payment: true,
          invoice: true,
          review: true
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      res.status(HTTP_STATUS.OK).json({ success: true, data: bookings });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Submit Review & Rating for completed booking
   */
  static async createReview(req: Request, res: Response, next: NextFunction) {
    try {
      const { bookingId, rating, review } = req.body;
      const customerId = req.user!.id;

      const booking = await prisma.booking.findUnique({
        where: { id: bookingId }
      });

      if (!booking || booking.customerId !== customerId || !booking.workerId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Invalid booking for review'
        });
        return;
      }

      const result = await prisma.$transaction(async (tx: any) => {
        const createdReview = await tx.review.create({
          data: {
            bookingId,
            customerId,
            workerId: booking.workerId!,
            rating,
            review
          }
        });

        // Recalculate Worker average rating
        const allWorkerReviews = await tx.review.findMany({
          where: { workerId: booking.workerId! },
          select: { rating: true }
        });

        const avgRating =
          allWorkerReviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / allWorkerReviews.length;

        await tx.workerProfile.update({
          where: { id: booking.workerId! },
          data: {
            averageRating: Math.round(avgRating * 10) / 10,
            totalReviews: allWorkerReviews.length
          }
        });

        return createdReview;
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Review submitted successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}
