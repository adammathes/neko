SH=/bin/sh

BINARY=neko
VERSION=0.2
BUILD=`git rev-parse HEAD`
LDFLAGS=-ldflags "-X main.Version=${VERSION} -X main.Build=${BUILD}"

default: build
all: clean build docs

build:
	rice -i ./web embed-go
	go build ${LDFLAGS} -o ${BINARY}

install: build
	cp ${BINARY} ${GOBIN}

readme: REAMDE.md
docs: readme.html
readme.html: README.md
	ghmarkdown README.md > readme.html
