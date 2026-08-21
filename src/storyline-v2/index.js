'use strict';

// Public V2 package boundary. Domain, application, transport, and
// presentation adapters remain separately importable while this aggregate
// keeps transitional callers stable.
module.exports = {
  ...require('./domain'),
  ...require('./application'),
  ...require('./transport'),
  ...require('./presentation')
};
