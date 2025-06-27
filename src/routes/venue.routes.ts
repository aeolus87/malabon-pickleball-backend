// src/routes/venue.routes.ts
import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireAdmin, validateVenueId } from '../middleware/venue.middleware';
import { venueController } from '../controllers/venue.controller';

const router = express.Router();

// Apply auth to all routes
router.use(authenticateToken);

// Public routes (authenticated users)
router.get('/', venueController.getAllVenues);
router.post('/:id/attend', validateVenueId, venueController.attendVenue);
router.post('/:id/cancel', validateVenueId, venueController.cancelAttendance);
router.get('/:id/attendees', validateVenueId, venueController.getVenueAttendees);

// Admin-only routes
router.post('/', requireAdmin, venueController.createVenue);
router.put('/:id/status', requireAdmin, validateVenueId, venueController.updateVenueStatus);
router.put('/:id/photo', requireAdmin, validateVenueId, venueController.updateVenuePhoto);
router.put('/:id', requireAdmin, validateVenueId, venueController.updateVenue);
router.delete('/:id', requireAdmin, validateVenueId, venueController.deleteVenue);
router.post('/:id/remove-all-attendees', requireAdmin, validateVenueId, venueController.removeAllAttendees);

export default router;