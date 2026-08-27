'use strict';

// Stable public domain entry point. The implementation is split into the
// engine module first; smaller domain modules can be extracted without
// changing callers or the transport contract.
module.exports = {
  ...require('./engine'),
  ...require('./character-state'),
  ...require('./difficulty'),
  ...require('./transfer'),
  ...require('./session-lifecycle'),
  ...require('./check-resolution'),
  ...require('./content-quality-gate')
};
