import express from 'express';
import dotenv from 'dotenv';
import countriesRouter from './routes/countries.js';

dotenv.config();

const app = express();
app.use(express.json());

// Mount the countries router
app.use('/countries', countriesRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the Country Currency & Exchange API!',
    endpoints: {
      getAllCountries: 'GET /countries',
      refreshData: 'POST /countries/refresh',
      getStatus: 'GET /countries/status',
      getSummaryImage: 'GET /countries/image',
    },
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`server running on port ${PORT}`));
