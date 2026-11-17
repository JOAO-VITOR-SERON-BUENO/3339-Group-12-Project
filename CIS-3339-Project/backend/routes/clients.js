// This file stores all the API endpoints for making calls to the "clients" collection in the MongoDB database
//
// Every route follows the same pattern:
//   requireAuth                 -> must be logged in (reads)
//   requireRole('editor')       -> must be an editor (create, update, delete)
//   withOrg(filter, req, 'orgs') -> every query is scoped to the user's organization
// Clients store their organizations in the `orgs` array.

// Import functionalities
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const { requireAuth, requireRole } = require('../auth/authMiddleWare');
const withOrg = require('../auth/withOrg');
const {
  HttpError,
  asyncHandler,
  assertObjectId,
  cleanBody,
  escapeRegex
} = require('../utils/http');

// importing data model schemas
const { clients, events } = require('../models/models');

// API Endpoint to GET all clients of the organization
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await clients.find(withOrg({}, req, 'orgs')));
  })
);

// API endpoint to GET single client by ID
router.get(
  '/id/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    assertObjectId(req.params.id, 'Client');
    const client = await clients.findOne(
      withOrg({ _id: req.params.id }, req, 'orgs')
    );
    if (!client) throw new HttpError(404, 'Client not found');
    res.json(client);
  })
);

// API endpoint to GET entries based on search query
// Ex: '...?firstName=Bob&lastName=&searchBy=name'
router.get(
  '/search',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { searchBy, firstName, lastName, phoneNumber } = req.query;
    const conditions = [];
    const contains = (text) => new RegExp(escapeRegex(text), 'i');

    switch (searchBy) {
      case 'name':
        if (firstName) conditions.push({ firstName: contains(firstName) });
        if (lastName) conditions.push({ lastName: contains(lastName) });
        break;
      case 'number':
        if (phoneNumber)
          conditions.push({ 'phoneNumber.primary': contains(phoneNumber) });
        break;
      default:
        throw new HttpError(400, 'invalid searchBy');
    }

    // MongoDB rejects an empty $and, so only add it when there is something to match
    const filter = conditions.length ? { $and: conditions } : {};
    res.json(await clients.find(withOrg(filter, req, 'orgs')));
  })
);

// POST create new client (the organization always comes from the JWT)
router.post(
  '/',
  requireAuth,
  requireRole('editor'),
  asyncHandler(async (req, res) => {
    const newClient = cleanBody(req.body, ['orgs']);
    await clients.create(withOrg(newClient, req, 'orgs'));
    res.status(201).send('New client created successfully');
  })
);

// API endpoint to PUT update client
router.put(
  '/update/:id',
  requireAuth,
  requireRole('editor'),
  asyncHandler(async (req, res) => {
    assertObjectId(req.params.id, 'Client');
    const updated = await clients.findOneAndUpdate(
      withOrg({ _id: req.params.id }, req, 'orgs'),
      cleanBody(req.body, ['orgs']),
      { new: true, runValidators: true }
    );
    if (!updated) throw new HttpError(404, 'Client not found');
    res.status(200).send('Client updated successfully');
  })
);

// API endpoint to hard delete client by ID, can be only be done if client is not signed up for events
router.delete(
  '/:id',
  requireAuth,
  requireRole('editor'),
  asyncHandler(async (req, res) => {
    assertObjectId(req.params.id, 'Client');
    const filter = withOrg({ _id: req.params.id }, req, 'orgs');

    const client = await clients.findOne(filter);
    if (!client) throw new HttpError(404, 'Client not found');

    const registered = await events.exists(
      withOrg({ attendees: client._id }, req)
    );
    if (registered) {
      throw new HttpError(
        409,
        "Client is signed up for events and can't be deleted."
      );
    }

    await clients.deleteOne(filter);
    res.status(200).send('Client deleted successfully');
  })
);

// GET number of clients per zip code for the dashboard
router.get(
  '/byzip',
  requireAuth,
  asyncHandler(async (req, res) => {
    const match = withOrg({ 'address.zip': { $exists: true, $ne: '' } }, req, 'orgs');
    // aggregation pipelines are not cast by Mongoose, so convert the org id explicitly
    match.orgs = new mongoose.Types.ObjectId(match.orgs);

    const data = await clients.aggregate([
      { $match: match },
      { $group: { _id: '$address.zip', count: { $sum: 1 } } }
    ]);
    res.json(data);
  })
);

module.exports = router;
