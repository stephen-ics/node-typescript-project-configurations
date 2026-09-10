import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { ESLint } from 'eslint';
import lintTypeScript from 'typescript';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const eslint = new ESLint({ cwd: root });
const compiler = resolve(
  dirname(
    createRequire(import.meta.url).resolve('@typescript/native/package.json'),
  ),
  'bin/tsc',
);

async function lint(source, file = 'src/example.ts') {
  const [result] = await eslint.lintText(source, {
    filePath: resolve(root, file),
  });
  return result.messages;
}

describe('the installed ESLint configuration', () => {
  it.each([
    [
      'internal return types',
      'function helper() { return 1; } export const value = helper();',
      '@typescript-eslint/explicit-function-return-type',
    ],
    [
      'exported parameter types',
      'export function label(value): string { return String(value); }',
      '@typescript-eslint/explicit-module-boundary-types',
    ],
    [
      'explicit any',
      'export const value: any = 1;',
      '@typescript-eslint/no-explicit-any',
    ],
    [
      'unsafe assignments',
      "export const value = JSON.parse('null');",
      '@typescript-eslint/no-unsafe-assignment',
    ],
    [
      'unsafe assertions',
      'export function label(value: unknown): string { return value as string; }',
      '@typescript-eslint/no-unsafe-type-assertion',
    ],
    [
      'non-null assertions',
      'export function label(value: string | undefined): string { return value!; }',
      '@typescript-eslint/no-non-null-assertion',
    ],
    [
      'object type aliases instead of interfaces',
      'export type User = { name: string };',
      '@typescript-eslint/consistent-type-definitions',
    ],
    [
      'annotations inferred from parameter defaults',
      'export function retries(count: number = 3): number { return count; }',
      '@typescript-eslint/no-inferrable-types',
    ],
    [
      'filtering an array to read only the first match',
      'interface User { active: boolean; } export function first(users: User[]): User | undefined { return users.filter(user => user.active)[0]; }',
      '@typescript-eslint/prefer-find',
    ],
    [
      'unexplained empty functions',
      'export function report(): void {}',
      '@typescript-eslint/no-empty-function',
    ],
    [
      'unhandled promises even with void',
      'void Promise.resolve();',
      '@typescript-eslint/no-floating-promises',
    ],
    [
      'promises used as conditions',
      'export async function run(): Promise<void> { if (Promise.resolve(true)) { await Promise.resolve(); } }',
      '@typescript-eslint/no-misused-promises',
    ],
    [
      'missing union cases',
      "export function handle(state: 'ready' | 'done'): void { switch (state) { case 'ready': return; } }",
      '@typescript-eslint/switch-exhaustiveness-check',
    ],
    [
      'any in template strings',
      'declare const value: any; export const text = `value=${value}`;',
      '@typescript-eslint/restrict-template-expressions',
    ],
    [
      'unexplained TypeScript suppressions',
      '// @ts-expect-error\nexport const value: string = 1;',
      '@typescript-eslint/ban-ts-comment',
    ],
    [
      'missing braces',
      'export function check(value: boolean): number { if (value) return 1; return 0; }',
      'curly',
    ],
    [
      'repeated property names instead of shorthand',
      "const name = 'worker'; export const options = { name: name };",
      'object-shorthand',
    ],
    [
      'long-form object methods',
      "export const worker = { label: function (): string { return 'worker'; } };",
      'object-shorthand',
    ],
    [
      'else blocks after a returning branch',
      "export function label(ready: boolean): string { if (ready) { return 'ready'; } else { return 'waiting'; } }",
      'no-else-return',
    ],
    [
      'else blocks containing only an if',
      "export function report(ready: boolean, pending: boolean): void { if (ready) { console.log('ready'); } else { if (pending) { console.log('pending'); } } }",
      'no-lonely-if',
    ],
    [
      'ternaries that only reproduce a boolean condition',
      'export function positive(count: number): boolean { return count > 0 ? true : false; }',
      'no-unneeded-ternary',
    ],
    [
      'string concatenation instead of interpolation',
      "export function label(name: string): string { return 'Hello ' + name; }",
      'prefer-template',
    ],
    [
      'default parameters before required TypeScript parameters',
      "export function label(prefix = 'Hello', name: string): string { return `${prefix} ${name}`; }",
      '@typescript-eslint/default-param-last',
    ],
    [
      'type operations that erase every property',
      "export type Empty = Omit<{ name: string }, 'name'>;",
      '@typescript-eslint/no-generated-empty-object-type',
    ],
    [
      'defaults for values that cannot be undefined',
      "export function label(input: { value: string }): string { const { value = 'fallback' } = input; return value; }",
      '@typescript-eslint/no-useless-default-assignment',
    ],
  ])('rejects %s', async (_label, source, rule) => {
    const messages = await lint(source);
    expect(
      messages.some(
        (message) => message.ruleId === rule && message.severity === 2,
      ),
    ).toBe(true);
  });

  it('accepts validated unknown input, callback inference, numbers, and handled promises', async () => {
    const source = `${readFileSync(resolve(root, 'src/example.ts'), 'utf8')}
      export const labels = [1, 2].map(value => String(value));
      export function address(port: number): string { return \`http://localhost:\${port}\`; }
      export interface User { name: string; }
      export function retries(count = 3): number { return count; }
      export function report(): void { /* Intentionally unused in this fixture. */ }
      const model = 'example';
      export const options = { model, label(): string { return model; } };
      export function label(name: string, prefix = 'Hello'): string { return \`\${prefix} \${name}\`; }
      export function positive(count: number): boolean { return count > 0; }
      void Promise.resolve().catch((error: unknown) => { console.error(error); });
    `;
    expect(await lint(source)).toEqual([]);
  });

  it('keeps unsafe narrowing rejected without fixing it into a forbidden non-null assertion', async () => {
    const fixer = new ESLint({ cwd: root, fix: true });
    const [result] = await fixer.lintText(
      'export function label(value: string | undefined): string { return value as string; }',
      { filePath: resolve(root, 'src/example.ts') },
    );
    expect(result.output).toBeUndefined();
    expect(result.messages.map((message) => message.ruleId)).toEqual([
      '@typescript-eslint/no-unsafe-type-assertion',
    ]);
  });

  it('requires imports used only as types to be marked', async () => {
    const messages = await lint(
      "import { IncomingHttpHeaders } from 'node:http'; export type Headers = IncomingHttpHeaders;",
    );
    expect(
      messages.some(
        (message) =>
          message.ruleId === '@typescript-eslint/consistent-type-imports',
      ),
    ).toBe(true);
  });

  it('rejects stale disable comments', async () => {
    const messages = await lint(
      '// eslint-disable-next-line eqeqeq\nexport const value = 1;',
    );
    expect(
      messages.some(
        (message) =>
          message.severity === 2 &&
          message.message.includes('Unused eslint-disable'),
      ),
    ).toBe(true);
  });

  it('still checks JavaScript tools', async () => {
    const messages = await lint(
      'export const value = missingName;',
      'tests/probe.mjs',
    );
    expect(messages.some((message) => message.ruleId === 'no-undef')).toBe(
      true,
    );
  });

  it('requires default parameters last in JavaScript tools too', async () => {
    const source =
      "export function label(prefix = 'Hello', name) { return `${prefix} ${name}`; }";
    const messages = await lint(source, 'tests/probe.mjs');
    expect(messages.map((message) => message.ruleId)).toEqual([
      'default-param-last',
    ]);
  });

  it.each([
    [
      'unassigned variables',
      'let value; console.log(value);',
      'no-unassigned-vars',
    ],
    [
      'discarded error causes',
      "try { JSON.parse('invalid'); } catch (error) { throw new Error('failed'); }",
      'preserve-caught-error',
    ],
  ])(
    'rejects %s through the ESLint 10 preset',
    async (_label, source, rule) => {
      const messages = await lint(source, 'tests/probe.mjs');
      expect(
        messages.some(
          (message) => message.ruleId === rule && message.severity === 2,
        ),
      ).toBe(true);
    },
  );
});

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    timeout: 10_000,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.signal) {
    throw new Error(`Process terminated by ${result.signal}`);
  }
  return { status: result.status, output: result.stdout + result.stderr };
}

