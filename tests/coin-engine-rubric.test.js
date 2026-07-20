/**
 * Tests for AI DM Scoring Rubric + Prompt Builder
 * Validates getScoringRubric() and buildScoringPrompt() from coin-engine
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  getScoringRubric,
  buildScoringPrompt
} = require('../src/coin-engine/index.js');

describe('getScoringRubric', () => {
  it('returns an object with all 5 scoring categories', () => {
    const rubric = getScoringRubric();
    assert.ok(rubric.creativity, 'should have creativity');
    assert.ok(rubric.investigation, 'should have investigation');
    assert.ok(rubric.roleplay, 'should have roleplay');
    assert.ok(rubric.combat, 'should have combat');
    assert.ok(rubric.exploration, 'should have exploration');
  });

  it('each category has name, description, criteria, and examples', () => {
    const rubric = getScoringRubric();
    for (const [key, cat] of Object.entries(rubric)) {
      assert.ok(cat.name, `${key} should have name`);
      assert.ok(typeof cat.description === 'string' && cat.description.length > 0,
        `${key} should have non-empty description`);
      assert.ok(Array.isArray(cat.criteria) && cat.criteria.length > 0,
        `${key} should have criteria array with at least 1 item`);
      assert.ok(cat.examples && Array.isArray(cat.examples.excellent) && cat.examples.excellent.length > 0,
        `${key} should have excellent examples`);
      assert.ok(cat.examples && Array.isArray(cat.examples.poor) && cat.examples.poor.length > 0,
        `${key} should have poor examples`);
    }
  });

  it('creativity category describes originality and unexpected solutions', () => {
    const rubric = getScoringRubric();
    const desc = rubric.creativity.description.toLowerCase();
    assert.ok(
      desc.includes('original') || desc.includes('creative') || desc.includes('unexpected'),
      'creativity description should mention originality or unexpected solutions'
    );
  });

  it('investigation category describes searching and clue-connecting', () => {
    const rubric = getScoringRubric();
    const desc = rubric.investigation.description.toLowerCase();
    assert.ok(
      desc.includes('search') || desc.includes('clue') || desc.includes('investigat') || desc.includes('question'),
      'investigation description should mention searching or clues'
    );
  });

  it('roleplay category describes character consistency', () => {
    const rubric = getScoringRubric();
    const desc = rubric.roleplay.description.toLowerCase();
    assert.ok(
      desc.includes('character') || desc.includes('role') || desc.includes('dialogue') || desc.includes('narrative'),
      'roleplay description should mention character or dialogue'
    );
  });

  it('combat category describes tactics and resource management', () => {
    const rubric = getScoringRubric();
    const desc = rubric.combat.description.toLowerCase();
    assert.ok(
      desc.includes('tactic') || desc.includes('combat') || desc.includes('resource') || desc.includes('position'),
      'combat description should mention tactics or resources'
    );
  });

  it('exploration category describes environmental interaction', () => {
    const rubric = getScoringRubric();
    const desc = rubric.exploration.description.toLowerCase();
    assert.ok(
      desc.includes('environ') || desc.includes('explor') || desc.includes('discover') || desc.includes('interact'),
      'exploration description should mention environment or discovery'
    );
  });

  it('criteria arrays have at least 3 items each', () => {
    const rubric = getScoringRubric();
    for (const [key, cat] of Object.entries(rubric)) {
      assert.ok(cat.criteria.length >= 3,
        `${key} should have at least 3 criteria, got ${cat.criteria.length}`);
    }
  });
});

describe('buildScoringPrompt', () => {
  const sampleAction = 'I search the bookshelf for hidden compartments, then examine the dust patterns on the floor.';
  const sampleContext = {
    sceneDescription: 'A dimly lit library with towering bookshelves and a cold draft.',
    questInfo: 'Find the missing journal of Dr. Van Helsing.',
    characterInfo: 'A vampire hunter with keen observational skills.'
  };
  const sampleSceneInfo = {
    sceneIndex: 2,
    totalScenes: 10,
    difficulty: 'medium',
    adventureId: 'dracula'
  };

  it('returns a non-empty string', () => {
    const prompt = buildScoringPrompt(sampleAction, sampleContext, sampleSceneInfo);
    assert.ok(typeof prompt === 'string' && prompt.length > 100,
      'prompt should be a substantial string');
  });

  it('includes the player action text in the prompt', () => {
    const prompt = buildScoringPrompt(sampleAction, sampleContext, sampleSceneInfo);
    assert.ok(prompt.includes(sampleAction),
      'prompt should contain the player action verbatim');
  });

  it('includes scene description from context', () => {
    const prompt = buildScoringPrompt(sampleAction, sampleContext, sampleSceneInfo);
    assert.ok(prompt.includes('dimly lit library'),
      'prompt should contain the scene description');
  });

  it('includes quest info from context', () => {
    const prompt = buildScoringPrompt(sampleAction, sampleContext, sampleSceneInfo);
    assert.ok(prompt.includes('Van Helsing'),
      'prompt should contain the quest info');
  });

  it('includes adventure ID and scene numbering', () => {
    const prompt = buildScoringPrompt(sampleAction, sampleContext, sampleSceneInfo);
    assert.ok(prompt.includes('dracula'), 'prompt should include adventure ID');
    assert.ok(prompt.includes('Scene: 3 of 10'), 'prompt should show 1-indexed scene number');
  });

  it('includes difficulty level', () => {
    const prompt = buildScoringPrompt(sampleAction, sampleContext, sampleSceneInfo);
    assert.ok(prompt.includes('medium'), 'prompt should include difficulty');
  });

  it('requests JSON response format with all 5 categories', () => {
    const prompt = buildScoringPrompt(sampleAction, sampleContext, sampleSceneInfo);
    assert.ok(prompt.includes('"creativity"'), 'should request creativity score');
    assert.ok(prompt.includes('"investigation"'), 'should request investigation score');
    assert.ok(prompt.includes('"roleplay"'), 'should request roleplay score');
    assert.ok(prompt.includes('"combat"'), 'should request combat score');
    assert.ok(prompt.includes('"exploration"'), 'should request exploration score');
    assert.ok(prompt.includes('"reasoning"'), 'should request reasoning field');
  });

  it('includes scoring guidelines with ranges', () => {
    const prompt = buildScoringPrompt(sampleAction, sampleContext, sampleSceneInfo);
    assert.ok(prompt.includes('0-3'), 'should mention 0-3 range for negative play');
    assert.ok(prompt.includes('4-6'), 'should mention 4-6 range for average play');
    assert.ok(prompt.includes('6-8'), 'should mention 6-8 range for good play');
    assert.ok(prompt.includes('8-10'), 'should mention 8-10 range for exceptional play');
  });

  it('includes rubric criteria from getScoringRubric', () => {
    const prompt = buildScoringPrompt(sampleAction, sampleContext, sampleSceneInfo);
    assert.ok(prompt.includes('Creativity'), 'should include Creativity heading');
    assert.ok(prompt.includes('Investigation'), 'should include Investigation heading');
    assert.ok(prompt.includes('Roleplay'), 'should include Roleplay heading');
    assert.ok(prompt.includes('Combat'), 'should include Combat heading');
    assert.ok(prompt.includes('Exploration'), 'should include Exploration heading');
  });

  it('handles missing context gracefully', () => {
    const prompt = buildScoringPrompt('I attack the goblin', {}, {});
    assert.ok(typeof prompt === 'string' && prompt.length > 100,
      'should still produce a valid prompt with empty context');
    assert.ok(prompt.includes('I attack the goblin'),
      'should include the action even with empty context');
  });

  it('handles null context gracefully', () => {
    const prompt = buildScoringPrompt('I look around', null, null);
    assert.ok(typeof prompt === 'string' && prompt.length > 100,
      'should still produce a valid prompt with null context');
  });
});
