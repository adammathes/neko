BINARY=neko
VERSION=0.2
BUILD=`git rev-parse HEAD`

LDFLAGS=-ldflags "-X main.Version=${VERSION} -X main.Build=${BUILD}"


SOURCES = $(wildcard *.go) $(wildcard */*.go)
BINARIES = nekoweb nekocrawl

default: build

all: clean build_all

build:
	go build ${LDFLAGS} -o ${BINARY}

install:
	go install

docs:
	ghmarkdown README.md > readme.html