function runCompiler(args, cwd = root) {
  return run(process.execPath, [compiler, '--pretty', 'false', ...args], cwd);
}

function withCompilerFixture(source, check) {
  // Keep fixtures under the package so Node types resolve from its node_modules.
  // Each invocation gets fresh output; cleanup never touches application source.
  mkdirSync(resolve(root, 'tmp'), { recursive: true });
  const directory = mkdtempSync(resolve(root, 'tmp/compiler-'));
  try {
    mkdirSync(resolve(directory, 'src'));
    for (const file of [
      'tsconfig.json',
      'tsconfig.build.json',
      'package.json',
    ]) {
      copyFileSync(resolve(root, file), resolve(directory, file));
    }
    writeFileSync(resolve(directory, 'src/compiler-probe.ts'), source);
    return check(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function compile(source, args = []) {
  return withCompilerFixture(source, (directory) => {
    const result = runCompiler(['-p', 'tsconfig.json', ...args], directory);
    const outputDirectory = resolve(directory, 'dist');
    return {
      ...result,
      writes: existsSync(outputDirectory)
        ? readdirSync(outputDirectory, { recursive: true })
        : [],
    };
  });
}

describe('the installed TypeScript 7 command-line configuration', () => {
  it('routes tsc to TypeScript 7 and the lint compiler API to TypeScript 6', () => {
    const result = run('pnpm', ['exec', 'tsc', '--version']);
    expect(result.status, result.output).toBe(0);
    expect(result.output.trim()).toBe('Version 7.0.2');
    expect(runCompiler(['--version']).output.trim()).toBe('Version 7.0.2');
    expect(lintTypeScript.version).toMatch(/^6\./);
  });

  it.each([
    ['implicit any', 'export function label(value) { return value; }', 7006],
    [
      'unchecked indexing',
      'export function first(values: string[]): string { return values[0].toUpperCase(); }',
      2532,
    ],
    [
      'dot access to a key supplied only by an index signature',
      'export function read(settings: Record<string, unknown>): unknown { return settings.temperature; }',
      4111,
    ],
    [
      'an unchecked dictionary value returned as definitely present',
      "export function read(settings: Record<string, string>): string { return settings['model']; }",
      2322,
    ],
    [
      'undefined assigned to an optional property',
      'export const value: { label?: string } = { label: undefined };',
      2375,
    ],
    [
      'a missing return path',
      'export function choose(value: boolean): number | undefined { if (value) { return 1; } }',
      7030,
    ],
    [
      'an implicit override',
      'class Base { run(): void {} } export class Child extends Base { run(): void {} }',
      4114,
    ],
    [
      'switch fallthrough',
      'export function run(value: number): void { switch(value) { case 1: console.log(value); case 2: return; } }',
      7029,
    ],
    [
      'unreachable statements',
      'export function value(): number { return 1; console.log(2); }',
      7027,
    ],
    ['unused labels', 'unused: { console.log(1); } export {};', 7028],
    [
      'unresolved side-effect imports',
      "import './missing-configuration-fixture.js'; export {};",
      2882,
    ],
    [
      'runtime imports of type-only declarations',
      "import { IncomingHttpHeaders } from 'node:http'; export type Headers = IncomingHttpHeaders;",
      1484,
    ],
  ])('rejects %s', (_label, source, code) => {
    const result = compile(source, ['--noEmit']);
    expect(result.status, result.output).not.toBe(0);
    expect(result.output).toContain(`error TS${code}:`);
  });

  it('does not expose browser document globals to Node code', () => {
    const result = compile('export const title = document.title;', [
      '--noEmit',
    ]);
    expect(result.status, result.output).not.toBe(0);
    expect(result.output).toContain("Cannot find name 'document'");
  });

  it('accepts declared dot access and dictionary brackets in both the compiler and ESLint', async () => {
    const source = `interface Settings { model: string; [key: string]: unknown; }
      export function read(settings: Settings): { model: string; extra: unknown } {
        return { model: settings.model, extra: settings['temperature'] };
      }`;
    const result = compile(source, ['--noEmit']);
    expect(result.status, result.output).toBe(0);
    expect(await lint(source)).toEqual([]);
  });

  it('emits valid code but writes nothing when the program has a type error', () => {
    const valid = compile('export const value: number = 1;');
    expect(valid.status, valid.output).toBe(0);
    expect(valid.writes).toContain('compiler-probe.js');

    const invalid = compile('export const value: number = "wrong";');
    expect(invalid.status, invalid.output).not.toBe(0);
    expect(invalid.output).toContain('error TS2322:');
    expect(invalid.writes).toEqual([]);
  });

  it('compiles ES2025 syntax and APIs and executes the emitted module in Node', () => {
    withCompilerFixture(
      `const groups = Object.groupBy([1, 2, 3], value => value % 2 === 0 ? 'even' : 'odd');
       const { promise, resolve } = Promise.withResolvers<string>();
       resolve('ready');
       const escaped = new RegExp('^' + RegExp.escape('hello.world') + '$');
       const half = new Float16Array([1.5]);
       console.log(JSON.stringify({
         groups,
         state: await promise,
         tried: await Promise.try(() => 'ready'),
         half: Math.f16round(half[0] ?? 0),
         mapped: Iterator.from([1, 2]).map(value => value * 2).toArray(),
         union: [...new Set([1, 2]).union(new Set([2, 3]))],
         escapedMatch: escaped.test('hello.world'),
         escapedMismatch: escaped.test('helloXworld'),
         modifier: /(?i:a)/.test('A'),
       }));
       export {};`,
      (directory) => {
        const build = runCompiler(['-p', 'tsconfig.build.json'], directory);
        expect(build.status, build.output).toBe(0);
        const runtime = run(
          process.execPath,
          ['dist/compiler-probe.js'],
          directory,
        );
        expect(runtime.status, runtime.output).toBe(0);
        expect(JSON.parse(runtime.output)).toEqual({
          groups: { odd: [1, 3], even: [2] },
          state: 'ready',
          tried: 'ready',
          half: 1.5,
          mapped: [2, 4],
          union: [1, 2, 3],
          escapedMatch: true,
          escapedMismatch: false,
          modifier: true,
        });
      },
    );
  });

  it('typechecks source tests but excludes them from the production build', () => {
    const typecheck = runCompiler(['-p', 'tsconfig.json', '--listFilesOnly']);
    const build = runCompiler(['-p', 'tsconfig.build.json', '--listFilesOnly']);
    expect(typecheck.status, typecheck.output).toBe(0);
    expect(build.status, build.output).toBe(0);
    expect(typecheck.output).toContain(resolve(root, 'src/example.test.ts'));
    expect(build.output).not.toContain(resolve(root, 'src/example.test.ts'));
    expect(build.output).toContain(resolve(root, 'src/example.ts'));
  });
});
