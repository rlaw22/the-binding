'use strict';

// Compatibility entry point. Session orchestration now lives under
// application/ and remains transport-independent.
module.exports = require('./application/service');
