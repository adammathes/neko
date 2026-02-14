SH=/bin/sh

GO=go
NPM=npm
RICE=rice
PANDOC=pandoc

BINARY=neko
VERSION=0.3
BUILD=`git rev-parse HEAD`
LDFLAGS=-ldflags "-X main.Version=${VERSION} -X main.Build=${BUILD}"

.PHONY: default all clean ui build install test run dev

default: build

all: clean ui vanilla-ui embed build docs

clean:
	rm -f ${BINARY}
	rm -f web/rice-box.go
	rm -f readme.html

ui:
	cd frontend && ${NPM} install && ${NPM} run build
	rm -rf dist/v2
	mkdir -p dist/v2
	cp -r frontend/dist/* dist/v2/

vanilla-ui:
	rm -rf dist/vanilla
	mkdir -p dist/vanilla
	cp vanilla/index.html vanilla/app.js vanilla/style.css dist/vanilla/

build:
	${GO} build ${LDFLAGS} -o ${BINARY}

embed:
	${RICE} -i ./web embed-go

install: build
	cp ${BINARY} ${GOBIN}

test:
	${GO} test ./...
	cd frontend && ${NPM} test -- --run

run: build
	./${BINARY}

dev: build
	./${BINARY} -d

docs: readme.html

readme.html: README.md
	${PANDOC} README.md -o readme.html
