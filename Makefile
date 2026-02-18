SH=/bin/sh

GO=go
NPM=npm

BINARY=neko
VERSION=0.3
BUILD=`git rev-parse HEAD`
LDFLAGS=-ldflags "-X main.Version=${VERSION} -X main.Build=${BUILD}"

.PHONY: default all clean build install test test-race test-frontend ui-check lint check ci run dev install-hooks cover coverage-html bench bench-short stress test-perf

default: build

all: clean ui-vanilla build

clean:
	rm -f ${BINARY}


ui-vanilla:
	cd frontend-vanilla && ${NPM} install && ${NPM} run build
	rm -rf web/dist/v3
	mkdir -p web/dist/v3
	cp -r frontend-vanilla/dist/* web/dist/v3/

build:
	${GO} build ${LDFLAGS} -o ${BINARY} ./cmd/neko

install: build
	cp ${BINARY} ${GOBIN}

test:
	${GO} test -cover ./...
	cd frontend-vanilla && ${NPM} test -- --run

test-race:
	${GO} test -race ./...

cover:
	${GO} test -coverprofile=coverage.out ./...
	${GO} tool cover -func=coverage.out

coverage-html: cover
	${GO} tool cover -html=coverage.out

test-frontend:
	cd frontend-vanilla && ${NPM} test -- --run

ui-check: ui-vanilla
	git diff --exit-code web/dist/v3/

lint:
	golangci-lint run

check: lint test

ci: lint test-race test-frontend ui-check

run: build
	./${BINARY}

dev: build
	./${BINARY} -d

install-hooks:
	chmod +x scripts/install-hooks.sh
	./scripts/install-hooks.sh

bench:
	${GO} test -bench=. -benchmem -count=3 -run=^$$ ./...

bench-short:
	${GO} test -bench=. -benchmem -count=1 -run=^$$ ./...

stress:
	${GO} test -run=TestStress -count=1 -timeout=120s ./...

test-perf:
	cd frontend-vanilla && ${NPM} test -- --run src/perf/


