# Node + TypeScript project configurations

A selected baseline for **Node 24, TypeScript 7, ESM, pnpm, and code compiled by
`tsc`**. These files combine compiler checks, type-aware ESLint, Prettier, fast
unit tests, and a Git pre-commit hook. They do not include React rules.

Each configuration file has its own section below. The tables explain **what
each setting does, why it is included, and an example**. Examples marked as
rejected illustrate intentional errors; they are not instructions to add broken
code to an application.

## Use the configurations

Use Node **24.21.0** and pnpm **12.3.4**, then run:

```sh
node --version # v24.21.0
pnpm --version # 12.3.4
pnpm install --frozen-lockfile
pnpm check
pnpm build
```

Node 24 is the selected LTS release line. Install pnpm 12 using the
[pnpm installation instructions](https://pnpm.io/installation) before running
these commands. pnpm 12 is a native executable; an older pnpm 10 launcher's
automatic version switching may not complete its installation. The CI action
below supports installing pnpm 12 directly.

`pnpm check` runs formatting, lint, typecheck, and unit tests. Use `pnpm format`
to apply formatting, review and stage the changes, then commit.

For another repository, copy the configurations and merge the scripts and
development dependencies into its existing `package.json`. Keep the ESM/module
and folder assumptions aligned. Regenerate that project's lockfile with pnpm;
do not replace its application dependencies with this repository's package file.
The `src/example*` and `tests/configuration.test.mjs` files verify this repository;
they are not required application modules to copy.

## `tsconfig.json`

**Purpose:** define the Node runtime assumptions and the compiler's safety checks.
**Why:** reject common type mistakes while still producing the JavaScript that
Node will execute. The root configuration includes source tests in typechecking.

### Runtime and file layout

| Setting                             | What it does                                                              | Why it is here                                                                                                        | Example                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `target: "ES2025"`                  | Chooses the JavaScript language target for emitted code.                  | Uses a fixed language edition appropriate for Node 24; compiler upgrades do not silently advance the target.          | Modern syntax can remain in `dist/example.js`; TypeScript does not add runtime polyfills. |
| `lib: ["ES2025"]`                   | Loads standard ECMAScript declarations, without the DOM library.          | Browser-only APIs should not appear valid in Node code.                                                               | `RegExp.escape` and `Promise.try` are typed; `document.title` is rejected.                |
| `module: "NodeNext"`                | Uses Node's ESM/CommonJS module rules when checking and emitting modules. | The application runs directly in Node, not through a browser bundler.                                                 | With this package's `"type": "module"`, TypeScript files emit ESM.                        |
| `moduleResolution: "NodeNext"`      | Resolves imports according to Node's package and extension rules.         | Compile-time resolution should match runtime resolution.                                                              | Write `import { readLabel } from './example.js'` in a TypeScript file.                    |
| `types: ["node"]`                   | Includes Node's ambient type package.                                     | Makes `process`, `Buffer`, and Node APIs available without automatically adding every installed ambient test package. | `process.pid` is typed. Tests explicitly import `it` and `expect`.                        |
| `rootDir: "src"`                    | Establishes the source directory for output paths.                        | Keeps source and build output predictable.                                                                            | `src/example.ts` maps to `dist/example.js`.                                               |
| `outDir: "dist"`                    | Writes generated JavaScript under `dist`.                                 | Keeps generated files separate from authored source.                                                                  | `pnpm build` produces `dist/example.js`.                                                  |
| `include: ["src/**/*.ts"]`          | Selects source TypeScript files, including source tests.                  | The typecheck should cover both implementation and its TypeScript tests.                                              | `src/example.test.ts` participates in `pnpm typecheck`.                                   |
| `exclude: ["node_modules", "dist"]` | Excludes dependency and build directories from initial file discovery.    | Avoids treating generated output as source. Imported dependencies can still be resolved.                              | Building does not make `dist/` a new source directory.                                    |

### Type safety and control flow

| Setting                            | What it does                                                                           | Why it is here                                                                   | Example                                                        |
| ---------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `strict: true`                     | Enables TypeScript's strict checking family, including implicit-`any` and null checks. | Provides the central safety baseline.                                            | An untyped parameter in `function read(value) {}` is rejected. |
| `noUncheckedIndexedAccess: true`   | Adds possible `undefined` to unchecked array/dictionary reads.                         | An index does not guarantee an element exists.                                   | Check `names[0]` before calling `.toUpperCase()`.              |
| `exactOptionalPropertyTypes: true` | Distinguishes an absent optional property from an explicitly supplied `undefined`.     | Preserves the actual meaning of optional fields.                                 | `{ name: undefined }` is rejected for `{ name?: string }`.     |
| `noImplicitReturns: true`          | Checks inconsistent return paths.                                                      | Avoids unintentionally returning `undefined` on one branch.                      | A function returning a number on only one path is rejected.    |
| `noImplicitOverride: true`         | Requires `override` on class members that override a base member.                      | Makes the relationship explicit and catches drift when a base API changes.       | Write `override run(): void` in a subclass overriding `run`.   |
| `noFallthroughCasesInSwitch: true` | Rejects a nonempty switch case that falls into the next case.                          | Prevents accidentally executing another case after forgetting a break or return. | A case that logs and then enters the next case is rejected.    |
| `allowUnreachableCode: false`      | Treats compiler-detectable unreachable statements as errors.                           | Dead statements can reveal a misplaced return or mistaken control flow.          | A statement after an unconditional `return` is rejected.       |
| `allowUnusedLabels: false`         | Rejects labels that no break/continue uses.                                            | Catches unused labels and statements that resemble mistyped object properties.   | `unused: { console.log('x'); }` is rejected.                   |

### Imports, emission, and dependency declarations

| Setting                                  | What it does                                                                                                        | Why it is here                                                                                                      | Example                                                                            |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `noEmitOnError: true`                    | Stops this compilation from writing output when it has errors.                                                      | Avoids writing fresh JavaScript from a failed build. It does not delete older output.                               | Assigning a string to a number prevents that build from emitting.                  |
| `noUncheckedSideEffectImports: true`     | Checks resolution of imports made only for their side effects.                                                      | A misspelled setup import should not silently pass compilation.                                                     | `import './missing-setup.js'` is rejected.                                         |
| `verbatimModuleSyntax: true`             | Preserves imports written as runtime imports and erases imports marked as types; enforces compatible module syntax. | Makes emitted imports intentional.                                                                                  | `import type { IncomingHttpHeaders } from 'node:http'` disappears from JavaScript. |
| `resolveJsonModule: true`                | Resolves JSON imports and infers their structure.                                                                   | Permits typed JSON module imports when needed. It does not validate JSON loaded with `fs`.                          | `import settings from './settings.json' with { type: 'json' }`.                    |
| `forceConsistentCasingInFileNames: true` | Checks consistent filename casing in the program.                                                                   | Reduces macOS-versus-Linux import failures.                                                                         | Match `./example.js` to `example.ts`, rather than changing its capitalization.     |
| `skipLibCheck: true`                     | Skips checking the internals of declaration files.                                                                  | Keeps dependency declaration checking from dominating the build; application uses of those types are still checked. | Your incorrect argument to a typed Node API still fails.                           |

`pnpm typecheck` supplies `--noEmit`; the configuration itself leaves emission
enabled because `pnpm build` uses `tsc` to produce runnable JavaScript. Imported
JSON must also be present in the output/deployment when used at runtime.

The compiler's [`lib`](https://www.typescriptlang.org/tsconfig/lib.html) selection
and [`verbatimModuleSyntax`](https://www.typescriptlang.org/tsconfig/verbatimModuleSyntax.html)
have different jobs: the former chooses available declarations; the latter
controls module syntax and emission.

## `tsconfig.build.json`

**Purpose:** use the same compiler policy for a production build while excluding
source test entry points. **Why:** tests should be typechecked without becoming
application output.

| Setting                         | What it does                                                  | Why it is here                                            | Example                                             |
| ------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------- |
| `extends: "./tsconfig.json"`    | Inherits the root compiler settings and source layout.        | Prevents separate typecheck/build policies from drifting. | The same strict null checks apply to both commands. |
| `exclude: ["src/**/*.test.ts"]` | Removes source tests from the build's initial file selection. | Keeps test entry points out of `dist`.                    | `example.ts` emits; `example.test.ts` does not.     |

Do not import test files from production code: an imported file can still become
part of a TypeScript program even when an `exclude` pattern matches it.

## `eslint.config.js`

**Purpose:** inspect code for unsafe operations, promise mistakes, unsupported
assertions, unclear contracts, and selected suspicious patterns. **Why:** the
compiler does not catch all of these issues.

### Scope and presets

| Configuration                            | What it does                                                                        | Why it is here                                                                       | Example                                                                                |
| ---------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `defineConfig(...)`                      | Combines ESLint flat-config blocks in order.                                        | Lets JavaScript, TypeScript, and formatting compatibility have explicit scopes.      | The TS block adds type-aware rules only to `src/**/*.ts`.                              |
| `globalIgnores(...)`                     | Ignores dependencies, builds, reports, temporary output, and generated Husky shims. | Tools should inspect authored source instead of generated files.                     | `dist/example.js` and `.runs/` are ignored.                                            |
| JavaScript `files` block                 | Applies ordinary recommended ESLint rules to `.js`, `.mjs`, and `.cjs`.             | Configuration files and JavaScript utilities must retain lint coverage.              | An undefined variable in `tests/configuration.test.mjs` fails lint.                    |
| TypeScript `files: ['src/**/*.ts']`      | Matches the root TypeScript project's source files.                                 | Keeps the linter's typed scope aligned with the compiler.                            | A new TS tool belongs in a configured TS project, not an unconfigured outside folder.  |
| `globals.node`                           | Declares Node global names to ESLint.                                               | Avoids incorrectly flagging `process` or `Buffer` as undefined.                      | A Node script can read `process.argv`.                                                 |
| `js.configs.recommended`                 | Enables ESLint's core recommended checks.                                           | Supplies the general JavaScript baseline.                                            | Duplicate cases and invalid language constructs receive diagnostics.                   |
| `tseslint.configs.strictTypeChecked`     | Adds the strict TypeScript baseline, including type-aware rules.                    | Detects unsafe values, promises, and operations that syntax-only lint cannot assess. | An unsafe value returned from `JSON.parse` cannot silently flow into a typed variable. |
| `tseslint.configs.stylisticTypeChecked`  | Adds TypeScript readability conventions, with one documented override below.        | Keeps a coherent preset while retaining our safety policy.                           | Requires interfaces for object shapes and prefers `.find()` for one matching element.  |
| `projectService: true`                   | Obtains TypeScript project information for linting.                                 | Allows ESLint to know whether an expression is a promise or an unsafe value.         | A forgotten promise is recognized by its type.                                         |
| `tsconfigRootDir: import.meta.dirname`   | Anchors project lookup to this config's directory.                                  | Makes project resolution independent of the caller's working directory.              | Running ESLint from a tool still finds this repository's TS configuration.             |
| `reportUnusedDisableDirectives: 'error'` | Errors on unused ESLint disable comments.                                           | Removes stale exceptions that could hide later mistakes.                             | A disable comment for `eqeqeq` above a constant declaration fails.                     |

The [strict preset](https://typescript-eslint.io/users/configs/) includes the
following important groups without repeating their default settings in our file.
The package is pinned because this preset can change outside major releases.

| Inherited checks                                                                                              | What and why                                                             | Example                                                                          |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `no-explicit-any`                                                                                             | Rejects explicit escapes from type checking.                             | `const value: any = 1` fails.                                                    |
| `no-unsafe-assignment`, `no-unsafe-argument`, `no-unsafe-return`, `no-unsafe-call`, `no-unsafe-member-access` | Restrict propagation and use of `any`.                                   | Validate a JSON result as `unknown` before accessing it.                         |
| `no-misused-promises`, `await-thenable`                                                                       | Detect promises used in inappropriate places and awaits on non-promises. | `if (Promise.resolve(true))` fails.                                              |
| `unbound-method`                                                                                              | Detects detached methods that may need their original `this`.            | Bind a stateful instance method before passing it as a callback.                 |
| `only-throw-error`, `prefer-promise-reject-errors`, `use-unknown-in-catch-callback-variable`                  | Encourage useful error objects and safe error inspection.                | Throw `new Error('failed')`; inspect caught `unknown` before reading properties. |
| `return-await`                                                                                                | Checks await usage where it affects error handling.                      | Await inside a try block when its catch must handle the rejection.               |
| `no-unused-vars`, `no-var`, `prefer-const`, `prefer-rest-params`, `no-unnecessary-type-conversion`            | Supply the preset's existing baseline.                                   | Prefer `const` when a binding is never reassigned.                               |

The pinned strict preset also includes these checks:

| Inherited check                  | What and why                                                                                                                                             | Example                                                                    |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `no-generated-empty-object-type` | Reports type operations that produce `{}`, which accepts any non-nullish value, including numbers. This can reveal accidental loss of an object's shape. | `Omit<{ name: string }, 'name'>` is rejected because no properties remain. |
| `no-useless-default-assignment`  | Reports a default value when the type says the original value cannot be `undefined`. It can reveal a mistaken input type or unnecessary fallback.        | Destructuring `value = 'fallback'` from `{ value: string }` is rejected.   |

As with other type-aware checks, these rules rely on declared types. External
input still needs validation. See the rule documentation for
[generated empty object types](https://typescript-eslint.io/rules/no-generated-empty-object-type/)
and [unused defaults](https://typescript-eslint.io/rules/no-useless-default-assignment/).

ESLint 10's core recommended preset also enforces these checks. They apply to
both JavaScript and TypeScript here:

| Inherited check              | What it does                                                                 | Why it is here                                      | Example                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------ |
| `no-unassigned-vars`         | Reports variables read without ever being assigned.                          | Finds missing initialization.                       | `let value; console.log(value);` is rejected.                                  |
| `preserve-caught-error`      | Requires the caught error as the cause when wrapping it in a new error.      | Keeps the original failure available for debugging. | Use `throw new Error('Load failed', { cause: error })` inside `catch (error)`. |
| `no-useless-assignment`      | Finds assignments overwritten before their value is used.                    | Reveals dead writes and mistaken sequencing.        | Assigning `1`, then immediately overwriting it with `2`, can be reported.      |
| `no-shadow-restricted-names` | Prevents bindings that hide restricted global names, including `globalThis`. | Avoids misleading references to JavaScript globals. | A function parameter named `globalThis` is rejected.                           |

The first two checks are additions from the
[ESLint 10 migration](https://eslint.org/docs/latest/use/migrate-to-10.0.0).
`no-useless-assignment` was already enforced explicitly; the preset now supplies
it, so the duplicate entry is removed. `globalThis` protection is a new default
of the existing shadowing rule. Both explicit return-type rules remain enabled.

These tables highlight inherited checks; they are not a frozen copy of every preset
rule. Inspect the complete effective policy with:

```sh
pnpm exec eslint --print-config src/example.ts
```

### TypeScript readability conventions

We also extend `tseslint.configs.stylisticTypeChecked`. It bundles conventions
for clearer, more consistent TypeScript, including checks that use type
information. Keeping the preset in `extends` avoids maintaining a separate list
of individual rules. Prettier still handles formatting.

The pinned preset supplies these **20 enabled rules**, all at severity **error**.
Names below omit the `@typescript-eslint/` prefix. These are accepted conventions,
not a claim that every alternative is a bug.

| Rule                              | What it does and why                                                                                                                             | Example                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `adjacent-overload-signatures`    | Keeps overloads of the same function together so its supported call forms are easy to review.                                                    | Group all `parse(...)` signatures before another method's signatures.                  |
| `array-type`                      | Uses bracket array types consistently.                                                                                                           | Prefer `string[]` to `Array<string>`.                                                  |
| `ban-tslint-comment`              | Rejects obsolete TSLint directives that do not control our ESLint checks.                                                                        | Remove `// tslint:disable-next-line`.                                                  |
| `class-literal-property-style`    | Uses readonly fields for literal-valued class properties.                                                                                        | Prefer `readonly kind = 'job'` to a getter that only returns `'job'`.                  |
| `consistent-generic-constructors` | Puts generic arguments on the constructor call to avoid inconsistent placement.                                                                  | Prefer `const names = new Set<string>()` to `const names: Set<string> = new Set()`.    |
| `consistent-indexed-object-style` | Uses `Record` for dictionary types where applicable.                                                                                             | Prefer `Record<string, number>` to `{ [key: string]: number }`.                        |
| `consistent-type-assertions`      | Uses `as` syntax for assertions that our safety rules permit. It does not make unsafe narrowing acceptable.                                      | Prefer `value as unknown` to `<unknown>value`; `as const` remains permitted.           |
| `consistent-type-definitions`     | Uses interfaces for object shapes, giving them a consistent declaration style.                                                                   | Prefer `interface User { name: string }` to `type User = { name: string }`.            |
| `dot-notation`                    | Uses dot access when a property's name permits it.                                                                                               | Prefer `user.name` to `user['name']`; computed `user[key]` is still valid.             |
| `no-confusing-non-null-assertion` | Rejects confusing placement of non-null assertions. Our broader assertion ban already rejects these too.                                         | `value! == other` is rejected.                                                         |
| `no-empty-function`               | Flags unexplained empty functions, which can indicate unfinished code.                                                                           | `function report(): void {}` fails; a comment inside can explain an intentional no-op. |
| `no-inferrable-types`             | Omits annotations that TypeScript can infer from initial or default values. Function return annotations are still required by our separate rule. | Prefer `count = 3` to `count: number = 3` in a parameter list.                         |
| `prefer-find`                     | Expresses a search for one matching array element directly.                                                                                      | Prefer `users.find(matches)` to `users.filter(matches)[0]`.                            |
| `prefer-for-of`                   | Uses element iteration when a numeric loop index serves only to access each item.                                                                | Prefer `for (const item of items)` when the index is unnecessary.                      |
| `prefer-function-type`            | Uses function-type syntax for types consisting only of a call signature.                                                                         | Prefer `type Callback = () => void` to `interface Callback { (): void }`.              |
| `prefer-includes`                 | Expresses membership checks directly.                                                                                                            | Prefer `names.includes(name)` to `names.indexOf(name) !== -1`.                         |
| `prefer-nullish-coalescing`       | Encourages defaults based on missing values.                                                                                                     | `volume ?? 50` preserves zero, while `volume \|\| 50` replaces it.                     |
| `prefer-optional-chain`           | Simplifies repeated checks before property access.                                                                                               | For an object that may be undefined, prefer `user?.name` to `user && user.name`.       |
| `prefer-regexp-exec`              | Uses the regex matching method when a pattern has no global flag.                                                                                | Prefer `/job/.exec(text)` to `text.match(/job/)`.                                      |
| `prefer-string-starts-ends-with`  | Makes prefix and suffix checks explicit.                                                                                                         | Prefer `name.startsWith('job')` to `name.slice(0, 3) === 'job'`.                       |

The preset disables the core `dot-notation` and `no-empty-function` rules and
enables their TypeScript-aware replacements. These conventions apply to
`src/**/*.ts`; JavaScript tools retain their existing checks.

There is one deliberate override:

```js
// Its suggested ! assertion is forbidden by our safety rules.
'@typescript-eslint/non-nullable-type-assertion-style': 'off',
```

That rule would change a nullable `value as string` into `value!`. Our safety
rules reject both expressions, so disabling this style rule removes a redundant
error and an automatic fix that still fails lint. It does not allow unsafe
assertions: `no-unsafe-type-assertion` and `no-non-null-assertion` remain enabled.
Check the value before using it. See the
[preset documentation](https://typescript-eslint.io/users/configs/#stylistic-type-checked)
and the [disabled rule's behavior](https://typescript-eslint.io/rules/non-nullable-type-assertion-style/).

Review changes that affect behavior: `||` can intentionally replace zero or an
empty string, and optional chaining can change a result from `null` or `false`
to `undefined`. Keep the intended behavior when addressing a finding. The
optional-chain rule retains its default restriction on automatic fixes that
change the expression's result type. The runtime does not gain validation from
these stylistic checks.

### Explicit TypeScript rules and overrides

All rules in this section have severity **error**.

| Rule or option                                                           | What it does                                                                                                                     | Why it is here                                                                                                                         | Example                                                                                            |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `ban-ts-comment`                                                         | Forbids `@ts-ignore`/`@ts-nocheck`; permits `@ts-expect-error` with a description of at least 10 characters; allows `@ts-check`. | Broad compiler bypasses should not silently replace fixes. Described expected errors can document intentional negative type tests.     | `// @ts-expect-error -- This fixture deliberately supplies a number` explains an expected failure. |
| `explicit-function-return-type`                                          | Requires return contracts on functions/methods, with the callback/typed-expression exceptions below.                             | Readers should see a named function's output without inferring its implementation.                                                     | `function readLabel(value: unknown): string`.                                                      |
| `allowExpressions: false`                                                | Does not broadly exempt arbitrary function expressions.                                                                          | Named helpers should not evade the return contract.                                                                                    | An untyped `const helper = () => 1` fails.                                                         |
| `allowTypedFunctionExpressions: true`                                    | Permits functions already typed by a surrounding context.                                                                        | Avoids repetitive annotations on inline callbacks and explicitly typed function variables.                                             | `[1, 2].map(value => String(value))` is allowed.                                                   |
| `allowHigherOrderFunctions: false`                                       | Does not exempt a function just because it returns another function.                                                             | Factory return contracts are also useful to readers.                                                                                   | Annotate `function make(): () => number`.                                                          |
| `allowDirectConstAssertionInArrowFunctions: false`                       | Does not treat `as const` as a substitute for a return contract.                                                                 | Keeps the named-function policy consistent.                                                                                            | A named arrow returning `({ kind: 'ready' } as const)` still needs a return contract.              |
| `explicit-module-boundary-types`                                         | Checks input/output types on exported boundaries.                                                                                | Complements the internal-function return rule. Some default-value inference and already-typed expressions remain allowed by this rule. | An exported function with an untyped parameter fails.                                              |
| `consistent-type-imports` with `prefer: 'type-imports'`                  | Requires imports used only as types to be marked, and supports fixes.                                                            | Complements the compiler's import/emission checks.                                                                                     | Change a type-only import to `import type { IncomingHttpHeaders } from 'node:http'`.               |
| `disallowTypeAnnotations: true`                                          | Disallows inline `import('module').Type` type annotations.                                                                       | Keeps type dependencies visible in imports at the top of the file.                                                                     | Prefer a top-level `import type` over `type X = import('pkg').X`.                                  |
| `no-confusing-void-expression` with `ignoreVoidReturningFunctions: true` | Rejects misleading use of `void` results, while permitting them in explicitly void-returning functions.                          | Avoids treating a side-effect-only call as a useful value.                                                                             | Do not assign `console.log('ready')` to a value you intend to use.                                 |
| `no-unnecessary-condition` with `allowConstantLoopConditions: true`      | Detects conditions whose types make them always true/false; permits intentional constant loop conditions.                        | Finds mistaken guards without banning deliberate worker loops.                                                                         | A redundant null check on a known string is reported; `while (true)` is permitted.                 |
| `no-floating-promises` with `ignoreVoid: false`                          | Requires handling a promise; `void` alone does not exempt it.                                                                    | Explicitly ignoring a promise does not handle rejection.                                                                               | `void task()` fails; `void task().catch(reportError)` can pass.                                    |
| `switch-exhaustiveness-check`                                            | Detects omitted cases in a union switch.                                                                                         | Adding a new state should reveal handlers that need updating.                                                                          | A switch handling `'ready'` but omitting `'done'` is reported.                                     |
| `no-unsafe-type-assertion`                                               | Rejects assertions that claim a narrower type without proof.                                                                     | Encourages validation instead of telling the compiler to trust external data.                                                          | `unknownValue as string` fails; a `typeof` guard can establish a string.                           |
| `restrict-template-expressions` with `allowNumber: true`                 | Permits numeric interpolation while keeping `allowAny`, `allowBoolean`, `allowNever`, `allowNullish`, and `allowRegExp` false.   | Ports/counters are ordinary string inputs; unclear or unchecked values need deliberate handling.                                       | A numeric `port` in `` `http://localhost:${port}` `` passes; an `any` payload does not.            |

We list the other template restrictions explicitly because replacing the preset's
options with only `allowNumber` would restore less strict rule defaults.

Two limits matter when interpreting diagnostics:

- A callback can modify a value while asynchronous work waits. TypeScript may
  still regard that value as unchanged, causing `no-unnecessary-condition` to
  misflag a real cancellation check. Preserve the behavior and review the state
  representation or a narrow exception; do not delete the guard automatically.
- Type assertions are not runtime validation. Guards/decoders must actually
  inspect external data, and their behavior still needs appropriate tests.

For example, the checked fixture validates before using a value:

```ts
export function readLabel(value: unknown): string {
  if (typeof value !== 'string') {
    throw new TypeError('Expected a string label');
  }
  return value.trim();
}
```

The promise rule's documentation explains why
[`void` alone does not handle rejection](https://typescript-eslint.io/rules/no-floating-promises/#ignorevoid).

### Shared JavaScript/TypeScript checks

These additions apply to both the JavaScript tooling and the TypeScript source.

| Rule                                    | What it does                                                      | Why it is here                                                                 | Example                                                                                |
| --------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `curly: ['error', 'all']`               | Requires braces around control-flow bodies.                       | Makes the scope of later edits unambiguous.                                    | Write `if (ready) { start(); }`, not an unbraced body.                                 |
| `eqeqeq` with `null: 'never'`           | Requires strict equality except deliberate loose null checks.     | Avoids coercion while permitting one concise null-or-undefined check.          | `value == null` is allowed; `value == 0` is rejected.                                  |
| `no-unreachable-loop`                   | Finds loops that cannot execute a second iteration.               | Can expose a mistakenly placed unconditional return or break.                  | A loop that always returns on its first iteration is reported.                         |
| `no-useless-call`                       | Rejects unnecessary `.call()`/`.apply()` usage.                   | Removes indirection that supplies no useful receiver behavior.                 | Prefer `Math.max(1, 2)` to `Math.max.call(null, 1, 2)`.                                |
| `no-useless-computed-key`               | Rejects unnecessarily computed constant property names.           | Keeps object declarations easier to scan.                                      | Use `{ name: 'x' }` instead of `{ ['name']: 'x' }`.                                    |
| `no-useless-concat`                     | Rejects concatenation of literal strings that can be one literal. | Removes pointless expression structure.                                        | Use `'hello world'` instead of `'hello ' + 'world'`.                                   |
| `no-useless-rename`                     | Rejects renaming a binding to the same name.                      | Avoids misleading aliases.                                                     | Use `import { readFile }` instead of `import { readFile as readFile }`.                |
| `no-void` with `allowAsStatement: true` | Restricts `void` to standalone expression statements.             | Keeps discarded results explicit; the promise rule separately checks handling. | `void task().catch(reportError)` is allowed; using `void` inside an assignment is not. |
| `prefer-object-has-own`                 | Prefers `Object.hasOwn` to the indirect prototype-call pattern.   | Expresses an own-property check directly.                                      | Use `Object.hasOwn(value, 'name')`.                                                    |
| `radix`                                 | Requires an explicit base for `parseInt`.                         | Makes parsing intent visible.                                                  | Use `parseInt(text, 10)`.                                                              |

### Prettier compatibility and exceptions

`eslint-config-prettier/flat` disables conflicting formatting rules. It also
disables `curly` generally, so a final block restores **only `curly: all`**, which
is compatible with Prettier. The verification suite checks that missing braces
still fail; the compatibility checker can also be run directly:

```sh
pnpm exec eslint-config-prettier src/example.ts
```

Policy: any necessary ESLint suppression should name the specific rule and explain
why it is necessary. The current configuration enforces unused-disable detection;
it does **not** automatically require descriptions on ESLint comments. Selecting
that enforcement mechanism remains open. The 10-character requirement above
applies to TypeScript suppression comments.

## `.prettierrc.json`

**Purpose:** standardize formatting. **Why:** reviewers should spend their time
on behavior and contracts, rather than whitespace choices.

| Setting                                    | What it does                                                                          | Why it is here                                                                                                                   | Example                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `singleQuote: true`                        | Prefers single quotes in JavaScript/TypeScript where appropriate.                     | Matches the chosen source convention.                                                                                            | `const name = 'example';`                                      |
| `endOfLine: 'lf'`                          | Uses LF line endings.                                                                 | Keeps line endings consistent across developer machines and Linux CI.                                                            | Saving a file with CRLF causes the format check to request LF. |
| Other options use pinned Prettier defaults | Uses two-space indentation and an 80-column print-width target, among other defaults. | Avoids a large preference file without losing reproducibility. Print width is a formatting target, not a hard line-length limit. | Long function calls are usually wrapped across lines.          |

Example commands:

```sh
pnpm format       # Rewrite files using Prettier.
pnpm format:check # Check without rewriting.
```

## `.prettierignore`

**Purpose:** exclude generated files from formatting. **Why:** tools should not
rewrite dependencies, outputs, reports, or package-manager-owned files.

| Patterns                                 | What and why                                                       | Example                                                 |
| ---------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------- |
| `node_modules/`                          | Dependencies are installed, not authored here.                     | Prettier does not rewrite third-party packages.         |
| `dist/`, `build/`                        | Generated code belongs to the compiler/build.                      | Edit `src/example.ts`, not its emitted copy.            |
| `coverage/`, `.runs/`, `output/`, `tmp/` | Reports and temporary artifacts are not source formatting targets. | A saved run log is left alone.                          |
| `.husky/_/`                              | Husky generates its hook shims.                                    | Keep formatting focused on authored configuration.      |
| `pnpm-lock.yaml`                         | pnpm owns lockfile serialization.                                  | Updating dependencies should use pnpm, not a formatter. |

Prettier also respects the repository's `.gitignore` by default.

## `package.json`

**Purpose:** declare the module system, tooling versions, and executable commands.
**Why:** a configuration file is only reproducible when its tools and invocation
are also known.

| Field                            | What it does                                  | Why it is here                                                                                         | Example                                                            |
| -------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `name`, `version`, `description` | Identify this configuration repository.       | Distinguish this package from an application that adopts the settings.                                 | A consuming project retains its own name/version.                  |
| `private: true`                  | Prevents accidental npm publication.          | This repository is a copyable configuration set.                                                       | A normal publish attempt is blocked.                               |
| `type: 'module'`                 | Makes package `.js` files ESM.                | Matches `NodeNext` and the import-based config.                                                        | `eslint.config.js` can use `import`.                               |
| `packageManager: 'pnpm@12.3.4'`  | Records the selected package manager/version. | Aligns local tooling and CI.                                                                           | CI installs pnpm 12.3.4.                                           |
| `engines.node: '>=24.21.0 <25'`  | Declares the supported Node major/minimum.    | States the runtime expected by the ESM tooling. This field alone is not a universal hard version gate. | A Node 25 install can warn; `.node-version` and CI select 24.21.0. |

### Scripts

| Script         | What it does                                             | Why it is here                                             | Example                                                           |
| -------------- | -------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------- |
| `prepare`      | Runs Husky after a normal install.                       | Activates the tracked pre-commit hook on developer clones. | `pnpm install` sets up `.husky/_`.                                |
| `format`       | Applies Prettier to supported, non-ignored files.        | Provides one formatting command for the repository.        | `pnpm format` fixes formatting failures.                          |
| `format:check` | Checks Prettier formatting without writing.              | Makes formatting enforceable in hooks and CI.              | An unformatted source file makes the command fail.                |
| `lint`         | Runs ESLint across the repository.                       | Checks both TS implementation and JS tooling.              | `pnpm lint` rejects an unsafe assertion in `src`.                 |
| `typecheck`    | Runs TypeScript 7 with `tsc --noEmit`.                   | Checks types without producing build output.               | Source tests are checked along with implementation.               |
| `test`         | Runs Vitest once.                                        | Provides fast, non-Docker verification.                    | `pnpm test` runs the deliberate invalid-code checks.              |
| `check`        | Runs formatting, lint, typecheck, and tests in sequence. | Gives the hook and CI the same fail-fast gate.             | If lint fails, typecheck and tests do not run in that invocation. |
| `build`        | Runs TypeScript 7 with `tsc -p tsconfig.build.json`.     | Produces JavaScript using the production file selection.   | `pnpm build` writes `dist/example.js`.                            |

### Pinned development dependencies

| Dependency                                        | Why it is needed                                                         | Example of its use                                                   |
| ------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `@typescript/native: "npm:typescript@7.0.2"`      | Native TypeScript 7 compiler, installed under a local alias.             | Provides `tsc` for typechecking, builds, and compiler fixture tests. |
| `typescript: "npm:@typescript/typescript6@6.0.2"` | Compatibility package providing the TypeScript 6 API expected by ESLint. | Typed lint rules inspect values using the older API.                 |
| `@types/node@24.13.4`                             | Node 24 API declarations.                                                | Types for `process` and `node:fs`.                                   |
| `eslint@10.10.0`                                  | Lint engine and flat-config helpers.                                     | `defineConfig` and `eslint .`.                                       |
| `@eslint/js@10.0.1`                               | Core recommended JavaScript rules.                                       | Lint JavaScript utilities.                                           |
| `typescript-eslint@8.70.0`                        | TypeScript parser, plugin, and strict preset.                            | Detect unhandled promises.                                           |
| `globals@17.12.0`                                 | Known Node global names for ESLint.                                      | Recognize `Buffer`.                                                  |
| `eslint-config-prettier@10.1.8`                   | Formatting-rule compatibility.                                           | Disable rules that fight Prettier.                                   |
| `prettier@3.9.6`                                  | Deterministic formatting.                                                | `pnpm format`.                                                       |
| `husky@9.1.7`                                     | Git hook installation and execution.                                     | Run `pnpm check` before committing.                                  |
| `vite@8.2.2`                                      | Required Vitest peer for module loading and transformation.              | Loads the source modules during a test run.                          |
| `vitest@5.0.0`                                    | Fast test runner.                                                        | Verify rejection of deliberately unsafe snippets.                    |

Versions are exact rather than ranges. Dependency updates should run the
verification suite and be reviewed, particularly when they change preset rules.

Vite **8.2.2** is also pinned as a development dependency because
[Vitest 5 requires Vite as a peer dependency](https://vitest.dev/guide/migration/).
It supplies the test runner's module loading and transformation machinery;
production builds still use `tsc`. Vitest 5 clears mock call history before each
test by default. This repository has no custom mock or worker-pool configuration.

### Why there are two TypeScript packages

TypeScript 7 handles **typechecking and compilation**. ESLint's type-aware
rules still need the TypeScript 6 compiler API. These aliases follow
[Microsoft's migration guidance](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-60):

```json
{
  "@typescript/native": "npm:typescript@7.0.2",
  "typescript": "npm:@typescript/typescript6@6.0.2"
}
```

An npm alias changes the local dependency name. Here, `@typescript/native`
installs the stable `typescript` 7.0.2 package; it is not a nightly preview.
The name `typescript` instead points to the compatibility package so ESLint's
existing imports find the API they need. Keep both entries when copying this
configuration.

The compatibility package version is **6.0.2**; its underlying TypeScript
compiler is **6.0.3**, as resolved in this lockfile. The installed commands
make the division visible:

```sh
pnpm exec tsc --version  # Version 7.0.2: builds and typechecking
pnpm exec tsc6 --version # Version 6.0.3: compatibility compiler
```

The scripts use `tsc`. Typed linting uses the compatibility API internally;
it does not launch `tsc6`. Updating TypeScript therefore requires checking both
the native compiler and the lint toolchain. The verification suite exercises
both routes, and CI and pre-commit already run that suite through `pnpm check`.
Editor support is a separate choice: use your editor's TypeScript 7 language
server support rather than assuming its older `typescript/lib` integration
will select the native compiler.

`target` and `lib` remain explicitly set to **ES2025** for Node 24. The target
controls emitted syntax; the library list controls available API declarations.
Neither installs polyfills. Keep these aligned with the deployment runtime
when upgrading the compiler; do not automatically replace them with `ESNext`.

## `pnpm-workspace.yaml`

**Purpose:** configure dependency installation. **Why:** pnpm 12 requires explicit
decisions about dependency build scripts and applies a release-age safeguard.
There is no `packages` list; only the root project belongs to this workspace.

| Setting                                             | What it does                                                                   | Why it is here                                                                                                                    | Example                                                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `allowBuilds.esbuild: true`                         | Allows esbuild's installation script.                                          | Vite's selected dependency needs its platform executable prepared and verified. Other dependency scripts are not broadly allowed. | A fresh install can prepare the locked esbuild binary; an unreviewed dependency build still fails. |
| `minimumReleaseAgeExclude: ['@types/node@24.13.4']` | Exempts only this exact version from pnpm's default 24-hour release-age delay. | The selected Node declarations were newly published when this lockfile was generated, so pnpm recorded the explicit choice.       | This pin can install immediately; other new packages still face the age delay.                     |

Commit this file with the lockfile so a fresh clone has the same installation
policy. Review the exact-version exception when updating the Node types; it does
not exempt future releases. See pnpm's
[build permissions](https://pnpm.io/settings/build#allowbuilds) and
[release-age exceptions](https://pnpm.io/settings/dependency-resolution#minimumreleaseageexclude).

## `pnpm-lock.yaml`

**What:** records resolved dependency versions and integrity information.
**Why:** an exact top-level version alone does not freeze every transitive
dependency. **Example:** CI uses `pnpm install --frozen-lockfile` and fails if the
manifest requires an unresolved lockfile change.

This is generated configuration. pnpm 12 also records its package-manager and
platform binary dependencies in the lockfile. Update it using the pinned pnpm
version, and commit it with relevant `package.json` and installation-policy changes.

## `.node-version`

**What:** selects Node **24.21.0** for tools that read this file, including this
CI workflow. **Why:** tests should run against a known runtime. **Example:**
`actions/setup-node` reads this file instead of choosing an arbitrary Node major.

The file does not change a shell's Node version by itself; use a compatible
version manager locally.

## `.husky/pre-commit`

**What:** runs `pnpm check` before a commit. **Why:** catch formatting, lint, type,
and fast-test failures before they reach CI. **Example:** an unhandled promise
causes the hook to fail and the commit to stop.

The hook checks the **working tree**, not an isolated copy of the staged files.
It does not automatically rewrite or stage files. After `pnpm format`, review
and stage the intended changes. CI checks the committed snapshot independently.
The hook does not run Docker tests or call model APIs.

[Husky's setup documentation](https://typicode.github.io/husky/get-started.html)
explains how the `prepare` script installs hooks after dependency installation.

## `.github/workflows/ci.yml`

**Purpose:** verify the configuration set on Linux using the selected versions.
**Why:** local hooks and developer environments are not the only validation point.

| Configuration                                            | What it does                                             | Why it is here                                                 | Example                                                             |
| -------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------- |
| `name: Configuration checks`                             | Names the workflow.                                      | Makes its result recognizable on commits and pull requests.    | GitHub shows a Configuration checks run.                            |
| `pull_request` and pushes to `main`                      | Trigger verification on proposed and landed changes.     | Tests the committed snapshot.                                  | Updating an ESLint rule in a PR starts CI.                          |
| `permissions.contents: read`                             | Gives the workflow read access to repository contents.   | These checks do not need to write repository data.             | Checkout can read the source.                                       |
| `runs-on: ubuntu-24.04`                                  | Selects the Linux runner.                                | Exercises the configuration on a consistent CI OS.             | Case-sensitive import mistakes are less likely to escape unnoticed. |
| `timeout-minutes: 10`                                    | Bounds the job duration.                                 | A stuck command should not run indefinitely.                   | A hung test eventually fails the job.                               |
| `HUSKY: '0'`                                             | Skips local hook installation/execution in CI.           | CI invokes the checks directly.                                | Installing packages does not need to prepare Git hooks.             |
| `actions/checkout@v7.0.1`                                | Checks out the committed files.                          | Supplies the input to all checks.                              | Tests run against the PR commit.                                    |
| `pnpm/action-setup@v6.1.0`, version `12.3.4`             | Installs the selected pnpm.                              | Matches `packageManager`.                                      | Installation uses pnpm 12.3.4.                                      |
| `actions/setup-node@v7.0.0`, `.node-version`, pnpm cache | Installs the selected Node and caches package downloads. | Matches the runtime while reducing repeated download work.     | CI selects Node 24.21.0.                                            |
| Frozen dependency install                                | Installs exactly the lockfile resolution.                | Detects manifest/lockfile drift.                               | A missing lockfile update fails.                                    |
| `pnpm check`                                             | Runs the same gate as pre-commit.                        | Checks formatting, lint, types, and unit tests together.       | Disabling a required rule causes a negative fixture test to fail.   |
| `pnpm build`                                             | Verifies production compilation separately.              | Passing typecheck should also lead to a working build command. | The example compiles into `dist`.                                   |

This is a generic configuration repository, so the workflow has no Bluma-specific
Docker build or live-model smoke test. Application repositories can retain their
own integration checks after this gate.

## `.gitignore`

**Purpose:** keep generated and machine-local files out of normal Git discovery.
**Why:** commits should contain source and configuration rather than installed
packages, run outputs, or local credentials.

| Patterns                                 | What and why                                                           | Example                                                     |
| ---------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------- |
| `node_modules/`                          | Dependencies are reproducible from the lockfile.                       | Installation does not add thousands of files to Git status. |
| `dist/`, `build/`                        | Compiler/build output is generated.                                    | Commit `src/example.ts`, not `dist/example.js`.             |
| `coverage/`, `.runs/`, `output/`, `tmp/` | Reports and local artifacts are generated.                             | A coverage report stays outside normal commits.             |
| `.env`, `.env.*`, `!.env.example`        | Ignores local environment files while permitting a documented example. | `.env.local` is ignored; `.env.example` can be committed.   |
| `*.log`, `.DS_Store`                     | Excludes logs and macOS folder metadata.                               | A debug log does not appear as an untracked source file.    |

Ignore patterns do not remove files that are already tracked. Husky manages the
ignore file inside its generated `.husky/_` directory.

## Verification fixtures

`src/example.ts` is a small compileable example that validates an `unknown`
input. `src/example.test.ts` demonstrates that source tests are typechecked but
excluded from the production build.

`tests/configuration.test.mjs` submits valid and deliberately invalid snippets
to the actual tools:

- **ESLint:** loads the installed config and its TypeScript 6 compatibility API.
  Checks return contracts, unsafe values/assertions, promises, union coverage,
  braces, suppression rules, JavaScript coverage, generated empty object types,
  unused defaults, missing initialization, preserved error causes, and the
  selected TypeScript conventions. An automatic-fix fixture verifies that unsafe
  narrowing stays rejected without being rewritten into a forbidden `!`
  assertion. Lint snippets stay in memory.
- **TypeScript 7:** invokes the native compiler CLI to check control flow,
  Node-only declarations, build file selection, and emission on errors.
  Each compiler fixture copies the real configuration into a fresh
  `tmp/compiler-*` directory and removes that directory after the check.
  Invalid fixtures never enter application `src` or the shared `dist` folder.
- **Runtime:** compiles an ES2025 example and executes the emitted ESM file
  in the Node runtime running the tests. It checks `RegExp.escape`, `Promise.try`,
  iterator helpers, set union, float16 APIs, and the `/(?i:a)/` regular-expression
  syntax, alongside grouping and promise APIs. CI selects Node 24.21.0.
- **Tool selection:** verifies that `pnpm exec tsc` selects TypeScript 7.0.2
  while the API imported as `typescript` remains TypeScript 6.

The `.mjs` verification harness receives ordinary JavaScript linting; it is not
part of the TypeScript application's emitted program. Each compiler/runtime
subprocess has a 10-second timeout.

## Decisions still open

These are not silently enabled as new policy in this baseline:

- Extra readability rules such as `object-shorthand`.
- `noPropertyAccessFromIndexSignature`.
- Custom underscore exemptions, `args: 'all'`, and whether to duplicate unused
  checks with `noUnusedLocals`/`noUnusedParameters`. The preset's current
  `no-unused-vars` behavior remains in place.
- An explicit `no-mixed-operators` policy. Prettier compatibility remains active.
- Packaging the selected compiler flags through `@tsconfig/strictest` instead
  of writing the chosen flags directly in this standalone file.
- Source maps.
- The exact mechanism for enforcing explanations on ESLint suppressions and
  handling application-specific cancellation false positives.

These deferred choices can be reviewed independently without weakening the
selected promise, type-safety, return-contract, or formatting checks.
