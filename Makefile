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

all: clean build docs

clean:
	rm -f ${BINARY}
	rm -f web/rice-box.go
	rm -f readme.html

ui:
	cd frontend && ${NPM} install && ${NPM} run build

build: ui
	${RICE} -i ./web embed-go
	${GO} build ${LDFLAGS} -o ${BINARY}

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
