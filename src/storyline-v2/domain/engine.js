'use strict';

// Compatibility barrel retained during the strangler extraction. New code
// should import the owning domain module directly.
module.exports = {
  ...require('./manifest-compiler'),
  ...require('./state-model'),
  ...require('./action-catalog'),
  ...require('./resolver'),
  ...require('./text-intent')
};
