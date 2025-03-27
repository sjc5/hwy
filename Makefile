#####################################################################
####### GO
#####################################################################

gotest:
	@go test ./...

gotestloud:
	@go test -v ./...

gobump: gotest
	@go run ./scripts/bumper

# call with `make gobench pkg=./x/kit/mux` (or whatever)
gobench:
	@go test -bench=. $(pkg)

#####################################################################
####### TS
#####################################################################

tstest:
	@pnpm vitest run

tstestwatch:
	@pnpm vitest

tsreset:
	@rm -rf node_modules **/node_modules && pnpm i

tslint:
	@pnpm biome check .

tscheck: tscheck-kit tscheck-hwy-client tscheck-hwy-react tscheck-hwy-solid

tscheck-kit:
	@pnpm tsc --noEmit --project ./typescript/kit

tscheck-hwy-client:
	@pnpm tsc --noEmit --project ./typescript/hwy/client

tscheck-hwy-react:
	@pnpm tsc --noEmit --project ./typescript/hwy/react

tscheck-hwy-solid:
	@pnpm tsc --noEmit --project ./typescript/hwy/solid

tsprepforpub: tsreset tstest tslint tscheck

tspublishpre: tsprepforpub
	@npm publish --access public --tag pre

tspublishnonpre: tsprepforpub
	@npm publish --access public
