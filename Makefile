# --- TESTS ---

test-go-router:
	@cd packages/go/router && go test

test-go-general:
	@cd packages/go/hwy_test && go test

test-go: test-go-router test-go-general

# --- PUBLISHING GO ---

publish-go: test-go
	@go run ./scripts/go/bumper

# --- LINTING AND FORMATTING JAVASCRIPT ---

check:
	@pnpm biome check --write .

setup-pre-commit-hook:
	@git config core.hooksPath .hooks
