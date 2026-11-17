// Initializes the database with the minimum data needed to use and grade the app.
//
//   npm run db:init              create anything that is missing (safe to run again)
//   npm run db:init -- --reset   first delete all data belonging to the two seeded orgs
//
// Every record is looked up by a stable key (org + name, or username) and only created
// when it is missing, so running the script twice never creates duplicates. Records are
// created with Model.create() so the Mongoose schema validation runs on them.
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { clients, orgs, events, users, services } = require('../models/models');

// Fixed ID for the second organization, used to demonstrate org isolation.
// It must be fixed (not random) or every run would create another org.
const SECONDARY_ORG_ID = '64e0380b3cc28d087655694c';

const DAY_MS = 24 * 60 * 60 * 1000;

const SERVICE_NAMES = [
  'Food Bank', 'Legal Aid', 'Housing Support', 'Job Training', 'English Classes',
  'Youth Mentorship', 'Senior Care', 'Mental Health Counseling', 'Tax Prep', 'Childcare',
  'Financial Literacy', 'Healthcare Screening', 'Emergency Shelter', 'Addiction Support', 'Computer Literacy'
];

const FIRST_NAMES = [
  'Maria', 'James', 'Linh', 'Carlos', 'Aisha', 'David', 'Sofia', 'Michael',
  'Grace', 'Luis', 'Hannah', 'Omar', 'Emily', 'Daniel', 'Priya', 'Andre'
];
const LAST_NAMES = [
  'Garcia', 'Johnson', 'Nguyen', 'Martinez', 'Khan', 'Smith', 'Lopez', 'Brown',
  'Kim', 'Hernandez', 'Davis', 'Ali', 'Wilson', 'Thomas', 'Patel', 'Jackson'
];
const ZIP_CODES = ['77001', '77002', '77003', '77004', '77005', '77006', '77007', '77008'];

// check that every required setting is present before touching the database
function readConfig() {
  const config = {
    mongoUrl: process.env.MONGO_URL,
    orgId: process.env.ORG_ID,
    jwtSecret: process.env.JWT_SECRET,
    viewerUser: process.env.SEED_VIEWER_USERNAME,
    viewerPass: process.env.SEED_VIEWER_PASSWORD,
    editorUser: process.env.SEED_EDITOR_USERNAME,
    editorPass: process.env.SEED_EDITOR_PASSWORD
  };

  const problems = [];
  if (!config.mongoUrl) problems.push('MONGO_URL is missing.');
  if (!config.orgId || !mongoose.Types.ObjectId.isValid(config.orgId)) {
    problems.push('ORG_ID is missing or not a valid ObjectId.');
  } else if (config.orgId === SECONDARY_ORG_ID) {
    problems.push(`ORG_ID must not be ${SECONDARY_ORG_ID}; that ID is reserved for the secondary seed org.`);
  }
  if (!config.jwtSecret) problems.push('JWT_SECRET is missing.');
  if (!config.viewerUser || !config.viewerPass) problems.push('SEED_VIEWER_USERNAME / SEED_VIEWER_PASSWORD are missing.');
  if (!config.editorUser || !config.editorPass) problems.push('SEED_EDITOR_USERNAME / SEED_EDITOR_PASSWORD are missing.');

  if (problems.length) {
    console.error('Configuration error (check backend/.env):');
    problems.forEach((p) => console.error(`  - ${p}`));
    process.exit(1);
  }
  return config;
}

// create the document if no document matches the filter; returns [doc, created]
async function findOrCreate(Model, filter, data) {
  const existing = await Model.findOne(filter);
  if (existing) return [existing, false];
  return [await Model.create({ ...filter, ...data }), true];
}

