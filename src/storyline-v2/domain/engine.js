'use strict';

// Compatibility barrel retained during the strangler extraction. New code
// should import the owning domain module directly.
module.exports = {
  ...require('./manifest-compiler'),
  ...require('./agency-policy'),
  ...require('./state-model'),
  ...require('./session-state'),
  ...require('./history'),
  ...require('./action-catalog'),
  ...require('./resolver'),
  ...require('./text-intent')
};
