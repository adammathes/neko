SH=/bin/sh

GO=go
NPM=npm
PANDOC=pandoc

BINARY=neko
VERSION=0.3
BUILD=`git rev-parse HEAD`
LDFLAGS=-ldflags "-X main.Version=${VERSION} -X main.Build=${BUILD}"

.PHONY: default all clean ui build install test test-race test-frontend test-e2e ui-check lint ci run dev docs

default: build

all: clean ui build docs

clean:
	rm -f ${BINARY}
	rm -f readme.html

ui:
	cd frontend && ${NPM} install && ${NPM} run build
	rm -rf web/dist/v2
	mkdir -p web/dist/v2
	cp -r frontend/dist/* web/dist/v2/

build:
	${GO} build ${LDFLAGS} -o ${BINARY} ./cmd/neko

install: build
	cp ${BINARY} ${GOBIN}

test:
	${GO} test ./...
	cd frontend && ${NPM} test -- --run

test-race:
	${GO} test -race ./...

test-frontend:
	cd frontend && ${NPM} run lint
	cd frontend && ${NPM} test -- --run

test-e2e: build
	./scripts/run_e2e_safe.sh

ui-check: ui
	git diff --exit-code web/dist/v2/

lint:
	${GO} vet ./...
	cd frontend && ${NPM} run lint

ci: lint test-race test-frontend ui-check test-e2e

run: build
	./${BINARY}

dev: build
	./${BINARY} -d

docs: readme.html

readme.html: README.md
	${PANDOC} README.md -o readme.html
