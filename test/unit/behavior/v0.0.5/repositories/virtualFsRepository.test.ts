// @ts-nocheck
import { VirtualFsRepository } from '../../../../../src/repositories/base/virtualFsRepository';
import { jest } from '@jest/globals';

/**
 * Compatibility test:
 * - if causal relation records still use `ActionTriggerTypeID`, repository
 *   layer should map it to `ProcessTypeID` by reading the corresponding
 *   action trigger record.
 *
 * This test asserts the desired behavior (TDD); implementation should be
 * updated to make this pass.
 */

describe('VirtualFsRepository compatibility mapping (v0.0.5)', () => {
  it('maps ActionTriggerTypeID -> ProcessTypeID by reading ActionTriggerTypes file', async () => {
    // Mock VFS
    const mockVfs: any = {
      readdir: jest.fn().mockResolvedValue(['r1.yaml']),
      readFile: jest.fn(async (path: string) => {
        // causal relation file
        if (path === 'CausalRelationsTypes/r1.yaml') {
          return `ID: r1\nActionTriggerTypeID: t1\nArtifactTypeID: a1\nCrudType: Input\n`;
        }
        // action trigger file to obtain ProcessTypeID
        if (path === 'ActionTriggerTypes/t1.yaml') {
          return `ID: t1\nProcessTypeID: p-from-trigger\nName: T\n`;
        }
        throw new Error('unexpected path: ' + path);
      }),
      writeFile: jest.fn(),
      unlink: jest.fn(),
      init: jest.fn()
    };

    const repo = new VirtualFsRepository('CausalRelationsTypes', mockVfs);

    const items = await repo.getAll();
    // Desired behavior: mapping applied so returned item contains ProcessTypeID
    expect(items.length).toBe(1);
    const it = items[0] as any;
    expect(it.ID).toBe('r1');
    // Expectation for TDD: repository maps ActionTriggerTypeID -> ProcessTypeID
    expect(it.ProcessTypeID).toBe('p-from-trigger');
  });
});
