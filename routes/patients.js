// Patients API Routes - PostgreSQL Implementation
const express = require('express');
const router = express.Router();
const { pool } = require('../services/db');

/**
 * GET /api/patients
 * Fetch all patients with optional search
 */
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query, params;

    if (search) {
      query = `
        SELECT * FROM patients
        WHERE full_name ILIKE $1
           OR email ILIKE $1
           OR contact_number ILIKE $1
        ORDER BY created_at DESC
      `;
      params = [`%${search}%`];
    } else {
      query = 'SELECT * FROM patients ORDER BY created_at DESC';
      params = [];
    }

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch patients',
      message: error.message
    });
  }
});

/**
 * GET /api/patients/:id
 * Get single patient by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM patients WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch patient',
      message: error.message
    });
  }
});

/**
 * POST /api/patients
 * Add new patient
 */
router.post('/', async (req, res) => {
  try {
    const { full_name, contact_number, email, address } = req.body;

    if (!full_name || !contact_number) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Full name and contact number are required'
      });
    }

    const insertQuery = `
      INSERT INTO patients (full_name, contact_number, email, address)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [
      full_name,
      contact_number,
      email || null,
      address || null
    ];

    const result = await pool.query(insertQuery, values);

    res.status(201).json({
      success: true,
      message: 'Patient added successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding patient:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add patient',
      message: error.message
    });
  }
});

/**
 * PUT /api/patients/:id
 * Update patient
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated
    delete updates.id;
    delete updates.created_at;

    const keys = Object.keys(updates);
    if (keys.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    const values = Object.values(updates);
    const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
    values.push(id);

    const updateQuery = `
      UPDATE patients
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.length}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Patient updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update patient',
      message: error.message
    });
  }
});

/**
 * DELETE /api/patients/:id
 * Delete patient
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM patients WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Patient deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete patient',
      message: error.message
    });
  }
});

module.exports = router;
