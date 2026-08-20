import { WorkerStatus, WorkerVerificationStatus, BookingStatus } from '@nearwork/types';
import { APP_CONFIG } from '@nearwork/config';
import { prisma } from '../config/db';
import { calculateDistanceKm } from '../utils/haversine';
import { getSocketIO } from '../config/socket';
import { SOCKET_EVENTS } from '@nearwork/types';

export interface ScoredWorker {
  workerId: string;
  userId: string;
  name: string;
  phone: string;
  rating: number;
  totalJobs: number;
  distanceKm: number;
  score: number;
  currentLat: number;
  currentLng: number;
}

export class MatchingService {
  /**
   * Finds and ranks suitable workers for a booking based on skills, location, rating, and availability
   */
  static async findEligibleWorkers(
    serviceCategoryId: string,
    customerLat: number,
    customerLng: number,
    scheduledDate: string,
    scheduledTimeSlot: string
  ): Promise<ScoredWorker[]> {
    // 1. Fetch verified, online workers with the matching skill category
    const workers = await prisma.workerProfile.findMany({
      where: {
        status: WorkerStatus.ONLINE,
        verificationStatus: WorkerVerificationStatus.VERIFIED,
        skills: {
          some: {
            categoryId: serviceCategoryId
          }
        }
      },
      include: {
        user: { select: { id: true, name: true, phone: true } },
        skills: { where: { categoryId: serviceCategoryId } },
        availability: true,
        bookings: {
          where: {
            scheduledDate: scheduledDate,
            status: {
              in: [
                BookingStatus.WORKER_ACCEPTED,
                BookingStatus.WORKER_EN_ROUTE,
                BookingStatus.WORKER_ARRIVED,
                BookingStatus.SERVICE_STARTED
              ]
            }
          }
        }
      }
    });

    if (!workers || workers.length === 0) {
      return [];
    }

    const dayOfWeek = new Date(scheduledDate).getDay();
    const scoredList: ScoredWorker[] = [];

    for (const worker of workers) {
      // Check overlapping active job
      const hasSlotConflict = worker.bookings.some(
        (b: any) => b.scheduledTimeSlot === scheduledTimeSlot
      );
      if (hasSlotConflict) {
        continue; // Overlapping job
      }

      // Check location & working radius
      const workerLat = worker.currentLat ?? customerLat;
      const workerLng = worker.currentLng ?? customerLng;

      const distanceKm = calculateDistanceKm(
        customerLat,
        customerLng,
        workerLat,
        workerLng
      );

      // Calculate matching score
      const distanceScore = Math.max(0, 30 - distanceKm) * 2; // closer = higher
      const ratingScore = (worker.averageRating || 5.0) * 6; // 0 to 30
      const experienceScore = Math.min(worker.experienceYears, 10) * 2; // 0 to 20
      const workloadPenalty = worker.bookings.length * 5;

      const totalScore = distanceScore + ratingScore + experienceScore - workloadPenalty;

      scoredList.push({
        workerId: worker.id,
        userId: worker.user.id,
        name: worker.user.name,
        phone: worker.user.phone,
        rating: worker.averageRating,
        totalJobs: worker.totalJobsCompleted,
        distanceKm: Math.round(distanceKm * 10) / 10,
        score: Math.round(totalScore * 10) / 10,
        currentLat: workerLat,
        currentLng: workerLng
      });
    }

    // Sort descending by score
    scoredList.sort((a, b) => b.score - a.score);
    return scoredList;
  }

  /**
   * Dispatches a booking job request to the top-ranked candidate worker
   */
  static async assignNextWorker(bookingId: string): Promise<boolean> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: { select: { categoryId: true, name: true, basePrice: true } },
        address: true,
        customer: { select: { name: true, phone: true } }
      }
    });

    if (!booking) return false;

    // Search eligible workers
    const rankedWorkers = await this.findEligibleWorkers(
      booking.service.categoryId,
      booking.address.latitude,
      booking.address.longitude,
      booking.scheduledDate,
      booking.scheduledTimeSlot
    );

    // Query past decline history for this booking
    const declinedHistory = await prisma.bookingStatusHistory.findMany({
      where: {
        bookingId,
        status: BookingStatus.SEARCHING_WORKER,
        changedBy: { not: null }
      },
      select: { changedBy: true }
    });

    const declineCountMap: Record<string, number> = {};
    for (const h of declinedHistory) {
      if (h.changedBy) {
        declineCountMap[h.changedBy] = (declineCountMap[h.changedBy] || 0) + 1;
      }
    }

    // Filter out workers who have declined this booking 2 times or more
    const availableCandidates = rankedWorkers.filter(
      (w) => (declineCountMap[w.workerId] || 0) < 2 && (declineCountMap[w.userId] || 0) < 2
    );

    if (availableCandidates.length === 0) {
      // All eligible workers declined -> keep booking searchable
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          workerId: null,
          status: BookingStatus.SEARCHING_WORKER
        }
      });
      return false;
    }

    const candidate = availableCandidates[0];

    // Atomically assign candidate worker
    await prisma.$transaction(async (tx: any) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          workerId: candidate.workerId,
          status: BookingStatus.WORKER_ASSIGNED,
          assignedAt: new Date()
        }
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId,
          status: BookingStatus.WORKER_ASSIGNED,
          note: `Assigned to worker ${candidate.name} (${candidate.distanceKm} km away)`
        }
      });
    });

    // Create in-app Notification record
    await prisma.notification.create({
      data: {
        userId: candidate.userId,
        title: '⚡ New Service Job Dispatch!',
        message: `New booking for ${booking.service.name} in ${booking.address.city}. You have 60 seconds to accept.`,
        type: 'JOB_ASSIGNMENT',
        data: JSON.stringify({ link: `/job/${booking.id}` })
      }
    }).catch(() => {});

    // Notify worker via Socket.IO across all targeted rooms
    const io = getSocketIO();
    if (io) {
      const alertPayload = {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        serviceName: booking.service.name,
        customerName: booking.customer.name,
        scheduledDate: booking.scheduledDate,
        scheduledTimeSlot: booking.scheduledTimeSlot,
        address: `${booking.address.addressLine}, ${booking.address.city}`,
        distanceKm: candidate.distanceKm,
        estimatedEarnings: Math.round(booking.totalAmount * 0.8), // 80% to worker
        expiresInSeconds: APP_CONFIG.jobAcceptanceTimeoutSeconds
      };

      io.to([
        `worker:${candidate.workerId}`,
        `worker:${candidate.userId}`,
        `user:${candidate.userId}`,
        'workers:all'
      ]).emit(SOCKET_EVENTS.BOOKING_ASSIGNED, alertPayload);
    }

    // Set 60-second waterfall timeout: if not accepted, reallocate to next worker
    setTimeout(async () => {
      try {
        const currentBooking = await prisma.booking.findUnique({
          where: { id: bookingId }
        });
        if (
          currentBooking &&
          currentBooking.status === BookingStatus.WORKER_ASSIGNED &&
          currentBooking.workerId === candidate.workerId
        ) {
          const { BookingService } = await import('./booking.service');
          await BookingService.rejectJob(candidate.workerId, bookingId);
        }
      } catch (err) {
        console.error('Error handling worker response timeout:', err);
      }
    }, APP_CONFIG.jobAcceptanceTimeoutSeconds * 1000);

    return true;
  }
}
