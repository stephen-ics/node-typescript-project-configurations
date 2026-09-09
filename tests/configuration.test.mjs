import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ESLint } from 'eslint';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const eslint = new ESLint({ cwd: root });

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
      void Promise.resolve().catch((error: unknown) => { console.error(error); });
    `;
    expect(await lint(source)).toEqual([]);
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
});

const parsed = ts.getParsedCommandLineOfConfigFile(
  resolve(root, 'tsconfig.json'),
  {},
  {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic(diagnostic) {
      throw new Error(
        ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      );
    },
  },
);

function compile(source, options = {}) {
  const filename = resolve(root, 'src/compiler-probe.ts');
  const host = ts.createCompilerHost(parsed.options);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (file, languageVersion, onError, createNew) =>
    file === filename
      ? ts.createSourceFile(file, source, languageVersion, true)
      : getSourceFile(file, languageVersion, onError, createNew);
  const writes = [];
  host.writeFile = (file) => {
    writes.push(file);
  };
  const program = ts.createProgram(
    [filename],
    { ...parsed.options, ...options },
    host,
  );
  return { program, writes, diagnostics: ts.getPreEmitDiagnostics(program) };
}

describe('the installed TypeScript configuration', () => {
  it.each([
    ['implicit any', 'export function label(value) { return value; }', 7006],
    [
      'unchecked indexing',
      'export function first(values: string[]): string { return values[0].toUpperCase(); }',
      2532,
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
      2307,
    ],
    [
      'runtime imports of type-only declarations',
      "import { IncomingHttpHeaders } from 'node:http'; export type Headers = IncomingHttpHeaders;",
      1484,
    ],
  ])('rejects %s', (_label, source, code) => {
    expect(
      compile(source, { noEmit: true }).diagnostics.some(
        (diagnostic) => diagnostic.code === code,
      ),
    ).toBe(true);
  });

  it('does not expose browser document globals to Node code', () => {
    const { diagnostics } = compile('export const title = document.title;', {
      noEmit: true,
    });
    expect(
      diagnostics.some((diagnostic) =>
        ts
          .flattenDiagnosticMessageText(diagnostic.messageText, '\n')
          .includes("Cannot find name 'document'"),
      ),
    ).toBe(true);
  });

  it('emits valid code but writes nothing when the program has a type error', () => {
    const valid = compile('export const value: number = 1;');
    expect(valid.diagnostics).toEqual([]);
    expect(valid.program.emit().emitSkipped).toBe(false);
    expect(valid.writes.some((file) => file.endsWith('.js'))).toBe(true);

    const invalid = compile('export const value: number = "wrong";');
    expect(invalid.program.emit().emitSkipped).toBe(true);
    expect(invalid.writes).toEqual([]);
  });

  it('typechecks source tests but excludes them from the production build', () => {
    const build = ts.getParsedCommandLineOfConfigFile(
      resolve(root, 'tsconfig.build.json'),
      {},
      {
        ...ts.sys,
        onUnRecoverableConfigFileDiagnostic(diagnostic) {
          throw new Error(
            ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
          );
        },
      },
    );
    expect(
      parsed.fileNames.some((file) => file.endsWith('example.test.ts')),
    ).toBe(true);
    expect(
      build.fileNames.some((file) => file.endsWith('example.test.ts')),
    ).toBe(false);
    expect(build.fileNames.some((file) => file.endsWith('example.ts'))).toBe(
      true,
    );
  });
});
