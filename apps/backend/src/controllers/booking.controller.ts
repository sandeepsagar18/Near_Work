import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS } from '@nearwork/config';
import { BookingService } from '../services/booking.service';
import { prisma } from '../config/db';

export class BookingController {
  /**
   * Customer initiates a booking
   */
  static async createBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const customerId = req.user!.id;
      const booking = await BookingService.createBooking(customerId, req.body);
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Booking created, proceeding to payment',
        data: booking
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single booking details with live worker status, payment, and tracking
   */
  static async getBookingById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
          service: { include: { category: true } },
          address: true,
          customer: { select: { id: true, name: true, phone: true, email: true } },
          worker: {
            include: {
              user: { select: { name: true, phone: true, avatarUrl: true } }
            }
          },
          payment: true,
          statusHistory: { orderBy: { createdAt: 'asc' } },
          invoice: true,
          review: true
        }
      });

      if (!booking) {
        res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Booking not found' });
        return;
      }

      // Security check: Only customer, assigned worker, or admin can view
      const isCustomer = booking.customerId === req.user!.id;
      const isWorker = booking.worker?.userId === req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';

      if (!isCustomer && !isWorker && !isAdmin) {
        res.status(HTTP_STATUS.FORBIDDEN).json({ success: false, message: 'Forbidden' });
        return;
      }

      res.status(HTTP_STATUS.OK).json({ success: true, data: booking });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Worker accepts job
   */
  static async acceptJob(req: Request, res: Response, next: NextFunction) {
    try {
      const workerId = req.user!.workerId!;
      const { id } = req.params;
      const result = await BookingService.acceptJob(workerId, id);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Job accepted successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Worker rejects job
   */
  static async rejectJob(req: Request, res: Response, next: NextFunction) {
    try {
      const workerId = req.user!.workerId!;
      const { id } = req.params;
      const result = await BookingService.rejectJob(workerId, id);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Job declined',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Worker starts en route
   */
  static async startEnRoute(req: Request, res: Response, next: NextFunction) {
    try {
      const workerId = req.user!.workerId!;
      const { id } = req.params;
      const result = await BookingService.startEnRoute(workerId, id);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Status updated to en route',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Worker marks arrival with geofence check
   */
  static async markArrived(req: Request, res: Response, next: NextFunction) {
    try {
      const workerId = req.user!.workerId!;
      const { id } = req.params;
      const { latitude, longitude } = req.body;
      const result = await BookingService.markArrived(workerId, id, latitude, longitude);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Arrival verified successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Worker starts service with OTP
   */
  static async startService(req: Request, res: Response, next: NextFunction) {
    try {
      const workerId = req.user!.workerId!;
      const { id } = req.params;
      const { otp } = req.body;
      const result = await BookingService.startService(workerId, id, otp);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Service started successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Worker completes service
   */
  static async completeService(req: Request, res: Response, next: NextFunction) {
    try {
      const workerId = req.user!.workerId!;
      const { id } = req.params;
      const result = await BookingService.completeService(workerId, id, req.body);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Service completed and invoice generated',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Worker requests extra charges
   */
  static async requestExtraCharge(req: Request, res: Response, next: NextFunction) {
    try {
      const workerId = req.user!.workerId!;
      const { id } = req.params;
      const { amount, reason } = req.body;
      const result = await BookingService.requestExtraCharge(workerId, id, amount, reason);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Extra charge request submitted for customer approval',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Customer responds to extra charges
   */
  static async respondExtraCharge(req: Request, res: Response, next: NextFunction) {
    try {
      const customerId = req.user!.id;
      const { id } = req.params;
      const { approved } = req.body;
      const result = await BookingService.respondExtraCharge(customerId, id, approved);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: `Extra charge ${approved ? 'approved' : 'rejected'}`,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel booking
   */
  static async cancelBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const result = await BookingService.cancelBooking(
        req.user!.id,
        req.user!.role,
        id,
        reason || 'Cancelled by user'
      );
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Booking cancelled successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}
