import db from '../db/knex.js';
import { refreshCountriesService } from '../services/refreshService.js'; // ✅ Correct import
import fs from 'fs';
import path from 'path';
const SUMMARY_PATH = path.resolve('cache', 'summary.png');

// ===============================
// Get all countries (with filters + sorting)
// ===============================
export const getAllCountries = async (req, res) => {
  try {
    let query = db('countries');
    const { region, currency, sort } = req.query;

    // Apply filters
    if (region) {
      query = query.whereRaw('LOWER(region) = ?', [region.toLowerCase()]);
    }
    if (currency) {
      query = query.whereRaw('LOWER(currency_code) = ?', [
        currency.toLowerCase(),
      ]);
    }

    // Apply sorting
    if (sort === 'gdp_desc') {
      query = query.orderBy('estimated_gdp', 'desc');
    } else if (sort === 'gdp_asc') {
      query = query.orderBy('estimated_gdp', 'asc');
    }

    const countries = await query.select('*');
    res.json(countries);
  } catch (err) {
    console.error('Error fetching countries:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ===============================
// Get one country by name
// ===============================
export const getCountryByName = async (req, res) => {
  try {
    const { name } = req.params;
    const decodedName = decodeURIComponent(name); // Decode URL-encoded characters
    const country = await db('countries')
      .whereRaw('LOWER(name) = ?', [decodedName.toLowerCase()])
      .first();

    if (!country) {
      return res.status(404).json({ error: 'Country not found' });
    }

    res.json(country);
  } catch (err) {
    console.error('Error fetching country by name:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ===============================
// Create a new country (manual insert)
// ===============================
export const createCountry = async (req, res) => {
  try {
    const {
      name,
      capital,
      region,
      population,
      currency_code,
      exchange_rate,
      estimated_gdp,
      flag_url,
    } = req.body;

    if (!name || !population || !currency_code) {
      return res.status(400).json({
        error: 'Validation failed',
        details: {
          name: !name ? 'is required' : undefined,
          population: !population ? 'is required' : undefined,
          currency_code: !currency_code ? 'is required' : undefined,
        },
      });
    }

    // Check if already exists
    const existing = await db('countries')
      .whereRaw('LOWER(name) = ?', [name.toLowerCase()])
      .first();

    if (existing) {
      return res.status(400).json({ error: 'Country already exists' });
    }

    await db('countries').insert({
      name,
      capital,
      region,
      population,
      currency_code,
      exchange_rate,
      estimated_gdp,
      flag_url,
      last_refreshed_at: new Date(),
    });

    res.status(201).json({ message: 'Country added successfully' });
  } catch (err) {
    console.error('Error creating country:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ===============================
// Update a country by name
// ===============================
export const updateCountry = async (req, res) => {
  try {
    const { name } = req.params;
    const updates = req.body;

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No update data provided' });
    }

    const updated = await db('countries')
      .whereRaw('LOWER(name) = ?', [name.toLowerCase()])
      .update({ ...updates, last_refreshed_at: new Date() });

    if (!updated) {
      return res.status(404).json({ error: 'Country not found' });
    }

    const country = await db('countries')
      .whereRaw('LOWER(name) = ?', [name.toLowerCase()])
      .first();

    res.json({ message: 'Country updated successfully', country });
  } catch (err) {
    console.error('Error updating country:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ===============================
// Delete a country by name
// ===============================
export const deleteCountry = async (req, res) => {
  try {
    const { name } = req.params;
    const deleted = await db('countries')
      .whereRaw('LOWER(name) = ?', [name.toLowerCase()])
      .del();

    if (!deleted) {
      return res.status(404).json({ error: 'Country not found' });
    }

    res.json({ message: 'Country deleted successfully' });
  } catch (err) {
    console.error('Error deleting country:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ===============================
// Refresh countries (from APIs)
// ===============================
export const refreshCountriesHandler = async (req, res) => {
  try {
    const result = await refreshCountriesService(); // ✅ Correct usage
    res.json(result);
  } catch (err) {
    console.error('Error refreshing countries:', err);
    res.status(503).json({
      error: 'External data source unavailable',
      details: err.message,
    });
  }
};

// ===============================
// Get status (total countries, last refresh)
// ===============================
export const getStatus = async (req, res) => {
  try {
    const total = await db('countries').count('id as count').first();
    const lastRefresh = await db('countries')
      .orderBy('last_refreshed_at', 'desc')
      .first('last_refreshed_at');

    res.json({
      total_countries: total.count,
      last_refreshed_at: lastRefresh ? lastRefresh.last_refreshed_at : null,
    });
  } catch (err) {
    console.error('Error fetching status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ===============================
// Get summary image
// ===============================
export const getSummaryImage = (req, res) => {
  try {
    if (!fs.existsSync(SUMMARY_PATH)) {
      return res.status(404).json({ error: 'Summary image not found' });
    }

    // Serve the file
    res.sendFile(SUMMARY_PATH, (err) => {
      if (err) {
        // This will be caught if there's an issue during the file transfer
        console.error('Error sending summary image:', err);
        // Avoid sending another response if headers are already sent
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    });
  } catch (err) {
    // This catches synchronous errors, like issues with fs.existsSync
    console.error('Error accessing summary image:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};
