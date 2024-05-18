# --- TESTS ---

test-go:
	@go test -v ./internal/...

# --- PUBLISHING GO ---

publish-go:
	@./scripts/go/bumper.sh

# --- PROJECTS ---

docs-dev:
	@cd projects/docs \
	&& mkdir -p dist/kiruna \
	&& touch dist/kiruna/x \
	&& go run ./cmd/dev

docs-install-js:
	@cd projects/docs \
	&& pnpm i

docs-tidy:
	@cd projects/docs \
	&& go mod tidy

docs-docker:
	@cd projects/docs \
	&& docker build --no-cache -t asdf . &> ../../__logs/build.log

testers-routes-dev:
	@cd projects/testers/routes \
	&& mkdir -p dist/kiruna \
	&& touch dist/kiruna/x \
	&& go run ./cmd/dev

testers-routes-tidy:
	@cd projects/testers/routes \
	&& go mod tidy
