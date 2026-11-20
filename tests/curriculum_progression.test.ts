import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getNextPendingNode, getNextSequentialNode } from '../src/utils/curriculumProgression';
import { SkillModule, SkillNode } from '../src/types';

function createMockNode(id: string, title: string, moduleId: string): SkillNode {
  return {
    id,
    title,
    subtitle: `Subtitle for ${title}`,
    moduleId,
    status: 'available',
    domain: 'Cryptography',
    xpReward: 30,
    eloReward: 15,
    questions: [],
  };
}

function createMockModule(id: string, title: string, nodeIds: string[]): SkillModule {
  return {
    id,
    title,
    certificationFocus: 'Security+',
    color: '#10b981',
    nodes: nodeIds.map((nid, idx) => createMockNode(nid, `${title} - Lesson ${idx + 1}`, id)),
  };
}

describe('Curriculum Progression Pure Logic Suite', () => {
  const mockCurriculum: SkillModule[] = [
    createMockModule('mod_1', 'Modulo 1: Fondamenti', ['node_1_1', 'node_1_2', 'node_1_3']),
    createMockModule('mod_2', 'Modulo 2: Crittografia', ['node_2_1', 'node_2_2']),
    createMockModule('mod_3', 'Modulo 3: Network Security', ['node_3_1']),
  ];

  describe('getNextPendingNode', () => {
    it('returns first node of first module when completedNodeIds is empty', () => {
      const result = getNextPendingNode(mockCurriculum, []);
      assert.ok(result);
      assert.equal(result.node.id, 'node_1_1');
      assert.equal(result.module.id, 'mod_1');
      assert.equal(result.moduleTitle, 'Modulo 1: Fondamenti');
      assert.equal(result.nodeTitle, 'Modulo 1: Fondamenti - Lesson 1');
    });

    it('returns first node when completedNodeIds is null or undefined', () => {
      const resultNull = getNextPendingNode(mockCurriculum, null);
      assert.equal(resultNull?.node.id, 'node_1_1');

      const resultUndef = getNextPendingNode(mockCurriculum, undefined);
      assert.equal(resultUndef?.node.id, 'node_1_1');
    });

    it('returns second node when first node is completed', () => {
      const result = getNextPendingNode(mockCurriculum, ['node_1_1']);
      assert.ok(result);
      assert.equal(result.node.id, 'node_1_2');
      assert.equal(result.module.id, 'mod_1');
    });

    it('jumps to next module when all nodes in current module are completed', () => {
      const result = getNextPendingNode(mockCurriculum, ['node_1_1', 'node_1_2', 'node_1_3']);
      assert.ok(result);
      assert.equal(result.node.id, 'node_2_1');
      assert.equal(result.module.id, 'mod_2');
      assert.equal(result.moduleTitle, 'Modulo 2: Crittografia');
    });

    it('handles non-contiguous completed nodes in curriculum order', () => {
      // User did 1_1 and 1_3, but skipped 1_2
      const result = getNextPendingNode(mockCurriculum, ['node_1_1', 'node_1_3']);
      assert.ok(result);
      assert.equal(result.node.id, 'node_1_2');
    });

    it('accepts Set of string for completedNodeIds', () => {
      const completedSet = new Set(['node_1_1', 'node_1_2']);
      const result = getNextPendingNode(mockCurriculum, completedSet);
      assert.ok(result);
      assert.equal(result.node.id, 'node_1_3');
    });

    it('returns null when all curriculum nodes are completed', () => {
      const allIds = [
        'node_1_1', 'node_1_2', 'node_1_3',
        'node_2_1', 'node_2_2',
        'node_3_1',
      ];
      const result = getNextPendingNode(mockCurriculum, allIds);
      assert.equal(result, null);
    });

    it('skips empty modules safely', () => {
      const curriculumWithEmpty: SkillModule[] = [
        { id: 'empty_mod', title: 'Empty', certificationFocus: '', color: '', nodes: [] },
        createMockModule('mod_real', 'Modulo Reale', ['node_real_1']),
      ];
      const result = getNextPendingNode(curriculumWithEmpty, []);
      assert.ok(result);
      assert.equal(result.node.id, 'node_real_1');
      assert.equal(result.module.id, 'mod_real');
    });

    it('returns null for empty curriculum', () => {
      assert.equal(getNextPendingNode([], []), null);
      assert.equal(getNextPendingNode(null, []), null);
    });
  });

  describe('getNextSequentialNode', () => {
    it('returns next node in same module with isNextModule: false', () => {
      const result = getNextSequentialNode(mockCurriculum, 'node_1_1');
      assert.ok(result.node);
      assert.equal(result.node.id, 'node_1_2');
      assert.equal(result.module?.id, 'mod_1');
      assert.equal(result.isNextModule, false);
      assert.equal(result.isCurriculumComplete, false);
    });

    it('returns first node of next module with isNextModule: true at end of module', () => {
      const result = getNextSequentialNode(mockCurriculum, 'node_1_3');
      assert.ok(result.node);
      assert.equal(result.node.id, 'node_2_1');
      assert.equal(result.module?.id, 'mod_2');
      assert.equal(result.isNextModule, true);
      assert.equal(result.isCurriculumComplete, false);
    });

    it('returns isCurriculumComplete: true on last node of last module', () => {
      const result = getNextSequentialNode(mockCurriculum, 'node_3_1');
      assert.equal(result.node, null);
      assert.equal(result.module, null);
      assert.equal(result.isCurriculumComplete, true);
    });

    it('handles unknown node id safely', () => {
      const result = getNextSequentialNode(mockCurriculum, 'non_existent_node');
      assert.equal(result.node, null);
      assert.equal(result.isCurriculumComplete, true);
    });

    it('handles empty curriculum safely', () => {
      const result = getNextSequentialNode([], 'node_1_1');
      assert.equal(result.node, null);
      assert.equal(result.isCurriculumComplete, true);
    });
  });
});
