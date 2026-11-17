// This file contains API endpoints for interacting with the "events" collection in the MongoDB database
//
// Every route follows the same pattern:
//   requireAuth            -> must be logged in (reads)
//   requireRole('editor')  -> must be an editor (create, update, delete, register, deregister)
//   withOrg(filter, req)   -> every query is scoped to the user's organization
//
// Registrations are stored in each event's `attendees` array (client ids).
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

// importing data model schemas
const { events, clients, services } = require('../models/models');

// fields a request body can never set directly: the org comes from the JWT,
// attendees only change through /register and /deregister
const PROTECTED_FIELDS = ['org', 'attendees'];

// Reject service ids that don't belong to the user's organization.
async function assertServicesInOrg(serviceIds, req) {
  if (serviceIds === undefined) return;
  if (!Array.isArray(serviceIds)) {
    throw new HttpError(400, 'services must be an array of service ids');
  }
  const unique = [...new Set(serviceIds.map(String))];
  unique.forEach((id) => assertObjectId(id, 'Service'));
  const found = await services.countDocuments(
    withOrg({ _id: { $in: unique } }, req)
  );
  if (found !== unique.length) throw new HttpError(404, 'Service not found');
}

// Load the event and client named in ?event=&client=, both scoped to the user's organization.
// Either one missing (or in another organization) is a 404.
async function findEventAndClient(req) {
  const { event: eventId, client: clientId } = req.query;
  assertObjectId(eventId, 'Event');
  assertObjectId(clientId, 'Client');

  const [event, client] = await Promise.all([
    events.findOne(withOrg({ _id: eventId }, req)),
    clients.findOne(withOrg({ _id: clientId }, req, 'orgs'))
  ]);
  if (!event) throw new HttpError(404, 'Event not found');
  if (!client) throw new HttpError(404, 'Client not found');
  return { event, client };
}

// API endpoint to get all events for org
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    // sort by date descending
    res.json(await events.find(withOrg({}, req)).sort({ date: -1 }));
  })
);

// API endpoint to GET single event by ID
router.get(
  '/id/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    assertObjectId(req.params.id, 'Event');
    const event = await events.findOne(withOrg({ _id: req.params.id }, req));
    if (!event) throw new HttpError(404, 'Event not found');
    res.json(event);
  })
);

// API endpoint to GET events based on search query
// Ex: '...?name=Food&searchBy=name' or '...?eventDate=2026-11-16&searchBy=date'
router.get(
  '/search',
  requireAuth,
  asyncHandler(async (req, res) => {
    const filter = {};
    switch (req.query.searchBy) {
      case 'name':
        filter.name = new RegExp(escapeRegex(req.query.name || ''), 'i');
        break;
      case 'date': {
        // match the whole calendar day (dates are stored as UTC midnight)
        const start = new Date(req.query.eventDate);
        if (isNaN(start)) throw new HttpError(400, 'invalid eventDate');
        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        filter.date = { $gte: start, $lt: end };
        break;
      }
      default:
        throw new HttpError(400, 'invalid searchBy');
    }
    res.json(await events.find(withOrg(filter, req)));
  })
);

// API endpoint to GET events for which a client is signed up
router.get(
  '/client/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    assertObjectId(req.params.id, 'Client');
    res.json(await events.find(withOrg({ attendees: req.params.id }, req)));
  })
);

// API endpoint to GET events for which a client is not signed up
router.get(
  '/client/:id/not-registered',
  requireAuth,
  asyncHandler(async (req, res) => {
    assertObjectId(req.params.id, 'Client');
    res.json(
      await events.find(withOrg({ attendees: { $nin: [req.params.id] } }, req))
    );
  })
);

// API endpoint to GET attendee details for an event
router.get(
  '/attendees/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    assertObjectId(req.params.id, 'Event');
    const event = await events.findOne(withOrg({ _id: req.params.id }, req));
    if (!event) throw new HttpError(404, 'Event not found');
    res.json(
      await clients.find(withOrg({ _id: { $in: event.attendees } }, req, 'orgs'))
    );
  })
);

