const express = require('express');
const router = express.Router();
const { randomUUID } = require('crypto');

// In-memory patient data
let patients = [
  {
    id: randomUUID(),
    full_name: 'John Smith',
    contact_number: '+1-555-0101',
    email: 'john.smith@email.com',
    address: '123 Main St, Springfield, IL 62701'
  },
  {
    id: randomUUID(),
    full_name: 'Sarah Johnson',
    contact_number: '+1-555-0102',
    email: 'sarah.j@email.com',
    address: '456 Oak Ave, Chicago, IL 60601'
  },
  {
    id: randomUUID(),
    full_name: 'Michael Brown',
    contact_number: '+1-555-0103',
    email: 'mbrown@email.com',
    address: '789 Pine Rd, Naperville, IL 60540'
  }
];

// GET all patients
router.get('/', (req, res) => {
  const { search } = req.query;

  let filtered = patients;
  if (search) {
    const term = search.toLowerCase();
    filtered = patients.filter(p =>
      p.full_name.toLowerCase().includes(term) ||
      p.email.toLowerCase().includes(term) ||
      p.contact_number.includes(term)
    );
  }

  res.json({
    success: true,
    count: filtered.length,
    data: filtered
  });
});

// GET single patient
router.get('/:id', (req, res) => {
  const patient = patients.find(p => p.id === req.params.id);

  if (!patient) {
    return res.status(404).json({
      success: false,
      error: 'Patient not found'
    });
  }

  res.json({ success: true, data: patient });
});

// POST new patient
router.post('/', (req, res) => {
  const { full_name, contact_number, email, address } = req.body;

  if (!full_name || !contact_number) {
    return res.status(400).json({
      success: false,
      error: 'Full name and contact number are required'
    });
  }

  const newPatient = {
    id: randomUUID(),
    full_name,
    contact_number,
    email: email || '',
    address: address || ''
  };

  patients.unshift(newPatient);

  res.status(201).json({
    success: true,
    message: 'Patient added successfully',
    data: newPatient
  });
});

// PUT update patient
router.put('/:id', (req, res) => {
  const index = patients.findIndex(p => p.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: 'Patient not found'
    });
  }

  patients[index] = { ...patients[index], ...req.body, id: req.params.id };

  res.json({
    success: true,
    message: 'Patient updated successfully',
    data: patients[index]
  });
});

// DELETE patient
router.delete('/:id', (req, res) => {
  const index = patients.findIndex(p => p.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: 'Patient not found'
    });
  }

  patients.splice(index, 1);

  res.json({
    success: true,
    message: 'Patient deleted successfully'
  });
});

module.exports = router;
