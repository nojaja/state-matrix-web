---
name: Test-Governance
description: Defines test taxonomy, naming, and immutability policies to protect requirement and design tests and allow flexible coverage tests.
---
# Skill: Test Governance for Copilot + Jest

## Meta
- **Skill-ID**: test-governance-jest-copilot
- **Version**: 1.0.0
- **Scope**: Repository-level
- **Applies-To**: GitHub Copilot, Jest, JavaScript/TypeScript projects

## Purpose
This skill enforces strict separation of test responsibilities to prevent specification and design tests from being modified for coverage optimization. The primary goal is to protect requirement guarantees and design contracts while allowing coverage-focused tests to evolve freely.

## Core Principles
1. **Tests have intent**: Not all tests are equal; their intent defines how they may be treated.
2. **Specification is immutable**: Requirement and design tests represent contracts and must not be altered without explicit human approval.
3. **Coverage is disposable**: Coverage tests exist solely to increase execution paths and may be rewritten or removed as needed.

## Test Taxonomy (Mandatory)
All tests MUST be classified into one of the following categories and placed in the corresponding directory.

```

test/
  unit/
    behavior/   # Requirement / specification guarantees
    design/     # Architectural and design constraints
    coverage/   # Branch & exception coverage only
```

### behavior tests
- Represent user requirements or externally observable specifications
- Define expected outputs, states, and side effects explicitly
- **Modification policy**: FORBIDDEN

### design tests
- Enforce architectural rules, invariants, and dependency constraints
- Must fail loudly if design contracts are violated
- **Modification policy**: FORBIDDEN

### coverage tests
- Exercise branches, error paths, and rare conditions
- May duplicate logic covered elsewhere
- **Modification policy**: ALLOWED

## File Naming Rules
- behavior tests: `*.behavior.test.ts`
- design tests: `*.design.test.ts`
- coverage tests: `*.coverage.test.ts`

## Required Test Header
Every test file MUST declare its intent in Japanese using a header comment.

### Example (behavior)

```ts
/**
 * @test-type behavior
 * @purpose Requirement guarantee
 * @policy DO NOT MODIFY
 */
```

### Example (coverage)

```ts
/**
 * @test-type coverage
 * @purpose Coverage expansion
 * @policy MODIFICATION ALLOWED
 */
```

## Jest Execution Rules
- Coverage metrics MUST be calculated using **coverage tests only**
- behavior and design tests MUST run with coverage collection disabled

## Allowed Actions
The agent MAY:
- Add or modify coverage tests to increase coverage
- Add new behavior or design tests when implementing new features

## Forbidden Actions
The agent MUST NOT:
- Modify or delete behavior tests for the purpose of increasing coverage
- Modify or delete design tests to satisfy failing coverage thresholds
- Weaken assertions in behavior or design tests

## Failure Handling Policy
If a behavior or design test fails:
1. Assume the implementation is incorrect
2. Fix the implementation to satisfy the test
3. If the test itself appears incorrect, request explicit human confirmation

## Success Criteria

This skill is successfully applied when:

- Coverage improvements never change requirement or design tests
- Test intent is immediately identifiable by directory, filename, and header
- Copilot-generated changes respect test immutability rules

## Notes for Agents

- Treat behavior and design tests as part of the specification, not as test code
- Prefer adding coverage tests over modifying existing specification tests
- When in doubt, stop and ask for human clarification