async function initDb() {
  const config = readConfig();
  const isReset = process.argv.includes('--reset');

  mongoose.set('strictQuery', false);
  await mongoose.connect(config.mongoUrl);
  console.log(`Connected to database "${mongoose.connection.name}".`);

  const primaryOrgId = new mongoose.Types.ObjectId(config.orgId);
  const secondaryOrgId = new mongoose.Types.ObjectId(SECONDARY_ORG_ID);
  const seededOrgs = [primaryOrgId, secondaryOrgId];

  if (isReset) {
    console.warn('--reset: deleting all clients, events, services, users, and orgs for the two seeded orgs...');
    await clients.deleteMany({ orgs: { $in: seededOrgs } });
    await events.deleteMany({ org: { $in: seededOrgs } });
    await services.deleteMany({ org: { $in: seededOrgs } });
    await users.deleteMany({ org: { $in: seededOrgs } });
    await orgs.deleteMany({ _id: { $in: seededOrgs } });
  }

  const created = { orgs: 0, users: 0, services: 0, clients: 0, events: 0 };
  const existing = { orgs: 0, users: 0, services: 0, clients: 0, events: 0 };
  const count = (kind, wasCreated) => (wasCreated ? created : existing)[kind]++;
  let passwordsUpdated = 0;

  // indexes first, so the unique indexes protect the inserts below
  await Promise.all([users, clients, services, events].map((Model) => Model.createIndexes()));

  // organizations
  for (const [_id, name] of [[primaryOrgId, 'Community Health Center'], [secondaryOrgId, 'Outreach Partner Org']]) {
    const [, wasCreated] = await findOrCreate(orgs, { _id }, { name });
    count('orgs', wasCreated);
  }

  // users - passwords are always stored as bcrypt hashes
  const userSeeds = [
    { username: config.viewerUser, password: config.viewerPass, role: 'viewer', org: primaryOrgId },
    { username: config.editorUser, password: config.editorPass, role: 'editor', org: primaryOrgId },
    // a user in the second org, for org isolation tests
    { username: 'partner', password: config.viewerPass, role: 'viewer', org: secondaryOrgId }
  ];
  for (const seed of userSeeds) {
    const filter = { username: seed.username.toLowerCase(), org: seed.org };
    const hash = await bcrypt.hash(seed.password, 10);
    const [user, wasCreated] = await findOrCreate(users, filter, {
      _id: new mongoose.Types.ObjectId(),
      password: hash,
      role: seed.role
    });
    count('users', wasCreated);
    // keep existing demo accounts in sync with .env so the documented logins always work
    if (!wasCreated && (user.role !== seed.role || !(await bcrypt.compare(seed.password, user.password)))) {
      user.password = hash;
      user.role = seed.role;
      await user.save();
      passwordsUpdated++;
    }
  }

  // services
  const serviceIds = [];
  for (const name of SERVICE_NAMES) {
    const [service, wasCreated] = await findOrCreate(services, { org: primaryOrgId, name }, {
      description: `${name} offered by the Community Health Center.`,
      status: 'Active'
    });
    serviceIds.push(service._id);
    count('services', wasCreated);
  }
  const [partnerService, partnerServiceCreated] = await findOrCreate(services, { org: secondaryOrgId, name: 'Basic Outreach' }, {
    description: 'Outreach service of the partner org.',
    status: 'Active'
  });
  count('services', partnerServiceCreated);

  // clients
  const clientIds = [];
  for (let i = 0; i < FIRST_NAMES.length; i++) {
    const [client, wasCreated] = await findOrCreate(clients, {
      orgs: primaryOrgId,
      firstName: FIRST_NAMES[i],
      lastName: LAST_NAMES[i]
    }, {
      email: `${FIRST_NAMES[i]}.${LAST_NAMES[i]}@example.com`.toLowerCase(),
      phoneNumber: { primary: `71355501${String(i + 1).padStart(2, '0')}` },
      address: {
        line1: `${100 + i * 10} Main St`,
        city: 'Houston',
        county: 'Harris',
        zip: ZIP_CODES[i % ZIP_CODES.length]
      }
    });
    clientIds.push(client._id);
    count('clients', wasCreated);
  }
  const [partnerClient, partnerClientCreated] = await findOrCreate(clients, {
    orgs: secondaryOrgId,
    firstName: 'Other',
    lastName: 'Client'
  }, {
    email: 'other.client@example.com',
    phoneNumber: { primary: '7135559999' },
    address: { city: 'Pasadena', zip: '77502' }
  });
  count('clients', partnerClientCreated);

  // events - spread from 50 days ago to 25 days ahead, so the dashboard (last two months)
  // shows attendance and the event form has upcoming events. Dates are set only when an
  // event is first created; reruns leave existing events unchanged.
  const now = Date.now();
  for (let i = 0; i < 16; i++) {
    const name = `Community Workshop ${i + 1}`;
    // the first 8 events (all in the past) each have 1-3 registered clients
    const attendees = i < 8 ? clientIds.slice(i, i + 1 + (i % 3)) : [];
    const [, wasCreated] = await findOrCreate(events, { org: primaryOrgId, name }, {
      date: new Date(now + (i * 5 - 50) * DAY_MS),
      description: `Monthly community workshop #${i + 1}.`,
      services: [serviceIds[i % serviceIds.length]],
      address: { line1: '500 Community Way', city: 'Houston', county: 'Harris', zip: ZIP_CODES[i % ZIP_CODES.length] },
      attendees
    });
    count('events', wasCreated);
  }
  const [, partnerEventCreated] = await findOrCreate(events, { org: secondaryOrgId, name: 'Partner Meetup' }, {
    date: new Date(now - 7 * DAY_MS),
    services: [partnerService._id],
    address: { city: 'Pasadena', zip: '77502' },
    attendees: [partnerClient._id]
  });
  count('events', partnerEventCreated);

  console.log('\n--- Database initialization summary ---');
  for (const kind of Object.keys(created)) {
    console.log(`${kind.padEnd(9)} created: ${String(created[kind]).padStart(2)}   already present: ${existing[kind]}`);
  }
  if (passwordsUpdated) console.log(`Demo account passwords/roles re-synced with .env: ${passwordsUpdated}`);
  console.log('\nDemo logins:');
  console.log(`  viewer: ${config.viewerUser} / ${config.viewerPass}`);
  console.log(`  editor: ${config.editorUser} / ${config.editorPass}`);
  console.log(`Primary org (ORG_ID): ${primaryOrgId}`);
  console.log(`Secondary org (isolation tests): ${secondaryOrgId}`);
}

initDb()
  .then(() => mongoose.disconnect())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('Database initialization failed:', err.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
