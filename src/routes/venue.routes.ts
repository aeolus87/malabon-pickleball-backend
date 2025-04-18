// src/routes/venue.routes.ts
import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { venueController } from '../controllers/venue.controller';

const router = express.Router();

// Get all venues
router.get('/', authenticateToken, venueController.getAllVenues);

// Create a new venue
router.post('/', authenticateToken, venueController.createVenue);

// Update venue status
router.put('/:id/status', authenticateToken, venueController.updateVenueStatus);

// Update venue photo
router.put('/:id/photo', authenticateToken, venueController.updateVenuePhoto);

// Delete venue
router.delete('/:id', authenticateToken, venueController.deleteVenue);

// Attend venue
router.post('/:id/attend', authenticateToken, venueController.attendVenue);

// Cancel attendance
router.post('/:id/cancel', authenticateToken, venueController.cancelAttendance);

// Remove all attendees
router.post('/:id/remove-all-attendees', authenticateToken, venueController.removeAllAttendees);

// Get venue attendees
router.get('/:id/attendees', authenticateToken, venueController.getVenueAttendees);

export default router;