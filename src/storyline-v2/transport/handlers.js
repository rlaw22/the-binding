'use strict';

/**
 * Storyline v2 transport handlers.
 *
 * These handlers translate HTTP-shaped input into application calls and map
 * domain/application outcomes to HTTP-shaped responses. They do not own
 * story state, persistence, or browser behavior.
 */
function createStorylineV2Handlers({ service, enabled = true }) {
  function disabled(reply) {
    return reply.status(404).send({ error: 'Storyline v2 is disabled' });
  }

  function error(reply, status, exception) {
    return reply.status(status).send({ error: exception.message });
  }

  function actionStatus(result) {
    if (!result || !result.rejected) return 200;
    return result.error === 'STALE_CATALOG' ? 409 : 422;
  }

  return {
    status: async () => ({
      enabled,
      adventures: enabled ? Array.from(service.adventures.keys()) : []
    }),

    start: async (request, reply) => {
      if (!enabled) return disabled(reply);
      try {
        const body = request.body || {};
        return service.start({
          adventureId: body.adventureId || 'dracula',
          sessionId: body.sessionId,
          characterId: body.characterId,
          classId: body.classId,
          options: body.options || {}
        });
      } catch (exception) {
        return error(reply, 400, exception);
      }
    },

    snapshot: async (request, reply) => {
      if (!enabled) return disabled(reply);
      try {
        return service.snapshot(request.params.id);
      } catch (exception) {
        return error(reply, 404, exception);
      }
    },

    transition: async (request, reply) => {
      if (!enabled) return disabled(reply);
      try {
        const body = request.body || {};
        if (!body.to) return error(reply, 400, new Error('Lifecycle target is required'));
        return service.transition({ sessionId: request.params.id, to: body.to });
      } catch (exception) {
        const status = /Unknown Storyline session/.test(exception.message) ? 404 : 409;
        return error(reply, status, exception);
      }
    },

    bookmark: async (request, reply) => {
      if (!enabled) return disabled(reply);
      try {
        const body = request.body || {};
        if (body.operation === 'remove') {
          return service.removeBookmark({ sessionId: request.params.id, bookmarkId: body.bookmarkId });
        }
        return service.addBookmark({ sessionId: request.params.id, bookmarkId: body.bookmarkId, label: body.label });
      } catch (exception) {
        return error(reply, 400, exception);
      }
    },

    journal: async (request, reply) => {
      if (!enabled) return disabled(reply);
      try {
        return service.appendJournal({ sessionId: request.params.id, entry: request.body || {} });
      } catch (exception) {
        return error(reply, 400, exception);
      }
    },

    submit: async (request, reply) => {
      if (!enabled) return disabled(reply);
      try {
        const body = request.body || {};
        if (body.text != null) {
          const result = service.submitText({
            sessionId: request.params.id,
            text: body.text,
            turnId: body.turnId
          });
          return result.result && result.result.rejected
            ? reply.status(actionStatus(result.result)).send(result)
            : result;
        }

        const result = service.submit({
          sessionId: request.params.id,
          actionId: body.actionId,
          catalogVersion: body.catalogVersion,
          turnId: body.turnId
        });
        return result.rejected
          ? reply.status(actionStatus(result)).send(result)
          : result;
      } catch (exception) {
        return error(reply, 400, exception);
      }
    }
  };
}

module.exports = { createStorylineV2Handlers };
