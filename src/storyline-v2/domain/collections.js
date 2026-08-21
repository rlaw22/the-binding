'use strict';

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : Object.values(value);
}

function idSet(values) {
  return new Set(asArray(values).map(String));
}

function issue(path, message) {
  return { path, message };
}

module.exports = { clone, asArray, idSet, issue };
