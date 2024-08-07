# --- TESTS ---

test-go:
	@cd packages/go/router && go test

# --- PUBLISHING GO ---

publish-go: test-go
	@./scripts/go/bumper.sh

# --- PROJECTS ---

docs-dev:
	@cd projects/docs \
	&& mkdir -p dist/kiruna \
	&& touch dist/kiruna/x \
	&& go run ./cmd/dev

docs-install:
	@cd projects/docs \
	&& pnpm i

docs-tidy:
	@cd projects/docs \
	&& go mod tidy

docs-docker:
	@cd projects/docs \
	&& docker build --no-cache -t asdf . &> ../../__logs/build.log

testers-routes-react-dev:
	@cd projects/testers/routes-react \
	&& mkdir -p dist/kiruna \
	&& touch dist/kiruna/x \
	&& go run ./cmd/dev

testers-routes-react-tidy:
	@cd projects/testers/routes-react \
	&& go mod tidy

testers-routes-react-install:
	@cd projects/testers/routes-react \
	&& pnpm i

testers-routes-lit-dev:
	@cd projects/testers/routes-lit \
	&& mkdir -p dist/kiruna \
	&& touch dist/kiruna/x \
	&& go run ./cmd/dev

testers-routes-lit-tidy:
	@cd projects/testers/routes-lit \
	&& go mod tidy

testers-routes-lit-install:
	@cd projects/testers/routes-lit \
	&& pnpm i
