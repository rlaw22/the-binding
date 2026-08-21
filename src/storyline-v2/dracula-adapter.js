'use strict';

// Migration-only compatibility entry point. New books must not depend on
// this adapter; they should compile from a native V2 manifest.
module.exports = require('./adapters/legacy-dracula-adapter');
