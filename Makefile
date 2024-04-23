docs-dev:
	@cd docs \
	&& mkdir -p dist/kiruna \
	&& touch dist/kiruna/x && go run ./cmd/dev
