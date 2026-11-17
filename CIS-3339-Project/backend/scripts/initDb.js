require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, Client, Service, Event, Org } = require('../models/models');

async function initDb() {
  const mongoUrl = process.env.MONGO_URL;
  const orgIdStr = process.env.ORG_ID;
  const jwtSecret = process.env.JWT_SECRET;
  const viewerUser = process.env.SEED_VIEWER_USERNAME;
  const viewerPass = process.env.SEED_VIEWER_PASSWORD;
  const editorUser = process.env.SEED_EDITOR_USERNAME;
  const editorPass = process.env.SEED_EDITOR_PASSWORD;

  // 1. Config Validation
  if (!mongoUrl) {
    console.error('Error: MONGO_URL is missing in environment variables.');
    process.exit(1);
  }
  if (!orgIdStr || !mongoose.Types.ObjectId.isValid(orgIdStr)) {
    console.error('Error: ORG_ID is missing or not a valid ObjectId.');
    process.exit(1);
  }
  if (!jwtSecret) {
    console.error('Error: JWT_SECRET is missing.');
    process.exit(1);
  }
  if (!viewerUser || !viewerPass || !editorUser || !editorPass) {
    console.error('Error: SEED_VIEWER_* or SEED_EDITOR_* credentials are missing.');
    process.exit(1);
  }

  const isReset = process.argv.includes('--reset');

  try {
    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB for seeding...');

    const primaryOrgId = mongoose.Types.ObjectId(orgIdStr);
    const secondaryOrgId = new mongoose.Types.ObjectId();

    const targetOrgs = [primaryOrgId, secondaryOrgId];

    // Handle --reset flag
    if (isReset) {
      console.warn('WARNING: --reset flag detected. Deleting seeded org data...');
      await Client.deleteMany({ orgs: { $in: targetOrgs } });
      await Event.deleteMany({ org: { $in: targetOrgs } });
      await Service.deleteMany({ org: { $in: targetOrgs } });
      await User.deleteMany({ org: { $in: targetOrgs } });
      await Org.deleteMany({ _id: { $in: targetOrgs } });
      console.log('Cleanup completed.');
    }

    let stats = {
      orgsCreated: 0,
      usersCreated: 0,
      clientsCreated: 0,
      servicesCreated: 0,
      eventsCreated: 0
    };

    const orgsData = [
      { _id: primaryOrgId, name: 'Community Center' },
      { _id: secondaryOrgId, name: 'Outreach Partner Org' }
    ];

    for (const org of orgsData) {
      const res = await Org.updateOne(
        { _id: org._id },
        { $setOnInsert: { name: org.name } },
        { upsert: true }
      );
      if (res.upsertedCount > 0) stats.orgsCreated++;
    }

    const viewerHash = await bcrypt.hash(viewerPass, 10);
    const editorHash = await bcrypt.hash(editorPass, 10);

    const usersData = [
      { username: viewerUser.toLowerCase(), password: viewerHash, name: 'Viewer User', role: 'viewer', org: primaryOrgId },
      { username: editorUser.toLowerCase(), password: editorHash, name: 'Editor Admin', role: 'editor', org: primaryOrgId },
      { username: 'partner', password: viewerHash, name: 'Partner Viewer', role: 'viewer', org: secondaryOrgId }
    ];

    for (const u of usersData) {
      const res = await User.updateOne(
        { username: u.username, org: u.org },
        { $set: { password: u.password, name: u.name, role: u.role }, $setOnInsert: { username: u.username, org: u.org } },
        { upsert: true }
      );
      if (res.upsertedCount > 0) stats.usersCreated++;
    }

    const serviceNames = [
      'Food Bank', 'Legal Aid', 'Housing Support', 'Job Training', 'English Classes',
      'Youth Mentorship', 'Senior Care', 'Mental Health Counseling', 'Tax Prep', 'Childcare',
      'Financial Literacy', 'Healthcare Screening', 'Emergency Shelter', 'Addiction Support', 'Computer Literacy'
    ];

    const serviceMap = {};
    for (const orgId of targetOrgs) {
      const names = orgId.equals(primaryOrgId) ? serviceNames : ['Basic Outreach'];
      for (const name of names) {
        const doc = await Service.findOneAndUpdate(
          { name, org: orgId },
          { $setOnInsert: { description: `Standard service for ${name}` } },
          { upsert: true, new: __dirname, rawResult: true }
        );
        if (doc.lastErrorObject && !doc.lastErrorObject.updatedExisting) {
          stats.servicesCreated++;
        }
        serviceMap[`${orgId}_${name}`] = doc.value ? doc.value._id : (await Service.findOne({ name, org: orgId }))._id;
      }
    }

    const zipCodes = ['77001', '77002', '77003', '77004', '77005', '77006', '77007', '77008'];
    const clientIdsPrimary = [];
    for (let i = 1; i <= 16; i++) {
      const firstName = `Client${i}`;
      const lastName = `Test`;
      const zip = zipCodes[i % zipCodes.length];
      const doc = await Client.findOneAndUpdate(
        { firstName, lastName, orgs: primaryOrgId },
        { $setOnInsert: { email: `client${i}@example.com`, phone: `555-010${i}`, zip } },
        { upsert: true, rawResult: true }
      );
      if (doc.lastErrorObject && !doc.lastErrorObject.updatedExisting) {
        stats.clientsCreated++;
      }
      const clientDoc = await Client.findOne({ firstName, lastName, orgs: primaryOrgId });
      clientIdsPrimary.push(clientDoc._id);
    }

    await Client.findOneAndUpdate(
      { firstName: 'Other', lastName: 'Client', orgs: secondaryOrgId },
      { $setOnInsert: { email: 'other@example.com', phone: '555-9999', zip: '77500' } },
      { upsert: true }
    );
    stats.clientsCreated++;

    const now = new Date();
    const primaryServiceNames = serviceNames;

    for (let i = 1; i <= 16; i++) {
      const eventName = `Community Workshop ${i}`;
      const dayOffset = (i * 4) - 35; 
      const eventDate = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
      const sName = primaryServiceNames[i % primaryServiceNames.length];
      const sId = serviceMap[`${primaryOrgId}_${sName}`];
      const attendees = i % 2 === 0 ? [clientIdsPrimary[i % clientIdsPrimary.length]] : [];

      const doc = await Event.findOneAndUpdate(
        { name: eventName, date: eventDate, org: primaryOrgId },
        { $setOnInsert: { service: sId, attendees } },
        { upsert: true, rawResult: true }
      );
      if (doc.lastErrorObject && !doc.lastErrorObject.updatedExisting) {
        stats.eventsCreated++;
      }
    }

    const secondaryServiceId = serviceMap[`${secondaryOrgId}_Basic Outreach`];
    await Event.findOneAndUpdate(
      { name: 'Secondary Meetup', date: new Date(), org: secondaryOrgId },
      { $setOnInsert: { service: secondaryServiceId, attendees: [] } },
      { upsert: true }
    );
    stats.eventsCreated++;

    await User.ensureIndexes();
    await Client.ensureIndexes();
    await Service.ensureIndexes();
    await Event.ensureIndexes();

    console.log('\n--- Database Seeding Summary ---');
    console.log(`Orgs handled: ${orgsData.length} (New: ${stats.orgsCreated})`);
    console.log(`Users handled: ${usersData.length} (New: ${stats.usersCreated})`);
    console.log(`Services created (new): ${stats.servicesCreated}`);
    console.log(`Clients created (new): ${stats.clientsCreated}`);
    console.log(`Events created (new): ${stats.eventsCreated}`);
    console.log('\nDemo Logins:');
    console.log(`  Viewer: ${viewerUser} / ${viewerPass}`);
    console.log(`  Editor: ${editorUser} / ${editorPass}`);
    console.log(`Secondary Org ID (for isolation test): ${secondaryOrgId.toString()}`);

    process.exit(0);
  } catch (err) {
    console.error('Database seeding failed:', err);
    process.exit(1);
  }
}

initDb();