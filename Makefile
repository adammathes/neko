SOURCES = $(wildcard *.go) $(wildcard */*.go)
BINARIES = nekoweb nekocrawl

DEPS = github.com/mmcdole/gofeed github.com/abbot/go-http-auth github.com/axgle/mahonia github.com/go-sql-driver/mysql github.com/microcosm-cc/bluemonday

default: $(BINARIES)


$(BINARIES): $(SOURCES)
	go build

.PHONY: deps run

.PHONY: run
deps:
	go get $(DEPS)
run:
	./neko -update -serve
