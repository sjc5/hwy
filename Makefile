# --- TESTS ---

test-go-router:
	@cd packages/go/router && go test

test-go-general:
	@cd packages/go/hwy_test && go test

test-go: test-go-router test-go-general

# --- PUBLISHING GO ---

publish-go: test-go
	@./scripts/go/bumper.sh

# --- LINTING AND FORMATTING JAVASCRIPT ---

check:
	@pnpm biome check --write .

check-staged:
	@pnpm biome check --write . --staged 

setup-lint-staged-hook:
	@git config core.hooksPath .hooks
