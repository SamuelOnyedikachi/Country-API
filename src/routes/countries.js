import express from 'express';
import {
  getAllCountries,
  getCountryByName,
  createCountry,
  updateCountry,
  deleteCountry,
  refreshCountriesHandler,
  getStatus,
  getSummaryImage,
} from '../controllers/countriesController.js';

const router = express.Router();

// ===============================
// Country Routes
// ===============================

// GET /status - Show total countries and last refresh timestamp
router.get('/status', getStatus);

// GET /countries/image -> serve summary image
router.get('/image', getSummaryImage);

// GET /countries - Retrieve all countries (with optional filters)
router.get('/', getAllCountries);

// GET /countries/:name - Retrieve a single country by name
router.get('/:name', getCountryByName);

// POST /countries - Add a new country manually
router.post('/', createCountry);

// PUT /countries/:name - Update a country
router.put('/:name', updateCountry);

// DELETE /countries/:name - Delete a country
router.delete('/:name', deleteCountry);

// POST /countries/refresh - Refresh the list of countries from external APIs
router.post('/refresh', refreshCountriesHandler);

export default router;
