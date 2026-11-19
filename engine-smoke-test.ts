import { renderA2UISurface, getActiveSurface, getActiveSurfaceMeta } from './src/lib/a2ui-engine';

// --- Test 1: valid declarative tree renders and produces a surface ---
const valid = renderA2UISurface({
  title: 'Smoke Test Surface',
  components: [
    { id: 'root', component: 'Column', children: ['card', 'btn'] },
    { id: 'card', component: 'Card', child: 'title' },
    { id: 'title', component: 'Text', text: { path: '/title' } },
    { id: 'btn', component: 'Button', child: 'btnLabel', action: { event: { name: 'show_canvas_surface', context: { surface: 'kanban' } } } },
    { id: 'btnLabel', component: 'Text', text: 'Back to board' },
  ],
  data: { title: '# It Works' },
});

console.log('Test 1 (valid tree):', valid.ok ? 'PASS' : 'FAIL', JSON.stringify(valid.ok ? { componentCount: valid.componentCount } : { errors: valid.errors }));
const surface = getActiveSurface();
console.log('  active surface present:', !!surface, '| meta title:', getActiveSurfaceMeta()?.title);

// --- Test 2: invalid component type is rejected ---
const invalidType = renderA2UISurface({
  title: 'Bad Type',
  components: [
    { id: 'root', component: 'Column', children: ['x'] },
    { id: 'x', component: 'Hologram', text: 'not a real component' },
  ],
});
console.log('Test 2 (unknown component type):', !invalidType.ok ? 'PASS' : 'FAIL', invalidType.ok ? '(unexpectedly accepted)' : `rejected: ${invalidType.errors[0]?.slice(0, 80)}`);

// --- Test 3: missing id is rejected ---
const invalidId = renderA2UISurface({
  title: 'Bad Id',
  components: [{ component: 'Text', text: 'no id' }],
});
console.log('Test 3 (missing node id):', !invalidId.ok ? 'PASS' : 'FAIL', invalidId.ok ? '(unexpectedly accepted)' : `rejected: ${invalidId.errors[0]?.slice(0, 80)}`);

// --- Test 4: empty components rejected ---
const empty = renderA2UISurface({ title: 'Empty', components: [] });
console.log('Test 4 (empty components):', !empty.ok ? 'PASS' : 'FAIL');

// --- Test 5: after rejection, previous valid surface is still active ---
console.log('Test 5 (surface survives rejection):', getActiveSurfaceMeta()?.title === 'Smoke Test Surface' ? 'PASS' : 'FAIL');

// --- Test 6: dangling child reference is rejected ---
const dangling = renderA2UISurface({
  title: 'Dangling',
  components: [
    { id: 'root', component: 'Column', children: ['missing'] },
  ],
});
console.log('Test 6 (dangling child ref):', !dangling.ok ? 'PASS' : 'FAIL', dangling.ok ? '(unexpectedly accepted)' : `rejected: ${dangling.errors[0]?.slice(0, 80)}`);

// --- Test 7: prop schema violation is rejected (Button requires child + action) ---
const badProps = renderA2UISurface({
  title: 'Bad Props',
  components: [
    { id: 'root', component: 'Column', children: ['btn'] },
    { id: 'btn', component: 'Button', text: 'no child or action' },
  ],
});
console.log('Test 7 (Button missing child/action):', !badProps.ok ? 'PASS' : 'FAIL', badProps.ok ? '(unexpectedly accepted)' : `rejected: ${badProps.errors[0]?.slice(0, 80)}`);

// --- Test 8: previous surface still intact after all rejections ---
console.log('Test 8 (surface still intact after rejections):', getActiveSurfaceMeta()?.title === 'Smoke Test Surface' ? 'PASS' : 'FAIL');
