// Organization isolation helper.
//
// Every query on clients, events, and services must be scoped to the logged-in user's
// organization. The organization always comes from the verified JWT (req.user.orgId),
// never from the request body, query string, or URL.
//
//   events.find(withOrg({ name: 'Food Drive' }, req))
//   -> events.find({ name: 'Food Drive', org: '<orgId from JWT>' })
//
// `field` is the name of the organization field on the model: 'org' for events and
// services, 'orgs' for clients (an array, which MongoDB matches by element).

function withOrg(filter, req, field = 'org') {
  if (!req || !req.user || !req.user.orgId) {
    // only reachable if a route forgot requireAuth; fail closed instead of returning every org's data
    throw new Error('withOrg called on an unauthenticated request');
  }
  // the JWT value is applied last, so a caller-supplied org in `filter` can never override it
  return { ...(filter || {}), [field]: req.user.orgId };
}

module.exports = withOrg;
