import { SkillModule, SkillNode } from '../types';

export interface PendingNodeResult {
  node: SkillNode;
  module: SkillModule;
  moduleTitle: string;
  nodeTitle: string;
}

export interface SequentialNodeResult {
  node: SkillNode | null;
  module: SkillModule | null;
  isNextModule: boolean;
  isCurriculumComplete: boolean;
}

/**
 * Pure function that finds the first uncompleted node in curriculum order.
 * Traverses modules and nodes sequentially.
 *
 * @param curriculum Array of skill modules.
 * @param completedNodeIds Array or Set of completed node identifiers.
 * @returns The next pending node with its module context, or null if all completed.
 */
export function getNextPendingNode(
  curriculum: SkillModule[] | undefined | null,
  completedNodeIds: (string[] | Set<string> | undefined | null) = []
): PendingNodeResult | null {
  if (!curriculum || !Array.isArray(curriculum)) return null;

  const completed = completedNodeIds instanceof Set
    ? completedNodeIds
    : new Set(completedNodeIds || []);

  for (const mod of curriculum) {
    if (!mod || !Array.isArray(mod.nodes)) continue;
    for (const node of mod.nodes) {
      if (!node) continue;
      if (!completed.has(node.id)) {
        return {
          node,
          module: mod,
          moduleTitle: mod.title,
          nodeTitle: node.title,
        };
      }
    }
  }

  return null;
}

/**
 * Pure function that finds the subsequent node in curriculum sequence after currentNodeId.
 * Used for post-lesson auto-advancement.
 *
 * @param curriculum Array of skill modules.
 * @param currentNodeId The node currently being finished.
 * @returns Object describing the next node, whether it crosses into the next module, or if curriculum ends.
 */
export function getNextSequentialNode(
  curriculum: SkillModule[] | undefined | null,
  currentNodeId: string
): SequentialNodeResult {
  if (!curriculum || !Array.isArray(curriculum) || !currentNodeId) {
    return {
      node: null,
      module: null,
      isNextModule: false,
      isCurriculumComplete: true,
    };
  }

  for (let m = 0; m < curriculum.length; m++) {
    const mod = curriculum[m];
    if (!mod || !Array.isArray(mod.nodes)) continue;

    const nodeIdx = mod.nodes.findIndex(n => n?.id === currentNodeId);
    if (nodeIdx !== -1) {
      // 1. Next lesson in same module
      if (nodeIdx + 1 < mod.nodes.length) {
        return {
          node: mod.nodes[nodeIdx + 1],
          module: mod,
          isNextModule: false,
          isCurriculumComplete: false,
        };
      }

      // 2. Last lesson of module -> find next non-empty module
      for (let nextM = m + 1; nextM < curriculum.length; nextM++) {
        const nextMod = curriculum[nextM];
        if (nextMod && Array.isArray(nextMod.nodes) && nextMod.nodes.length > 0) {
          return {
            node: nextMod.nodes[0],
            module: nextMod,
            isNextModule: true,
            isCurriculumComplete: false,
          };
        }
      }

      // 3. Reached the end of the entire curriculum
      return {
        node: null,
        module: null,
        isNextModule: false,
        isCurriculumComplete: true,
      };
    }
  }

  return {
    node: null,
    module: null,
    isNextModule: false,
    isCurriculumComplete: true,
  };
}
