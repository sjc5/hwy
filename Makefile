# --- TESTS ---

test-go:
	@go test -v ./internal/...

# --- PROJECTS ---

tidy-docs:
	@cd projects/docs \
	&& go mod tidy

docs-dev:
	@cd projects/docs \
	&& mkdir -p dist/kiruna \
	&& touch dist/kiruna/x \
	&& go run ./cmd/dev

tidy-testers-routes:
	@cd projects/testers/routes \
	&& go mod tidy

testers-routes-dev:
	@cd projects/testers/routes \
	&& mkdir -p dist/kiruna \
	&& touch dist/kiruna/x \
	&& go run ./cmd/dev