// API endpoint to GET all events for a given service
router.get(
  '/service/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    assertObjectId(req.params.id, 'Service');
    const eventsWithService = await events
      .find(withOrg({ services: req.params.id }, req))
      .select({ _id: 1, name: 1, date: 1, address: { line1: 1 } })
      .lean();
    res.json(eventsWithService);
  })
);

// GET event attendance for the past two months for dashboard
router.get(
  '/attendance',
  requireAuth,
  asyncHandler(async (req, res) => {
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    res.json(
      await events
        .find(withOrg({ date: { $gte: twoMonthsAgo } }, req))
        .sort({ date: 1 })
    );
  })
);

// API endpoint to POST new event
router.post(
  '/',
  requireAuth,
  requireRole('editor'),
  asyncHandler(async (req, res) => {
    const newEvent = cleanBody(req.body, PROTECTED_FIELDS);
    await assertServicesInOrg(newEvent.services, req);
    await events.create(withOrg(newEvent, req));
    res.status(201).send('New event created successfully');
  })
);

// API endpoint to PUT -> update event
router.put(
  '/update/:id',
  requireAuth,
  requireRole('editor'),
  asyncHandler(async (req, res) => {
    assertObjectId(req.params.id, 'Event');
    const changes = cleanBody(req.body, PROTECTED_FIELDS);
    await assertServicesInOrg(changes.services, req);
    const updated = await events.findOneAndUpdate(
      withOrg({ _id: req.params.id }, req),
      changes,
      { new: true, runValidators: true }
    );
    if (!updated) throw new HttpError(404, 'Event not found');
    res.status(200).send('Event updated successfully');
  })
);

// API endpoint to PUT -> add attendee to event (?event=<id>&client=<id>)
// Registering twice never creates a duplicate: the second call returns { message: 'Already registered' }.
router.put(
  '/register',
  requireAuth,
  requireRole('editor'),
  asyncHandler(async (req, res) => {
    const { event, client } = await findEventAndClient(req);

    // only matches if the client isn't already an attendee, so concurrent requests can't add it twice
    const result = await events.updateOne(
      withOrg({ _id: event._id, attendees: { $ne: client._id } }, req),
      { $push: { attendees: client._id } }
    );
    if (result.modifiedCount === 0) {
      return res.status(200).json({ message: 'Already registered' });
    }
    res.status(201).json({
      message: 'Client registered for event',
      eventId: event._id,
      clientId: client._id
    });
  })
);

// API endpoint to PUT -> remove attendee from event (?event=<id>&client=<id>)
// Deregistering a client who isn't registered returns { message: 'Not registered' } instead of an error.
router.put(
  '/deregister',
  requireAuth,
  requireRole('editor'),
  asyncHandler(async (req, res) => {
    const { event, client } = await findEventAndClient(req);

    const result = await events.updateOne(
      withOrg({ _id: event._id, attendees: client._id }, req),
      { $pull: { attendees: client._id } }
    );
    if (result.modifiedCount === 0) {
      return res.status(200).json({ message: 'Not registered' });
    }
    res.status(200).json({
      message: 'Client deregistered from event',
      eventId: event._id,
      clientId: client._id
    });
  })
);

// API endpoint to hard DELETE event by ID (only when no clients are signed up)
router.delete(
  '/:id',
  requireAuth,
  requireRole('editor'),
  asyncHandler(async (req, res) => {
    assertObjectId(req.params.id, 'Event');
    const filter = withOrg({ _id: req.params.id }, req);

    const event = await events.findOne(filter);
    if (!event) throw new HttpError(404, 'Event not found');
    if (event.attendees.length > 0) {
      throw new HttpError(409, "Event has attendees and can't be deleted.");
    }

    await events.deleteOne(filter);
    res.status(200).send('Event deleted successfully');
  })
);

module.exports = router;
