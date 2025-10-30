import db from '../db/knex.js';
import { refreshCountriesService } from '../services/refreshService.js';
import fs from 'fs';
import path from 'path';

const SUMMARY_PATH = path.resolve('cache', 'summary.png');

export const getAllCountries = async (req, res) => {
  try {
    let query = db('countries');
    const { region, currency, sort } = req.query;

    if (region)
      query = query.whereRaw('LOWER(region) = ?', [region.toLowerCase()]);
    if (currency)
      query = query.whereRaw('LOWER(currency_code) = ?', [
        currency.toLowerCase(),
      ]);

    if (sort === 'gdp_desc') query = query.orderBy('estimated_gdp', 'desc');
    else if (sort === 'gdp_asc') query = query.orderBy('estimated_gdp', 'asc');

    const countries = await query.select('*');
    res.json(countries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCountryByName = async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const country = await db('countries')
      .whereRaw('LOWER(name) = ?', [name.toLowerCase()])
      .first();
    if (!country) return res.status(404).json({ error: 'Country not found' });
    res.json(country);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

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

    const errors = {};
    if (!name) errors.name = 'is required';
    if (!population) errors.population = 'is required';
    if (!currency_code) errors.currency_code = 'is required';

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
    } // This closing brace was missing

    const existing = await db('countries')
      .whereRaw('LOWER(name) = ?', [name.toLowerCase()])
      .first();
    if (existing)
      return res.status(400).json({ error: 'Country already exists' });

    await db('countries').insert({
      name,
      capital: capital || null,
      region: region || null,
      population,
      currency_code,
      exchange_rate: exchange_rate || null,
      estimated_gdp: estimated_gdp || 0,
      flag_url: flag_url || null,
      last_refreshed_at: new Date(),
    });

    res.status(201).json({ message: 'Country added successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateCountry = async (req, res) => {
  try {
    const { name } = req.params;
    const updates = req.body;
    if (!updates || Object.keys(updates).length === 0)
      return res.status(400).json({ error: 'No update data provided' });

    const updated = await db('countries')
      .whereRaw('LOWER(name) = ?', [name.toLowerCase()])
      .update({ ...updates, last_refreshed_at: new Date() });
    if (!updated) return res.status(404).json({ error: 'Country not found' });

    const country = await db('countries')
      .whereRaw('LOWER(name) = ?', [name.toLowerCase()])
      .first();
    res.json({ message: 'Country updated successfully', country });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteCountry = async (req, res) => {
  try {
    const { name } = req.params;
    const deleted = await db('countries')
      .whereRaw('LOWER(name) = ?', [name.toLowerCase()])
      .del();
    if (!deleted) return res.status(404).json({ error: 'Country not found' });
    res.json({ message: 'Country deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const refreshCountriesHandler = async (req, res) => {
  try {
    const result = await refreshCountriesService();
    res.json(result);
  } catch (err) {
    console.error('Refresh handler failed:', err.message);
    if (err.isAxiosError) {
      // This is an error from fetching external data
      return res.status(503).json({
        error: 'External data source unavailable',
        details: `Could not fetch data from ${err.config.url}. Reason: ${
          err.cause || err.code || err.message
        }`,
      });
    }
    // This is likely a database or other internal error
    res
      .status(500)
      .json({ error: 'Internal server error', details: err.message });
  }
};

export const getStatus = async (req, res) => {
  try {
    const total = await db('countries').count('id as count').first();
    const lastRefresh = await db('countries')
      .orderBy('last_refreshed_at', 'desc')
      .first('last_refreshed_at');
    res.json({
      total_countries: total.count,
      last_refreshed_at: lastRefresh?.last_refreshed_at || null, // This line is correct, my apologies. The issue is likely elsewhere.
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSummaryImage = (req, res) => {
  try {
    if (!fs.existsSync(SUMMARY_PATH))
      return res.status(404).json({ error: 'Summary image not found' });
    res.sendFile(SUMMARY_PATH, (err) => {
      if (err) console.error(err);
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
