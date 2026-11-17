// This file contains API endpoints for interacting with the "services" collection.
const express = require('express');
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

const { services, events } = require('../models/models');

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await services.find(withOrg({}, req)).sort({ updatedAt: -1 }));
  })
);

router.get(
  '/id/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    assertObjectId(req.params.id, 'Service');
    const service = await services.findOne(
      withOrg({ _id: req.params.id }, req)
    );
    if (!service) throw new HttpError(404, 'Service not found');
    res.json(service);
  })
);

router.get(
  '/search',
  requireAuth,
  asyncHandler(async (req, res) => {
    const filter = {};
    switch (req.query.searchBy) {
      case 'name':
        filter.name = new RegExp(escapeRegex(req.query.name || ''), 'i');
        break;
      case 'description':
        filter.description = new RegExp(
          escapeRegex(req.query.description || ''),
          'i'
        );
        break;
      default:
        throw new HttpError(400, 'invalid searchBy');
    }
    res.json(await services.find(withOrg(filter, req)));
  })
);

router.post(
  '/',
  requireAuth,
  requireRole('editor'),
  asyncHandler(async (req, res) => {
    const newService = cleanBody(req.body, ['org']);
    await services.create(withOrg(newService, req));
    res.status(201).send('New service created successfully');
  })
);

router.put(
  '/update/:id',
  requireAuth,
  requireRole('editor'),
  asyncHandler(async (req, res) => {
    assertObjectId(req.params.id, 'Service');
    const changes = cleanBody(req.body, ['org']);
    const updated = await services.findOneAndUpdate(
      withOrg({ _id: req.params.id }, req),
      changes,
      { new: true, runValidators: true }
    );
    if (!updated) throw new HttpError(404, 'Service not found');
    res.status(200).send('Service updated successfully');
  })
);

router.delete(
  '/:id',
  requireAuth,
  requireRole('editor'),
  asyncHandler(async (req, res) => {
    assertObjectId(req.params.id, 'Service');
    const filter = withOrg({ _id: req.params.id }, req);
    const service = await services.findOne(filter);
    if (!service) throw new HttpError(404, 'Service not found');

    const inUse = await events.exists(withOrg({ services: service._id }, req));
    if (inUse) {
      throw new HttpError(
        409,
        'Service can not be deleted since it is being used by events.'
      );
    }

    await services.deleteOne(filter);
    res.status(200).send('Service deleted successfully');
  })
);

module.exports = router;
