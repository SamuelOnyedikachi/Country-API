import { Router } from 'express';
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

const router = Router();

// Route to show available endpoints for this router
router.get('/', (req, res) => {
  res.json({
    message: 'Country API is active',
    endpoints: ['/refresh', '/status', '/image', '/:name'],
  });
});

router.post('/refresh', refreshCountriesHandler);
router.get('/status', getStatus);
router.get('/image', getSummaryImage);
router.get('/', getAllCountries);
router.post('/', createCountry);
router.get('/:name', getCountryByName);
router.put('/:name', updateCountry);
router.delete('/:name', deleteCountry);

export default router;