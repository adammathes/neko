SH=/bin/sh

GO=go
NPM=npm
PANDOC=pandoc

BINARY=neko
VERSION=0.3
BUILD=`git rev-parse HEAD`
LDFLAGS=-ldflags "-X main.Version=${VERSION} -X main.Build=${BUILD}"

.PHONY: default all clean ui build install test run dev

default: build

all: clean ui vanilla-ui build docs

clean:
	rm -f ${BINARY}
	rm -f readme.html

ui:
	cd frontend && ${NPM} install && ${NPM} run build
	rm -rf web/dist/v2
	mkdir -p web/dist/v2
	cp -r frontend/dist/* web/dist/v2/

vanilla-ui:
	rm -rf web/dist/vanilla
	mkdir -p web/dist/vanilla
	cp vanilla/index.html vanilla/app.js vanilla/style.css web/dist/vanilla/

build:
	${GO} build ${LDFLAGS} -o ${BINARY} ./cmd/neko

install: build
	cp ${BINARY} ${GOBIN}

test:
	${GO} test ./...
	cd frontend && ${NPM} test -- --run
	
lint:
	golangci-lint run

run: build
	./${BINARY}

dev: build
	./${BINARY} -d

docs: readme.html

readme.html: README.md
	${PANDOC} README.md -o readme.html
