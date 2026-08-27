const manifest = require('/var/www/the-binding/content/ingestion/dracula-1897/full-book/manifest.json');
describe('Dracula full-book opening content gate', () => {
  test('opening is authored prose, not chapter metadata', () => {
    const scene = manifest.scenes[0];
    expect(scene.name).toBe('The Golden Krone Inn');
    expect(scene.openingNarration).toMatch(/Bistritz/i);
    expect(scene.openingNarration).not.toMatch(/^Chapter\s+\d+:/i);
  });
  test('opening actions are contextual', () => {
    expect(manifest.scenes[0].actions.map(a => a.label)).toEqual(["Study the innkeeper's warning", 'Prepare for the road to the Borgo Pass', 'Ask why the locals fear Dracula', 'Take the coach toward the Borgo Pass']);
  });
});
